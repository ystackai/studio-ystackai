/*
 * Tiered Tragedy: The 404 That Sells Silence
 * JavaScript for 404 Error Page
 */

// Global variables
let audioContext;
let sawtoothOscillator;
let subBassOscillator;
let lowPassFilter;
let isEnterprise = false; // Default to free tier
let frogSinkInterval;
let contractPixel;

// DOM elements
const frog = document.getElementById('frog');
const contractPixelElement = document.getElementById('contractPixel');
const sawtoothAudio = document.getElementById('sawtooth-audio');
const silentChord = document.getElementById('silent-chord');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Set up the contract pixel click handler
    contractPixelElement.addEventListener('click', handleContractClick);
    
    // Start the frog sinking animation
    startFrogAnimation();
    
    // Start audio based on tier
    if (isEnterprise) {
        startEnterpriseAudio();
    } else {
        startFreeTierAudio();
    }
});

// Start the frog sinking animation with 1.333 decay curve
function startFrogAnimation() {
    let position = 0;
    const decayFactor = 1.333;
    const maxDistance = 200; // Maximum sinking distance
    
    frogSinkInterval = setInterval(() => {
        position += decayFactor;
        if (position > maxDistance) {
            position = maxDistance;
            clearInterval(frogSinkInterval);
        }
        // Apply the CSS transform for sinking
        frog.style.transform = `translate(0, ${position}px)`;
    }, 50); // Update every 50ms
}

// Handle contract pixel click
function handleContractClick() {
    // Stop all audio
    stopAllAudio();
    
    // Play the "cha-ching" sound
    playChaChing();
    
    // Fade to black
    setTimeout(() => {
        document.body.style.backgroundColor = '#000000';
        contractPixelElement.style.display = 'none';
        frog.style.display = 'none';
    }, 1000);
}

// Free tier audio setup
function startFreeTierAudio() {
    // Create oscillators
    sawtoothOscillator = audioContext.createOscillator();
    subBassOscillator = audioContext.createOscillator();
    lowPassFilter = audioContext.createBiquadFilter();
    
    // Configure sawtooth oscillator
    sawtoothOscillator.type = 'sawtooth';
    sawtoothOscillator.frequency.value = 220;
    
    // Configure sub-bass oscillator
    subBassOscillator.type = 'sine';
    subBassOscillator.frequency.value = 16;
    
    // Configure low pass filter
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.value = 1000;
    
    // Connect nodes
    sawtoothOscillator.connect(lowPassFilter);
    lowPassFilter.connect(audioContext.destination);
    subBassOscillator.connect(audioContext.destination);
    
    // Start oscillators
    sawtoothOscillator.start();
    subBassOscillator.start();
    
    // Modulate the sawtooth oscillator
    modulateSawtooth();
}

// Modulate the sawtooth oscillator over time
function modulateSawtooth() {
    let time = 0;
    const modulationInterval = setInterval(() => {
        time += 0.05;
        
        // Gradually decrease frequency
        const newFreq = 220 * Math.pow(0.95, time);
        sawtoothOscillator.frequency.setValueAtTime(newFreq, audioContext.currentTime + 0.01);
        
        // Gradually open up the low-pass filter
        const newFilterFreq = 1000 * Math.pow(0.98, time);
        lowPassFilter.frequency.setValueAtTime(newFilterFreq, audioContext.currentTime + 0.01);
        
        // Continue modulation for 10 seconds
        if (time > 200) {
            clearInterval(modulationInterval);
        }
    }, 100);
}

// Enterprise tier audio setup
function startEnterpriseAudio() {
    // For enterprise, we'll play a single sustained G7 chord that resolves to silence
    // This is a simplified version - in practice, we'd need to generate multiple tones
    // for a proper G7 chord
}

// Stop all audio
function stopAllAudio() {
    if (sawtoothOscillator) {
        sawtoothOscillator.stop();
    }
    if (subBassOscillator) {
        subBassOscillator.stop();
    }
    if (lowPassFilter) {
        lowPassFilter.disconnect();
    }
}

// Play the cha-ching sound
function playChaChing() {
    // Create a square wave oscillator for the cha-ching
    const chaChingOsc = audioContext.createOscillator();
    const chaChingGain = audioContext.createGain();
    
    chaChingOsc.type = 'square';
    chaChingOsc.frequency.value = 261.63; // C4 note
    
    chaChingGain.gain.value = 0.3; // -60dB
    
    chaChingOsc.connect(chaChingGain);
    chaChingGain.connect(audioContext.destination);
    
    // Create a sharp envelope
    const now = audioContext.currentTime;
    chaChingGain.gain.setValueAtTime(0, now);
    chaChingGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    chaChingGain.gain.linearRampToValueAtTime(0, now + 0.1);
    
    chaChingOsc.start(now);
    chaChingOsc.stop(now + 0.1);
}

// Function to switch between tiers (for demonstration purposes)
function switchTier(tier) {
    isEnterprise = tier === 'enterprise';
    
    // Stop existing audio
    stopAllAudio();
    
    // Start new audio
    if (isEnterprise) {
        startEnterpriseAudio();
    } else {
        startFreeTierAudio();
    }
}
