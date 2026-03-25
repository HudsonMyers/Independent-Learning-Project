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
import fs from 'fs/promises'; // Use fs.promises for async file operations

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend from /public

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
// Function to call OpenAI Chat API
// ------------------------------
async function callChatApi(messages, userStatus) {
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  let modelName;

  switch (userStatus) {
    case 'premium':
      modelName = "gpt-4o";
      break;
    case 'authenticated':
      modelName = "gpt-4o-mini";
      break;
    case 'unauthenticated':
    default:
      modelName = "gpt-4o-mini";
      break;
  }

  const payload = {
    model: modelName,
    messages: messages,
    temperature: 0.7,
    response_format: { type: "json_object" },
    max_completion_tokens: 800
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
    const aiResponseContent = result.choices?.[0]?.message?.content;

    if (!aiResponseContent) {
      throw new Error("Invalid response format from OpenAI API");
    }

    return aiResponseContent.trim();
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw error;
  }
}

// ------------------------------
// Function to Simulate Fact Retrieval (DYNAMIC FACT SELECTION)
// ------------------------------
async function fetchCurrentEventFact(topic) {
  const currentYear = new Date().getFullYear();

  // MOUNTAIN DEW / BEVERAGE / SUPPLY CHAIN
  if (topic.toLowerCase().includes("mountain dew") || topic.toLowerCase().includes("pepsico") || topic.toLowerCase().includes("beverage")) {
    const beverageFacts = [
      `PepsiCo's **Project North Star** initiative in ${currentYear} focused on integrating machine learning across its supply chain to optimize bottling plant scheduling and reduce flavor changeover downtime.`,
      `The ${currentYear} launch of a limited-edition Mountain Dew flavor (like Baja Blast Zero Sugar) required PepsiCo's IT department to overhaul their **inventory management database structure** to track perishable components and new vendor relationships.`,
      `In ${currentYear}, PepsiCo announced a major migration of its global customer relationship management (CRM) system to a hybrid cloud architecture to handle peak sales periods, requiring a detailed analysis of **network latency and data security protocols**.`
    ];
    return beverageFacts[Math.floor(Math.random() * beverageFacts.length)];
  }

  // FIXED: GAMING/DATA/SYSTEMS - TECHNICAL FACTS
  if (topic.toLowerCase().includes("fortnite") || topic.toLowerCase().includes("gaming") || topic.toLowerCase().includes("acquisition")) {
    const gamingFacts = [
      `The ${currentYear} launch of a major Fortnite map update required Epic Games to implement a new **data compression algorithm** to efficiently distribute the 50GB file to its 250 million users.`,
      `Following a major acquisition, Epic Games' IT team had to decide between a SQL database (faster read times) and a NoSQL database (better scaling) to manage the fluctuating daily transaction volume of virtual items, which now exceeds **$12 million**.`,
      `The ${currentYear} expansion of the Esports prize pool for Fortnite is managed through a **blockchain system** to ensure transparency, requiring programmers to optimize the smart contract's **gas efficiency** for timely payouts.`
    ];
    return gamingFacts[Math.floor(Math.random() * gamingFacts.length)];
  }

  // CALISTHENICS/BIOMECHANICS
  if (topic.toLowerCase().includes("calisthenics") || topic.toLowerCase().includes("biomechanics")) {
    const calisthenicsFacts = [
      `A ${currentYear} study published by the **American Council on Exercise (ACE)** analyzed the biomechanics of advanced calisthenics like the 'muscle-up,' focusing on the rotational forces and vector displacement of the user's center of mass during the transition phase.`,
      `The ${currentYear} **Journal of Sports Science** reported that optimizing **hand placement angle** during a standard push-up can shift the required tricep force by up to 20%, a finding leveraged by the fitness app **Freeletics**.`,
      `A ${currentYear} pilot program by the **U.S. Marine Corps** tested a new injury prevention strategy for pull-ups, finding that controlling the **eccentric phase (lowering)** time reduced muscle stress vectors.`
    ];
    return calisthenicsFacts[Math.floor(Math.random() * calisthenicsFacts.length)];
  }

  // Default Fallback
  return `In ${currentYear}, a significant event or innovation related to **${topic}** was reported. This fact must be detailed, compelling, and immediately usable to build a complex, solvable academic problem related to data, resources, or scientific principles.`;
}

