const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the HTML

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error("Error: API_KEY is not set. Please add it to your .env file.");
    process.exit(1);
}

// Function to call Gemini API
async function callGeminiApi(prompt, responseSchema) {
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} - ${await response.text()}`);
        }

        const result = await response.json();
        const jsonPart = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonPart) throw new Error("Invalid response format from API");

        return JSON.parse(jsonPart);
    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw error;
    }
}

// Endpoint to generate units
app.post('/api/generate-units', async (req, res) => {
    try {
        const { college, major, course } = req.body;
        const prompt = `Generate 10 detailed and specific unit names for the course "${course}" offered at ${college} for a ${major} major.
        Return only a JSON array of objects with "label" and "value" fields.`;

        const unitsSchema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    label: { type: "STRING" },
                    value: { type: "STRING" }
                },
                required: ["label", "value"]
            }
        };

        const units = await callGeminiApi(prompt, unitsSchema);
        res.json(units);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Endpoint to generate quiz question
app.post('/api/generate-question', async (req, res) => {
    try {
        const { college, major, course, unit, topic, difficulty } = req.body;

        const stylesByCategory = {
            technical: [ "Code debugging", "Code writing", "Algorithm optimization", "System architecture analysis", "Output prediction" ],
            analytical: [ "Data interpretation", "Scenario-based problem-solving", "Case study analysis", "Process design", "Multi-step calculation" ],
            scientific: [ "Experimental design", "Data/graph interpretation", "Diagnosis from observations", "Fieldwork planning", "Calculation-heavy measurement problem" ]
        };

        let category;
        if (["Computer Science","Information Technology","Management Information Systems","Engineering","Supply Chain Management and Logistics","Textile Engineering"].includes(major)) {
            category = "technical";
        } else if (["Business Administration","Business","Political Science","Industrial Design"].includes(major)) {
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

        const prompt = `Generate an **${difficultyDescription}** question in the style of a **${randomStyle.toLowerCase()}**. Major: ${major}, Course: ${course}, Unit: ${unit}, Topic: ${topic}.
        The question should be based on a verifiable fact about the topic, woven seamlessly into the problem statement.
        The question must require applying concepts from the course.
        Provide 4 answer choices.
        Return ONLY a JSON object with 'question' (string), 'options' (array of 4 strings), and 'correctAnswerIndex' (0-3).`;

        const questionSchema = {
            type: "OBJECT",
            properties: {
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                correctAnswerIndex: { type: "NUMBER" }
            },
            required: ["question","options","correctAnswerIndex"]
        };

        const quizData = await callGeminiApi(prompt, questionSchema);
        res.json(quizData);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
