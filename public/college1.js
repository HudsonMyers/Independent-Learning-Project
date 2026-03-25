// college1.js
import { generateCollegeQuizQuestion } from './data.js';

export async function generateQuiz(college, major, course, unit, topic, difficulty) {
  if (!college || !major || !course || !unit || !topic) {
    throw new Error("All fields are required to generate a quiz.");
  }
  try {
    const result = await generateCollegeQuizQuestion(college, major, course, unit, topic, difficulty);
    return result; // { question, options: {A,B,C,D}, correctOption }
  } catch (err) {
    console.error("Failed to generate quiz:", err);
    throw err;
  }
}
