// Tiered Tragedy Engine - JavaScript Implementation

// Detect user tier (simulated for this implementation)
function detectUserTier() {
    // In a real implementation, this would check user subscription status
    // For now, we'll simulate with a random selection
    return Math.random() > 0.5 ? 'enterprise' : 'free';
}

// Initialize the page based on user tier
function initPage() {
    const userTier = detectUserTier();
    const freeTier = document.getElementById('free-tier');
    const enterpriseTier = document.getElementById('enterprise-tier');
    const thankYou = document.getElementById('thank-you');
    
    // Hide all tiers initially
    freeTier.style.display = 'none';
    enterpriseTier.style.display = 'none';
    thankYou.style.display = 'none';
    
    // Show the appropriate tier
    if (userTier === 'free') {
        freeTier.style.display = 'flex';
        startFreeTierAudio();
    } else {
        enterpriseTier.style.display = 'flex';
        startEnterpriseTierAudio();
    }
}

// Free tier audio generation
function startFreeTierAudio() {
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    // Create sawtooth oscillator
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 440; // Start at A3
    
    // Modulate frequency and distortion over time
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 2);
    oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 4);
    oscillator.frequency.exponentialRampToValueAtTime(3520, audioCtx.currentTime + 6);
    
    // Create distortion effect
    const distortion = audioCtx.createWaveShaper();
    distortion.curve = new Float32Array([0, 0.5, 1]);
    
    // Connect nodes
    oscillator.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Start oscillator
    oscillator.start();
    
    // Set up the 16Hz sub-bass rumble after 5 seconds
    setTimeout(() => {
        // This would be replaced with actual vibration simulation
        console.log("Triggering 16Hz vibration simulation");
        // In a real implementation, this would trigger haptic feedback
    }, 5000);
    
    // Stop audio after 10 seconds to prevent browser audio timeout
    setTimeout(() => {
        oscillator.stop();
    }, 10000);
}

// Enterprise tier audio generation
function startEnterpriseTierAudio() {
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    // Create drone based on G7 chord
    const oscillator1 = audioCtx.createOscillator();
    const oscillator2 = audioCtx.createOscillator();
    const oscillator3 = audioCtx.createOscillator();
    const oscillator4 = audioCtx.createOscillator();
    
    const gainNode = audioCtx.createGain();
    
    // G7 chord frequencies (simplified)
    oscillator1.frequency.value = 196; // G3
    oscillator2.frequency.value = 246.94; // B3
    oscillator3.frequency.value = 293.66; // D4
    oscillator4.frequency.value = 349.23; // F4
    
    // Set up oscillators
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    oscillator3.type = 'sine';
    oscillator4.type = 'sine';
    
    // Connect oscillators to gain node
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    oscillator3.connect(gainNode);
    oscillator4.connect(gainNode);
    
    // Set gain envelope for the drone
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 10);
    
    // Start oscillators
    oscillator1.start();
    oscillator2.start();
    oscillator3.start();
    oscillator4.start();
    
    // Stop after 10 seconds
    setTimeout(() => {
        oscillator1.stop();
        oscillator2.stop();
        oscillator3.stop();
        oscillator4.stop();
    }, 10000);
}

// Handle button clicks
function setupEventListeners() {
    const freeButton = document.getElementById('accept-entropy-free');
    const enterpriseButton = document.getElementById('accept-entropy-enterprise');
    
    freeButton.addEventListener('click', function() {
        console.log("Free tier payment processed");
        // In a real implementation, this would process payment
        // For now, we'll simulate the transition
        transitionToThankYou();
    });
    
    enterpriseButton.addEventListener('click', function() {
        console.log("Enterprise tier payment processed");
        // In a real implementation, this would process payment
        // For now, we'll simulate the transition
        transitionToThankYou();
    });
}

// Transition to thank you screen
function transitionToThankYou() {
    const freeTier = document.getElementById('free-tier');
    const enterpriseTier = document.getElementById('enterprise-tier');
    const thankYou = document.getElementById('thank-you');
    
    // Hide both tiers
    freeTier.style.display = 'none';
    enterpriseTier.style.display = 'none';
    
    // Show thank you screen
    thankYou.style.display = 'flex';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initPage();
    setupEventListeners();
});
