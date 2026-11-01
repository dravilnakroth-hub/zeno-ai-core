import { guard, refund, splitKeys } from "./_lib.js";

const MODEL = process.env.GEMINI_VIDEO_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const { videoBase64, mimeType, prompt } = req.body || {};
  if (!videoBase64) {
    return res.status(400).json({ error: { message: "Thieu du lieu video" } });
  }

  const g = await guard(req, res, "video");
  if (!g) return;
  const fail = async (status, message) => {
    await refund(g.user.id, "video");
    return res.status(status).json({ error: { message } });
  };

  try {
    const keys = splitKeys(process.env.GEMINI_API_KEYS);
    if (keys.length === 0) {
      return fail(500, "Chua cau hinh GEMINI_API_KEYS cho tinh nang Video tren Vercel");
    }
    const key = keys[Math.floor(Math.random() * keys.length)];

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Xem video này và mô tả chi tiết nội dung diễn biến bằng tiếng Việt." },
              { inline_data: { mime_type: mimeType || "video/mp4", data: videoBase64 } }
            ]
          }]
        })
      }
    );
    const data = await r.json();

    if (!r.ok) {
      const msg = (data.error && data.error.message) ? data.error.message : "Loi khi phan tich video tu Gemini";
      return fail(r.status >= 400 && r.status < 600 ? r.status : 502, msg);
    }

    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const description = parts && parts.map(p => p.text || "").join("");
    if (!description) {
      return fail(500, "Zeno khong doc duoc du lieu tu video nay");
    }
    return res.status(200).json({ description: description });
  } catch (err) {
    return fail(500, "Loi server video: " + err.message);
  }
}
