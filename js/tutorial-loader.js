

// tutorial-loader.js
window.initTutorial = async function(tutorialId) {
    const tutorialData = await loadTutorialContent(tutorialId);
    if (tutorialData) {
        await renderTutorialContent(tutorialData);
        initBuckles();
        drawCoinSVG();
        initTooltips();
        initInTutorialToggles();
        
        const savedProgress = parseInt(localStorage.getItem(`tutorialProgress${tutorialId}`) || '0');
        const lastOpenedStep = parseInt(localStorage.getItem(`lastOpenedStep${tutorialId}`) || '0');
        const stepsToOpen = Math.max(Math.floor((savedProgress / 100) * tutorialData.steps.length), lastOpenedStep + 1);
        
        document.querySelectorAll('.step-toggle').forEach((toggle, index) => {
            if (index < stepsToOpen) {
                toggle.click();
            }
        });
        
        // Set up next tutorial button
        const nextTutorialBtn = document.getElementById('next-tutorial-btn');
        const nextTutorialId = parseInt(tutorialId) + 1;
        
        // Enable the button by default
        nextTutorialBtn.style.pointerEvents = 'auto';
        nextTutorialBtn.style.opacity = '1';
        
        // Update href and text
        nextTutorialBtn.href = `tutorial.html?id=${nextTutorialId}`;
        nextTutorialBtn.textContent = `Next Tutorial: ${tutorialData.nextTutorialTitle || 'Next Tutorial'}`;
        
        // Add hover effect
        nextTutorialBtn.classList.add('hover:bg-blue-600', 'transition-colors', 'duration-300');
        
        // Optional: Add arrow icon
        const arrowIcon = document.createElement('span');
        arrowIcon.innerHTML = ' →';
        arrowIcon.className = 'ml-2 transition-transform duration-300';
        nextTutorialBtn.appendChild(arrowIcon);
        
        // Optional: Add hover effect for arrow
        nextTutorialBtn.addEventListener('mouseenter', () => {
            arrowIcon.style.transform = 'translateX(5px)';
        });
        nextTutorialBtn.addEventListener('mouseleave', () => {
            arrowIcon.style.transform = 'translateX(0)';
        });

        // Update progress bar and show reminder card
        setTimeout(updateProgressBar, 100);
        setTimeout(showReminderCard, 1000);
    }
}

