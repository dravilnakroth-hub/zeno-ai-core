export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức POST gửi từ ứng dụng Android lên
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  try {
    const { videoBase64, mimeType, prompt } = req.body;

    if (!videoBase64) {
      return res.status(400).json({ error: { message: "Thieu du lieu video" } });
    }

    // 1. Tận dụng xoay tua phím Key khẩn cấp từ hệ thống Google (Gemini)
    // Mẹo: Dùng lại biến GROQ_API_KEYS để bọc hoặc lấy phím Key từ biến phụ
    const allKeys = (process.env.GEMINI_API_KEYS || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);

    if (allKeys.length === 0) {
      return res.status(500).json({ error: { message: "Chua cau hinh GEMINI_API_KEYS cho tinh nang Video trên Vercel" } });
    }

    const chosenKey = allKeys[Math.floor(Math.random() * allKeys.length)];

    // 2. Gọi sang dòng mô hình Gemini 3.8 Flash đời mới nhất chuyên dụng xem video
    const geminiResponse = await fetch(
      "https://googleapis.com" + chosenKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt || "Xem video này và mô tả chi tiết nội dung diễn biến bằng tiếng Việt." },
              { 
                inline_data: { 
                  mime_type: mimeType || "video/mp4", // Cấu hình định dạng video nhận từ điện thoại
                  data: videoBase64 
                } 
              }
            ]
          }]
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const errMsg = (data.error && data.error.message) ? data.error.message : "Loi khi phan tich video tu Gemini";
      return res.status(geminiResponse.status).json({ error: { message: errMsg } });
    }

    // 3. Trích xuất nội dung văn bản bóc tách ngữ cảnh video
    const description = data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!description) {
      return res.status(500).json({ error: { message: "Zeno khong doc duoc du lieu tu video nay" } });
    }

    // Trả kết quả phân tích về cho giao diện Casy OS
    return res.status(200).json({ description: description });

  } catch (err) {
    return res.status(500).json({ error: { message: "Loi server video: " + err.message } });
  }
}
