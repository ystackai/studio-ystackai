// Audio engine for the 404 experience
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.isAudioInitialized = false;
        this.initAudioContext();
    }

    // Initialize audio context on first user interaction
    initAudioContext() {
        if (!this.isAudioInitialized) {
            // Create audio context on user interaction
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.isAudioInitialized = true;
        }
    }

    // Handle user interaction to initialize audio
    handleUserInteraction() {
        if (!this.isAudioInitialized) {
            this.initAudioContext();
        }
    }

    // Create "cha-ching" sound
    createChaChing() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // Create sink sound (pitch-bent sawtooth)
    createSinkSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(110, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 3);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 3);
        
        oscillator.start(this.audioContext.currentTime);
    }

    // Create climax sound (G7 chord)
    createClimax() {
        if (!this.audioContext) return;
        
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const oscillator3 = this.audioContext.createOscillator();
        const oscillator4 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        oscillator3.connect(gainNode);
        oscillator4.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        oscillator3.type = 'sine';
        oscillator4.type = 'sine';
        
        // G7 chord (G, B, D, F)
        oscillator1.frequency.setValueAtTime(392, this.audioContext.currentTime); // G
        oscillator2.frequency.setValueAtTime(494, this.audioContext.currentTime); // B
        oscillator3.frequency.setValueAtTime(294, this.audioContext.currentTime); // D
        oscillator4.frequency.setValueAtTime(349, this.audioContext.currentTime); // F
        
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator1.start(this.audioContext.currentTime);
        oscillator2.start(this.audioContext.currentTime);
        oscillator3.start(this.audioContext.currentTime);
        oscillator4.start(this.audioContext.currentTime);
        
        oscillator1.stop(this.audioContext.currentTime + 0.5);
        oscillator2.stop(this.audioContext.currentTime + 0.5);
        oscillator3.stop(this.audioContext.currentTime + 0.5);
        oscillator4.stop(this.audioContext.currentTime + 0.5);
    }

    // Play all sounds in sequence
    playSounds() {
        this.createChaChing();
        setTimeout(() => this.createSinkSound(), 100);
        setTimeout(() => this.createClimax(), 3000);
    }
}

// Initialize audio engine
const audioEngine = new AudioEngine();

// Handle user interaction to initialize audio
document.addEventListener('click', () => audioEngine.handleUserInteraction(), { once: true });
document.addEventListener('touchstart', () => audioEngine.handleUserInteraction(), { once: true });
