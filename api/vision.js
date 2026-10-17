import { Groq } from '@groq/groq-sdk';

export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức POST gửi từ app Android lên
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  try {
    const { imageBase64, mimeType } = req.body;

    // Kiểm tra dữ liệu đầu vào từ điện thoại gửi lên
    if (!imageBase64) {
      return res.status(400).json({ error: { message: "Thieu du lieu anh" } });
    }

    // 1. Thuật toán gom và chọn ngẫu nhiên Groq API Key để chia tải (Load Balancing)
    const allKeys = (process.env.GROQ_API_KEYS || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);

    if (allKeys.length === 0) {
      return res.status(500).json({ error: { message: "Chua cau hinh GROQ_API_KEYS tren server Vercel" } });
    }

    // Tự động xoay tua phím Key ngẫu nhiên để tối ưu hóa hạn mức RPM/TPM
    const chosenKey = allKeys[Math.floor(Math.random() * allKeys.length)];

    // 2. Khởi tạo cấu hình kết nối độc lập với hệ thống Groq
    const groq = new Groq({ apiKey: chosenKey });

    // Chuẩn hóa định dạng chuỗi ảnh Data URI cho mô hình Vision (Mặc định là image/jpeg nếu app không truyền sang)
    const currentMimeType = mimeType || "image/jpeg";
    const imageUrlData = `data:${currentMimeType};base64,${imageBase64}`;

    // 3. Tiến hành gọi mô hình Llama Vision phân tích xử lý đa phương thức
    const groqResponse = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview", // Khai báo model Vision tối ưu và siêu tốc của Groq
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Mo ta chi tiet nhung gi co trong anh nay bang tieng Viet, khach quan, ngan gon trong khoang 3-4 cau. Khong binh luan, chi mo ta." 
            },
            { 
              type: "image_url", 
              image_url: { url: imageUrlData } 
            }
          ]
        }
      ],
      temperature: 0.2, // Giữ độ chính xác cao khi bóc tách ngữ cảnh vật thể
      max_tokens: 300   // Giới hạn số lượng chữ trả về để tối ưu tài nguyên mạng
    });

    // 4. Bóc tách kết quả văn bản trả về từ bộ não AI của Groq
    const description = groqResponse.choices && 
                        groqResponse.choices[0] && 
                        groqResponse.choices[0].message && 
                        groqResponse.choices[0].message.content;

    if (!description) {
      return res.status(500).json({ error: { message: "Khong doc duoc mo ta anh tu he thong Groq" } });
    }

    // Trả kết quả chữ thuần túy về cho ứng dụng Zeno AI trên Redmi K60 hiển thị
    return res.status(200).json({ description: description });

  } catch (err) {
    // Xử lý lỗi hệ thống ngầm hoặc lỗi phản hồi từ API trung gian
    return res.status(500).json({ error: { message: "Loi server Casy: " + err.message } });
  }
}
