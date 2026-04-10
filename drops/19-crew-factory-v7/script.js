// JavaScript Foundation for Tiered Tragedy Engine

// Tier detection logic
function detectTier() {
  // For now, we'll simulate tier detection
  // In a real implementation, this would check user session, subscription, etc.
  const tiers = ['free', 'enterprise'];
  return tiers[Math.floor(Math.random() * tiers.length)];
}

// Initialize the page
function init() {
  const tier = detectTier();
  const tierIndicator = document.getElementById('tier-indicator');
  tierIndicator.textContent = tier;
  
  // Show the appropriate tier
  if (tier === 'free') {
    document.getElementById('free-tier').classList.remove('hidden');
    setupFreeTier();
  } else {
    document.getElementById('enterprise-tier').classList.remove('hidden');
    setupEnterpriseTier();
  }
}

// Free Tier Setup
function setupFreeTier() {
  // Set up audio for free tier
  const audio = document.getElementById('audio-free');
  setupFreeTierAudio(audio);
  
  // Set up frog sinking animation
  setupFrogAnimation();
  
  // Set up button click handler
  const button = document.getElementById('accept-entropy-free');
  button.addEventListener('click', function() {
    // Stop audio
    audio.pause();
    audio.currentTime = 0;
    
    // Show thank you message or redirect
    alert('Thank you for accepting entropy!');
  });
  
  // Add 5-second timeout with vibration simulation
  setTimeout(() => {
    if (!button.disabled) {
      simulateVibration();
      // Modify audio to 16Hz sub-bass
      modifyAudioToSubBass(audio);
    }
  }, 5000);
}

// Enterprise Tier Setup
function setupEnterpriseTier() {
  // Set up audio for enterprise tier
  const audio = document.getElementById('audio-enterprise');
  setupEnterpriseTierAudio(audio);
  
  // Set up yacht sinking animation
  setupYachtAnimation();
  
  // Set up button click handler
  const button = document.getElementById('accept-entropy-enterprise');
  button.addEventListener('click', function() {
    // Stop audio
    audio.pause();
    audio.currentTime = 0;
    
    // Show thank you message or redirect
    alert('Thank you for accepting entropy!');
  });
  
  // Add 5-second timeout
  setTimeout(() => {
    if (!button.disabled) {
      // Modify audio pitch upward
      modifyAudioPitchUp(audio);
    }
  }, 5000);
}

// Free Tier Audio Engine
function setupFreeTierAudio(audioElement) {
  // Create audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create sawtooth oscillator
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
  
  // LFO for modulation
  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(2, audioContext.currentTime);
  
  // Modulation for distortion and pitch change
  const modulationGain = audioContext.createGain();
  modulationGain.gain.setValueAtTime(500, audioContext.currentTime);
  
  // Connect nodes
  lfo.connect(modulationGain);
  modulationGain.connect(oscillator.frequency);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Set volume
  gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
  
  // Start oscillators
  oscillator.start();
  lfo.start();
  
  // Store references for later modification
  audioElement.oscillator = oscillator;
  audioElement.lfo = lfo;
  audioElement.gainNode = gainNode;
  audioElement.audioContext = audioContext;
  
  // Set up pitch modulation over time
  let startTime = audioContext.currentTime;
  function modulatePitch() {
    if (audioContext.state === 'running') {
      const elapsed = audioContext.currentTime - startTime;
      
      // Increase distortion over time (frequency of LFO increases)
      lfo.frequency.setValueAtTime(2 + elapsed * 0.2, audioContext.currentTime);
      
      // Increase pitch (sawtooth oscillator frequency increases)
      oscillator.frequency.setValueAtTime(440 + elapsed * 50, audioContext.currentTime);
      
      // Increase distortion (modulation gain increases)
      modulationGain.gain.setValueAtTime(500 + elapsed * 100, audioContext.currentTime);
      
      // Continue modulation
      requestAnimationFrame(modulatePitch);
    }
  }
  
  modulatePitch();
}

// Enterprise Tier Audio Engine
function setupEnterpriseTierAudio(audioElement) {
  // Create audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create drone based on G7 chord
  const frequencies = [196, 246.94, 293.66, 392]; // G4, B4, D5, G5
  
  // Create multiple oscillators for chord
  const oscillators = [];
  const gainNodes = [];
  
  for (let i = 0; i < frequencies.length; i++) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequencies[i], audioContext.currentTime);
    
    // Add slight detuning for rich chord
    oscillator.detune.setValueAtTime((Math.random() - 0.5) * 10, audioContext.currentTime);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set volume for each note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    // Store references
    oscillators.push(oscillator);
    gainNodes.push(gainNode);
    
    // Start oscillator
    oscillator.start();
  }
  
  // Create ambient drone
  const droneOscillator = audioContext.createOscillator();
  const droneGain = audioContext.createGain();
  
  droneOscillator.type = 'sine';
  droneOscillator.frequency.setValueAtTime(100, audioContext.currentTime);
  
  // Add LFO for subtle modulation
  const droneLFO = audioContext.createOscillator();
  droneLFO.type = 'sine';
  droneLFO.frequency.setValueAtTime(0.2, audioContext.currentTime);
  
  const droneModGain = audioContext.createGain();
  droneModGain.gain.setValueAtTime(20, audioContext.currentTime);
  
  // Connect drone nodes
  droneLFO.connect(droneModGain);
  droneModGain.connect(droneOscillator.frequency);
  droneOscillator.connect(droneGain);
  droneGain.connect(audioContext.destination);
  
  droneOscillator.start();
  droneLFO.start();
  
  // Store references for later modification
  audioElement.oscillators = oscillators;
  audioElement.gainNodes = gainNodes;
  audioElement.droneOscillator = droneOscillator;
  audioElement.droneGain = droneGain;
  audioElement.droneLFO = droneLFO;
  audioElement.audioContext = audioContext;
  
  // Set up pitch modulation over time
  let startTime = audioContext.currentTime;
  function modulatePitch() {
    if (audioContext.state === 'running') {
      const elapsed = audioContext.currentTime - startTime;
      
      // Make the drone more dissonant over time
      droneOscillator.frequency.setValueAtTime(100 + elapsed * 0.5, audioContext.currentTime);
      
      // Add slight detuning to chord notes over time
      for (let i = 0; i < oscillators.length; i++) {
        oscillators[i].detune.setValueAtTime((Math.random() - 0.5) * 10 + elapsed * 2, audioContext.currentTime);
      }
      
      // Continue modulation
      requestAnimationFrame(modulatePitch);
    }
  }
  
  modulatePitch();
}

