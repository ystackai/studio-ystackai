// Game state
window.gameState = {
    stackTraces: 0,
    uiErrors: 0,
    memoryLeaks: 0,
    networkFailures: 0,
    resourceCrashes: 0,
    voidMode: false,
    timer: 600, // 10 minutes in seconds
    consecutiveTraces: 0,
    lastTraceTime: 0,
    traceHistory: [],
    audioContext: null,
    soundEnabled: true
};

// DOM elements
const elements = {
    stackTraceCount: document.getElementById('stack-trace-count'),
    uiErrorCount: document.getElementById('ui-error-count'),
    memoryLeakCount: document.getElementById('memory-leak-count'),
    networkFailureCount: document.getElementById('network-failure-count'),
    resourceCrashCount: document.getElementById('resource-crash-count'),
    timer: document.getElementById('timer'),
    stackTraceList: document.getElementById('stack-trace-list'),
    fixButton: document.getElementById('fix-button'),
    voidMode: document.getElementById('void-mode'),
    component1: document.getElementById('component-1'),
    component2: document.getElementById('component-2'),
    component3: document.getElementById('component-3'),
    component4: document.getElementById('component-4'),
    component5: document.getElementById('component-5')
};

// Stack trace templates for variety
const stackTraceTemplates = [
    "TypeError: Cannot read property 'data' of undefined",
    "ReferenceError: variable is not defined",
    "SyntaxError: Unexpected token",
    "RangeError: Maximum call stack size exceeded",
    "Error: Network request failed",
    "Error: Out of memory",
    "Error: Invalid state transition",
    "Error: Resource not found",
    "Error: Authentication failed",
    "Error: Connection timeout",
    "Error: Invalid JSON response",
    "Error: Database connection lost",
    "Error: Memory leak detected",
    "Error: Thread pool exhausted",
    "Error: File handle limit exceeded"
];

// Component status templates
const componentStatuses = [
    { type: 'error', text: 'ERROR' },
    { type: 'warning', text: 'WARNING' },
    { type: 'critical', text: 'CRITICAL' },
    { type: 'success', text: 'SUCCESS' }
];

