(function () {
  'use strict';

  var FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  var TARGET_FRAME_MS = 16.67;
  var AUDIO_BUFFER_MS = 16.67;
  var CLAMP_XY = 80;
  var FRACTURE_OFFSET_MAX = 80;

  var audioCtx = null;
  var rafId = null;
  var lastFrameTime = 0;
  var audioStartTime = 0;
  var driftAccumulator = 0;
  var cycleCount = 0;
  var isFractured = false;
  var fracturePending = false;
  var cells = [];

  var latencyDisplay = document.getElementById('latency-display');
  var driftDisplay = document.getElementById('drift-display');
  var cycleCountDisplay = document.getElementById('cycle-count');

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioStartTime = audioCtx.currentTime;
  }

  function buildSawtooth() {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.35);
  }

  function buildKick() {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.9, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.18);
  }

  function initGrid() {
    cells = Array.from(document.querySelectorAll('.grid-cell'));
  }

  function getFibonacciSpace(index) {
    var fibIndex = index % FIBONACCI.length;
    return FIBONACCI[fibIndex] * 0.9;
  }

  function fractureGrid() {
    isFractured = true;
    fracturePending = false;

    cells.forEach(function (cell, i) {
      var row = parseInt(cell.getAttribute('data-row'), 10);
      var col = parseInt(cell.getAttribute('data-col'), 10);

      var fibX = getFibonacciSpace(col + row);
      var fibY = getFibonacciSpace(col * row);

      var dx = ((Math.random() - 0.5) * 2) * fibX * FRACTURE_OFFSET_MAX;
      var dy = ((Math.random() - 0.5) * 2) * fibY * FRACTURE_OFFSET_MAX;

      dx = Math.max(-CLAMP_XY, Math.min(CLAMP_XY, dx));
      dy = Math.max(-CLAMP_XY, Math.min(CLAMP_XY, dy));

      var scale = 1 + (Math.random() * 0.08 - 0.04);
      var rotation = (Math.random() - 0.5) * 6;

      cell.style.transform = 'translate(' + dx.toFixed(2) + 'px, ' + dy.toFixed(2) + 'px) scale(' + scale.toFixed(3) + ') rotate(' + rotation.toFixed(2) + 'deg)';
      cell.classList.add('fractured');
    });
  }

  function snapbackGrid() {
    isFractured = false;

    cells.forEach(function (cell) {
      cell.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)';
      cell.classList.remove('fractured');
    });
  }

  function playAudioAndScheduleFracture() {
    buildSawtooth();
    buildKick();

    setTimeout(fractureGrid, AUDIO_BUFFER_MS);
    setTimeout(snapbackGrid, AUDIO_BUFFER_MS + 600);
  }

  function renderLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;

    var rAFdelta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (audioCtx) {
      var audioElapsed = (audioCtx.currentTime - audioStartTime) * 1000;
      var expectedFrames = audioElapsed / TARGET_FRAME_MS;
      var drift = (expectedFrames * TARGET_FRAME_MS) - audioElapsed;

      driftAccumulator += (rAFdelta - TARGET_FRAME_MS);

      if (Math.abs(driftAccumulator) >= TARGET_FRAME_MS) {
        driftAccumulator = driftAccumulator >= 0
          ? driftAccumulator - TARGET_FRAME_MS
          : driftAccumulator + TARGET_FRAME_MS;
       }
    }

    if (latencyDisplay) {
      latencyDisplay.textContent = 'LATENCY: ' + rAFdelta.toFixed(2) + 'ms';
     }
    if (driftDisplay) {
      driftDisplay.textContent = 'DRIFT: ' + driftAccumulator.toFixed(2) + 'ms';
     }

    rafId = requestAnimationFrame(renderLoop);
   }

  function triggerDownbeat() {
    if (isFractured) return;

    initAudio();

    playAudioAndScheduleFracture();

    fracturePending = true;
    cycleCount++;

    if (cycleCountDisplay) {
      cycleCountDisplay.textContent = 'CYCLE: ' + cycleCount;
     }
   }

  initGrid();
  rafId = requestAnimationFrame(renderLoop);
})();