// Modify audio to 16Hz sub-bass for free tier
function modifyAudioToSubBass(audioElement) {
  if (audioElement.oscillator && audioElement.audioContext) {
    // Stop existing oscillators
    audioElement.oscillator.stop();
    audioElement.lfo.stop();
    
    // Create new 16Hz oscillator for sub-bass
    const subBass = audioElement.audioContext.createOscillator();
    const subBassGain = audioElement.audioContext.createGain();
    
    subBass.type = 'sine';
    subBass.frequency.setValueAtTime(16, audioElement.audioContext.currentTime);
    
    // Create a more aggressive distortion
    const distortion = audioElement.audioContext.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      curve[i] = (i / 128 - 1) * 0.8;
    }
    distortion.curve = curve;
    
    // Connect nodes
    subBass.connect(distortion);
    distortion.connect(subBassGain);
    subBassGain.connect(audioElement.audioContext.destination);
    
    // Set volume
    subBassGain.gain.setValueAtTime(0.7, audioElement.audioContext.currentTime);
    
    // Start sub-bass
    subBass.start();
    
    // Store reference
    audioElement.subBass = subBass;
    audioElement.subBassGain = subBassGain;
  }
}

// Modify audio pitch upward for enterprise tier
function modifyAudioPitchUp(audioElement) {
  if (audioElement.droneOscillator && audioElement.audioContext) {
    // Gradually increase pitch
    const targetFreq = 500;
    const duration = 2000; // 2 seconds
    const startTime = audioElement.audioContext.currentTime;
    
    function pitchUp() {
      if (audioElement.audioContext.state === 'running') {
        const elapsed = (audioElement.audioContext.currentTime - startTime) * 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        // Linear interpolation between current and target frequency
        const currentFreq = 100 + (targetFreq - 100) * progress;
        audioElement.droneOscillator.frequency.setValueAtTime(currentFreq, audioElement.audioContext.currentTime);
        
        // Continue until complete
        if (progress < 1) {
          requestAnimationFrame(pitchUp);
        }
      }
    }
    
    pitchUp();
  }
}

// Frog Animation Setup with Fibonacci sequence
function setupFrogAnimation() {
  const container = document.querySelector('.frog-container');
  
  // Use requestAnimationFrame for precise animation
  let position = 0;
  let startTime = null;
  let fibIndex = 0;
  
  function animateFrog(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    
    // Fibonacci-based sinking rate (1, 1, 2, 3, 5, 8, 13, 21, 34...)
    const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
    const sinkRate = fibonacci[fibIndex % fibonacci.length] * 0.0001;
    
    position += sinkRate;
    
    // Apply animation
    container.style.bottom = `${position}px`;
    
    // Update Fibonacci index for next frame
    fibIndex++;
    
    // Continue animation
    requestAnimationFrame(animateFrog);
  }
  
  requestAnimationFrame(animateFrog);
}

// Yacht Animation Setup with 1.333 decay curve
function setupYachtAnimation() {
  const container = document.querySelector('.yacht-container');
  
  // Use requestAnimationFrame for precise animation
  let position = 0;
  let startTime = null;
  
  function animateYacht(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    
    // 1.333 decay curve sinking
    const sinkRate = 0.00005 * Math.pow(1.333, elapsed / 1000);
    position += sinkRate;
    
    // Apply animation
    container.style.bottom = `${position}px`;
    
    // Continue animation
    requestAnimationFrame(animateYacht);
  }
  
  requestAnimationFrame(animateYacht);
}

// Simulate vibration effect for free tier
function simulateVibration() {
  // Create a simple visual vibration effect by shaking the document body
  const body = document.body;
  let shakeIntensity = 0;
  const maxShake = 10;
  
  function shake() {
    if (shakeIntensity > 0) {
      const x = (Math.random() - 0.5) * shakeIntensity;
      const y = (Math.random() - 0.5) * shakeIntensity;
      body.style.transform = `translate(${x}px, ${y}px)`;
      shakeIntensity -= 0.2;
      setTimeout(shake, 50);
    } else {
      body.style.transform = 'translate(0, 0)';
    }
  }
  
  shakeIntensity = maxShake;
  shake();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
