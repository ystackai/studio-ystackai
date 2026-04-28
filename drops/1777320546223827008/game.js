"use strict";

/* ────────────────────── CONSTANTS ────────────────────── */
const TARGET_FPS     = 60;
const FIXED_DT       = 1 / TARGET_FPS;
const BPM            = 120;
const BEAT_INTERVAL  = 60 / BPM;            // 0.5 s
const SUBDIVISIONS   = 12;                   // 12-column grid per measure
const STEP_INTERVAL  = BEAT_INTERVAL / 3;    // 12 steps per measure
const MEASURE_STEPS  = SUBDIVISIONS;

const TARGET_FREQ    = 55;               // ideal kick freq (A1)
const TARGET_ATTACK  = 50;               // ideal attack ms
const TARGET_CLAMP   = 30;               // ideal clamp threshold
const SYNC_THRESHOLD = 0.92;             // 92% to progress
const DRIFT_THRESHOLD = 0.85;           // below 85% drift accumulates
const CLAMP_BEATS    = 8;                // 8 consecutive beats at ≥92%

/* ────────────────────── STATE MACHINE ────────────────────── */
const STATE = { GRID: 0, LOCKED: 1, BREAK: 2 };
let state = STATE.GRID;

/* ────────────────────── AUDIO ENGINE ────────────────────── */
let audioCtx = null;
let masterGain = null;
let compressor = null;
let lowpassFilter = null;
let stereoWiden = null;
let kickOsc = null;

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.8;

  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.ratio.value = 4;

  lowpassFilter = audioCtx.createBiquadFilter();
  lowpassFilter.type = 'lowpass';
  lowpassFilter.frequency.value = 4000;
  lowpassFilter.Q.value = 1;

  stereoWiden = audioCtx.createStereoPanner();
  stereoWiden.pan.value = 0;

  masterGain.connect(compressor);
  compressor.connect(lowpassFilter);
  lowpassFilter.connect(stereoWiden);
  stereoWiden.connect(audioCtx.destination);
}

/* Noise buffer for snare/hihat */
function createNoiseBuffer() {
  const sr = audioCtx.sampleRate;
  const len = sr * 0.15;
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

let noiseBuffer = null;

/* Kick sound — oscillator + short noise burst */
function playKick(time) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
  g.gain.setValueAtTime(0.9, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(time);
  osc.stop(time + 0.36);
}

/* Snare — noise burst + triangle body */
function playSnare(time) {
  if (!noiseBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.4, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  src.connect(g);
  g.connect(masterGain);
  src.start(time);
  src.stop(time + 0.16);

  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 180;
  og.gain.setValueAtTime(0.25, time);
  og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.connect(og);
  og.connect(masterGain);
  osc.start(time);
  osc.stop(time + 0.11);
}

/* Hi-hat — short high-frequency noise */
function playHihat(time, open = false) {
  if (!noiseBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 8000;
  const g = audioCtx.createGain();
  const dur = open ? 0.12 : 0.04;
  g.gain.setValueAtTime(open ? 0.15 : 0.12, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  src.connect(hp);
  hp.connect(g);
  g.connect(masterGain);
  src.start(time);
  src.stop(time + dur + 0.01);
}

/* Lead oscillator — user-controlled sawtooth */
let leadOsc = null;
let leadGain = null;
let leadRunning = false;

function startLeadOscillator() {
  if (leadRunning) return;
  leadOsc = audioCtx.createOscillator();
  leadGain = audioCtx.createGain();
  leadOsc.type = 'sawtooth';
  leadOsc.frequency.value = knobFreq;
  leadGain.gain.value = 0.08;
  leadOsc.connect(leadGain);
  leadGain.connect(masterGain);
  leadOsc.start();
  leadRunning = true;
}

function stopLeadOscillator() {
  if (leadOsc) { leadOsc.stop(); leadRunning = false; }
}

/* Kick oscillator that follows the beat (reference) */
function playKickRef(time) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(TARGET_FREQ, time);
  g.gain.setValueAtTime(0.5, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(time);
  osc.stop(time + 0.31);
}

/* Knob click */
function playKnobClick() {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1200 + Math.random() * 400;
  g.gain.setValueAtTime(0.06, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.04);
}

/* Clamp bass thud */
function playClampThud() {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  g.gain.setValueAtTime(0.7, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.26);
}

/* Drift warning — detuned square wave pulse */
function playDriftWarning() {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 350;
  g.gain.setValueAtTime(0.12, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.16);
}

/* Success triad chime */
function playSuccessChime() {
  const now = audioCtx.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.02 + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 2);
  });
}

/* Clock out chime for break room */
function playClockOutChime() {
  const now = audioCtx.currentTime;
  [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1, now + 0.01 + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 2.6);
  });
}

