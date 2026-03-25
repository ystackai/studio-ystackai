/**
 * StackY Renderer — connects StackyGame engine to canvas display.
 *
 * Features: particles, screen shake, gravity echoes, stress scars,
 *           Oompa Loompa commentary, screen glitch on big clears.
 *
 * Depends on: pieces.js (StackyPieces), game.js (StackyGame),
 *             input.js (StackyInput), audio.js (StackyAudio)
 */
'use strict';

(function () {

  var P = StackyPieces;
  var CANVAS_W = 300;
  var CANVAS_H = 600;
  var CELL = CANVAS_W / P.COLS;

  var PIECE_COLORS = StackyPieces.CANDY_COLORS.slice();
  PIECE_COLORS[StackyGame.CHOCOLATE_CELL] = StackyPieces.CHOCOLATE_COLOR;

  var GHOST_ALPHA = 0.2;

  // ── Canvas setup ───────────────────────────────────────────────────────

  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  canvas.style.width = CANVAS_W + 'px';
  canvas.style.height = CANVAS_H + 'px';
  ctx.scale(dpr, dpr);

  var holdCanvas = document.getElementById('hold-canvas');
  var holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;
  var nextCanvas = document.getElementById('next-canvas');
  var nextCtx = nextCanvas.getContext('2d');

  function setupSmallCanvas(c, cx) {
    var w = c.width; var h = c.height;
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    cx.scale(dpr, dpr);
    return { w: w, h: h };
  }
  var holdSize = holdCanvas ? setupSmallCanvas(holdCanvas, holdCtx) : {w:0,h:0};
  var nextSize = setupSmallCanvas(nextCanvas, nextCtx);

  // ── Responsive scaling ─────────────────────────────────────────────────

  var wrapper = document.getElementById('canvas-wrapper');
  function applyResponsiveScale() {
    var available = window.innerWidth * 0.55;
    var scale = available < CANVAS_W ? available / CANVAS_W : 1;
    wrapper.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
    wrapper.style.marginBottom = scale < 1 ? (CANVAS_H * scale - CANVAS_H) + 'px' : '';
  }

  // ── UI refs ────────────────────────────────────────────────────────────

  var scoreEl = document.getElementById('score-display');
  var hiEl = document.getElementById('hi-display');
  var levelEl = document.getElementById('level-display');
  var linesEl = document.getElementById('lines-display');
  var splashEl = document.getElementById('overlay-splash');
  var pausedEl = document.getElementById('overlay-paused');
  var gameoverEl = document.getElementById('overlay-gameover');
  var goScoreEl = document.getElementById('go-score');
  var goHiEl = document.getElementById('go-hi');
  var btnStart = document.getElementById('btn-start');
  var btnRestart = document.getElementById('btn-restart');

  // ── Particle system ────────────────────────────────────────────────────

  var particles = [];
  var GOLDEN_COLORS = ['#fbbf24', '#f59e0b', '#fde047', '#fff7ed', '#d97706'];
  var CANDY_PARTICLE_COLORS = ['#c084fc', '#fbbf24', '#34d399', '#f87171', '#f472b6', '#a78bfa', '#22d3ee'];

  function spawnParticles(x, y, count, isGolden, tint, spread) {
    var colors = isGolden ? GOLDEN_COLORS : CANDY_PARTICLE_COLORS;
    if (tint) colors = [tint].concat(colors);
    spread = spread || CELL * 0.9;
    for (var i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.5,
        vx: (Math.random() - 0.5) * (isGolden ? 10 : 7),
        vy: (Math.random() - 0.8) * (isGolden ? 8 : 6),
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.008 + Math.random() * 0.01,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.vx *= 0.98;  // friction
      p.life -= p.decay;
      p.rotation += p.rotSpeed;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function renderParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  // ── Screen shake ───────────────────────────────────────────────────────

  var shakeIntensity = 0;
  var shakeDecay = 0.9;

  function triggerShake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
  }

  function getShakeOffset() {
    var ox = 0, oy = 0;
    // Event-driven shake
    if (shakeIntensity >= 0.1) {
      ox += (Math.random() - 0.5) * shakeIntensity * 2;
      oy += (Math.random() - 0.5) * shakeIntensity * 2;
      shakeIntensity *= shakeDecay;
    } else {
      shakeIntensity = 0;
    }
    // Continuous stress wobble
    var stress = state.stress || 0;
    if (stress > 20) {
      var wobbleAmp = (stress - 20) / 80 * 2; // 0-2px at max stress
      var t = Date.now() / 200;
      ox += Math.sin(t * 1.7) * wobbleAmp;
      oy += Math.cos(t * 2.3) * wobbleAmp * 0.5;
    }
    var lean = getTowerLean();
    ox += lean * (1 + stress / 120);
    oy += Math.sin(Date.now() / 150) * Math.abs(lean) * 0.3;
    return {x: ox, y: oy};
  }

  // ── Glitch effect ──────────────────────────────────────────────────────

  var glitchTimer = 0;

  function triggerGlitch(frames) {
    glitchTimer = Math.max(glitchTimer, frames || 12);
    if (canvas.parentElement) {
      canvas.parentElement.classList.add('glitch-flash');
      setTimeout(function() {
        canvas.parentElement.classList.remove('glitch-flash');
      }, 200 + ((frames || 12) * 6));
    }
  }

  function getTowerLean() {
    var totalWeight = 0;
    var weightedCenter = 0;
    var mid = (P.COLS - 1) / 2;

    for (var row = 0; row < P.ROWS; row++) {
      if (!state.grid[row]) continue;
      for (var col = 0; col < P.COLS; col++) {
        if (state.grid[row][col] === 0) continue;
        var weight = 1 + ((P.ROWS - row) / P.ROWS);
        if (state.grid[row][col] === StackyGame.CHOCOLATE_CELL) weight *= 0.7;
        totalWeight += weight;
        weightedCenter += (col - mid) * weight;
      }
    }

    for (var ei = 0; ei < state.echoTrail.length; ei++) {
      var echo = state.echoTrail[ei];
      var echoWeight = (echo.ttl / echo.maxTtl) * 0.2;
      for (var ec = 0; ec < echo.cells.length; ec++) {
        weightedCenter += (echo.cells[ec].x - mid) * echoWeight;
        totalWeight += echoWeight * 0.5;
      }
    }

    if (totalWeight === 0) return 0;
    return Math.max(-2.25, Math.min(2.25, weightedCenter / totalWeight));
  }

  // ── Game state + loop ──────────────────────────────────────────────────

  var state = StackyGame.createState();
  var rafId = null;
  var inputCleanup = null;
  var prevLines = 0;
  var prevChocolateRows = 0;
  var musicStarted = false;
  var lastBassDropTime = 0;

  hiEl.textContent = String(state.hi);

  // Stress meter UI
  var stressEl = document.getElementById('stress-display');

  function updateScoreUI() {
    scoreEl.textContent = String(state.score);
    hiEl.textContent = String(state.hi);
    levelEl.textContent = String(state.level);
    linesEl.textContent = String(state.chainsTotal || 0);
    if (stressEl) {
      var stress = state.stress || 0;
      stressEl.textContent = String(Math.round(stress));
      stressEl.style.color = stress > 70 ? '#ef4444' : stress > 40 ? '#f59e0b' : '#22c55e';
    }
  }

  function startGame() {
    StackyAudio.init();
    splashEl.classList.add('hidden');
    gameoverEl.classList.add('hidden');
    pausedEl.classList.add('hidden');
    StackyGame.start(state);
    prevLines = 0;
    prevChocolateRows = 0;
    particles = [];
    shakeIntensity = 0;
    glitchTimer = 0;
    musicStarted = false;
    lastBassDropTime = 0;
    updateScoreUI();
    startLoop();
    // Start adaptive music
    StackyAudio.startMusic();
    musicStarted = true;
  }

  function restartGame() { startGame(); }

  // ── RAF loop ───────────────────────────────────────────────────────────

  var lastTs = null;

  function startLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    lastTs = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    lastTs = null;
  }

  function loop(ts) {
    if (lastTs === null) lastTs = ts;

    StackyGame.tick(state, ts);

    // Process game events
    var events = state._events || [];
    state._events = [];
    for (var ei = 0; ei < events.length; ei++) {
      var evt = events[ei];
      switch (evt.type) {
        case 'lineClear':
          StackyAudio.playLineClear();
          var isGolden = !!(evt.data && evt.data.golden);
          var clearedCells = evt.data && evt.data.cells ? evt.data.cells : [];
          var affectedRows = evt.data && evt.data.affectedRows ? evt.data.affectedRows : [];
          if (clearedCells.length > 0) {
            for (var lc = 0; lc < clearedCells.length; lc++) {
              var burstCell = clearedCells[lc];
              var tint = PIECE_COLORS[burstCell.color] || null;
              spawnParticles(
                burstCell.x * CELL + CELL / 2,
                burstCell.y * CELL + CELL / 2,
                isGolden ? 12 : 6,
                isGolden,
                tint,
                CELL * 0.9
              );
            }
          } else {
            for (var lr = 0; lr < affectedRows.length; lr++) {
              spawnParticles(CANVAS_W / 2, affectedRows[lr] * CELL + CELL / 2, isGolden ? 30 : 14, isGolden, null, CANVAS_W * 0.7);
            }
          }
          triggerShake(1.6 + ((evt.data && evt.data.intensity) || 1) * 0.75);
          triggerGlitch(6 + (((evt.data && evt.data.intensity) || 1) * 2));
          break;
        case 'whisper':
          StackyAudio.playWhisper(evt.data ? evt.data.intensity : 1);
          break;
        case 'scream':
          StackyAudio.playScream();
          triggerGlitch(16);
          triggerShake(8 + ((evt.data && evt.data.intensity) || 0));
          break;
        case 'shake':
          triggerShake(evt.data.intensity);
          break;
        case 'explosion':
          spawnParticles(
            evt.data.x,
            evt.data.y,
            Math.min(80, evt.data.size * 8),
            evt.data.size >= 10,
            PIECE_COLORS[evt.data.color] || null,
            CELL * (1 + evt.data.size * 0.08)
          );
          break;
        case 'chocolateRise':
          StackyAudio.playChocolateRumble();
          prevChocolateRows = state.chocolateRowsRisen;
          break;
        case 'heightUpdate':
          if (musicStarted) StackyAudio.updateTempo(evt.data.height);
          break;
        case 'stressUpdate':
          if (musicStarted) StackyAudio.updateStress(evt.data.stress);
          break;
        case 'chain':
          break;
        case 'chainCombo':
          StackyAudio.playChainCombo(evt.data.level);
          break;
        case 'goldenTicket':
          StackyAudio.playRelief();
          for (var gt = 0; gt < 24; gt++) {
            spawnParticles(Math.random() * CANVAS_W, -8, 1, true, null, 18);
          }
          break;
        case 'nearCollapse':
          var now = ts || Date.now();
          if (now - lastBassDropTime > 5000) {
            StackyAudio.playBassDrop();
            lastBassDropTime = now;
          }
          break;
        case 'gameOver':
          StackyAudio.playGameOver();
          onGameOver();
          draw();
          StackyGame.syncGameState(state);
          return;
        case 'commentary':
          // Already added to state.commentary by game.js
          break;
        case 'drift':
          triggerShake(2 + Math.abs(evt.data.dir || 0) * 0.8);
          break;
      }
    }

    // Legacy audio triggers (chocolate that doesn't go through events)
    if (state.chocolateRowsRisen > prevChocolateRows && events.every(function(e){return e.type !== 'chocolateRise';})) {
      StackyAudio.playChocolateRumble();
      prevChocolateRows = state.chocolateRowsRisen;
    }

    if (state.phase === 'gameOver') {
      StackyAudio.playGameOver();
      onGameOver();
      draw();
      StackyGame.syncGameState(state);
      return;
    }

    if (state.phase === 'paused') {
      pausedEl.classList.remove('hidden');
      draw();
      StackyGame.syncGameState(state);
      rafId = requestAnimationFrame(loop);
      return;
    }

    pausedEl.classList.add('hidden');
    updateParticles();
    if (glitchTimer > 0) glitchTimer--;
    updateScoreUI();
    draw();
    drawOompaLoompa();
    drawNextPanel();
    StackyGame.syncGameState(state);

    lastTs = ts;
    rafId = requestAnimationFrame(loop);
  }

  function onGameOver() {
    goScoreEl.textContent = String(state.score);
    goHiEl.textContent = String(state.hi);
    gameoverEl.classList.remove('hidden');
    stopLoop();
    StackyAudio.stopMusic();
  }

  // ── Rendering ──────────────────────────────────────────────────────────

  // Load factory background
  var bgImage = new Image();
  bgImage.src = 'assets/bg-factory.jpg';
  var bgLoaded = false;
  bgImage.onload = function() { bgLoaded = true; };

  function draw() {
    try { _drawInner(); } catch(e) { console.error('draw error:', e.message, e.stack); }
  }
  function _drawInner() {
    var shake = getShakeOffset();
    var towerLean = getTowerLean() * (0.01 + (state.stress || 0) / 9000);

    ctx.save();
    ctx.translate(shake.x, shake.y);
    if (Math.abs(towerLean) > 0.001) {
      ctx.translate(CANVAS_W / 2, CANVAS_H * 0.8);
      ctx.rotate(towerLean);
      ctx.translate(-CANVAS_W / 2, -CANVAS_H * 0.8);
    }

    // Factory background — dark, atmospheric
    if (bgLoaded) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(bgImage, -5, -5, CANVAS_W + 10, CANVAS_H + 10);
      ctx.globalAlpha = 1;
      // Dark overlay for readability
      ctx.fillStyle = 'rgba(13,10,20,0.75)';
      ctx.fillRect(-5, -5, CANVAS_W + 10, CANVAS_H + 10);
    } else {
      ctx.fillStyle = '#0d0a14';
      ctx.fillRect(-5, -5, CANVAS_W + 10, CANVAS_H + 10);
    }

    // Conveyor belt grid — subtle diagonal hatching instead of Tetris grid lines
    ctx.strokeStyle = 'rgba(139,92,246,0.04)';
    ctx.lineWidth = 0.5;
    for (var d = -CANVAS_H; d < CANVAS_W + CANVAS_H; d += 15) {
      ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + CANVAS_H, CANVAS_H); ctx.stroke();
    }

    // Gravity echoes (ghost afterimages)
    for (var ge = 0; ge < state.echoTrail.length; ge++) {
      var echo = state.echoTrail[ge];
      var echoAlpha = 0.15 * (echo.ttl / echo.maxTtl);
      for (var ec = 0; ec < echo.cells.length; ec++) {
        var eCell = echo.cells[ec];
        if (eCell.y >= 0 && eCell.y < P.ROWS) {
          drawCell(ctx, eCell.x, eCell.y, PIECE_COLORS[echo.colorIndex], echoAlpha);
        }
      }
    }

    // Locked blocks + stress scars
    for (var row = 0; row < P.ROWS; row++) {
      if (!state.grid[row]) continue;
      for (var col = 0; col < P.COLS; col++) {
        var cellVal = state.grid[row][col];
        if (cellVal !== 0) {
          var cellColor = PIECE_COLORS[cellVal] || '#888';
          if (cellVal === StackyGame.CHOCOLATE_CELL) {
            drawChocolateCell(ctx, col, row);
          } else {
            drawCell(ctx, col, row, cellColor, 1);
          }
          // Draw stress scars
          var stress = (state.stressGrid && state.stressGrid[row]) ? (state.stressGrid[row][col] || 0) : 0;
          if (stress > 0) {
            drawScar(ctx, col, row, stress);
          }
        }
      }
    }

    // Ghost piece
    if (state.activePiece && state.phase === 'playing') {
      var ghostY = StackyGame.getGhostY(state);
      var ghostPiece = {
        type: state.activePiece.type,
        rotation: state.activePiece.rotation,
        x: state.activePiece.x,
        y: ghostY,
      };
      var ghostCells = StackyPieces.getCells(ghostPiece);
      var colorIdx = StackyPieces.TYPES.indexOf(state.activePiece.type) + 1;
      for (var gi = 0; gi < ghostCells.length; gi++) {
        var gc = ghostCells[gi];
        if (gc.y >= 0) drawCell(ctx, gc.x, gc.y, PIECE_COLORS[colorIdx], GHOST_ALPHA);
      }
    }

    // Active piece
    if (state.activePiece) {
      var cells = StackyPieces.getCells(state.activePiece);
      var ci = StackyPieces.TYPES.indexOf(state.activePiece.type) + 1;
      for (var j = 0; j < cells.length; j++) {
        var c = cells[j];
        if (c.y >= 0) drawCell(ctx, c.x, c.y, PIECE_COLORS[ci], 1);
      }
    }

    // Matched cell highlights (pulse before explosion)
    if (state._matchedCells && state._matchedCells.length > 0) {
      // Dim the rest of the board
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Bright pulse on matched cells
      var pulse = 0.7 + Math.sin(Date.now() / 80) * 0.3;
      for (var mi = 0; mi < state._matchedCells.length; mi++) {
        var mc = state._matchedCells[mi];
        var matchColor = PIECE_COLORS[mc.color] || '#fff';
        drawCell(ctx, mc.x, mc.y, matchColor, pulse);
        // Glow
        ctx.save();
        ctx.globalAlpha = pulse * 0.4;
        ctx.fillStyle = '#fff';
        ctx.fillRect(mc.x * CELL, mc.y * CELL, CELL, CELL);
        ctx.restore();
      }
    }

    // Particles
    renderParticles();

    // Commentary text
    renderCommentary();

    // Glitch overlay
    if (glitchTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#fff';
      // Random horizontal slices
      for (var sl = 0; sl < 5; sl++) {
        var sy = Math.random() * CANVAS_H;
        var sh = 2 + Math.random() * 8;
        var sx = (Math.random() - 0.5) * 20;
        ctx.fillRect(sx, sy, CANVAS_W, sh);
      }
      ctx.restore();
    }

    ctx.restore(); // undo shake translate
  }

  function drawCell(context, col, row, color, alpha) {
    var x = col * CELL;
    var y = row * CELL;
    var inset = 1.5;
    var r = 4; // corner radius — candy pill shape
    var w = CELL - inset * 2;
    var h = CELL - inset * 2;
    var cx = x + inset;
    var cy = y + inset;

    context.save();
    context.globalAlpha = alpha;

    // Rounded candy block
    context.beginPath();
    context.moveTo(cx + r, cy);
    context.arcTo(cx + w, cy, cx + w, cy + h, r);
    context.arcTo(cx + w, cy + h, cx, cy + h, r);
    context.arcTo(cx, cy + h, cx, cy, r);
    context.arcTo(cx, cy, cx + w, cy, r);
    context.closePath();
    context.fillStyle = color;
    context.fill();

    // Candy shine — top-left radial gradient
    var grad = context.createRadialGradient(cx + w * 0.3, cy + h * 0.25, 1, cx + w * 0.5, cy + h * 0.5, w * 0.7);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = grad;
    context.fill();

    // Bottom-right shadow
    context.beginPath();
    context.moveTo(cx + r, cy + h);
    context.arcTo(cx + w, cy + h, cx + w, cy, r);
    context.arcTo(cx + w, cy, cx, cy, r);
    context.lineTo(cx + w - 3, cy + 3);
    context.arcTo(cx + w - 3, cy + h - 3, cx + 3, cy + h - 3, r - 1);
    context.closePath();
    context.fillStyle = 'rgba(0,0,0,0.2)';
    context.fill();

    context.restore();
  }

  // ── Stress scars ───────────────────────────────────────────────────────

  function drawScar(context, col, row, stress) {
    var x = col * CELL;
    var y = row * CELL;
    context.save();
    context.globalAlpha = Math.min(stress * 0.15, 0.6);
    context.strokeStyle = '#000';
    context.lineWidth = 0.5;
    // Diagonal crack lines — more cracks at higher stress
    for (var s = 0; s < Math.min(stress, 3); s++) {
      var x1 = x + 3 + s * 8;
      var y1 = y + 2;
      var x2 = x + CELL - 5 - s * 3;
      var y2 = y + CELL - 3;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x1 + 4, y1 + CELL * 0.4);
      context.lineTo(x2, y2);
      context.stroke();
    }
    // Discoloration overlay at high stress
    if (stress >= 3) {
      context.fillStyle = 'rgba(80,40,20,0.3)';
      context.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    }
    context.restore();
  }

  // ── Chocolate cell ──────────────────────────────────────────────────────

  function drawChocolateCell(context, col, row) {
    var x = col * CELL;
    var y = row * CELL;
    var inset = 1.5;
    var r = 4;
    var w = CELL - inset * 2;
    var h = CELL - inset * 2;
    var cx = x + inset;
    var cy = y + inset;

    context.save();
    // Brown base
    context.beginPath();
    context.moveTo(cx + r, cy);
    context.arcTo(cx + w, cy, cx + w, cy + h, r);
    context.arcTo(cx + w, cy + h, cx, cy + h, r);
    context.arcTo(cx, cy + h, cx, cy, r);
    context.arcTo(cx, cy, cx + w, cy, r);
    context.closePath();
    context.fillStyle = '#5c3317';
    context.fill();

    // Diagonal chocolate stripe pattern
    context.clip();
    context.strokeStyle = 'rgba(92,51,23,0.8)';
    context.lineWidth = 2;
    for (var d = -CELL; d < CELL * 2; d += 6) {
      context.beginPath();
      context.moveTo(cx + d, cy);
      context.lineTo(cx + d + CELL, cy + CELL);
      context.stroke();
    }

    // Glossy chocolate shine
    var grad = context.createLinearGradient(cx, cy, cx, cy + h);
    grad.addColorStop(0, 'rgba(255,200,150,0.25)');
    grad.addColorStop(0.3, 'rgba(255,200,150,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    context.fillStyle = grad;
    context.fillRect(cx, cy, w, h);

    context.restore();
  }

  // ── Oompa Loompa stress indicator ──────────────────────────────────────

  var oompaImages = [];
  var oompaLevels = ['calm', 'nervous', 'worried', 'panic', 'scream'];
  var oompaLoaded = 0;
  for (var oi = 0; oi < oompaLevels.length; oi++) {
    var img = new Image();
    img.src = 'assets/oompa-' + oompaLevels[oi] + '.png';
    img.onload = function() { oompaLoaded++; };
    oompaImages.push(img);
  }

  function drawOompaLoompa() {
    if (oompaLoaded === 0) return;
    var stress = state.stress || 0;
    var idx = stress < 20 ? 0 : stress < 40 ? 1 : stress < 60 ? 2 : stress < 80 ? 3 : 4;
    var img = oompaImages[Math.min(idx, oompaImages.length - 1)];
    if (!img || !img.complete) return;
    var panel = document.getElementById('oompa-panel');
    if (!panel) return;
    var oompaCanvas = document.getElementById('oompa-canvas');
    if (!oompaCanvas) return;
    var octx = oompaCanvas.getContext('2d');
    octx.clearRect(0, 0, oompaCanvas.width, oompaCanvas.height);
    // Draw centered
    var scale = Math.min(oompaCanvas.width / img.width, oompaCanvas.height / img.height) * 0.9;
    var dw = img.width * scale;
    var dh = img.height * scale;
    var dx = (oompaCanvas.width - dw) / 2;
    var dy = (oompaCanvas.height - dh) / 2;
    octx.drawImage(img, dx, dy, dw, dh);
  }

  // ── Commentary text ────────────────────────────────────────────────────

  function renderCommentary() {
    for (var ci = 0; ci < state.commentary.length; ci++) {
      var c = state.commentary[ci];
      var alpha = Math.min(c.ttl / 30, 1);
      var kind = c.kind || 'warning';
      var fill = '#fbbf24';
      if (kind === 'regret') fill = '#f5d0fe';
      else if (kind === 'panic') fill = '#fb7185';
      else if (kind === 'good') fill = '#fde047';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.font = kind === 'regret' ? '800 12px "Trebuchet MS", sans-serif' : 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = kind === 'regret' ? 'rgba(192,132,252,0.9)' : 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = kind === 'regret' ? 10 : 4;
      var jitter = kind === 'regret' ? (Math.random() - 0.5) * 2.5 : 0;
      ctx.fillText(c.text, c.x + jitter, c.y);
      if (kind === 'regret') {
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = '#fff7ed';
        ctx.fillText(c.text, c.x - jitter * 2, c.y + 1);
      }
      ctx.restore();
    }
  }

  // ── Side panels ────────────────────────────────────────────────────────

  function drawPiecePreview(context, size, type) {
    context.clearRect(0, 0, size.w, size.h);
    context.fillStyle = '#1a1a2e';
    context.fillRect(0, 0, size.w, size.h);
    if (!type) return;
    var piece = { type: type, rotation: 0, x: 0, y: 0 };
    var cells = StackyPieces.getCells(piece);
    var colorIdx = StackyPieces.TYPES.indexOf(type) + 1;
    var minX = 99, maxX = -1, minY = 99, maxY = -1;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].x < minX) minX = cells[i].x;
      if (cells[i].x > maxX) maxX = cells[i].x;
      if (cells[i].y < minY) minY = cells[i].y;
      if (cells[i].y > maxY) maxY = cells[i].y;
    }
    var pw = maxX - minX + 1;
    var ph = maxY - minY + 1;
    var cellSize = Math.min((size.w - 20) / pw, (size.h - 20) / ph, 20);
    var offsetX = (size.w - pw * cellSize) / 2;
    var offsetY = (size.h - ph * cellSize) / 2;
    for (var j = 0; j < cells.length; j++) {
      var cx = offsetX + (cells[j].x - minX) * cellSize;
      var cy = offsetY + (cells[j].y - minY) * cellSize;
      context.fillStyle = PIECE_COLORS[colorIdx];
      context.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
      context.fillStyle = 'rgba(255,255,255,0.2)';
      context.fillRect(cx + 1, cy + 1, cellSize - 2, 2);
    }
  }

  function drawHoldPanel() { if (holdCtx) drawPiecePreview(holdCtx, holdSize, state.heldPiece); }
  function drawNextPanel() { drawPiecePreview(nextCtx, nextSize, state.nextPiece); }

  // ── Input setup ────────────────────────────────────────────────────────

  function handleStateChange() {
    updateScoreUI();
    draw();
    drawOompaLoompa();
    drawNextPanel();
    StackyGame.syncGameState(state);
    if (state.phase === 'gameOver') onGameOver();
    else if (state.phase === 'paused') pausedEl.classList.remove('hidden');
    else if (state.phase === 'playing') pausedEl.classList.add('hidden');
  }

  inputCleanup = StackyInput.attach(state, {
    onStart: startGame,
    onRestart: restartGame,
    onStateChange: handleStateChange,
  });

  btnStart.addEventListener('click', function () { startGame(); });
  btnRestart.addEventListener('click', function () { restartGame(); });

  // ── Responsive ─────────────────────────────────────────────────────────

  window.addEventListener('resize', applyResponsiveScale);
  applyResponsiveScale();

  // ── Cleanup ────────────────────────────────────────────────────────────

  function cleanup() {
    stopLoop();
    StackyAudio.stopMusic();
    if (inputCleanup) { inputCleanup(); inputCleanup = null; }
    window.removeEventListener('resize', applyResponsiveScale);
    state.phase = 'idle';
    state.alive = true;
    StackyGame.syncGameState(state);
    window._stackyInitialized = false;
  }

  if (typeof window.stackyDestroy === 'function' && window._stackyInitialized) {
    window.stackyDestroy();
  }
  window.stackyDestroy = cleanup;
  window._stackyInitialized = true;
  window.addEventListener('beforeunload', cleanup);

  // ── Initial state ──────────────────────────────────────────────────────

  StackyGame.syncGameState(state);
  draw();
  drawHoldPanel();
  drawNextPanel();

}());
