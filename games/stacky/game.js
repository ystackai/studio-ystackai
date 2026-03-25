/**
 * StackY Game Engine — Candy factory falling-block chain-reaction puzzle.
 *
 * NOT Tetris. Blocks of the same color that form connected groups of 4+
 * cells EXPLODE, causing cascading chain reactions. The chocolate river
 * rises from below. Your mistakes compound via the stress system, making
 * the game progressively harder — until you break the cycle with a
 * satisfying chain combo.
 *
 * Depends on: pieces.js (StackyPieces)
 */
'use strict';

var StackyGame = (function () {
  var P = StackyPieces;

  // ── Constants ──────────────────────────────────────────────────────────

  var CHOCOLATE_CELL = 8;
  var CHOCOLATE_INTERVAL_BASE = 30000;  // ms between rises (modified by stress)
  var CHOCOLATE_GAPS = 2;
  var GROUP_MIN = 4;                    // minimum connected cells to detonate
  var CHAIN_SCORE_BASE = 200;           // base score per group detonation
  var LS_KEY = 'stacky_hi';

  // Stress thresholds
  var STRESS_MAX = 100;
  var STRESS_ISOLATED_BLOCK = 5;
  var STRESS_GAP_CREATED = 10;
  var STRESS_TALL_TOWER_PER_SEC = 2;
  var STRESS_CHAIN_RELIEF = 15;
  var STRESS_CASCADE_RELIEF = 30;
  var STRESS_MEGA_CASCADE_RELIEF = 50;
  var STRESS_NATURAL_DECAY_PER_SEC = 1;

  // Commentary pools
  var COMMENTARY_BAD = [
    "The Oompa Loompas are watching.",
    "Wonka would never.",
    "That's going straight to the chocolate river.",
    "Veruca Salt made better moves.",
    "Even Augustus Gloop wouldn't do that.",
    "The factory is not impressed.",
    "That gap will haunt you.",
    "The candy blocks weep.",
  ];
  var COMMENTARY_GOOD = [
    "The factory approves!",
    "Golden!",
    "Wonka smiles.",
    "The Oompa Loompas cheer!",
    "Pure imagination!",
    "Delicious chain!",
  ];
  var COMMENTARY_STRESS = [
    "The chocolate river is hungry...",
    "The factory grows uneasy.",
    "Something stirs below...",
    "The pipes groan.",
  ];
  var COMMENTARY_PANIC = [
    "THE OOMPA LOOMPAS ARE SCREAMING",
    "THE FACTORY IS COLLAPSING",
    "WONKA HAS LEFT THE BUILDING",
  ];
  var COMMENTARY_GAMEOVER = [
    "The factory is disappointed.",
    "Wonka has seen enough.",
    "The Oompa Loompas will sing about this failure.",
    "The chocolate river claims another soul.",
  ];

  function loadHi() {
    try { return parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0; }
    catch (_) { return 0; }
  }
  function saveHi(n) {
    try { localStorage.setItem(LS_KEY, String(n)); } catch (_) {}
  }

  function createBag() {
    var bag = P.TYPES.slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
    return bag;
  }

  function createEmptyGrid() {
    var grid = [];
    for (var y = 0; y < P.ROWS; y++) {
      grid.push(new Array(P.COLS).fill(0));
    }
    return grid;
  }

  // ── State ──────────────────────────────────────────────────────────────

  function createState() {
    return {
      grid: createEmptyGrid(),
      activePiece: null,
      heldPiece: null,
      holdUsedThisTurn: false,
      score: 0,
      hi: loadHi(),
      level: 1,
      chainsTotal: 0,
      alive: true,
      phase: 'idle',
      goldenTickets: 0,
      comboCounter: 0,
      dropInterval: 1000,
      lastDropTime: 0,
      lockDelayActive: false,
      lockDelayTimer: 0,
      lockDelayMax: 30,
      bag: [],
      nextPiece: null,
      // Chocolate river
      lastChocolateTime: 0,
      chocolateRowsRisen: 0,
      // Stress system (0-100)
      stress: 0,
      lastStressDecay: 0,
      // Gravity echo
      echoTrail: [],
      // Commentary
      commentary: [],
      // Chain state (for cascade animation)
      chainInProgress: false,
      currentChainLevel: 0,
      // Events for renderer/audio
      _events: [],
    };
  }

  // ── Collision ──────────────────────────────────────────────────────────

  function checkCollision(grid, piece) {
    var cells = P.getCells(piece);
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.x < 0 || c.x >= P.COLS) return true;
      if (c.y < 0 || c.y >= P.ROWS) return true;
      if (grid[c.y][c.x] !== 0) return true;
    }
    return false;
  }

  function nextFromBag(state) {
    if (state.bag.length === 0) state.bag = createBag();
    return state.bag.pop();
  }

  // ── Spawn ──────────────────────────────────────────────────────────────

  function spawnPiece(state) {
    var type = state.nextPiece || nextFromBag(state);
    state.nextPiece = nextFromBag(state);

    var rotation = 0;
    // High stress: factory malfunction — random rotation
    if (state.stress > 70 && Math.random() < (state.stress - 70) / 60) {
      rotation = Math.floor(Math.random() * 4);
    }

    state.activePiece = {
      type: type,
      rotation: rotation,
      x: Math.floor((P.COLS - 4) / 2),
      y: 0,
    };
    state.holdUsedThisTurn = false;
    state.lockDelayActive = false;
    state.lockDelayTimer = 0;

    if (checkCollision(state.grid, state.activePiece)) {
      state.alive = false;
      state.phase = 'gameOver';
      state.activePiece = null;
      var goQuip = COMMENTARY_GAMEOVER[Math.floor(Math.random() * COMMENTARY_GAMEOVER.length)];
      state.commentary.push({text: goQuip, x: 150, y: 250, ttl: 180});
      state._events.push({type: 'gameOver', data: {commentary: goQuip}});
      if (state.score > state.hi) { state.hi = state.score; saveHi(state.hi); }
    }
  }

  function start(state) {
    state.grid = createEmptyGrid();
    state.activePiece = null;
    state.heldPiece = null;
    state.holdUsedThisTurn = false;
    state.score = 0;
    state.level = 1;
    state.chainsTotal = 0;
    state.alive = true;
    state.phase = 'playing';
    state.goldenTickets = 0;
    state.comboCounter = 0;
    state.dropInterval = 1000;
    state.lastDropTime = 0;
    state.lockDelayActive = false;
    state.lockDelayTimer = 0;
    state.bag = [];
    state.nextPiece = null;
    state.lastChocolateTime = 0;
    state.chocolateRowsRisen = 0;
    state.stress = 0;
    state.lastStressDecay = 0;
    state.echoTrail = [];
    state.commentary = [];
    state.chainInProgress = false;
    state.currentChainLevel = 0;
    state._events = [];
    spawnPiece(state);
    syncGameState(state);
  }

  // ── Movement ───────────────────────────────────────────────────────────

  function moveLeft(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var c = {type: state.activePiece.type, rotation: state.activePiece.rotation,
             x: state.activePiece.x - 1, y: state.activePiece.y};
    if (!checkCollision(state.grid, c)) {
      state.activePiece.x = c.x;
      if (state.lockDelayActive) state.lockDelayTimer = 0;
      return true;
    }
    return false;
  }

  function moveRight(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var c = {type: state.activePiece.type, rotation: state.activePiece.rotation,
             x: state.activePiece.x + 1, y: state.activePiece.y};
    if (!checkCollision(state.grid, c)) {
      state.activePiece.x = c.x;
      if (state.lockDelayActive) state.lockDelayTimer = 0;
      return true;
    }
    return false;
  }

  function rotateCW(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    if (state.activePiece.type === 'O') return true;
    var fromRot = state.activePiece.rotation;
    var toRot = (fromRot + 1) % 4;
    var kicks = P.getKicks(state.activePiece.type, fromRot, toRot);
    for (var i = 0; i < kicks.length; i++) {
      var c = {type: state.activePiece.type, rotation: toRot,
               x: state.activePiece.x + kicks[i][0], y: state.activePiece.y - kicks[i][1]};
      if (!checkCollision(state.grid, c)) {
        state.activePiece.rotation = toRot;
        state.activePiece.x = c.x;
        state.activePiece.y = c.y;
        if (state.lockDelayActive) state.lockDelayTimer = 0;
        return true;
      }
    }
    return false;
  }

  function rotateCCW(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    if (state.activePiece.type === 'O') return true;
    var fromRot = state.activePiece.rotation;
    var toRot = (fromRot + 3) % 4;
    var kicks = P.getKicks(state.activePiece.type, fromRot, toRot);
    for (var i = 0; i < kicks.length; i++) {
      var c = {type: state.activePiece.type, rotation: toRot,
               x: state.activePiece.x + kicks[i][0], y: state.activePiece.y - kicks[i][1]};
      if (!checkCollision(state.grid, c)) {
        state.activePiece.rotation = toRot;
        state.activePiece.x = c.x;
        state.activePiece.y = c.y;
        if (state.lockDelayActive) state.lockDelayTimer = 0;
        return true;
      }
    }
    return false;
  }

  function softDrop(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var c = {type: state.activePiece.type, rotation: state.activePiece.rotation,
             x: state.activePiece.x, y: state.activePiece.y + 1};
    if (!checkCollision(state.grid, c)) {
      state.activePiece.y = c.y;
      state.score += 1;
      state.lockDelayActive = false;
      return true;
    }
    return false;
  }

  function hardDrop(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var dist = 0;
    while (true) {
      var c = {type: state.activePiece.type, rotation: state.activePiece.rotation,
               x: state.activePiece.x, y: state.activePiece.y + dist + 1};
      if (checkCollision(state.grid, c)) break;
      dist++;
    }
    state.activePiece.y += dist;
    state.score += dist * 2;
    lockPiece(state);
    return true;
  }

  function getGhostY(state) {
    if (!state.activePiece) return 0;
    var gy = state.activePiece.y;
    while (true) {
      var c = {type: state.activePiece.type, rotation: state.activePiece.rotation,
               x: state.activePiece.x, y: gy + 1};
      if (checkCollision(state.grid, c)) break;
      gy++;
    }
    return gy;
  }

  function hold(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    if (state.holdUsedThisTurn) return false;
    var ct = state.activePiece.type;
    if (state.heldPiece) {
      state.activePiece = {type: state.heldPiece, rotation: 0,
        x: Math.floor((P.COLS - 4) / 2), y: 0};
      state.heldPiece = ct;
    } else {
      state.heldPiece = ct;
      spawnPiece(state);
    }
    state.holdUsedThisTurn = true;
    return true;
  }

  // ── Color Group Finding (Flood Fill) ───────────────────────────────────

  function findGroups(grid) {
    var visited = createEmptyGrid();
    var groups = [];

    for (var y = 0; y < P.ROWS; y++) {
      for (var x = 0; x < P.COLS; x++) {
        if (visited[y][x] || grid[y][x] === 0 || grid[y][x] === CHOCOLATE_CELL) continue;
        var color = grid[y][x];
        var group = [];
        var stack = [{x: x, y: y}];
        while (stack.length > 0) {
          var cell = stack.pop();
          if (cell.x < 0 || cell.x >= P.COLS || cell.y < 0 || cell.y >= P.ROWS) continue;
          if (visited[cell.y][cell.x]) continue;
          if (grid[cell.y][cell.x] !== color) continue;
          visited[cell.y][cell.x] = 1;
          group.push({x: cell.x, y: cell.y});
          stack.push({x: cell.x + 1, y: cell.y});
          stack.push({x: cell.x - 1, y: cell.y});
          stack.push({x: cell.x, y: cell.y + 1});
          stack.push({x: cell.x, y: cell.y - 1});
        }
        if (group.length >= GROUP_MIN) {
          groups.push({color: color, cells: group});
        }
      }
    }
    return groups;
  }

  // ── Detonation + Gravity + Cascade ──────────────────────────────────

  function detonateGroups(state, groups) {
    var totalCells = 0;
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      totalCells += group.cells.length;
      for (var c = 0; c < group.cells.length; c++) {
        var cell = group.cells[c];
        // Splash damage: adjacent chocolate cells get destroyed too
        var neighbors = [
          {x: cell.x+1, y: cell.y}, {x: cell.x-1, y: cell.y},
          {x: cell.x, y: cell.y+1}, {x: cell.x, y: cell.y-1},
        ];
        for (var n = 0; n < neighbors.length; n++) {
          var nb = neighbors[n];
          if (nb.x >= 0 && nb.x < P.COLS && nb.y >= 0 && nb.y < P.ROWS) {
            if (state.grid[nb.y][nb.x] === CHOCOLATE_CELL) {
              state.grid[nb.y][nb.x] = 0;
            }
          }
        }
        state.grid[cell.y][cell.x] = 0;
      }
      // Emit explosion event per group
      var cx = 0, cy = 0;
      for (var ci = 0; ci < group.cells.length; ci++) {
        cx += group.cells[ci].x; cy += group.cells[ci].y;
      }
      cx = (cx / group.cells.length) * 30 + 15;
      cy = (cy / group.cells.length) * 30 + 15;
      state._events.push({type: 'explosion', data: {
        x: cx, y: cy, color: group.color, size: group.cells.length
      }});
    }
    return totalCells;
  }

  function applyGravity(grid) {
    var moved = false;
    for (var x = 0; x < P.COLS; x++) {
      // Compact column: move all non-zero cells to bottom
      var write = P.ROWS - 1;
      for (var y = P.ROWS - 1; y >= 0; y--) {
        if (grid[y][x] !== 0) {
          if (y !== write) {
            grid[write][x] = grid[y][x];
            grid[y][x] = 0;
            moved = true;
          }
          write--;
        }
      }
    }
    return moved;
  }

  function runChainReaction(state) {
    var chainLevel = 0;
    var totalScore = 0;

    while (true) {
      var groups = findGroups(state.grid);
      if (groups.length === 0) break;

      chainLevel++;
      var cellsCleared = detonateGroups(state, groups);

      // Score: base × cells × chain multiplier × level
      var chainMult = Math.pow(2, Math.min(chainLevel - 1, 6));
      var points = CHAIN_SCORE_BASE * cellsCleared * chainMult * state.level;
      totalScore += points;
      state.score += points;

      // Stress relief from chains
      if (chainLevel === 1) {
        state.stress = Math.max(0, state.stress - STRESS_CHAIN_RELIEF);
      } else if (chainLevel < 4) {
        state.stress = Math.max(0, state.stress - STRESS_CASCADE_RELIEF);
      } else {
        state.stress = Math.max(0, state.stress - STRESS_MEGA_CASCADE_RELIEF);
      }

      // Chain events
      state._events.push({type: 'chain', data: {level: chainLevel, score: points}});

      if (chainLevel >= 2) {
        var goodQuip = COMMENTARY_GOOD[Math.floor(Math.random() * COMMENTARY_GOOD.length)];
        state.commentary.push({text: goodQuip + ' ×' + chainLevel, x: 150, y: 200, ttl: 90});
        state._events.push({type: 'chainCombo', data: {level: chainLevel}});
      }

      // Golden ticket on 3+ cascades
      if (chainLevel >= 3) {
        state.goldenTickets++;
        state._events.push({type: 'goldenTicket'});
      }

      // Apply gravity after detonation
      applyGravity(state.grid);

      // Emit cascade event
      state._events.push({type: 'cascade', data: {level: chainLevel}});
    }

    state.currentChainLevel = chainLevel;
    state.chainsTotal += chainLevel;

    // Level progression: every 20 chains total
    var newLevel = Math.floor(state.chainsTotal / 20) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
    }

    if (state.score > state.hi) { state.hi = state.score; saveHi(state.hi); }

    return chainLevel;
  }

  // ── Lock Piece ─────────────────────────────────────────────────────────

  function lockPiece(state) {
    if (!state.activePiece) return;
    var cells = P.getCells(state.activePiece);
    var colorIndex = P.TYPES.indexOf(state.activePiece.type) + 1;

    // Echo trail
    state.echoTrail.push({
      cells: cells.map(function(c) { return {x: c.x, y: c.y}; }),
      colorIndex: colorIndex,
      ttl: 300, maxTtl: 300,
    });
    if (state.echoTrail.length > 20) state.echoTrail.shift();

    // Drop distance for shake
    var ghostY = getGhostY(state);
    var dropDist = ghostY - state.activePiece.y;

    // Echo instability: if placing near recent echoes, slight drift
    var nearEcho = false;
    for (var ei = 0; ei < state.echoTrail.length - 1; ei++) {
      var echo = state.echoTrail[ei];
      for (var ec = 0; ec < echo.cells.length; ec++) {
        for (var ci = 0; ci < cells.length; ci++) {
          var dx = Math.abs(echo.cells[ec].x - cells[ci].x);
          var dy = Math.abs(echo.cells[ec].y - cells[ci].y);
          if (dx <= 1 && dy <= 1) { nearEcho = true; break; }
        }
        if (nearEcho) break;
      }
      if (nearEcho) break;
    }

    // Apply instability drift (stress amplifies)
    if (nearEcho && Math.random() < 0.3) {
      var drift = state.stress > 50 ? 2 : 1;
      var dir = Math.random() < 0.5 ? -drift : drift;
      var shifted = {type: state.activePiece.type, rotation: state.activePiece.rotation,
                     x: state.activePiece.x + dir, y: state.activePiece.y};
      if (!checkCollision(state.grid, shifted)) {
        state.activePiece.x = shifted.x;
        cells = P.getCells(state.activePiece); // recalc
        state._events.push({type: 'drift', data: {dir: dir}});
      }
    }

    // Place blocks on grid
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.y >= 0 && c.y < P.ROWS && c.x >= 0 && c.x < P.COLS) {
        state.grid[c.y][c.x] = colorIndex;
      }
    }

    // Check for isolated blocks (stress)
    var isolatedCount = 0;
    for (var bi = 0; bi < cells.length; bi++) {
      var bc = cells[bi];
      var emptyNeighbors = 0;
      var dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
      for (var di = 0; di < dirs.length; di++) {
        var nx = bc.x + dirs[di].x;
        var ny = bc.y + dirs[di].y;
        if (nx < 0 || nx >= P.COLS || ny < 0 || ny >= P.ROWS || state.grid[ny][nx] === 0) {
          emptyNeighbors++;
        }
      }
      if (emptyNeighbors >= 3) isolatedCount++;
    }
    if (isolatedCount > 0) {
      state.stress = Math.min(STRESS_MAX, state.stress + STRESS_ISOLATED_BLOCK * isolatedCount);
    }

    // Check for gaps created
    for (var gi = 0; gi < cells.length; gi++) {
      var gc = cells[gi];
      if (gc.y + 1 < P.ROWS && state.grid[gc.y + 1][gc.x] === 0) {
        state.stress = Math.min(STRESS_MAX, state.stress + STRESS_GAP_CREATED);
        // Commentary on bad play (frequency scales with stress)
        var commentChance = 0.15 + state.stress / 250;
        if (Math.random() < commentChance) {
          var pool = state.stress > 60 ? COMMENTARY_STRESS :
                     state.stress > 80 ? COMMENTARY_PANIC : COMMENTARY_BAD;
          var quip = pool[Math.floor(Math.random() * pool.length)];
          state.commentary.push({text: quip, x: gc.x * 30 + 15, y: gc.y * 30, ttl: 120});
          state._events.push({type: 'commentary'});
        }
        break;
      }
    }

    // Shake on hard drops
    if (dropDist > 3) {
      state._events.push({type: 'shake', data: {intensity: dropDist * 0.5}});
    }

    state.activePiece = null;
    if (typeof StackyAudio !== 'undefined') StackyAudio.playLock();

    // Run chain reaction (the core mechanic!)
    var chainLevel = runChainReaction(state);

    if (chainLevel > 0) {
      state.comboCounter++;
      state._events.push({type: 'lineClear', data: {count: chainLevel}});
      if (chainLevel >= 3) {
        state._events.push({type: 'scream'});
      } else if (chainLevel >= 1) {
        state._events.push({type: 'whisper', data: {intensity: Math.min(state.level / 3, 3)}});
      }
    } else {
      state.comboCounter = 0;
    }

    spawnPiece(state);
  }

  // ── Chocolate River ─────────────────────────────────────────────────

  function createChocolateRow() {
    var row = new Array(P.COLS).fill(CHOCOLATE_CELL);
    var gaps = [];
    while (gaps.length < CHOCOLATE_GAPS) {
      var g = Math.floor(Math.random() * P.COLS);
      if (gaps.indexOf(g) === -1) gaps.push(g);
    }
    for (var i = 0; i < gaps.length; i++) row[gaps[i]] = 0;
    return row;
  }

  function riseChocolateRow(state) {
    for (var x = 0; x < P.COLS; x++) {
      if (state.grid[0][x] !== 0) {
        state.alive = false;
        state.phase = 'gameOver';
        if (state.score > state.hi) { state.hi = state.score; saveHi(state.hi); }
        state._events.push({type: 'gameOver', data: {}});
        return false;
      }
    }
    state.grid.shift();
    state.grid.push(createChocolateRow());
    state.chocolateRowsRisen++;
    if (state.activePiece) {
      state.activePiece.y -= 1;
      if (state.activePiece.y < 0 || checkCollision(state.grid, state.activePiece)) {
        lockPiece(state);
      }
    }
    state._events.push({type: 'shake', data: {intensity: 3}});
    state._events.push({type: 'chocolateRise'});
    return true;
  }

  // ── Tick ────────────────────────────────────────────────────────────

  function getMaxHeight(state) {
    for (var y = 0; y < P.ROWS; y++) {
      for (var x = 0; x < P.COLS; x++) {
        if (state.grid[y][x] !== 0) return P.ROWS - y;
      }
    }
    return 0;
  }

  function tick(state, timestamp) {
    if (state.phase !== 'playing' || !state.activePiece) return;

    // Decay echoes
    for (var ei = state.echoTrail.length - 1; ei >= 0; ei--) {
      state.echoTrail[ei].ttl--;
      if (state.echoTrail[ei].ttl <= 0) state.echoTrail.splice(ei, 1);
    }

    // Decay commentary
    for (var ci = state.commentary.length - 1; ci >= 0; ci--) {
      state.commentary[ci].ttl--;
      state.commentary[ci].y -= 0.5;
      if (state.commentary[ci].ttl <= 0) state.commentary.splice(ci, 1);
    }

    // Stress natural decay + tall tower stress
    var height = getMaxHeight(state);
    if (state.lastStressDecay === 0) state.lastStressDecay = timestamp;
    if (timestamp - state.lastStressDecay >= 1000) {
      state.lastStressDecay = timestamp;
      state.stress = Math.max(0, state.stress - STRESS_NATURAL_DECAY_PER_SEC);
      if (height > 15) {
        state.stress = Math.min(STRESS_MAX, state.stress + STRESS_TALL_TOWER_PER_SEC);
      }
    }

    // Stress modifies drop interval
    var stressFactor = 1 - state.stress / 200;
    var baseInterval = Math.max(100, 1000 - (state.level - 1) * 50);
    state.dropInterval = Math.max(80, baseInterval * stressFactor);

    // Emit updates
    state._events.push({type: 'heightUpdate', data: {height: height}});
    state._events.push({type: 'stressUpdate', data: {stress: state.stress}});
    if (height >= P.ROWS - 3) state._events.push({type: 'nearCollapse'});

    // Chocolate river — interval modified by stress
    var chocoInterval = CHOCOLATE_INTERVAL_BASE * (1 - state.stress / 300);
    if (state.lastChocolateTime === 0) state.lastChocolateTime = timestamp;
    if (timestamp - state.lastChocolateTime >= chocoInterval) {
      state.lastChocolateTime = timestamp;
      if (!riseChocolateRow(state)) return;
    }

    // Gravity
    if (timestamp - state.lastDropTime >= state.dropInterval) {
      state.lastDropTime = timestamp;
      var candidate = {type: state.activePiece.type, rotation: state.activePiece.rotation,
                       x: state.activePiece.x, y: state.activePiece.y + 1};
      if (!checkCollision(state.grid, candidate)) {
        state.activePiece.y = candidate.y;
      } else {
        if (state.lockDelayActive) {
          state.lockDelayTimer++;
          if (state.lockDelayTimer >= state.lockDelayMax) lockPiece(state);
        } else {
          state.lockDelayActive = true;
          state.lockDelayTimer = 0;
        }
      }
    }
  }

  // ── Pause / Input ──────────────────────────────────────────────────

  function pause(state) { if (state.phase === 'playing') state.phase = 'paused'; }
  function resume(state) { if (state.phase === 'paused') state.phase = 'playing'; }
  function togglePause(state) {
    if (state.phase === 'playing') pause(state);
    else if (state.phase === 'paused') resume(state);
  }

  function processInput(state, key) {
    if (state.phase !== 'playing') {
      if (key === 'Escape' || key === 'p' || key === 'P') togglePause(state);
      return;
    }
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A': moveLeft(state); break;
      case 'ArrowRight': case 'd': case 'D': moveRight(state); break;
      case 'ArrowDown': case 's': case 'S': softDrop(state); break;
      case 'ArrowUp': case 'w': case 'W': rotateCW(state); break;
      case ' ': hardDrop(state); break;
      case 'z': case 'Z': rotateCCW(state); break;
      case 'c': case 'C': hold(state); break;
      case 'Escape': case 'p': case 'P': togglePause(state); break;
    }
  }

  function syncGameState(state) {
    window.gameState = {
      score: state.score, hi: state.hi, level: state.level,
      chainsTotal: state.chainsTotal, alive: state.alive, gameOver: !state.alive,
      phase: state.phase, goldenTickets: state.goldenTickets,
      stress: state.stress,
      activePiece: state.activePiece ? {
        type: state.activePiece.type, rotation: state.activePiece.rotation,
        x: state.activePiece.x, y: state.activePiece.y,
      } : null,
      heldPiece: state.heldPiece, nextPiece: state.nextPiece,
      comboCounter: state.comboCounter,
      grid: state.grid.map(function (row) { return row.slice(); }),
      dropInterval: state.dropInterval,
      player: state.activePiece ? {x: state.activePiece.x, y: state.activePiece.y} : null,
      chocolateRowsRisen: state.chocolateRowsRisen,
      chocolateCell: CHOCOLATE_CELL,
    };
  }

  return {
    createState: createState, start: start,
    moveLeft: moveLeft, moveRight: moveRight,
    rotateCW: rotateCW, rotateCCW: rotateCCW,
    softDrop: softDrop, hardDrop: hardDrop,
    hold: hold, tick: tick,
    pause: pause, resume: resume, togglePause: togglePause,
    processInput: processInput, syncGameState: syncGameState,
    getGhostY: getGhostY, checkCollision: checkCollision,
    riseChocolateRow: riseChocolateRow, getMaxHeight: getMaxHeight,
    CHOCOLATE_CELL: CHOCOLATE_CELL,
    CHOCOLATE_INTERVAL: CHOCOLATE_INTERVAL_BASE,
  };
})();
