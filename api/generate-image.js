const MODELS = [
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image"
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: { message: "Thieu prompt" } });
    }

    const allKeys = (process.env.GEMINI_API_KEYS || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);

    if (allKeys.length === 0) {
      return res.status(500).json({ error: { message: "Chua cau hinh GEMINI_API_KEYS tren server" } });
    }

    const key = allKeys[Math.floor(Math.random() * allKeys.length)];
    const errors = [];

    // thu lan luot tung model, model nao ra anh thi dung
    for (const model of MODELS) {
      try {
        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
            })
          }
        );

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
          errors.push(model + ": " + ((data.error && data.error.message) ? data.error.message : geminiResponse.status));
          continue;
        }

        const parts = data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts;

        if (parts) {
          for (const part of parts) {
            const inline = part.inlineData || part.inline_data;
            if (inline && inline.data) {
              return res.status(200).json({
                imageBase64: inline.data,
                mimeType: inline.mimeType || inline.mime_type || "image/png"
              });
            }
          }
        }
        errors.push(model + ": khong tra ve anh");
      } catch (e) {
        errors.push(model + ": " + e.message);
      }
    }

    return res.status(500).json({ error: { message: errors.join(" | ") } });

  } catch (err) {
    return res.status(500).json({ error: { message: "Loi server: " + err.message } });
  }
}
