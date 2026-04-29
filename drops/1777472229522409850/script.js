/**
 * ystackai — AudioReactiveGrid
 *
 * Core loop: observe state -> perform action -> receive feedback -> reset
 * WebAudio oscillator chain with sidechain compression, Safari resume guard,
 * and zero console errors.
 */

(() => {
   "use strict";

   // ── DOM refs ──────────────────────────────────────────────
   const sweepBtn   = document.getElementById("sweepBtn");
   const resetBtn   = document.getElementById("resetBtn");
   const stateLabel = document.getElementById("stateLabel");
   const phaseBar   = document.getElementById("phaseBar");
   const grid       = document.getElementById("reactiveGrid");
   const cells      = grid ? grid.children : [];
   const body       = document.body;

   // ── State definitions ──────────────────────────────────────
   const S = { IDLE: "IDLE", INPUT: "INPUT", SWEEP: "SWEEP", SUCCESS: "SUCCESS", FAILURE: "FAILURE", RESET: "RESET" };
   let state = S.IDLE;
   let muted = false;

   // ── WebAudio context ──────────────────────────────────────
   const AudioCtx = window.AudioContext || window.webkitAudioContext;
   let audioCtx       = null;
   let masterGain     = null;
   let lpFilter       = null;  // low-pass filter on master bus
   let compressor     = null;  // sidechain compressor
   let compModGain    = null;  // sidechain modulation input
   let safariGuard    = null;  // resume timer
   let sweepAnimFrame = null;  // progress animation handle

   /** Resume with retry + fallback timeout (Safari guard + Wei's patch). */
   async function resumeWithGuard() {
      if (!audioCtx) return;
      const max = 4;
      for (let n = 0; n < max && audioCtx.state === "suspended"; n++) {
         try { await audioCtx.resume(); break; }
         catch (_) { await sleep(150 * (n + 1)); }
      }
      // Fallback: if still suspended after retries, the context is dead.
      // Recreate and resume fresh.
      if (audioCtx && audioCtx.state === "suspended") {
         try { await audioCtx.close(); } catch (_) {}
         audioCtx  = new AudioCtx();
         masterGain = audioCtx.createGain();
         masterGain.gain.value = muted ? 0 : 1;
         lpFilter = audioCtx.createBiquadFilter();
         lpFilter.type = "lowpass";
         lpFilter.frequency.value = 8000;
         lpFilter.Q.value = 0.7;
         buildCompressor();
         lpFilter.connect(compressor);
         compressor.connect(masterGain);
         masterGain.connect(audioCtx.destination);
         try { await audioCtx.resume(); } catch (_) {}
      }
   }

   /** Initialise or resume the AudioContext. */
   async function ensureCtx() {
      if (!audioCtx) {
         audioCtx     = new AudioCtx();
         masterGain   = audioCtx.createGain();
         masterGain.gain.value = muted ? 0 : 1;
         lpFilter     = audioCtx.createBiquadFilter();
         lpFilter.type = "lowpass";
         lpFilter.frequency.value = 8000;
         lpFilter.Q.value = 0.7;
         buildCompressor();
         lpFilter.connect(compressor);
         compressor.connect(masterGain);
         masterGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") {
         await resumeWithGuard();
      }
      return audioCtx;
   }

   /** Build the sidechain compressor + modulation gain. */
   function buildCompressor() {
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value     = 10;
      compressor.ratio.value    = 12;
      compressor.attack.value   = 0.003;
      compressor.release.value  = 0.15;
      compModGain = audioCtx.createGain();
      compModGain.gain.value = 0;
      compModGain.connect(compressor);
   }

   /** Pulse the sidechain modulation — drives compression on kick hits. */
   function pulseSidechain(t, duration) {
      if (!compModGain || !audioCtx) return;
      compModGain.gain.cancelScheduledValues(t);
      compModGain.gain.setValueAtTime(0.4, t);
      compModGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
   }

   /** Modulate the master low-pass filter on state changes. */
   function filterTo(hz, timeConst) {
      if (!lpFilter || !audioCtx) return;
      lpFilter.frequency.setTargetAtTime(hz, audioCtx.currentTime, timeConst);
   }

   // ── Sound synthesis ───────────────────────────────────────
   function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

   /** Safe oscillator: auto-cleanup, routed through LPF. */
   function osc(type, startF, endF, t, dur) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(startF, 0.1), t);
      if (endF != null && endF > 0) {
         o.frequency.exponentialRampToValueAtTime(endF, t + dur);
      }
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + Math.min(0.02, dur * 0.1));
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g);
      g.connect(lpFilter);
      o.start(t);
      o.stop(t + dur + 0.01);
   }

   /** Procedural kick: sub + noise transient, drives sidechain. */
   function kick(t) {
      // Sub oscillator
      const sb = audioCtx.createOscillator();
      const sg = audioCtx.createGain();
      sb.type = "sine";
      sb.frequency.setValueAtTime(160, t);
      sb.frequency.exponentialRampToValueAtTime(35, t + 0.15);
      sg.gain.setValueAtTime(0.5, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      sb.connect(sg);
      sg.connect(lpFilter);
      sb.start(t);
      sb.stop(t + 0.5);

      // Noise transient
      const len = Math.max(1, Math.floor(audioCtx.sampleRate * 0.03));
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const ns = audioCtx.createBufferSource();
      ns.buffer = buf;
      const ng = audioCtx.createGain();
      ng.gain.setValueAtTime(0.25, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      ns.connect(ng);
      ng.connect(lpFilter);
      ns.start(t);

      // Sidechain pulse
      pulseSidechain(t, 0.2);
   }

   // ── State-specific sounds ─────────────────────────────────
   function sndInput(t) {
      t = t || audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.005);
      g.gain.linearRampToValueAtTime(0, t + 0.06);
      o.connect(g);
      g.connect(lpFilter);
      o.start(t);
      o.stop(t + 0.07);
   }

   function sndTransition(t) {
      t = t || audioCtx.currentTime;
      osc("triangle", 440, 1320, t, 0.18);
   }

   function sndSuccess(t) {
      t = t || audioCtx.currentTime;
      [392, 494, 587, 698].forEach((f, i) => {
         const o = audioCtx.createOscillator();
         const g = audioCtx.createGain();
         o.type = "sine";
         o.frequency.setValueAtTime(f, t + i * 0.06);
         g.gain.setValueAtTime(0, t + i * 0.06);
         g.gain.linearRampToValueAtTime(0.1, t + i * 0.06 + 0.01);
         g.gain.linearRampToValueAtTime(0, t + i * 0.06 + 0.35);
         o.connect(g);
         g.connect(lpFilter);
         o.start(t + i * 0.06);
         o.stop(t + i * 0.06 + 0.36);
      });
   }

   function sndFailure(t) {
      t = t || audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(220, t + 0.3);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.015);
      g.gain.linearRampToValueAtTime(0, t + 0.3);
      o.connect(g);
      g.connect(lpFilter);
      o.start(t);
      o.stop(t + 0.31);
   }

   function sndReset(t) {
      t = t || audioCtx.currentTime;
      osc("triangle", 440, 220, t, 0.2);
   }

   // ── Full sweep sequence ───────────────────────────────────
   /**
    * Main sine sweep: 80 Hz → 4400 Hz over 1.8s.
    * Kicks on 0, 0.18, 0.45, 0.85, 1.15, 1.5s.
    * Filter closes at start, opens as sweep progresses, closes at end.
    */
   function playSweep() {
      const now = audioCtx.currentTime;

      // Primary sweep oscillator
      const sw = audioCtx.createOscillator();
      const sg = audioCtx.createGain();
      sw.type = "sine";
      sw.frequency.setValueAtTime(80, now);
      sw.frequency.exponentialRampToValueAtTime(4400, now + 1.8);
      sg.gain.setValueAtTime(0, now);
      sg.gain.linearRampToValueAtTime(0.12, now + 0.05);
      sg.gain.setValueAtTime(0.12, now + 1.4);
      sg.gain.linearRampToValueAtTime(0, now + 1.8);
      sw.connect(sg);
      sg.connect(lpFilter);
      sw.start(now);
      sw.stop(now + 1.9);

      // Kick hits
      [0, 0.18, 0.45, 0.85, 1.15, 1.5].forEach(dt => kick(now + dt));

      // Filter modulation: close -> open -> settle
      filterTo(2000, 0.05);
      setTimeout(() => filterTo(14000, 0.8), 200);
      setTimeout(() => filterTo(8000, 0.5), 1500);
   }

   // ── Visual grid reactivity ────────────────────────────────
   /** Animate grid cells with audio-reactive scaling. */
   function gridPulse(intensity) {
      for (let i = 0; i < cells.length; i++) {
         const cell = cells[i];
         const dist = Math.abs(i - 12) / 12; // center distance
         const factor = Math.max(0.02, intensity * (1 - dist * 0.6));
         cell.style.transform = `scale(${1 + factor})`;
         cell.style.background = `rgba(255, 59, 48, ${factor * 0.5})`;
         cell.style.boxShadow = `0 0 ${Math.round(12 + factor * 40)}px rgba(255, 59, 48, ${factor * 0.3})`;
      }
   }

   function gridReset() {
      for (let i = 0; i < cells.length; i++) {
         const cell = cells[i];
         cell.style.transform = "";
         cell.style.background = "";
         cell.style.boxShadow = "";
      }
   }

   // ── State machine ─────────────────────────────────────────
   function set(newState, label) {
      state = newState;
      const display = label || newState;
      stateLabel.textContent = display;
      stateLabel.className = "state-label " + state.toLowerCase();

      switch (state) {
        case S.INPUT:
           sndInput();
           filterTo(4000, 0.02);
           break;

        case S.SWEEP:
           body.className = "sweeping";
           sndTransition();
           break;

        case S.SUCCESS:
           body.className = "success";
           sndSuccess();
           filterTo(16000, 0.15);
           phaseBar.classList.remove("active");
           phaseBar.setAttribute("aria-valuenow", "100");
           sweepBtn.disabled = true;
           resetBtn.hidden = false;
           gridPulse(0.4);
           break;

        case S.FAILURE:
           body.className = "failure";
           sndFailure();
           filterTo(3000, 0.1);
           gridPulse(0.15);
           break;

        case S.RESET:
           body.className = "";
           filterTo(8000, 0.08);
           sndReset();
           gridReset();
           stateLabel.textContent = "IDLE";
           stateLabel.className = "state-label idle";
           resetBtn.hidden = true;
           sweepBtn.disabled = false;
           phaseBar.classList.remove("active");
           phaseBar.setAttribute("aria-valuenow", "0");
           state = S.IDLE;
           break;
      }
   }

   // ── Core interaction loop ─────────────────────────────────
   // observe state -> perform action -> receive feedback -> reset
   async function trigger() {
      if (state === S.SWEEP) return;

      const ctx = await ensureCtx();
      const st = ctx.currentTime;

      // Phase 1: Input — user clicks, brief beep
      set(S.INPUT);

      // Phase 2: Sweep — transition + audio sequence
      setTimeout(() => {
         set(S.SWEEP, "SWEEPING");
         playSweep();

         phaseBar.classList.add("active");
         phaseBar.setAttribute("aria-valuenow", "0");

         // Visual reactivity: animate phase + grid
         const start = performance.now();
         const dur = 1800;
         function frame(ts) {
            const t = Math.min((ts - start) / dur, 1);
            phaseBar.setAttribute("aria-valuenow", String(Math.round(t * 100)));
            gridPulse(0.6 * Math.sin(t * Math.PI));
            if (t < 1) sweepAnimFrame = requestAnimationFrame(frame);
         }
         sweepAnimFrame = requestAnimationFrame(frame);

         // Phase 3: Feedback — success or failure
         setTimeout(() => {
            const ok = Math.random() > 0.35;
            set(ok ? S.SUCCESS : S.FAILURE);
         }, 1850);
      }, 100);
   }

   // ── Reset handler ─────────────────────────────────────────
   function doReset() {
      if (sweepAnimFrame) cancelAnimationFrame(sweepAnimFrame);
      set(S.RESET);
   }

   // ── Mute toggle ───────────────────────────────────────────
   function toggleMute() {
      muted = !muted;
      if (masterGain && audioCtx) {
         masterGain.gain.setValueAtTime(muted ? 0 : 1, audioCtx.currentTime);
      }
      const icon = document.getElementById("muteIcon");
      if (icon) icon.textContent = muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
   }

   const muteBtnEl = document.getElementById("muteBtn");

   // ── Event wiring ──────────────────────────────────────────
   sweepBtn.addEventListener("click", trigger);
   resetBtn.addEventListener("click", doReset);
   if (muteBtnEl) muteBtnEl.addEventListener("click", toggleMute);

   // Keyboard: space / enter triggers sweep when in idle
   document.addEventListener("keydown", e => {
      if ((e.code === "Space" || e.code === "Enter") && state === S.IDLE) {
         e.preventDefault();
         trigger();
      }
   });

   // ── Safari visibility guard ───────────────────────────────
   // Safari suspends audio context on tab hide; resume on visible.
   let recent = false;
   document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && recent && audioCtx && audioCtx.state === "suspended") {
         resumeWithGuard();
      }
   });

   [sweepBtn, resetBtn].forEach(btn => {
      btn.addEventListener("pointerdown", () => {
         recent = true;
         clearTimeout(safariGuard);
         safariGuard = setTimeout(() => { recent = false; }, 10000);
      });
   });

   // ── WebAudio suspend fallback ─────────────────────────────
   // Wei's patch: poll for unexpected suspension and auto-resume.
   function suspendGuard() {
      if (audioCtx && audioCtx.state === "suspended" && recent) {
         resumeWithGuard();
      }
   }
   setInterval(suspendGuard, 2000);

   // ── Public API (testing) ──────────────────────────────────
   if (typeof window !== "undefined") {
      window.__audioReactive = {
         ensureCtx,
         playSweep,
         set,
         S,
         get state() { return state; },
      };
   }
})();
