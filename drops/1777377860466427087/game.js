// === State Machine & Rhythm Engine ===

const STATES = {
  IDLE: 'IDLE',
  CLAMPING: 'CLAMPING',
  HOLDING: 'HOLDING',
  LOCKED: 'LOCKED',
};

let currentState = STATES.IDLE;
let audioCtx = null;
let analyser = null;
let masterGain = null;
let beatCount = 0;
let scheduledBeats = [];
let nextBeatTime = 0;
let isHolding = false;
let holdStartTime = 0;
let animFrameId = null;
let audioInitialized = false;
let metronomeInterval = 0.5; // 120 BPM = 0.5s per beat
let lockThreshold = 8; // 8 beats to lock

// DOM refs
const gridEl = document.getElementById('grid');
const oscillatorEl = document.getElementById('oscillator-node');
const stateLabel = document.getElementById('state-label');
const shipBar = document.getElementById('ship-bar');
const overlayEl = document.getElementById('overlay');

// === Grid Initialization ===
function buildGrid() {
  gridEl.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;
      gridEl.appendChild(cell);
    }
  }
}

buildGrid();

// === Web Audio Initialization ===
function initAudio() {
  if (audioInitialized) return;
  audioInitialized = true;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);
}

// === Sound Synthesis ===

// ADSR envelope for a single beat
function createBeatEnvelope(time, detune = 0) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.value = 110;
  osc.detune.value = detune;

  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 1;

  // ADSR: attack 12ms, decay 60ms, sustain 0, release 40ms
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.6, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.072);
  gain.gain.setValueAtTime(0.001, time + 0.072);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.112);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(time);
  osc.stop(time + 0.12);

  return osc;
}

// Triangle layer on beat 4
function createTriangleLayer(time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.value = 220;

  filter.type = 'lowpass';
  filter.frequency.value = 600;

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.2, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(time);
  osc.stop(time + 0.12);

  return osc;
}

// Tap sound - sine burst 80ms
function playTapSound() {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 800;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 0.09);
}

// Grid snap chime
function playSnapChime() {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 0.16);
}

// Lock chord - bright resolution
function playLockChord() {
  const t = audioCtx.currentTime;
  const freqs = [220, 330, 440, 550];

  freqs.forEach((freq) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

// Espresso extraction whoosh (filtered noise)
function playWhoosh() {
  const t = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.linearRampToValueAtTime(2000, t + 0.2);
  filter.Q.value = 2;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
  gain.gain.linearRampToValueAtTime(0, t + 0.3);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(t);
}

// Fail sweep
function playFailSweep() {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, t);
  filter.frequency.linearRampToValueAtTime(200, t + 0.3);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 0.35);
}

// Haptic feedback
function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// === State Transitions ===

function transitionTo(newState, skipSound = false) {
  const prev = currentState;
  currentState = newState;

  stateLabel.textContent = newState;
  stateLabel.className = newState.toLowerCase();

  oscillatorEl.className = 'oscillator ' + (newState === STATES.CLAMPING ? 'clamping' :
    newState === STATES.HOLDING ? 'holding' :
      newState === STATES.LOCKED ? 'locked' : '');

  switch (newState) {
    case STATES.CLAMPING:
      if (!skipSound) {
        playTapSound();
        setTimeout(() => playSnapChime(), 50);
      }
      vibrate([20]);
      break;
    case STATES.HOLDING:
      scheduleBeatSequence();
      break;
    case STATES.LOCKED:
      playLockChord();
      playWhoosh();
      vibrate([50, 30, 50, 30, 100]);
      shipBar.classList.add('complete');
      showOverlay();
      break;
  }
}

// === Beat Sequencing ===

function scheduleBeatSequence() {
  cancelSequence();

  const bpm = 120;
  const beatDuration = 60 / bpm;
  let time = audioCtx.currentTime + 0.05;

  for (let i = 0; i < lockThreshold * 4; i++) {
    // 4/4 pattern over 8 beats worth of 4/4 measures
    if (i % 4 === 3) {
      createTriangleLayer(time);
    }
    createBeatEnvelope(time);
    scheduledBeats.push({ index: i, time: time });
    time += beatDuration;
  }

  // Visual and drift tracking loop
  if (animFrameId) cancelAnimationFrame(animFrameId);
  runDriftLoop();
}

function cancelSequence() {
  // Clean up scheduled beats
  scheduledBeats = [];
}

let lastVisualBeat = -1;

function runDriftLoop() {
  let lastBeatTime = audioCtx.currentTime;
  let consecutiveBeats = 0;

  function tick() {
    if (currentState !== STATES.HOLDING && currentState !== STATES.LOCKED) {
      return;
    }

    const now = audioCtx.currentTime;

    // Check for next upcoming beat
    const upcoming = scheduledBeats.find((b) => !b.fired && b.time > now - 0.05 && b.time < now + 0.05);

    if (upcoming) {
      upcoming.fired = true;
      consecutiveBeats++;
      beatCount++;

      // Update ship bar
      const progress = Math.min(100, (beatCount / (lockThreshold * 4)) * 100);
      shipBar.style.width = progress + '%';

      // Visual: highlight grid cells per beat
      highlightBeatCell(upcoming.index);

      // Check drift
      const drift = Math.abs(now - upcoming.time);
      if (drift > 0.3) {
        triggerFail();
        return;
      }

      // Check lock condition: 8 consecutive beats within tolerance
      if (consecutiveBeats >= lockThreshold * 4) {
        if (isHolding) {
          transitionTo(STATES.LOCKED);
          shipBar.style.width = '100%';
          return;
        }
      }
    }

    // Rising harmonic stack on 0.3s threshold
    if (consecutiveBeats > 0 && consecutiveBeats % 4 === 0) {
      if (masterGain) {
        masterGain.gain.linearRampToValueAtTime(0.3 + consecutiveBeats * 0.02, audioCtx.currentTime + 0.1);
      }
    }

    if (currentState === STATES.HOLDING) {
      animFrameId = requestAnimationFrame(tick);
    }
  }

  animFrameId = requestAnimationFrame(tick);
}

