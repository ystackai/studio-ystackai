// Basic JavaScript for the frog and grid functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Subscription Scream: The Elegant Sink initialized');
    
    // Get the frog container
    const frogContainer = document.querySelector('.frog-container');
    
    // Add a simple animation to the frog to show it's alive
    if (frogContainer) {
        frogContainer.style.animation = 'pulse 2s infinite';
    }
    
    // Create a grid of cells for visual reference
    const gridContainer = document.querySelector('.grid-container');
    if (gridContainer) {
        // Add grid lines for visual reference (optional)
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 12; j++) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridContainer.appendChild(gridItem);
            }
        }
    }
    
    // Simulate user tier detection
    const userTier = detectUserTier();
    console.log('Detected user tier:', userTier);
    
    // Function to detect user tier (simulated)
    function detectUserTier() {
        // Simulate different tiers based on localStorage or random
        const savedTier = localStorage.getItem('userTier');
        if (savedTier) {
            return savedTier;
        }
        
        // Randomly assign tier for demo purposes
        const tiers = ['free', 'basic', 'premium', 'enterprise'];
        const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
        localStorage.setItem('userTier', randomTier);
        return randomTier;
    }
    
    // Set up event listener for Accept Entropy button
    setupAcceptEntropyButton();
    
    function setupAcceptEntropyButton() {
        // Create the Accept Entropy button
        const acceptButton = document.createElement('div');
        acceptButton.className = 'accept-entropy';
        acceptButton.id = 'accept-entropy';
        document.body.appendChild(acceptButton);
        
        // Add click handler
        acceptButton.addEventListener('click', function() {
            handleAcceptEntropy();
        });
    }
    
    function handleAcceptEntropy() {
        console.log('Entropy accepted - triggering cha-ching sound and fade to black');
        // In the full implementation, this would trigger the cha-ching sound and fade
        // For now, just log to console
        document.body.style.backgroundColor = '#000000';
        document.body.style.transition = 'background-color 1s ease';
    }
});
