// Rhythm Grid Implementation

class RhythmGrid {
    constructor() {
        this.gridSize = 4;
        this.sequence = Array(this.gridSize * this.gridSize).fill(0);
        this.isPlaying = false;
        this.isRecording = false;
        this.currentStep = 0;
        this.tempo = 120; // BPM
        this.audioContext = null;
        this.playbackInterval = null;
        this.recordingStartTime = 0;
        this.recordingBuffer = [];
        this.pads = [];
        
        this.init();
    }
    
    init() {
        this.createGrid();
        this.setupEventListeners();
        this.setupAudioContext();
        this.updateSequenceDisplay();
    }
    
    createGrid() {
        const grid = document.getElementById('rhythmGrid');
        grid.innerHTML = '';
        this.pads = [];
        
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const pad = document.createElement('div');
            pad.className = 'pad';
            pad.dataset.index = i;
            grid.appendChild(pad);
            this.pads.push(pad);
        }
    }
    
    setupEventListeners() {
        // Pad click events
        this.pads.forEach((pad, index) => {
            pad.addEventListener('click', () => this.togglePad(index));
        });
        
        // Control buttons
        document.getElementById('playButton').addEventListener('click', () => this.play());
        document.getElementById('stopButton').addEventListener('click', () => this.stop());
        document.getElementById('clearButton').addEventListener('click', () => this.clear());
        
        // Tempo control
        const tempoSlider = document.createElement('input');
        tempoSlider.type = 'range';
        tempoSlider.min = 60;
        tempoSlider.max = 200;
        tempoSlider.value = this.tempo;
        tempoSlider.className = 'tempo-control';
        tempoSlider.id = 'tempoSlider';
        
        const tempoContainer = document.querySelector('.sequence-info');
        tempoContainer.appendChild(document.createTextNode('Tempo: '));
        tempoContainer.appendChild(tempoSlider);
        tempoContainer.appendChild(document.createTextNode(' BPM'));
        
        tempoSlider.addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            document.getElementById('tempoDisplay').textContent = this.tempo;
            if (this.isPlaying) {
                this.stop();
                this.play();
            }
        });
    }
    
    setupAudioContext() {
        // Create audio context on first user interaction
        const initAudio = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            document.removeEventListener('click', initAudio);
        };
        
        document.addEventListener('click', initAudio, { once: true });
    }
    
    togglePad(index) {
        this.sequence[index] = this.sequence[index] ? 0 : 1;
        this.updatePad(index);
        this.updateSequenceDisplay();
    }
    
    updatePad(index) {
        const pad = this.pads[index];
        if (this.sequence[index]) {
            pad.classList.add('active');
        } else {
            pad.classList.remove('active');
        }
    }
    
    updateSequenceDisplay() {
        document.getElementById('sequenceDisplay').textContent = this.sequence.join('');
    }
    
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.currentStep = 0;
        this.updatePad(this.currentStep);
        
        // Calculate interval in milliseconds
        const interval = (60 / this.tempo / 4) * 1000; // 4 steps per beat
        
        this.playbackInterval = setInterval(() => {
            this.currentStep = (this.currentStep + 1) % (this.gridSize * this.gridSize);
            
            // Update visual feedback
            this.pads.forEach((pad, index) => {
                pad.classList.remove('active');
                if (index === this.currentStep && this.sequence[index]) {
                    pad.classList.add('active');
                }
            });
            
            // Play sound if pad is active
            if (this.sequence[this.currentStep]) {
                this.playSound();
            }
        }, interval);
    }
    
    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        clearInterval(this.playbackInterval);
        this.pads.forEach(pad => pad.classList.remove('active'));
        this.currentStep = 0;
    }
    
    clear() {
        this.sequence = Array(this.gridSize * this.gridSize).fill(0);
        this.pads.forEach((pad, index) => {
            pad.classList.remove('active');
        });
        this.updateSequenceDisplay();
    }
    
    playSound() {
        if (!this.audioContext) return;
        
        // Create oscillator for sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set oscillator properties for a drum-like sound
        oscillator.type = 'sine';
        oscillator.frequency.value = 100 + Math.random() * 200;
        
        // Set volume envelope
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        // Start and stop oscillator
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
}

// Initialize the rhythm grid when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RhythmGrid();
});
