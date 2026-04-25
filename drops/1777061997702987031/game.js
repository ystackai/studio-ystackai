"use strict";

/* ─── Decision Engine State ─── */
const state = {
  decisionDepth: 0,
  committedCells: new Set(),
  audioCtx: null,
  audioReady: false,
  queue: [],
  lastLatency: null,
};

/* ─── AudioContext singleton with queue fallback ─── */
function ensureAudioContext() {
  if (state.audioCtx && state.audioCtx.state === "running") {
    state.audioReady = true;
    return true;
  }

  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (state.audioCtx.state === "suspended") {
    state.audioReady = false;
    return false;
  }

  state.audioReady = true;
  return true;
}

/* ─── Synthesize consequence tone ─── */
function synthesizeConsequence(constraint, latencyTimestamp) {
  const ctx = state.audioCtx;
  const now = ctx.currentTime;
  const onset = Math.max(now, latencyTimestamp / 1000);

  const depth = state.decisionDepth;
  const baseCutoff = 6000 - depth * 800;
  const cutoff = Math.max(baseCutoff, 200);
  const baseFreq = 220 + depth * 15;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.35, onset);
  gainNode.gain.exponentialRampToValueAtTime(0.001, onset + 0.18);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(cutoff, onset);
  filter.frequency.exponentialRampToValueAtTime(Math.max(cutoff * 0.4, 60), onset + 0.12);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(baseFreq, onset);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, onset + 0.1);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(onset);
  osc.stop(onset + 0.2);

  /* Second layer: transient click */
  const clickOsc = ctx.createOscillator();
  clickOsc.type = "sine";
  clickOsc.frequency.setValueAtTime(3400, onset);
  clickOsc.frequency.exponentialRampToValueAtTime(800, onset + 0.015);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.5, onset);
  clickGain.gain.exponentialRampToValueAtTime(0.001, onset + 0.02);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickOsc.start(onset);
  clickOsc.stop(onset + 0.03);

  measureLatency(latencyTimestamp, onset * 1000);
}

/* ─── Fallback sine burst for suspended context ─── */
function playSineBurst() {
  const ctx = state.audioCtx;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 1000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/* ─── Latency measurement ─── */
function measureLatency(latencyTs, audioOnsetTs) {
  const estimated = audioOnsetTs - latencyTs;
  state.lastLatency = estimated;
  const el = document.getElementById("latency-display");
  if (el) {
    el.textContent = `LATENCY ${estimated.toFixed(1)}ms`;
  }
}

/* ─── SVG Visualizer ─── */
const FIB3 = 21; /* amplitude clamp from CSS --space-fibonacci-3 */

function updateVisualizer() {
  const waveform = document.getElementById("waveform");
  if (!waveform) return;

  const depth = state.decisionDepth;
  const points = [];
  const numBars = 640;
  const baseline = 40;

  for (let i = 0; i <= numBars; i++) {
    const x = i;
    const t = i / numBars;
    const rawAmplitude = Math.exp(-t * 4) * (0.3 + Math.random() * (1 - (depth * 0.07)));
    const clampedAmp = Math.min(rawAmplitude, FIB3 / 40);
    const yOff = clampedAmp * 20 * (Math.random() > 0.5 ? -1 : 1);
    const y = Math.max(0, Math.min(80, baseline + yOff));
    points.push(`${x},${y.toFixed(1)}`);
  }

  waveform.setAttribute("points", points.join(" "));
}

/* ─── Grid construction ─── */
const GRID_SIZE = 16;

function buildGrid() {
  const grid = document.getElementById("grid");
  if (!grid) return;

  for (let i = 0; i < GRID_SIZE; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;

    cell.addEventListener("pointerdown", handleCellPointerdown, { passive: false });
    grid.appendChild(cell);
  }
}

/* ─── pointerdown handler ─── */
function handleCellPointerdown(e) {
  e.preventDefault();
  const cell = e.currentTarget;
  const cellIndex = parseInt(cell.dataset.index, 10);
  const tsOnset = performance.now();

  /* Prevent re-committing the same cell */
  if (state.committedCells.has(cellIndex)) return;

  /* Attempt to get a running AudioContext */
  const ready = ensureAudioContext();

  if (!ready && state.audioCtx && state.audioCtx.state === "suspended") {
    /* Queue this event for resume */
    state.queue.push({ cellIndex, ts: tsOnset });
    cell.classList.add("active");
    return;
  }

  /* If context is running, try to flush queue first */
  if (ready && state.queue.length > 0) {
    state.audioCtx.resume().then(() => {
      while (state.queue.length > 0) {
        const queued = state.queue.shift();
        processDecision(queued.cellIndex, queued.ts);
      }
    });
  }

  processDecision(cellIndex, tsOnset);
}

/* ─── Commit a single decision ─── */
function processDecision(cellIndex, tsOnset) {
  const grid = document.getElementById("grid");
  const cells = grid.children;
  const cell = cells[cellIndex];

  /* Increment decision depth */
  state.decisionDepth++;
  state.committedCells.add(cellIndex);

  /* Update depth display */
  const depthEl = document.getElementById("depth-display");
  if (depthEl) {
    depthEl.textContent = state.decisionDepth;
  }

  /* Visual snap on cell */
  cell.classList.add("active");
  requestAnimationFrame(() => {
    cell.classList.remove("active");
    cell.classList.add("committed");
  });

  /* Audio consequence */
  if (state.audioCtx && state.audioCtx.state === "running") {
    synthesizeConsequence(null, tsOnset);
    if (state.queue.length > 0) {
      state.queue.forEach((q) => {
        if (!state.committedCells.has(q.cellIndex)) {
          /* Will be committed via pointerdown re-entry */
        } else {
          playSineBurst();
        }
      });
      state.queue.length = 0;
    }
  } else if (state.audioCtx && state.audioCtx.state === "suspended") {
    /* Context is suspended, play fallback sine burst through queue */
    playSineBurst();
  }

  /* SVG visualizer update */
  updateVisualizer();
}

/* ─── Initialization ─── */
function init() {
  buildGrid();
  updateVisualizer();
  ensureAudioContext();
}

document.addEventListener("DOMContentLoaded", init);
