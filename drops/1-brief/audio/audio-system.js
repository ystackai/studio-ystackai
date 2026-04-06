// Enhanced audio system for Next Drop - Crew Factory
class AudioSystem {
  constructor() {
    this.context = null;
    this.sounds = {};
    this.isMuted = false;
    this.masterGain = null;
    this.ambienceSource = null;
    this.isPlayingAmbience = false;
    this.isPlayingMusic = false;
  }

  init() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.5; // Set initial volume
    this.loadSounds();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Create a simple event listener for sound system
    window.addEventListener('audioSystemReady', () => {
      console.log('Audio system ready');
    });
  }

  loadSounds() {
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
  }

  // Enhanced sound generation with proper envelopes
  createButtonClickSound() {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.type = 'square';
    
    // Create a proper ADSR envelope
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.setTargetAtTime(0, now, 0.01); // Fast release
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
    return { oscillator, gainNode };
  }

  createCrewAssembleSound() {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.type = 'sine';
    
    // Create a proper ADSR envelope
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.setTargetAtTime(0, now + 0.3, 0.05); // Release envelope
    
    oscillator.start(now);
    oscillator.stop(now + 0.3);
    return { oscillator, gainNode };
  }

  createGalleryHoverSound() {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.type = 'sine';
    
    // Create a proper ADSR envelope
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.setTargetAtTime(0, now + 0.1, 0.01); // Fast release
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
    return { oscillator, gainNode };
  }

  createTransitionSound() {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.type = 'sine';
    
    // Create a proper ADSR envelope
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.setTargetAtTime(0, now + 0.4, 0.05); // Release envelope
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
    return { oscillator, gainNode };
  }

  createFactoryAmbience() {
    // Create a continuous, low-frequency oscillator for ambience
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(80, this.context.currentTime);
    
    // Create a slow amplitude modulation for "breathing" effect
    const modulationOsc = this.context.createOscillator();
    const modulationGain = this.context.createGain();
    modulationOsc.connect(modulationGain);
    modulationGain.gain.setValueAtTime(0.05, this.context.currentTime);
    modulationGain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 2);
    modulationOsc.frequency.setValueAtTime(0.2, this.context.currentTime);
    
    gainNode.connect(modulationGain);
    modulationGain.connect(gainNode.gain);
    
    gainNode.gain.setValueAtTime(0.05, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.02, this.context.currentTime + 2);
    
    oscillator.start(this.context.currentTime);
    modulationOsc.start(this.context.currentTime);
    
    return { oscillator, gainNode, modulationOsc, modulationGain };
  }

  createCrewCreationMusic() {
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    // Create a simple melody with envelope
    const now = this.context.currentTime;
    oscillator1.frequency.setValueAtTime(110, now);
    oscillator1.frequency.exponentialRampToValueAtTime(220, now + 1);
    
    oscillator2.frequency.setValueAtTime(146.83, now);
    oscillator2.frequency.exponentialRampToValueAtTime(293.66, now + 1);
    
    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0, now + 1);
    
    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + 1);
    oscillator2.stop(now + 1);
    
    return { oscillator1, oscillator2, gainNode };
  }

  createGalleryMusic() {
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    // Create a simple melody with envelope
    const now = this.context.currentTime;
    oscillator1.frequency.setValueAtTime(110, now);
    oscillator1.frequency.exponentialRampToValueAtTime(220, now + 1);
    
    oscillator2.frequency.setValueAtTime(146.83, now);
    oscillator2.frequency.exponentialRampToValueAtTime(293.66, now + 1);
    
    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0, now + 1);
    
    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + 1);
    oscillator2.stop(now + 1);
    
    return { oscillator1, oscillator2, gainNode };
  }

  createMissionFailedSound() {
    const oscillator1 = this.context.createOscillator();
    const oscillator2 = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'sine';
    
    // Create a dissonant sound with envelope
    const now = this.context.currentTime;
    oscillator1.frequency.setValueAtTime(100, now);
    oscillator1.frequency.exponentialRampToValueAtTime(50, now + 1);
    
    oscillator2.frequency.setValueAtTime(130.81, now);
    oscillator2.frequency.exponentialRampToValueAtTime(65.41, now + 1);
    
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0, now + 1);
    
    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + 1);
    oscillator2.stop(now + 1);
    
    return { oscillator1, oscillator2, gainNode };
  }

  createEmptyGallerySound() {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.type = 'sawtooth';
    
    // Create a long, sustained sound with envelope
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(65.41, now);
    oscillator.frequency.exponentialRampToValueAtTime(130.81, now + 2);
    
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0, now + 2);
    
    oscillator.start(now);
    oscillator.stop(now + 2);
    
    return { oscillator, gainNode };
  }

  playSound(soundName) {
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
          this.playAmbience();
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
  }

  playAmbience() {
    if (this.isPlayingAmbience) return;
    this.isPlayingAmbience = true;
    
    // Start the ambience sound
    if (!this.sounds.factoryAmbience) {
      this.sounds.factoryAmbience = this.createFactoryAmbience();
    }
  }

  stopAmbience() {
    this.isPlayingAmbience = false;
    // In a real implementation, we'd properly stop the oscillator
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }
}

// Create global audio system instance
const audioSystem = new AudioSystem();

// Initialize audio system
audioSystem.init();

// Create a global gameState for testing
window.gameState = {
  audioSystem: audioSystem,
  isMuted: audioSystem.isMuted
};
