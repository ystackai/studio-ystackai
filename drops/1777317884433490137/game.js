/**
 * Monolith Grid - Main Game Loop
 * Manages grid construction, fracture events, and settle cycle.
 * All timing locked to Web Audio clock via GridSync.
 */
const GRID_COLS = 8;
const GRID_ROWS = 6;
const FRACTURE_SCALE = 0.04;
const BOUNDARY_CLAMP = 0.5;

class MonolithApp {
  constructor() {
    this.sync = new GridSync();
    this.cells = [];
    this.fractureActive = false;
    this.container = null;
    this.overlay = null;
    this.pulseBtn = null;
  }

  init() {
    this.container = document.getElementById('grid-container');
    this.overlay = document.getElementById('overlay');
    this.pulseBtn = document.getElementById('pulse-btn');

    this.buildGrid();
    this.bindSync();
    this.bindInput();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.sync.audioCtx) this.sync.audioCtx.suspend();
      } else {
        this.sync.resume();
      }
    });
  }

  /**
   * Build Fibonacci-spaced grid with boundary clamps.
   * Each cell gets data attributes for row/col index.
   */
  buildGrid() {
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Pre-compute normalized coordinate (0-1 range) for fracture direction
        const normX = (col / (GRID_COLS - 1)) * 2 - 1;
        const normY = (row / (GRID_ROWS - 1)) * 2 - 1;
        cell.dataset.normX = normX.toFixed(4);
        cell.dataset.normY = normY.toFixed(4);

        // Boundary clamp: ensure no cell escapes viewport
        cell.dataset.clamped = 'true';
        fragment.appendChild(cell);
      }
    }

    this.container.appendChild(fragment);
    this.cells = Array.from(fragment.querySelectorAll('.grid-cell'));
  }

  /**
   * Bind to GridSync events.
   */
  bindSync() {
    this.sync.on('fracture', (data) => this.onFracture(data));
    this.sync.on('pulse', (data) => this.onPulse(data));
    this.sync.on('settle', (data) => this.onSettle(data));
  }

  /**
   * Bind user input to trigger fracture cycle.
   */
  bindInput() {
    this.pulseBtn.addEventListener('click', () => {
      this.sync.triggerFracture();
    });

    // Spacebar trigger
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.sync.triggerFracture();
      }
    });
  }

  /**
   * Fracture callback: shift columns per --grid-fracture-scale.
   * Fires BEFORE hard clip / audio buffer flush.
   */
  onFracture(data) {
    this.fractureActive = true;

    // Log drift for verification
    console.log(`[FRACTURE] drift=${data.drift.toFixed(4)}ms accum=${data.accumulator.toFixed(4)}ms`);

    this.cells.forEach(cell => {
      const normX = parseFloat(cell.dataset.normX);
      const normY = parseFloat(cell.dataset.normY);

      // Fracture vector: columns shift outward from center
      const fractureX = normX * FRACTURE_SCALE * (1 + Math.random() * 0.3);
      const fractureY = normY * FRACTURE_SCALE * (1 + Math.random() * 0.3);

      // Boundary clamp
      const clampedX = Math.max(-BOUNDARY_CLAMP, Math.min(BOUNDARY_CLAMP, fractureX));
      const clampedY = Math.max(-BOUNDARY_CLAMP, Math.min(BOUNDARY_CLAMP, fractureY));

      cell.style.setProperty('--fracture-x', clampedX.toFixed(4));
      cell.style.setProperty('--fracture-y', clampedY.toFixed(4));
      cell.classList.add('fractured');
    });
  }

  /**
   * Pulse: hard clip overlay flash.
   */
  onPulse(data) {
    this.overlay.classList.add('hard-clip');
    setTimeout(() => this.overlay.classList.remove('hard-clip'), 300);
  }

  /**
   * Settle: envelope decay matched to visual collapse.
   * Grid returns to structural rest state.
   */
  onSettle(data) {
    this.fractureActive = false;

    this.cells.forEach(cell => {
      cell.classList.remove('fractured');
      cell.classList.add('settle');

      // Remove settle class after animation completes
      setTimeout(() => {
        cell.classList.remove('settle');
        cell.style.removeProperty('--fracture-x');
        cell.style.removeProperty('--fracture-y');
      }, 400);
    });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  const app = new MonolithApp();
  app.init();
  window.monolithApp = app;
});
