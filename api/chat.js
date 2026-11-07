export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "The AI service is not configured yet." });
  }

  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length || messages.length > 40) {
      return res.status(400).json({ error: "Please send between 1 and 40 messages." });
    }

    const safeMessages = messages
      .filter((message) =>
        ["user", "assistant"].includes(message?.role) &&
        typeof message?.content === "string"
      )
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 12000)
      }));

    if (!safeMessages.length) {
      return res.status(400).json({ error: "No valid messages were provided." });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are NEXA AI, a helpful, clear, friendly AI assistant. Reply in the language used by the user."
          },
          ...safeMessages
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(response.status).json({
        error: data?.error?.message || "The AI service could not complete the request."
      });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(502).json({ error: "The AI service returned an empty response." });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("NEXA API error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
