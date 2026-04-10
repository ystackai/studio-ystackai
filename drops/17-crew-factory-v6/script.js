// JavaScript for Tiered Tragedy Engine 404 Page

// Determine tier (mocked via URL parameter)
const urlParams = new URLSearchParams(window.location.search);
const tier = urlParams.get('tier') || 'free'; // Default to free tier

// Audio context
let audioContext;
let oscillator;
let gainNode;
let isPlaying = false;

// DOM elements
const visualContent = document.getElementById('visual-content');
const frogElement = document.getElementById('sinking-frog');
const yachtElement = document.getElementById('serene-yacht');
const timerElement = document.getElementById('timer');
const acceptButton = document.getElementById('accept-button');
const tierDescription = document.getElementById('tier-description');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set the appropriate visual mode
    if (tier === 'enterprise') {
        showEnterpriseMode();
    } else {
        showFreeMode();
    }
    
    // Start countdown
    startCountdown();
    
    // Set up button event
    acceptButton.addEventListener('click', handleAcceptEntropy);
});

// Show Free Tier mode (Sinking Frog)
function showFreeMode() {
    frogElement.classList.remove('hidden');
    yachtElement.classList.add('hidden');
    tierDescription.textContent = 'Free Tier: Sinking Frog';
    
    // Apply panic red color to text
    document.body.style.color = '#FF0000';
    
    // Play panic audio
    playPanicAudio();
}

// Show Enterprise Tier mode (Serene Yacht)
function showEnterpriseMode() {
    frogElement.classList.add('hidden');
    yachtElement.classList.remove('hidden');
    tierDescription.textContent = 'Enterprise Tier: Serene Yacht';
    
    // Reset to black text
    document.body.style.color = '#000000';
    
    // Play serene audio
    playSereneAudio();
}

// Start countdown timer
function startCountdown() {
    let count = 5;
    
    const countdownInterval = setInterval(() => {
        count--;
        timerElement.textContent = count;
        
        if (count <= 0) {
            clearInterval(countdownInterval);
            // When timer reaches 0, fade to black
            fadeToBlack();
        }
    }, 1000);
}

// Play panic audio (Free Tier)
function playPanicAudio() {
    if (isPlaying) return;
    
    isPlaying = true;
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    
    // Modulate frequency and gain
    oscillator.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 5);
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 5);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
}

// Play serene audio (Enterprise Tier)
function playSereneAudio() {
    if (isPlaying) return;
    
    isPlaying = true;
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    
    // Fade to silence
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 4);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
}

// Handle Accept Entropy button click
function handleAcceptEntropy() {
    // Play cha-ching sound
    playChaChing();
    
    // Fade to black
    fadeToBlack();
}

// Play cha-ching sound effect
function playChaChing() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const chaChingOscillator = audioContext.createOscillator();
    const chaChingGain = audioContext.createGain();
    
    chaChingOscillator.type = 'square';
    chaChingOscillator.frequency.setValueAtTime(220, audioContext.currentTime);
    
    // Rapid decay envelope
    chaChingGain.gain.setValueAtTime(0.5, audioContext.currentTime);
    chaChingGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    
    chaChingOscillator.connect(chaChingGain);
    chaChingGain.connect(audioContext.destination);
    
    chaChingOscillator.start();
    chaChingOscillator.stop(audioContext.currentTime + 0.1);
}

// Fade to black
function fadeToBlack() {
    // Change body background to black
    document.body.style.backgroundColor = '#000000';
    
    // Hide visual elements
    visualContent.style.opacity = '0';
    
    // Hide timer and button
    document.getElementById('countdown').style.opacity = '0';
    acceptButton.style.opacity = '0';
    
    // After 440ms, show black screen
    setTimeout(() => {
        document.body.style.backgroundColor = '#000000';
    }, 440);
}
