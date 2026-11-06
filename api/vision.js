import { guard, refund } from "./_lib.js";

// Đổi model bằng biến môi trường trên Vercel nếu sau này Groq/Gemini đổi tên: GROQ_VISION_MODEL, GEMINI_MODEL
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const PROMPT = "Mô tả chi tiết những gì có trong ảnh này bằng tiếng Việt, khách quan, ngắn gọn trong khoảng 3-4 câu. Nếu trong ảnh có chữ thì chép lại chữ quan trọng. Không bình luận, chỉ mô tả.";

const splitKeys = v => (v || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function timedFetch(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// 1. Groq (nhanh), tối đa 12 giây
async function viaGroq(keys, mime, b64) {
  const key = keys[Math.floor(Math.random() * keys.length)];
  const r = await timedFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: "data:" + mime + ";base64," + b64 } }
        ]
      }]
    })
  }, 12000);
  const d = await r.json();
  let text = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  if (r.ok && text) {
    text = String(text).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (text) return text;
  }
  throw new Error((d && d.error && d.error.message) || ("Groq status " + r.status));
}

// 2. Gemini dự phòng: gặp quá tải (503/429) thì thử lại 1 lần rồi đổi key
async function viaGemini(keys, mime, b64, deadline) {
  const shuffled = keys.slice().sort(() => Math.random() - 0.5);
  let lastErr = "";
  for (const key of shuffled) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() > deadline) throw new Error(lastErr || "hết thời gian");
      try {
        const r = await timedFetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }]
            })
          }, 15000);
        const d = await r.json();
        const text = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts &&
          d.candidates[0].content.parts.map(p => p.text || "").join("").trim();
        if (r.ok && text) return text;
        lastErr = (d.error && d.error.message) || ("Gemini status " + r.status);
        if (r.status !== 503 && r.status !== 429) break; // lỗi khác thì đổi key luôn, không thử lại
        await sleep(700);
      } catch (e) { lastErr = e.message; break; }
    }
  }
  throw new Error(lastErr || "Gemini lỗi");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const g = await guard(req, res, "readImg");
  if (!g) return;
  const fail = async (status, message) => {
    await refund(g.user.id, "readImg");
    return res.status(status).json({ error: { message } });
  };

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return fail(400, "Thieu du lieu anh");
    const mime = mimeType || "image/jpeg";

    const groqKeys = splitKeys(process.env.GROQ_API_KEYS);
    const geminiKeys = splitKeys(process.env.GEMINI_API_KEYS);
    if (!groqKeys.length && !geminiKeys.length) return fail(500, "Chua cau hinh API key nao tren server");

    const deadline = Date.now() + 40000;
    let groqErr = "";

    if (groqKeys.length) {
      try {
        const description = await viaGroq(groqKeys, mime, imageBase64);
        return res.status(200).json({ description, provider: "groq" });
      } catch (e) { groqErr = e.message; }
    }

    if (!geminiKeys.length) return fail(502, "Groq loi: " + groqErr);

    try {
      const description = await viaGemini(geminiKeys, mime, imageBase64, deadline);
      return res.status(200).json({ description, provider: "gemini" });
    } catch (e) {
      return fail(502, "Server đang quá tải, thử lại sau ít phút nhé. (Groq: " + groqErr + " | Gemini: " + e.message + ")");
    }
  } catch (err) {
    return fail(500, "Loi server: " + err.message);
  }
}
