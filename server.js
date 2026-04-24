import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* -----------------------
   VISUAL WORLDS (UI THEMES)
------------------------ */

const worlds = [
  { name: "dream", bg: "#1a1a2e" },
  { name: "sunset", bg: "#3a1c71" },
  { name: "ocean", bg: "#0f3460" },
  { name: "forest", bg: "#1b4332" },
  { name: "moon", bg: "#0b0b10" },
  { name: "soft", bg: "#2c2c54" }
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* -----------------------
   MAIN ROUTE
------------------------ */

app.post("/reflect", async (req, res) => {
  const { text, user_id = "user1" } = req.body;

  /* ---- LOAD MEMORY ---- */
  const { data: past } = await supabase
    .from("messages")
    .select("content, role")
    .eq("session_id", user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  let memory = "";
  if (past) {
    memory = past.reverse()
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");
  }

  const world = pick(worlds);

  /* ---- AI PROMPT ---- */
  const systemPrompt = `
You are "know." — a living reflective journal.

You remember the user across time.

PAST MEMORY:
${memory}

RULES:
- reflect softly
- connect past and present
- ask meaningful questions sometimes
- sound human, not robotic
- never diagnose

Keep responses short, emotional, and slightly poetic.
`;

  try {
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.9
    });

    const reply = ai.choices[0].message.content;

    /* ---- SAVE MEMORY ---- */
    await supabase.from("messages").insert([
      { session_id: user_id, role: "user", content: text },
      { session_id: user_id, role: "ai", content: reply }
    ]);

    /* ---- MIRROR GENERATION ---- */
    const mirrorPrompt = `
Based on this conversation:

${memory}
User: ${text}

Write a gentle reflection of patterns.
Do not judge. Keep it soft.
`;

    const mirrorAI = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: mirrorPrompt }],
      temperature: 0.8
    });

    const mirror = mirrorAI.choices[0].message.content;

    res.json({
      reply,
      mirror,
      world
    });

  } catch (e) {
    res.json({
      reply: "I’m still here.",
      mirror: "",
      world: { bg: "#0b0b10" }
    });
  }
});

app.listen(3000, () => console.log("know. running"));
