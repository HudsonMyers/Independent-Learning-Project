// college.js

import { collegeMajors, getCourseUnits } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
  const collegeDropdown = document.getElementById('collegeDropdown');
  const majorDropdown = document.getElementById('majorDropdown');
  const courseInput = document.getElementById('courseInput');
  const setCourseBtn = document.getElementById('setCourse');
  const unitDropdown = document.getElementById('unitDropdown');
  const quizInputsSection = document.getElementById('quiz-inputs-section');
  const courseHeader = document.getElementById('courseHeader');
  const errorMessage = document.getElementById('errorMessage');

  // Populate college dropdown
  const colleges = Object.keys(collegeMajors);
  collegeDropdown.innerHTML = '<option value="">Select College</option>';
  colleges.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    collegeDropdown.appendChild(opt);
  });

  // Update major dropdown when college changes
  collegeDropdown.addEventListener('change', () => {
    const selectedCollege = collegeDropdown.value;
    majorDropdown.innerHTML = '<option value="">Select Major</option>';
    if (selectedCollege && collegeMajors[selectedCollege]) {
      collegeMajors[selectedCollege].forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        majorDropdown.appendChild(opt);
      });
      majorDropdown.disabled = false;
    } else {
      majorDropdown.disabled = true;
    }
    courseInput.value = '';
    quizInputsSection.classList.add('hidden');
  });

  // Set course button → fetch units
  setCourseBtn.addEventListener('click', async () => {
    const college = collegeDropdown.value;
    const major = majorDropdown.value;
    const course = courseInput.value.trim();

    if (!college || !major || !course) {
      errorMessage.textContent = "Please complete all fields to set the course.";
      errorMessage.classList.remove('hidden');
      quizInputsSection.classList.add('hidden');
      return;
    }

    errorMessage.classList.add('hidden');
    quizInputsSection.classList.remove('hidden');
    unitDropdown.innerHTML = '<option>Loading units...</option>';
    unitDropdown.disabled = true;

    try {
      const units = await getCourseUnits(college, course, major);
      unitDropdown.innerHTML = '<option value="">Select Unit</option>';
      units.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        unitDropdown.appendChild(opt);
      });
      unitDropdown.disabled = false;
      courseHeader.textContent = `${college} • ${major} • ${course}`;
      courseHeader.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      errorMessage.textContent = `Failed to load units: ${err.message || err}`;
      errorMessage.classList.remove('hidden');
      quizInputsSection.classList.add('hidden');
    }
  });
});