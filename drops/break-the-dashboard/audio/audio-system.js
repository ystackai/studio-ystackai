class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.masterGain = null;
        this.oscillators = [];
        this.gainNodes = [];
    }

    init() {
        if (this.isInitialized) return;

        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.3; // Set master volume

        this.isInitialized = true;
        console.log("Audio system initialized");
    }

    // Create a basic oscillator with envelope
    createOscillator(frequency, type = 'sine', duration = 0.1) {
        if (!this.isInitialized) this.init();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        // Create ADSR envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01); // Attack
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05); // Decay
        gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + duration);

        // Clean up after playback
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };

        return { oscillator, gainNode };
    }

    // Create glitch-like sound with noise and distortion
    createGlitchSound() {
        if (!this.isInitialized) this.init();

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const noise = this.audioContext.createBufferSource();

        // Create white noise buffer
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        noise.buffer = noiseBuffer;
        noise.loop = true;

        // Create distortion effect
        const distortion = this.audioContext.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            curve[i] = Math.sin(i / 128 * Math.PI) * 0.5;
        }
        distortion.curve = curve;

        // Set up oscillator
        oscillator.type = 'square';
        oscillator.frequency.value = 100 + Math.random() * 200;

        // ADSR envelope for oscillator
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

        // Connect nodes
        oscillator.connect(distortion);
        distortion.connect(gainNode);
        noise.connect(distortion);
        gainNode.connect(this.masterGain);

        // Start and stop
        oscillator.start(now);
        oscillator.stop(now + 0.1);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            distortion.disconnect();
        };

        noise.start(now);
        noise.stop(now + 0.1);
    }

    // Create ambient sound with multiple oscillators
    createAmbientSounds() {
        if (!this.isInitialized) this.init();

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        // Create a gentle, evolving sound
        oscillator.type = 'sine';
        oscillator.frequency.value = 80 + Math.random() * 40;

        // Create a subtle LFO for modulation
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.2 + Math.random() * 0.5;

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 10 + Math.random() * 20;

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        // ADSR envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.0);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + 1.0);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            lfo.disconnect();
            lfoGain.disconnect();
        };
    }

    // Create wobble sound
    playWobbleSound() {
        if (!this.isInitialized) this.init();

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 150 + Math.random() * 100;

        // Create a vibrato effect
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5 + Math.random() * 5;

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 10 + Math.random() * 20;

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        // ADSR envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + 0.2);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            lfo.disconnect();
            lfoGain.disconnect();
        };
    }

    // Create error sound
    playErrorSound() {
        if (!this.isInitialized) this.init();

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.value = 200 + Math.random() * 100;

        // Create a harsh envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + 0.1);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }

    // Create trap sound (more aggressive)
    playTrapSound() {
        if (!this.isInitialized) this.init();

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 100 + Math.random() * 100;

        // Create a more intense envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.7, now + 0.02);
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

    // Create void mode sound (silence with glitch effects)
    playVoidSound() {
        if (!this.isInitialized) this.init();

        // Play a short, harsh glitch sound before silence
        this.createGlitchSound();

        // Create a low frequency rumble for the void
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 30 + Math.random() * 20;

        // Create a slow envelope for the rumble
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 2.0);
        gainNode.gain.linearRampToValueAtTime(0, now + 3.0);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + 3.0);

        // Clean up
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }

    // Silence all sounds
    silence() {
        if (!this.isInitialized) return;

        // Immediately set master gain to 0
        this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    }

    // Resume audio after silence
    resume() {
        if (!this.isInitialized) return;

        // Resume master gain
        this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    }
}
