// Core JavaScript for Next Drop - Crew Factory
// This file implements the interactive mechanics for the factory experience

// Define the state for the game
window.gameState = {
    crew: [
        { id: 1, avatar: '👨‍🚀', name: 'Crew Member 1' },
        { id: 2, avatar: '👩‍🚀', name: 'Crew Member 2' },
        { id: 3, avatar: '👨‍💻', name: 'Crew Member 3' }
    ],
    gallery: [
        { id: 1, avatar: '👨‍🚀', name: 'Crew Alpha' },
        { id: 2, avatar: '👩‍🚀', name: 'Crew Beta' },
        { id: 3, avatar: '👨‍💻', name: 'Crew Gamma' },
        { id: 4, avatar: '👩‍🔧', name: 'Crew Delta' }
    ],
    currentCrew: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    setupEventListeners();
    
    // Initialize the crew display
    updateCrewDisplay();
    
    // Initialize the gallery display
    updateGalleryDisplay();
});

// Set up event listeners for interactive elements
function setupEventListeners() {
    // Create Crew button
    const createCrewBtn = document.getElementById('createCrewBtn');
    if (createCrewBtn) {
        createCrewBtn.addEventListener('click', createCrew);
    }
    
    // Randomize button
    const randomizeBtn = document.getElementById('randomizeBtn');
    if (randomizeBtn) {
        randomizeBtn.addEventListener('click', randomizeCrew);
    }
    
    // Gallery items
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            const crewName = this.querySelector('.gallery-name').textContent;
            alert(`You selected: ${crewName}`);
        });
    });
}

// Create a new crew
function createCrew() {
    // In a real implementation, this would generate a new crew
    // For this stub, we'll just use the existing crew members
    window.gameState.currentCrew = [...window.gameState.crew];
    
    // Add assembly line animation effect
    animateAssemblyLine();
    
    // Update the display
    updateCrewDisplay();
    
    // Add visual feedback
    showCrewCreationFeedback();
}

// Randomize the crew members
function randomizeCrew() {
    const crewMembers = ['👨‍🚀', '👩‍🚀', '👨‍💻', '👩‍🔧', '👨‍🔬', '👩‍🎨', '👨‍🚒', '👩‍💼'];
    const crewNames = ['Explorer', 'Pilot', 'Engineer', 'Technician', 'Scientist', 'Artist', 'Firefighter', 'Manager'];
    
    // Generate random crew members
    for (let i = 0; i < 3; i++) {
        const randomAvatar = crewMembers[Math.floor(Math.random() * crewMembers.length)];
        const randomName = crewNames[Math.floor(Math.random() * crewNames.length)];
        window.gameState.crew[i] = {
            id: i + 1,
            avatar: randomAvatar,
            name: randomName
        };
    }
    
    // Update the display
    updateCrewDisplay();
}

// Add assembly line animation effect
function animateAssemblyLine() {
    const assemblyLine = document.querySelector('.assembly-line');
    if (assemblyLine) {
        assemblyLine.classList.add('assembly-line-active');
        setTimeout(() => {
            assemblyLine.classList.remove('assembly-line-active');
        }, 1000);
    }
}

// Add visual feedback for crew creation
function showCrewCreationFeedback() {
    const createBtn = document.getElementById('createCrewBtn');
    if (createBtn) {
        createBtn.textContent = 'Crew Created!';
        createBtn.classList.add('created');
        createBtn.disabled = true;
        
        setTimeout(() => {
            createBtn.textContent = 'Create Crew';
            createBtn.classList.remove('created');
            createBtn.disabled = false;
        }, 1500);
    }
}

// Update the crew display based on current state
function updateCrewDisplay() {
    // Update crew members
    for (let i = 0; i < 3; i++) {
        const crewMember = document.getElementById(`crewMember${i + 1}`);
        if (crewMember) {
            crewMember.querySelector('.member-avatar').textContent = window.gameState.crew[i].avatar;
            crewMember.querySelector('.member-name').textContent = window.gameState.crew[i].name;
        }
    }
}

// Update the gallery display based on current state
function updateGalleryDisplay() {
    // In a real implementation, this would update based on current gallery data
    // For now, we'll just make sure the gallery items are properly set up
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach((item, index) => {
        if (window.gameState.gallery[index]) {
            item.querySelector('.gallery-avatar').textContent = window.gameState.gallery[index].avatar;
            item.querySelector('.gallery-name').textContent = window.gameState.gallery[index].name;
        }
    });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createCrew,
        randomizeCrew,
        updateCrewDisplay,
        updateGalleryDisplay,
        setupEventListeners
    };
}
