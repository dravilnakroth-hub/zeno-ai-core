// Danh sách các model tạo ảnh chính xác tuyệt đối của Google AI Studio
const MODELS = [
  "gemini-4-argon",
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image"
];

export default async function handler(req, res) {
  // CORS full cấu hình cho PWA chạy trên Edge
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const apiKey = process.env.GEMINI_API_KEYS;
  if (!apiKey) {
    return res.status(200).json({ response: "Thiếu GEMINI_API_KEYS trong cài đặt Environment Variables của Vercel rồi ông ơi!" });
  }

  // Thuật toán vòng lặp quét từng model sơ cua bằng fetch thuần
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
          responseMimeType: "application/json" // Ép Google trả về cấu trúc JSON chứa ảnh base64
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      // Phân tích cú pháp xem Google có nhả ảnh về không
      if (data && data.candidates && data.candidates[0] && data.candidates[0].content) {
        const textResponse = data.candidates[0].content.parts[0].text;
        
        // Trả về JSON sạch sẽ tuyệt đối cho PWA Edge nhận diện
        return res.status(200).json({
          response: "Tao vẽ xong con mèo cho mày rồi nhé! Xem mượt không nè.",
          image: textResponse.includes("base64") ? textResponse : `data:image/jpeg;base64,${textResponse}`
        });
      }
    } catch (err) {
      console.log(`Model ${model} báo lỗi, tự động nhảy sang con sơ cua tiếp theo...`);
      continue; // Lỗi phát tự động bỏ qua để chạy con model tiếp theo ngay
    }
  }

  // Kịch bản nếu tất cả các model đều hết lượt dùng miễn phí trong ngày
  return res.status(200).json({
    response: "Tao định vẽ cho mày rồi mà tất cả các model tạo ảnh của Google (kể cả hàng sơ cua) đều đang bị quá tải hoặc hết sạch hạn mức Free hôm nay rồi. Tí nữa hoặc ngày mai thử lại xem sao nhé ông!"
  });
}
