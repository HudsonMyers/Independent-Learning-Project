// app.js

import { collegeMajors } from './data.js';
import {
    checkAndIncrementUsage,
    checkUsageStatus,
    checkAndIncrementNotesUsage,
    checkNotesUsageStatus
} from './local-storage-tracker.js';
import { initializeFirebase } from './firebase.js';

function fixLatex(str) {
    if (!str) return "";
    let fixed = str.replace(/\\\\/g, '\\');
    fixed = fixed.replace(/ext\{(.*?)\}/g, '\\text{$1}');
    fixed = fixed.replace(/\b(sin|cos|tan|log|ln)\b/g, '\\$1');
    return fixed;
}

let isFirebaseReady = false;
let currentUserId = null;
let correctAnswerKey = '';
let userStatus = 'unauthenticated'; // New variable to track user status

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded. Script is running.');

    // DOM elements
    const userIdDisplay = document.getElementById('userIdDisplay');
    const firebaseMessage = document.getElementById('firebase-message');
    const collegeDropdown = document.getElementById('collegeDropdown');
    const majorDropdown = document.getElementById('majorDropdown');
    const courseInput = document.getElementById('courseInput');
    const setCourseBtn = document.getElementById('setCourse');
    const unitDropdown = document.getElementById('unitDropdown');
    const quizInputsSection = document.getElementById('quiz-inputs-section');
    const courseHeader = document.getElementById('courseHeader');
    const topicInput = document.getElementById('topicInput');
    const difficultySldr = document.getElementById('difficultySldr');
    const difficultyValue = document.getElementById('difficultyValue');
    const generateBtn = document.getElementById('generateBtn');
    const questionText = document.getElementById('questionText');
    const quizDisplaySection = document.getElementById('quiz-display-section');
    const feedbackText = document.getElementById('feedbackText');
    const errorMessage = document.getElementById('errorMessage');

    const answerButtons = {
        A: document.getElementById('answerBtnA'),
        B: document.getElementById('answerBtnB'),
        C: document.getElementById('answerBtnC'),
        D: document.getElementById('answerBtnD')
    };

    const answerTexts = {
        A: document.getElementById('answerTextA'),
        B: document.getElementById('answerTextB'),
        C: document.getElementById('answerTextC'),
        D: document.getElementById('answerTextD')
    };

    // --- Photo Dropbox DOM Elements ---
    const fileNameDisplay = document.getElementById('file-name');
    const imagePreview = document.getElementById('image-preview');
    const photoDropboxContainer = document.getElementById('photo-dropbox-container');
    const photoDropboxMessage = document.getElementById('photo-dropbox-message');

    // --- Collapsible Section DOM Elements ---
    const tabHeaders = document.querySelectorAll('.tab-header');
    const setupCard = document.getElementById('setup-card');
    const quizInputsTab = document.getElementById('quiz-inputs-section');
    const quizDisplayTab = document.getElementById('quiz-display-section');

    // New timer element for notes usage
    let notesTimerInterval = null;

    // --- New Function: Check state on page load ---
    const checkInitialState = () => {
        userStatus = localStorage.getItem('userStatus') || 'unauthenticated';
        const usageResult = checkUsageStatus(userStatus);
        const notesUsage = checkNotesUsageStatus(userStatus);

        console.log('Checking initial state. Can generate?', usageResult.canGenerate);
        console.log('Usage result message:', usageResult.message);

        // Clear any existing notes timer to prevent duplicates
        if (notesTimerInterval) {
            clearInterval(notesTimerInterval);
            notesTimerInterval = null;
        }

        // Check notes upload status and update UI
        if (!notesUsage.canUpload) {
            photoDropboxContainer.classList.add('relative', 'overflow-hidden');
            photoDropboxContainer.classList.remove('p-6'); // Remove original padding to fit overlay
            
            let overlayHTML = `
                <div class="absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center p-4 rounded-lg z-10">
                    <p class="text-md font-bold text-gray-800 text-center">You've reached your file upload limit.</p>
                    <p class="text-sm text-red-500 text-center mt-2">Upgrade to premium or come back in</p>
                    <p id="notes-timer-display" class="text-lg font-bold text-gray-800 text-center mt-1"></p>
                </div>
                <div class="p-6"> 
                    <h4 class="text-md font-bold text-center text-gray-600">Upload a photo of your notes/curriculum</h4>
                    <h4 class="text-sm font-bold text-center text-gray-600 mt-2">Increasing accuracy tailored to your inputs!</h4>
                </div>
            `;

            if (userStatus === 'authenticated') {
                photoDropboxContainer.innerHTML = overlayHTML;
                // Get the element and pass it to the timer function
                const timerElement = document.getElementById('notes-timer-display');
                if (timerElement) {
                    updateNotesCountdown(notesUsage.timeRemaining, timerElement);
                }
            } else {
                overlayHTML = `
                    <div class="absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center p-4 rounded-lg z-10">
                        <p class="text-md font-bold text-gray-800 text-center">You must be logged in to use this feature.</p>
                        <p class="text-sm text-red-500 text-center mt-2">Log in or sign up to get started!</p>
                    </div>
                    <div class="p-6">
                        <h4 class="text-md font-bold text-center text-gray-600">Upload a photo of your notes/curriculum</h4>
                        <h4 class="text-sm font-bold text-center text-gray-600 mt-2">Increasing accuracy tailored to your inputs!</h4>
                    </div>
                `;
                photoDropboxContainer.innerHTML = overlayHTML;
            }
        } else {
            photoDropboxContainer.classList.remove('relative', 'overflow-hidden', 'p-6');
            photoDropboxContainer.innerHTML = `
                <h4 class="text-md font-bold text-center">Upload a photo of your notes/curriculum</h4>
                <div class="flex flex-col items-center w-full">
                    <label for="file-upload" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded cursor-pointer transition-colors duration-200">
                        Choose a file
                    </label>
                    <input id="file-upload" type="file" class="hidden" accept="image/*">
                    <span id="file-name" class="mt-2 text-sm text-gray-600 truncate w-full text-center">No file chosen</span>
                    <img id="image-preview" class="mt-4 hidden w-full h-auto max-h-40 object-contain rounded-md border border-gray-300">
                </div>
                <h4 class="text-sm font-bold text-center text-gray-600">Increasing accuracy tailored to your inputs!</h4>
            `;
        }

        if (userStatus === 'authenticated') {
            generateBtn.textContent = 'Generate Question';
        } else if (userStatus === 'premium') {
            generateBtn.textContent = 'Generate Question (Super Fast!)';
        } else {
            generateBtn.textContent = 'Generate Question';
            if (!usageResult.canGenerate) {
                console.log('User is at limit. Disabling button and showing message.');
                quizDisplaySection.classList.remove('hidden');
                generateBtn.disabled = true;

                if (usageResult.timeRemaining) {
                    updateCountdown(usageResult.timeRemaining);
                } else {
                    questionText.textContent = usageResult.message;
                    questionText.classList.remove('hidden');
                }
            } else {
                console.log('User is not at limit. Enabling button.');
                generateBtn.disabled = false;
            }
        }
    };

    const updateNotesCountdown = (timeRemaining, timerElement) => {
        let secondsLeft = timeRemaining.hours * 3600 + timeRemaining.minutes * 60 + timeRemaining.seconds;
        notesTimerInterval = setInterval(() => {
            if (secondsLeft <= 0) {
                clearInterval(notesTimerInterval);
                notesTimerInterval = null;
                checkInitialState();
                return;
            }
            secondsLeft--;
            const hours = Math.floor(secondsLeft / 3600);
            const minutes = Math.floor((secondsLeft % 3600) / 60);
            const seconds = secondsLeft % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerElement.textContent = timeString;
        }, 1000);
    };

    const updateCountdown = (timeRemaining) => {
        const { hours, minutes, seconds } = timeRemaining;
        const timeString = `${hours} hours, ${minutes} minutes, and ${seconds} seconds`;
        questionText.textContent = `You have reached your limit of 10 questions. You can generate more in ${timeString}, Or log in for more questions!`;
        questionText.classList.remove('hidden');

        if (timeRemaining.hours > 0 || timeRemaining.minutes > 0 || timeRemaining.seconds > 0) {
            setTimeout(() => {
                const usageResult = checkUsageStatus('unauthenticated');
                if (usageResult.timeRemaining) {
                    updateCountdown(usageResult.timeRemaining);
                } else {
                    generateBtn.disabled = false;
                    questionText.textContent = '';
                    questionText.classList.add('hidden');
                }
            }, 1000);
        } else {
            checkInitialState();
        }
    };

    const loginBtn = document.getElementById('login-btn');
    const allSections = document.querySelectorAll('.website-section');

    const fbState = await initializeFirebase();
    isFirebaseReady = fbState.isFirebaseReady;
    currentUserId = fbState.currentUserId || null;
    userIdDisplay.textContent = currentUserId || 'Local (no Firebase)';
    
    if (!isFirebaseReady) {
        firebaseMessage.classList.remove('hidden');
        firebaseMessage.textContent = "Database features are disabled because Firebase is not configured.";
    }

    function setOptions(selectElement, options) {
        selectElement.innerHTML = '';
        options.forEach(optData => {
            const opt = document.createElement('option');
            opt.value = optData.value;
            opt.textContent = optData.label;
            selectElement.appendChild(opt);
        });
    }

    function populateCollegeDropdown() {
        const colleges = Object.keys(collegeMajors);
        const opts = [{ label: "Select College", value: "" }, ...colleges.map(c => ({ label: c, value: c }))];
        setOptions(collegeDropdown, opts);
        collegeDropdown.disabled = false;
    }

    function populateMajorDropdown(college) {
        const majors = collegeMajors[college] || [];
        const opts = [{ label: "Select Major", value: "" }, ...majors.map(m => ({ label: m, value: m }))];
        setOptions(majorDropdown, opts);
        majorDropdown.disabled = false;
    }

    function populateUnitDropdown(units) {
        const opts = [{ label: "Select Unit", value: "" }, ...units.map(u => ({ label: u, value: u }))];
        setOptions(unitDropdown, opts);
        unitDropdown.disabled = false;
        generateBtn.disabled = false;
    }

    function hideAllQuizElements() {
        quizInputsSection.classList.add('hidden');
        quizDisplaySection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        feedbackText.classList.add('hidden');
        photoDropboxContainer.classList.add('hidden');
    }

    function hideAnswerButtons() {
        Object.values(answerButtons).forEach(btn => {
            btn.classList.add('hidden');
            btn.classList.remove('correct', 'incorrect');
            btn.disabled = false;
        });
    }

    function showAnswerButtons() {
        Object.values(answerButtons).forEach(btn => btn.classList.remove('hidden'));
    }

    function renderQuestion(rawQuestion, container) {
        if (!rawQuestion) return;
        container.innerHTML = fixLatex(rawQuestion);
        if (window.MathJax) MathJax.typesetPromise([container]);
    }

    // --- Photo Dropbox Logic (Updated with event delegation) ---
    document.addEventListener('change', (event) => {
        if (event.target && event.target.id === 'file-upload') {
            const file = event.target.files[0];
            const fileNameDisplay = document.getElementById('file-name');
            const imagePreview = document.getElementById('image-preview');

            if (file) {
                fileNameDisplay.textContent = file.name;
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.classList.remove('hidden');
            } else {
                fileNameDisplay.textContent = 'No file chosen';
                imagePreview.src = '';
                imagePreview.classList.add('hidden');
            }
        }
    });

    const showSection = (targetId) => {
        allSections.forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    };

    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.target.id.replace('-button', '-section');
            showSection(targetId);
        });
    });

    document.querySelectorAll('.interactive-square').forEach(square => {
        square.addEventListener('click', () => showSection(square.dataset.target));
        square.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') showSection(square.dataset.target);
        });
    });

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    populateCollegeDropdown();
    checkInitialState();

    collegeDropdown.addEventListener('change', () => {
        const selected = collegeDropdown.value;
        if (selected) {
            populateMajorDropdown(selected);
        } else {
            setOptions(majorDropdown, [{ label: "Select Major", value: "" }]);
            majorDropdown.disabled = true;
        }
        majorDropdown.value = "";
        hideAllQuizElements();
    });

    // --- New collapsible section logic ---
    tabHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.tab-icon');
            content.classList.toggle('hidden');
            if (content.classList.contains('hidden')) {
                icon.textContent = '►';
            } else {
                icon.textContent = '▼';
            }
        });
    });

    setCourseBtn.addEventListener('click', async () => {
        const college = collegeDropdown.value;
        const major = majorDropdown.value;
        const course = courseInput.value.trim();

        if (!college || !major || !course) {
            errorMessage.textContent = "Please complete all fields to set the course.";
            errorMessage.classList.remove('hidden');
            hideAllQuizElements();
            return;
        }

        errorMessage.classList.add('hidden');
        quizInputsSection.classList.remove('hidden');
        unitDropdown.innerHTML = '<option>Loading units...</option>';
        unitDropdown.disabled = true;
        setCourseBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/generate-units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ college, major, course })
            });
            const units = await response.json();
            populateUnitDropdown(units.map(u => u.value));
            courseHeader.textContent = `${college} • ${major} • ${course}`;
            courseHeader.classList.remove('hidden');
            
            const userStatus = localStorage.getItem('userStatus');
            if (userStatus === 'authenticated' || userStatus === 'premium') {
                photoDropboxContainer.classList.remove('hidden');
                checkInitialState();
            }

            // Collapse Course Setup and expand Quiz Generator on success
            setupCard.classList.add('hidden');
            setupCard.previousElementSibling.querySelector('.tab-icon').textContent = '►';
            quizInputsTab.classList.remove('hidden');
            quizInputsTab.previousElementSibling.querySelector('.tab-icon').textContent = '▼';

        } catch (err) {
            console.error(err);
            errorMessage.textContent = `Failed to load units: ${err.message || err}`;
            errorMessage.classList.remove('hidden');
            quizInputsSection.classList.add('hidden');
        } finally {
            setCourseBtn.disabled = false;
        }
    });

    difficultySldr.addEventListener('input', () => {
        difficultyValue.textContent = difficultySldr.value;
    });

    // -------------------------------------------
    // Generate quiz question (Updated for Image)
    // -------------------------------------------
    generateBtn.addEventListener('click', async () => {
        const userTier = localStorage.getItem('userStatus') || 'unauthenticated';
        const usageResult = checkAndIncrementUsage(userTier);

        if (!usageResult.canGenerate) {
            quizDisplaySection.classList.remove('hidden');
            questionText.textContent = usageResult.message;
            questionText.classList.remove('hidden');
            hideAnswerButtons();
            generateBtn.disabled = true;
            return;
        }

        const college = collegeDropdown.value;
        const major = majorDropdown.value;
        const course = courseInput.value;
        const unit = unitDropdown.value;
        const topic = topicInput.value;
        const difficulty = difficultySldr.value;
        const fileUpload = document.getElementById('file-upload');
        const file = fileUpload ? fileUpload.files[0] : null; // Get the selected file
        
        if (!college || !major || !course || !unit || !topic) {
            questionText.textContent = "Please fill in all fields.";
            questionText.classList.remove('hidden');
            hideAnswerButtons();
            return;
        }

        // Check notes upload limit before sending the request
        let notesUploadedThisRequest = false;
        if (file) {
            const notesUsage = checkAndIncrementNotesUsage(userTier);
            if (!notesUsage.canUpload) {
                questionText.textContent = notesUsage.message;
                questionText.classList.remove('hidden');
                quizDisplaySection.classList.remove('hidden');
                hideAnswerButtons();
                generateBtn.disabled = false;
                return;
            }
            notesUploadedThisRequest = true;
        }

        // Create a new FormData object to send both text data and the file
        const formData = new FormData();
        formData.append('college', college);
        formData.append('major', major);
        formData.append('course', course);
        formData.append('unit', unit);
        formData.append('topic', topic);
        formData.append('difficulty', difficulty);
        
        if (file) {
            formData.append('image', file);
        }

        questionText.textContent = "Generating question...";
        questionText.classList.remove('hidden');
        quizDisplaySection.classList.remove('hidden');
        hideAnswerButtons();
        feedbackText.classList.add('hidden');
        generateBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/generate-question', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.question && result.options && result.options.length === 4) {
                renderQuestion(result.question, questionText);

                ['A', 'B', 'C', 'D'].forEach((key, idx) => {
                    answerTexts[key].innerHTML = fixLatex(result.options[idx]);
                });

                if (window.MathJax) {
                    MathJax.typesetPromise(Object.values(answerTexts))
                        .catch(err => console.error("MathJax typeset failed:", err));
                }

                correctAnswerKey = ['A', 'B', 'C', 'D'][result.correctAnswerIndex];
                showAnswerButtons();

                // Automatically collapse the quiz generator and expand the question
                quizInputsTab.classList.add('hidden');
                quizInputsTab.previousElementSibling.querySelector('.tab-icon').textContent = '►';
                quizDisplayTab.classList.remove('hidden');
                quizDisplayTab.previousElementSibling.querySelector('.tab-icon').textContent = '▼';

                Object.keys(answerButtons).forEach(key => {
                    const btn = answerButtons[key];
                    btn.onclick = () => {
                        if (key === correctAnswerKey) {
                            btn.classList.add('correct');
                            feedbackText.textContent = "✅ Correct!";
                            feedbackText.classList.remove('hidden');
                        } else {
                            btn.classList.add('incorrect');
                            feedbackText.textContent = `❌ Incorrect! Correct answer: ${correctAnswerKey}`;
                            feedbackText.classList.remove('hidden');
                        }
                        Object.values(answerButtons).forEach(b => b.disabled = true);
                    };
                });
            } else {
                questionText.textContent = "Sorry, failed to get a complete question. Please try again.";
                hideAnswerButtons();
            }
        } catch (err) {
            console.error(err);
            questionText.textContent = `Failed to generate question: ${err.message || err}`;
            hideAnswerButtons();
        } finally {
            generateBtn.disabled = false;
            // Clear the file input and preview only if a new file was uploaded by a non-premium user
            if (notesUploadedThisRequest && userTier !== 'premium') {
                const fileUpload = document.getElementById('file-upload');
                if (fileUpload) {
                    fileUpload.value = null;
                }
                const fileNameDisplay = document.getElementById('file-name');
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = "No file chosen";
                }
                const imagePreview = document.getElementById('image-preview');
                if (imagePreview) {
                    imagePreview.classList.add('hidden');
                    imagePreview.src = '';
                }
                checkInitialState(); // Re-check the state to update the UI
            }
        }
    });
});