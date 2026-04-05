// Audio system for Crew Factory
const audioSystem = {
  context: null,
  sounds: {},
  isMuted: false,
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
      buttonClick: this.createButtonClickSound(),
      crewAssemble: this.createCrewAssembleSound(),
      galleryHover: this.createGalleryHoverSound(),
      transition: this.createTransitionSound(),
      factoryAmbience: this.createFactoryAmbience(),
      crewCreationMusic: this.createCrewCreationMusic(),
      galleryMusic: this.createGalleryMusic(),
      missionFailed: this.createMissionFailedSound(),
      emptyGallery: this.createEmptyGallerySound()
    };
  },
  createButtonClickSound: function() {
    // Create a simple click sound using Web Audio API
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
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
    gainNode.connect(this.masterGain);
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
    gainNode.connect(this.masterGain);
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
    // Create a transition sound with descending pitch
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.4);
    gainNode.gain.setValueAtTime(0.15, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.4);
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.4);
    return { oscillator, gainNode };
  },
  createFactoryAmbience: function() {
    // Create a continuous factory ambience sound
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'sine';
    
    oscillator1.frequency.setValueAtTime(80, this.context.currentTime);
    oscillator2.frequency.setValueAtTime(240, this.context.currentTime);
    
    gainNode.gain.setValueAtTime(0.05, this.context.currentTime);
    
    oscillator1.start(this.context.currentTime);
    oscillator2.start(this.context.currentTime);
    
    return { oscillator1, oscillator2, gainNode };
  },
  createCrewCreationMusic: function() {
    // Create a gentle ascending melody for crew creation
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    oscillator1.frequency.setValueAtTime(220, this.context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(440, this.context.currentTime + 0.5);
    
    oscillator2.frequency.setValueAtTime(261.63, this.context.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(523.25, this.context.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.05, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0, this.context.currentTime + 0.5);
    
    oscillator1.start(this.context.currentTime);
    oscillator2.start(this.context.currentTime);
    oscillator1.stop(this.context.currentTime + 0.5);
    oscillator2.stop(this.context.currentTime + 0.5);
    
    return { oscillator1, oscillator2, gainNode };
  },
  createGalleryMusic: function() {
    // Create a more ambient, spacey music for gallery browsing
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    oscillator1.frequency.setValueAtTime(110, this.context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(220, this.context.currentTime + 1);
    
    oscillator2.frequency.setValueAtTime(146.83, this.context.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(293.66, this.context.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0.03, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0, this.context.currentTime + 1);
    
    oscillator1.start(this.context.currentTime);
    oscillator2.start(this.context.currentTime);
    oscillator1.stop(this.context.currentTime + 1);
    oscillator2.stop(this.context.currentTime + 1);
    
    return { oscillator1, oscillator2, gainNode };
  },
  createMissionFailedSound: function() {
    // Create a somber, despairing sound for mission failure
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'sine';
    
    oscillator1.frequency.setValueAtTime(100, this.context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 1);
    
    oscillator2.frequency.setValueAtTime(130.81, this.context.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(65.41, this.context.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0, this.context.currentTime + 1);
    
    oscillator1.start(this.context.currentTime);
    oscillator2.start(this.context.currentTime);
    oscillator1.stop(this.context.currentTime + 1);
    oscillator2.stop(this.context.currentTime + 1);
    
    return { oscillator1, oscillator2, gainNode };
  },
  createEmptyGallerySound: function() {
    // Create a haunting, lonely sound for the empty gallery
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.type = 'sawtooth';
    
    oscillator.frequency.setValueAtTime(65.41, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(130.81, this.context.currentTime + 2);
    
    gainNode.gain.setValueAtTime(0.05, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0, this.context.currentTime + 2);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 2);
    
    return { oscillator, gainNode };
  },
  playSound: function(soundName) {
    if (this.isMuted) return;
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
        case 'factoryAmbience':
          // This is a continuous sound, so we don't re-create it
          break;
        case 'crewCreationMusic':
          this.createCrewCreationMusic();
          break;
        case 'galleryMusic':
          this.createGalleryMusic();
          break;
        case 'missionFailed':
          this.createMissionFailedSound();
          break;
        case 'emptyGallery':
          this.createEmptyGallerySound();
          break;
      }
    }
  },
  toggleMute: function() {
    this.isMuted = !this.isMuted;
    // In a real implementation, we'd also update any playing sounds
    // For now, we just toggle the mute state
  }
};

// Initialize audio system when page loads
window.addEventListener('load', function() {
  audioSystem.init();
});
