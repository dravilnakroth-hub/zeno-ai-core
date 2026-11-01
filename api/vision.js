import { guard, refund, splitKeys } from "./_lib.js";

// Đổi model bằng biến môi trường trên Vercel mà không cần sửa code
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const PROMPT = "Mô tả chi tiết những gì có trong ảnh này bằng tiếng Việt, khách quan, ngắn gọn trong khoảng 3-4 câu. Không bình luận, chỉ mô tả.";

async function viaGroq(mime, b64) {
  const keys = splitKeys(process.env.GROQ_API_KEYS);
  if (!keys.length) return { skipped: true };
  const key = keys[Math.floor(Math.random() * keys.length)];
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        temperature: 0.2,
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: "data:" + mime + ";base64," + b64 } }
          ]
        }]
      })
    });
    const d = await r.json();
    const t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (r.ok && t) return { text: t };
    return { error: "Groq: " + ((d && d.error && d.error.message) || ("mã " + r.status)) };
  } catch (e) {
    return { error: "Groq: " + e.message };
  }
}

async function viaGemini(mime, b64) {
  const keys = splitKeys(process.env.GEMINI_API_KEYS);
  if (!keys.length) return { skipped: true };
  const key = keys[Math.floor(Math.random() * keys.length)];
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
        generationConfig: { temperature: 0.2 }
      })
    });
    const d = await r.json();
    const parts = d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
    const t = parts && parts.map(p => p.text || "").join("");
    if (r.ok && t) return { text: t };
    return { error: "Gemini: " + ((d && d.error && d.error.message) || ("mã " + r.status)) };
  } catch (e) {
    return { error: "Gemini: " + e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: { message: "Thieu du lieu anh" } });
  }

  const g = await guard(req, res, "readImg");
  if (!g) return;
  const fail = async (status, message) => {
    await refund(g.user.id, "readImg");
    return res.status(status).json({ error: { message } });
  };

  try {
    const mime = mimeType || "image/jpeg";
    const problems = [];

    const a = await viaGroq(mime, imageBase64);
    if (a.text) return res.status(200).json({ description: a.text });
    if (a.error) problems.push(a.error);

    const b = await viaGemini(mime, imageBase64);
    if (b.text) return res.status(200).json({ description: b.text });
    if (b.error) problems.push(b.error);

    return fail(500, problems.join(" || ") || "Chua cau hinh GROQ_API_KEYS hoac GEMINI_API_KEYS");
  } catch (err) {
    return fail(500, "Loi server: " + err.message);
  }
}
