// Audio system for Break the Dashboard
const audioSystem = {
  context: null,
  sounds: {},
  isMuted: false,
  ambientOsc: null,
  ambientGain: null,
  glitchOsc: null,
  glitchGain: null,
  voidModeActive: false,
  init: function() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.loadSounds();
  },
  loadSounds: function() {
    // Create a master gain node for volume control
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.5; // Set initial volume
    
    // This would load from sounds.json, but we'll use procedural sounds for now
    this.sounds = {
      errorSound: this.createErrorSound(),
      fixTrap: this.createFixTrapSound(),
      ambient: this.createAmbientSound(),
      voidMode: this.createVoidModeSound()
    };
  },
  createErrorSound: function() {
    // Create a glitchy error sound using Web Audio API
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    oscillator.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.masterGain);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.1);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.context.currentTime);
    filter.Q.setValueAtTime(1, this.context.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.1);
    
    return { oscillator, gainNode, filter };
  },
  createFixTrapSound: function() {
    // Create a sound that sounds like a "trap" - initially pleasant but then becomes harsh
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sawtooth';
    
    oscillator1.frequency.setValueAtTime(440, this.context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(220, this.context.currentTime + 0.5);
    
    oscillator2.frequency.setValueAtTime(300, this.context.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);
    
    oscillator1.start(this.context.currentTime);
    oscillator2.start(this.context.currentTime);
    oscillator1.stop(this.context.currentTime + 0.5);
    oscillator2.stop(this.context.currentTime + 0.5);
    
    return { oscillator1, oscillator2, gainNode };
  },
  createAmbientSound: function() {
    // Create an ambient pad for the dashboard
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sawtooth';
    
    oscillator1.frequency.setValueAtTime(72, this.context.currentTime);
    oscillator2.frequency.setValueAtTime(144, this.context.currentTime);
    
    gainNode.gain.setValueAtTime(0.02, this.context.currentTime);
    
    oscillator1.start(this.context.currentTime);
    oscillator2.start(this.context.currentTime);
    
    return { oscillator1, oscillator2, gainNode };
  },
  createVoidModeSound: function() {
    // Create a harsh, glitchy sound for Void Mode
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.masterGain);
    
    oscillator1.type = 'square';
    oscillator2.type = 'sawtooth';
    
    oscillator1.frequency.setValueAtTime(80, this.context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(10, this.context.currentTime + 1);
    
    oscillator2.frequency.setValueAtTime(160, this.context.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(20, this.context.currentTime + 1);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, this.context.currentTime);
    filter.Q.setValueAtTime(2, this.context.currentTime);
    
    gainNode.gain.setValueAtTime(0.5, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 1);
    
    oscillator1.start(this.context.currentTime);
    oscillator2.start(this.context.currentTime);
    oscillator1.stop(this.context.currentTime + 1);
    oscillator2.stop(this.context.currentTime + 1);
    
    return { oscillator1, oscillator2, gainNode, filter };
  },
  playErrorSound: function() {
    if (this.isMuted) return;
    this.createErrorSound();
  },
  playFixTrap: function() {
    if (this.isMuted) return;
    this.createFixTrapSound();
  },
  startAmbient: function() {
    if (this.isMuted) return;
    this.createAmbientSound();
  },
  activateVoidMode: function() {
    if (this.isMuted) return;
    // Stop any existing sounds
    this.stopAllSounds();
    
    // Play void mode sound in a loop
    this.voidModeActive = true;
    this.playVoidModeLoop();
  },
  playVoidModeLoop: function() {
    if (!this.voidModeActive) return;
    
    // Create a harsh glitchy sound for Void Mode
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    oscillator.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.masterGain);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(80, this.context.currentTime);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(500, this.context.currentTime);
    filter.Q.setValueAtTime(5, this.context.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.2);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.2);
    
    // Schedule next loop
    setTimeout(() => this.playVoidModeLoop(), 200);
  },
  stopAllSounds: function() {
    // This would stop all currently playing sounds
    this.voidModeActive = false;
  },
  toggleMute: function() {
    this.isMuted = !this.isMuted;
    if (this.voidModeActive) {
      this.stopAllSounds();
    }
    // In a real implementation, we'd also update any playing sounds
    // For now, we just toggle the mute state
  }
};

// Initialize audio system when page loads
window.addEventListener('load', function() {
  audioSystem.init();
});

// Expose for testing
window.audioSystem = audioSystem;
