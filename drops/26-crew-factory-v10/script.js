// Audio engine for Subscription Scream: The Elegant Sink
let audioContext;
let subBassOscillator;
let screamOscillator;
let screamGain;
let chaChingOscillator;
let chaChingGain;
let isPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Subscription Scream: The Elegant Sink initialized');
    
    // Initialize audio context on first user interaction
    document.body.addEventListener('click', initAudio, { once: true });
    
    // Get the frog container
    const frogContainer = document.querySelector('.frog-container');
    
    // Add a simple animation to the frog to show it's alive
    if (frogContainer) {
        frogContainer.style.animation = 'pulse 2s infinite';
    }
    
    // Create a grid of cells for visual reference
    const gridContainer = document.querySelector('.grid-container');
    if (gridContainer) {
        // Add grid lines for visual reference (optional)
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 12; j++) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridContainer.appendChild(gridItem);
            }
        }
    }
    
    // Simulate user tier detection
    const userTier = detectUserTier();
    console.log('Detected user tier:', userTier);
    
    // Function to detect user tier (simulated)
    function detectUserTier() {
        // Simulate different tiers based on localStorage or random
        const savedTier = localStorage.getItem('userTier');
        if (savedTier) {
            return savedTier;
        }
        
        // Randomly assign tier for demo purposes
        const tiers = ['free', 'basic', 'premium', 'enterprise'];
        const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
        localStorage.setItem('userTier', randomTier);
        return randomTier;
    }
    
    // Set up event listener for Accept Entropy button
    setupAcceptEntropyButton();
    
    function setupAcceptEntropyButton() {
        // Create the Accept Entropy button
        const acceptButton = document.createElement('div');
        acceptButton.className = 'accept-entropy';
        acceptButton.id = 'accept-entropy';
        document.body.appendChild(acceptButton);
        
        // Add click handler
        acceptButton.addEventListener('click', function() {
            handleAcceptEntropy();
        });
    }
    
    function handleAcceptEntropy() {
        console.log('Entropy accepted - triggering cha-ching sound and fade to black');
        // Trigger the cha-ching sound and fade to black
        playChaChing();
        document.body.style.backgroundColor = '#000000';
        document.body.style.transition = 'background-color 1s ease';
    }
    
    function initAudio() {
        if (isPlaying) return;
        
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create sub-bass oscillator (16Hz)
        createSubBass();
        
        // Create scream oscillator
        createScream();
        
        // Start oscillators
        startAudio();
        
        isPlaying = true;
    }
    
    function createSubBass() {
        subBassOscillator = audioContext.createOscillator();
        subBassOscillator.type = 'sine';
        subBassOscillator.frequency.value = 16; // 16Hz sub-bass rumble
        
        // Connect to master output
        subBassOscillator.connect(audioContext.destination);
        subBassOscillator.start();
    }
    
    function createScream() {
        // Create scream oscillator (sawtooth wave)
        screamOscillator = audioContext.createOscillator();
        screamOscillator.type = 'sawtooth';
        
        // Create gain node for volume control
        screamGain = audioContext.createGain();
        screamGain.gain.value = 0.2; // Initial volume

        // Connect scream oscillator to gain node and then to output
        screamOscillator.connect(screamGain);
        screamGain.connect(audioContext.destination);
        
        // Set initial frequency based on user tier
        const baseFrequency = 220; // A3 note
        const tierMultiplier = getUserTierMultiplier();
        screamOscillator.frequency.value = baseFrequency * tierMultiplier;
    }
    
    function startAudio() {
        // Start oscillators
        if (subBassOscillator) {
            subBassOscillator.start();
        }
        if (screamOscillator) {
            screamOscillator.start();
        }
        
        // Start pitch modulation
        modulatePitch();
    }
    
    function getUserTierMultiplier() {
        // Map user tiers to pitch multipliers
        const tierMap = {
            'free': 1.0,
            'basic': 1.2,
            'premium': 1.5,
            'enterprise': 2.0
        };
        
        const userTier = detectUserTier();
        return tierMap[userTier] || 1.0;
    }
    
    function modulatePitch() {
        if (!screamOscillator) return;
        
        // Modulate the pitch over time to create the "losing its mind" effect
        const baseFrequency = 220; // A3 note
        const tierMultiplier = getUserTierMultiplier();
        const targetFrequency = baseFrequency * tierMultiplier;
        
        // Create a smooth pitch bend effect
        screamOscillator.frequency.exponentialRampToValueAtTime(targetFrequency * 0.5, audioContext.currentTime + 2);
        screamOscillator.frequency.exponentialRampToValueAtTime(targetFrequency * 0.25, audioContext.currentTime + 4);
        screamOscillator.frequency.exponentialRampToValueAtTime(targetFrequency * 0.1, audioContext.currentTime + 6);
        
        // Schedule next modulation
        setTimeout(modulatePitch, 6000);
    }
    
    function playChaChing() {
        if (!audioContext) return;
        
        // Create cha-ching oscillator (square wave with hard cutoff)
        chaChingOscillator = audioContext.createOscillator();
        chaChingOscillator.type = 'square';
        chaChingOscillator.frequency.value = 440; // A4 note
        
        // Create gain node for the cha-ching sound
        chaChingGain = audioContext.createGain();
        chaChingGain.gain.value = 0.5;
        
        // Apply decay envelope
        chaChingGain.gain.setValueAtTime(0.5, audioContext.currentTime);
        chaChingGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        // Connect cha-ching oscillator to gain node and then to output
        chaChingOscillator.connect(chaChingGain);
        chaChingGain.connect(audioContext.destination);
        
        // Start and stop the sound
        chaChingOscillator.start();
        chaChingOscillator.stop(audioContext.currentTime + 0.5);
    }
});
