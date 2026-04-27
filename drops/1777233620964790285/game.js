// ─── Grid Fracture Drop Engine Core ───

(() => {
  "use strict";

  // ─── State Machine ───
  const State = Object.freeze({
    STANDBY: "standby",
    LOCKED: "locked",
    STRESSING: "stressing",
    FRACTURING: "fracturing",
  });

   let state = State.STANDBY;
   let fractureScale = 1;
   let stressLevel = 0;
   let breathPhase = 0;
   const bodyEl = document.body;

  // ─── Canvas & Grid ───
  const canvas = document.getElementById("grid-canvas");
  const ctx = canvas.getContext("2d");
  let W = 0,
    H = 0;

  const COLS = 16;
  const ROWS = 32;
  let cellW = 0,
    cellH = 0;

  // Grid cell offsets for fracture displacement
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = { ox: 0, oy: 0, vx: 0, vy: 0 };
    }
  }

  // Fibonacci spacing constants (px at 1920 base, scale with clamp)
  const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34];

  // ─── Helmet / Status DOM refs ───
  const helmet = document.getElementById("helmet");
  const statusEl = document.getElementById("status");
  const btnLock = document.getElementById("btn-lock");
  const btnStress = document.getElementById("btn-stress");
  const btnFracture = document.getElementById("btn-fracture");

  function updateState(next) {
    state = next;
    statusEl.textContent = `GRID ${next.toUpperCase()}`;

    btnLock.disabled = state === State.LOCKED;
    btnStress.disabled = state !== State.LOCKED;
    btnFracture.disabled = state !== State.STRESSING;

    bodyEl.classList.toggle("fracturing", next === State.FRACTURING);
    }

  // ─── Audio Kernel ───
  let audioCtx = null;
  let sawtooth = null;
  let sawGain = null;
  let syncOsc = null;
  let syncGain = null;
  let kickNode = null;
  let noiseBuffer = null;
  let masterGain = null;

  const BPM = 128;
  const BEAT_DUR = 60 / BPM; // seconds per beat

  // Hard-sync scheduling
  let scheduleTimer = null;
  let nextBeatTime = 0;
  let beatIndex = 0;

  // Fracture callback scheduling
  let fractureScheduled = false;
  let fractureCallback = null;
  let fractureSliceEls = [];
  let fractureActive = false;

  // ─── Audio init ───
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(audioCtx.destination);

    // Sawtooth "breath" oscillator (held during lock)
    sawtooth = audioCtx.createOscillator();
    sawtooth.type = "sawtooth";
    sawtooth.frequency.value = 55; // A1

    sawGain = audioCtx.createGain();
    sawGain.gain.value = 0;

    sawtooth.connect(sawGain);
    sawGain.connect(masterGain);

    // Hard-sync trigger oscillator (pulses on kick)
    syncOsc = audioCtx.createOscillator();
    syncOsc.type = "square";
    syncOsc.frequency.value = 110;

    syncGain = audioCtx.createGain();
    syncGain.gain.value = 0;

    syncOsc.connect(syncGain);
    syncGain.connect(masterGain);

    sawtooth.start();
    syncOsc.start();

    // Noise buffer for fracture kick
    const sr = audioCtx.sampleRate;
    const len = Math.floor(sr * 0.5);
    noiseBuffer = audioCtx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = noiseBuffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.1));
      }
    }
  }

  // ─── Kick synthesis ───
  function triggerKick(time) {
    // Sub bass kick
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.8, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.35);

    // Hard-sync pulse on the 4/4 downbeat
    syncGain.gain.setValueAtTime(0.15, time);
    syncGain.gain.exponentialRampToValueAtTime(0.001, time + BEAT_DUR * 0.6);

      // Visual callback: helmet pulse on kick
    const beatDelay = (time - audioCtx.currentTime) * 1000;
    setTimeout(() => pulseHelmet(), Math.max(0, beatDelay));

      // Fracture noise burst on downbeat when fracturing
    if (fractureActive && noiseBuffer) {
      const src2 = audioCtx.createBufferSource();
      src2.buffer = noiseBuffer;
      const g2 = audioCtx.createGain();
      g2.gain.setValueAtTime(0.4, time);
      g2.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      src2.connect(g2);
      g2.connect(masterGain);
      src2.start(time);
     }
  }

  // ─── Schedule beats ───
  function startScheduling() {
    nextBeatTime = audioCtx.currentTime + 0.05;
    beatIndex = 0;

    function scheduler() {
      while (nextBeatTime < audioCtx.currentTime + 0.1) {
        if (state === State.LOCKED || state === State.STRESSING) {
          // Kick on every beat
          triggerKick(nextBeatTime);
        }

        // Schedule fracture callback on downbeat (every 4th beat)
        if (fractureScheduled && (beatIndex % 4 === 0)) {
          const dt = (nextBeatTime - audioCtx.currentTime) * 1000;
          setTimeout(() => {
            if (fractureCallback) {
              fractureCallback();
            }
            fractureScheduled = false;
            fractureCallback = null;
          }, Math.max(0, dt));
        }

        nextBeatTime += BEAT_DUR;
        beatIndex++;
      }
      if (state !== State.STANDBY) {
        scheduleTimer = setTimeout(scheduler, 25);
      }
    }
    scheduler();
  }

  function stopScheduling() {
    if (scheduleTimer) {
      clearTimeout(scheduleTimer);
      scheduleTimer = null;
    }
    fractureScheduled = false;
    fractureCallback = null;
  }

  // ─── Helmet pulse ───
  function pulseHelmet() {
    helmet.classList.remove("pulse");
    void helmet.offsetWidth; // reflow
    helmet.classList.add("pulse");
  }

  // ─── Stress audio modulation ───
  function applyStressAudio(level) {
    if (!audioCtx || !sawtooth) return;
    const freq = 55 + level * 30;
    sawtooth.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.08);
    sawGain.gain.setTargetAtTime(0.12 + level * 0.06, audioCtx.currentTime, 0.08);
  }

  // ─── Resizing ───
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    cellW = W / COLS;
    cellH = H / ROWS;
  }
  window.addEventListener("resize", resize);
  resize();

  // ─── Boundary Clamp ───
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // ─── Render Loop ───
   let lastTime = 0;

   function renderLoop(now) {
    requestAnimationFrame(renderLoop);

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

     // ─── Clamp feedback path BEFORE any render ───
    // Prevents aliasing and ensures visual callback fires exactly on buffer flush
    fractureScale = clamp(fractureScale, 1, 1.08);
    stressLevel = clamp(stressLevel, 0, 1);

     // Breathing phase (slow oscillation)
    if (state === State.LOCKED || state === State.STRESSING) {
      breathPhase += dt * (0.6 + stressLevel * 1.2);
     }

     // Fracture breathing: accelerated phase
    if (state === State.FRACTURING) {
      breathPhase += dt * 2.4;
      // Fracture velocity decay for controlled chaos
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = grid[r][c];
          cell.vx *= 0.985;
          cell.vy *= 0.985;
           // Clamp feedback: hard boundary to prevent aliasing
          cell.ox = clamp(cell.ox, -FIB[7], FIB[7]);
          cell.oy = clamp(cell.oy, -FIB[7], FIB[7]);
          cell.ox += cell.vx * dt * 60;
          cell.oy += cell.vy * dt * 60;
           // Re-clamp after integration
          cell.ox = clamp(cell.ox, -FIB[7], FIB[7]);
          cell.oy = clamp(cell.oy, -FIB[7], FIB[7]);
          }
        }
       }

     // ─── Grid cell physics ───
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];

          // Skip during fracture (handled above for velocity decay)
        if (state === State.FRACTURING) continue;

          // Center gravity for snap-back
        cell.vx += -cell.ox * 6 * dt;
        cell.vy += -cell.oy * 6 * dt;

          // Damping
        const damping = state === State.FRACTURING ? 0.92 : 0.85;
        cell.vx *= damping;
        cell.vy *= damping;

          // Breathing displacement
        if (state === State.LOCKED || state === State.STRESSING) {
          const breatheAmp = FIB[4] * (0.5 + stressLevel * 0.5);
          const bx = Math.sin(breathPhase + c * 0.3) * breatheAmp * dt;
          const by = Math.cos(breathPhase + r * 0.3) * breatheAmp * dt;
          cell.vx += bx;
          cell.vy += by;
          }

          // Update position
        cell.ox += cell.vx * dt * 60;
        cell.oy += cell.vy * dt * 60;

          // Boundary clamp: prevent aliasing / unanchored drift
        const maxDrift = FIB[7] / fractureScale || FIB[7];
        cell.ox = clamp(cell.ox, -maxDrift, maxDrift);
        cell.oy = clamp(cell.oy, -maxDrift, maxDrift);
        }
      }

    // ─── CSS var for fracture scale ───
    document.documentElement.style.setProperty("--grid-fracture-scale", fractureScale.toFixed(3));

    // Canvas transform for overall fracture scale
    const canvasScale = fractureScale * (1 + Math.sin(breathPhase * 2) * 0.003 * stressLevel);
    canvas.style.transform = `scale(${canvasScale.toFixed(4)})`;

    // ─── Draw grid ───
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle =
      state === State.FRACTURING
        ? "var(--grid-fractured)"
        : state === State.STRESSING
        ? "rgba(255, 42, 95, 0.12)"
        : state === State.LOCKED
        ? "rgba(255, 42, 95, 0.08)"
        : "rgba(255, 255, 255, 0.06)";

    ctx.lineWidth = FIB[0];

    // Verticals
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      for (let r = 0; r <= ROWS; r++) {
        const x = c * cellW + (grid[Math.min(r, ROWS - 1)][c].ox || 0);
        const y = r * cellH + (grid[Math.min(r, ROWS - 1)][c].oy || 0);
        if (!r) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Horizontals
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      for (let c = 0; c <= COLS; c++) {
        const x = c * cellW + (grid[r][c].ox || 0);
        const y = r * cellH + (grid[r][c].oy || 0);
        if (!c) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Accent nodes on intersections during fracture
    if (state === State.FRACTURING) {
      ctx.fillStyle = "#ff2a5f";
      for (let r = 0; r < ROWS; r += 4) {
        for (let c = 0; c < COLS; c += 4) {
          const cell = grid[r][c];
          const mag = Math.sqrt(cell.ox * cell.ox + cell.oy * cell.oy);
          if (mag > 2) {
            const sz = clamp(mag * 0.15, 1, FIB[5]);
            ctx.beginPath();
            ctx.arc(
              c * cellW + cell.ox,
              r * cellH + cell.oy,
              sz,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
    }
  }

    // ─── Fracture-slice DOM generation ───
  function createFractureSlices() {
    // Tear out old slices
    fractureSliceEls.forEach(el => el.remove());
    fractureSliceEls = [];
    // Build 3-5 slice overlays that will run CSS keyframes
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const slice = document.createElement("div");
      slice.className = "fracture-slice";
      const isHorizontal = Math.random() < 0.5;
      if (isHorizontal) {
        slice.style.top = (Math.random() * 100) + "%";
        slice.style.left = "0";
        slice.style.width = "100vw";
        slice.style.height = (FIB[5] + Math.random() * FIB[8]) + "px";
      } else {
        slice.style.top = "0";
        slice.style.left = (Math.random() * 100) + "%";
        slice.style.width = (FIB[5] + Math.random() * FIB[8]) + "px";
        slice.style.height = "100vh";
      }
      slice.dataset.delay = (i * 0.06).toFixed(3);
      slice.style.animationDelay = `${i * 0.06}s, ${0.3 + i * 0.06}s`;
      slice.style.setProperty("--rand-x", (Math.random() * 100).toFixed(1));
      slice.style.setProperty("--rand-y", (Math.random() * 100).toFixed(1));
      document.body.appendChild(slice);
      fractureSliceEls.push(slice);
    }
  }

  function triggerFracture() {
    updateState(State.FRACTURING);
    helmet.classList.add("active");
    fractureActive = true;

     // Apply chaotic displacement to random cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.45) {
          const cell = grid[r][c];
          cell.vx += (Math.random() - 0.5) * FIB[8];
          cell.vy += (Math.random() - 0.5) * FIB[8];
         }
       }
     }

     // Increase fracture scale
    fractureScale = clamp(fractureScale + 0.03, 1, 1.08);

     // Fracture noise burst
    if (audioCtx && noiseBuffer) {
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuffer;
      const g = audioCtx.createGain();
      g.gain.value = 0.25;
      src.connect(g);
      g.connect(masterGain);
      src.start();
     }

     // Schedule visual callback on next downbeat via hard-sync
    scheduleFractureCallback(() => {
      createFractureSlices();
    });

     // Snap-back after 1.5s
    setTimeout(() => {
      fractureActive = false;
      fractureScale = clamp(fractureScale - 0.015, 0.98, 1.08);
      if (fractureScale <= 1.005) {
        fractureScale = 1;
        updateState(State.STRESSING);
        helmet.classList.remove("active");
        fractureSliceEls.forEach(el => el.remove());
        fractureSliceEls = [];
       }
     }, 1500);
  }

  function scheduleFractureCallback(cb) {
    fractureScheduled = true;
    fractureCallback = cb;
  }

  // ─── Event bindings ───
  btnLock.addEventListener("click", () => {
    initAudio();
    if (audioCtx.state === "suspended") audioCtx.resume();

    updateState(State.LOCKED);
    helmet.classList.add("active");
    sawGain.gain.setTargetAtTime(0.1, audioCtx.currentTime, 0.08);
    startScheduling();
  });

  btnStress.addEventListener("click", () => {
    if (state !== State.LOCKED) return;
    updateState(State.STRESSING);
    stressLevel = clamp(stressLevel + 0.2, 0, 1);
    applyStressAudio(stressLevel);

    // Stress displacement
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.15) {
          const cell = grid[r][c];
          cell.vx += (Math.random() - 0.5) * FIB[5] * stressLevel;
          cell.vy += (Math.random() - 0.5) * FIB[5] * stressLevel;
        }
      }
    }
  });

  btnFracture.addEventListener("click", () => {
    if (state !== State.STRESSING) return;
    triggerFracture();
  });

   // ─── Boot ───
   requestAnimationFrame(renderLoop);
})();
