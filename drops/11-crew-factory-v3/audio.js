// Audio engine for The Great Tiered Tragedy
class TieredAudioEngine {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.noise = null;
        this.gainNode = null;
        this.isFreeTier = false;
        this.timer = null;
        this.countdown = 60;
        this.frog = document.getElementById('frog');
        this.acceptButton = document.getElementById('acceptButton');
        this.timerElement = document.getElementById('timer');
        
        // Initialize audio context on first user interaction
        this.initAudioContext();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start countdown
        this.startCountdown();
    }
    
    initAudioContext() {
        // Create audio context on first user interaction
        const initAudio = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.setupAudioNodes();
            }
            // Remove event listeners after first interaction
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchstart', initAudio);
        };
        
        document.addEventListener('click', initAudio);
        document.addEventListener('touchstart', initAudio);
    }
    
    setupAudioNodes() {
        // Create oscillator
        this.oscillator = this.audioContext.createOscillator();
        
        // Create noise generator
        this.noise = this.audioContext.createBufferSource();
        this.noise.buffer = this.createNoiseBuffer();
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        
        // Connect nodes
        this.oscillator.connect(this.gainNode);
        this.noise.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        // Set oscillator type
        this.oscillator.type = 'sawtooth';
        
        // Start oscillators
        this.oscillator.start();
        this.noise.start(0);
    }
    
    createNoiseBuffer() {
        // Create a noise buffer for low-frequency noise generator
        const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }
    
    setupEventListeners() {
        // Check if user is on free tier (mocked via URL parameter)
        this.isFreeTier = window.location.search.includes('tier=free');
        
        // Button click handler
        this.acceptButton.addEventListener('click', () => {
            this.triggerChaChing();
        });
    }
    
    startCountdown() {
        this.timer = setInterval(() => {
            this.countdown--;
            this.timerElement.textContent = this.countdown;
            
            if (this.countdown <= 0) {
                this.handleTimeout();
            } else {
                this.updateAudio();
            }
        }, 1000);
    }
    
    updateAudio() {
        if (!this.oscillator || !this.gainNode) return;
        
        // Update oscillator frequency based on countdown
        const baseFrequency = 440;
        const frequency = baseFrequency * Math.pow(0.999, 60 - this.countdown);
        this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // For Free tier, modulate the oscillator with noise
        if (this.isFreeTier) {
            // Modulate the oscillator's duty cycle (simulated with noise)
            const modulation = Math.sin(this.countdown) * 0.1;
            this.oscillator.detune.setValueAtTime(modulation * 100, this.audioContext.currentTime);
        }
    }
    
    handleTimeout() {
        clearInterval(this.timer);
        
        if (this.isFreeTier) {
            // For Free tier, create a chaotic scream
            this.createScream();
        } else {
            // For Enterprise tier, start Fibonacci decay
            this.startFibonacciDecay();
        }
    }
    
    createScream() {
        // Create chaotic dissonant scream from square waves
        const screamOsc = this.audioContext.createOscillator();
        const screamGain = this.audioContext.createGain();
        screamOsc.connect(screamGain);
        screamGain.connect(this.audioContext.destination);
        
        screamOsc.type = 'square';
        screamOsc.frequency.setValueAtTime(220, this.audioContext.currentTime);
        screamOsc.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 1);
        
        screamGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        screamGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
        
        screamOsc.start(this.audioContext.currentTime);
        screamOsc.stop(this.audioContext.currentTime + 1);
    }
    
    startFibonacciDecay() {
        // Implement Fibonacci decay for Enterprise tier
        // Create a sine wave with logarithmic decay
        const sineOsc = this.audioContext.createOscillator();
        const sineGain = this.audioContext.createGain();
        sineOsc.connect(sineGain);
        sineGain.connect(this.audioContext.destination);
        
        sineOsc.type = 'sine';
        sineOsc.frequency.setValueAtTime(440, this.audioContext.currentTime);
        
        // Apply Fibonacci decay
        const decayTime = 5; // seconds for decay
        const decay = Math.pow(0.5, 1/decayTime); // Base for decay
        
        // Apply logarithmic decay
        sineGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        sineGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + decayTime);
        
        sineOsc.start(this.audioContext.currentTime);
        sineOsc.stop(this.audioContext.currentTime + decayTime);
    }
    
    triggerChaChing() {
        // Synthesize the "cha-ching" sound
        const chachingOsc = this.audioContext.createOscillator();
        const chachingGain = this.audioContext.createGain();
        const lowPass = this.audioContext.createBiquadFilter();
        
        chachingOsc.connect(chachingGain);
        chachingGain.connect(lowPass);
        lowPass.connect(this.audioContext.destination);
        
        chachingOsc.type = 'square';
        chachingOsc.frequency.setValueAtTime(100, this.audioContext.currentTime);
        chachingOsc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
        
        lowPass.type = 'lowpass';
        lowPass.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        lowPass.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.1);
        
        chachingGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        chachingGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        
        chachingOsc.start(this.audioContext.currentTime);
        chachingOsc.stop(this.audioContext.currentTime + 0.1);
    }
}

// Initialize the audio engine when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const audioEngine = new TieredAudioEngine();
});
