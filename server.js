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

/* ----------------------------
   15 DIMENSIONS
---------------------------- */

const dimensions = [
  "emotion","thoughts","habits","likes","love",
  "family","friendship","life_direction","faith",
  "self_image","self_conflict","desires","fears",
  "memory","random_self"
];

/* ----------------------------
   50 VISUAL WORLDS (SKINS)
---------------------------- */

const worlds = [
  "dream_morning","golden_room","rain_window","beach_sunset",
  "deep_ocean","moonlight_room","neon_city","forest_silence",
  "fog_memory","soft_white_space"
];

function pick(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

/* ----------------------------
   MAIN REFLECT ENGINE
---------------------------- */

app.post("/reflect", async (req,res)=>{

  const { text, user_id = "guest" } = req.body;

  const world = pick(worlds);
  const dimension = pick(dimensions);

  // GET MEMORY
  const { data: memory } = await supabase
    .from("memory_summary")
    .select("*")
    .eq("user_id", user_id)
    .single();

  const systemPrompt = `
You are "know." — a living identity journal.

You remember the user across time.

CURRENT DIMENSION: ${dimension}
CURRENT WORLD: ${world}

USER MEMORY:
${memory?.summary || "no memory yet"}

RULES:
- reflect, don’t lecture
- rotate identity lenses naturally
- stay soft, human, slightly poetic
- evolve personality based on memory
- never diagnose

Keep response short and alive.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ],
    temperature: 0.9
  });

  const reply = response.choices[0].message.content;

  /* ----------------------------
     SAVE MESSAGE MEMORY
  ---------------------------- */

  await supabase.from("messages").insert([
    { session_id: user_id, role: "user", content: text },
    { session_id: user_id, role: "ai", content: reply }
  ]);

  res.json({
    reply,
    world,
    dimension
  });

});

app.listen(3000, ()=>{
  console.log("know system running");
});