// ------------------------------
// Endpoint: Generate Units
// ------------------------------
app.post('/api/generate-units', async (req, res) => {
  try {
    const { college, major, course } = req.body;

    const prompt = `
IMPORTANT — OUTPUT FORMAT RULES:
You MUST output ONLY a valid JSON array.
The object must contain exactly ONE key: "units".
units must be an array of exactly 10 objects.
Each object must have exactly two fields: "label" and "value".
NO Markdown.
NO code blocks.
NO explanations or text outside the JSON.

CORRECT FORMAT:
{
"units": [
{ "label": "Unit 1 – Foundations", "value": "Unit 1 – Foundations" },
{ "label": "Unit 2 – Applications", "value": "Unit 2 – Applications" }
]
}

TASK:
Generate 10 detailed and specific unit names for the course "${course}" offered at ${college} for a ${major} major.
Return ONLY the JSON object described above.
`;

    const messages = [{ role: "user", content: prompt }];
    const rawResponse = await callChatApi(messages, "unauthenticated");

    let units;
    try {
      units = JSON.parse(rawResponse);
      if (!units || !Array.isArray(units.units)) {
        throw new Error("Parsed JSON missing 'units' array");
      }
      res.json(units.units);
    } catch (err) {
      console.error("OpenAI parsing failed, using fallback units:", err.message);
      const fallback = [
        { label: "Unit 1 – Introduction", value: "Unit 1 – Introduction" },
        { label: "Unit 2 – Key Concepts", value: "Unit 2 – Key Concepts" },
        { label: "Unit 3 – Application", value: "Unit 3 – Application" }
      ];
      res.json(fallback);
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ------------------------------
// Endpoint: Generate Quiz Question
// ------------------------------
app.post('/api/generate-question', upload.single('image'), async (req, res) => {
  let imagePath = null;
  try {
    const { college, major, course, unit, topic, difficulty, userStatus } = req.body;
    console.log("🟢 /api/generate-question endpoint hit");

    const factSnippet = await fetchCurrentEventFact(topic);

    let difficultyDescription;
    if (difficulty >= 1 && difficulty <= 3) difficultyDescription = "easy, base-level";
    else if (difficulty >= 4 && difficulty <= 7) difficultyDescription = "standard, course-appropriate";
    else if (difficulty >= 8 && difficulty <= 10) difficultyDescription = "extremely difficult, complex, or multi-step";
    else difficultyDescription = "standard, course-appropriate";

    const stylesByCategory = {
      technical: ["Code debugging", "Code writing", "Algorithm optimization", "System architecture analysis", "Output prediction"],
      analytical: ["Data interpretation", "Scenario-based problem-solving", "Case study analysis", "Process design", "Multi-step calculation"],
      scientific: ["Experimental design", "Data/graph interpretation", "Diagnosis from observations", "Fieldwork planning", "Calculation-heavy measurement problem"],
      humanities: ["Literary analysis", "Historical synthesis", "Philosophical critique", "Ethical dilemma resolution", "Primary source interpretation"]
    };

    let category;
    const lowerCaseMajor = major.toLowerCase();

    if (lowerCaseMajor.includes("science") || lowerCaseMajor.includes("engineering") || lowerCaseMajor.includes("information systems") || lowerCaseMajor.includes("technology")) {
      category = "technical";
    } else if (lowerCaseMajor.includes("biology") || lowerCaseMajor.includes("chemistry") || lowerCaseMajor.includes("physics") || lowerCaseMajor.includes("geology") || lowerCaseMajor.includes("medicine")) {
      category = "scientific";
    } else if (lowerCaseMajor.includes("english") || lowerCaseMajor.includes("history") || lowerCaseMajor.includes("philosophy") || lowerCaseMajor.includes("communication") || lowerCaseMajor.includes("art")) {
      category = "humanities";
    } else if (lowerCaseMajor.includes("business") || lowerCaseMajor.includes("finance") || lowerCaseMajor.includes("accounting") || lowerCaseMajor.includes("management") || lowerCaseMajor.includes("logistics")) {
      category = "analytical";
    } else {
      category = "analytical";
    }

    const effectiveCategory = stylesByCategory[category] ? category : "analytical";
    const styleOptions = stylesByCategory[effectiveCategory];
    const randomStyle = styleOptions[Math.floor(Math.random() * styleOptions.length)];

    const systemPrompt = `
You are a college professor designing rigorous, course-appropriate multiple-choice quiz questions.

LATEX / MATH OUTPUT RULES:
- All LaTeX must be correctly escaped for JSON.
- Every backslash MUST be doubled. Example:
\\frac{1}{2} → \\\\frac{1}{2}
\\text{Area} → \\\\text{Area}
- DO NOT remove the backslashes.
- DO NOT convert LaTeX into plain text.
- DO NOT produce malformed LaTeX such as "rac" or " ext".
- Only use valid LaTeX commands.

**STRICT OUTPUT FORMAT RULES:**
1. You MUST output ONLY a valid JSON object.
2. NO Markdown (e.g., no triple backticks \`\`\`json).
3. NO explanations, letter labels (A/B/C/D), or extra text outside the JSON structure.
4. The content of the "question" and "options" strings MUST be properly escaped for valid JSON, paying close attention to backslashes used in LaTeX and double quotes.

**REQUIRED JSON STRUCTURE:**
{
"question": "string",
"options": ["string","string","string","string"],
"correctAnswerIndex": 1
}

**QUESTION LOGIC RULES:**
- The correct answer must be 100% accurate.
- exactly ONE correct answer.
- Randomize the position of the correct answer (it should not always be index 0).
- Do not include explanations, letter labels (A/B/C/D), or extra text outside the JSON.
`;

    const userPrompt = `
Generate a multiple-choice question that is engaging, fact-based, and realistic.

**STRICT FORMATTING RULE:**
For all science, engineering, or calculation-heavy questions, do not present the problem as a single block of text. Use Markdown to structure the question into three clear, separate, and labeled parts. This utilizes the frontend's whitespace-pre-wrap capability for better readability.

1. **Scenario:** The narrative or real-world context.
2. **Given Data/Code:** A bulleted list of all key equations, variables, constants, or boundaries.
* **IF the question style is 'Code debugging' or 'Code writing', you MUST include a Markdown code block (e.g., \`\`\`python) in the 'Given Data/Code' section.**
* Use LaTeX syntax (e.g., $E=mc^2$) for all mathematical expressions.
3. **Question:** The final, focused question asking for the answer.

**CRITICAL PRIMARY INSTRUCTION:**
1. The question **MUST** require the application of a **core academic principle/formula** from the course: **${course}** and **${unit}**.
2. The scenario for the question **MUST** be built around the following event/fact: "**${factSnippet}**"
3. The question must match the style of a **${effectiveCategory}** problem, prioritizing concepts unique to the major.
4. **STRICTLY FORBIDDEN:** The question must **NOT** be a calculation of **Activity-Based Costing (ABC)**, **Return on Investment (ROI)**, or any other generalized financial principle, **unless** the course name explicitly includes 'Accounting' or 'Finance'.
5. **UNIVERSAL DEPTH GUARANTEE:** If the fact is generic or lacks numbers, you **MUST invent a specific, plausible company, event details, and numerical/technical data** to make the problem solvable.
6. Difficulty: ${difficultyDescription}.
7. Context: College: ${college}, Major: ${major}, Topic: ${topic}, Style: ${randomStyle}.
`;

    let messages = [];
    if (req.file) {
      imagePath = req.file.path;
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString("base64");

      const mergedUserPromptWithImage = `
${userPrompt}

**FORCEFUL INTEGRATION COMMAND (Notes + Fact):**
Analyze the uploaded image of the student's notes to identify the specific **formula, method, or key term** required by this quiz question. The question MUST then use that identified formula/method, along with relevant numerical data derived from the **real-world fact** ("${factSnippet}"), to create a cohesive academic problem.
`;

      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: mergedUserPromptWithImage },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ];
    } else {
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];
    }

    const rawResponse = await callChatApi(messages, userStatus);
    console.log("🔥 RAW OPENAI RESPONSE:", rawResponse);
    let quizData;

    try {
      quizData = JSON.parse(rawResponse);
      if (!quizData.question || !quizData.options || quizData.options.length !== 4 || quizData.correctAnswerIndex == null) {
        throw new Error("AI JSON response missing required fields or invalid format");
      }
    } catch (err) {
      console.error("Failed to parse AI response, using fallback data:", err.message);
      quizData = {
        question: "Example: Which of the following best represents the main concept in this unit?",
        options: ["A) Concept A", "B) Concept B", "C) Concept C", "D) Concept D"],
        correctAnswerIndex: 0
      };
    }

    res.json(quizData);

  } catch (error) {
    res.status(500).send({ error: error.message || "Failed to generate question. Please try again." });
  } finally {
    if (imagePath) {
      try {
        await fs.unlink(imagePath);
      } catch (err) {
        console.error("Failed to delete temporary image file:", err);
      }
    }
  }
});

// ------------------------------
// Start server
// ------------------------------
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});