// Function to load tutorial content
async function loadTutorialContent(tutorialId) {
    try {
        const response = await fetch(`tutorials/tutorial-${tutorialId}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tutorialData = await response.json();
        return tutorialData;
    } catch (error) {
        console.error('Error loading tutorial content:', error);
        return null;
    }
}

// Function to render tutorial content
async function renderTutorialContent(tutorialData) {
    document.getElementById('tutorial-title').textContent = tutorialData.title;
    const tutorialContainer = document.getElementById('tutorial-steps');
    tutorialContainer.innerHTML = ''; // Clear existing content

    for (let index = 0; index < tutorialData.steps.length; index++) {
        const step = tutorialData.steps[index];
        const stepElement = await createTutorialStep(step, index);
        tutorialContainer.appendChild(stepElement);
    }
}

// Function to create a tutorial step
async function createTutorialStep(step, index) {
    const stepElement = document.createElement('div');
    stepElement.className = 'tutorial-step mb-8 bg-gray-800 rounded-lg shadow-lg overflow-hidden fade-in';
    stepElement.id = `step-${index}`;
    stepElement.innerHTML = `
        <button class="step-toggle w-full px-6 py-4 text-left text-xl font-semibold text-white flex items-center justify-between">
            <span>${step.title}</span>
            <svg class="w-6 h-6 transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
        <div class="step-content px-6 py-4 bg-gray-700" style="height: 0; overflow: hidden;">
            ${step.content}
        </div>
    `;

    if (step.quiz) {
        const quizElement = createQuizElement(step.quiz[0], index);
        stepElement.querySelector('.step-content').appendChild(quizElement);
    }

    stepElement.querySelector('.step-toggle').addEventListener('click', () => {
        const content = stepElement.querySelector('.step-content');
        const icon = stepElement.querySelector('svg');
        toggleContent(stepElement.querySelector('.step-toggle'), content, icon, index);
    });

    // In the createTutorialStep function, add this after the quiz element creation
    // In the createTutorialStep function, add this after the quiz element creation
if (step.simulation) {
    const { id, script } = step.simulation;
    const simulationContainer = document.createElement('div');
    simulationContainer.id = id;
    stepElement.querySelector('.step-content').appendChild(simulationContainer);

    const scriptElement = document.createElement('script');
    scriptElement.src = `./js/${script}`;
    document.body.appendChild(scriptElement);

    scriptElement.onload = () => {
        if (window.renderSimulation) {
            console.log('Calling renderSimulation with:', step.simulation.id);
            window.renderSimulation(step.simulation.id);
        } else {
            console.error('renderSimulation function not found');
        }
    };
}

    return stepElement;
}

function createQuizElement(quiz, stepIndex) {
    const quizElement = document.createElement('div');
    quizElement.className = 'quiz-container';
    quizElement.innerHTML = `
        <div class="quiz-question">${quiz.question}</div>
        <div class="quiz-options">
            ${quiz.options.map((option, index) => `
                <div class="quiz-option" data-index="${index}">${option}</div>
            `).join('')}
        </div>
        <div class="quiz-feedback"></div>
    `;

    const options = quizElement.querySelectorAll('.quiz-option');
    const feedback = quizElement.querySelector('.quiz-feedback');

    options.forEach(option => {
        option.addEventListener('click', () => {
            const selectedIndex = parseInt(option.dataset.index);
            options.forEach(opt => opt.classList.remove('selected', 'correct', 'incorrect'));
            option.classList.add('selected');

            if (selectedIndex === quiz.correctAnswer) {
                option.classList.add('correct');
                if (!hasBuckleBeenEarned(stepIndex)) {
                    feedback.textContent = 'Correct! You earned 1 Buckle!';
                    updateBuckles(stepIndex);
                } else {
                    feedback.textContent = 'Correct! (You already earned a Buckle for this quiz)';
                }
            } else {
                option.classList.add('incorrect');
                options[quiz.correctAnswer].classList.add('correct');
                feedback.textContent = 'Incorrect. Try again!';
            }
        });
    });

    return quizElement;
}

function updateProgressBar() {
    const tutorialId = new URLSearchParams(window.location.search).get('id');
    const totalSteps = document.querySelectorAll('.tutorial-step').length;
    const openSteps = document.querySelectorAll('.step-content[style*="height: auto"]').length;
    const oldProgress = parseInt(localStorage.getItem(`tutorialProgress${tutorialId}`) || 0);
    const newProgress = Math.max((openSteps / totalSteps) * 100, oldProgress);

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (newProgress > oldProgress) {
        addSparkles(progressBar, newProgress - oldProgress);
    }

    gsap.to(progressBar, {
        width: `${newProgress}%`,
        duration: 0.5,
        ease: "power2.out"
    });
    
    gsap.to({}, {
        duration: 0.5,
        onUpdate: function() {
            progressText.textContent = `You are ${Math.round(newProgress)}% done.`;
        }
    });

    localStorage.setItem(`tutorialProgress${tutorialId}`, newProgress);
}

function addSparkles(progressBar, amount) {
    const sparkleCount = Math.min(Math.floor(amount / 5), 10); // Cap at 10 sparkles
    
    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        
        const xPos = Math.random() * progressBar.offsetWidth;
        const yPos = Math.random() * progressBar.offsetHeight;
        
        sparkle.style.left = `${xPos}px`;
        sparkle.style.top = `${yPos}px`;
        sparkle.style.animationDuration = `${Math.random() * 0.5 + 0.5}s`; // Random duration between 0.5s and 1s
        sparkle.style.animationDelay = `${Math.random() * 0.2}s`; // Random delay up to 0.2s
        
        progressBar.appendChild(sparkle);
        
        sparkle.style.animation = 'sparkle 1s ease-in-out';
        
        setTimeout(() => {
            sparkle.remove();
        }, 1000); // Remove sparkle after animation completes
    }
}

function toggleContent(toggle, content, icon, index) {
    const tutorialId = new URLSearchParams(window.location.search).get('id');
    const isOpen = content.style.height === 'auto';
    
    if (isOpen) {
        gsap.to(content, {
            height: 0,
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut",
            onComplete: () => {
                content.style.height = '0px';
                updateProgressBar();
            }
        });
        gsap.to(icon, { rotation: 0, duration: 0.3 });
    } else {
        content.style.height = 'auto';
        const height = content.offsetHeight;
        content.style.height = '0px';
        content.style.opacity = '0';
        gsap.to(content, {
            height: height,
            opacity: 1,
            duration: 0.5,
            ease: "power2.inOut",
            onComplete: () => {
                content.style.height = 'auto';
                updateProgressBar();
            }
        });
        gsap.to(icon, { rotation: 180, duration: 0.3 });
    }

    localStorage.setItem(`lastOpenedStep${tutorialId}`, index);
}

async function initTooltips() {
    const terms = document.querySelectorAll('.term');
    const tooltip = document.getElementById('tooltip');

    if (!tooltip) {
        console.error('Tooltip element not found');
        return;
    }

    terms.forEach(term => {
        let popperInstance = null;

        function showTooltip() {
            tooltip.style.display = 'block';
            tooltip.textContent = getTooltipContent(term.id);
            
            if (!popperInstance) {
                popperInstance = Popper.createPopper(term, tooltip, {
                    placement: 'top',
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 8],
                            },
                        },
                    ],
                });
            } else {
                popperInstance.update();
            }
        }

        function hideTooltip() {
            tooltip.style.display = 'none';
        }

        term.addEventListener('mouseenter', showTooltip);
        term.addEventListener('mouseleave', hideTooltip);
    });

    console.log(`Initialized tooltips for ${terms.length} terms`);
}

function initInTutorialToggles() {
    const toggles = document.querySelectorAll('.in-tutorial-toggle');
    console.log(`Found ${toggles.length} in-tutorial toggles`);

    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = toggle.nextElementSibling;
            const arrow = toggle.querySelector('.toggle-arrow');
            if (!content || !arrow) {
                console.error('Toggle content or arrow not found', toggle);
                return;
            }
            toggleInTutorialContent(content, arrow);
        });
    });
}

function toggleInTutorialContent(content, arrow) {
    const isHidden = content.style.maxHeight === '0px' || content.style.maxHeight === '';
    if (isHidden) {
        content.style.maxHeight = `${content.scrollHeight}px`;
        arrow.style.transform = 'rotate(90deg)';
    } else {
        content.style.maxHeight = '0px';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Buckles system functions
function updateBuckles(stepIndex) {
    const tutorialId = new URLSearchParams(window.location.search).get('id');
    let bucklesData = JSON.parse(localStorage.getItem('bucklesData') || '{}');
    
    if (typeof bucklesData[tutorialId] !== 'object' || bucklesData[tutorialId] === null) {
        bucklesData[tutorialId] = {};
    }
    
    if (bucklesData[tutorialId][stepIndex] !== true) {
        bucklesData[tutorialId][stepIndex] = true;
        
        const totalBuckles = (parseInt(localStorage.getItem('totalBuckles') || '0')) + 1;
        localStorage.setItem('totalBuckles', totalBuckles);
        
        document.getElementById('buckles-count').textContent = totalBuckles;
        
        // Animate the Buckles container
        const bucklesContainer = document.getElementById('buckles-container');
        gsap.fromTo(bucklesContainer, 
            {scale: 1.2, backgroundColor: "#FFD700"}, 
            {scale: 1, backgroundColor: "#D97706", duration: 0.5, ease: "back.out(1.7)"}
        );
        
        // Animate the large coin
        animateLargeCoin();
        
        localStorage.setItem('bucklesData', JSON.stringify(bucklesData));
    }
}

function hasBuckleBeenEarned(stepIndex) {
    const tutorialId = new URLSearchParams(window.location.search).get('id');
    const bucklesData = JSON.parse(localStorage.getItem('bucklesData') || '{}');
    return typeof bucklesData[tutorialId] === 'object' && 
           bucklesData[tutorialId] !== null && 
           bucklesData[tutorialId][stepIndex] === true;
}

function initBuckles() {
    const totalBuckles = localStorage.getItem('totalBuckles') || '0';
    document.getElementById('buckles-count').textContent = totalBuckles;
    
    let bucklesData;
    try {
        bucklesData = JSON.parse(localStorage.getItem('bucklesData') || '{}');
    } catch (e) {
        bucklesData = {};
    }
    
    const tutorialId = new URLSearchParams(window.location.search).get('id');
    if (typeof bucklesData[tutorialId] !== 'object' || bucklesData[tutorialId] === null) {
        bucklesData[tutorialId] = {};
    }
    
    localStorage.setItem('bucklesData', JSON.stringify(bucklesData));

    document.getElementById('buckles-container').addEventListener('click', spinBucklesIcon);
}

function spinBucklesIcon() {
    const coin = document.getElementById('coin-svg');
    gsap.to(coin, {
        rotation: "+=360",
        duration: 0.5,
        ease: "power1.inOut"
    });
}

function drawCoinSVG() {
    const coinSVG = document.getElementById('coin-svg');
    coinSVG.innerHTML = `
        <circle cx="12" cy="12" r="11" fill="#FFD700" stroke="#DAA520" stroke-width="1"/>
        <text x="12" y="16" font-size="14" text-anchor="middle" fill="#DAA520" font-weight="bold">B</text>
    `;
}

function animateLargeCoin() {
    // Create a new div for the large coin
    const largeCoin = document.createElement('div');
    largeCoin.innerHTML = document.getElementById('coin-svg').outerHTML;
    largeCoin.style.position = 'fixed';
    largeCoin.style.top = '50%';
    largeCoin.style.left = '50%';
    largeCoin.style.transform = 'translate(-50%, -50%) scale(0)';
    largeCoin.style.zIndex = '1000';
    document.body.appendChild(largeCoin);

    // Animate the large coin
    gsap.timeline()
        .to(largeCoin, {
            scale: 5,
            duration: 0.5,
            ease: "back.out(1.7)"
        })
        .to(largeCoin, {
            scale: 6,
            opacity: 0,
            duration: 0.5,
            delay: 0.5,
            ease: "power2.in",
            onComplete: () => {
                largeCoin.remove();
            }
        });
}





let activeReminderCard = null; // Global variable to track the active reminder card

function showReminderCard() {
    // If there's already an active reminder card, remove it
    if (activeReminderCard) {
        activeReminderCard.remove();
        activeReminderCard = null;
    }

    const tutorialId = new URLSearchParams(window.location.search).get('id');
    const lastOpenedStep = localStorage.getItem(`lastOpenedStep${tutorialId}`);
    
    console.log('Tutorial ID:', tutorialId);
    console.log('Last opened step:', lastOpenedStep);

    if (lastOpenedStep) {
        const stepToggle = document.querySelector(`#step-${lastOpenedStep} .step-toggle`);
        
        if (!stepToggle) {
            console.error(`Step toggle not found for step ${lastOpenedStep}`);
            return;
        }

        const stepTitle = stepToggle.querySelector('span').textContent;
        console.log('Step title:', stepTitle);

        const reminderCard = document.createElement('div');
        reminderCard.className = 'fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 fade-in';
        reminderCard.innerHTML = `
            <p class="mb-2">Continue where you left off?</p>
            <p class="font-bold">${stepTitle}</p>
            <button id="continueButton" class="mt-2 bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-100 transition-colors">Continue</button>
            <button id="dismissButton" class="mt-2 ml-2 bg-transparent text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Dismiss</button>
        `;
        document.body.appendChild(reminderCard);

        activeReminderCard = reminderCard; // Set the active reminder card

        const continueButton = reminderCard.querySelector('#continueButton');
        const dismissButton = reminderCard.querySelector('#dismissButton');

        continueButton.addEventListener('click', function() {
            console.log('Continue button clicked');
            if (stepToggle) {
                const stepContent = stepToggle.nextElementSibling;
                const isOpen = stepContent.style.height === 'auto';
                
                if (!isOpen) {
                    stepToggle.click();
                }
                
                stepToggle.scrollIntoView({ behavior: 'smooth', block: 'start' });
                console.log('Scrolled to step:', lastOpenedStep);
            } else {
                console.error('Step toggle not found');
            }
            reminderCard.remove();
            activeReminderCard = null; // Reset the active reminder card
        });

        dismissButton.addEventListener('click', function() {
            console.log('Dismiss button clicked');
            reminderCard.remove();
            activeReminderCard = null; // Reset the active reminder card
        });
    } else {
        console.log('No last opened step found');
    }
}

// Tooltip content function
// Add these to the getTooltipContent function in tutorial-loader.js
function getTooltipContent(termId) {
    const tooltipContent = {
        'cell': 'Think of a cell like a box in Excel where you can put numbers or text. It\'s named by its column letter and row number, like A1 or B2.',
        'formula': 'A formula is like a math problem you write in Excel. It always starts with an equals sign (=) and tells Excel to do some math for you.',
        'reference': 'This is how you point to a specific cell in Excel - like saying "the box at A1" or "the box at B2".',
        'operator': 'These are the math symbols you use in Excel: + for adding, - for subtracting, * for multiplying, and / for dividing.',
        'range': 'A range is a group of cells next to each other. You write it like "A1:A10" which means "all cells from A1 to A10".',
        'absolute': 'When you put dollar signs in a cell reference (like $A$1), it tells Excel "always use this exact cell, even if I copy the formula somewhere else".',
        'relative': 'A normal cell reference (like A1) that changes when you copy it to a different place - it\'s like saying "use whatever\'s in the cell above me".',
        'function': 'Special shortcuts in Excel that do math for you. For example, SUM adds up numbers, and AVERAGE finds the middle value.'
    };
    return tooltipContent[termId] || 'No tooltip content available';
}

// Add this function to handle the audio for earning buckles
const cashRegisterSound = new Audio('./audio/kachingbaby.mp3');

function playEarnSound() {
    cashRegisterSound.play().catch(error => {
        console.error('Error playing sound:', error);
    });
}

// Update the updateBuckles function to include the sound
function updateBuckles(stepIndex) {
    const tutorialId = new URLSearchParams(window.location.search).get('id');
    let bucklesData = JSON.parse(localStorage.getItem('bucklesData') || '{}');
    
    if (typeof bucklesData[tutorialId] !== 'object' || bucklesData[tutorialId] === null) {
        bucklesData[tutorialId] = {};
    }
    
    if (bucklesData[tutorialId][stepIndex] !== true) {
        bucklesData[tutorialId][stepIndex] = true;
        
        const totalBuckles = (parseInt(localStorage.getItem('totalBuckles') || '0')) + 1;
        localStorage.setItem('totalBuckles', totalBuckles);
        
        document.getElementById('buckles-count').textContent = totalBuckles;
        
        // Play the cash register sound
        playEarnSound();
        
        // Animate the Buckles container
        const bucklesContainer = document.getElementById('buckles-container');
        gsap.fromTo(bucklesContainer, 
            {scale: 1.2, backgroundColor: "#FFD700"}, 
            {scale: 1, backgroundColor: "#D97706", duration: 0.5, ease: "back.out(1.7)"}
        );
        
        // Animate the large coin
        animateLargeCoin();
        
        localStorage.setItem('bucklesData', JSON.stringify(bucklesData));
    }
}

// Function to preload audio
function preloadAudio() {
    cashRegisterSound.load();
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialId = urlParams.get('id');
    if (tutorialId) {
        initTutorial(tutorialId);
        preloadAudio();
    } else {
        console.error('No tutorial ID provided');
    }
});

