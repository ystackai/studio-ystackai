// Break Room — 12-Column Grid & Audio-Reactive Loop
// Drop ID: 1777385412501309708

/* ─────────────────────────────────────
   State
   ───────────────────────────────────── */
const DRIFT_THRESHOLD = 0.3; // Hard threshold — 0.3s is failure
const BEAT_HOLD_REWARD = 8; // 8-beat hold unlocks ship bar
const LOOP_DURATION = 28000; // 28s loop in ms
const BPM = 120;
const beatInterval = 60000 / BPM; // 500ms per beat

let audioCtx = null;
let isHolding = false;
let holdStart = 0;
let currentBeat = 0;
let beatsHeld = 0;
let loopTimer = null;
let beatIntervalId = null;
let unlocked = false;

/* ─────────────────────────────────────
   DOM refs
   ───────────────────────────────────── */
const gridOverlay = document.getElementById('grid-overlay');
const espressoPanel = document.getElementById('espresso-panel');
const extractionTimer = document.getElementById('extraction-timer');
const driftFill = document.getElementById('drift-fill');
const beatDots = document.querySelectorAll('.beat-dot');
const espressoStatus = document.getElementById('espresso-status');
const karaokePanel = document.getElementById('karaoke-panel');
const micIcon = karaokePanel.querySelector('.mic-icon');
const karaokeStatus = document.getElementById('karaoke-status');
const snacksPanel = document.getElementById('snacks-panel');
const snackItems = snacksPanel.querySelectorAll('.snack-item');
const shipBar = document.getElementById('ship-bar');
const shipText = document.getElementById('ship-text');
const shipBtn = document.getElementById('ship-btn');

/* ─────────────────────────────────────
   Audio Engine — sawtooth oscillator, custom envelope
   ───────────────────────────────────── */
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSnap() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 220;
  // Custom envelope to kill clicks
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

function playBeatClick(onBeat) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = onBeat ? 330 : 220;
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playEspressoHiss() {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.06;
  }
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 4000;
  filter.Q.value = 0.8;
  src.buffer = buffer;
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.005);
  gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

function playUnlockChime() {
  if (!audioCtx) return;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = audioCtx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.52);
  });
}

function playShipChime() {
  if (!audioCtx) return;
  [440, 554.37, 659.25, 880].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = audioCtx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.62);
  });
}

/* ─────────────────────────────────────
   JB's Clamp Logic — 4 lines, prevents phase drift
   ───────────────────────────────────── */
function clampPhase(elapsed, period) {
  const raw = elapsed % period;
  return Math.max(0, Math.min(raw, period - 0.001));
}

function quantizeToGrid(drift, threshold) {
  return Math.abs(drift) > threshold ? null : Math.round(drift / (beatInterval / 1000)) * (beatInterval / 1000);
}

/* ─────────────────────────────────────
   Visual sync
   ───────────────────────────────────── */
function snapToGrid() {
  gridOverlay.classList.add('visible');
  gridOverlay.classList.remove('pulse');
  void gridOverlay.offsetWidth; // force reflow for snap
  gridOverlay.classList.add('pulse');
  playSnap();
}

function updateBeatDots(beatIndex) {
  beatDots.forEach((dot, i) => {
    dot.classList.remove('active', 'held');
    if (i === beatIndex) {
      dot.classList.add(beatsHeld >= BEAT_HOLD_REWARD ? 'held' : 'active');
    }
  });
}

function updateExtractionTimer(elapsed) {
  extractionTimer.textContent = elapsed.toFixed(2) + 's';
  const drift = Math.abs(elapsed - Math.round(elapsed));
  const pct = Math.min(100, (drift / DRIFT_THRESHOLD) * 100);
  driftFill.style.width = pct + '%';
  driftFill.classList.toggle('drifting', drift > DRIFT_THRESHOLD);
}

function snapPanel(panel) {
  panel.classList.remove('snap');
  void panel.offsetWidth;
  panel.classList.add('snap');
  setTimeout(() => panel.classList.remove('snap'), 150);
}

/* ─────────────────────────────────────
   Hold loop — core interaction
   ───────────────────────────────────── */
