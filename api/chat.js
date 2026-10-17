export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: { message: "Thieu messages" } });
    }

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
