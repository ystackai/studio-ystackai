// Web Audio API implementation for the CFO scream
class LiquidationAudioEngine {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.debtScore = Math.random() * 100; // Random debt score between 0-100
        this.init();
    }

    init() {
        // Create a text element to display debt score
        const debtText = document.createElement('div');
        debtText.className = 'debt-text';
        debtText.id = 'debtText';
        document.body.appendChild(debtText);
        
        // Update debt text with inverse proportional font size
        this.updateDebtText();
    }

    updateDebtText() {
        const debtText = document.getElementById('debtText');
        // Font size inversely proportional to debt score
        // High debt = small text, low debt = large text
        const fontSize = Math.max(12, 32 - (this.debtScore / 100) * 20);
        debtText.textContent = `Debt Score: ${Math.round(this.debtScore)}`;
        debtText.style.fontSize = `${fontSize}px`;
    }

    // The Click: raw 880Hz sawtooth wave with rapid decay
    playClickSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 880;
        
        // Rapid decay envelope (10ms)
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.01);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.01);
    }

    // The Scream: A sine wave locked to 44.1kHz sample rate
    playScream() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        // Start in A-flat (440Hz * 0.8909) = ~392Hz
        oscillator.frequency.value = 392;
        
        // Add slight detuning (vibrato) to simulate "corrupted hard drive"
        const detuneOsc = this.audioContext.createOscillator();
        detuneOsc.type = 'sine';
        detuneOsc.frequency.value = 5;
        const detuneGain = this.audioContext.createGain();
        detuneGain.gain.value = 5;
        detuneOsc.connect(detuneGain);
        detuneGain.connect(oscillator.frequency);
        
        // Set up gain envelope for the scream
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.start(this.audioContext.currentTime);
        detuneOsc.start(this.audioContext.currentTime);
        
        oscillator.stop(this.audioContext.currentTime + 0.5);
        detuneOsc.stop(this.audioContext.currentTime + 0.5);
    }

    // The Impact: Square wave with noise buffer
    playImpact() {
        // Create noise buffer
        const bufferSize = this.audioContext.sampleRate * 0.44; // 440ms delay
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        // Create noise source
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        // Create square wave for impact
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = 440;
        
        // Connect both to a gain node
        const gainNode = this.audioContext.createGain();
        noise.connect(gainNode);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set up impact envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        noise.start(this.audioContext.currentTime);
        oscillator.start(this.audioContext.currentTime);
        
        noise.stop(this.audioContext.currentTime + 0.44);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    // Play all sounds in sequence
    playAllSounds() {
        this.playClickSound();
        // Schedule scream and impact to happen at the same time as the visual impact
        // This is a simplified version - in a real implementation we'd need to
        // accurately sync with the animation frame
    }
}

// Initialize audio engine
const audioEngine = new LiquidationAudioEngine();

// Animation variables
let isAnimating = false;

// Get DOM elements
const frogContainer = document.querySelector('.frog-container');
const liquidateButton = document.getElementById('liquidateButton');
const debtText = document.getElementById('debtText');

// Set up the animation
liquidateButton.addEventListener('click', function() {
    if (isAnimating) return;
    
    isAnimating = true;
    
    // Start the audio engine
    audioEngine.playAllSounds();
    
    // Add falling animation class to frog
    frogContainer.classList.add('falling');
    
    // Get the final position when animation completes
    const finalPosition = window.innerHeight - 100; // frog height is 100px
    
    // When animation completes, trigger the void effect
    frogContainer.addEventListener('animationend', function() {
        // Add dissolve effect to the entire page
        document.body.classList.add('dissolve');
        
        // Play impact sound at exact moment of visual impact
        audioEngine.playImpact();
        
        // After a delay, redirect to a 404 page or show a message
        setTimeout(() => {
            // For this prototype, we'll just show a message
            alert('The void has consumed your assets. No reload. No back button.');
        }, 1000);
    }, { once: true });
});
