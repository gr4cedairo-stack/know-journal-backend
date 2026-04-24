import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---- OPENAI ----
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ---- SUPABASE ----
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ---- VISUAL WORLDS (expandable to 50) ----
const worlds = [
  { name: "dream_morning", bg: "#1a1a2e" },
  { name: "sunset", bg: "#3a1c71" },
  { name: "ocean", bg: "#0f3460" },
  { name: "forest", bg: "#1b4332" },
  { name: "moon", bg: "#0b0b10" },
  { name: "soft_space", bg: "#2c2c54" },
  { name: "rain", bg: "#22223b" },
  { name: "golden", bg: "#6d4c41" }
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- MAIN ROUTE ----
app.post("/reflect", async (req, res) => {
  const { text, user_id = "user1" } = req.body;

  try {
    // ---- LOAD MEMORY ----
    const { data: past } = await supabase
      .from("messages")
      .select("content, role")
      .eq("session_id", user_id)
      .order("created_at", { ascending: false })
      .limit(12);

    let memory = "";
    if (past) {
      memory = past
        .reverse()
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");
    }

    const world = pick(worlds);

    // ---- PERSONALITY SYSTEM ----
    const systemPrompt = `
You are "know." — a quiet reflective presence.

You help the user understand themselves over time.

You remember them.

---

BEHAVIOR:

- Continue threads, don’t reset
- Notice patterns
- Ask meaningful, non-generic questions
- Sometimes just reflect (no question)
- Keep space, don’t overwhelm

---

MEMORY STYLE:

Subtle references:
"this feels similar to something you mentioned before..."

Never sound technical.

---

TONE:

- soft
- human
- slightly poetic
- emotionally aware

---

GOAL:

They should feel:
"I’m being understood… even when I don’t fully understand myself."

---

PAST MEMORY:
${memory}
`;

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.9
    });

    const reply = ai.choices[0].message.content;

    // ---- SAVE MEMORY ----
    await supabase.from("messages").insert([
      { session_id: user_id, role: "user", content: text },
      { session_id: user_id, role: "ai", content: reply }
    ]);

    // ---- MIRROR SYSTEM ----
    const mirrorPrompt = `
You are observing a person.

Conversation:
${memory}
User: ${text}

Write a gentle reflection:
- patterns
- emotional tension
- what is unresolved
- what is emerging

No judgment. No labels. Human tone.
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

  } catch (err) {
    res.json({
      reply: "I’m still here with you.",
      mirror: "",
      world: { bg: "#0b0b10" }
    });
  }
});

app.listen(3000, () => console.log("know. running"));
