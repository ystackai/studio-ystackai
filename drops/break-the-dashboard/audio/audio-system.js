/* eslint-disable no-unused-vars */
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.oscillators = [];
        this.gainNodes = [];
        this.masterGain = null;
        this.isSilenced = false;
    }

    init() {
        if (this.isInitialized) return;
        
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master gain node for volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.5;
        
        this.isInitialized = true;
        console.log("Audio system initialized");
    }

    // Create a glitchy oscillator sound
    createGlitchOscillator(frequency, type = 'sawtooth', duration = 0.1) {
        if (!this.isInitialized || this.isSilenced) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        // Apply glitch effects
        this.applyGlitchEffects(oscillator, gainNode);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        
        // Clean up after playback
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
        
        return { oscillator, gainNode };
    }

    // Apply glitch effects to oscillators
    applyGlitchEffects(oscillator, gainNode) {
        // Random frequency modulation
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5 + Math.random() * 15;
        
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 50 + Math.random() * 200;
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        lfo.start();
        lfo.stop(this.audioContext.currentTime + 0.2);
        
        // Random gain modulation
        const gainLfo = this.audioContext.createOscillator();
        gainLfo.type = 'triangle';
        gainLfo.frequency.value = 2 + Math.random() * 5;
        
        const gainLfoGain = this.audioContext.createGain();
        gainLfoGain.gain.value = 0.2 + Math.random() * 0.5;
        
        gainLfo.connect(gainLfoGain);
        gainLfoGain.connect(gainNode.gain);
        
        gainLfo.start();
        gainLfo.stop(this.audioContext.currentTime + 0.2);
    }

    // Create procedural error sound
    createErrorSound() {
        if (!this.isInitialized || this.isSilenced) return;
        
        // Create multiple oscillators for a layered effect
        const frequencies = [100, 150, 200, 250];
        const durations = [0.05, 0.07, 0.09, 0.11];
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.value = freq;
            
            // Add some random pitch modulation
            const pitchLfo = this.audioContext.createOscillator();
            pitchLfo.type = 'sine';
            pitchLfo.frequency.value = 2 + Math.random() * 8;
            
            const pitchLfoGain = this.audioContext.createGain();
            pitchLfoGain.gain.value = 50 + Math.random() * 100;
            
            pitchLfo.connect(pitchLfoGain);
            pitchLfoGain.connect(oscillator.frequency);
            
            // Random gain modulation
            const gainLfo = this.audioContext.createOscillator();
            gainLfo.type = 'sawtooth';
            gainLfo.frequency.value = 1 + Math.random() * 3;
            
            const gainLfoGain = this.audioContext.createGain();
            gainLfoGain.gain.value = 0.1 + Math.random() * 0.3;
            
            gainLfo.connect(gainLfoGain);
            gainLfoGain.connect(gainNode.gain);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Apply envelope
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + durations[index]);
            
            oscillator.start(now);
            oscillator.stop(now + durations[index]);
            
            pitchLfo.start(now);
            pitchLfo.stop(now + durations[index]);
            
            gainLfo.start(now);
            gainLfo.stop(now + durations[index]);
            
            // Clean up
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
                pitchLfo.disconnect();
                pitchLfoGain.disconnect();
                gainLfo.disconnect();
                gainLfoGain.disconnect();
            };
        });
    }

    // Create a trap sound effect
    createTrapSound() {
        if (!this.isInitialized || this.isSilenced) return;
        
        // Create a more aggressive sound with rapid changes
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.value = 100;
        
        // Rapid frequency modulation
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.value = 30 + Math.random() * 50;
        
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 200 + Math.random() * 300;
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        // Rapid gain modulation
        const gainLfo = this.audioContext.createOscillator();
        gainLfo.type = 'sine';
        gainLfo.frequency.value = 20 + Math.random() * 40;
        
        const gainLfoGain = this.audioContext.createGain();
        gainLfoGain.gain.value = 0.3 + Math.random() * 0.4;
        
        gainLfo.connect(gainLfoGain);
        gainLfoGain.connect(gainNode.gain);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Apply envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.7, now + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        
        lfo.start(now);
        lfo.stop(now + 0.1);
        
        gainLfo.start(now);
        gainLfo.stop(now + 0.1);
        
        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            lfo.disconnect();
            lfoGain.disconnect();
            gainLfo.disconnect();
            gainLfoGain.disconnect();
        };
    }

    // Create a void sound effect
    createVoidSound() {
        if (!this.isInitialized || this.isSilenced) return;
        
        // Create a long, sustained, glitchy drone
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 50;
        
        // Apply lots of modulation
        const lfo1 = this.audioContext.createOscillator();
        lfo1.type = 'sine';
        lfo1.frequency.value = 0.5 + Math.random() * 2;
        
        const lfo1Gain = this.audioContext.createGain();
        lfo1Gain.gain.value = 5 + Math.random() * 15;
        
        lfo1.connect(lfo1Gain);
        lfo1Gain.connect(oscillator.frequency);
        
        const lfo2 = this.audioContext.createOscillator();
        lfo2.type = 'sawtooth';
        lfo2.frequency.value = 1 + Math.random() * 3;
        
        const lfo2Gain = this.audioContext.createGain();
        lfo2Gain.gain.value = 20 + Math.random() * 40;
        
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(oscillator.frequency);
        
        // Apply noise for texture
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < noiseBuffer.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.2 + Math.random() * 0.3;
        
        noise.buffer = noiseBuffer;
        noise.loop = true;
        noise.start(0);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Apply envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 1);
        
        oscillator.start(now);
        lfo1.start(now);
        lfo2.start(now);
        noise.start(now);
        
        // Clean up after some time
        setTimeout(() => {
            oscillator.stop();
            lfo1.stop();
            lfo2.stop();
            noise.stop();
            oscillator.disconnect();
            gainNode.disconnect();
            lfo1.disconnect();
            lfo1Gain.disconnect();
            lfo2.disconnect();
            lfo2Gain.disconnect();
            noise.disconnect();
            noiseFilter.disconnect();
            noiseGain.disconnect();
        }, 5000);
    }

    // Play error sound
    playErrorSound() {
        this.createErrorSound();
    }

    // Play trap sound
    playTrapSound() {
        this.createTrapSound();
    }

    // Play void sound
    playVoidSound() {
        this.createVoidSound();
    }

    // Create ambient dashboard sounds
    createAmbientSounds() {
        if (!this.isInitialized || this.isSilenced) return;
        
        // Create some ambient background noise
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 20 + Math.random() * 50;
        
        // Apply gentle modulation
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + Math.random() * 0.5;
        
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 5 + Math.random() * 15;
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Apply envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, now + 2);
        
        oscillator.start(now);
        lfo.start(now);
        
        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            lfo.disconnect();
            lfoGain.disconnect();
        };
    }

    // Silence the audio
    silence() {
        this.isSilenced = true;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
    }

    // Resume audio (not used in this implementation)
    resume() {
        this.isSilenced = false;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        }
    }
}

    // Create a more aggressive glitch sound
    createAggressiveGlitch(frequency = 100, duration = 0.2) {
        if (!this.isInitialized || this.isSilenced) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.value = frequency;

        // Apply intense modulation
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.value = 10 + Math.random() * 20;

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 200 + Math.random() * 300;

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            lfo.disconnect();
            lfoGain.disconnect();
        };
    }

    // Create a short, sharp glitch sound
    createSharpGlitch(frequency = 500, duration = 0.05) {
        if (!this.isInitialized || this.isSilenced) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        // Apply envelope for sharp attack
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.001);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + duration);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }

    // Play a glitch sound effect
    playGlitchSound() {
        this.createGlitchOscillator(100 + Math.random() * 200, 'sawtooth', 0.1 + Math.random() * 0.1);
        this.createAggressiveGlitch(50 + Math.random() * 100, 0.15 + Math.random() * 0.1);
        this.createSharpGlitch(500 + Math.random() * 1000, 0.05 + Math.random() * 0.05);
    }

    // Create a reactive sound for wobbling components
    playWobbleSound() {
        if (!this.isInitialized || this.isSilenced) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 100 + Math.random() * 200;

        // Apply envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + 0.15);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }
