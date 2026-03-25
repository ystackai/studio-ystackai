/**
 * StackY Audio — Web Audio API sound effects + adaptive music system.
 *
 * Effects: line clear chime, piece lock click, chocolate rumble, game over,
 *          whisper (haunted line clear), scream (4-line clear),
 *          adaptive background music that responds to tower height.
 *
 * No dependencies. Exposes: StackyAudio.{init, playLineClear, playLock,
 *   playChocolateRumble, playGameOver, playWhisper, playScream,
 *   startMusic, stopMusic, updateTempo}
 */
'use strict';

var StackyAudio = (function () {
  var ctx = null;
  var initialized = false;
  var masterGain = null;

  // Music state
  var musicPlaying = false;
  var musicGain = null;
  var kickOsc = null;
  var bassOsc = null;
  var hihatInterval = null;
  var currentBPM = 80;
  var beatTimer = null;
  var droneOsc = null;
  var droneGain = null;

  function init() {
    if (initialized) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);
      initialized = true;
    } catch (_) {}
  }

  function ensureRunning() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── SFX ────────────────────────────────────────────────────────────────

  function playLineClear() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  function playLock() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playChocolateRumble() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(12, now);
    lfoGain.gain.setValueAtTime(0.1, now);
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(masterGain);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.5);
    osc.stop(now + 0.5);
  }

  function playGameOver() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.8);
    stopMusic();
  }

  // ── Whisper (haunted line clear) ───────────────────────────────────────

  function playWhisper(intensity) {
    if (!ctx) return;
    ensureRunning();
    intensity = intensity || 1;
    var now = ctx.currentTime;
    var dur = 0.6 + intensity * 0.3;

    // Filtered white noise → breathy whisper
    var bufferSize = ctx.sampleRate * dur;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    var noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for vocal quality
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + intensity * 400, now);
    filter.Q.setValueAtTime(2 + intensity, now);

    // Second formant for eeriness
    var filter2 = ctx.createBiquadFilter();
    filter2.type = 'peaking';
    filter2.frequency.setValueAtTime(2500, now);
    filter2.gain.setValueAtTime(8, now);
    filter2.Q.setValueAtTime(3, now);

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08 * intensity, now + 0.1);
    gain.gain.setValueAtTime(0.08 * intensity, now + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(filter2);
    filter2.connect(gain);
    gain.connect(masterGain);
    noise.start(now);
    noise.stop(now + dur);
  }

  // ── Scream (4-line clear / Tetris) ─────────────────────────────────────

  function playScream() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;

    // Distorted ascending sweep
    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.8);

    // Distortion via waveshaper
    var shaper = ctx.createWaveShaper();
    var curve = new Float32Array(256);
    for (var i = 0; i < 256; i++) {
      var x = (i / 128) - 1;
      curve[i] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x));
    }
    shaper.curve = curve;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.8);

    // Layered noise burst
    playWhisper(3);
  }

  // ── Adaptive Music System ──────────────────────────────────────────────

  function startMusic() {
    if (!ctx || musicPlaying) return;
    ensureRunning();
    musicPlaying = true;

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.08;
    musicGain.connect(masterGain);

    // Low drone — factory ambience
    droneOsc = ctx.createOscillator();
    droneOsc.type = 'triangle';
    droneOsc.frequency.value = 55;
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.15;
    droneOsc.connect(droneGain);
    droneGain.connect(musicGain);
    droneOsc.start();

    // Start beat loop
    currentBPM = 80;
    scheduleBeat();
  }

  function stopMusic() {
    musicPlaying = false;
    if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
    if (droneOsc) { try { droneOsc.stop(); } catch(_){} droneOsc = null; }
    if (droneGain) { droneGain = null; }
    if (musicGain) { musicGain = null; }
  }

  function scheduleBeat() {
    if (!musicPlaying || !ctx) return;
    var now = ctx.currentTime;
    var beatInterval = 60 / currentBPM;

    // Kick — low thump
    var kick = ctx.createOscillator();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(150, now);
    kick.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    var kickGain = ctx.createGain();
    kickGain.gain.setValueAtTime(0.3, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    kick.connect(kickGain);
    kickGain.connect(musicGain);
    kick.start(now);
    kick.stop(now + 0.15);

    // Hi-hat on off-beats (every other beat)
    var hatDelay = beatInterval / 2;
    var hatNoise = ctx.createBufferSource();
    var hatBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    var hatData = hatBuffer.getChannelData(0);
    for (var i = 0; i < hatData.length; i++) hatData[i] = Math.random() * 2 - 1;
    hatNoise.buffer = hatBuffer;
    var hatFilter = ctx.createBiquadFilter();
    hatFilter.type = 'highpass';
    hatFilter.frequency.value = 8000;
    var hatGain = ctx.createGain();
    hatGain.gain.setValueAtTime(0.1, now + hatDelay);
    hatGain.gain.exponentialRampToValueAtTime(0.001, now + hatDelay + 0.03);
    hatNoise.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(musicGain);
    hatNoise.start(now + hatDelay);
    hatNoise.stop(now + hatDelay + 0.03);

    beatTimer = setTimeout(scheduleBeat, beatInterval * 1000);
  }

  /**
   * Update music tempo based on tower height (0-20).
   * Also adjusts drone intensity for tension.
   */
  function updateTempo(height) {
    if (!musicPlaying) return;
    // BPM: 80 at height 0, 160 at height 20
    var t = Math.min(height / 20, 1);
    currentBPM = 80 + t * 80;

    // Drone gets louder and higher-pitched as tower grows
    if (droneOsc) {
      droneOsc.frequency.value = 55 + t * 55; // 55Hz → 110Hz
    }
    if (droneGain) {
      droneGain.gain.value = 0.15 + t * 0.2; // louder at top
    }
  }

  /**
   * Bass drop — triggered on near-collapse (top 3 rows).
   */
  function playBassDrop() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  return {
    init: init,
    playLineClear: playLineClear,
    playLock: playLock,
    playChocolateRumble: playChocolateRumble,
    playGameOver: playGameOver,
    playWhisper: playWhisper,
    playScream: playScream,
    playBassDrop: playBassDrop,
    startMusic: startMusic,
    stopMusic: stopMusic,
    updateTempo: updateTempo,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StackyAudio;
}
