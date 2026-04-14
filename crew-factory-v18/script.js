// Generate a random debt score between 0 and 100
const debtScore = Math.floor(Math.random() * 101);

// Set the debt score as a CSS variable for font scaling
document.documentElement.style.setProperty('--debt-score', debtScore);

// Apply debt-scaling font size to body
const body = document.body;
if (debtScore < 30) {
    body.classList.add('debt-large');
} else if (debtScore < 70) {
    body.classList.add('debt-medium');
} else {
    body.classList.add('debt-small');
}

// Get the liquidate button and frog elements
const liquidateButton = document.getElementById('liquidateButton');
const frogContainer = document.querySelector('.frog-container');

// Audio context setup
let audioContext;
let oscillator;
let gainNode;

// Initialize audio context on first user interaction
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play the initial click sound
function playClickSound() {
    initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 880;
    
    // Quick decay envelope
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.01);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.01);
}

// Play the CFO scream sound
function playScreamSound() {
    initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // A-flat frequency (440Hz * 2^(-1/12) ≈ 369.99 Hz)
    oscillator.frequency.value = 370;
    
    // Vibrato effect
    const vibrato = audioContext.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5; // 5Hz vibrato
    
    const vibratoGain = audioContext.createGain();
    vibratoGain.gain.value = 2; // 2Hz detune
    
    vibrato.connect(vibratoGain);
    vibratoGain.connect(oscillator.frequency);
    
    // Set up the envelope
    gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    vibrato.start(audioContext.currentTime);
    
    oscillator.stop(audioContext.currentTime + 0.5);
    vibrato.stop(audioContext.currentTime + 0.5);
}

// Play the impact sound
function playImpactSound() {
    initAudio();
    
    // Create noise buffer
    const bufferSize = audioContext.sampleRate * 0.4;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Create a square wave for the modem sound
    const squareOsc = audioContext.createOscillator();
    squareOsc.type = 'square';
    squareOsc.frequency.value = 1000;
    
    const squareGain = audioContext.createGain();
    squareGain.gain.value = 0.3;
    
    squareOsc.connect(squareGain);
    squareGain.connect(audioContext.destination);
    
    // Mix noise and square wave
    const mixGain = audioContext.createGain();
    mixGain.gain.value = 0.7;
    
    noise.connect(mixGain);
    squareOsc.connect(mixGain);
    
    // Connect to destination
    mixGain.connect(audioContext.destination);
    
    // Set up envelopes
    noise.start(audioContext.currentTime);
    squareOsc.start(audioContext.currentTime);
    
    // Fade out
    mixGain.gain.setValueAtTime(0.7, audioContext.currentTime);
    mixGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    noise.stop(audioContext.currentTime + 0.4);
    squareOsc.stop(audioContext.currentTime + 0.4);
}

// Handle liquidation button click
liquidateButton.addEventListener('click', function() {
    // Play click sound
    playClickSound();
    
    // Start frog fall animation
    frogContainer.classList.add('falling');
    
    // Get the frog container's position to calculate when it hits bottom
    const frogRect = frogContainer.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Calculate the time when the frog will hit the bottom
    const fallDistance = windowHeight - frogRect.top - frogRect.height;
    const fallTime = 2000; // 2 seconds as per animation duration
    
    // Schedule the scream sound to play at exactly the right time
    setTimeout(() => {
        playScreamSound();
        
        // Play impact sound immediately after the scream
        setTimeout(() => {
            playImpactSound();
            
            // Apply dissolve effect to the entire body
            document.body.classList.add('dissolve');
        }, 100); // Small delay to ensure scream finishes
    }, fallTime - 100); // Schedule just before the impact
});

// Add the debt score to the page for debugging
const debtDisplay = document.createElement('div');
debtDisplay.textContent = `Debt Score: ${debtScore}`;
debtDisplay.style.position = 'absolute';
debtDisplay.style.top = '10px';
debtDisplay.style.right = '10px';
debtDisplay.style.color = 'white';
debtDisplay.style.fontSize = '14px';
document.body.appendChild(debtDisplay);
