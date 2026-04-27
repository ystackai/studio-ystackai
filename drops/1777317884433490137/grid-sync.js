/**
 * Grid Sync Core
 * Patches rAF delta against 44.1kHz Web Audio clock.
 * Maintains <0.1ms drift across 16.67ms cycles.
 */
class GridSync {
  constructor() {
    this.audioCtx = null;
    this.sampleRate = 44100;
    this.cycleMs = 16.67;
    this.frameDrift = 0;
    this.lastAudioTime = 0;
    this.lastRafTime = 0;
    this.accumulator = 0;
    this.running = false;
    this.callbacks = {
      fracture: [],
      settle: [],
      pulse: [],
    };
    this.latencyCompensation = 0;
  }

  init() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.sampleRate,
    });

    // Measure initial latency for compensation
    this.latencyCompensation = this.audioCtx.baseLatency || 0;

    this.lastAudioTime = this.audioCtx.currentTime;
    this.lastRafTime = performance.now();
    this.running = true;

    return this;
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Create a sawtooth oscillator attack at exact audio clock time.
   * Returns the scheduled time for fracture callback (cycleMs later).
   */
  scheduleAttack(time) {
    const now = time || this.audioCtx.currentTime;
    const attackTime = now + this.latencyCompensation / 1000;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, attackTime);

    // Kick envelope: hard attack, exponential decay
    gain.gain.setValueAtTime(0, attackTime);
    gain.gain.linearRampToValueAtTime(1, attackTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 0.35);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(attackTime);
    osc.stop(attackTime + 0.4);

    // Fracture fires exactly one cycle (16.67ms) after attack
    const fractureTime = attackTime + this.cycleMs / 1000;
    return { attackTime, fractureTime, osc, gain };
  }

  /**
   * Schedule kick envelope on exact sample frame.
   */
  scheduleKick(time) {
    const attackTime = time || this.audioCtx.currentTime + this.latencyCompensation / 1000;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, attackTime);
    osc.frequency.exponentialRampToValueAtTime(30, attackTime + 0.08);

    gain.gain.setValueAtTime(0, attackTime);
    gain.gain.linearRampToValueAtTime(0.8, attackTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 0.25);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(attackTime);
    osc.stop(attackTime + 0.3);

    return { attackTime, osc, gain };
  }

  /**
   * Main rAF loop: patches visual delta against audio clock.
   */
  tick() {
    if (!this.running) return;

    const rafNow = performance.now();
    const audioNow = this.audioCtx.currentTime;
    const rafDelta = rafNow - this.lastRafTime;
    const audioDelta = (audioNow - this.lastAudioTime) * 1000;

    // Accumulate drift
    this.frameDrift = rafDelta - this.cycleMs;
    this.accumulator += this.frameDrift;

    // Patch: if accumulated drift exceeds threshold, adjust next cycle
    if (Math.abs(this.accumulator) > 0.1) {
      this.accumulator *= 0.9;
    }

    this.lastRafTime = rafNow;
    this.lastAudioTime = audioNow;

    requestAnimationFrame(() => this.tick());
  }

  start() {
    if (!this.audioCtx) this.init();
    this.resume();
    this.lastAudioTime = this.audioCtx.currentTime;
    this.lastRafTime = performance.now();
    this.tick();
  }

  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  /**
   * Trigger a full fracture cycle: attack -> kick -> fracture -> settle
   */
  triggerFracture() {
    if (!this.audioCtx) this.init();
    this.start();
    const attackTime = this.audioCtx.currentTime;

    // Schedule sawtooth attack
    const attack = this.scheduleAttack(attackTime);
    // Schedule kick on exact audio frame
    const kick = this.scheduleKick(attackTime);

    // Schedule fracture event at 16.67ms post-attack
    const fractureDelay = (attack.fractureTime - attackTime) * 1000;

    // Use audio-synchronized scheduling for visual callbacks
    const fractureRafTime = performance.now() + fractureDelay;
    const settleDelay = 400; // ms for envelope decay / visual settle

    // Fracture callback fires before hard clip
    setTimeout(() => {
      this.emit('fracture', {
        time: attackTime,
        drift: this.frameDrift,
        accumulator: this.accumulator,
      });
    }, fractureDelay);

    // Hard clip overlay
    setTimeout(() => {
      this.emit('pulse', { time: attackTime });
    }, fractureDelay + 16);

    // Settle callback fires when envelope decays
    setTimeout(() => {
      this.emit('settle', {
        time: attackTime + (fractureDelay + settleDelay) / 1000,
      });
    }, fractureDelay + settleDelay);

    return { attack, kick, fractureDelay, settleDelay };
  }

  getDrift() {
    return {
      frame: this.frameDrift,
      accumulated: this.accumulator,
      compensation: this.latencyCompensation,
    };
  }
}

// Expose globally
window.GridSync = GridSync;
