(function () {
   'use strict';

   // ── Config ───────────────────────────────────────────────────
   var COLS = 12, ROWS = 6;
   var TOTAL = COLS * ROWS;
   var BPM = 120;
   var STEP_MS = 60000 / BPM / 4;

   // ── Audio engine ─────────────────────────────────────────────
   var ctx = null;
   var masterGain = null;
   var muted = false;
   var running = false;
   var stepIdx = 0;
   var animId = null;
   var startTime = 0;

   // Tone palette: pentatonic-ish C minor across octaves
   var scale = [130.81, 155.56, 174.61, 196.00, 233.08,
                 261.63, 311.13, 349.23, 392.00, 466.16,
                 523.25, 622.25];

   function ensureAudio() {
     if (!ctx) {
       ctx = new (window.AudioContext || window.webkitAudioContext)();
       masterGain = ctx.createGain();
       masterGain.gain.value = muted ? 0 : 0.3;
       masterGain.connect(ctx.destination);
     }
     if (ctx.state === 'suspended') ctx.resume();
   }

   // Kick drum: low oscillation with fast decay
   function playKick(time) {
     if (muted) return;
     ensureAudio();
     var osc = ctx.createOscillator();
     var env = ctx.createGain();
     osc.type = 'sine';
     osc.frequency.setValueAtTime(150, time);
     osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
     env.gain.setValueAtTime(1, time);
     env.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
     osc.connect(env);
     env.connect(masterGain);
     osc.start(time);
     osc.stop(time + 0.35);
   }

   // Snare: noise + tone
   function playSnare(time) {
     if (muted) return;
     ensureAudio();
     // Noise burst
     var bufSize = ctx.sampleRate * 0.15;
     var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
     var data = buf.getChannelData(0);
     for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
     var src = ctx.createBufferSource();
     src.buffer = buf;
     var filt = ctx.createBiquadFilter();
     filt.type = 'highpass';
     filt.frequency.value = 2000;
     var env = ctx.createGain();
     env.gain.setValueAtTime(0.5, time);
     env.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
     src.connect(filt);
     filt.connect(env);
     env.connect(masterGain);
     src.start(time);
     src.stop(time + 0.18);
     // Tone
     var osc = ctx.createOscillator();
     var env2 = ctx.createGain();
     osc.type = 'triangle';
     osc.frequency.value = 180;
     env2.gain.setValueAtTime(0.4, time);
     env2.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
     osc.connect(env2);
     env2.connect(masterGain);
     osc.start(time);
     osc.stop(time + 0.12);
   }

   // Cell tone: short pluck
   function playCell(row, col, time) {
     if (muted) return;
     ensureAudio();
     var freq = scale[row % scale.length] * (1 + col * 0.02);
     var osc = ctx.createOscillator();
     var env = ctx.createGain();
     osc.type = row % 2 === 0 ? 'triangle' : 'sine';
     osc.frequency.value = freq;
     env.gain.setValueAtTime(0, time);
     env.gain.linearRampToValueAtTime(0.35, time + 0.005);
     env.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
     osc.connect(env);
     env.connect(masterGain);
     osc.start(time);
     osc.stop(time + 0.3);
   }

   // Ambient oscillator hum (continues while running)
   var humOsc = null;
   var humGain = null;
   function startHum() {
     if (muted) return;
     ensureAudio();
     humOsc = ctx.createOscillator();
     humGain = ctx.createGain();
     humOsc.type = 'sine';
     humOsc.frequency.value = 82.41; // E2
     humGain.gain.value = 0.06;
     humOsc.connect(humGain);
     humGain.connect(masterGain);
     humOsc.start();
   }
   function stopHum() {
     if (humOsc) { humOsc.stop(); humOsc = null; }
     if (humGain) { humGain.disconnect(); humGain = null; }
   }

   // Phase callback: schedules audio in advance, fires visual at the right time
   var scheduler = {
     queue: [],
     lookAhead: 0.1,
     interval: 25,
     timer: null,

     schedule: function () {
       var now = ctx.currentTime;
       while (this.queue.length && this.queue[0].time < now + this.lookAhead) {
         var ev = this.queue.shift();
         ev.callback(ev.time);
       }
     },

     tick: function () {
       if (running) {
         var now = ctx ? ctx.currentTime : 0;
         this.schedule();
         var elapsed = now - startTime;
         var phase = (elapsed * BPM / 60) % 1;
         updatePhaseDisplay(phase);
         updateWaveform(phase, elapsed);
         animId = window.requestAnimationFrame(function () {
           scheduler.tick();
         });
       }
     }
   };

   function startScheduler() {
    startTime = ctx ? ctx.currentTime : 0;
    scheduler.tick();
   }


   // ── Visuals ──────────────────────────────────────────────────
   var cells = [];

   function buildGrid() {
     var grid = document.getElementById('grid');
     for (var r = 0; r < ROWS; r++) {
       for (var c = 0; c < COLS; c++) {
         var el = document.createElement('div');
         el.className = 'cell';
         el.dataset.row = r;
         el.dataset.col = c;
         el.setAttribute('role', 'button');
         el.setAttribute('aria-label', 'Cell row ' + (r+1) + ' column ' + (c+1));
         el.addEventListener('click', (function (rr, cc) {
           return function () { triggerCell(rr, cc); };
         })(r, c));
         grid.appendChild(el);
         cells.push(el);
       }
     }
   }

   // Fibonacci-delayed wave sweep from a seed cell
   var fibDels = [0, 30, 50, 80, 130, 210];

   function triggerCell(row, col) {
     ensureAudio();
     if (!running) {
       startSequence();
     }

     var t = ctx.currentTime;
     playCell(row, col, t);

     // Fire the clicked cell
     fireCellAt(row, col, 0);

     // Wave sweep outward via phase callback
     var waveDelay = fibDels[row % fibDels.length];
     setTimeout(function () {
       sweepFrom(row, col);
     }, waveDelay);

     updateCount();
   }

   function fireCellAt(row, col, delay) {
     var el = getCell(row, col);
     if (!el) return;
     setTimeout(function () {
       el.classList.add('fire');
       setTimeout(function () {
         el.classList.remove('fire');
         el.classList.add('glow');
         setTimeout(function () {
           el.classList.remove('glow');
         }, 180);
       }, 100);
     }, delay);
   }

   function getCell(row, col) {
     var idx = row * COLS + col;
     return cells[idx] || null;
   }

   function sweepFrom(row, col) {
     // Sweep outward in concentric diamond pattern
     var steps = Math.max(COLS, ROWS) * 2;
     for (var d = 1; d < steps; d++) {
       setTimeout(function (dist) {
        var ring = [];
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var dd = Math.abs(r - row) + Math.abs(c - col);
            if (dd === dist) ring.push({ row: r, col: c });
          }
        }
        ring.forEach(function (cell) {
         fireCellAt(cell.row, cell.col, 0);
         if (ctx && !muted) {
          playCell(cell.row, cell.col, ctx.currentTime);
         }
        });
       }, d * STEP_MS * 0.4, d);
     }
   }

   function startSequence() {
     running = true;
     stepIdx = 0;
     startHum();
     document.getElementById('status').textContent = 'sync locked';
     document.getElementById('toggle').textContent = '⏹ Stop';
   }

   function stopSequence() {
     running = false;
     stopHum();
     if (animId) window.cancelAnimationFrame(animId);
     document.getElementById('status').textContent = 'idle';
     document.getElementById('toggle').textContent = '▶ Trigger';
     // Reset all cells
     cells.forEach(function (el) {
       el.classList.remove('fire', 'glow');
     });
   }

   function updateCount() {
     var fired = cells.filter(function (el) {
       return el.classList.contains('fire') || el.classList.contains('glow');
     }).length;
     document.getElementById('count-label').textContent = fired + ' / ' + TOTAL;
   }

   function updatePhaseDisplay(phase) {
     document.getElementById('phase-display').textContent = phase.toFixed(2);
   }

   // Waveform canvas: draws the phase wave
   var waveCanvas, waveCtx;
   function initWaveform() {
     waveCanvas = document.getElementById('waveform');
     var dpr = window.devicePixelRatio || 1;
     var rect = waveCanvas.getBoundingClientRect();
     waveCanvas.width = rect.width * dpr;
     waveCanvas.height = rect.height * dpr;
     waveCtx = waveCanvas.getContext('2d');
     waveCtx.scale(dpr, dpr);
   }

   function updateWaveform(phase, elapsed) {
     if (!waveCtx) return;
     var w = waveCanvas.getBoundingClientRect().width;
     var h = waveCanvas.getBoundingClientRect().height;
     waveCtx.clearRect(0, 0, w, h);

     // Draw sine wave
     waveCtx.beginPath();
     for (var x = 0; x < w; x++) {
         var t = x / w;
         // Multi-layer wave: combine kick envelope + sustained hum + cell activity
         var base = Math.sin(t * Math.PI * 2 * 3 + elapsed * 4);
         var kick = Math.max(0, Math.sin(t * Math.PI * 2 + elapsed * 8)) * 0.3;
         var cellNoise = computeCellEnergy();
         var y = h / 2 + (base * 0.2 + kick * 0.15 + cellNoise * 0.15) * h;
         if (x === 0) waveCtx.moveTo(x, y);
         else waveCtx.lineTo(x, y);
       }
     var grad = waveCtx.createLinearGradient(0, 0, w, 0);
     grad.addColorStop(0, 'rgba(253,224,71,0.6)');
     grad.addColorStop(0.5, 'rgba(103,232,249,0.6)');
     grad.addColorStop(1, 'rgba(251,113,133,0.6)');
     waveCtx.strokeStyle = grad;
     waveCtx.lineWidth = 1.5;
     waveCtx.stroke();

     // Phase marker
     var px = phase * w;
     waveCtx.beginPath();
     waveCtx.moveTo(px, 0);
     waveCtx.lineTo(px, h);
     waveCtx.strokeStyle = 'rgba(253,224,71,0.3)';
     waveCtx.lineWidth = 1;
     waveCtx.stroke();
   }

   function computeCellEnergy() {
     var active = cells.filter(function (el) {
       return el.classList.contains('fire');
     }).length;
     return active / TOTAL;
   }

   // ── Resize handling ──────────────────────────────────────────
   function resizeWaveform() {
     if (waveCanvas) {
       initWaveform();
     }
   }

   // ── Init ─────────────────────────────────────────────────────
   function init() {
     buildGrid();
     initWaveform();
     window.addEventListener('resize', resizeWaveform);

     // Toggle button: start / stop
     document.getElementById('toggle').addEventListener('click', function () {
       ensureAudio();
       if (running) {
         stopSequence();
       } else {
         // Auto-trigger a sweep from a random cell
         startSequence();
         autoSweep();
       }
     });

     // Mute button
     document.getElementById('mute-btn').addEventListener('click', function () {
       muted = !muted;
       this.textContent = muted ? '♪' : '♫';
       this.title = muted ? 'Unmute' : 'Mute';
       if (masterGain) {
         masterGain.gain.value = muted ? 0 : 0.3;
       }
     });
   }

   function autoSweep() {
     if (!running) return;
     var row = Math.floor(Math.random() * ROWS);
     var col = Math.floor(Math.random() * COLS);
     triggerCell(row, col);
     if (running) {
       setTimeout(function () { autoSweep(); }, STEP_MS * 8);
     }
   }

   if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', init);
   } else {
     init();
   }
})();
