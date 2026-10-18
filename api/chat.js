// ===== Tuỳ chỉnh Zeno =====
// true  = server tự đoán chuyên gia (Marketing/Game/Học tập) theo từ khoá, kể cả khi chưa cài trong Store
// false = chỉ chuyên gia đã cài trong Store mới hoạt động (giao diện lo việc này)
const ENABLE_SERVER_PERSONAS = false;

// Tìm nguyên từ (không bị dính kiểu "không" chứa "ông")
function hasWord(text, word) {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(^|[^\\p{L}\\p{N}])" + esc + "($|[^\\p{L}\\p{N}])", "u").test(text);
}
function hasAny(text, words) {
  return words.some(w => w.includes(" ") ? text.includes(w) : hasWord(text, w));
}

// Chọn cách xưng hô theo cách người dùng nói, mặc định lịch sự: tớ - cậu
function pickPronoun(messages) {
  const userMsgs = messages.filter(m => m.role === "user").slice(-4).reverse();
  for (const m of userMsgs) {
    const t = String(m.content || "").toLowerCase();
    if (hasAny(t, ["mày", "tao"])) {
      return "Người dùng đang nói chuyện thân mật, suồng sã. Hãy xưng 'tao' và gọi người dùng là 'mày'.";
    }
    if (hasAny(t, ["ông", "tôi"])) {
      return "Người dùng thích phong cách chiến hữu bè bạn. Hãy xưng 'tôi' và gọi người dùng là 'ông'.";
    }
    if (hasAny(t, ["cậu", "tớ"])) {
      return "Người dùng thích phong cách nhẹ nhàng, lịch sự. Hãy xưng 'tớ' và gọi người dùng là 'cậu'.";
    }
  }
  return "Mặc định, hãy xưng hô lịch sự là 'tớ' và gọi người dùng là 'cậu'.";
}

// Chuyên gia theo chủ đề
function pickRole(messages) {
  const last = messages.filter(m => m.role === "user").slice(-1)[0];
  const t = String((last && last.content) || "").toLowerCase();

  if (hasAny(t, ["dịch", "translate", "tiếng anh", "tiếng việt"])) {
    return "Bạn đang ở chế độ Zeno Phiên Dịch - chuyên gia dịch thuật song ngữ, dịch mượt và đúng ngữ cảnh.";
  }
  if (!ENABLE_SERVER_PERSONAS) return "";

  if (hasAny(t, ["marketing", "quảng cáo", "bán hàng", "kinh doanh", "content"])) {
    return "Bạn đang ở chế độ Zeno Marketing - chuyên gia tư vấn chiến lược nội dung và thương hiệu chuyên nghiệp.";
  }
  if (hasAny(t, ["game", "liên quân", "pubg", "genshin", "meta", "chiến thuật"])) {
    return "Bạn đang ở chế độ Zeno Game - trùm phân tích meta và mẹo chơi game mobile/PC.";
  }
  if (hasAny(t, ["học", "bài tập", "giải bài", "toán", "văn", "lý", "hóa", "code"])) {
    return "Bạn đang ở chế độ Zeno Học Tập - người thầy kiên nhẫn giảng giải kiến thức hoặc sửa lỗi lập trình chi tiết.";
  }
  return "";
}

// Gắn chỉ thị xưng hô + chuyên gia vào cuối system prompt
function applyZenoStyle(messages) {
  const extra =
    (pickRole(messages) ? pickRole(messages) + " " : "") +
    "LƯU Ý VỀ XƯNG HÔ: " + pickPronoun(messages) +
    " Hãy dùng đúng cặp đại từ đó xuyên suốt câu trả lời, không được nhầm lẫn.";

  const out = messages.map(m => ({ ...m }));
  const idx = out.findIndex(m => m.role === "system");
  if (idx >= 0) {
    out[idx].content = String(out[idx].content) + "\n\n" + extra;
  } else {
    out.unshift({ role: "system", content: extra });
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  try {
    let { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: { message: "Thieu messages" } });
    }

    messages = applyZenoStyle(messages);

    const groqKeys = (process.env.GROQ_API_KEYS || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
    const geminiKeys = (process.env.GEMINI_API_KEYS || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);

    if (groqKeys.length === 0 && geminiKeys.length === 0) {
      return res.status(500).json({ error: { message: "Chua cau hinh API key nao tren server" } });
    }

    // ---------- 1. Thu Groq truoc ----------
    let groqError = "";
    if (groqKeys.length > 0) {
      try {
        const chosenKey = groqKeys[Math.floor(Math.random() * groqKeys.length)];
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + chosenKey
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: messages,
            temperature: 0.9
          })
        });

        const data = await groqResponse.json();
        const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

        if (groqResponse.ok && text) {
          return res.status(200).json(data);
        }
        groqError = (data && data.error && data.error.message) ? data.error.message : ("Groq status " + groqResponse.status);
      } catch (e) {
        groqError = e.message;
      }
    }

    // ---------- 2. Groq loi -> chuyen sang Gemini ----------
    if (geminiKeys.length === 0) {
      return res.status(502).json({ error: { message: "Groq loi: " + groqError + " (chua co GEMINI_API_KEYS de du phong)" } });
    }

    const systemText = messages
      .filter(m => m.role === "system")
      .map(m => String(m.content))
      .join("\n\n");

    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content) }]
      }));

    if (contents.length === 0) {
      return res.status(400).json({ error: { message: "Khong co tin nhan nguoi dung" } });
    }

    const body = {
      contents: contents,
      generationConfig: { temperature: 0.9 }
    };
    if (systemText) {
      body.systemInstruction = { parts: [{ text: systemText }] };
    }

    // thu lan luot cac key Gemini (xao tron), key nao ok thi dung
    const shuffled = geminiKeys.slice().sort(() => Math.random() - 0.5);
    let geminiError = "";

    for (const key of shuffled) {
      try {
        const gRes = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + key,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );
        const gData = await gRes.json();

        const gText = gData.candidates &&
          gData.candidates[0] &&
          gData.candidates[0].content &&
          gData.candidates[0].content.parts &&
          gData.candidates[0].content.parts.map(p => p.text || "").join("");

        if (gRes.ok && gText) {
          // tra ve dung dang OpenAI de frontend khong can sua
          return res.status(200).json({
            choices: [{ message: { role: "assistant", content: gText } }],
            provider: "gemini"
          });
        }
        geminiError = (gData.error && gData.error.message) ? gData.error.message : ("Gemini status " + gRes.status);
      } catch (e) {
        geminiError = e.message;
      }
    }

    return res.status(502).json({
      error: { message: "Ca Groq va Gemini deu loi. Groq: " + groqError + " | Gemini: " + geminiError }
    });
  } catch (err) {
    return res.status(500).json({ error: { message: "Loi server: " + err.message } });
  }
}
