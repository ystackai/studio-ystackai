(() => {
   const canvas = document.getElementById('grid');
   const ctx = canvas.getContext('2d');
   const clampBtn = document.getElementById('clamp');
   const muteBtn = document.getElementById('mute');
   const phaseFill = document.getElementById('phase-bar');

   // --- Config ---
   const CELL = 12;
   const COLS = 20;
   const ROWS = 20;
   const W = CELL * COLS;
   const H = CELL * ROWS;
   canvas.width = W;
   canvas.height = H;

   // --- State ---
   let grid = new Float32Array(COLS * ROWS);
   let phase = 0;
   let muted = false;
   let ac, gain, lfo, lfoGain;
   let clamped = false;
   let clampTimer = null;
   let rafId = null;

   // --- Audio init (guarded for Safari) ---
   function initAudio() {
      if (ac) return;
      ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();

      gain = ac.createGain();
      gain.gain.value = muted ? 0 : 0.25;
      gain.connect(ac.destination);

      lfo = ac.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5;
      lfoGain = ac.createGain();
      lfoGain.gain.value = 40;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
   }

   function tone(freq, dur, vol = 0.15) {
      if (!ac || muted) return;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g);
      g.connect(ac.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.start(ac.currentTime);
      o.stop(ac.currentTime + dur);
   }

   // --- Wave tap ---
   canvas.addEventListener('pointerdown', (e) => {
      initAudio();
      const rect = canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width;
      const sy = (e.clientY - rect.top) / rect.height;
      const cx = Math.floor(sx * COLS);
      const cy = Math.floor(sy * ROWS);
      for (let i = 0; i < 9; i++) {
         const r = i * 0.7;
         const t = i * 0.08;
         ring(cx, cy, r, 1.2 - r * 0.3, t);
      }
      tone(520 + phase * 200, 0.15, 0.12);
   });

   function ring(cx, cy, rad, amp, delay) {
      setTimeout(() => {
         for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
               const d = Math.hypot(x - cx, y - cy);
               if (Math.abs(d - rad) < 1.5) {
                  const i = y * COLS + x;
                  grid[i] = Math.min(1, Math.max(-1, grid[i] + amp * (0.5 - Math.abs(d - rad))));
               }
            }
         }
      }, delay * 1000);
   }

   // --- Clamp ---
   clampBtn.addEventListener('click', () => {
      initAudio();
      if (clamped) return;
      clamped = true;
      clampBtn.classList.add('clamped');

      for (let i = 0; i < grid.length; i++) {
         const x = i % COLS;
         const y = Math.floor(i / COLS);
         grid[i] = Math.sin(x / COLS * Math.PI * 3 + phase) *
                     Math.cos(y / ROWS * Math.PI * 2 + phase * 0.7) * 0.9;
      }

      tone(130.81, 0.6, 0.2);
      tone(196, 0.4, 0.1);
      setTimeout(() => tone(261.63, 0.3, 0.08), 100);

      clampTimer = setTimeout(() => {
         clamped = false;
         clampBtn.classList.remove('clamped');
         for (let i = 0; i < grid.length; i++) grid[i] *= 0.3;
      }, 1400);
   });

   // --- Mute ---
   muteBtn.addEventListener('click', () => {
      muted = !muted;
      muteBtn.textContent = muted ? '🔇' : '🔊';
      if (gain) gain.gain.value = muted ? 0 : 0.25;
   });

   // --- Render ---
   function render() {
      phase += 0.012;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);

      let intensity = 0;
      for (let y = 0; y < ROWS; y++) {
         for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            grid[i] *= 0.97;
            grid[i] += Math.sin(x * 0.3 + phase) * Math.cos(y * 0.2 + phase * 0.6) * 0.003;
            const v = (grid[i] + 1) / 2;
            intensity += v;

            const r = Math.floor(20 + v * 235);
            const g = Math.floor(20 + v * 40);
            const b = Math.floor(30 + v * 30);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            const px = x * CELL;
            const py = y * CELL;
            const pad = 1;
            ctx.fillRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2);
         }
      }

      const pct = Math.min(100, (intensity / grid.length) * 130);
      if (phaseFill) phaseFill.innerHTML = `<div id="phase-fill" style="width:${pct}%"></div>`;

      rafId = requestAnimationFrame(render);
   }

   render();
})();