function startHold() {
  if (unlocked) return;
  ensureAudio();
  isHolding = true;
  holdStart = performance.now();
  currentBeat = 0;
  beatsHeld = 0;
  espressoStatus.textContent = 'Calibrating...';
  snapToGrid();
  snapPanel(espressoPanel);

  startBeatLoop();
  startExtractionLoop();
}

function stopHold() {
  if (!isHolding) return;
  isHolding = false;
  beatsHeld = 0;

  if (beatIntervalId) {
    clearInterval(beatIntervalId);
    beatIntervalId = null;
  }
  espressoStatus.textContent = beatsHeld >= BEAT_HOLD_REWARD
    ? 'Hold 8 beats to unlock'
    : 'Hold to sync grid';
  gridOverlay.classList.remove('visible', 'pulse');
  updateBeatDots(-1);
}

let extractionRAF = null;
let extractionStart = 0;

function startExtractionLoop() {
  extractionStart = performance.now();
  function tick() {
    if (!isHolding) return;
    const elapsed = (performance.now() - extractionStart) / 1000;

    // Clamp to prevent phase drift
    const clamped = clampPhase(elapsed, LOOP_DURATION / 1000);
    updateExtractionTimer(clamped);

    // Quantize drift check
    const drift = Math.abs(clamped % ((beatInterval * 4) / 1000));
    const quantized = quantizeToGrid(drift, DRIFT_THRESHOLD);

    if (quantized === null) {
      espressoStatus.textContent = 'Drift alert — reset';
      playBeatClick(false);
      return;
    }

    // Play espresso hiss on beat
    playEspressoHiss();
    snapPanel(espressoPanel);

    extractionRAF = requestAnimationFrame(tick);
  }
  tick();
}

function startBeatLoop() {
  if (beatIntervalId) return;
  let beatCount = 0;

  beatIntervalId = setInterval(() => {
    if (!isHolding) return;

    beatCount = (beatCount + 1) % 8;
    updateBeatDots(beatCount);
    playBeatClick(true);

    if (beatCount === 0) {
      beatsHeld++;
      if (beatsHeld >= BEAT_HOLD_REWARD) {
        unlockBreakRoom();
      }
    }

    // Loop restart after 28s
    if (performance.now() - holdStart > LOOP_DURATION) {
      holdStart = performance.now();
      beatsHeld = 0;
    }
  }, beatInterval);
}

function unlockBreakRoom() {
  if (unlocked) return;
  unlocked = true;

  // Karaoke mic drops in
  micIcon.classList.add('active');
  karaokeStatus.textContent = 'Unlocking...';
  setTimeout(() => {
    micIcon.classList.add('snap');
    karaokeStatus.textContent = 'Karaoke live';
  }, 200);

  // Snacks pop in
  snackItems.forEach((item, i) => {
    setTimeout(() => item.classList.add('visible'), i * 150);
  });

  // Ship bar unlocks
  shipText.textContent = "Grid's locked. Sync's shipped. Break room open. First round's on us.";
  shipBtn.disabled = false;

  playUnlockChime();

  // 28s loop has matured
  if (beatIntervalId) {
    clearInterval(beatIntervalId);
    beatIntervalId = null;
  }

  espressoStatus.textContent = 'Loop mature. Break room open.';
}

/* ─────────────────────────────────────
   Ship button
   ───────────────────────────────────── */
function handleShip() {
  if (!unlocked) return;
  playShipChime();
  shipText.textContent = 'Shipped! 🚀';
  snapPanel(espressoPanel);
  snapPanel(karaokePanel);
}

/* ─────────────────────────────────────
   Bind events
   ───────────────────────────────────── */
espressoPanel.addEventListener('mousedown', startHold);
espressoPanel.addEventListener('mouseup', stopHold);
espressoPanel.addEventListener('mouseleave', stopHold);

espressoPanel.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startHold();
});
espressoPanel.addEventListener('touchend', stopHold);
espressoPanel.addEventListener('touchcancel', stopHold);

shipBtn.addEventListener('click', handleShip);
