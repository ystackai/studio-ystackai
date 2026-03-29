// Audio system for Crew Factory
const audioSystem = {
  context: null,
  sounds: {},
  init: function() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.loadSounds();
  },
  loadSounds: function() {
    // This would load from sounds.json, but we'll use procedural sounds for now
    this.sounds = {
      buttonClick: this.createButtonClickSound(),
      crewAssemble: this.createCrewAssembleSound(),
      galleryHover: this.createGalleryHoverSound(),
      transition: this.createTransitionSound()
    };
  },
  createButtonClickSound: function() {
    // Create a simple click sound using Web Audio API
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(300, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.1);
    return { oscillator, gainNode };
  },
  createCrewAssembleSound: function() {
    // Create a success sound with rising pitch
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.3);
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.3);
    return { oscillator, gainNode };
  },
  createGalleryHoverSound: function() {
    // Create a subtle hover sound
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, this.context.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.1);
    return { oscillator, gainNode };
  },
  createTransitionSound: function() {
    // Create a transition sound with a downward pitch
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.4);
    gainNode.gain.setValueAtTime(0.15, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.4);
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.4);
    return { oscillator, gainNode };
  },
  playSound: function(soundName) {
    if (this.sounds[soundName]) {
      // For procedural sounds, we just create new ones
      switch(soundName) {
        case 'buttonClick':
          this.createButtonClickSound();
          break;
        case 'crewAssemble':
          this.createCrewAssembleSound();
          break;
        case 'galleryHover':
          this.createGalleryHoverSound();
          break;
        case 'transition':
          this.createTransitionSound();
          break;
      }
    }
  }
};

// Initialize audio system when page loads
window.addEventListener('load', function() {
  audioSystem.init();
});
