// data.js
export const collegeMajors = {
  "Coastal Carolina University": ["Marine Science", "Business Administration", "Computer Science", "Exercise and Sport Science", "Physical Education"],
  "North Carolina State University": ["Engineering", "Computer Science", "Agricultural Sciences", "Supply Chain Management and Logistics", "Textile Engineering"],
  "University of Alabama": ["Political Science", "Nursing", "Business", "Management Information Systems", "Psychology"],
  "Wake Technical Community College": ["Liberal Arts", "Information Technology", "Business", "Registered Nursing", "Construction", "GM ASEP"],
  "Georgia Institute of Technology": ["Aerospace Engineering", "Computer Science", "Industrial Design", "Biomedical Engineering"]
};

// Fallback / testing stub for units
export async function getCourseUnits(college, course, major) {
  await new Promise(r => setTimeout(r, 300));
  return [
    "Unit 1 – Foundations",
    "Unit 2 – Core Concepts",
    "Unit 3 – Applications",
    "Unit 4 – Advanced Topics"
  ];
}

// Fallback / testing stub for quiz question
export async function generateCollegeQuizQuestion(college, major, course, unit, topic, difficulty) {
  await new Promise(r => setTimeout(r, 600));
  const options = {
    A: `A plausible statement about ${topic}`,
    B: `The best/most-correct statement about ${topic}`,
    C: `A wrong/confusing statement about ${topic}`,
    D: `An unlikely statement about ${topic}`
  };
  return { question: `Sample question: Which statement best describes "${topic}"?`, options, correctOption: 'B' };
}
