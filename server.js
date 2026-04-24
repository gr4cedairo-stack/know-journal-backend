import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

let memory = [];

function getMemory() {
  return memory.slice(-12).join("\n");
}

app.post("/reflect", async (req, res) => {
  const { text, world, mode, phase } = req.body;

  memory.push(`[${world}] ${text}`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are "know." — a quiet reflective journal presence.

STYLE:
- soft, minimal, slightly poetic
- 1–4 sentences only
- calm and grounded

RULES:
- never be dramatic
- never label the user
- use "it seems", "there appears"

USER CONTEXT:
Mode: ${mode}
Phase: ${phase}
World: ${world}

MEMORY:
${getMemory()}
`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.9
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (err) {
    res.json({
      reply: "I hear you. Stay with that thought."
    });
  }
});

app.listen(3000, () => {
  console.log("know running");
});
