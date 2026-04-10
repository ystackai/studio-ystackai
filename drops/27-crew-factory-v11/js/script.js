// Script for frog animation and interaction
document.addEventListener('DOMContentLoaded', function() {
    const frog = document.getElementById('frog');
    const button = document.getElementById('accept-button');
    const message = document.getElementById('message');
    const container = document.getElementById('container');
    
    // Initial frog position
    let frogY = 0;
    let creditScore = 0;
    let startTime = Date.now();
    
    // Credit score simulation (real-time)
    function updateCreditScore() {
        // Simulate credit score that decreases over time
        const elapsed = (Date.now() - startTime) / 1000; // seconds since start
        creditScore = Math.max(0, Math.floor(5 - elapsed / 30)); // Decreases from 5 to 0 over 30 seconds
        updateFontScale();
    }
    
    // Update font scale based on credit score
    function updateFontScale() {
        // Remove existing credit classes
        message.classList.remove('credit-0', 'credit-1', 'credit-2', 'credit-3', 'credit-4', 'credit-5');
        
        // Add the appropriate class
        message.classList.add(`credit-${creditScore}`);
    }
    
    // Precise 1.333 decay curve implementation
    function animateFrog() {
        // Calculate decay using 1.333 curve
        const elapsed = (Date.now() - startTime) / 1000; // seconds since start
        const decay = Math.pow(1.333, elapsed);
        frogY = elapsed * 100 / decay; // Applying the 1.333 decay curve
        
        // Apply the frog's position
        frog.style.transform = `translate(-50%, calc(-50% + ${frogY}px))`;
        
        // Update credit score
        updateCreditScore();
        
        requestAnimationFrame(animateFrog);
    }
    
    // Start animation
    animateFrog();
    
    // Button click handling
    button.addEventListener('click', function() {
        // Auto-click trap - immediately click it back
        button.click();
    });
});
