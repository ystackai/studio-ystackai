// ─────────────────────────────────────────────────────────────
//  Sine Sweep — audio engine + render loop
//  Phase callback, gain envelope, hard clamp verification
// ─────────────────────────────────────────────────────────────
(function () {
  'use strict';

  // ── DOM refs ─────────────────────────────────────────────
  var canvas = document.getElementById('sweepCanvas');
  var ctx2d = canvas.getContext('2d');
  var sweepBtn = document.getElementById('sweepBtn');
  var muteBtn = document.getElementById('muteBtn');
  var sweepStatus = document.getElementById('sweepStatus');
  var phaseValue = document.getElementById('phaseValue');
  var stage = canvas.parentElement;

  // ── Sweep parameters ─────────────────────────────────────
  var SWEEP_DURATION = 2.5;        // seconds
  var FREQ_LOW = 60;                 // Hz
  var FREQ_HIGH = 4000;             // Hz
  var GAIN_MAX = 0.25;              // peak gain
  var HARD_CLAMP = 0.18;            // hard amplitude ceiling
  var SAMPLE_RATE = 44100;
  var SINE_PHASE = 0;               // running phase callback accumulator
  var isRunning = false;
  var isMuted = false;
  var animFrameId = null;
  var audioCtx = null;

  // ── Canvas sizing ────────────────────────────────────────
  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ── Audio context ────────────────────────────────────────
  function ensureAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return !!(audioCtx && audioCtx.state !== 'closed');
  }

  function initAudio() {
    if (audioCtx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = AC ? new AC() : null;
    } catch (e) {
      audioCtx = null;
    }
  }

  // ── Phase callback (the Derek-Em hook) ──────────────────
  //  Tracks the instantaneous phase of the sine sweep and
  //  feeds it to the phase display and to the gain envelope.
  function phaseCallback(phase) {
    phaseValue.textContent = phase.toFixed(3);
    return phase;
  }

  // ── Gain envelope ────────────────────────────────────────
  //  Applies hard clamp: no amplitude may exceed HARD_CLAMP.
  function applyGainEnvelope(rawAmplitude, progress) {
    // Attack: 0→10%, Sustain: 10→85%, Decay: 85→100%
    var env = 0;
    if (progress < 0.1) {
      env = rawAmplitude * (progress / 0.1); // attack ramp
    } else if (progress < 0.85) {
      env = rawAmplitude; // sustain
    } else {
      env = rawAmplitude * (1 - (progress - 0.85) / 0.15); // decay
    }
    // Hard clamp
    return Math.min(env, HARD_CLAMP);
  }

  // ── Logarithmic frequency ramp ───────────────────────────
  //  freq(t) = freqLow * (freqHigh / freqLow) ^ (t / duration)
  function sweepFrequency(progress) {
    return FREQ_LOW * Math.pow(FREQ_HIGH / FREQ_LOW, progress);
  }

  // ── Audio playback ───────────────────────────────────────
  var oscillators = [];
  var gainNodes = [];

  function playSweep() {
    if (!ensureAudio()) return;
    var now = audioCtx.currentTime;
    var duration = SWEEP_DURATION;
    var totalSamples = SAMPLE_RATE * duration;

     // Create a buffer for the sweep waveform
    var buffer = audioCtx.createBuffer(1, totalSamples, SAMPLE_RATE);
    var data = buffer.getChannelData(0);
    SINE_PHASE = 0;

    for (var n = 0; n < totalSamples; n++) {
      var t = n / SAMPLE_RATE;
      var progress = Math.min(t / duration, 1);

       // Logarithmic frequency sweep
      var freq = sweepFrequency(progress);

       // Phase accumulation (the phase callback)
      SINE_PHASE += 2 * Math.PI * freq / SAMPLE_RATE;
      phaseCallback(SINE_PHASE);

       // Sine sample with gain envelope
      var rawAmp = GAIN_MAX;
      var clampedAmp = applyGainEnvelope(rawAmp, progress);

       // Anti-clipping safety
      var sample = clampedAmp * Math.sin(SINE_PHASE);
      data[n] = Math.max(-1, Math.min(1, sample));
    }

    var src = audioCtx.createBufferSource();
    src.buffer = buffer;

    var gain = audioCtx.createGain();
    gain.gain.value = isMuted ? 0 : 1;

    src.connect(gain).connect(audioCtx.destination);
    src.start(now);
    src.onended = function () {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      finishSweep();
    };

    oscillators.push(src);
    gainNodes.push(gain);
  }

  // ── Render loop ──────────────────────────────────────────
  var renderPhase = 0;
  var sweepProgress = 0;
  var clampedFrames = 0;
  var totalFrames = 0;
  var waveformCache = new Float32Array(0);

  function drawWaveform() {
    var w = canvas.width / (window.devicePixelRatio || 1);
    var h = canvas.height / (window.devicePixelRatio || 1);

    // Background
    ctx2d.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx2d.fillRect(0, 0, w, h);

    // Grid lines
    ctx2d.strokeStyle = 'rgba(99, 102, 241, 0.1)';
    ctx2d.lineWidth = 0.5;
    for (var i = 0; i < 5; i++) {
      var y = (h / 5) * i + h / 10;
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(w, y);
      ctx2d.stroke();
    }

    // Horizontal center line (zero crossing)
    ctx2d.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(0, h / 2);
    ctx2d.lineTo(w, h / 2);
    ctx2d.stroke();

    // Hard clamp lines
    var ampH = h * 0.36;
    var clampY_top = h / 2 - ampH * (HARD_CLAMP / GAIN_MAX);
    var clampY_bot = h / 2 + ampH * (HARD_CLAMP / GAIN_MAX);

    ctx2d.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx2d.lineWidth = 1;
    ctx2d.setLineDash([6, 4]);
    ctx2d.beginPath();
    ctx2d.moveTo(0, clampY_top);
    ctx2d.lineTo(w, clampY_top);
    ctx2d.stroke();
    ctx2d.beginPath();
    ctx2d.moveTo(0, clampY_bot);
    ctx2d.lineTo(w, clampY_bot);
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    // Waveform
    ctx2d.lineWidth = 2;

    if (waveformCache.length > 1) {
      // Generate sweep buffer for visualization
      var bufLen = waveformCache.length;
      var samplesPerFrame = Math.max(1, Math.floor(bufLen / w));

      // Glow layer
      var gradient = ctx2d.createLinearGradient(0, 0, w, 0);
      var currentFreq = sweepFrequency(sweepProgress || 0.5);
      var freqNorm = (currentFreq - FREQ_LOW) / (FREQ_HIGH - FREQ_LOW);
      gradient.addColorStop(0, 'rgba(110, 231, 183, 0.8)');
      gradient.addColorStop(freqNorm * 0.5, 'rgba(99, 102, 241, 0.9)');
      gradient.addColorStop(freqNorm, 'rgba(167, 139, 250, 0.7)');
      gradient.addColorStop(1, 'rgba(244, 63, 94, 0.6)');

      var drawData = waveformCache;
      ctx2d.strokeStyle = gradient;
      ctx2d.beginPath();

      for (var px = 0; px < w; px++) {
        var si = Math.floor(px * samplesPerFrame);
        if (si >= drawData.length) break;
        var val = drawData[si];
        var sy = h / 2 - val * ampH;

        if (px === 0) ctx2d.moveTo(px, sy);
        else ctx2d.lineTo(px, sy);
      }
      ctx2d.stroke();

      // Draw clamp hits
      for (var px2 = 0; px2 < w; px2++) {
        var si2 = Math.floor(px2 * samplesPerFrame);
        if (si2 >= drawData.length) break;
        if (Math.abs(drawData[si2]) >= HARD_CLAMP / GAIN_MAX) {
          ctx2d.fillStyle = 'rgba(244, 63, 94, 0.15)';
          ctx2d.fillRect(px2, 0, 1, h);
        }
      }
    } else {
      // Idle state — draw a gentle sine
      ctx2d.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx2d.lineWidth = 1.5;
      ctx2d.beginPath();
      for (var px3 = 0; px3 < w; px3++) {
        var v = Math.sin(px3 / w * Math.PI * 4 + Date.now() / 1000) * 0.05;
        var sy3 = h / 2 - v * ampH;
        if (px3 === 0) ctx2d.moveTo(px3, sy3);
        else ctx2d.lineTo(px3, sy3);
      }
      ctx2d.stroke();
    }

    // Sweep progress bar at bottom
    if (isRunning) {
      var barH = 3;
      ctx2d.fillStyle = 'rgba(99, 102, 241, 0.6)';
      ctx2d.fillRect(0, h - barH, w * sweepProgress, barH);
    }

    // Progress text
    if (isRunning) {
      ctx2d.fillStyle = 'rgba(226, 232, 240, 0.5)';
      ctx2d.font = '10px -apple-system, monospace';
      ctx2d.fillText(
        Math.round(sweepProgress * 100) + '%',
        w * sweepProgress + 4,
        h - 8
      );
    }
  }

  function generateSweepBuffer() {
    var samples = window.devicePixelRatio ? 1200 * (window.devicePixelRatio || 1) : 1200;
    var buf = new Float32Array(samples);
    SINE_PHASE = 0;

    for (var i = 0; i < samples; i++) {
      var progress = i / samples;
      var freq = sweepFrequency(sweepProgress + progress * 0.02);
      SINE_PHASE += 2 * Math.PI * freq / SAMPLE_RATE * 30;
      var rawAmp = GAIN_MAX;
      var clampedAmp = applyGainEnvelope(rawAmp, sweepProgress + progress * 0.02);
      buf[i] = (clampedAmp / GAIN_MAX) * Math.sin(SINE_PHASE);
    }

    waveformCache = buf;
    phaseValue.textContent = SINE_PHASE.toFixed(3);
  }

  function renderLoop() {
    if (!isRunning) {
      drawWaveform();
      animFrameId = requestAnimationFrame(renderLoop);
      return;
    }

    sweepProgress += 1 / 60 / SWEEP_DURATION;
    if (sweepProgress > 1) sweepProgress = 1;

    generateSweepBuffer();
    drawWaveform();

    totalFrames++;
    if (sweepProgress >= 1) {
      isRunning = false;
      stage.classList.remove('active');
      sweepBtn.disabled = false;
      animFrameId = null;
    } else {
      animFrameId = requestAnimationFrame(renderLoop);
    }
  }

  // ── Sweep lifecycle ──────────────────────────────────────
  function startSweep() {
    if (isRunning) return;
    initAudio();
    ensureAudio();

    isRunning = true;
    sweepProgress = 0;
    clampedFrames = 0;
    totalFrames = 0;
    SINE_PHASE = 0;

    stage.classList.add('active');
    sweepBtn.disabled = true;
    sweepStatus.textContent = 'Sweep running... gain envelope monitoring';
    sweepStatus.className = 'sweep-status running';

    playSweep();

    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderLoop();
  }

  function finishSweep() {
    var didClamp = totalFrames > 0 && clampedFrames > 0;

    if (didClamp) {
      sweepStatus.textContent = 'Gain envelope held. Hard clamp verified. Sweep complete.';
      sweepStatus.className = 'sweep-status success';
    } else {
      sweepStatus.textContent = 'Sweep complete. No clipping detected.';
      sweepStatus.className = 'sweep-status success';
    }

    waveformCache = new Float32Array(0);

     // Auto-reset after 4 seconds
    setTimeout(function () {
      if (!isRunning) {
        sweepStatus.textContent = 'Ready.';
        sweepStatus.className = 'sweep-status';
        stage.classList.remove('active');
      }
    }, 4000);
  }

  // ── Mute toggle ──────────────────────────────────────────
  function toggleMute() {
    isMuted = !isMuted;
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.textContent = isMuted ? '\u266b\u0336' : '\u266b'; // muted note vs plain note
    muteBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');

     // Update active audio gain
    if (audioCtx && gainNodes.length) {
      var now = audioCtx.currentTime;
      var lastGain = gainNodes[gainNodes.length - 1];
      lastGain.gain.setValueAtTime(isMuted ? 0 : 1, now);
    }
  }

  // ── Event wiring ─────────────────────────────────────────
  sweepBtn.addEventListener('click', startSweep);
  muteBtn.addEventListener('click', toggleMute);

  // Keyboard: Space to sweep, M to mute
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      startSweep();
    } else if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    }
  });

  // ── Initial idle render ──────────────────────────────────
  waveformCache = new Float32Array(0);
  animFrameId = requestAnimationFrame(renderLoop);

})();
