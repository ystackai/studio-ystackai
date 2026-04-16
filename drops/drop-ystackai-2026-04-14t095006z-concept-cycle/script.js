// Script for frog animation and interaction
document.addEventListener('DOMContentLoaded', function() {
    const frog = document.getElementById('frog');
    const button = document.getElementById('accept-button');
    const message = document.getElementById('message');
    const container = document.getElementById('container');
    
    // Audio context for Web Audio API
    let audioContext;
    let tritoneOscillator;
    let cashRegisterOscillator;
    let subBassOscillator;
    let tritoneGainNode;
    let cashRegisterGainNode;
    let subBassGainNode;
    
    // Initial frog position
    let frogY = 0;
    let creditScore = 0;
    let startTime = Date.now();
    let animationFrameId = null;
    let isFalling = false;
    let isAnimating = false;
    
    // Credit score simulation (real-time)
    function updateCreditScore() {
        // Simulate credit score that decreases over time
        const elapsed = (Date.now() - startTime) / 1000; // seconds since start
        creditScore = Math.max(0, Math.floor(5 - elapsed / 30)); // Decreases from 5 to 0 over 30 seconds
        updateFontScale();
    }
    
    // Update font scale based on credit score
    function updateFontScale() {
        // Remove existing credit classes
        message.classList.remove('credit-0', 'credit-1', 'credit-2', 'credit-3', 'credit-4', 'credit-5');
        
        // Add the appropriate class
        message.classList.add(`credit-${creditScore}`);
    }
    
    // Precise 1.333 decay curve implementation with boundary check
    function animateFrog() {
        if (isAnimating) return;
        
        isAnimating = true;
        
        // Calculate decay using 1.333 curve
        const elapsed = (Date.now() - startTime) / 1000; // seconds since start
        const decay = Math.pow(1.333, elapsed);
        frogY = elapsed * 100 / decay; // Applying the 1.333 decay curve
        
        // Boundary check - get container dimensions
        const containerHeight = container.clientHeight;
        const frogHeight = frog.offsetHeight;
        const maxFrogY = containerHeight - frogHeight - 20; // 20px buffer from bottom
        
        // Check if frog hits the bottom boundary
        if (frogY >= maxFrogY) {
            frogY = maxFrogY;
            isFalling = false;
            // Trigger descent completion and UI dissolution
            descent();
        }
        
        // Apply the frog's position
        frog.style.transform = `translate(-50%, calc(-50% + ${frogY}px))`;
        
        // Update credit score
        updateCreditScore();
        
        // Continue animation if frog is still falling
        if (isFalling) {
            animationFrameId = requestAnimationFrame(animateFrog);
        }
        
        isAnimating = false;
    }
    
    // Descent function to handle UI dissolution on impact
    function descent() {
        // Add a visual effect to indicate impact
        frog.style.filter = 'blur(2px)';
        
        // Gradually fade out the frog and message on impact
        setTimeout(() => {
            frog.style.opacity = '0';
            message.style.opacity = '0';
        }, 100);
        
        // Remove frog and message after delay
        setTimeout(() => {
            frog.style.display = 'none';
            message.style.display = 'none';
        }, 1000);
    }
    
    // Initialize audio system
    function initAudio() {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create tritone oscillator (C-F#) - sawtooth wave
        tritoneOscillator = audioContext.createOscillator();
        tritoneOscillator.type = 'sawtooth';
        
        // Create gain node for tritone
        tritoneGainNode = audioContext.createGain();
        tritoneGainNode.gain.value = 0;
        
        // Connect tritone oscillator to gain node
        tritoneOscillator.connect(tritoneGainNode);
        tritoneGainNode.connect(audioContext.destination);
        
        // Create cash register oscillator - square wave
        cashRegisterOscillator = audioContext.createOscillator();
        cashRegisterOscillator.type = 'square';
        
        // Create gain node for cash register
        cashRegisterGainNode = audioContext.createGain();
        cashRegisterGainNode.gain.value = 0;
        
        // Connect cash register oscillator to gain node
        cashRegisterOscillator.connect(cashRegisterGainNode);
        cashRegisterGainNode.connect(audioContext.destination);
        
        // Create sub-bass oscillator - 16Hz
        subBassOscillator = audioContext.createOscillator();
        subBassOscillator.type = 'sine';
        subBassOscillator.frequency.value = 16;
        
        // Create gain node for sub-bass
        subBassGainNode = audioContext.createGain();
        subBassGainNode.gain.value = 0.1; // Safe gain level
        
        // Connect sub-bass oscillator to gain node
        subBassOscillator.connect(subBassGainNode);
        subBassGainNode.connect(audioContext.destination);
        
        // Start oscillators
        tritoneOscillator.start();
        cashRegisterOscillator.start();
        subBassOscillator.start();
    }
    
    // Play tritone sequence
    function playTritoneSequence() {
        if (!audioContext) initAudio();
        
        // Set initial frequency (C note, about 261.63 Hz)
        const startFrequency = 261.63;
        
        // Set end frequency (F# note, about 369.99 Hz)
        const endFrequency = 369.99;
        
        // Start with low volume
        tritoneGainNode.gain.setValueAtTime(0, audioContext.currentTime);
        tritoneGainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        
        // Ramp frequency up from C to F# over time
        tritoneOscillator.frequency.setValueAtTime(startFrequency, audioContext.currentTime);
        tritoneOscillator.frequency.linearRampToValueAtTime(endFrequency, audioContext.currentTime + 3);
        
        // Gradually decrease volume over 3 seconds
        tritoneGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 3);
    }
    
    // Play cash register sound
    function playCashRegister() {
        if (!audioContext) initAudio();
        
        // Set cash register frequency (high pitch)
        cashRegisterOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        
        // Set envelope - sharp cutoff
        cashRegisterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        cashRegisterGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
    }
    
    // Start sub-bass layer
    function startSubBass() {
        if (!audioContext) initAudio();
        
        // Set initial gain for sub-bass
        subBassGainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    }
    
    // Start audio system on first interaction
    function startAudioOnInteraction() {
        // Start audio when user interacts with the page
        document.addEventListener('click', function() {
            if (!audioContext) {
                initAudio();
                playTritoneSequence();
                startSubBass();
            }
        }, { once: true });
    }
    
    // Start animation
    isFalling = true;
    animateFrog();
    
    // Button click handling
    button.addEventListener('click', function() {
        // Auto-click trap - immediately click it back
        button.click();
        
        // Play cash register sound when button is clicked
        playCashRegister();
    });
    
    // Start audio on interaction
    startAudioOnInteraction();
});
