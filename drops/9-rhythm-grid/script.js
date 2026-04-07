// Rhythm Grid Implementation
class RhythmGrid {
    constructor() {
        this.gridSize = 4;
        this.grid = [];
        this.isPlaying = false;
        this.currentStep = 0;
        this.tempo = 120; // BPM
        this.stepInterval = null;
        this.audioContext = null;
        this.pads = [];
        this.init();
    }

    init() {
        this.createGrid();
        this.setupEventListeners();
        this.initAudioContext();
    }

    createGrid() {
        const gridElement = document.getElementById('rhythm-grid');
        gridElement.innerHTML = '';

        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = false;
                const pad = document.createElement('div');
                pad.className = 'pad';
                pad.dataset.row = i;
                pad.dataset.col = j;
                pad.textContent = `${i * this.gridSize + j + 1}`;
                gridElement.appendChild(pad);
                this.pads.push(pad);
            }
        }
    }

    setupEventListeners() {
        // Pad click events
        this.pads.forEach(pad => {
            pad.addEventListener('click', (e) => this.togglePad(e.target));
        });

        // Control buttons
        document.getElementById('play-btn').addEventListener('click', () => this.play());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());
        document.getElementById('clear-btn').addEventListener('click', () => this.clear());

        // Tempo control
        const tempoSlider = document.getElementById('tempo');
        tempoSlider.addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            document.getElementById('tempo-value').textContent = this.tempo;
            if (this.isPlaying) {
                this.stop();
                this.play();
            }
        });
    }

    initAudioContext() {
        // Initialize Web Audio API context
        if (typeof window.AudioContext !== 'undefined') {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } else {
            console.error('Web Audio API is not supported in this browser');
        }
    }

    togglePad(padElement) {
        const row = parseInt(padElement.dataset.row);
        const col = parseInt(padElement.dataset.col);
        
        // Toggle pad state
        this.grid[row][col] = !this.grid[row][col];
        
        // Update visual feedback
        if (this.grid[row][col]) {
            padElement.classList.add('active');
        } else {
            padElement.classList.remove('active');
        }
    }

    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        document.getElementById('status-text').textContent = 'Playing...';
        
        // Calculate step duration in milliseconds
        const stepDuration = (60 / this.tempo) * 1000 / 4; // 4 steps per beat
        
        this.currentStep = 0;
        this.stepInterval = setInterval(() => {
            this.step();
        }, stepDuration);
    }

    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        clearInterval(this.stepInterval);
        this.currentStep = 0;
        document.getElementById('status-text').textContent = 'Stopped';
        
        // Reset all pads
        this.pads.forEach(pad => {
            pad.classList.remove('active');
        });
    }

    step() {
        // Clear previous active pads
        this.pads.forEach(pad => {
            pad.classList.remove('active');
        });

        // Get current row
        const currentRow = this.currentStep % this.gridSize;
        
        // Activate pads in current row
        for (let col = 0; col < this.gridSize; col++) {
            if (this.grid[currentRow][col]) {
                const pad = document.querySelector(`.pad[data-row="${currentRow}"][data-col="${col}"]`);
                if (pad) {
                    pad.classList.add('active');
                    this.playSound();
                }
            }
        }

        // Move to next step
        this.currentStep = (this.currentStep + 1) % (this.gridSize * this.gridSize);
    }

    playSound() {
        if (!this.audioContext) return;
        
        // Create oscillator for sound generation
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Configure sound parameters
        oscillator.type = 'sine';
        oscillator.frequency.value = 220 + Math.random() * 220; // Random frequency between 220-440 Hz
        gainNode.gain.value = 0.1;
        
        // Play sound
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    clear() {
        // Clear grid
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = false;
            }
        }
        
        // Reset UI
        this.pads.forEach(pad => {
            pad.classList.remove('active');
        });
        
        // Stop if playing
        if (this.isPlaying) {
            this.stop();
        }
        
        document.getElementById('status-text').textContent = 'Cleared';
    }
}

// Initialize the rhythm grid when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RhythmGrid();
});
