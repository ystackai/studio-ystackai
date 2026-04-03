// Main audio system for Break the Dashboard
class DashboardAudioSystem {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.isMuted = false;
    this.errorCount = 0;
    this.isInVoidMode = false;
    
    // Sound categories
    this.sounds = {
      // Ambient sounds
      ambient: null,
      // UI interaction sounds
      buttonClick: null,
      fixButton: null,
      stackTrace: null,
      componentDegradation: null,
      // Escalation sounds
      errorTick: null,
      cascadeFailure: null,
      timerTick: null,
      // Void mode sounds
      voidTransition: null,
      collapse: null
    };
    
    // Audio state tracking
    this.ambientOscillators = [];
    this.activeSounds = new Set();
  }
  
  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.5;
      
      console.log('Audio system initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
      return false;
    }
  }
  
  // Set error count and trigger audio escalation
  setErrorCount(count) {
    this.errorCount = count;
    
    // Update ambient sound based on error count
    this.updateAmbientSound();
    
    // Trigger escalation sounds based on thresholds
    this.handleErrorEscalation();
  }
  
  // Update ambient sound based on error count
  updateAmbientSound() {
    // If we don't have an ambient sound yet, create one
    if (!this.sounds.ambient) {
      this.createAmbientSound();
      return;
    }
    
    // Update existing ambient sound parameters based on error count
    this.updateAmbientParameters();
  }
  
  // Create the initial ambient sound
  createAmbientSound() {
    if (!this.audioContext) return;
    
    // Create multiple oscillators for rich ambient sound
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const oscillator3 = this.audioContext.createOscillator();
    
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    // Connect nodes
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    oscillator3.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.masterGain);
    
    // Configure oscillators
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'sine';
    oscillator3.type = 'triangle';
    
    oscillator1.frequency.setValueAtTime(80, this.audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(240, this.audioContext.currentTime);
    oscillator3.frequency.setValueAtTime(480, this.audioContext.currentTime);
    
    // Configure filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
    
    // Configure gain
    gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
    
    // Start oscillators
    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    oscillator3.start(this.audioContext.currentTime);
    
    // Store references for later updates
    this.sounds.ambient = {
      oscillators: [oscillator1, oscillator2, oscillator3],
      gainNode: gainNode,
      filter: filter,
      type: 'ambient'
    };
    
    this.ambientOscillators = [oscillator1, oscillator2, oscillator3];
  }
  
  // Update ambient parameters based on error count
  updateAmbientParameters() {
    if (!this.sounds.ambient || !this.audioContext) return;
    
    const { oscillators, gainNode, filter } = this.sounds.ambient;
    
    // Adjust volume based on error count (lower volume as errors increase)
    const volume = Math.max(0.01, 0.05 - (this.errorCount * 0.002));
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    
    // Increase filter cutoff as errors increase (more high frequency noise)
    const cutoff = Math.min(2000, 1500 + (this.errorCount * 50));
    filter.frequency.setValueAtTime(cutoff, this.audioContext.currentTime);
    
    // Add subtle pitch modulation based on error count
    oscillators.forEach((osc, index) => {
      const baseFreq = [80, 240, 480][index];
      const modFreq = 0.1 + (this.errorCount * 0.01);
      const modDepth = 2 + (this.errorCount * 0.5);
      
      // Create LFO for pitch modulation
      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(modFreq, this.audioContext.currentTime);
      lfoGain.gain.setValueAtTime(modDepth, this.audioContext.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      lfo.start(this.audioContext.currentTime);
      
      // Store LFO for later cleanup if needed
      if (!osc.lfo) {
        osc.lfo = lfo;
        osc.lfoGain = lfoGain;
      }
    });
  }
  
  // Handle error escalation sounds
  handleErrorEscalation() {
    // Play error tick sound at certain thresholds
    if (this.errorCount >= 10 && this.errorCount < 20) {
      this.playErrorTick();
    } else if (this.errorCount >= 20 && this.errorCount < 30) {
      this.playErrorTick();
      this.playCascadeFailure();
    } else if (this.errorCount >= 30) {
      this.playCascadeFailure();
      this.playTimerTick();
    }
  }
  
  // Play button click sound
  playButtonClick() {
    if (this.isMuted || !this.audioContext) return;
    
    // Create a simple click sound using Web Audio API
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.type = 'square';
    
    // Add some distortion based on error count
    const distortion = Math.min(1, this.errorCount * 0.05);
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
    
    this.activeSounds.add(oscillator);
    
    // Clean up after sound completes
    oscillator.onended = () => {
      this.activeSounds.delete(oscillator);
    };
  }
  
  // Play fix button sound (trap sound)
  playFixButton() {
    if (this.isMuted || !this.audioContext) return;
    
    // Create a trap sound that starts clean but gets distorted
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.masterGain);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sawtooth';
    
    // Start with clean sound
    oscillator1.frequency.setValueAtTime(440, this.audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(880, this.audioContext.currentTime);
    
    // Add distortion based on error count
    const distortion = Math.min(1, this.errorCount * 0.08);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.3);
    oscillator2.stop(this.audioContext.currentTime + 0.3);
    
    this.activeSounds.add(oscillator1);
    this.activeSounds.add(oscillator2);
    
    // Clean up after sound completes
    oscillator1.onended = () => {
      this.activeSounds.delete(oscillator1);
    };
    oscillator2.onended = () => {
      this.activeSounds.delete(oscillator2);
    };
  }
  
  // Play stack trace appearance sound
  playStackTrace() {
    if (this.isMuted || !this.audioContext) return;
    
    // Create a glitchy sound for stack trace
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.masterGain);
    
    oscillator.type = 'sawtooth';
    filter.type = 'highpass';
    
    // Create a glitch effect with random frequencies and distortion
    const baseFreq = 200 + (Math.random() * 200);
    const glitchFreq = 500 + (Math.random() * 1000);
    
    oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(glitchFreq, this.audioContext.currentTime + 0.05);
    oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime + 0.1);
    
    // Add some distortion
    const distortion = Math.min(1, this.errorCount * 0.05);
    filter.frequency.setValueAtTime(500 + (distortion * 1000), this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
    
    this.activeSounds.add(oscillator);
    
    // Clean up after sound completes
    oscillator.onended = () => {
      this.activeSounds.delete(oscillator);
    };
  }
  
  // Play error tick sound
  playErrorTick() {
    if (this.isMuted || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.type = 'sine';
    
    // Make it more intense as error count increases
    const frequency = 200 + (this.errorCount * 5);
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // Add some envelope
    gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
    
    this.activeSounds.add(oscillator);
    
    // Clean up after sound completes
    oscillator.onended = () => {
      this.activeSounds.delete(oscillator);
    };
  }
  
  // Play cascade failure sound
  playCascadeFailure() {
    if (this.isMuted || !this.audioContext) return;
    
    // Create multiple oscillators for cascade effect
    const oscillators = [];
    const gainNodes = [];
    
    // Create 3 oscillators with different frequencies
    for (let i = 0; i < 3; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100 + (i * 100), this.audioContext.currentTime);
      
      // Add some randomness
      const distortion = Math.min(1, this.errorCount * 0.08);
      const randomFactor = 0.5 + Math.random() * 0.5;
      oscillator.frequency.exponentialRampToValueAtTime(
        (100 + (i * 100)) * (1 + distortion * 2) * randomFactor,
        this.audioContext.currentTime + 0.3
      );
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
      oscillators.push(oscillator);
      gainNodes.push(gainNode);
      
      this.activeSounds.add(oscillator);
      
      // Clean up after sound completes
      oscillator.onended = () => {
        this.activeSounds.delete(oscillator);
      };
    }
  }
  
  // Play timer tick sound
  playTimerTick() {
    if (this.isMuted || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.type = 'square';
    
    // Make timer sound more urgent as errors increase
    const frequency = 500 + (this.errorCount * 10);
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // Add envelope with faster decay for urgency
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
    
    this.activeSounds.add(oscillator);
    
    // Clean up after sound completes
    oscillator.onended = () => {
      this.activeSounds.delete(oscillator);
    };
  }
  
  // Enter void mode
  enterVoidMode() {
    if (this.isMuted || !this.audioContext) return;
    
    this.isInVoidMode = true;
    
    // Create a fading sound effect
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    
    // Fade out the sound over time
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 3);
    
    this.activeSounds.add(oscillator);
    
    // Clean up after sound completes
    oscillator.onended = () => {
      this.activeSounds.delete(oscillator);
    };
    
    // Play final collapse sound
    setTimeout(() => {
      this.playCollapse();
    }, 2000);
  }
  
  // Play collapse sound
  playCollapse() {
    if (this.isMuted || !this.audioContext) return;
    
    // Create explosion-like sound
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.masterGain);
    
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'square';
    
    oscillator1.frequency.setValueAtTime(80, this.audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(160, this.audioContext.currentTime);
    
    // Create a quick, intense sound
    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
    
    // Add filtering for a "crushing" effect
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
    
    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.5);
    oscillator2.stop(this.audioContext.currentTime + 0.5);
    
    this.activeSounds.add(oscillator1);
    this.activeSounds.add(oscillator2);
    
    // Clean up after sound completes
    oscillator1.onended = () => {
      this.activeSounds.delete(oscillator1);
    };
    oscillator2.onended = () => {
      this.activeSounds.delete(oscillator2);
    };
  }
  
  // Toggle mute state
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
    }
  }
  
  // Stop all sounds
  stopAllSounds() {
    this.activeSounds.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Ignore errors from already-stopped oscillators
      }
    });
    this.activeSounds.clear();
  }
  
  // Cleanup audio system
  cleanup() {
    this.stopAllSounds();
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Initialize audio system when page loads
window.addEventListener('load', function() {
  window.dashboardAudio = new DashboardAudioSystem();
  window.dashboardAudio.init();
});
