/**
 * StackY Audio — Procedural adaptive soundtrack + SFX.
 *
 * Derek's vision: audio is half the game. The music responds to stress,
 * chains feel satisfying, and the factory atmosphere builds dread.
 *
 * Features:
 * - Adaptive music: bass + arpeggio + pad that respond to stress level
 * - Chain combo sounds with rising pitch per chain level
 * - Whisper synthesis for haunted line clears
 * - Scream distortion for big clears
 * - Factory ambience layer
 */
'use strict';

var StackyAudio = (function () {
  var ctx = null;
  var initialized = false;
  var masterGain = null;

  // Music nodes
  var musicPlaying = false;
  var bassGain = null;
  var arpGain = null;
  var padGain = null;
  var ambGain = null;
  var beatTimer = null;
  var currentBPM = 85;
  var currentStress = 0;
  var beatCount = 0;

  // Musical scales (pentatonic minor for dark factory vibe)
  var SCALE_LOW =  [55, 65.4, 73.4, 82.4, 98];        // A1 C2 D2 E2 G2
  var SCALE_MID =  [220, 261.6, 293.7, 329.6, 392];    // A3 C4 D4 E4 G4
  var SCALE_HIGH = [440, 523.3, 587.3, 659.3, 784];    // A4 C5 D5 E5 G5

  // Chain combo pitches (rising satisfaction)
  var CHAIN_PITCHES = [523, 587, 659, 784, 880, 988, 1047, 1175];

  function init() {
    if (initialized) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.25;
      masterGain.connect(ctx.destination);
      initialized = true;
    } catch (_) {}
  }

  function ensureRunning() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── SFX ────────────────────────────────────────────────────────────────

  function playLock() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    // Soft thud + click
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + 0.1);
  }

  function playLineClear() {
    if (!ctx) return;
    ensureRunning();
    // Bright ascending sparkle
    var now = ctx.currentTime;
    for (var i = 0; i < 3; i++) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      var t = now + i * 0.06;
      osc.frequency.setValueAtTime(SCALE_HIGH[i + 1], t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain); gain.connect(masterGain);
      osc.start(t); osc.stop(t + 0.2);
    }
  }

  function playChainCombo(level) {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    var pitch = CHAIN_PITCHES[Math.min(level - 1, CHAIN_PITCHES.length - 1)];
    // Rising triumphant tone
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch * 0.5, now);
    osc.frequency.exponentialRampToValueAtTime(pitch, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + 0.4);

    // Harmony
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(pitch * 1.5, now + 0.05);
    gain2.gain.setValueAtTime(0.1, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2); gain2.connect(masterGain);
    osc2.start(now + 0.05); osc2.stop(now + 0.35);
  }

  function playChocolateRumble() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    // Deep rumble with tremolo
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.6);
    lfo.type = 'sine'; lfo.frequency.value = 15;
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain); gain.connect(masterGain);
    lfo.start(now); osc.start(now);
    lfo.stop(now + 0.6); osc.stop(now + 0.6);
  }

  function playGameOver() {
    if (!ctx) return;
    ensureRunning();
    stopMusic();
    var now = ctx.currentTime;
    // Descending doom chord
    [440, 349, 261].forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      var t = now + i * 0.2;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, t + 1.0);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain); gain.connect(masterGain);
      osc.start(t); osc.stop(t + 1.2);
    });
  }

  // ── Whisper (haunted clear) ────────────────────────────────────────────

  function playWhisper(intensity) {
    if (!ctx) return;
    ensureRunning();
    intensity = Math.min(intensity || 1, 4);
    var now = ctx.currentTime;
    var dur = 0.5 + intensity * 0.2;

    // Filtered noise → breathy whisper
    var bufSize = Math.floor(ctx.sampleRate * dur);
    var buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.25;

    var noise = ctx.createBufferSource();
    noise.buffer = buffer;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700 + intensity * 300;
    bp.Q.value = 2 + intensity;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06 * intensity, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(bp); bp.connect(gain); gain.connect(masterGain);
    noise.start(now); noise.stop(now + dur);
  }

  function playScream() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    // Distorted sweep
    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.7);
    var shaper = ctx.createWaveShaper();
    var curve = new Float32Array(256);
    for (var i = 0; i < 256; i++) {
      var x = (i / 128) - 1;
      curve[i] = (Math.PI + 40) * x / (Math.PI + 40 * Math.abs(x));
    }
    shaper.curve = curve;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(shaper); shaper.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + 0.7);
    playWhisper(3);
  }

  function playBassDrop() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + 0.5);
  }

  // ── Stress relief sound ────────────────────────────────────────────────

  function playRelief() {
    if (!ctx) return;
    ensureRunning();
    var now = ctx.currentTime;
    // Bright major chord arpeggio (relief/reward)
    [523, 659, 784].forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      var t = now + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain); gain.connect(masterGain);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  // ── Adaptive Music System ──────────────────────────────────────────────

  function startMusic() {
    if (!ctx || musicPlaying) return;
    ensureRunning();
    musicPlaying = true;
    beatCount = 0;
    currentBPM = 85;
    currentStress = 0;

    // Create gain nodes for each layer
    bassGain = ctx.createGain(); bassGain.gain.value = 0.12; bassGain.connect(masterGain);
    arpGain = ctx.createGain(); arpGain.gain.value = 0.04; arpGain.connect(masterGain);
    padGain = ctx.createGain(); padGain.gain.value = 0.06; padGain.connect(masterGain);
    ambGain = ctx.createGain(); ambGain.gain.value = 0.03; ambGain.connect(masterGain);

    // Start ambient factory drone
    startAmbience();
    // Start beat loop
    scheduleBeat();
  }

  function stopMusic() {
    musicPlaying = false;
    if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
  }

  function startAmbience() {
    if (!ctx || !musicPlaying) return;
    // Low factory drone — evolves slowly
    var osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 55;
    var gain = ctx.createGain();
    gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ambGain);
    osc.start();

    // Detuned second oscillator for thickness
    var osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 55.5; // slight detune
    var gain2 = ctx.createGain();
    gain2.gain.value = 0.05;
    osc2.connect(gain2); gain2.connect(ambGain);
    osc2.start();
  }

  function scheduleBeat() {
    if (!musicPlaying || !ctx) return;
    var now = ctx.currentTime;
    var beatLen = 60 / currentBPM;
    var beat = beatCount % 8;

    // ── Bass line (plays every beat, pattern varies) ──
    var bassNote = SCALE_LOW[beat % SCALE_LOW.length];
    // At high stress, bass gets more erratic
    if (currentStress > 50) {
      bassNote = SCALE_LOW[Math.floor(Math.random() * SCALE_LOW.length)];
    }
    var bassOsc = ctx.createOscillator();
    bassOsc.type = currentStress > 60 ? 'sawtooth' : 'triangle';
    bassOsc.frequency.setValueAtTime(bassNote, now);
    bassOsc.frequency.exponentialRampToValueAtTime(bassNote * 0.8, now + beatLen * 0.8);
    var bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.2, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + beatLen * 0.9);
    bassOsc.connect(bGain); bGain.connect(bassGain);
    bassOsc.start(now); bassOsc.stop(now + beatLen);

    // ── Kick on beats 0, 4 ──
    if (beat === 0 || beat === 4) {
      var kick = ctx.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(150, now);
      kick.frequency.exponentialRampToValueAtTime(35, now + 0.12);
      var kGain = ctx.createGain();
      kGain.gain.setValueAtTime(0.3, now);
      kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      kick.connect(kGain); kGain.connect(bassGain);
      kick.start(now); kick.stop(now + 0.15);
    }

    // ── Hi-hat on off-beats ──
    if (beat % 2 === 1) {
      var hatBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
      var hatData = hatBuf.getChannelData(0);
      for (var h = 0; h < hatData.length; h++) hatData[h] = Math.random() * 2 - 1;
      var hat = ctx.createBufferSource();
      hat.buffer = hatBuf;
      var hatFilt = ctx.createBiquadFilter();
      hatFilt.type = 'highpass'; hatFilt.frequency.value = 7000;
      var hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0.08 + currentStress / 500, now);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      hat.connect(hatFilt); hatFilt.connect(hGain); hGain.connect(bassGain);
      hat.start(now); hat.stop(now + 0.03);
    }

    // ── Arpeggio (plays at stress > 20, gets faster/higher with stress) ──
    if (currentStress > 20 && beat % 2 === 0) {
      var arpNote = SCALE_MID[(beatCount + Math.floor(currentStress / 20)) % SCALE_MID.length];
      var aOsc = ctx.createOscillator();
      aOsc.type = 'square';
      aOsc.frequency.value = arpNote;
      var aGain = ctx.createGain();
      var arpVol = Math.min(currentStress / 200, 0.15);
      aGain.gain.setValueAtTime(arpVol, now);
      aGain.gain.exponentialRampToValueAtTime(0.001, now + beatLen * 0.4);
      aOsc.connect(aGain); aGain.connect(arpGain);
      aOsc.start(now); aOsc.stop(now + beatLen * 0.5);
    }

    // ── Pad chord (stress > 40, adds tension) ──
    if (currentStress > 40 && beat === 0) {
      var padFreqs = [SCALE_LOW[0], SCALE_LOW[2], SCALE_MID[0]];
      if (currentStress > 70) padFreqs.push(SCALE_MID[3]); // add dissonance
      padFreqs.forEach(function(freq) {
        var pOsc = ctx.createOscillator();
        pOsc.type = 'sine';
        pOsc.frequency.value = freq;
        var pGain = ctx.createGain();
        var padVol = Math.min((currentStress - 40) / 400, 0.08);
        pGain.gain.setValueAtTime(padVol, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + beatLen * 7);
        pOsc.connect(pGain); pGain.connect(padGain);
        pOsc.start(now); pOsc.stop(now + beatLen * 8);
      });
    }

    beatCount++;
    beatTimer = setTimeout(scheduleBeat, beatLen * 1000);
  }

  function updateTempo(height) {
    // Height affects base BPM
    var t = Math.min(height / 20, 1);
    currentBPM = 85 + t * 45; // 85-130 BPM
  }

  function updateStress(stress) {
    currentStress = stress;
    // Stress also bumps BPM slightly
    currentBPM = Math.min(currentBPM + stress / 10, 160);

    // Adjust layer volumes based on stress
    if (bassGain) bassGain.gain.value = 0.12 + stress / 500;
    if (arpGain) arpGain.gain.value = 0.04 + stress / 300;
    if (ambGain) ambGain.gain.value = 0.03 + stress / 400;
  }

  return {
    init: init,
    playLineClear: playLineClear,
    playLock: playLock,
    playChainCombo: playChainCombo,
    playChocolateRumble: playChocolateRumble,
    playGameOver: playGameOver,
    playWhisper: playWhisper,
    playScream: playScream,
    playBassDrop: playBassDrop,
    playRelief: playRelief,
    startMusic: startMusic,
    stopMusic: stopMusic,
    updateTempo: updateTempo,
    updateStress: updateStress,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StackyAudio;
}
