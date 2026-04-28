(() => {
   "use strict";

   // ─── Config ───
   const COLS = 7;
   const ROWS = 4;
   const TOTAL_CELLS = COLS * ROWS;
   const TARGET_TIME = 28;
   const TOLERANCE = 0.3;
   const TARGET_FILL = 14;
   const STEAM_INTERVAL = 200;

   // ─── State ───
   let cells = [];
   let filledCount = 0;
   let timerStart = 0;
   let timerRunning = false;
   let animFrame = null;
   let steamInterval = null;
   let audioCtx = null;
   let muted = false;
   let gameOver = false;

   // ─── DOM refs ───
   const gridEl = document.getElementById("grid");
   const timerEl = document.getElementById("timer");
   const liquidEl = document.getElementById("liquid-fill");
   const spoutEl = document.getElementById("spout");
   const resetBtn = document.getElementById("reset-btn");
   const muteBtn = document.getElementById("mute-btn");
   const steamContainer = document.getElementById("steam-container");
   const resultOverlay = document.getElementById("result-overlay");
   const resultText = document.getElementById("result-text");
   const resultSub = document.getElementById("result-sub");
   const counterEl = document.getElementById("counter");

   // ─── Audio Engine ───
   function initAudio() {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) { /* silent fallback */ }
   }

   function resumeAudio() {
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
   }

   function isAudioAvailable() {
      return !!audioCtx && !muted;
   }

   function playGrind() {
      if (!isAudioAvailable()) return;
      const now = audioCtx.currentTime;
      const bufSize = audioCtx.sampleRate * 0.08;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 3000;
      bp.Q.value = 2;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      src.connect(bp).connect(gain).connect(audioCtx.destination);
      src.start(now);
      src.stop(now + 0.09);
   }

   function playSuccess() {
      if (!isAudioAvailable()) return;
      const now = audioCtx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const g = audioCtx.createGain();
        const t = now + i * 0.08;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
      });
   }

   function playFailure() {
      if (!isAudioAvailable()) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.4);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      const filt = audioCtx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = 600;
      osc.connect(filt).connect(g).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
   }

   function playReset() {
      if (!isAudioAvailable()) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
   }

   // ─── Steam System ───
   function spawnSteam() {
      if (!timerRunning) return;
      const p = document.createElement("div");
      p.className = "steam-particle";
      const size = 8 + Math.random() * 16;
      const left = 20 + Math.random() * 160;
      const dur = 1 + Math.random() * 1.5;
      p.style.cssText = `width:${size}px;height:${size}px;left:${left}px;bottom:${Math.random() * 20}px;animation-duration:${dur}s;`;
      steamContainer.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000 + 100);
   }

   function startSteam() {
      steamInterval = setInterval(spawnSteam, STEAM_INTERVAL);
   }

   function stopSteam() {
      if (steamInterval) clearInterval(steamInterval);
   }

   // ─── Grid Setup ───
   function buildGrid() {
      gridEl.innerHTML = "";
      gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
      cells = [];
      for (let i = 0; i < TOTAL_CELLS; i++) {
        const c = document.createElement("div");
        c.className = "cell";
        c.dataset.index = i;
        c.setAttribute("role", "button");
        c.setAttribute("aria-label", `Extraction cell ${i + 1}`);
        gridEl.appendChild(c);
        cells.push(c);
      }
   }

   // ─── Timer ───
   function startTimer() {
      timerStart = performance.now();
      timerRunning = true;
      timerEl.classList.add("running");
      spoutEl.classList.add("flowing");
      startSteam();
      tick();
   }

   function tick() {
      if (!timerRunning) return;
      const elapsed = (performance.now() - timerStart) / 1000;
      const remain = Math.max(0, TARGET_TIME - elapsed).toFixed(1);
      const display = elapsed < TARGET_TIME
        ? `EXTRACTING — ${remain}s`
        : `OVER — ${elapsed.toFixed(1)}s`;

      if (elapsed > TARGET_TIME + 2) {
         timerEl.classList.add("critical");
         display = `OVER-EXTRACTED ${elapsed.toFixed(1)}s`;
      }
      timerEl.textContent = display;
      animFrame = requestAnimationFrame(tick);
   }

   function stopTimer() {
      timerRunning = false;
      spoutEl.classList.remove("flowing");
      stopSteam();
      if (animFrame) cancelAnimationFrame(animFrame);
      const elapsed = (performance.now() - timerStart) / 1000;
      return elapsed;
   }

   // ─── Liquid Fill ───
   function updateLiquid() {
      const pct = Math.min(100, (filledCount / TOTAL_CELLS) * 100);
      liquidEl.style.height = pct + "%";
      counterEl.textContent = `${filledCount} / ${TARGET_FILL}`;
    }

   // ─── Cell Fill ───
   function fillNextCell() {
      if (filledCount >= TOTAL_CELLS) return false;
      const idx = filledCount;
      const cell = cells[idx];
      cell.classList.add("filling");
      setTimeout(() => {
        cell.classList.remove("filling");
        cell.classList.add("filled");
      }, 250);
      filledCount++;
      updateLiquid();
      return true;
   }

   // ─── Win / Lose ───
   function checkResult(finalTime) {
      gameOver = true;
      stopTimer();

      const timeDelta = Math.abs(finalTime - TARGET_TIME);
      const fillOk = filledCount === TARGET_FILL;
      const timeOk = timeDelta <= TOLERANCE;

      if (fillOk && timeOk) {
         resultText.textContent = "PERFECT";
         resultText.className = "success";
         resultSub.textContent = `${finalTime.toFixed(1)}s · ${filledCount}/${TARGET_FILL} · Locked.`;
         timerEl.textContent = `CALIBRATED ${finalTime.toFixed(1)}s`;
         timerEl.classList.add("done-success");
         playSuccess();
      } else {
         let reason = "";
         if (!fillOk) reason = filledCount > TARGET_FILL ? "OVER-FILLED" : "UNDER-FILLED";
         else reason = finalTime > TARGET_TIME ? "TOO SLOW" : "TOO FAST";
         resultText.textContent = reason;
         resultText.className = "fail";
         resultSub.textContent = `${finalTime.toFixed(1)}s · ${filledCount} cells · Tap to recalibrate`;
         timerEl.textContent = `FAILED ${finalTime.toFixed(1)}s`;
         timerEl.classList.add("done-fail");
         playFailure();
         highlightOverExtracted();
      }

      setTimeout(() => {
         resultOverlay.classList.remove("hidden");
      }, 300);
   }

   function highlightOverExtracted() {
      const excess = Math.max(0, filledCount - TARGET_FILL);
      for (let i = 0; i < excess; i++) {
        const idx = TOTAL_CELLS - 1 - i;
        if (idx >= 0) {
          cells[idx].classList.add("over-extracted");
        }
      }
   }

   // ─── Reset ───
   function resetGame() {
      resultOverlay.classList.add("hidden");
      if (animFrame) cancelAnimationFrame(animFrame);
      stopSteam();

      filledCount = 0;
      gameOver = false;
      timerRunning = false;

      timerEl.textContent = "TAP TO START — 28.0s";
      timerEl.className = "";
      spoutEl.classList.remove("flowing");
      counterEl.textContent = `0 / ${TARGET_FILL}`;

      cells.forEach(c => {
        c.classList.remove("filled", "filling", "active", "over-extracted");
      });
      updateLiquid();
      playReset();
   }

   // ─── Input Handler ───
   function handleCellClick(e) {
      if (gameOver) {
         resetGame();
         return;
      }

      initAudio();
      resumeAudio();

      if (!timerRunning) {
         startTimer();
      }

      fillNextCell();
      playGrind();

      const clickedCell = e.currentTarget;
      clickedCell.classList.add("active");
      setTimeout(() => clickedCell.classList.remove("active"), 300);

      if (filledCount >= TARGET_FILL) {
         const elapsed = (performance.now() - timerStart) / 1000;
         setTimeout(() => checkResult(elapsed), 400);
      }
   }

   // ─── Mute Toggle ───
   function toggleMute() {
      muted = !muted;
      muteBtn.textContent = muted ? "≡" : "♪";
      muteBtn.classList.toggle("muted", muted);
   }

   // ─── Init ───
   function init() {
      buildGrid();

      cells.forEach(c => {
        c.addEventListener("click", handleCellClick);
        c.addEventListener("touchend", (e) => {
          e.preventDefault();
          handleCellClick(e);
        });
      });

      resetBtn.addEventListener("click", () => {
         resetGame();
      });

      muteBtn.addEventListener("click", () => {
         initAudio();
         toggleMute();
      });

      resultOverlay.addEventListener("click", () => {
         if (gameOver) resetGame();
      });

      resultOverlay.addEventListener("touchend", (e) => {
         e.preventDefault();
         if (gameOver) resetGame();
      });

      document.addEventListener("keydown", (e) => {
         if (e.key === "Escape" || e.key === "r" || e.key === "R") {
            if (gameOver) resetGame();
         }
         if (!gameOver && !timerRunning && e.key === " ") {
            e.preventDefault();
            handleCellClick({ currentTarget: getClickableCell() });
         }
      });
   }

   function getClickableCell() {
      if (filledCount < TOTAL_CELLS) {
        return cells[filledCount];
      }
      return null;
   }

   // ─── Boot ───
   if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
   } else {
      init();
   }
})();
