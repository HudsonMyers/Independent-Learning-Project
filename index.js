// ------------------------------
// Backend: Independent-Learning-Project
// ------------------------------
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

// API key check
const API_KEY = process.env.PROCESS_ENV_API_KEY || process.env.API_KEY;
if (!API_KEY) {
  console.error("Error: API_KEY is not set. Please add it to your .env file.");
  process.exit(1);
}

// ------------------------------
// Multer Setup for File Uploads
// ------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: async function(req, file, cb) {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ------------------------------
// OpenAI Chat API Helper
// ------------------------------
async function callChatApi(messages, userStatus) {
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  const modelName = userStatus === 'premium' ? "gpt-4o" : "gpt-4o-mini";

  const payload = {
    model: modelName,
    messages: messages,
    temperature: 0.7,
    response_format: { type: "json_object" },
    max_completion_tokens: 1000
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim();
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw error;
  }
}

// ------------------------------
// Endpoint: Generate Units
// ------------------------------
app.post('/api/generate-units', async (req, res) => {
  try {
    const { college, major, course } = req.body;

    const prompt = `
Generate exactly 10 specific academic unit names for the course "${course}" at ${college} for a ${major} major.

STRICT JSON OUTPUT ONLY:
{
  "units": [
    { "label": "Unit 1 – Topic Name", "value": "Unit 1 – Topic Name" },
    ...
  ]
}
`;

    const rawResponse = await callChatApi([{ role: "user", content: prompt }], "unauthenticated");
    const units = JSON.parse(rawResponse);
    res.json(units.units);
  } catch (error) {
    res.status(500).send({ error: "Failed to generate units." });
  }
});

// ------------------------------
// Endpoint: Generate Quiz Question
// ------------------------------
app.post('/api/generate-question', upload.single('image'), async (req, res) => {
  let imagePath = null;
  try {
    const { college, major, course, unit, topic, difficulty, userStatus } = req.body;

    // 1. Determine Category for Formatting (Logic from Backend 1)
    const lowerMajor = major.toLowerCase();
    let category = "analytical";
    if (lowerMajor.includes("science") || lowerMajor.includes("engineering") || lowerMajor.includes("tech")) category = "technical";
    else if (lowerMajor.includes("bio") || lowerMajor.includes("chem") || lowerMajor.includes("physics") || lowerMajor.includes("math")) category = "scientific";
    else if (lowerMajor.includes("history") || lowerMajor.includes("english") || lowerMajor.includes("philosophy")) category = "humanities";

    const systemPrompt = `
You are a college professor. Create a rigorous multiple-choice question.

STRICT FORMATTING RULES:
1. Output ONLY valid JSON.
2. The "question" field MUST use line breaks (\\n) and follow this exact structure:
   ### Scenario
   [Narrative context]
   
   ### Given
   [Bulleted data or code blocks]
   
   ### Question
   [The specific challenge]

3. LEGIBILITY: You MUST include spaces between numbers and words (e.g., "50 million", NOT "50million").
4. LATEX: Wrap ALL mathematical expressions or formulas in single dollar signs for inline math (e.g., $E=mc^2$) or double dollar signs for blocks. 
5. DOUBLE BACKSLASHES: You MUST double every backslash in LaTeX for JSON safety (e.g., $\\\\frac{1}{2}$).
6. NO MARKDOWN EMPHASIS: Do NOT use asterisks (*) or underscores (_) to italicize or bold sentences or long phrases. This causes text-smashing issues. Use plain text for narratives.
7. EXPLICIT SPACING: You MUST include a space between every single word and every number. Never combine values with words (e.g., "20 million", NOT "20million").
8. CODE: If category is "technical", use a Markdown code block (\`\`\`python). For "Given" lists that include math, do NOT use a markdown code block as it breaks LaTeX rendering; use a standard bulleted list instead.
`;

    const userPrompt = `
Create a level ${difficulty}/10 difficulty question for "${course}" regarding the unit "${unit}".

1. The scenario MUST connect to "${topic}" using a REAL and specific detail:
- Use real products, strategies, or known facts
- NO fake inventions
- NO fake future events

2. The question must:
- have exactly ONE correct answer
- be objectively answerable
- NOT be generic

3. Avoid boring textbook phrasing like:
"A company invests..."
Instead, anchor it in a real-world context.

4. The question should resemble something that would realistically appear on a quiz or exam for this specific unit.

5. The question must be:
 - objectively answerable
 - have exactly ONE correct answer
 - not vague or discussion-based

The scenario MUST include a specific, recognizable element of "${topic}" (e.g., a Nike product line, marketing strategy, or real-world behavior).

STYLE RULES:
- Use clear, professional spacing. 
- Ensure numbers and their units are separated by a space (e.g., "8%", "$50 million").
- If including a calculation like NPV, show the formula in the 'Given' section using LaTeX.

CONTEXT:
College: ${college}
Major: ${major}
Category: ${category}
Units: ${unit}
Difficulty: ${difficulty}

JSON STRUCTURE:
{
  "question": "### Scenario\\n...\\n ### Given\\n...\\n\\n### Question\\n...",
  "options": ["string", "string", "string", "string"],
  "correctAnswerIndex": 0
}
`;

    let messages = [{ role: "system", content: systemPrompt }];

    if (req.file) {
      imagePath = req.file.path;
      const base64Image = (await fs.readFile(imagePath)).toString("base64");
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt + "\nCRITICAL: Analyze the attached notes. The question MUST require the formula or concept found in the image to solve the problem related to ${topic}." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const rawResponse = await callChatApi(messages, userStatus);
    res.json(JSON.parse(rawResponse));

  } catch (error) {
    res.status(500).send({ error: "Failed to generate question." });
  } finally {
    if (imagePath) await fs.unlink(imagePath).catch(() => {});
  }
});

// ------------------------------
// Start server
// ------------------------------
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});