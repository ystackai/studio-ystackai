// Next Drop - Core Game Mechanics
// Factory Assembly Line Experience

// Game state
window.gameState = {
    score: 0,
    level: 1,
    lives: 3,
    crewMembers: 0,
    crewQuality: 0,
    gameRunning: false,
    currentScreen: 'start'
};

// Phaser game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    parent: 'game-canvas-container',
    backgroundColor: '#000000',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

let game;
let factoryLine;
let crewMembers;
let productionItems;
let cursors;
let startButton;
let restartButton;
let scoreText;
let levelText;
let livesText;
let crewMembersText;
let crewQualityText;

// Initialize the game
function initGame() {
    if (game) {
        game.destroy(true);
    }
    
    game = new Phaser.Game(config);
}

// Preload game assets
function preload() {
    // We'll use simple shapes instead of images for this demo
    this.load.image('crewMember', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    this.load.image('product', 'data:image/png;base64,iVBORw0KGgoAIIANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    this.load.image('assemblyLine', 'data:image/png;base64,iVBORw0KGgoAIIANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
}

// Create game objects
function create() {
    // Create the factory assembly line
    factoryLine = this.add.rectangle(400, 300, 800, 50, 0x4ecdc4);
    factoryLine.setOrigin(0.5);
    
    // Create initial crew members
    crewMembers = this.physics.add.group();
    
    // Create production items
    productionItems = this.physics.add.group();
    
    // Create buttons
    startButton = this.add.rectangle(400, 200, 200, 50, 0xff6b6b);
    startButton.setOrigin(0.5);
    startButton.setInteractive();
    startButton.on('pointerdown', startGame);
    
    // Add text for button
    const startText = this.add.text(400, 200, 'Start Production', { 
        fontSize: '24px', 
        fill: '#ffffff',
        align: 'center'
    });
    startText.setOrigin(0.5);
    
    // Initialize UI elements
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#ffffff' });
    levelText = this.add.text(10, 40, 'Level: 1', { fontSize: '20px', fill: '#ffffff' });
    livesText = this.add.text(10, 70, 'Lives: 3', { fontSize: '20px', fill: '#ffffff' });
    crewMembersText = this.add.text(10, 100, 'Crew Members: 0', { fontSize: '20px', fill: '#ffffff' });
    crewQualityText = this.add.text(10, 130, 'Quality: 0%', { fontSize: '20px', fill: '#ffffff' });
    
    // Set up keyboard controls
    cursors = this.input.keyboard.createCursorKeys();
    
    // Hide all screens except start
    hideAllScreens();
    showScreen('start');
}

// Update game state
function update() {
    if (!window.gameState.gameRunning) {
        return;
    }
    
    // Update UI elements
    scoreText.setText('Score: ' + window.gameState.score);
    levelText.setText('Level: ' + window.gameState.level);
    livesText.setText('Lives: ' + window.gameState.lives);
    crewMembersText.setText('Crew Members: ' + window.gameState.crewMembers);
    crewQualityText.setText('Quality: ' + window.gameState.crewQuality + '%');
    
    // Move crew members
    crewMembers.children.iterate(function(member) {
        member.x += 2;
        if (member.x > 850) {
            member.x = -50;
        }
    });
    
    // Move production items
    productionItems.children.iterate(function(item) {
        item.y += 1;
        if (item.y > 450) {
            item.y = -50;
        }
    });
    
    // Add new crew members periodically
    if (Phaser.Math.Between(1, 100) < 2) {
        addCrewMember();
    }
    
    // Add new production items periodically
    if (Phaser.Math.Between(1, 100) < 3) {
        addProductionItem();
    }
}

// Start the game
function startGame() {
    window.gameState.gameRunning = true;
    window.gameState.currentScreen = 'game';
    hideAllScreens();
    showScreen('game');
    
    // Add initial crew members
    for (let i = 0; i < 3; i++) {
        addCrewMember();
    }
    
    // Add initial production items
    for (let i = 0; i < 5; i++) {
        addProductionItem();
    }
}

// Add a new crew member
function addCrewMember() {
    const crewMember = crewMembers.create(Phaser.Math.Between(0, 800), 300, 'crewMember');
    crewMember.setOrigin(0.5);
    crewMember.setBounce(0.2);
    crewMember.setCollideWorldBounds(true);
    
    // Increase crew members count
    window.gameState.crewMembers++;
    window.gameState.crewQuality = Math.min(100, window.gameState.crewQuality + 1);
}

// Add a new production item
function addProductionItem() {
    const item = productionItems.create(Phaser.Math.Between(0, 800), -50, 'product');
    item.setOrigin(0.5);
    item.setBounce(0.2);
    item.setCollideWorldBounds(true);
    
    // Increase score when item is created
    window.gameState.score += 10;
}

// Game over
function gameOver() {
    window.gameState.gameRunning = false;
    window.gameState.currentScreen = 'gameOver';
    hideAllScreens();
    showScreen('gameOver');
    
    // Update final score
    document.getElementById('final-score').textContent = 'Score: ' + window.gameState.score;
}

// Restart game
function restartGame() {
    // Reset game state
    window.gameState = {
        score: 0,
        level: 1,
        lives: 3,
        crewMembers: 0,
        crewQuality: 0,
        gameRunning: false,
        currentScreen: 'start'
    };
    
    // Restart game
    hideAllScreens();
    showScreen('start');
    
    if (game) {
        game.destroy(true);
        initGame();
    }
}

// Hide all screens
function hideAllScreens() {
    const screens = document.querySelectorAll('.game-screen');
    screens.forEach(screen => {
        screen.classList.add('hidden');
    });
}

// Show a specific screen
function showScreen(screenId) {
    const screen = document.getElementById(screenId + '-screen');
    if (screen) {
        screen.classList.remove('hidden');
    }
}

// Event listeners for buttons
document.getElementById('start-button').addEventListener('click', function() {
    startGame();
});

document.getElementById('restart-button').addEventListener('click', function() {
    restartGame();
});

// Initialize the game when the page loads
window.addEventListener('load', function() {
    initGame();
});

// Export game state for testing
window.gameState = window.gameState;
