(function () {
  "use strict";

  // ── Audio Engine (Web Audio API) ────────────────────────────────
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  // Snap: crisp mechanical clack — short noise burst + woodblock tone
  function playSnap() {
    ensureAudio();
    const now = audioCtx.currentTime;

    // Noise burst (clack click)
    const bufLen = audioCtx.sampleRate * 0.04;
    const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.15));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;

    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 1.8;

    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.5, now);
    noise.connect(bp).connect(ng).connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.04);

    // Woodblock tone
    const osc = audioCtx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
    const og = audioCtx.createGain();
    og.gain.setValueAtTime(0.35, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(og).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Spawn blip: ascending digital chirp, frequency scales with rate
  let spawnBlipBase = 600;
  function playSpawn(rate) {
    ensureAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    const freq = spawnBlipBase + Math.min(rate * 80, 600);
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.05);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Overflow hum: low sine that rises in pitch/volume with meter value
  let humOsc = null, humGain = null, humPlaying = false;
  function startOverflowHum() {
    ensureAudio();
    if (humPlaying) return;
    humOsc = audioCtx.createOscillator();
    humOsc.type = "sawtooth";
    humOsc.frequency.value = 60;
    humGain = audioCtx.createGain();
    humGain.gain.value = 0;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;

    humOsc.connect(filter).connect(humGain).connect(audioCtx.destination);
    humOsc.start();
    humPlaying = true;
  }

  function updateOverflowHum(meterValue) {
    if (!humPlaying || !humOsc || !humGain) return;
    const t = audioCtx.currentTime;
    const pitch = 60 + meterValue * 2.4; // 60 → 300 Hz
    const vol = Math.min(meterValue / 100, 1) * 0.18;
    humOsc.frequency.setTargetAtTime(pitch, t, 0.05);
    humGain.gain.setTargetAtTime(vol, t, 0.05);
  }

  function stopOverflowHum() {
    if (humPlaying && humOsc) {
      const t = audioCtx.currentTime;
      humGain.gain.setTargetAtTime(0, t, 0.1);
      humOsc.stop(t + 0.3);
      humPlaying = false;
      humOsc = null;
      humGain = null;
    }
  }

  // Game Over buzzer
  function playGameOver() {
    ensureAudio();
    const now = audioCtx.currentTime;
    [120, 90, 70].forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.15, now + i * 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.4);
    });
  }

  // ── DOM references ──────────────────────────────────────────────
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startButton = document.getElementById("start-button");
  const gridContainer = document.getElementById("grid-container");
  const snapBtn = document.getElementById("snap-button");
  const meterFill = document.getElementById("vibes-overflow");
  const scoreValue = document.getElementById("score-value");
  const spawnRateValue = document.getElementById("spawn-rate-value");
  const flashEl = document.getElementById("flash");
  const comboDisplay = document.getElementById("combo-display");

  // ── Constants ───────────────────────────────────────────────────
  const COLS = 6;
  const ROWS = 4;
  const SNAP_DURATION = 150; // ms — matches CSS
  const JITTER_AMP_INITIAL = 12; // pixels
  const DRIFT_SPEED = 0.3; // px per frame at base rate

  // ── State ───────────────────────────────────────────────────────
  let entities = [];
  let overflow = 0;
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  let gameRunning = false;
  let gameOverState = false;
  let lastTime = 0;
  let spawnAccumulator = 0;
  let baseInterval = 1800; // ms between spawns at start
  let currentInterval = baseInterval;
  let difficultyMultiplier = 1;
  let rafId = null;

  // ── Grid cell setup (immutable after init) ─────────────────────
  function buildGrid() {
    gridContainer.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.dataset.row = r;
        cell.dataset.col = c;

        const el = document.createElement("div");
        el.className = "entity";
        el.dataset.idx = entities.length;

        const neonColors = [
          "#00ffff",
          "#ff00aa",
          "#00ff66",
          "#ffff00",
        ];
        el.style.background = neonColors[Math.floor(Math.random() * neonColors.length)];
        el.style.boxShadow = `0 0 8px ${el.style.background}`;

        cell.appendChild(el);
        gridContainer.appendChild(cell);
      }
    }
 }

  // ── Spawn ───────────────────────────────────────────────────────
  function spawnEntity() {
    if (!gameRunning) return;

    const cells = gridContainer.querySelectorAll(".grid-cell");
    const occupied = new Set(entities.map((e) => e.target.dataset.idx));
    const freeCells = [];
    cells.forEach((cell, i) => {
      if (!occupied.has(String(i))) freeCells.push(cell);
    });

    if (freeCells.length === 0) return;

    const cell = freeCells[Math.floor(Math.random() * freeCells.length)];
    const el = cell.querySelector(".entity");

    const entity = {
      target: cell,
      el: el,
      dx: 0,
      dy: 0,
      vx: (Math.random() - 0.5) * DRIFT_SPEED * difficultyMultiplier,
      vy: (Math.random() - 0.5) * DRIFT_SPEED * difficultyMultiplier,
      phase: Math.random() * Math.PI * 2,
      snapPhase: false,
    };

    entity.el.classList.add("active");
    entities.push(entity);

    // Increase overflow on spawn
    overflow = Math.min(100, overflow + 2.5 * difficultyMultiplier);
    playSpawn(difficultyMultiplier);

    updateMeter();
  }

  // ── Jitter / Drift Update (transform-only) ────────────────────
  function updateEntities(dt) {
    const amp = JITTER_AMP_INITIAL + Math.min(difficultyMultiplier * 4, 20);

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (e.snapping) continue;

      // Random jitter component (transform-based only)
      e.dx += (Math.random() - 0.5) * amp * 0.3 * (dt / 16);
      e.dy += (Math.random() - 0.5) * amp * 0.3 * (dt / 16);

      // Drift velocity
      e.dx += e.vx * (dt / 16);
      e.dy += e.vy * (dt / 16);

      // Clamp to cell bounds for visual containment
      const cx = parseFloat(e.target.style.width || e.target.offsetWidth) / 2;
      const cy = parseFloat(e.target.style.height || e.target.offsetHeight) / 2;
      const maxOff = Math.min(cx, cy) - 4;
      e.dx = Math.max(-maxOff, Math.min(maxOff, e.dx));
      e.dy = Math.max(-maxOff, Math.min(maxOff, e.dy));

      // Sinusoidal wobble for organic feel
      const t = performance.now() / 1000 + e.phase;
      const wobbleX = Math.sin(t * 3.7) * amp * 0.4;
      const wobbleY = Math.cos(t * 2.9) * amp * 0.4;

      e.el.style.transform = `translate(${e.dx + wobbleX}px, ${e.dy + wobbleY}px) scale(1)`;

      // Overflow rises with drift magnitude
      const mag = Math.sqrt(e.dx * e.dx + e.dy * e.dy);
      overflow = Math.min(100, overflow + (mag / 500) * difficultyMultiplier * (dt / 16));
    }

    if (overflow > 0) {
      updateMeter();
    }
  }

  // ── Meter ───────────────────────────────────────────────────────
  function updateMeter() {
    overflow = Math.min(100, Math.max(0, overflow));

    // Color shift from cyan to magenta as overflow grows
    const ratio = overflow / 100;
    const rVal = Math.round(ratio * 255);
    const gVal = Math.round((1 - Math.abs(ratio - 0.2) * 2) * 255);
    const bVal = Math.round((1 - ratio) * 255);

    meterFill.style.width = overflow + "%";
    meterFill.style.background = `rgb(${rVal}, ${gVal}, ${bVal})`;

    // Neon bleed on grid cells proportional to overflow
    if (overflow > 20) {
      const alpha = ((overflow - 20) / 80) * 0.15;
      gridContainer.style.boxShadow = `inset 0 0 ${overflow}px rgba(${rVal}, ${gVal}, ${bVal}, ${alpha})`;
    } else {
      gridContainer.style.boxShadow = "none";
    }

    updateOverflowHum(overflow);

    if (overflow >= 100 && gameRunning) {
      triggerGameOver();
    }
  }

  // Meter reduction uses CSS transition (already set to 150ms ease-out in CSS)
  function reduceMeter(amount) {
    overflow = Math.min(100, Math.max(0, overflow - amount));
    updateMeter();
  }

  // ── Snap ────────────────────────────────────────────────────────
  function snap() {
    if (!gameRunning || entities.length === 0) return;

    ensureAudio();
    playSnap();

    let totalDrift = 0;
    const count = entities.length;

    for (const e of entities) {
      totalDrift += Math.sqrt(e.dx * e.dx + e.dy * e.dy);

      // Snap: reset transform, CSS transition handles the 150ms ease-out animation
      e.el.classList.remove("jittering");
      e.el.classList.add("snapping");
      e.snapping = true;
      e.el.style.transform = "translate(0, 0) scale(1)";

      // After snap transition completes, remove snapping class
      const idx = entities.indexOf(e);
      setTimeout(() => {
        if (entities[idx] && entities[idx].el === e.el) {
          e.el.classList.remove("snapping");
          e.snapping = false;
          e.dx = 0;
          e.dy = 0;
        }
      }, SNAP_DURATION);
    }

    // Screen shake
    gridContainer.parentElement.classList.add("shake");
    setTimeout(() => {
      gridContainer.parentElement.classList.remove("shake");
    }, SNAP_DURATION);

    // Flash
    flashEl.classList.add("active");
    setTimeout(() => {
      flashEl.classList.remove("active");
    }, SNAP_DURATION);

    // Meter reduction proportional to how displaced entities were
    const avgDrift = totalDrift / count;
    const reduction = Math.min(35, 8 + avgDrift * 0.6);
    reduceMeter(reduction);

    // Score
    combo++;
    if (combo > bestCombo) bestCombo = combo;
    const comboBonus = Math.min(combo, 10);
    score += count * (10 + comboBonus * 5);
    scoreValue.textContent = String(score);

    // Combo display
    if (combo >= 3) {
      showCombo(combo);
    }

    // Remove snapped entities after a short delay to keep things fresh
    setTimeout(() => {
      const toRemove = entities.filter((e) => e.snapping);
      for (const e of toRemove) {
        e.el.classList.remove("active", "snapping");
        e.el.style.transform = "translate(0, 0) scale(0)";
        const idx = entities.indexOf(e);
        if (idx > -1) entities.splice(idx, 1);
      }
    }, SNAP_DURATION + 50);

    // Difficulty: faster spawns as player survives longer
    difficultyMultiplier = 1 + score / 2000;
    currentInterval = Math.max(350, baseInterval / difficultyMultiplier);
    spawnRateValue.textContent = difficultyMultiplier.toFixed(1) + "\u00d7";
  }

  function showCombo(c) {
    comboDisplay.textContent = c + "x SNAP!";
    comboDisplay.classList.remove("show");
    // Force reflow to restart animation
    void comboDisplay.offsetWidth;
    comboDisplay.classList.add("show");
    setTimeout(() => {
      comboDisplay.classList.remove("show");
    }, 400);
  }

  // ── Difficulty Escalation ───────────────────────────────────────
  function updateDifficulty(dt) {
    // Passive slow rise of overflow over time (time pressure)
    overflow = Math.min(100, overflow + 0.02 * difficultyMultiplier * (dt / 16));
  }

  // ── Spawn Timer ────────────────────────────────────────────────
  function updateSpawning(dt) {
    spawnAccumulator += dt;
    if (spawnAccumulator >= currentInterval) {
      spawnAccumulator -= currentInterval;
      spawnEntity();

      // Exponential decay of interval: shorter between spawns
      currentInterval = Math.max(350, currentInterval * 0.995);
    }
  }

  // ── Game Loop ───────────────────────────────────────────────────────
  function gameLoop(timestamp) {
    if (!gameRunning) return;

    const dt = lastTime ? Math.min(timestamp - lastTime, 50) : 16;
    lastTime = timestamp;

    updateSpawning(dt);
    updateEntities(dt);
    updateDifficulty(dt);

    rafId = requestAnimationFrame(gameLoop);
  }

  // ── Start / Stop / Reset ────────────────────────────────────────
  function startGame() {
    ensureAudio();

    // Reset state
    buildGrid();
    entities = [];
    overflow = 0;
    score = 0;
    combo = 0;
    bestCombo = 0;
    difficultyMultiplier = 1;
    currentInterval = baseInterval;
    spawnAccumulator = 0;
    gameRunning = true;
    gameOverState = false;

    scoreValue.textContent = "0";
    spawnRateValue.textContent = "1.0×";
    updateMeter();

    overlay.classList.add("hidden");
    document.body.classList.remove("chaos-mode");
    snapBtn.disabled = false;

    // Start overflow hum
    startOverflowHum();

    lastTime = 0;
    rafId = requestAnimationFrame(gameLoop);
  }

  function triggerGameOver() {
    if (gameOverState) return;
    gameOverState = true;
    gameRunning = false;
    snapBtn.disabled = true;

    if (rafId) cancelAnimationFrame(rafId);
    stopOverflowHum();
    playGameOver();

    document.body.classList.add("chaos-mode");

    setTimeout(() => {
      overlayTitle.textContent = "Grid Collapse";
      overlayText.textContent = `Score: ${score} | Best Combo: ${bestCombo}×\n\nThe grid has succumbed to unstyled anarchy.`;
      startButton.textContent = "Retry";
      overlay.classList.remove("hidden");
    }, 800);
  }

  // ── Input ───────────────────────────────────────────────────────
  snapBtn.addEventListener("click", snap);

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && gameRunning) {
      e.preventDefault();
      snap();
    }
  });

  startButton.addEventListener("click", startGame);

  // ── Init ────────────────────────────────────────────────────────
  buildGrid();
})();
