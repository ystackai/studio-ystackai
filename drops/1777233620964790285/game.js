// ─── Grid Fracture Drop Engine: Hard-Sync Scheduling Loop ───

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
   let fractureDecayTimeout = null;
   const bodyEl = document.body;

   // ─── Canvas & Grid ───
   const canvas = document.getElementById("grid-canvas");
   const ctx = canvas.getContext("2d");
   let W = 0, H = 0;

   const COLS = 16;
   const ROWS = 32;
   let cellW = 0, cellH = 0;

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

    // Button states: Lock only in STANDBY, Stress only in LOCKED, Fracture only in STRESSING
    btnLock.disabled = state !== State.STANDBY;
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
   let noiseBuffer = null;
   let masterGain = null;

   const BPM = 128;
   const BEAT_DUR = 60 / BPM; // 0.46875s per beat at 128 BPM

   // Hard-sync scheduling state
   let scheduleTimer = null;
   let scheduleRunning = false;
   let nextBeatTime = 0;
   let beatIndex = 0;

   // Fracture callback scheduling (synced to downbeat via audio buffer flush)
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
    sawtooth.frequency.value = 55;

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
    // Sub bass kick: pitch sweep 150 -> 40hz, hard-attack
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

    // Hard-sync pulse on every beat
    syncGain.gain.setValueAtTime(0.15, time);
    syncGain.gain.exponentialRampToValueAtTime(
        0.001,
        time + BEAT_DUR * 0.6
    );

    // Sawtooth attack: brief volume spike on kick
    sawGain.gain.setValueAtTime(0.15, time);
    sawGain.gain.linearRampToValueAtTime(
        0.08 + stressLevel * 0.06,
        time + BEAT_DUR * 0.4
    );

    // Visual callback: helmet pulse synced to kick time
    const beatDelayMs = Math.max(0, (time - audioCtx.currentTime) * 1000);
    setTimeout(() => pulseHelmet(), beatDelayMs);

    // Fracture noise burst on downbeat (beat 0 of measure) when active
    if (fractureActive && noiseBuffer && beatIndex % 4 === 0) {
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

   // ─── scheduleLoop: Hard-Sync Scheduling Loop ───
   // Drives sawtooth and kick synthesis on the 128 BPM grid.
   // Schedules beats ~100ms ahead using look-ahead pattern to prevent dropouts.
   function scheduleLoop() {
    if (!scheduleRunning) return;

    const lookAhead = 0.1; // 100ms look-ahead window

    // Drain schedule queue: fill beats up to lookAhead window
    while (nextBeatTime < audioCtx.currentTime + lookAhead) {
     // Kick on every beat for active states
     if (
        state === State.LOCKED ||
        state === State.STRESSING ||
        state === State.FRACTURING
     ) {
      triggerKick(nextBeatTime);
     }

     // Fracture callback fires on downbeat (every 4th beat)
     // Visual callback waits for audio buffer flush — exact 4/4 sync
     if (fractureScheduled && beatIndex % 4 === 0) {
      const delayMs = Math.max(
          0,
          (nextBeatTime - audioCtx.currentTime) * 1000
       );
      const callback = fractureCallback;
      const wasScheduled = fractureScheduled;
      setTimeout(() => {
       if (wasScheduled && callback) {
        callback();
       }
       fractureScheduled = false;
       fractureCallback = null;
      }, delayMs);
     }

     nextBeatTime += BEAT_DUR;
     beatIndex++;
    }

    // Re-schedule next scheduling tick
    scheduleTimer = setTimeout(scheduleLoop, 25);
   }

   function startScheduling() {
    scheduleRunning = true;
    nextBeatTime = audioCtx.currentTime + 0.05;
    beatIndex = 0;
    scheduleLoop();
   }

   function stopScheduling() {
    scheduleRunning = false;
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
    void helmet.offsetWidth; // reflow to restart animation
    helmet.classList.add("pulse");
   }

   // ─── Stress audio modulation ───
   function applyStressAudio(level) {
    if (!audioCtx || !sawtooth) return;
    const freq = 55 + level * 30;
    sawtooth.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.08);
    sawGain.gain.setTargetAtTime(
        0.12 + level * 0.06,
        audioCtx.currentTime,
        0.08
    );
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
   // Wei Lin's clamp: prevents aliasing in feedback path.
   // All values must be clamped before render to guarantee bounded output.
   function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
   }

   // ─── Render Loop ───
   let lastTime = 0;

   function renderLoop(now) {
    requestAnimationFrame(renderLoop);

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // ─── CLAMP FEEDBACK PATH BEFORE RENDER ───
    // Boundary clamp on fractureScale and stressLevel to prevent aliasing
    fractureScale = clamp(fractureScale, 1, 1.08);
    stressLevel = clamp(stressLevel, 0, 1);

    // Breathing phase
    if (state === State.LOCKED || state === State.STRESSING) {
     breathPhase += dt * (0.6 + stressLevel * 1.2);
    }

    // Fracture: accelerated breathing + velocity decay
    if (state === State.FRACTURING) {
     breathPhase += dt * 2.4;

     for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
       const cell = grid[r][c];
       cell.vx *= 0.985;
       cell.vy *= 0.985;

       // Hard boundary clamp: prevent aliasing displacement
       cell.ox = clamp(cell.ox, -FIB[7], FIB[7]);
       cell.oy = clamp(cell.oy, -FIB[7], FIB[7]);

       cell.ox += cell.vx * dt * 60;
       cell.oy += cell.vy * dt * 60;

       // Re-clamp after integration to catch overshoot
       cell.ox = clamp(cell.ox, -FIB[7], FIB[7]);
       cell.oy = clamp(cell.oy, -FIB[7], FIB[7]);
      }
     }
    }

    // ─── Grid cell physics (non-fracture states) ───
    for (let r = 0; r < ROWS; r++) {
     for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];

      if (state === State.FRACTURING) continue;
      if (state === State.STANDBY) continue;

      // Center gravity for snap-back
      cell.vx += -cell.ox * 6 * dt;
      cell.vy += -cell.oy * 6 * dt;

      // Damping
      const damping = 0.85;
      cell.vx *= damping;
      cell.vy *= damping;

      // Breathing displacement during LOCKED/STRESSING
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

      // Boundary clamp: max drift inversely proportional to fractureScale
      const maxDrift = FIB[7] / fractureScale || FIB[7];
      cell.ox = clamp(cell.ox, -maxDrift, maxDrift);
      cell.oy = clamp(cell.oy, -maxDrift, maxDrift);
     }
    }

    // ─── CSS var: fracture scale (clamped every frame) ───
    document.documentElement.style.setProperty(
        "--grid-fracture-scale",
        fractureScale.toFixed(3)
    );

    // Canvas transform: fracture scale with breathing modulation
    const canvasScale =
        fractureScale *
        (1 + Math.sin(breathPhase * 2) * 0.003 * stressLevel);
    canvas.style.transform = `scale(${canvasScale.toFixed(4)})`;

    // ─── Draw grid ───
    ctx.clearRect(0, 0, W, H);

    const colorMap = {
     [State.STANDBY]:      "rgba(255,255,255,0.06)",
     [State.LOCKED]:       "rgba(255,42,95,0.08)",
     [State.STRESSING]:    "rgba(255,42,95,0.12)",
     [State.FRACTURING]:   "rgba(255,180,40,0.25)",
    };
    ctx.strokeStyle = colorMap[state] || colorMap[State.STANDBY];
    ctx.lineWidth = FIB[0];

    // Vertical lines
    for (let c = 0; c <= COLS; c++) {
     ctx.beginPath();
     for (let r = 0; r <= ROWS; r++) {
      const rr = Math.min(r, ROWS - 1);
      const x = c * cellW + (grid[rr][c].ox || 0);
      const y = r * cellH + (grid[rr][c].oy || 0);
      r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
     }
     ctx.stroke();
    }

    // Horizontal lines
    for (let r = 0; r <= ROWS; r++) {
     ctx.beginPath();
     for (let c = 0; c <= COLS; c++) {
      const x = c * cellW + (grid[r][c].ox || 0);
      const y = r * cellH + (grid[r][c].oy || 0);
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
     }
     ctx.stroke();
    }

    // Accent nodes at intersections during fracture
    if (state === State.FRACTURING) {
     ctx.fillStyle = "#ff2a5f";
     for (let r = 0; r < ROWS; r += 4) {
      for (let c = 0; c < COLS; c += 4) {
       const cell = grid[r][c];
       const mag = Math.sqrt(cell.ox ** 2 + cell.oy ** 2);
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
   // Builds "fracture-slice" tear overlays driven by CSS keyframes.
   // Called only by the fractureCallback (synced to downbeat via scheduleLoop).
   function createFractureSlices() {
    fractureSliceEls.forEach((el) => el.remove());
    fractureSliceEls = [];

    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
     const slice = document.createElement("div");
     slice.className = "fracture-slice";

     const isHorizontal = Math.random() < 0.5;
     if (isHorizontal) {
      slice.style.top = `${Math.random() * 100}%`;
      slice.style.left = "0";
      slice.style.width = "100vw";
      slice.style.height = `${FIB[5] + Math.random() * FIB[8]}px`;
     } else {
      slice.style.top = "0";
      slice.style.left = `${Math.random() * 100}%`;
      slice.style.width = `${FIB[5] + Math.random() * FIB[8]}px`;
      slice.style.height = "100vh";
     }

     slice.style.animationDelay = `${i * 0.06}s, ${0.3 + i * 0.06}s`;
     slice.style.setProperty(
        "--rand-x",
        (Math.random() * 100).toFixed(1)
     );
     slice.style.setProperty(
        "--rand-y",
        (Math.random() * 100).toFixed(1)
     );

     document.body.appendChild(slice);
     fractureSliceEls.push(slice);
    }
   }

   // ─── Fracture Trigger ───
   // Routes hard-sync trigger to fractureCallback.
   // fractureCallback is scheduled via scheduleLoop to fire on the next downbeat.
   function triggerFracture() {
    updateState(State.FRACTURING);
    helmet.classList.add("active");
    fractureActive = true;

    // Chaos displacement: inject velocity into random cells
    for (let r = 0; r < ROWS; r++) {
     for (let c = 0; c < COLS; c++) {
      if (Math.random() < 0.45) {
       const cell = grid[r][c];
       cell.vx += (Math.random() - 0.5) * FIB[8];
       cell.vy += (Math.random() - 0.5) * FIB[8];
      }
     }
    }

    // Apply fracture scale bump (clamped in render loop to --grid-fracture-max)
    fractureScale = clamp(fractureScale + 0.03, 1, 1.08);

    // Immediate fracture noise burst
    if (audioCtx && noiseBuffer) {
     const src = audioCtx.createBufferSource();
     src.buffer = noiseBuffer;
     const g = audioCtx.createGain();
     g.gain.value = 0.25;
     src.connect(g);
     g.connect(masterGain);
     src.start();
    }

    // Schedule visual callback on next downbeat (4/4) via hard-sync
    scheduleFractureCallback(() => {
     createFractureSlices();
    });

    // Fracture snap-back after 1.5s
    clearTimeout(fractureDecayTimeout);
    fractureDecayTimeout = setTimeout(() => {
     fractureActive = false;
     fractureScale = clamp(fractureScale - 0.015, 0.98, 1.08);

     // If scale has snapped back to ~1, restore STRESSING state
     if (fractureScale <= 1.005) {
      fractureScale = 1;
      updateState(State.STRESSING);
     }
     helmet.classList.remove("active");
     fractureSliceEls.forEach((el) => el.remove());
     fractureSliceEls = [];
    }, 1500);
   }

   function scheduleFractureCallback(cb) {
    fractureScheduled = true;
    fractureCallback = cb;
   }

   // ─── Interaction Controller: Button bindings ───
   // Wires Lock, Stress, and Fracture buttons to the state machine.
   // State transitions: STANDBY -> LOCKED -> STRESSING -> FRACTURING -> STRESSING

   btnLock.addEventListener("click", () => {
    if (state !== State.STANDBY) return;

    initAudio();
    if (audioCtx.state === "suspended") audioCtx.resume();

    updateState(State.LOCKED);
    helmet.classList.add("active");
    sawGain.gain.setTargetAtTime(0.1, audioCtx.currentTime, 0.08);
    startScheduling();
   });

   btnStress.addEventListener("click", () => {
    if (state !== State.LOCKED && state !== State.STRESSING) return;

    if (state === State.LOCKED) {
     updateState(State.STRESSING);
    }

    // Compounding stress (capped at 1.0)
    stressLevel = clamp(stressLevel + 0.2, 0, 1);
    applyStressAudio(stressLevel);

    // Stress: inject displacement into random cells proportional to stress level
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
