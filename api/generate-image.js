const MODELS = [
  "gemini-4-argon",
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image"
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const apiKey = process.env.GEMINI_API_KEYS;
  if (!apiKey) {
    return res.status(200).json({ response: "Thiếu GEMINI_API_KEYS trong mục Environment Variables trên Vercel rồi ông ơi!" });
  }

  for (const model of MODELS) {
    try {
      const url = `https://googleapis.com{model}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{
          parts: [{
            text: `Generate a beautiful high-quality image based on this description: ${message}. Artistic style, highly detailed.`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data && data.candidates && data.candidates[0] && data.candidates[0].content) {
        const textResponse = data.candidates[0].content.parts[0].text;
        return res.status(200).json({
          response: "Tao vẽ xong cho mày rồi nhé! Xem mượt không nè ông.",
          image: textResponse.includes("base64") ? textResponse : `data:image/jpeg;base64,${textResponse}`
        });
      }
    } catch (err) {
      console.log(`Model ${model} tạch, tự động nhảy sang con tiếp theo...`);
      continue;
    }
  }

  return res.status(200).json({
    response: "Tao định vẽ cho mày rồi mà tất cả các model tạo ảnh của Google (kể cả hàng sơ cua) đều đang bị quá tải hoặc hết sạch hạn mức Free hôm nay rồi. Tí nữa hoặc ngày mai thử lại xem sao nhé ông!"
  });
}
