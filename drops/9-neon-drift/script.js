// Game state
window.gameState = {
    speed: 0,
    drift: 0,
    isAccelerating: false,
    isDrifting: false,
    lastTimestamp: 0
};

// Game constants
const MAX_SPEED = 200;
const ACCELERATION = 10;
const DECELERATION = 5;
const DRIFT_FORCE = 15;
const DRIFT_DECAY = 0.95;

// Phaser game setup
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-canvas',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game;
let car;
let cursors;
let button;

function preload() {
    // Create a simple car sprite
    this.textures.once('render', function() {
        // This will be called when the texture is ready
    });
    
    // Create a simple car sprite using graphics
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x00ff00);
    graphics.fillRect(0, 0, 40, 20);
    graphics.fillStyle(0xff0000);
    graphics.fillRect(10, 0, 20, 5);
    graphics.fillStyle(0x0000ff);
    graphics.fillRect(10, 15, 20, 5);
    graphics.generateTexture('car', 40, 20);
}

function create() {
    // Create the car
    car = this.physics.add.sprite(400, 300, 'car');
    car.setCollideWorldBounds(true);
    car.setBounce(0.2);
    
    // Add button interaction
    button = document.getElementById('control-button');
    button.addEventListener('mousedown', startAcceleration);
    button.addEventListener('mouseup', endAcceleration);
    button.addEventListener('touchstart', handleTouchStart);
    button.addEventListener('touchend', handleTouchEnd);
    
    // For keyboard controls (for testing)
    cursors = this.input.keyboard.createCursorKeys();
    
    // Initialize game state
    window.gameState = {
        speed: 0,
        drift: 0,
        isAccelerating: false,
        isDrifting: false,
        lastTimestamp: 0
    };
}

function update() {
    const now = Date.now();
    
    // Update speed based on acceleration state
    if (window.gameState.isAccelerating) {
        window.gameState.speed = Math.min(window.gameState.speed + ACCELERATION, MAX_SPEED);
    } else {
        // Decelerate when not accelerating
        window.gameState.speed = Math.max(window.gameState.speed - DECELERATION, 0);
    }
    
    // Handle drift when button is released
    if (window.gameState.isDrifting) {
        window.gameState.drift *= DRIFT_DECAY;
        if (window.gameState.drift < 0.1) {
            window.gameState.drift = 0;
            window.gameState.isDrifting = false;
        }
    }
    
    // Apply movement based on speed and drift
    if (window.gameState.speed > 0) {
        // Calculate movement direction
        const moveX = Math.sin(car.angle * Math.PI / 180) * window.gameState.speed * 0.1;
        const moveY = -Math.cos(car.angle * Math.PI / 180) * window.gameState.speed * 0.1;
        
        car.x += moveX;
        car.y += moveY;
    }
    
    // Update UI displays
    document.getElementById('speed-display').textContent = Math.round(window.gameState.speed);
    document.getElementById('drift-display').textContent = Math.round(window.gameState.drift);
    
    // Update button visual state
    if (window.gameState.isAccelerating) {
        button.classList.add('held');
    } else {
        button.classList.remove('held');
    }
    
    // Handle keyboard controls for testing
    if (cursors.left.isDown) {
        car.angle -= 2;
    } else if (cursors.right.isDown) {
        car.angle += 2;
    }
    
    window.gameState.lastTimestamp = now;
}

// Button event handlers
function startAcceleration() {
    window.gameState.isAccelerating = true;
    window.gameState.isDrifting = false;
    button.classList.add('held');
}

function endAcceleration() {
    window.gameState.isAccelerating = false;
    if (window.gameState.speed > 0) {
        window.gameState.isDrifting = true;
        window.gameState.drift = window.gameState.speed * 0.5; // Initial drift strength
    }
    button.classList.remove('held');
}

function handleTouchStart(e) {
    e.preventDefault();
    startAcceleration();
}

function handleTouchEnd(e) {
    e.preventDefault();
    endAcceleration();
}

// Initialize the game
game = new Phaser.Game(config);