const glossaryTerms = {
    // Excel Basic Terms
    'cell': 'A box in your spreadsheet where you can type numbers, text, or formulas. Each cell has its own name, like A1 or B2, based on which column and row it\'s in.',
    'column': 'The vertical lines in Excel, labeled with letters (A, B, C, etc.) at the top.',
    'row': 'The horizontal lines in Excel, labeled with numbers (1, 2, 3, etc.) on the left side.',
    'formula': 'A math problem you write in Excel. Always starts with an equals sign (=). For example, =A1+B1 adds the numbers in cells A1 and B1.',
    'worksheet': 'A single sheet in your Excel file. You can see the worksheet tabs at the bottom of Excel.',
    
    // Math Operations
    'operator': 'The math symbols you use in Excel formulas:\n• + for adding\n• - for subtracting\n• * for multiplying\n• / for dividing',
    'addition': 'To add numbers in Excel, use the + symbol. Example: =A1+B1 adds the numbers in cells A1 and B1.',
    'subtraction': 'To subtract numbers in Excel, use the - symbol. Example: =A1-B1 subtracts B1 from A1.',
    'multiplication': 'To multiply numbers in Excel, use the * symbol. Example: =A1*B1 multiplies A1 by B1.',
    'division': 'To divide numbers in Excel, use the / symbol. Example: =A1/B1 divides A1 by B1.',
    
    // Cell References
    'reference': 'The name of a cell, like A1 or B2. You use these names in formulas to tell Excel which cells to use.',
    'range': 'A group of cells next to each other. Written like A1:A10, which means "all cells from A1 down to A10".',
    'absolute': 'When you put dollar signs in a cell reference (like $A$1), Excel will always use that exact cell, even if you copy the formula elsewhere.',
    'relative': 'A normal cell reference (like A1) that changes when you copy it. If you copy =A1+B1 down one row, it becomes =A2+B2.',
    
    // Common Functions
    'function': 'Special commands in Excel that do math for you. They start with an equals sign and the function name, like =SUM() or =AVERAGE().',
    'sum': 'A function that adds up numbers. Example: =SUM(A1:A10) adds all numbers from A1 to A10.',
    'average': 'A function that finds the middle value (mean) of a group of numbers. Example: =AVERAGE(A1:A10).',
    'count': 'A function that counts how many numbers are in a group of cells. Example: =COUNT(A1:A10).'
};