/* Ship bar ascending tone */
function playShipTone(noteIdx) {
  const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
  const freq = scale[noteIdx % scale.length];
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.08, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.16);
}

/* ────────────────────── CHILLHOP AUDIO ────────────────────── */
let chillhopScheduled = false;
const CHILLHOP_BPM = 85;
let chillhopInterval_ms = 60000 / CHILLHOP_BPM;
let chillhopBeat = 0;
let chillhopTimerID = null;

/* Procedural piano note */
function playPianoNote(freq, time, dur = 0.5) {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.value = freq;
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2.01;
  g.gain.setValueAtTime(0.12, time);
  g.gain.setValueAtTime(0.12, time + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc1.connect(g);
  osc2.connect(g);
  g.connect(masterGain);
  osc1.start(time); osc1.stop(time + dur + 0.01);
  osc2.start(time); osc2.stop(time + dur + 0.01);
}

/* Brushed snare */
function playBrushSnare(time) {
  if (!noiseBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.04, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  src.connect(hp); hp.connect(g); g.connect(masterGain);
  src.start(time); src.stop(time + 0.09);
}

/* Vinyl crackle */
let vinylLoop = null;
function startVinylCrackle() {
  if (vinylLoop || !noiseBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 800;
  const g = audioCtx.createGain();
  g.gain.value = 0.015;
  src.loop = true;
  src.connect(lp); lp.connect(g); g.connect(masterGain);
  src.start();
  vinylLoop = src;
}

function stopVinylCrackle() {
  if (vinylLoop) { vinylLoop.stop(); vinylLoop = null; }
}

/* Chord progressions for chillhop */
const CHILLHOP_CHORDS = [
  [261.63, 329.63, 392.00],  // C
  [293.66, 349.23, 440.00],   // D
  [329.63, 392.00, 493.88],  // E
  [220.00, 261.63, 329.63], // A
];
let chillhopChordIdx = 0;

function scheduleChillhopBeat() {
  if (state !== STATE.BREAK) return;
  const t = audioCtx.currentTime;

  if (chillhopBeat % 4 === 0) {
    const chord = CHILLHOP_CHORDS[chillhopChordIdx % CHILLHOP_CHORDS.length];
    chord.forEach(f => playPianoNote(f, t, chillhopInterval_ms * 3 / 1000));
    chillhopChordIdx++;
  }
  if (chillhopBeat % 2 === 1) playBrushSnare(t);
  if (chillhopBeat % 2 === 0) {
    playKick(t);
  }
  playHihat(t, chillhopBeat % 4 === 2);

  chillhopBeat++;
}

function startChillhop() {
  if (chillhopScheduled) return;
  chillhopScheduled = true;
  chillhopBeat = 0;
  chillhopChordIdx = 0;
  startVinylCrackle();
  chillhopTimerID = setInterval(scheduleChillhopBeat, chillhopInterval_ms);
}

function stopChillhop() {
  chillhopScheduled = false;
  stopVinylCrackle();
  if (chillhopTimerID) { clearInterval(chillhopTimerID); chillhopTimerID = null; }
}

/* ────────────────────── SEQUENCER (main drum machine) ────────────────────── */
let sequencerBeat = 0;
let sequencerTime = 0;
let nextStepTime = 0;
let sequencerRunning = false;
let scheduleAheadTime = 0.1;
let sequencerIntervalID = null;

function scheduleNote(stepIndex, time) {
  const beatInMeasure = Math.floor(stepIndex / 3); // 0-3
  const subIndex = stepIndex % 3;

  // Kick on beats 0 and 2 (subdivision 0 each)
  if (beatInMeasure === 0 && subIndex === 0) {
    playKick(time);
    playKickRef(time);
  }
  // Snare on beats 1 and 3
  if (beatInMeasure === 1 && subIndex === 0) playSnare(time);
  if (beatInMeasure === 3 && subIndex === 0) playSnare(time);
  // Hi-hat on every step, open on certain steps
  playHihat(time, (stepIndex % 6 === 5));

  // Visual grid pulse
  pulseGridCell(stepIndex % 12, time);
}

function sequencerTick() {
  while (nextStepTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(sequencerBeat % 12, nextStepTime);
    nextStepTime += STEP_INTERVAL;
    sequencerBeat++;
  }
}

function startSequencer() {
  if (sequencerRunning) return;
  sequencerRunning = true;
  sequencerBeat = 0;
  nextStepTime = audioCtx.currentTime + 0.05;
  sequencerIntervalID = setInterval(sequencerTick, 25);
}

function stopSequencer() {
  sequencerRunning = false;
  if (sequencerIntervalID) { clearInterval(sequencerIntervalID); sequencerIntervalID = null; }
}

/* ────────────────────── GRID VISUALS ────────────────────── */
const gridCells = document.querySelectorAll('.grid-cell');

function pulseGridCell(col, time) {
  // Schedule visual pulse
  const delay = Math.max(0, (time - audioCtx.currentTime) * 1000);
  setTimeout(() => {
    if (col >= 0 && col < gridCells.length) {
      const c = gridCells[col];
      c.classList.add('pulse');
      // Beat markers
      c.classList.remove('beat-1', 'beat-2', 'beat-3', 'beat-4');
      const beat = Math.floor(col / 3);
      c.classList.add('beat-' + (beat + 1));
      setTimeout(() => c.classList.remove('pulse'), 150);
    }
  }, delay);
}

/* ────────────────────── ESPRESSO MACHINE (canvas) ────────────────────── */
const espressoCanvas = document.getElementById('espresso-canvas');
const espressoCtx = espressoCanvas.getContext('2d');
espressoCanvas.width = 220;
espressoCanvas.height = 280;

let steamParticles = [];
const MAX_STEAM = 60;

class SteamParticle {
  constructor(x, y, speed, drift) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * drift;
    this.vy = -speed * (0.5 + Math.random() * 0.5);
    this.life = 1;
    this.maxLife = 40 + Math.random() * 40;
    this.age = 0;
    this.size = 3 + Math.random() * 5;
  }
  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx += (Math.random() - 0.5) * 0.15;
    this.age++;
    this.life = 1 - this.age / this.maxLife;
    this.size *= 1.008;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = this.life * 0.4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    if (state === STATE.BREAK) {
      grad.addColorStop(0, `rgba(255, 180, 120, ${alpha})`);
      grad.addColorStop(1, `rgba(255, 180, 120, 0)`);
    } else if (state === STATE.LOCKED) {
      grad.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
      grad.addColorStop(1, `rgba(255, 215, 0, 0)`);
    } else {
      grad.addColorStop(0, `rgba(200, 220, 220, ${alpha})`);
      grad.addColorStop(1, `rgba(200, 220, 220, 0)`);
    }
    ctx.fillStyle = grad;
    ctx.fill();
  }
  get dead() { return this.life <= 0; }
}

function drawEspressoMachine(now) {
  const ctx = espressoCtx;
  const W = espressoCanvas.width, H = espressoCanvas.height;
  ctx.clearRect(0, 0, W, H);

  const isLocked = state === STATE.LOCKED;
  const isBreak  = state === STATE.BREAK;
  const bodyColor = isBreak ? '#b87333' : (isLocked ? '#d4a04a' : '#8b6914');
  const topColor  = isBreak ? '#d4956a' : (isLocked ? '#ffd700' : '#a07828');

  /* Copper cylinder body */
  const bx = 50, by = 100, bw = 120, bh = 140;
  const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
  grad.addColorStop(0, '#5a3810');
  grad.addColorStop(0.3, bodyColor);
  grad.addColorStop(0.7, bodyColor);
  grad.addColorStop(1, '#3a2510');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();

  /* Top / spout */
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.ellipse(110, by, 50, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Portafilter handle */
  ctx.strokeStyle = topColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(175, 170);
  ctx.lineTo(200, 195);
  ctx.stroke();

  /* Cup */
  ctx.fillStyle = '#e8e0d8';
  ctx.beginPath();
  ctx.roundRect(85, 248, 50, 16, [0, 0, 4, 4]);
  ctx.fill();

  /* Extraction stream (pulsing) */
  const pulse = Math.sin(now * 8) * 0.3 + 0.7;
  if (state !== STATE.BREAK) {
    const streamAlpha = pulse * 0.8;
    ctx.strokeStyle = `rgba(160, 80, 20, ${streamAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, 112);
    ctx.quadraticCurveTo(110 + Math.sin(now * 12) * 3, 180, 110, 248);
    ctx.stroke();
  }

  /* Steam */
  if (steamParticles.length < MAX_STEAM) {
    const spawnRate = isBreak ? 0.6 : (isLocked ? 0.4 : 0.25);
    if (Math.random() < spawnRate) {
      steamParticles.push(new SteamParticle(
        100 + Math.random() * 20,
        90,
        0.3 + Math.random() * 0.4,
        isLocked ? 0.3 : 0.8
      ));
    }
  }
}

/* ────────────────────── OSCILLOSCOPE ────────────────────── */
const oscCanvas = document.getElementById('oscilloscope');
const oscCtx = oscCanvas.getContext('2d');
oscCanvas.width = 500;
oscCanvas.height = 60;

let oscBuffer = new Float32Array(256);
let oscWriteIdx = 0;

function getOscilloscopeData() {
  // Simulate waveform from current knob settings
  const freqRatio = knobFreq / TARGET_FREQ;
  const phase = (performance.now() / 1000) * freqRatio * 2 * Math.PI;
  const val = Math.sin(phase) * 0.6 +
              Math.sin(phase * 2.5) * 0.2 +
              Math.sin(phase * 0.5) * 0.2;
  oscBuffer[oscWriteIdx % oscBuffer.length] = val;
  oscWriteIdx++;
  return oscBuffer;
}

function drawOscilloscope() {
  const W = oscCanvas.width, H = oscCanvas.height;
  oscCtx.clearRect(0, 0, W, H);

  getOscilloscopeData();

  const color = state === STATE.BREAK ? '#ff8c69' :
                state === STATE.LOCKED ? '#ffd700' : '#00ffcc';

  oscCtx.strokeStyle = color;
  oscCtx.lineWidth = 1.5;
  oscCtx.shadowColor = color;
  oscCtx.shadowBlur = 4;
  oscCtx.beginPath();
  const step = W / oscBuffer.length;
  for (let i = 0; i < oscBuffer.length; i++) {
    const x = i * step;
    const y = H / 2 + oscBuffer[i] * (H / 2 - 4);
    if (i === 0) oscCtx.moveTo(x, y);
    else oscCtx.lineTo(x, y);
  }
  oscCtx.stroke();
  oscCtx.shadowBlur = 0;
}

/* ────────────────────── KNOB SYSTEM ────────────────────── */
let knobFreq  = 110;   // 40 – 220 Hz
let knobAtk   = 50;    // 10 – 150 ms
let knobClamp = 30;    // 0 – 100

const knobConfig = [
  { id: 'knob-freq',  val: () => knobFreq,  min: 40,  max: 220,  display: 'freq-val',  decimal: false },
  { id: 'knob-atk',   val: () => knobAtk,   min: 10,  max: 150,  display: 'atk-val',   decimal: false },
  { id: 'knob-clamp', val: () => knobClamp, min: 0,   max: 100,  display: 'clamp-val', decimal: false },
];

function drawKnob(canvasId, value, min, max) {
  const c = document.getElementById(canvasId);
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2, r = 38;
  const norm = (value - min) / (max - min);
  const startAngle = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const endAngle = startAngle + norm * sweep;

  /* Track arc */
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 255, 204, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
  ctx.stroke();

  /* Value arc */
  const arcCol = state === STATE.BREAK ? '#ff8c69' :
                 state === STATE.LOCKED ? '#ffd700' : '#00ffcc';
  ctx.strokeStyle = arcCol;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.shadowColor = arcCol;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.stroke();
  ctx.shadowBlur = 0;

  /* Indicator needle */
  const needleAngle = endAngle;
  const nx = cx + Math.cos(needleAngle) * (r - 8);
  const ny = cy + Math.sin(needleAngle) * (r - 8);
  ctx.fillStyle = arcCol;
  ctx.beginPath();
  ctx.arc(nx, ny, 3, 0, Math.PI * 2);
  ctx.fill();

  /* Center dot */
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
}

function setupKnobInteraction(cfg) {
  const canvas = document.getElementById(cfg.id);
  let dragging = false;
  let startY = 0;
  let startVal = 0;

  canvas.addEventListener('mousedown', e => {
    dragging = true;
    startY = e.clientY;
    startVal = cfg.val();
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = startY - e.clientY;
    const range = cfg.max - cfg.min;
    let newVal = startVal + delta * (range / 150);
    newVal = Math.max(cfg.min, Math.min(cfg.max, newVal));
    newVal = Math.round(newVal);
    if (newVal !== cfg.val()) {
      if (cfg.id === 'knob-freq') knobFreq = newVal;
      else if (cfg.id === 'knob-atk') knobAtk = newVal;
      else knobClamp = newVal;
      document.getElementById(cfg.display).textContent = newVal;
      playKnobClick();
    }
  });

  window.addEventListener('mouseup', () => { dragging = false; });
}

knobConfig.forEach(cfg => setupKnobInteraction(cfg));

/* ────────────────────── SYNC METER LOGIC ────────────────────── */
let syncPercent = 0;
let driftAccum = 0;
let highSyncBeats = 0;              // consecutive beats ≥ 92%
let shipProgress  = 0;               // 0-1
let driftWarningShown = false;

function computeSync() {
  /* Sync is based on how close knobs are to target values */
  const freqDist = Math.abs(knobFreq - TARGET_FREQ) / (220 - TARGET_FREQ);
  const atkDist  = Math.abs(knobAtk - TARGET_ATTACK) / 140;
  const clampDist = Math.abs(knobClamp - TARGET_CLAMP) / 100;

  /* Weighted — frequency is most important */
  const raw = 1 - (freqDist * 0.5 + atkDist * 0.3 + clampDist * 0.2);
  return Math.max(0, Math.min(1, raw));
}

function updateSync() {
  syncPercent = computeSync();
  const pct = Math.round(syncPercent * 100);
  document.getElementById('sync-value').textContent = pct;

  /* Sync meter fill */
  document.getElementById('sync-meter-fill').style.width = pct + '%';

  /* Drift logic */
  if (syncPercent < DRIFT_THRESHOLD) {
    driftAccum += 0.02;
    if (!driftWarningShown) {
      driftWarningShown = true;
      document.getElementById('drift-warning').classList.remove('hidden');
      playDriftWarning();
    }
  } else {
    driftAccum = Math.max(0, driftAccum - 0.005);
    if (driftWarningShown) {
      driftWarningShown = false;
      document.getElementById('drift-warning').classList.add('hidden');
    }
  }

  /* High-sync beat tracking — check on each step */
  if (syncPercent >= SYNC_THRESHOLD) {
    highSyncBeats++;
  } else {
    highSyncBeats = 0;
  }

  /* Ship progress */
  if (highSyncBeats >= CLAMP_BEATS) {
    shipProgress = Math.min(1, shipProgress + 0.02);
    if (shipProgress >= 1 && state === STATE.GRID) {
      state = STATE.LOCKED;
      onStateLocked();
    }
  } else {
    shipProgress = Math.max(0, shipProgress - 0.003);
  }
  document.getElementById('ship-bar-fill').style.width = (shipProgress * 100) + '%';

  if (shipProgress >= 1 && state === STATE.LOCKED) {
    document.getElementById('ship-btn').disabled = false;
  } else {
    document.getElementById('ship-btn').disabled = true;
  }

  /* Update audio mix based on sync */
  updateAudioMix();
}

function updateAudioMix() {
  if (!lowpassFilter) return;
  /* Better sync = filter opens, reverb shortens, stereo widens */
  const s = syncPercent;
  lowpassFilter.frequency.value = 1500 + s * 8000;
  stereoWiden.pan.value = (s - 0.5) * 1.5;
  compressor.ratio.value = 6 - s * 4;
}

/* ────────────────────── STATE TRANSITIONS ────────────────────── */
function onStateLocked() {
  document.getElementById('state-label').textContent = 'LOCKED';
  document.getElementById('state-label').classList.add('locked');
  document.getElementById('grid-overlay').classList.add('locked');
  document.getElementById('main-grid').classList.add('locked');
  playClampThud();
  playSuccessChime();
  playShipTone(shipProgress > 0.5 ? 3 : 0);
}

function onShipClick() {
  if (state !== STATE.LOCKED) return;
  state = STATE.BREAK;
  playClockOutChime();

  /* Transition UI */
  document.getElementById('state-label').textContent = 'BREAK';
  document.getElementById('state-label').classList.remove('locked');
  document.getElementById('state-label').classList.add('break');
  document.getElementById('grid-overlay').classList.remove('locked');
  document.getElementById('grid-overlay').classList.add('break');
  document.getElementById('drift-warning').classList.add('hidden');

  /* Show break room */
  const br = document.getElementById('breakroom');
  br.classList.remove('hidden');

  /* Stop drum sequencer, start chillhop */
  stopSequencer();
  stopLeadOscillator();
  setTimeout(() => startChillhop(), 800);
}

function onReset() {
  state = STATE.GRID;
  knobFreq = 110; knobAtk = 50; knobClamp = 30;
  document.getElementById('freq-val').textContent = knobFreq;
  document.getElementById('atk-val').textContent = knobAtk;
  document.getElementById('clamp-val').textContent = knobClamp;
  syncPercent = 0;
  driftAccum = 0;
  highSyncBeats = 0;
  shipProgress = 0;
  driftWarningShown = false;
  steamParticles = [];

  document.getElementById('state-label').textContent = 'GRID';
  document.getElementById('state-label').classList.remove('locked', 'break');
  document.getElementById('grid-overlay').classList.remove('locked', 'break');
  document.getElementById('main-grid').classList.remove('locked');
  document.getElementById('drift-warning').classList.add('hidden');
  document.getElementById('breakroom').classList.add('hidden');
  document.getElementById('ship-btn').disabled = true;

  /* Restart main sequencer */
  stopSequencer();
  stopChillhop();
  setTimeout(() => {
    startSequencer();
    startLeadOscillator();
  }, 200);
}

document.getElementById('ship-btn').addEventListener('click', onShipClick);
document.getElementById('reset-btn').addEventListener('click', onReset);

/* ────────────────────── BREAK ROOM CANVAS ────────────────────── */
const breakCanvas = document.getElementById('breakroom-canvas');
const breakCtx = breakCanvas.getContext('2d');
let breakParticles = [];

class BreakParticle {
  constructor(W, H) {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -0.2 - Math.random() * 0.4;
    this.size = 2 + Math.random() * 6;
    this.alpha = 0.1 + Math.random() * 0.3;
    this.hue = 20 + Math.random() * 40;
  }
  update(W, H) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -10) { this.y = H + 10; this.x = Math.random() * W; }
    if (this.x < -10) this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${this.alpha})`;
    ctx.fill();
  }
}

function updateBreakRoom(ts) {
  breakCanvas.width = window.innerWidth;
  breakCanvas.height = window.innerHeight;
  const W = breakCanvas.width, H = breakCanvas.height;

  /* Warm gradient background draw */
  const bg = breakCtx.createRadialGradient(W / 2, H * 0.6, 50, W / 2, H * 0.6, W * 0.8);
  bg.addColorStop(0, 'rgba(61, 31, 0, 1)');
  bg.addColorStop(0.6, 'rgba(26, 10, 0, 1)');
  bg.addColorStop(1, 'rgba(10, 5, 0, 1)');
  breakCtx.fillStyle = bg;
  breakCtx.fillRect(0, 0, W, H);

  /* Floating particles */
  if (breakParticles.length < 50) {
    breakParticles.push(new BreakParticle(W, H));
  }
  breakParticles.forEach(p => { p.update(W, H); p.draw(breakCtx); });
}

/* ────────────────────── MAIN LOOP (fixed timestep accumulator) ────────────────────── */
let accumulator = 0;
let lastTime = 0;
let frameCount = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (!lastTime) { lastTime = timestamp; return; }
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  if (state === STATE.BREAK) {
    updateBreakRoom(timestamp);
    drawOscilloscope();
    knobConfig.forEach(cfg => drawKnob(cfg.id, cfg.val(), cfg.min, cfg.max));
    return;
  }
  accumulator += dt;

  while (accumulator >= FIXED_DT) {
    /* Update */
    updateSync();
    drawEspressoMachine(timestamp / 1000);

    /* Update steam particles */
    steamParticles.forEach(p => p.update(FIXED_DT));
    steamParticles = steamParticles.filter(p => !p.dead);

    accumulator -= FIXED_DT;
    frameCount++;
  }

  /* Render (interpolated) */
  drawOscilloscope();
  knobConfig.forEach(cfg => drawKnob(cfg.id, cfg.val(), cfg.min, cfg.max));
}

/* ────────────────────── START / INIT ────────────────────── */
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-overlay').classList.add('hidden');
  initAudio();
  noiseBuffer = createNoiseBuffer();
  startSequencer();
  startLeadOscillator();
});

/* ────────────────────── BOOT ────────────────────── */
requestAnimationFrame(gameLoop);