function highlightBeatCell(beatIndex) {
  const cellIndex = beatIndex % 96; // 12 cols * 8 rows
  const row = Math.floor(cellIndex / 12);
  const col = cellIndex % 12;

  const sel = `.cell[data-row="${row}"][data-col="${col}"]`;
  const cell = gridEl.querySelector(sel);
  if (cell) {
    cell.classList.add('faded');
    setTimeout(() => cell.classList.remove('faded'), 300);
  }
}

// === Fail Handling ===

function triggerFail() {
  playFailSweep();
  gridEl.classList.add('fail-sweep');
  oscillatorEl.classList.add('fail');

  vibrate([100, 50, 100]);

  // Reset
  beatCount = 0;
  shipBar.style.width = '0%';
  shipBar.classList.remove('complete');

  setTimeout(() => {
    gridEl.classList.remove('fail-sweep');
    oscillatorEl.classList.remove('fail');
    transitionTo(STATES.IDLE, true);
    shipBar.style.width = '0%';
  }, 400);
}

// === Overlay ===

function showOverlay() {
  overlayEl.classList.remove('hidden');
}

function hideOverlay() {
  overlayEl.classList.add('hidden');
}

// === Clamp Detection ===

// Grid column quantization - snap tap position to nearest column
function getNearestColumn(clientX) {
  const gridRect = gridEl.getBoundingClientRect();
  const colWidth = gridRect.width / 12;
  const colIndex = Math.round((clientX - gridRect.left) / colWidth);
  return Math.max(0, Math.min(11, colIndex));
}

// === Input Handling ===

// Initialize audio on first user gesture
function ensureAudioInit() {
  if (!audioInitialized) {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
}

// Tap (short press)
oscillatorEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  ensureAudioInit();

  const col = getNearestColumn(e.clientX);
  highlightBeatCell(col);

  if (!isHolding) {
    isHolding = true;
    holdStartTime = audioCtx ? audioCtx.currentTime : 0;
    transitionTo(STATES.CLAMPING);

    // After clamp window (0.3s), move to HOLDING
    setTimeout(() => {
      if (currentState === STATES.CLAMPING) {
        transitionTo(STATES.HOLDING);
      }
    }, 300);
  }
});

// Release / let go
oscillatorEl.addEventListener('pointerup', (e) => {
  e.preventDefault();
  if (isHolding) {
    isHolding = false;
    // If holding duration was too short, reset
    if (audioCtx) {
      const holdDuration = audioCtx.currentTime - holdStartTime;
      if (holdDuration < 0.3 && currentState === STATES.CLAMPING) {
        transitionTo(STATES.IDLE, true);
      }
    }
  }
});

oscillatorEl.addEventListener('pointerleave', (e) => {
  if (isHolding) {
    isHolding = false;
    if (currentState === STATES.CLAMPING) {
      transitionTo(STATES.IDLE, true);
    }
  }
});

// Prevent default on overlay clicks
overlayEl.addEventListener('pointerdown', (e) => e.preventDefault());
overlayEl.addEventListener('pointerup', (e) => {
  hideOverlay();
  beatCount = 0;
  shipBar.style.width = '0%';
  shipBar.classList.remove('complete');
  transitionTo(STATES.IDLE, true);
});

// === Audio-driven metronome (continuous scheduling) ===
let metroIntervalId = null;

function startMetronome() {
  if (metroIntervalId) stopMetronome();

  const beatDuration = metronomeInterval;
  let nextTime = audioCtx.currentTime + 0.05;

  function schedule() {
    while (nextTime < audioCtx.currentTime + 0.2) {
      createBeatEnvelope(nextTime);
      nextTime += beatDuration;
    }

    if (currentState === STATES.HOLDING || currentState === STATES.LOCKED) {
      metroIntervalId = setTimeout(schedule, 100);
    }
  }

  schedule();
}

function stopMetronome() {
  if (metroIntervalId) {
    clearTimeout(metroIntervalId);
    metroIntervalId = null;
  }
}

// Tie metronome to state transitions
const origTransitionTo = transitionTo;
transitionTo = function (newState, skipSound) {
  origTransitionTo(newState, skipSound);

  if (newState === STATES.HOLDING) {
    startMetronome();
  } else if (newState === STATES.IDLE) {
    stopMetronome();
    beatCount = 0;
    shipBar.style.width = '0%';
  } else if (newState === STATES.LOCKED) {
    // Keep metronome running
  }
};

// === Responsive Grid Resize ===
window.addEventListener('resize', () => {
  // Grid is responsive via CSS; no rebuild needed
});