// Make sure this is added to the window object so it can be accessed globally
window.glossaryTerms = glossaryTerms;
  
  function initGlossary() {
    const glossaryButton = document.getElementById('glossary-button');
    const glossaryPanel = document.getElementById('glossary-panel');
    const glossaryClose = document.getElementById('glossary-close');
    const glossaryContent = document.getElementById('glossary-content');
    const glossarySearch = document.getElementById('glossary-search');
  
    function toggleGlossary() {
      glossaryPanel.classList.toggle('translate-x-full');
      document.body.classList.toggle('glossary-open');
      window.dispatchEvent(new Event('resize'));
    }
  
    glossaryButton.addEventListener('click', toggleGlossary);
    glossaryClose.addEventListener('click', toggleGlossary);
  
    function showGlossaryList(filter = '') {
      const sortedTerms = Object.keys(glossaryTerms).sort((a, b) => a.localeCompare(b));
      const filteredTerms = sortedTerms.filter(term => term.toLowerCase().includes(filter.toLowerCase()));
      
      glossaryContent.innerHTML = filteredTerms.map(term => 
        `<div class="glossary-item" data-term="${term}">${term}</div>`
      ).join('');
  
      glossaryContent.querySelectorAll('.glossary-item').forEach(item => {
        item.addEventListener('click', () => showGlossaryDefinition(item.dataset.term));
      });
    }
  
    function showGlossaryDefinition(term) {
      glossaryContent.innerHTML = `
        <div class="glossary-back">← Back to list</div>
        <h3 class="text-xl font-bold text-white mb-2">${term}</h3>
        <p class="glossary-definition">${glossaryTerms[term]}</p>
      `;
  
      const backButton = glossaryContent.querySelector('.glossary-back');
      const definition = glossaryContent.querySelector('.glossary-definition');
  
      gsap.from(backButton, {x: -20, opacity: 0, duration: 0.3});
      gsap.to(definition, {y: 0, opacity: 1, duration: 0.3, delay: 0.1});
  
      backButton.addEventListener('click', () => {
        showGlossaryList(glossarySearch.value);
      });
    }
  
    glossarySearch.addEventListener('input', debounce(() => {
      showGlossaryList(glossarySearch.value);
    }, 300));
  
    showGlossaryList();
  }
  
  // Debounce function to limit how often a function is called
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Call this function when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialId = urlParams.get('id');
    if (tutorialId) {
      initTutorial(tutorialId);
      preloadAudio();
      initGlossary();
    } else {
      console.error('No tutorial ID provided');
    }
  });

// Export functions that need to be globally accessible
window.updateProgressBar = updateProgressBar;
window.toggleCheckbox = toggleCheckbox;
window.getTooltipContent = getTooltipContent;
// Add any other functions that need to be globally accessible