// ─── Grid Fracture Drop Engine: Hard-Sync Scheduling Loop ───
// Audio Kernel: sawtooth, hard-sync, kick, buffer flush
// Render Loop: clamp before render, boundary enforcement
// Fracture Callback: bound to audio buffer flush downbeat

(() => {
    "use strict";

    // ─── Constants ───
    const BPM = 128;
    const BEAT_DUR = 60 / BPM;
    const LOOK_AHEAD = 0.1;
    const FLUSH_WINDOW = 0.08;
    const COLS = 16;
    const ROWS = 32;
    const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
    const FLUSH_DURATION = 0.15;

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
    let breathPulseValue = 0;
    let bufferFlushActive = false;
    let bufferFlushEnd = 0;
    let pendingFractureCallbacks = [];

    // ─── DOM refs ───
    const bodyEl = document.body;
    const canvas = document.getElementById("grid-canvas");
    const ctx = canvas.getContext("2d");
    const helmet = document.getElementById("helmet");
    const statusEl = document.getElementById("status");
    const btnLock = document.getElementById("btn-lock");
    const btnStress = document.getElementById("btn-stress");
    const btnFracture = document.getElementById("btn-fracture");
    const stressFill = document.getElementById("stress-fill");
    const beatDots = document.querySelectorAll(".beat-dot");
    const narrativeEl = document.getElementById("narrative");

    let W = 0, H = 0;
    let cellW = 0, cellH = 0;

    // ─── Grid cell offsets for fracture displacement ───
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) {
            grid[r][c] = { ox: 0, oy: 0, vx: 0, vy: 0 };
        }
    }

    // ─── Audio Kernel ───
    let audioCtx = null;
    let sawtooth = null;
    let sawGain = null;
    let syncOsc = null;
    let syncGain = null;
    let noiseBuffer = null;
    let subOsc = null;
    let masterGain = null;
    let compressor = null;

    // Scheduling state
    let scheduleTimer = null;
    let scheduleRunning = false;
    let nextBeatTime = 0;
    let beatIndex = 0;
    let measureIndex = 0;

    // Fracture callback scheduling (synced to downbeat via audio buffer flush)
    let fractureScheduled = false;
    let fractureActive = false;
    let fractureSliceEls = [];

    // ─── Boundary Clamp ───
    // Wei Lin's clamp: prevents aliasing in feedback path.
    // All values must be clamped before render to guarantee bounded output.
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // ─── Audio Init ───
    function initAudio() {
        if (audioCtx) return;

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Compressor: prevents over-driven output
        compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 6;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.15;
        compressor.connect(audioCtx.destination);

        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.35;
        masterGain.connect(compressor);

        // ─── Sawtooth "breath" oscillator (held during lock) ───
        sawtooth = audioCtx.createOscillator();
        sawtooth.type = "sawtooth";
        sawtooth.frequency.value = 55;
        sawGain = audioCtx.createGain();
        sawGain.gain.value = 0;
        sawtooth.connect(sawGain);
        sawGain.connect(masterGain);
        sawtooth.start();

        // ─── Hard-sync trigger oscillator (pulses on kick) ───
        syncOsc = audioCtx.createOscillator();
        syncOsc.type = "square";
        syncOsc.frequency.value = 110;
        syncGain = audioCtx.createGain();
        syncGain.gain.value = 0;
        syncOsc.connect(syncGain);
        syncGain.connect(masterGain);
        syncOsc.start();

        // ─── Sub bass layer ───
        subOsc = audioCtx.createOscillator();
        subOsc.type = "sine";
        subOsc.frequency.value = 40;
        const subG = audioCtx.createGain();
        subG.gain.value = 0;
        subOsc.connect(subG);
        subG.connect(masterGain);
        subOsc.start();

        // ─── Noise buffer for fracture kick ───
        const sr = audioCtx.sampleRate;
        const len = Math.floor(sr * 0.5);
        noiseBuffer = audioCtx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = noiseBuffer.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.08));
            }
        }
    }

    // ─── Kick synthesis ───
    // Full kick: sub-bass sweep + hard attack transient + noise click
    function triggerKick(time, isDownbeat) {
        // Sub bass kick: pitch sweep 180 -> 35hz
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(isDownbeat ? 180 : 120, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.14);

        const g = audioCtx.createGain();
        g.gain.setValueAtTime(isDownbeat ? 0.9 : 0.6, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + (isDownbeat ? 0.35 : 0.2));
        osc.connect(g);
        g.connect(masterGain);
        osc.start(time);
        osc.stop(time + (isDownbeat ? 0.4 : 0.25));

        // Transient click: short noise burst
        const click = audioCtx.createBufferSource();
        const sr = audioCtx.sampleRate;
        const cLen = Math.floor(sr * 0.02);
        const cBuf = audioCtx.createBuffer(1, cLen, sr);
        const cData = cBuf.getChannelData(0);
        for (let i = 0; i < cLen; i++) {
            cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.004));
        }
        click.buffer = cBuf;
        const cG = audioCtx.createGain();
        cG.gain.setValueAtTime(isDownbeat ? 0.3 : 0.15, time);
        click.connect(cG);
        cG.connect(masterGain);
        click.start(time);

        // ─── Hard-sync pulse: every beat ───
        syncGain.gain.cancelScheduledValues(time);
        syncGain.gain.setValueAtTime(isDownbeat ? 0.2 : 0.1, time);
        syncGain.gain.exponentialRampToValueAtTime(
            0.001,
            time + BEAT_DUR * (isDownbeat ? 0.7 : 0.5)
        );

        // ─── Sawtooth attack: volume spike on kick ───
        sawGain.gain.cancelScheduledValues(time);
        sawGain.gain.setValueAtTime(isDownbeat ? 0.18 : 0.1, time);
        sawGain.gain.linearRampToValueAtTime(
            0.06 + stressLevel * 0.05,
            time + BEAT_DUR * 0.45
        );

        // ─── Sub bass layer on downbeat ───
        if (isDownbeat && subOsc) {
            const subGain = audioCtx.createGain();
            subGain.gain.setValueAtTime(0.4, time);
            subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            subOsc.connect(subGain);
            subGain.connect(masterGain);
        }

        // ─── Buffer Flush: mark flush window ───
        // The flush window is [time, time + FLUSH_DURATION].
        // Visual callback must not fire until flush completes.
        bufferFlushActive = true;
        bufferFlushEnd = time + FLUSH_DURATION;

        // ─── Visual callback: helmet pulse synced to kick time ───
        const beatDelayMs = Math.max(0, (time - audioCtx.currentTime) * 1000);
        setTimeout(() => pulseHelmet(), beatDelayMs);

        // ─── Beat indicator update ───
        setTimeout(() => updateBeatIndicator(beatIndex % 4), beatDelayMs);

        // ─── Fracture noise burst on downbeat when fracture is active ───
        if (fractureActive && noiseBuffer && isDownbeat) {
            const src = audioCtx.createBufferSource();
            src.buffer = noiseBuffer;
            const g2 = audioCtx.createGain();
            g2.gain.setValueAtTime(0.35, time);
            g2.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
            src.connect(g2);
            g2.connect(masterGain);
            src.start(time);
        }
    }

    // ─── Schedule Loop: Hard-Sync Scheduling ───
    // Drives sawtooth and kick synthesis on the 128 BPM grid.
    // Schedules beats ~100ms ahead using look-ahead to prevent dropouts.
    // Fracture callback fires on downbeat only after buffer flush completes.
    function scheduleLoop() {
        if (!scheduleRunning) return;

        while (nextBeatTime < audioCtx.currentTime + LOOK_AHEAD) {
            const isDownbeat = beatIndex % 4 === 0;

            // Kick on every beat for active states
            if (state === State.LOCKED || state === State.STRESSING || state === State.FRACTURING) {
                triggerKick(nextBeatTime, isDownbeat);
            }

            // ─── Fracture callback: fires on downbeat AFTER buffer flush ───
            // The callback is deferred until the flush window has completed.
            // This guarantees no visual callback fires mid-buffer, preventing aliasing.
            if (isDownbeat) {
                if (fractureScheduled && pendingFractureCallbacks.length > 0) {
                    const flushCheckTime = bufferFlushEnd;
                    const delayedMs = Math.max(
                        0,
                        (flushCheckTime - audioCtx.currentTime) * 1000
                    );

                    setTimeout(() => {
                        bufferFlushActive = false;
                        pendingFractureCallbacks.forEach((cb) => {
                            try { cb(); } catch (_) {}
                         });
                        pendingFractureCallbacks = [];
                        fractureScheduled = false;
                    }, delayedMs);

                    // Clear the flag immediately after queuing
                    fractureScheduled = false;
                }

                // Also fire any queued stress-release callbacks
                if (!fractureScheduled) {
                    // Normal beat pulse, no pending fracture
                }
            }

            nextBeatTime += BEAT_DUR;
            beatIndex++;
            measureIndex = Math.floor(beatIndex / 4);
        }

        scheduleTimer = setTimeout(scheduleLoop, 20);
    }

    function startScheduling() {
        scheduleRunning = true;
        nextBeatTime = audioCtx.currentTime + 0.05;
        beatIndex = 0;
        measureIndex = 0;
        scheduleLoop();
    }

    function stopScheduling() {
        scheduleRunning = false;
        if (scheduleTimer) {
            clearTimeout(scheduleTimer);
            scheduleTimer = null;
        }
        bufferFlushActive = false;
        fractureScheduled = false;
        pendingFractureCallbacks = [];
    }

    // ─── Helmet pulse ───
    function pulseHelmet() {
        helmet.classList.remove("pulse");
        void helmet.offsetWidth;
        helmet.classList.add("pulse");
    }

    // ─── Beat indicator visual ───
    function updateBeatIndicator(beat) {
        beatDots.forEach((dot, i) => {
            dot.classList.toggle("active", i === beat);
            dot.classList.toggle("downbeat", i === 0);
        });
    }

    // ─── Stress audio modulation ───
    function applyStressAudio(level) {
        if (!audioCtx || !sawtooth || !syncOsc) return;
        const sawFreq = 55 + level * 35;
        sawtooth.frequency.setTargetAtTime(sawFreq, audioCtx.currentTime, 0.06);
        sawGain.gain.setTargetAtTime(
            0.1 + level * 0.08,
            audioCtx.currentTime,
            0.06
        );
        syncOsc.frequency.setTargetAtTime(110 + level * 60, audioCtx.currentTime, 0.06);
        syncGain.gain.setTargetAtTime(
            0.08 + level * 0.06,
            audioCtx.currentTime,
            0.06
        );
    }

    // ─── Schedule fracture callback ───
    // Queues a callback to fire on the next downbeat after buffer flush.
    // This is the core of the hard-synced fracture system.
    function scheduleFractureCallback(cb) {
        pendingFractureCallbacks.push(cb);
        fractureScheduled = true;
    }

    // ─── Resize ───
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

    // ─── Update state and UI ───
    function updateState(next) {
        state = next;
        const label = {
            [State.STANDBY]: "GRID STANDBY",
            [State.LOCKED]: "GRID LOCKED — HARD-SYNC ENGAGED",
            [State.STRESSING]: `GRID STRESSING — STRESS ${Math.round(stressLevel * 100)}%`,
            [State.FRACTURING]: "GRID FRACTURING — CONTRACT BOUNDARY BREACH",
        }[next] || "GRID UNKNOWN";
        statusEl.textContent = label;

        // Button states
        btnLock.disabled = state !== State.STANDBY;
        btnStress.disabled = state !== State.LOCKED && state !== State.STRESSING;
        btnFracture.disabled = state !== State.STRESSING;

        // Body classes for CSS state styling
        bodyEl.classList.toggle("fracturing", next === State.FRACTURING);
        bodyEl.classList.toggle("locked", next === State.LOCKED);
        bodyEl.classList.toggle("stressing", next === State.STRESSING);
        bodyEl.classList.toggle("standby", next === State.STANDBY);
        bodyEl.classList.toggle("active", next !== State.STANDBY);

        // Update stress meter fill
        if (stressFill) {
            stressFill.style.width = `${stressLevel * 100}%`;
        }
    }

    // ─── Render Loop ───
    // Clamp before render. Boundary enforcement on all feedback paths.
    let lastTime = 0;

    function renderLoop(now) {
        requestAnimationFrame(renderLoop);

        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        // ─── CLAMP FEEDBACK PATH BEFORE RENDER ───
        fractureScale = clamp(fractureScale, 1, 1.08);
        stressLevel = clamp(stressLevel, 0, 1);
        breathPulseValue = clamp(breathPulseValue, 0, 1);

        // ─── Breathing phase ───
        const breathSpeed = state === State.FRACTURING
            ? 3.0
            : state === State.STRESSING
                ? 0.6 + stressLevel * 1.4
                : state === State.LOCKED
                    ? 0.5
                    : 0;

        breathPhase += breathSpeed * dt;

        // ─── Breathing pulse wave ───
        if (state !== State.STANDBY) {
            breathPulseValue = 0.5 + Math.sin(breathPhase) * 0.5;
            breathPulseValue = clamp(breathPulseValue, 0, 1);
        }

        // ─── Fracture state: velocity decay + boundary clamp ───
        if (state === State.FRACTURING) {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = grid[r][c];
                    cell.vx *= 0.98;
                    cell.vy *= 0.98;

                    // Wei Lin boundary clamp: hard limits prevent aliasing
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

        // ─── Grid cell physics (non-fracture states) ───
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = grid[r][c];

                if (state === State.FRACTURING) continue;
                if (state === State.STANDBY) continue;

                // Center gravity: spring back to origin
                const springK = state === State.LOCKED ? 5 : 3;
                cell.vx += -cell.ox * springK * dt;
                cell.vy += -cell.oy * springK * dt;

                // Damping (damp more when locked, less when stressing)
                const damping = state === State.LOCKED ? 0.88 : 0.92;
                cell.vx *= damping;
                cell.vy *= damping;

                // Breathing displacement: sinusoidal wave through grid
                const breatheAmp = FIB[4] * (0.3 + stressLevel * 0.7);
                const bx = Math.sin(breathPhase + c * 0.25) * breatheAmp * dt;
                const by = Math.cos(breathPhase + r * 0.25) * breatheAmp * dt;
                cell.vx += bx;
                cell.vy += by;

                // Stress vibration: high-frequency micro-displacement when stressing
                if (state === State.STRESSING && stressLevel > 0.3) {
                    const vibAmp = stressLevel * FIB[2] * 0.3;
                    cell.vx += (Math.random() - 0.5) * vibAmp;
                    cell.vy += (Math.random() - 0.5) * vibAmp;
                }

                // Update position
                cell.ox += cell.vx * dt * 60;
                cell.oy += cell.vy * dt * 60;

                // Boundary clamp: max drift inversely proportional to fractureScale
                const maxDrift = FIB[7] / (fractureScale || 1);
                cell.ox = clamp(cell.ox, -maxDrift, maxDrift);
                cell.oy = clamp(cell.oy, -maxDrift, maxDrift);
            }
        }

        // ─── CSS variables: update every frame (clamped) ───
        const root = document.documentElement;
        root.style.setProperty("--grid-fracture-scale", fractureScale.toFixed(4));
        root.style.setProperty("--breath-pulse", breathPulseValue.toFixed(3));
        root.style.setProperty("--stress-level", stressLevel.toFixed(3));

        // Canvas transform: fracture scale + breathing modulation
        const canvasScale = fractureScale *
            (1 + Math.sin(breathPhase * 1.5) * 0.002 * stressLevel);
        canvas.style.transform = `scale(${clamp(canvasScale, 0.95, 1.12).toFixed(4)})`;

        // ─── Draw grid ───
        ctx.clearRect(0, 0, W, H);

        const colorMap = {
            [State.STANDBY]:   { r: 255, g: 255, b: 255, a: 0.06 },
            [State.LOCKED]:    { r: 255, g: 42,  b: 95,  a: 0.08 + breathPulseValue * 0.04 },
            [State.STRESSING]: { r: 255, g: 42,  b: 95,  a: 0.1 + stressLevel * 0.06 },
            [State.FRACTURING]:{ r: 255, g: 180, b: 40,  a: 0.18 + breathPulseValue * 0.08 },
        };
        const clr = colorMap[state] || colorMap[State.STANDBY];
        ctx.strokeStyle = `rgba(${clr.r},${clr.g},${clr.b},${clr.a.toFixed(3)})`;
        ctx.lineWidth = clamp(0.5 + stressLevel * 1.5, 0.5, 2);

        // ─── Draw vertical lines ───
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            for (let r = 0; r <= ROWS; r++) {
                const rr = clamp(r, 0, ROWS - 1);
                const cc = clamp(c, 0, COLS - 1);
                const x = c * cellW + (grid[rr][cc].ox || 0);
                const y = r * cellH + (grid[rr][cc].oy || 0);
                r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // ─── Draw horizontal lines ───
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            for (let c = 0; c <= COLS; c++) {
                const rr = clamp(r, 0, ROWS - 1);
                const cc = clamp(c, 0, COLS - 1);
                const x = c * cellW + (grid[rr][cc].ox || 0);
                const y = r * cellH + (grid[rr][cc].oy || 0);
                c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // ─── Accent nodes at intersections during fracture ───
        if (state === State.FRACTURING) {
            const nodeAlpha = clamp(0.4 + breathPulseValue * 0.6, 0.1, 1);
            ctx.fillStyle = `rgba(255, 42, 95, ${nodeAlpha.toFixed(3)})`;
            for (let r = 0; r < ROWS; r += 2) {
                for (let c = 0; c < COLS; c += 2) {
                    const cell = grid[r][c];
                    const mag = Math.sqrt(cell.ox * cell.ox + cell.oy * cell.oy);
                    if (mag > 1.5) {
                        const sz = clamp(mag * 0.2, 1, FIB[5]);
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

            // Buffer flush visual indicator
            if (bufferFlushActive) {
                ctx.strokeStyle = `rgba(255, 180, 40, ${(0.3 * breathPulseValue).toFixed(3)})`;
                ctx.lineWidth = 2;
                const cx = W / 2;
                const cy = H / 2;
                const radius = clamp(80 + breathPulseValue * 120, 80, 300);
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // ─── Lock visual: center "contract" ring ───
        if (state === State.LOCKED) {
            const cx = W / 2;
            const cy = H / 2;
            const radius = FIB[8] * (1 + breathPulseValue * 0.15);
            ctx.strokeStyle = `rgba(255, 42, 95, ${(0.12 + breathPulseValue * 0.08).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ─── Narrative element: subtle glow during stress/fracture ───
        if (narrativeEl && (state === State.STRESSING || state === State.FRACTURING)) {
            const glowIntensity = state === State.FRACTURING ? breathPulseValue : stressLevel;
            narrativeEl.style.textShadow = `0 0 ${clamp(glowIntensity * 20, 0, 20)}px rgba(255, 42, 95, ${clamp(glowIntensity * 0.4, 0, 0.4).toFixed(3)})`;
        } else if (narrativeEl) {
            narrativeEl.style.textShadow = "none";
        }
    }

    // ─── Fracture-slice DOM generation ───
    // Called by the fracture callback, which is synced to the downbeat
    // via the schedule loop after buffer flush completes.
    function createFractureSlices() {
        fractureSliceEls.forEach((el) => el.remove());
        fractureSliceEls = [];

        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const slice = document.createElement("div");
            slice.className = "fracture-slice";

            const isHorizontal = Math.random() < 0.5;
            if (isHorizontal) {
                slice.style.top = `${clamp(Math.random() * 100, 5, 95).toFixed(1)}%`;
                slice.style.left = "0";
                slice.style.width = "100vw";
                slice.style.height = `${clamp(FIB[5] + Math.random() * FIB[8], 5, 34).toFixed(0)}px`;
            } else {
                slice.style.top = "0";
                slice.style.left = `${clamp(Math.random() * 100, 5, 95).toFixed(1)}%`;
                slice.style.width = `${clamp(FIB[5] + Math.random() * FIB[8], 5, 34).toFixed(0)}px`;
                slice.style.height = "100vh";
            }

            slice.style.animationDelay = `${i * 0.06}s, ${0.3 + i * 0.06}s`;
            slice.style.setProperty("--rand-x", clamp(Math.random() * 100, 10, 90).toFixed(1));
            slice.style.setProperty("--rand-y", clamp(Math.random() * 100, 10, 90).toFixed(1));

            document.body.appendChild(slice);
            fractureSliceEls.push(slice);
        }
    }

    // ─── Fracture Trigger ───
    // Routes a hard-sync trigger to the fracture callback system.
    // The fracture callback is scheduled via scheduleLoop to fire on the next downbeat
    // after the audio buffer flush window closes.
    function triggerFracture() {
        updateState(State.FRACTURING);
        helmet.classList.add("active");
        fractureActive = true;

        // Chaos displacement: inject velocity into random cells
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (Math.random() < 0.4) {
                    const cell = grid[r][c];
                    cell.vx += (Math.random() - 0.5) * FIB[8];
                    cell.vy += (Math.random() - 0.5) * FIB[8];
                }
            }
        }

        // Fracture scale bump (clamped in render loop)
        fractureScale = clamp(fractureScale + 0.04, 1, 1.08);

        // Immediate fracture noise burst
        if (audioCtx && noiseBuffer) {
            const src = audioCtx.createBufferSource();
            src.buffer = noiseBuffer;
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.3, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            src.connect(g);
            g.connect(masterGain);
            src.start();
        }

        // Schedule visual callback on next downbeat via hard-sync
        // This is the core: callback waits for buffer flush, then fires
        scheduleFractureCallback(() => {
            createFractureSlices();
            pulseHelmet();
        });

        // Fracture snap-back: decay after 1.8s
        clearTimeout(fractureDecayTimeout);
        fractureDecayTimeout = setTimeout(() => {
            fractureActive = false;
            fractureScale = clamp(fractureScale - 0.02, 0.98, 1.08);

            if (fractureScale <= 1.005) {
                fractureScale = 1;
                updateState(State.STRESSING);
            }

            helmet.classList.remove("active");
            fractureSliceEls.forEach((el) => el.remove());
            fractureSliceEls = [];
            // Reset grid velocities to zero for clean snap-back
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    grid[r][c].vx *= 0.3;
                    grid[r][c].vy *= 0.3;
                }
            }
        }, 1800);
    }

    // ─── Interaction: Button bindings ───
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
        stressLevel = clamp(stressLevel + 0.18, 0, 1);
        stressFill.style.width = `${stressLevel * 100}%`;
        applyStressAudio(stressLevel);

        // Stress: inject displacement proportional to stress level
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (Math.random() < 0.12) {
                    const cell = grid[r][c];
                    cell.vx += (Math.random() - 0.5) * FIB[5] * stressLevel;
                    cell.vy += (Math.random() - 0.5) * FIB[5] * stressLevel;
                }
            }
        }

        // Helmet pulse on stress
        pulseHelmet();
        updateState(State.STRESSING);
    });

    btnFracture.addEventListener("click", () => {
        if (state !== State.STRESSING) return;
        triggerFracture();
    });

    // ─── Keyboard shortcuts ───
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            e.preventDefault();
            if (state === State.STANDBY) btnLock.click();
            else if (state === State.LOCKED) btnStress.click();
            else if (state === State.STRESSING) btnFracture.click();
        }
        if (e.code === "KeyR" && state === State.FRACTURING) {
            triggerFracture();
        }
    });

    // ─── Boot ───
    bodyEl.classList.add("standby");
    requestAnimationFrame(renderLoop);
})();
