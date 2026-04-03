// Game state
const gameState = {
    errors: {
        js: 0,
        css: 0,
        network: 0,
        render: 0,
        memory: 0
    },
    stackTraces: [],
    stackTraceCount: 0,
    timer: 10,
    voidMode: false,
    consecutiveErrors: 0,
    lastErrorTime: 0,
    voidTimeout: null
};

// DOM Elements
const elements = {
    jsErrorCount: document.getElementById('js-error-count'),
    cssErrorCount: document.getElementById('css-error-count'),
    networkErrorCount: document.getElementById('network-error-count'),
    renderErrorCount: document.getElementById('render-error-count'),
    memoryErrorCount: document.getElementById('memory-error-count'),
    timer: document.getElementById('timer'),
    stackTraceContainer: document.getElementById('stack-trace-container'),
    fixButton: document.getElementById('fix-button'),
    voidMode: document.getElementById('void-mode'),
    components: {
        component1: document.getElementById('component-1'),
        component2: document.getElementById('component-2'),
        component3: document.getElementById('component-3'),
        component4: document.getElementById('component-4'),
        component5: document.getElementById('component-5')
    }
};

// Error types with their descriptions
const errorTypes = {
    js: { name: 'JS Error', color: 'var(--color-error)' },
    css: { name: 'CSS Error', color: 'var(--color-warning)' },
    network: { name: 'Network Error', color: 'var(--color-error)' },
    render: { name: 'Render Error', color: 'var(--color-error)' },
    memory: { name: 'Memory Error', color: 'var(--color-error)' }
};

// Initialize the game
function init() {
    // Start the timer
    startTimer();
    
    // Add event listeners to components
    Object.keys(elements.components).forEach(key => {
        elements.components[key].addEventListener('click', () => {
            addError(key.replace('component', '').toLowerCase());
        });
    });
    
    // Add event listener to fix button
    elements.fixButton.addEventListener('click', () => {
        handleFixButtonClick();
    });
    
    // Add initial stack traces for visual effect
    addStackTrace('System initialization complete');
    addStackTrace('Dashboard loaded successfully');
}

// Start the countdown timer
function startTimer() {
    const timerInterval = setInterval(() => {
        if (gameState.timer <= 0) {
            clearInterval(timerInterval);
            if (!gameState.voidMode) {
                enterVoidMode();
            }
            return;
        }
        
        gameState.timer--;
        elements.timer.textContent = formatTime(gameState.timer);
        
        // Add visual effects as time runs out
        if (gameState.timer <= 3) {
            elements.timer.style.color = '#ff0000';
            elements.timer.style.textShadow = '0 0 20px #ff0000';
        }
    }, 1000);
}

// Format time for display
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Add an error to the system
function addError(errorType) {
    // Increment error counter
    gameState.errors[errorType]++;
    
    // Update UI
    updateErrorCounters();
    
    // Add stack trace
    addStackTrace(`${errorTypes[errorType].name} occurred`);
    
    // Update consecutive errors for void mode check
    const now = Date.now();
    if (now - gameState.lastErrorTime < 10000) { // Within 10 seconds
        gameState.consecutiveErrors++;
    } else {
        gameState.consecutiveErrors = 1;
    }
    gameState.lastErrorTime = now;
    
    // Check if we should enter void mode
    if (gameState.consecutiveErrors >= 3 && !gameState.voidMode) {
        enterVoidMode();
    }
    
    // Add visual effects to components
    visualEffectOnComponent(errorType);
}

// Update error counters in the UI
function updateErrorCounters() {
    elements.jsErrorCount.textContent = gameState.errors.js;
    elements.cssErrorCount.textContent = gameState.errors.css;
    elements.networkErrorCount.textContent = gameState.errors.network;
    elements.renderErrorCount.textContent = gameState.errors.render;
    elements.memoryErrorCount.textContent = gameState.errors.memory;
    
    // Add wobbling effect to error counters
    const errorCounters = document.querySelectorAll('.error-counter');
    errorCounters.forEach(counter => {
        counter.classList.add('wobble');
        setTimeout(() => {
            counter.classList.remove('wobble');
        }, 1000);
    });
}

// Add a stack trace to the UI
function addStackTrace(message) {
    gameState.stackTraceCount++;
    
    const stackTrace = document.createElement('div');
    stackTrace.className = 'stack-trace';
    stackTrace.textContent = `[${gameState.stackTraceCount}] ${message} - ${new Date().toLocaleTimeString()}`;
    
    elements.stackTraceContainer.appendChild(stackTrace);
    
    // Scroll to bottom
    elements.stackTraceContainer.scrollTop = elements.stackTraceContainer.scrollHeight;
    
    // Keep only the last 20 stack traces
    if (elements.stackTraceContainer.children.length > 20) {
        elements.stackTraceContainer.removeChild(elements.stackTraceContainer.firstChild);
    }
}

// Handle fix button click
function handleFixButtonClick() {
    // The fix button is a trap - makes things worse!
    const errorTypes = ['js', 'css', 'network', 'render', 'memory'];
    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    // Add multiple errors to make it worse
    for (let i = 0; i < 3; i++) {
        addError(randomError);
    }
    
    // Add a special stack trace for the fix button
    addStackTrace('Fix button clicked - system degradation initiated');
    
    // Add visual effect to the fix button
    elements.fixButton.style.animation = 'none';
    setTimeout(() => {
        elements.fixButton.style.animation = 'pulse-button 2s infinite';
    }, 10);
}

// Visual effect on component when error occurs
function visualEffectOnComponent(errorType) {
    // Get a random component
    const componentKeys = Object.keys(elements.components);
    const randomComponent = elements.components[componentKeys[Math.floor(Math.random() * componentKeys.length)]];
    
    // Add wobbling effect
    randomComponent.classList.add('wobble');
    
    // Change status indicator to error if it wasn't already
    const statusIndicator = randomComponent.querySelector('.status-indicator');
    if (statusIndicator && statusIndicator.classList.contains('ok')) {
        statusIndicator.classList.remove('ok');
        statusIndicator.classList.add('error');
        statusIndicator.textContent = 'ERROR';
    }
    
    // Remove wobble after animation completes
    setTimeout(() => {
        randomComponent.classList.remove('wobble');
    }, 1000);
}

// Enter void mode - system collapse
function enterVoidMode() {
    gameState.voidMode = true;
    
    // Clear any existing timeouts
    if (gameState.voidTimeout) {
        clearTimeout(gameState.voidTimeout);
    }
    
    // Show void mode
    elements.voidMode.style.display = 'flex';
    
    // Add final stack traces
    addStackTrace('System collapse initiated');
    addStackTrace('Curated Void mode activated');
    addStackTrace('Silence approaching...');
    
    // Hide the fix button
    elements.fixButton.style.display = 'none';
    
    // Add more visual effects to components
    Object.values(elements.components).forEach(component => {
        component.style.animation = 'none';
        component.style.opacity = '0.5';
    });
    
    // Change timer to indicate void state
    elements.timer.textContent = 'VOID';
    elements.timer.style.color = '#ffffff';
    elements.timer.style.textShadow = '0 0 20px #ffffff';
    
    // Set a timeout to actually fade to silence
    gameState.voidTimeout = setTimeout(() => {
        elements.voidMode.style.animation = 'fadeOut 3s forwards';
    }, 1000);
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', init);

// Expose game state for testing
window.gameState = gameState;
