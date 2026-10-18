export const config = { runtime: "edge" };

import { Groq } from '@groq/groq-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { message } = req.body; 
    
    if (!message) return res.status(400).json({ error: 'Thieu tin nhan' });

    const allKeys = (process.env.GROQ_API_KEYS || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
    if (allKeys.length === 0) return res.status(500).json({ error: 'Chua cau hinh GROQ_API_KEYS' });
    const chosenKey = allKeys[Math.floor(Math.random() * allKeys.length)];
    const groq = new Groq({ apiKey: chosenKey });

    // 1. CHUẨN HÓA TIN NHẮN VỀ CHỮ VIẾT THƯỜNG ĐỂ NHẬN DIỆN CHÍNH XÁC
    const lowerMessage = message.toLowerCase();

    // 2. THIẾT LẬP TÍNH CÁCH MẶC ĐỊNH (ZENO GỐC - CÀ KHỊA / NẤU ĂN)
    let systemPrompt = "Bạn là Zeno AI - Tính cách gốc: tinh nghịch, thích tám chuyện và hay cà khịa nhẹ nhàng bằng tiếng Việt, xưng mày - tao gần gũi. Nếu người dùng hỏi về nấu ăn, hãy trả lời theo phong cách tính cách gốc này.";

    // 3. BỘ LỌC TỰ ĐỘNG NHẬN DIỆN CHỦ ĐỀ QUA TỪ KHÓA (KEYWORD FILTER)
    
    // Kiểm tra chủ đề MARKETING & KINH DOANH
    if (lowerMessage.includes("marketing") || lowerMessage.includes("quảng cáo") || lowerMessage.includes("bán hàng") || lowerMessage.includes("kinh doanh") || lowerMessage.includes("thương hiệu") || lowerMessage.includes("content")) {
      systemPrompt = "Bạn là Zeno Marketing - Chuyên gia tư vấn content, quảng cáo và xây dựng thương hiệu chuyên nghiệp. Hãy đưa ra các ý tưởng đột phá, chiến lược kinh doanh thực tế, ngắn gọn.";
    } 
    
    // Kiểm tra chủ đề GAME (Kích hoạt Zeno Game)
    else if (lowerMessage.includes("game") || lowerMessage.includes("chơi trò") || lowerMessage.includes("liên quân") || lowerMessage.includes("pubg") || lowerMessage.includes("genshin") || lowerMessage.includes("fps") || lowerMessage.includes("meta") || lowerMessage.includes("chiến thuật")) {
      systemPrompt = "Bạn là Zeno Game - Trùm phân tích meta game, am hiểu tips chiến thuật, lối chơi của các tựa game mobile và PC. Trả lời theo phong cách ngắn gọn, chuẩn game thủ, am hiểu trận đấu.";
    } 
    
    // Kiểm tra chủ đề HỌC TẬP & CODE
    else if (lowerMessage.includes("học") || lowerMessage.includes("bài tập") || lowerMessage.includes("giải bài") || lowerMessage.includes("toán") || lowerMessage.includes("văn") || lowerMessage.includes("lý") || lowerMessage.includes("hóa") || lowerMessage.includes("code") || lowerMessage.includes("lập trình")) {
      systemPrompt = "Bạn là Zeno Học Tập - Người thầy kiên nhẫn, giảng giải các bài toán, lý thuyết hoặc sửa lỗi code một cách dễ hiểu, chi tiết và vô cùng ân cần, giúp học sinh tiến bộ.";
    }

    // 4. BẮN LỆNH SANG ĐẦU NÃO GROQ
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });
    
    return res.status(200).json({ response: completion.choices.message.content });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
