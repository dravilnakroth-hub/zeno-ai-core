export const config = { runtime: "edge" };

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  try {
    const { message } = await req.json();
    if (!message) return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers });

    const apiKey = process.env.GROQ_API_KEYS;
    if (!apiKey) {
      return new Response(JSON.stringify({ response: "Thiếu GROQ_API_KEYS trên Vercel rồi cậu ơi!" }), { status: 200, headers });
    }

    const lower_msg = message.toLowerCase();

    // 1. THIẾT LẬP ĐẠI TỪ XƯNG HÔ MẶC ĐỊNH (LỊCH SỰ: TỚ - CẬU)
    let pronoun_instruction = "Mặc định, hãy xưng hô lịch sự là 'tớ' và gọi người dùng là 'cậu'.";

    // 2. THUẬT TOÁN HỌC HỎI THÓI QUEN: TỰ ĐỘNG ĐỔI CẶP ĐẠI TỪ THEO INPUT NGƯỜI DÙNG
    if (lower_msg.includes("mày") || lower_msg.includes("tao")) {
      pronoun_instruction = "Người dùng đang dùng cách nói chuyện thân mật, suồng sã. Hãy lập tức đổi cách xưng hô thành 'tao' và gọi người dùng là 'mày'.";
    } else if (lower_msg.includes("ông") || lower_msg.includes("tôi")) {
      pronoun_instruction = "Người dùng thích phong cách chiến hữu bè bạn. Hãy lập tức đổi cách xưng hô thành 'tôi' và gọi người dùng là 'ông'.";
    } else if (lower_msg.includes("cậu") || lower_msg.includes("tớ")) {
      pronoun_instruction = "Người dùng thích phong cách nhẹ nhàng, lịch sự. Hãy giữ nguyên cách xưng hô là 'tớ' và gọi người dùng là 'cậu'.";
    }

    // 3. BỘ LỌC ĐỔI TÍNH CÁCH THEO CHỦ ĐỀ CHUYÊN MÔN (ZENO STORE)
    let role_instruction = "Bạn là Zeno AI - một trợ lý thông minh, tinh nghịch, thích tám chuyện và giải đáp mọi thắc mắc bằng tiếng Việt ngắn gọn, dễ hiểu.";
    
    if (["marketing", "quảng cáo", "bán hàng", "kinh doanh", "content"].some(k => lower_msg.includes(k))) {
      role_instruction = "Bạn là Zeno Marketing - Chuyên gia tư vấn chiến lược nội dung và thương hiệu chuyên nghiệp.";
    } else if (["game", "liên quân", "pubg", "genshin", "meta", "chiến thuật"].some(k => lower_msg.includes(k))) {
      role_instruction = "Bạn là Zeno Game - Trùm phân tích meta và mẹo chơi game mobile/PC.";
    } else if (["học", "bài tập", "giải bài", "toán", "văn", "lý", "hóa", "code"].some(k => lower_msg.includes(k))) {
      role_instruction = "Bạn là Zeno Học Tập - Người thầy kiên nhẫn giảng giải kiến thức hoặc sửa lỗi lập trình chi tiết.";
    } else if (["dịch", "translate", "tiếng anh", "tiếng việt"].some(k => lower_msg.includes(k))) {
      role_instruction = "Bạn là Zeno Phiên Dịch - Chuyên gia dịch thuật song ngữ mượt mà.";
    }

    // Ghép các chỉ thị lại để ép prompt hệ thống hoàn chỉnh
    const system_prompt = `${role_instruction} LƯU Ý QUAN TRỌNG VỀ XƯNG HÔ: ${pronoun_instruction} Hãy phản hồi đồng nhất theo cặp đại từ đó trong suốt câu trả lời này, tuyệt đối không được nhầm lẫn.`;

    const response = await fetch("https://groq.com", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return new Response(JSON.stringify({ response: data.choices[0].message.content }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ response: "Lỗi kết nối bộ não rồi cậu ơi!" }), { status: 200, headers });
    }

  } catch (error) {
    return new Response(JSON.stringify({ response: `Hệ thống gặp lỗi: ${error.message}` }), { status: 200, headers });
  }
}
