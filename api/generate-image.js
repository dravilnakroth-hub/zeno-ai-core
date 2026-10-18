import { GoogleGenAI } from "@google/genai";

// Cấu hình danh sách siêu mẫu tạo ảnh chuẩn đét từ tài liệu Google AI Studio 2026
const MODELS = [
  "gemini-4-argon",
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image"
];

export default async function handler(req, res) {
  // Cấu hình CORS để giao diện PWA Edge gọi vào không bị chặn
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Bốc khóa vạn năng Gemini từ Environment Variables ông đã nạp
  const apiKey = process.env.GEMINI_API_KEYS;
  if (!apiKey) {
    return res.status(500).json({ error: "Thiếu GEMINI_API_KEYS trong cài đặt Vercel rồi ông ơi!" });
  }

  const ai = new GoogleGenAI({ apiKey });

  // Thuật toán vòng lặp thông minh: Thấy con nào chết/hết hạn mức là tự nhảy sang con dự phòng
  for (const model of MODELS) {
    try {
      // Ép prompt tiếng Việt sang phong cách vẽ ảnh chuẩn nghệ thuật cho Gemini
      const imagePrompt = `Generate a beautiful high-quality image based on this description: ${message}. Artistic style, highly detailed.`;
      
      const response = await ai.models.generateImages({
        model: model,
        prompt: imagePrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1"
        }
      });

      // Kiểm tra xem Gemini có nhả ảnh về không
      if (response && response.generatedImages && response.generatedImages[0]) {
        const base64Image = response.generatedImages[0].image.imageBytes;
        
        // Trả về JSON sạch sẽ 100%, không bao giờ lo lỗi Unexpected token 'A'
        return res.status(200).json({
          response: `Tao vẽ xong con mèo cho mày rồi nhé!`,
          image: `data:image/jpeg;base64,${base64Image}`
        });
      }
    } catch (error) {
      console.error(`Model ${model} bị sập hoặc hết hạn mức, đang nhảy sang con tiếp theo... Error:`, error.message);
      // Tiếp tục vòng lặp thử con model sơ cua tiếp theo trong mảng
      continue;
    }
  }

  // Nếu đen đủi tất cả các model đều sập hoàn toàn
  return res.status(200).json({
    response: "Tao định vẽ cho mày rồi mà tất cả các model tạo ảnh của Google (gồm cả các con dự phòng) đều đang bị bận hoặc hết sạch hạn mức miễn phí rồi. Tí nữa thử lại xem sao nhé ông!"
  });
}