// Initialize the game
function initGame() {
    // Initialize audio context for sound effects
    try {
        window.gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Audio not supported in this browser');
        window.gameState.soundEnabled = false;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Start game loop
    gameLoop();
    
    // Start timer
    startTimer();
    
    // Generate initial errors to make the dashboard feel alive
    generateInitialErrors();
}

// Set up event listeners
function setupEventListeners() {
    // Fix button is a trap!
    elements.fixButton.addEventListener('click', handleFixButtonClick);
    
    // Add click events to components to generate more errors
    const components = [elements.component1, elements.component2, elements.component3, elements.component4, elements.component5];
    components.forEach(component => {
        component.addEventListener('click', () => {
            if (!window.gameState.voidMode) {
                generateRandomError();
                playSound('error');
            }
        });
    });
}

// Handle fix button click (trap mechanics)
function handleFixButtonClick() {
    if (window.gameState.voidMode) return;
    
    // The fix button is a trap - clicking it makes things worse
    generateRandomError();
    generateRandomError();
    generateRandomError();
    
    // Add to trace history for void mode detection
    addTraceToHistory();
    
    // Play trap sound effect
    playSound('trap');
    
    // Visual feedback for the trap
    elements.fixButton.style.animation = 'button-pulse 0.2s';
    setTimeout(() => {
        elements.fixButton.style.animation = 'button-pulse 1.5s infinite';
    }, 200);
}

// Generate initial errors to make dashboard feel alive
function generateInitialErrors() {
    for (let i = 0; i < 10; i++) {
        generateRandomError();
    }
}

// Generate a random error
function generateRandomError() {
    if (window.gameState.voidMode) return;
    
    // Randomly increment one of the error counters
    const errorTypes = ['stackTraces', 'uiErrors', 'memoryLeaks', 'networkFailures', 'resourceCrashes'];
    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    window.gameState[randomError]++;
    
    // Update the display
    updateErrorDisplay();
    
    // Add stack trace to display
    addStackTrace();
    
    // Add to trace history for void mode detection
    addTraceToHistory();
    
    // Play error sound effect
    playSound('error');
}

// Update error counters display
function updateErrorDisplay() {
    elements.stackTraceCount.textContent = window.gameState.stackTraces;
    elements.uiErrorCount.textContent = window.gameState.uiErrors;
    elements.memoryLeakCount.textContent = window.gameState.memoryLeaks;
    elements.networkFailureCount.textContent = window.gameState.networkFailures;
    elements.resourceCrashCount.textContent = window.gameState.resourceCrashes;
    
    // Update component statuses randomly
    updateComponentStatuses();
}

// Update component statuses
function updateComponentStatuses() {
    const components = [elements.component1, elements.component2, elements.component3, elements.component4, elements.component5];
    components.forEach(component => {
        const status = componentStatuses[Math.floor(Math.random() * componentStatuses.length)];
        const statusElement = component.querySelector('.component-status');
        statusElement.textContent = status.text;
        statusElement.className = 'component-status ' + status.type;
    });
}

// Add stack trace to display
function addStackTrace() {
    if (window.gameState.voidMode) return;
    
    const trace = stackTraceTemplates[Math.floor(Math.random() * stackTraceTemplates.length)];
    const traceElement = document.createElement('div');
    traceElement.className = 'stack-trace-item';
    traceElement.textContent = trace;
    
    elements.stackTraceList.prepend(traceElement);
    
    // Limit the number of traces displayed
    if (elements.stackTraceList.children.length > 20) {
        elements.stackTraceList.removeChild(elements.stackTraceList.lastChild);
    }
}

// Add trace to history for void mode detection
function addTraceToHistory() {
    const now = Date.now();
    window.gameState.traceHistory.push(now);
    
    // Keep only the last 5 traces
    if (window.gameState.traceHistory.length > 5) {
        window.gameState.traceHistory.shift();
    }
    
    // Check if we have 3 consecutive traces within 10 seconds
    checkVoidMode();
}

// Check if void mode should be activated
function checkVoidMode() {
    if (window.gameState.voidMode) return;
    
    // We need at least 3 traces
    if (window.gameState.traceHistory.length < 3) return;
    
    // Check if last 3 traces happened within 10 seconds
    const lastThree = window.gameState.traceHistory.slice(-3);
    const timeDiff = lastThree[lastThree.length - 1] - lastThree[0];
    
    if (timeDiff <= 10000) { // 10 seconds in milliseconds
        activateVoidMode();
    }
}

// Activate void mode
function activateVoidMode() {
    window.gameState.voidMode = true;
    
    // Show void mode
    elements.voidMode.classList.remove('hidden');
    
    // Stop the timer
    clearInterval(window.gameState.timerInterval);
    
    // Play void sound effect
    playSound('void');
    
    // Add visual glitch effect to the entire dashboard
    document.body.style.animation = 'void-pulse 0.2s infinite';
    
    // Make all components disappear after a delay
    setTimeout(() => {
        const components = [elements.component1, elements.component2, elements.component3, elements.component4, elements.component5];
        components.forEach(component => {
            component.style.opacity = '0';
            component.style.transition = 'opacity 2s';
        });
        
        // Hide the fix button
        elements.fixButton.style.display = 'none';
    }, 2000);
}

// Start the timer
function startTimer() {
    window.gameState.timerInterval = setInterval(() => {
        if (window.gameState.voidMode) return;
        
        window.gameState.timer--;
        updateTimerDisplay();
        
        // If time runs out, activate void mode
        if (window.gameState.timer <= 0) {
            activateVoidMode();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(window.gameState.timer / 60);
    const seconds = window.gameState.timer % 60;
    const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    elements.timer.textContent = timerText;
    
    // Change color when time is running low
    if (window.gameState.timer <= 30) {
        elements.timer.style.color = 'var(--color-timer-critical)';
    }
}

// Game loop for continuous updates
function gameLoop() {
    // Update component wobbling effects
    updateWobblingEffects();
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Update wobbling effects on components
function updateWobblingEffects() {
    if (window.gameState.voidMode) return;
    
    const components = [elements.component1, elements.component2, elements.component3, elements.component4, elements.component5];
    
    components.forEach(component => {
        // Randomly change wobble effect intensity based on error count
        const errorCount = window.gameState.stackTraces + window.gameState.uiErrors;
        const intensity = Math.min(1, errorCount / 10);
        
        // Apply wobble with random variation
        const wobbleIntensity = 5 + intensity * 15;
        const rotationIntensity = 2 + intensity * 5;
        
        component.style.animation = `wobble ${3 - intensity}s infinite ease-in-out`;
        
        // Add subtle visual degradation based on error count
        if (errorCount > 5) {
            component.style.filter = `contrast(${1 + intensity * 0.5}) brightness(${1 - intensity * 0.3})`;
        }
    });
}

// Play sound effects
function playSound(type) {
    if (!window.gameState.soundEnabled) return;
    
    try {
        const ctx = window.gameState.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        switch (type) {
            case 'error':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(200, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                break;
                
            case 'trap':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                break;
                
            case 'void':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(100, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
                break;
        }
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        
    } catch (e) {
        // Silent failure if audio doesn't work
    }
}

// Initialize the game when the page loads
window.addEventListener('load', initGame);
