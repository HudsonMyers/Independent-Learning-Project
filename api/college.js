import fetch from "node-fetch";

// Keep the full collegeMajors mapping exactly as in your original code
const collegeMajors = {
  "Coastal Carolina University": [
    "Marine Science",
    "Business Administration",
    "Computer Science",
    "Exercise and Sport Science",
    "Physical Education"
  ],
  "North Carolina State University": [
    "Engineering",
    "Computer Science",
    "Agricultural Sciences",
    "Supply Chain Management and Logistics",
    "Textile Engineering"
  ],
  "University of Alabama": [
    "Political Science",
    "Nursing",
    "Business",
    "Management Information Systems",
    "Psychology"
  ],
  "Wake Technical Community College": [
    "Liberal Arts",
    "Information Technology",
    "Business",
    "Registered Nursing",
    "Construction",
    "GM ASEP"
  ],
  "Georgia Institute of Technology": [
    "Aerospace Engineering",
    "Computer Science",
    "Industrial Design",
    "Biomedical Engineering"
  ]
};

// Helper to detect generic units
function isGenericUnits(units) {
  if (!Array.isArray(units)) return true;
  if (units.length < 2) return true;
  const genericLabels = new Set(["Unit 1", "Unit 2", "Unit 3"]);
  return units.every(u => genericLabels.has(u.label) && u.label === u.value);
}

// Helper to call OpenAI
async function callOpenAI(prompt) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert college professor who ONLY provides a JSON array of specific, non-generic unit titles." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

export default async function handler(req, res) {
  const { type } = req.query;

  try {
    if (type === "units") {
      const { college, course, major } = req.body;

      if (!collegeMajors[college] || !major || !course) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const courseTrimmed = course.trim();

      const basePrompt = `You are a college professor listing 12 detailed and specific unit names for the course "${courseTrimmed}" offered at ${college} for a ${major} major.

Provide ONLY a JSON array of objects with "label" and "value" fields for each unit. Do NOT include any text or explanation.

Avoid generic unit labels like "Unit 1", "Unit 2", etc. Provide actual meaningful titles.`;

      let units = [];

      try {
        const content = await callOpenAI(basePrompt);
        if (content) {
          const jsonMatch = content.match(/\[.*\]/s);
          if (jsonMatch) {
            units = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.error("Failed to generate units from OpenAI:", e.message);
        // Fallback to generic units in case of an error
        units = [
          { label: "Unit 1", value: "Unit 1" },
          { label: "Unit 2", value: "Unit 2" },
          { label: "Unit 3", value: "Unit 3" }
        ];
      }
      
      // If the generated units are generic, try again with a stronger prompt
      if (!units || isGenericUnits(units)) {
        const strongerPrompt = `${basePrompt}\n\nReminder: DO NOT return generic labels like "Unit 1". Provide real descriptive unit titles specific to the course.`;
        try {
          const content = await callOpenAI(strongerPrompt);
          if (content) {
            const jsonMatch = content.match(/\[.*\]/s);
            if (jsonMatch) {
              units = JSON.parse(jsonMatch[0]);
            }
          }
        } catch (e) {
          console.error("Failed to generate units with stronger prompt:", e.message);
          // Fallback to generic units again
          units = [
            { label: "Unit 1", value: "Unit 1" },
            { label: "Unit 2", value: "Unit 2" },
            { label: "Unit 3", value: "Unit 3" }
          ];
        }
      }

      if (!units || isGenericUnits(units)) {
        units = [
          { label: "Unit 1", value: "Unit 1" },
          { label: "Unit 2", value: "Unit 2" },
          { label: "Unit 3", value: "Unit 3" }
        ];
      }

      return res.status(200).json({ units });
    }

    else if (type === "quiz") {
      const { college, major, course, unit, topic, difficulty } = req.body;

      if (!collegeMajors[college] || !collegeMajors[college].includes(major)) {
        return res.status(400).json({ error: "Invalid college or major selected." });
      }

      const stylesByCategory = {
        technical: [
          "Code debugging task",
          "Code writing/building task",
          "Algorithm optimization",
          "System architecture analysis",
          "Output prediction from given code"
        ],
        analytical: [
          "Data interpretation",
          "Scenario-based problem-solving",
          "Case study analysis",
          "Process design question",
          "Multi-step calculation"
        ],
        scientific: [
          "Experimental design",
          "Data/graph interpretation",
          "Diagnosis from observations",
          "Fieldwork planning",
          "Calculation-heavy measurement problem"
        ]
      };

      let category;
      if (["Computer Science", "Information Technology", "Management Information Systems", "Engineering", "Supply Chain Management and Logistics", "Textile Engineering"].includes(major)) {
        category = "technical";
      } else if (["Business Administration", "Business", "Political Science", "Industrial Design"].includes(major)) {
        category = "analytical";
      } else {
        category = "scientific";
      }

      const styleOptions = stylesByCategory[category];
      const randomStyle = styleOptions[Math.floor(Math.random() * styleOptions.length)];

      let difficultyDescription;
      if (difficulty >= 1 && difficulty <= 3) difficultyDescription = "easy, base-level";
      else if (difficulty >= 4 && difficulty <= 7) difficultyDescription = "standard, course-appropriate";
      else if (difficulty >= 8 && difficulty <= 10) difficultyDescription = "extremely difficult, complex, or multi-step";
      else difficultyDescription = "standard, course-appropriate";

      const prompt = `You are a college professor designing a rigorous, course-appropriate multiple-choice quiz question.
      
Generate an **${difficultyDescription}** question in the style of a **${randomStyle.toLowerCase()}**.
  
Major: ${major}
Course: ${course}
Unit: ${unit}
Topic: ${topic}
  
Create ONE multiple-choice question that:
- **Bases the entire question's scenario on a verifiable, interesting fact about the chosen ${topic}.**
- **Does NOT explicitly state "Fun fact:"**. Instead, the fact must be woven seamlessly into the problem statement.
- question output format should vary depending on ${stylesByCategory} and ${difficulty} offering word problems, code block debugging/correcting, math problems, etc. 
- Requires the student to apply concepts from the ${course} and ${unit} to solve a problem related to that fact.
- Matches the academic depth of an actual quiz, test, or homework question in a ${course} course at ${college}.
- Is specific to the major and reflects the skills actually assessed in the unit "${unit}".
- Avoids generic definitions; instead, focus on real techniques, methods, problem-solving, or analysis.
- Uses real academic language and structure used in college assessments.
- Provides 4 answer choices labeled A–D, with one correct and clearly defensible answer.
- Does NOT assume knowledge outside of what’s commonly taught in the selected unit/topic.
- If the topic is repeated, use a different fact for the new question.
  
Return ONLY in this format:
Question: [Your question here]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]`;

      const questionContent = await callOpenAI(prompt);
      res.status(200).json({ question: questionContent });
    }

    else {
      res.status(400).json({ error: "Invalid type" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
