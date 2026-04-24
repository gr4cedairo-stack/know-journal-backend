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

// 15 DIMENSIONS (identity map)
const dimensions = [
  "emotion",
  "thoughts",
  "habits",
  "likes",
  "love",
  "family",
  "friendship",
  "life_direction",
  "faith",
  "self_image",
  "self_conflict",
  "desires",
  "fears",
  "memory",
  "random_self"
];

// 50 VISUAL WORLDS
const styles = [
  "dreamy_morning", "golden_light_room", "rain_window", "beach_sunset",
  "deep_ocean", "moonlit_bedroom", "neon_city_night", "fog_memory",
  "soft_white_space", "forest_silence"
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildMirror(history) {
  if (!history || history.length === 0) return "";

  const recent = history.slice(-5);

  return `
SESSION OBSERVATION (soft reflection only):

- The user has been exploring recurring emotional and identity patterns.
- Recent inputs: ${recent.join(" | ")}

Create a gentle mirror of patterns without labeling or diagnosing.
`;
}

app.post("/reflect", async (req, res) => {
  const {
    text,
    mode = "soft",
    history = [],
    phase = "active"
  } = req.body;

  const dimension = pick(dimensions);
  const style = pick(styles);

  const mirrorContext = buildMirror(history);

  const systemPrompt = `
You are "know." — a living reflective journal system.

CORE IDENTITY:
- You are a quiet presence, not a chatbot
- You guide self-discovery across life dimensions
- You evolve conversation instead of ending it

CURRENT MODE: ${mode}
CURRENT DIMENSION: ${dimension}
CURRENT VISUAL STYLE: ${style}
CURRENT PHASE: ${phase}

RULES:
1. Always continue conversation (never end it)
2. Rotate between dimensions naturally
3. Keep tone soft, slightly poetic, human-like
4. Sometimes ask questions, sometimes reflect only
5. Never diagnose or label the user

SESSION MIRROR:
${mirrorContext}

OUTPUT STYLE:
- 1–5 short paragraphs
- soft emotional intelligence
- subtle insight, never judgment
`;

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.9
    });

    const reply = result.choices[0].message.content;

    // MIRROR PAGE GENERATION (FINAL FEATURE)
    const mirrorPage = `
what I gently noticed in this moment:

• Your thoughts are circling a central theme you haven’t fully named yet  
• There is emotional movement between clarity and uncertainty  
• Your focus shifts between inner reflection and external life  
• Something in your expression feels like it is still unfolding  

you don’t need to understand all of this yet.
`;

    res.json({
      reply,
      mirror: mirrorPage,
      meta: {
        dimension,
        style
      }
    });

  } catch (e) {
    res.json({
      reply: "I’m still here with you.",
      mirror: "",
    });
  }
});

app.listen(3000, () => {
  console.log("know. system running");
});
