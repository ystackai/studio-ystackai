// Next Drop - Crew Factory Interactive Experience
// This script handles the interactive elements of the factory experience

// Factory state management
const factoryState = {
  crewCount: 0,
  isCreating: false,
  productionLineActive: true
};

// DOM Elements
const createButton = document.querySelector('.create-crew-btn');
const crewAssembly = document.querySelector('.crew-assembly');
const statusIndicator = document.querySelector('.status-indicator');
const statusText = document.querySelector('.status-text');

// Initialize the factory experience
function initFactory() {
  console.log('Crew Factory initialized');
  
  // Set up event listeners
  createButton.addEventListener('click', handleCreateCrew);
  
  // Update status indicator
  updateFactoryStatus();
}

// Handle crew creation
function handleCreateCrew() {
  if (factoryState.isCreating) return;
  
  factoryState.isCreating = true;
  createButton.disabled = true;
  createButton.textContent = 'Creating...';
  
  // Visual feedback for creation
  createButton.classList.add('highlight');
  crewAssembly.classList.add('highlight');
  
  // Simulate creation process
  setTimeout(() => {
    factoryState.crewCount++;
    createButton.textContent = 'Crew Created!';
    
    // Visual feedback for successful creation
    createButton.classList.remove('highlight');
    createButton.classList.add('success');
    
    // Reset after delay
    setTimeout(() => {
      factoryState.isCreating = false;
      createButton.disabled = false;
      createButton.textContent = 'Create Crew';
      createButton.classList.remove('success');
      crewAssembly.classList.remove('highlight');
    }, 2000);
    
    // Update status
    updateFactoryStatus();
  }, 1500);
}

// Update factory status display
function updateFactoryStatus() {
  if (factoryState.productionLineActive) {
    statusIndicator.style.backgroundColor = '#27ae60';
    statusText.textContent = `Production Line Active - ${factoryState.crewCount} Crews Created`;
  } else {
    statusIndicator.style.backgroundColor = '#e74c3c';
    statusText.textContent = 'Production Line Offline';
  }
}

// Animation for crew parts
function animateCrewParts() {
  const parts = document.querySelectorAll('.crew-part');
  parts.forEach((part, index) => {
    // Add delay to each part for sequential animation
    setTimeout(() => {
      part.style.transform = 'scale(1.1)';
      setTimeout(() => {
        part.style.transform = 'scale(1)';
      }, 500);
    }, index * 200);
  });
}

// Initialize the factory when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initFactory();
  
  // Start animation loop
  setInterval(animateCrewParts, 3000);
  
  // Initial animation
  setTimeout(animateCrewParts, 500);
});

// Expose state for testing
if (typeof window !== 'undefined') {
  window.factoryState = factoryState;
}
