import { guard, refund } from "./_lib.js";

// Tạo ảnh: ưu tiên Cloudflare Workers AI (FLUX, có gói miễn phí), dự phòng Gemini.
const GEMINI_MODELS = [
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image"
];

function splitKeys(v) {
  return (v || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
}

// Chuyển yêu cầu tiếng Việt thành mô tả tiếng Anh ngắn (FLUX hiểu tiếng Anh tốt hơn nhiều)
async function toEnglishPrompt(prompt) {
  const groqKeys = splitKeys(process.env.GROQ_API_KEYS);
  if (groqKeys.length === 0) return prompt;
  try {
    const key = groqKeys[Math.floor(Math.random() * groqKeys.length)];
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b",
        temperature: 0.4,
        messages: [
          { role: "system", content: "Convert the user's image request (any language) into one concise, vivid English image-generation prompt (max 60 words). Remove phrases like 'draw me' or 'make an image of'. Output ONLY the prompt." },
          { role: "user", content: prompt }
        ]
      })
    });
    const d = await r.json();
    const t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    return (r.ok && t && t.trim()) ? t.trim() : prompt;
  } catch (e) {
    return prompt;
  }
}

async function viaCloudflare(prompt) {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const token = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!accountId || !token) return { skipped: true };

  const r = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" + accountId + "/ai/run/@cf/black-forest-labs/flux-1-schnell",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ prompt: prompt, steps: 6 })
    }
  );
  let data;
  try { data = await r.json(); } catch (e) { return { error: "Cloudflare: phản hồi không đọc được (mã " + r.status + ")" }; }

  const img = data && data.result && data.result.image;
  if (r.ok && img) return { imageBase64: img, mimeType: "image/jpeg" };

  const msg = data && data.errors && data.errors[0] && data.errors[0].message;
  return { error: "Cloudflare: " + (msg || ("mã " + r.status)) };
}

async function viaGemini(prompt) {
  const keys = splitKeys(process.env.GEMINI_API_KEYS);
  if (keys.length === 0) return { skipped: true };
  const key = keys[Math.floor(Math.random() * keys.length)];
  const errors = [];

  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
          })
        }
      );
      const data = await r.json();
      if (!r.ok) {
        const m = (data.error && data.error.message) ? data.error.message : String(r.status);
        errors.push(model + ": " + m.split("\n")[0].slice(0, 120));
        if (r.status === 429) break; // hết hạn mức thì các model khác cũng hết
        continue;
      }
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      if (parts) {
        for (const part of parts) {
          const inline = part.inlineData || part.inline_data;
          if (inline && inline.data) {
            return { imageBase64: inline.data, mimeType: inline.mimeType || inline.mime_type || "image/png" };
          }
        }
      }
      errors.push(model + ": không trả về ảnh");
    } catch (e) {
      errors.push(model + ": " + e.message);
    }
  }
  return { error: "Gemini: " + errors.join(" | ") };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const raw = req.body && req.body.prompt;
  if (!raw) {
    return res.status(400).json({ error: { message: "Thieu prompt" } });
  }
  const prompt = String(raw).slice(0, 1000);

  const g = await guard(req, res, "genImg");
  if (!g) return;
  const fail = async (status, message) => {
    await refund(g.user.id, "genImg");
    return res.status(status).json({ error: { message } });
  };

  try {
    const hasCloudflare = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
    const hasGemini = splitKeys(process.env.GEMINI_API_KEYS).length > 0;
    if (!hasCloudflare && !hasGemini) {
      return fail(500, "Chưa cấu hình dịch vụ tạo ảnh trên server (cần CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN hoặc GEMINI_API_KEYS)");
    }

    const problems = [];

    if (hasCloudflare) {
      const english = await toEnglishPrompt(prompt);
      const cf = await viaCloudflare(english);
      if (cf.imageBase64) return res.status(200).json({ imageBase64: cf.imageBase64, mimeType: cf.mimeType });
      if (cf.error) problems.push(cf.error);
    }

    if (hasGemini) {
      const gm = await viaGemini(prompt);
      if (gm.imageBase64) return res.status(200).json({ imageBase64: gm.imageBase64, mimeType: gm.mimeType });
      if (gm.error) problems.push(gm.error);
    }

    return fail(500, problems.join(" || ") || "Không tạo được ảnh");
  } catch (err) {
    return fail(500, "Loi server: " + err.message);
  }
}
