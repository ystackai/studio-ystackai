/**
 * Procedural Audio Engine for The Elegant Sink
 * Generates tritone, G7 chord, and Cha-ching sound using Web Audio API
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.activeOscillators = [];
        this.activeGains = [];
    }

    /**
     * Initialize the audio context
     */
    init() {
        if (this.isInitialized) return;

        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        this.isInitialized = true;
        console.log('Audio engine initialized');
    }

    /**
     * Create a rising drone oscillator
     */
    createDrone() {
        if (!this.isInitialized) this.init();

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 55;

        // Create a smooth pitch rise over time
        oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 4.4);

        gain.gain.value = 0.1;

        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);

        oscillator.start();
        
        this.activeOscillators.push(oscillator);
        this.activeGains.push(gain);
        
        return { oscillator, gain };
    }

    /**
     * Create a tritone oscillator that resolves to G7 chord
     */
    createTritone() {
        if (!this.isInitialized) this.init();

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 440;

        // Create a rising pitch for the tritone
        oscillator.frequency.exponentialRampToValueAtTime(660, this.audioContext.currentTime + 0.44);

        gain.gain.value = 0.1;

        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);

        oscillator.start();
        
        this.activeOscillators.push(oscillator);
        this.activeGains.push(gain);
        
        return { oscillator, gain };
    }

    /**
     * Create a G7 chord
     */
    createG7Chord() {
        if (!this.isInitialized) this.init();

        const chordOscillators = [];
        const chordFrequencies = [392, 494, 587, 698]; // G7 chord frequencies (G - B - D - F#)
        const gains = [];

        for (let i = 0; i < chordFrequencies.length; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = 'square';
            oscillator.frequency.value = chordFrequencies[i];

            // Apply envelope to make it more percussive
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);

            oscillator.connect(gain);
            gain.connect(this.audioContext.destination);

            oscillator.start();
            
            chordOscillators.push(oscillator);
            gains.push(gain);
        }
        
        this.activeOscillators.push(...chordOscillators);
        this.activeGains.push(...gains);
        
        return { oscillators: chordOscillators, gains: gains };
    }

    /**
     * Create the Cha-ching sound (square wave with envelope)
     */
    createChaChing() {
        if (!this.isInitialized) this.init();

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.value = 880; // High pitch for cash register sound

        // Create a sharp, short envelope for the cash register sound
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.005);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.05);

        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);

        oscillator.start();
        
        this.activeOscillators.push(oscillator);
        this.activeGains.push(gain);
        
        return { oscillator, gain };
    }

    /**
     * Stop all active oscillators
     */
    stopAll() {
        this.activeOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {
                // Ignore errors when stopping already stopped oscillators
            }
        });

        this.activeOscillators = [];
        this.activeGains = [];
    }

    /**
     * Play the complete audio sequence
     */
    playSequence() {
        if (!this.isInitialized) this.init();

        // Create the drone
        const drone = this.createDrone();

        // Create tritone at 440ms (0.44s)
        setTimeout(() => {
            const tritone = this.createTritone();
            
            // Create G7 chord at the same time (440ms)
            const chord = this.createG7Chord();
            
            // Create Cha-ching sound at 440ms (exact same time as text disappears)
            const chaChing = this.createChaChing();
            
            // Stop all sounds after 1 second to prevent audio from lingering
            setTimeout(() => {
                this.stopAll();
            }, 1000);
        }, 440);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioEngine;
} else if (typeof window !== 'undefined') {
    window.AudioEngine = AudioEngine;
}
