const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5500;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn(
    "Warning: GEMINI_API_KEY is not set. Create a .env file with GEMINI_API_KEY=YOUR_KEY"
  );
}

app.use(express.json({ limit: "2mb" }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

function buildSystemPrompt(questionText) {
  return (
    "You are a helpful homework tutor for kids aged 8–14. The input is a question: '" +
    String(questionText || "")
      .replace(/\s+/g, " ")
      .trim() +
    "'. Explain step-by-step how to solve it, using simple language, examples, and tips. Do not give the final answer directly — instead, guide them to find it themselves."
  );
}

app.post("/api/gemini", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ error: "Server not configured with GEMINI_API_KEY" });
    }
    const { questionText, detailedMode } = req.body || {};
    if (!questionText || typeof questionText !== "string") {
      return res.status(400).json({ error: "Missing questionText" });
    }

    const systemPrompt = buildSystemPrompt(questionText);
    const detailInstruction = detailedMode
      ? " Provide a thorough explanation with about 6–9 steps, include a tiny example and a quick tip where helpful."
      : " Keep it concise with about 3–5 simple steps.";
    const userPrompt =
      "Mode: " +
      (detailedMode ? "Detailed" : "Basic") +
      ". " +
      detailInstruction;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
      encodeURIComponent(GEMINI_API_KEY);

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        },
      ],
      generationConfig: { temperature: detailedMode ? 0.6 : 0.4 },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return res
        .status(response.status)
        .json({ error: "Gemini error", detail: errText });
    }
    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((p) => p.text || "")
      .join("\n")
      .trim();
    return res.json({ text });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server exception", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Homework Helper AI server running on http://localhost:${PORT}`);
});
