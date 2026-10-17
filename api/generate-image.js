// Danh sách các siêu mô hình đời mới nhất có hỗ trợ xuất ảnh (IMAGE modality)
const MODELS = [
  "gemini-4-argon",             // Đầu não đời mới nhất, vẽ siêu đẹp
  "gemini-2.0-flash-image",     // Bản nâng cấp ổn định, tốc độ chớp nhoáng
  "gemini-2.5-flash-image-preview" // Bản dự phòng phân tầng
];

export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức POST gửi từ ứng dụng Android lên
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: { message: "Thieu prompt" } });
    }

    // Thuật toán xoay tua phím Key khẩn cấp để tối ưu hóa hạn mức RPD/TPM
    const allKeys = (process.env.GEMINI_API_KEYS || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);

    if (allKeys.length === 0) {
      return res.status(500).json({ error: { message: "Chua cau hinh GEMINI_API_KEYS tren server Vercel" } });
    }

    const key = allKeys[Math.floor(Math.random() * allKeys.length)];
    const errors = [];

    // Vòng lặp thông minh: Thử lần lượt từng siêu mô hình, cái nào ra ảnh trước thì dùng ngay
    for (const model of MODELS) {
      try {
        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt + ". Tạo thành một bức ảnh nghệ thuật, chi tiết, chất lượng cao." }] }],
              generationConfig: { 
                responseModalities: ["TEXT", "IMAGE"] // Ép hệ thống kích hoạt bộ giải mã hình ảnh mã nguồn mở
              }
            })
          }
        );

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
          errors.push(model + ": " + ((data.error && data.error.message) ? data.error.message : geminiResponse.status));
          continue;
        }

        // Bóc tách mảng dữ liệu sinh ra từ bộ não AI của Google
        const parts = data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts;

        if (parts) {
          for (const part of parts) {
            // Sửa lỗi cấu trúc: Nhận diện linh hoạt cả cấu trúc inlineData hoặc inline_data
            const inline = part.inlineData || part.inline_data;
            if (inline && inline.data) {
              // Trả chuỗi ảnh Base64 sạch sẽ về cho ứng dụng Casy OS hiển thị trực tiếp
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

    // Nếu duyệt qua toàn bộ các model mà vẫn lỗi (do hết quota tất cả dòng), trả về mã lỗi tổng hợp
    return res.status(500).json({ error: { message: "Tất cả các model tạo ảnh đều bận hoặc hết hạn mức: " + errors.join(" | ") } });

  } catch (err) {
    return res.status(500).json({ error: { message: "Loi he thong server Casy: " + err.message } });
  }
}
