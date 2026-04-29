/**
 * ystackai — Audio-reactive core loop
 *
 * Features:
 *   - Procedural sine sweep + kick drum sequence
 *   - Distinct sonic feedback per state (input, transition, success, failure, reset)
 *   - Master low-pass filter that opens on state changes
 *   - Safari suspend/idle guard with fallback timeout
 *   - Graceful mute/silent fallback
 */

(() => {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────
  const sweepBtn   = document.getElementById("sweepBtn");
  const resetBtn   = document.getElementById("resetBtn");
  const stateLabel = document.getElementById("stateLabel");
  const phaseBar   = document.getElementById("phaseBar");
  const body       = document.body;

  // ── WebAudio context with Safari guard ───────────────────
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx       = null;
  let masterGain     = null;
  let lowPassFilter  = null;
  let safariResumeTimer = null;

  /**
   * Initialise (or resume) the AudioContext.
   * Safari can leave the context in `suspended` after idle; we retry up to 3 times with a
   * fallback timeout (Wei's patch).
   */
  async function ensureAudioCtx() {
    if (!audioCtx) {
      audioCtx = new AudioCtx();

      // Master gain for mute control
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;

      // Master low-pass filter — starts at 8000 and modulates with state
      lowPassFilter = audioCtx.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 8000;
      lowPassFilter.Q.value = 0.7;

      lowPassFilter.connect(masterGain);
      masterGain.connect(audioCtx.destination);
    }

    if (audioCtx.state === "suspended") {
      await resumeWithContextGuard();
    }

    return audioCtx;
  }

  /**
   * Resume with retry + fallback timeout (Safari guard).
   * Wei's fallback: browsers can hang on interrupted play states.
   */
  async function resumeWithContextGuard() {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts && audioCtx.state === "suspended") {
      attempt++;
      try {
        await audioCtx.resume();
        break;
      } catch (_e) {
        // retry after short delay
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    // Fallback timeout: if still suspended, the context is effectively dead;
    // we create a fresh one as a last resort.
    if (audioCtx.state === "suspended") {
      try {
        audioCtx.close();
      } catch (_e) { /* ignore */ }
      audioCtx = new AudioCtx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      lowPassFilter = audioCtx.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 8000;
      lowPassFilter.Q.value = 0.7;
      lowPassFilter.connect(masterGain);
      masterGain.connect(audioCtx.destination);
      await audioCtx.resume();
    }
  }

  // ── Mute state ───────────────────────────────────────────
  let muted = false;

  function toggleMute() {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.setValueAtTime(muted ? 0 : 1, audioCtx.currentTime);
    }
    updateMuteIcon();
  }

  function updateMuteIcon() {
    const btn = document.querySelector(".mute-toggle");
    if (btn) btn.textContent = muted ? "🔇" : "🔊";
  }

  // Mute toggle button
  const muteBtn = document.createElement("button");
  muteBtn.className = "mute-toggle";
  muteBtn.setAttribute("aria-label", "Toggle mute");
  muteBtn.textContent = "🔊";
  muteBtn.addEventListener("click", toggleMute);
  document.body.appendChild(muteBtn);

  // ── Low-pass filter modulation ───────────────────────────
  /**
   * Open / close the low-pass filter based on current state.
   * Derek's wire: master bus opens the LPF automatically on state changes.
   */
  function modulateFilter(targetHz, duration) {
    if (!lowPassFilter || !audioCtx) return;
    lowPassFilter.frequency.setTargetAtTime(targetHz, audioCtx.currentTime, duration);
  }

  // ── Sound synthesis helpers ───────────────────────────────
  /** Safe oscillator helper — auto-cleanup */
  function makeOsc(type, startFreq, endFreq, startTime, duration) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
    }

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + Math.min(0.02, duration * 0.1));

    osc.connect(gain);
    gain.connect(lowPassFilter);

    const end = startTime + duration;
    gain.gain.linearRampToValueAtTime(0, end);

    osc.start(startTime);
    osc.stop(end + 0.01);

    return { osc, gain };
  }

  /**
   * Procedural kick drum — sine burst + noise transient.
   */
  function playKick(startTime) {
    // Sub
    const sub = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(160, startTime);
    sub.frequency.exponentialRampToValueAtTime(35, startTime + 0.15);
    subGain.gain.setValueAtTime(0.5, startTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    sub.connect(subGain);
    subGain.connect(lowPassFilter);
    sub.start(startTime);
    sub.stop(startTime + 0.5);

    // Transient click
    const bufLen = Math.floor(audioCtx.sampleRate * 0.03);
    const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.25, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

    noise.connect(noiseGain);
    noiseGain.connect(lowPassFilter);
    noise.start(startTime);
  }

  // ── State sounds ──────────────────────────────────────────
  /** Brief input beep: quick 880 Hz sine blip */
   function playInputSound(t) {
    const time = t || audioCtx.currentTime;
    const { osc, gain } = makeOsc("sine", 880, 880, time, 0.06);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.005);
    gain.gain.linearRampToValueAtTime(0, time + 0.06);
   }

   /** Transition chirp: ascending 440→1320 */
   function playTransitionSound(t) {
    makeOsc("triangle", 440, 1320, t || audioCtx.currentTime, 0.18);
   }

   /** Success chord: G7 arpeggio, bright and resolving */
   function playSuccessSound(t) {
    const time = t || audioCtx.currentTime;
    const notes = [392, 494, 587, 698]; // G4 B4 D5 F#5
    notes.forEach((freq, i) => {
      const { osc, gain } = makeOsc("sine", freq, freq, time + i * 0.06, 0.35);
      gain.gain.setValueAtTime(0, time + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.1, time + i * 0.06 + 0.01);
      gain.gain.linearRampToValueAtTime(0, time + i * 0.06 + 0.35);
     });
   }

   /** Failure tone: descending minor — 330→220 sawtooth */
   function playFailureSound(t) {
    const time = t || audioCtx.currentTime;
    const { osc, gain } = makeOsc("sawtooth", 330, 220, time, 0.3);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.07, time + 0.015);
    gain.gain.linearRampToValueAtTime(0, time + 0.3);
   }

   /** Reset pluck: 440→220 pluck */
   function playResetSound(t) {
    makeOsc("triangle", 440, 220, t || audioCtx.currentTime, 0.2);
   }

  // ── Sine sweep + kick sequence ───────────────────────────
  /**
   * Main sweep: rising sine from 80 Hz → 4400 Hz over 1.8 s,
   * with kick drum hits on 0, 0.2, 0.5, 0.9, 1.2, 1.6 s.
   */
  function playSweepSequence() {
    const now = audioCtx.currentTime;

    // Sine sweep
    const sweep = audioCtx.createOscillator();
    const sweepGain = audioCtx.createGain();
    sweep.type = "sine";
    sweep.frequency.setValueAtTime(80, now);
    sweep.frequency.exponentialRampToValueAtTime(4400, now + 1.8);

    sweepGain.gain.setValueAtTime(0, now);
    sweepGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
    sweepGain.gain.setValueAtTime(0.12, now + 1.4);
    sweepGain.gain.linearRampToValueAtTime(0, now + 1.8);

    sweep.connect(sweepGain);
    sweepGain.connect(lowPassFilter);
    sweep.start(now);
    sweep.stop(now + 1.9);

    // Kick hits at key moments
    const kickTimes = [0, 0.18, 0.45, 0.85, 1.15, 1.5];
    kickTimes.forEach((dt) => playKick(now + dt));

    // Modulate filter: close at start, open as sweep progresses
    modulateFilter(2000, 0.05);
    setTimeout(() => modulateFilter(14000, 0.8), 200);
    setTimeout(() => modulateFilter(8000, 0.5), 1500);
  }

  // ── State machine ─────────────────────────────────────────
  const states = {
    IDLE:    "IDLE",
    INPUT:   "INPUT",
    SWEEP:   "SWEEP",
    SUCCESS: "SUCCESS",
    FAILURE: "FAILURE",
    RESET:   "RESET",
  };

  let currentState = states.IDLE;

  function setState(state, overrideLabel) {
    currentState = state;
    const label = overrideLabel || state;
    stateLabel.textContent = label;
    stateLabel.className = "state-label " + state.toLowerCase();

    switch (state) {
      case states.INPUT:
        playInputSound();
        break;
      case states.SWEEP:
        document.body.classList.add("sweeping");
        playTransitionSound();
        break;
      case states.SUCCESS:
        document.body.classList.remove("sweeping");
        document.body.classList.add("success");
        playSuccessSound();
        phaseBar.classList.remove("active");
        phaseBar.setAttribute("aria-valuenow", "100");
        sweepBtn.disabled = true;
        resetBtn.hidden = false;
        break;
      case states.FAILURE:
        document.body.classList.remove("sweeping");
        document.body.classList.add("failure");
        playFailureSound();
        break;
      case states.RESET:
        document.body.classList.remove("success", "failure", "sweeping");
        modulateFilter(8000, 0.1);
        playResetSound();
        stateLabel.textContent = "IDLE";
        stateLabel.className = "state-label idle";
        currentState = states.IDLE;
        resetBtn.hidden = true;
        sweepBtn.disabled = false;
        phaseBar.classList.remove("active");
        phaseBar.setAttribute("aria-valuenow", "0");
        break;
    }
  }

  // ── Core loop ─────────────────────────────────────────────
  async function triggerSweep() {
    if (currentState === states.SWEEP) return;

    const acx = await ensureAudioCtx();
    const now = acx.currentTime;

    setState(states.INPUT);

    // Tiny delay so input sound plays before sweep
    setTimeout(() => {
      setState(states.SWEEP, "SWEEPING");
      playSweepSequence();

      // Animate phase bar
      phaseBar.classList.add("active");
      phaseBar.setAttribute("aria-valuenow", "0");

      // Progress updates
      let progress = 0;
      const tick = () => {
        progress = Math.min(progress + 16, 1800);
        phaseBar.setAttribute("aria-valuenow", String(Math.round(progress / 18)));
        if (progress < 1800) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      // Resolve after sweep duration — flip coin for success/failure
      setTimeout(() => {
        const success = Math.random() > 0.35;
        setState(success ? states.SUCCESS : states.FAILURE);
      }, 1850);
    }, 100);
  }

  // ── Event listeners ────────────────────────────────────────
  sweepBtn.addEventListener("click", triggerSweep);
  resetBtn.addEventListener("click", () => setState(states.RESET));

  // Keyboard: space/enter on body triggers the sweep
  document.addEventListener("keydown", (e) => {
    if (
      (e.code === "Space" || e.code === "Enter") &&
      e.target === document.body &&
      currentState === states.IDLE
    ) {
      e.preventDefault();
      triggerSweep();
    }
  });

  // Make body focusable for keyboard users
  document.body.setAttribute("tabindex", "0");
  document.body.setAttribute("role", "application");

  // ── Idle / visibility guard ───────────────────────────────
  // Safari may suspend the context when tab becomes hidden.
  // Resume when we come back if there was a recent interaction.
  let recentInteraction = false;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && recentInteraction) {
      if (audioCtx && audioCtx.state === "suspended") {
        resumeWithContextGuard();
      }
    }
  });

  [sweepBtn, resetBtn].forEach((btn) => {
    btn.addEventListener("pointerdown", () => { recentInteraction = true; });
    setTimeout(() => { recentInteraction = false; }, 10000);
  });

  // ── Expose for testing ────────────────────────────────────
  if (typeof window !== "undefined") {
    window.__audioReactive = {
      ensureAudioCtx,
      playSweepSequence,
      setState,
      states,
      get currentState() { return currentState; },
    };
  }
})();
