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
  audio.volume = 0.7;
  
  // Set up frog sinking animation
  setupFrogAnimation();
  
  // Set up button click handler
  document.getElementById('accept-entropy-free').addEventListener('click', function() {
    // Stop audio
    audio.pause();
    audio.currentTime = 0;
    
    // Show thank you message or redirect
    alert('Thank you for accepting entropy!');
  });
}

// Enterprise Tier Setup
function setupEnterpriseTier() {
  // Set up audio for enterprise tier
  const audio = document.getElementById('audio-enterprise');
  audio.volume = 0.7;
  
  // Set up yacht sinking animation
  setupYachtAnimation();
  
  // Set up button click handler
  document.getElementById('accept-entropy-enterprise').addEventListener('click', function() {
    // Stop audio
    audio.pause();
    audio.currentTime = 0;
    
    // Show thank you message or redirect
    alert('Thank you for accepting entropy!');
  });
}

// Frog Animation Setup
function setupFrogAnimation() {
  const container = document.querySelector('.frog-container');
  
  // Use requestAnimationFrame for precise animation
  let position = 0;
  let startTime = null;
  
  function animateFrog(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    
    // Fibonacci-based sinking rate (approximated)
    // 1, 1, 2, 3, 5, 8, 13, 21, 34...
    const sinkRate = 0.0001 * Math.floor(elapsed / 100);
    position += sinkRate;
    
    // Apply animation
    container.style.bottom = `${position}px`;
    
    // Continue animation
    requestAnimationFrame(animateFrog);
  }
  
  requestAnimationFrame(animateFrog);
}

// Yacht Animation Setup
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
