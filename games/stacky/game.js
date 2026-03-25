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
  var GROUP_MIN = 5;                    // minimum connected cells to detonate (>4 so a single piece doesn't self-destruct)
  var CHAIN_SCORE_BASE = 200;           // base score per group detonation
  var LS_KEY = 'stacky_hi';

  // Stress thresholds
  var STRESS_MAX = 100;
  var STRESS_ISOLATED_BLOCK = 7;
  var STRESS_GAP_CREATED = 14;
  var STRESS_TALL_TOWER_PER_SEC = 2;
  var STRESS_CHAIN_RELIEF = 15;
  var STRESS_CASCADE_RELIEF = 30;
  var STRESS_MEGA_CASCADE_RELIEF = 50;
  var STRESS_NATURAL_DECAY_PER_SEC = 1;

  // Commentary pools
  var COMMENTARY_BAD = [
    "That wasn't a move. That was a warning sign.",
    "The Oompa Loompas just wrote you up.",
    "Wonka would revoke your floor access for that.",
    "You built a problem and called it strategy.",
    "That gap has your name on it.",
    "The candy blocks are embarrassed for you.",
    "Even the river flinched.",
    "You stacked that like a confession.",
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
    "The factory is keeping receipts now.",
    "The pipes are laughing at your plan.",
    "The chocolate river smells blood.",
    "Every Oompa Loompa in the building saw that.",
    "You are one bad decision away from a musical number.",
  ];
  var COMMENTARY_PANIC = [
    "THE OOMPA LOOMPAS HAVE LOST PROFESSIONAL RESPECT FOR YOU",
    "THE FACTORY HAS DECIDED YOU ARE THE INCIDENT",
    "WONKA JUST TURNED OFF THE CAMERAS",
    "THIS TOWER LOOKS LIKE A COVER-UP",
  ];
  var COMMENTARY_GAMEOVER = [
    "The factory is disappointed.",
    "Wonka has seen enough.",
    "The Oompa Loompas will sing about this failure.",
    "The chocolate river claims another soul.",
  ];
  var COMMENTARY_RIVER = [
    "The river tasted weakness.",
    "Chocolate climbs. You don't.",
    "The river caught you reaching.",
    "You fed the factory exactly what it wanted.",
  ];
  var REGRET_PHRASES = [
    "you procrastinated.",
    "you lied to yourself.",
    "the stack is too high.",
    "you knew that was a bad fit.",
    "the tower remembers this.",
    "you built this panic on purpose.",
  ];
  var SCAR_MAX = 7;
  var FRACTURE_SWEET_SPOT_MIN = 30;
  var FRACTURE_SWEET_SPOT_MAX = 68;
  var BRITTLE_SCAR_THRESHOLD = 3;

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

  function createStressGrid() {
    return createEmptyGrid();
  }

  function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function addCommentary(state, text, x, y, ttl, kind) {
    var entry = {
      text: text,
      x: x,
      y: y,
      ttl: ttl || 120,
      kind: kind || 'warning',
    };
    state.commentary.push(entry);
    if (state.commentary.length > 8) state.commentary.shift();
    state._events.push({type: 'commentary', data: {
      text: entry.text,
      x: entry.x,
      y: entry.y,
      ttl: entry.ttl,
      kind: entry.kind,
    }});
    return entry;
  }

  function syncStressGrid(state) {
    if (!state.stressGrid || state.stressGrid.length !== P.ROWS) {
      state.stressGrid = createStressGrid();
    }
    for (var y = 0; y < P.ROWS; y++) {
      if (!state.stressGrid[y]) state.stressGrid[y] = new Array(P.COLS).fill(0);
      for (var x = 0; x < P.COLS; x++) {
        if (state.grid[y][x] === 0 || state.grid[y][x] === CHOCOLATE_CELL) {
          state.stressGrid[y][x] = 0;
        } else if (state.stressGrid[y][x] > SCAR_MAX) {
          state.stressGrid[y][x] = SCAR_MAX;
        }
      }
    }
    updateFractureMetrics(state);
  }

  function scarCell(state, x, y, amount) {
    if (!state.stressGrid) state.stressGrid = createStressGrid();
    if (x < 0 || x >= P.COLS || y < 0 || y >= P.ROWS) return;
    if (state.grid[y][x] === 0 || state.grid[y][x] === CHOCOLATE_CELL) {
      state.stressGrid[y][x] = 0;
      return;
    }
    state.stressGrid[y][x] = Math.min(SCAR_MAX, (state.stressGrid[y][x] || 0) + amount);
  }

  function scarPlacementCluster(state, cells, amount) {
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      scarCell(state, cell.x, cell.y, amount);
      scarCell(state, cell.x + 1, cell.y, Math.max(1, amount - 1));
      scarCell(state, cell.x - 1, cell.y, Math.max(1, amount - 1));
      scarCell(state, cell.x, cell.y + 1, Math.max(1, amount - 1));
      scarCell(state, cell.x, cell.y - 1, Math.max(1, amount - 2));
    }
  }

  function isSolidBlock(value) {
    return value !== 0 && value !== CHOCOLATE_CELL;
  }

  function updateFractureMetrics(state) {
    var totalSolidBlocks = 0;
    var fracturedBlocks = 0;
    for (var y = 0; y < P.ROWS; y++) {
      for (var x = 0; x < P.COLS; x++) {
        if (!isSolidBlock(state.grid[y][x])) continue;
        totalSolidBlocks++;
        if (state.stressGrid[y][x] > 0) fracturedBlocks++;
      }
    }
    state.totalSolidBlocks = totalSolidBlocks;
    state.fracturedBlocks = fracturedBlocks;
    state.fracturePercent = totalSolidBlocks > 0
      ? Math.round((fracturedBlocks / totalSolidBlocks) * 100)
      : 0;
  }

  function inFractureSweetSpot(state) {
    return state.stress >= FRACTURE_SWEET_SPOT_MIN && state.stress <= FRACTURE_SWEET_SPOT_MAX;
  }

  function collectBrittleCollateral(state, sourceCells, clearMap) {
    if (!inFractureSweetSpot(state)) return [];
    var brittleCells = [];
    var seen = Object.create(null);
    var offsets = [
      {x: 1, y: 0}, {x: -1, y: 0},
      {x: 0, y: 1}, {x: 0, y: -1},
    ];
    for (var i = 0; i < sourceCells.length; i++) {
      var source = sourceCells[i];
      for (var o = 0; o < offsets.length; o++) {
        var nx = source.x + offsets[o].x;
        var ny = source.y + offsets[o].y;
        if (nx < 0 || nx >= P.COLS || ny < 0 || ny >= P.ROWS) continue;
        var key = nx + ',' + ny;
        if (clearMap[key] || seen[key]) continue;
        if (!isSolidBlock(state.grid[ny][nx])) continue;
        if ((state.stressGrid[ny][nx] || 0) < BRITTLE_SCAR_THRESHOLD) continue;
        seen[key] = true;
        brittleCells.push({
          x: nx,
          y: ny,
          color: state.grid[ny][nx],
          fractured: true,
        });
      }
    }
    return brittleCells;
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
      stressGrid: createStressGrid(),
      fracturedBlocks: 0,
      totalSolidBlocks: 0,
      fracturePercent: 0,
      lastStressDecay: 0,
      // Gravity echo
      echoTrail: [],
      // Commentary
      commentary: [],
      // Async chain state machine
      chainPhase: 'none',       // 'none' | 'highlight' | 'settle'
      currentChainLevel: 0,
      _chainTimer: 0,
      _matchedCells: [],
      _pendingGroups: null,
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
      spawnY: 0,
    };
    state.holdUsedThisTurn = false;
    state.lockDelayActive = false;
    state.lockDelayTimer = 0;

    if (checkCollision(state.grid, state.activePiece)) {
      triggerGameOver(state, randomFrom(COMMENTARY_GAMEOVER));
    }
  }

  function triggerGameOver(state, commentaryText) {
    state.alive = false;
    state.phase = 'gameOver';
    state.activePiece = null;
    if (commentaryText) addCommentary(state, commentaryText, 150, 250, 180, 'panic');
    state._events.push({type: 'gameOver', data: {commentary: commentaryText || null}});
    if (state.score > state.hi) { state.hi = state.score; saveHi(state.hi); }
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
    state.stressGrid = createStressGrid();
    state.fracturedBlocks = 0;
    state.totalSolidBlocks = 0;
    state.fracturePercent = 0;
    state.lastStressDecay = 0;
    state.echoTrail = [];
    state.commentary = [];
    state.chainPhase = 'none';
    state.currentChainLevel = 0;
    state._chainTimer = 0;
    state._matchedCells = [];
    state._pendingGroups = null;
    state._events = [];
    updateFractureMetrics(state);
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
        x: Math.floor((P.COLS - 4) / 2), y: 0, spawnY: 0};
      state.heldPiece = ct;
      if (checkCollision(state.grid, state.activePiece)) {
        triggerGameOver(state, randomFrom(COMMENTARY_GAMEOVER));
        return false;
      }
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
    var clearedCells = [];
    var affectedRows = {};
    var maxGroupSize = 0;
    var clearMap = Object.create(null);
    var sourceCells = [];
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      maxGroupSize = Math.max(maxGroupSize, group.cells.length);
      for (var c = 0; c < group.cells.length; c++) {
        var cell = group.cells[c];
        var key = cell.x + ',' + cell.y;
        if (!clearMap[key]) {
          clearMap[key] = {x: cell.x, y: cell.y, color: group.color};
          sourceCells.push({x: cell.x, y: cell.y});
        }
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

    var brittleCells = collectBrittleCollateral(state, sourceCells, clearMap);
    for (var bc = 0; bc < brittleCells.length; bc++) {
      var brittle = brittleCells[bc];
      clearMap[brittle.x + ',' + brittle.y] = brittle;
    }

    var clearKeys = Object.keys(clearMap);
    totalCells = clearKeys.length;
    for (var i = 0; i < clearKeys.length; i++) {
      var clearCell = clearMap[clearKeys[i]];
      affectedRows[clearCell.y] = true;
      clearedCells.push(clearCell);
      // Splash damage: adjacent chocolate cells get destroyed too
      var neighbors = [
        {x: clearCell.x+1, y: clearCell.y}, {x: clearCell.x-1, y: clearCell.y},
        {x: clearCell.x, y: clearCell.y+1}, {x: clearCell.x, y: clearCell.y-1},
      ];
      for (var n = 0; n < neighbors.length; n++) {
        var nb = neighbors[n];
        if (nb.x >= 0 && nb.x < P.COLS && nb.y >= 0 && nb.y < P.ROWS) {
          if (state.grid[nb.y][nb.x] === CHOCOLATE_CELL) {
            state.grid[nb.y][nb.x] = 0;
            state.stressGrid[nb.y][nb.x] = 0;
          }
        }
      }
      state.grid[clearCell.y][clearCell.x] = 0;
      state.stressGrid[clearCell.y][clearCell.x] = 0;
    }

    syncStressGrid(state);
    return {
      totalCells: totalCells,
      clearedCells: clearedCells,
      affectedRows: Object.keys(affectedRows).map(function (row) {
        return parseInt(row, 10);
      }).sort(function (a, b) { return a - b; }),
      maxGroupSize: maxGroupSize,
      groupCount: groups.length,
      brittleCount: brittleCells.length,
    };
  }

  function applyGravity(grid, stressGrid) {
    var moved = false;
    for (var x = 0; x < P.COLS; x++) {
      // Compact column: move all non-zero cells to bottom
      var write = P.ROWS - 1;
      for (var y = P.ROWS - 1; y >= 0; y--) {
        if (grid[y][x] !== 0) {
          if (y !== write) {
            grid[write][x] = grid[y][x];
            grid[y][x] = 0;
            if (stressGrid) {
              stressGrid[write][x] = stressGrid[y][x];
              stressGrid[y][x] = 0;
            }
            moved = true;
          }
          write--;
        }
      }
      while (write >= 0) {
        if (stressGrid) stressGrid[write][x] = 0;
        write--;
      }
    }
    return moved;
  }

  var HIGHLIGHT_FRAMES = 30; // ~0.5s at 60fps

  /**
   * Start checking for chain reactions (called after piece locks).
   * Sets up async chain state machine instead of synchronous loop.
   */
  function startChainCheck(state) {
    var groups = findGroups(state.grid);
    if (groups.length === 0) {
      state.chainPhase = 'none';
      state.currentChainLevel = 0;
      spawnPiece(state);
      return;
    }
    // Mark matched cells for highlight
    state._matchedCells = [];
    state._pendingGroups = groups;
    for (var mg = 0; mg < groups.length; mg++) {
      for (var mc = 0; mc < groups[mg].cells.length; mc++) {
        state._matchedCells.push({
          x: groups[mg].cells[mc].x,
          y: groups[mg].cells[mc].y,
          color: groups[mg].color
        });
      }
    }
    state.chainPhase = 'highlight';
    state._chainTimer = HIGHLIGHT_FRAMES;
    state.currentChainLevel++;
    state._events.push({type: 'matchFound', data: {count: state._matchedCells.length}});
  }

  /**
   * Tick the chain state machine (called every frame from tick()).
   */
  function tickChain(state) {
    if (state.chainPhase === 'none') return;

    if (state.chainPhase === 'highlight') {
      state._chainTimer--;
      if (state._chainTimer <= 0) {
        // Detonate
        var groups = state._pendingGroups || [];
        var detonation = detonateGroups(state, groups);
        var cellsCleared = detonation.totalCells;
        state._matchedCells = [];
        state._pendingGroups = null;

        // Score
        var chainMult = Math.pow(2, Math.min(state.currentChainLevel - 1, 6));
        var points = CHAIN_SCORE_BASE * cellsCleared * chainMult * state.level;
        state.score += points;

        // Stress relief
        if (state.currentChainLevel === 1) {
          state.stress = Math.max(0, state.stress - STRESS_CHAIN_RELIEF);
        } else if (state.currentChainLevel < 4) {
          state.stress = Math.max(0, state.stress - STRESS_CASCADE_RELIEF);
        } else {
          state.stress = Math.max(0, state.stress - STRESS_MEGA_CASCADE_RELIEF);
        }

        var regretPhrase = randomFrom(REGRET_PHRASES);
        var phraseX = 150;
        var phraseY = 110;
        if (detonation.clearedCells.length > 0) {
          var sumX = 0;
          var sumY = 0;
          for (var cc = 0; cc < detonation.clearedCells.length; cc++) {
            sumX += detonation.clearedCells[cc].x;
            sumY += detonation.clearedCells[cc].y;
          }
          phraseX = (sumX / detonation.clearedCells.length) * 30 + 15;
          phraseY = Math.max(70, (sumY / detonation.clearedCells.length) * 30 + 12);
        }
        addCommentary(state, regretPhrase, phraseX, phraseY, 110 + state.currentChainLevel * 15, 'regret');

        state._events.push({type: 'chain', data: {
          level: state.currentChainLevel,
          score: points,
          cellsCleared: cellsCleared,
          groups: detonation.groupCount,
        }});
        state._events.push({type: 'lineClear', data: {
          count: detonation.affectedRows.length,
          chainLevel: state.currentChainLevel,
          cellsCleared: cellsCleared,
          affectedRows: detonation.affectedRows,
          cells: detonation.clearedCells,
          golden: state.currentChainLevel >= 3,
          phrase: regretPhrase,
          intensity: Math.min(6, state.currentChainLevel + Math.ceil(detonation.maxGroupSize / 3)),
        }});

        if (state.currentChainLevel >= 2) {
          var goodQuip = randomFrom(COMMENTARY_GOOD);
          addCommentary(state, goodQuip + ' ×' + state.currentChainLevel, 150, 200, 90, 'good');
          state._events.push({type: 'chainCombo', data: {level: state.currentChainLevel}});
        }
        if (state.currentChainLevel >= 3) {
          state.goldenTickets++;
          state._events.push({type: 'goldenTicket'});
          state._events.push({type: 'scream', data: {
            phrase: regretPhrase,
            intensity: Math.min(6, state.currentChainLevel + 2),
          }});
        } else {
          state._events.push({type: 'whisper', data: {
            intensity: Math.min(state.currentChainLevel, 3),
            phrase: regretPhrase,
          }});
        }
        if (detonation.brittleCount > 0) {
          addCommentary(
            state,
            'The cracked sugar snapped in your favor.',
            phraseX,
            Math.max(50, phraseY - 26),
            90,
            'good'
          );
        }

        // Apply gravity
        applyGravity(state.grid, state.stressGrid);
        syncStressGrid(state);

        // Check for more groups (cascade)
        state.chainPhase = 'settle';
        state._chainTimer = 10; // brief pause before next check
      }
      return;
    }

    if (state.chainPhase === 'settle') {
      state._chainTimer--;
      if (state._chainTimer <= 0) {
        // Check for cascading groups
        var newGroups = findGroups(state.grid);
        if (newGroups.length > 0) {
          // More matches! Continue chain
          state._matchedCells = [];
          state._pendingGroups = newGroups;
          for (var mg = 0; mg < newGroups.length; mg++) {
            for (var mc = 0; mc < newGroups[mg].cells.length; mc++) {
              state._matchedCells.push({
                x: newGroups[mg].cells[mc].x,
                y: newGroups[mg].cells[mc].y,
                color: newGroups[mg].color
              });
            }
          }
          state.chainPhase = 'highlight';
          state._chainTimer = HIGHLIGHT_FRAMES;
          state.currentChainLevel++;
        } else {
          // Chain complete
          state.chainsTotal += state.currentChainLevel;
          var newLevel = Math.floor(state.chainsTotal / 20) + 1;
          if (newLevel > state.level) state.level = newLevel;
          if (state.score > state.hi) { state.hi = state.score; saveHi(state.hi); }
          state.chainPhase = 'none';
          state.currentChainLevel = 0;
          spawnPiece(state);
        }
      }
      return;
    }
  }

  // ── Lock Piece ─────────────────────────────────────────────────────────

  function lockPiece(state) {
    if (!state.activePiece) return;
    var cells = P.getCells(state.activePiece);
    var colorIndex = P.TYPES.indexOf(state.activePiece.type) + 1;
    var fallDistance = Math.max(0, state.activePiece.y - (state.activePiece.spawnY || 0));
    var centerX = 0;
    var centerY = 0;
    for (var centerIndex = 0; centerIndex < cells.length; centerIndex++) {
      centerX += cells[centerIndex].x;
      centerY += cells[centerIndex].y;
    }
    centerX = (centerX / cells.length) * 30 + 15;
    centerY = (centerY / cells.length) * 30 + 15;

    // Echo trail
    state.echoTrail.push({
      cells: cells.map(function(c) { return {x: c.x, y: c.y}; }),
      colorIndex: colorIndex,
      ttl: 300, maxTtl: 300,
    });
    if (state.echoTrail.length > 20) state.echoTrail.shift();

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
      if (bc.y < 0 || bc.y >= P.ROWS || bc.x < 0 || bc.x >= P.COLS) continue;
      var emptyNeighbors = 0;
      var dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
      for (var di = 0; di < dirs.length; di++) {
        var nx = bc.x + dirs[di].x;
        var ny = bc.y + dirs[di].y;
        if (nx < 0 || nx >= P.COLS || ny < 0 || ny >= P.ROWS ||
            (state.grid[ny] && state.grid[ny][nx] === 0)) {
          emptyNeighbors++;
        }
      }
      if (emptyNeighbors >= 3) isolatedCount++;
    }
    if (isolatedCount > 0) {
      state.stress = Math.min(STRESS_MAX, state.stress + STRESS_ISOLATED_BLOCK * isolatedCount);
    }

    // Check for gaps created (safely)
    var gapCreated = false;
    for (var gi = 0; gi < cells.length; gi++) {
      var gc = cells[gi];
      if (gc.y >= 0 && gc.y + 1 < P.ROWS && gc.x >= 0 && gc.x < P.COLS &&
          state.grid[gc.y + 1] && state.grid[gc.y + 1][gc.x] === 0) {
        gapCreated = true;
        state.stress = Math.min(STRESS_MAX, state.stress + STRESS_GAP_CREATED);
        break;
      }
    }

    var scarAmount = 0;
    if (nearEcho) scarAmount += 2;
    if (isolatedCount > 0) scarAmount += Math.min(2, isolatedCount);
    if (gapCreated) scarAmount += 3;
    if (fallDistance >= 10) scarAmount += 1;
    if (state.stress > 60) scarAmount += 1;
    if (scarAmount > 0) {
      scarPlacementCluster(state, cells, scarAmount);
    }
    syncStressGrid(state);

    var placementSeverity = scarAmount + Math.min(3, isolatedCount) + (gapCreated ? 2 : 0);
    var commentChance = Math.min(0.98, 0.32 + placementSeverity * 0.12 + state.stress / 180);
    if (placementSeverity >= 2 && Math.random() < commentChance) {
      var pool = placementSeverity >= 7 || state.stress > 82 ? COMMENTARY_PANIC :
                 placementSeverity >= 4 || state.stress > 58 ? COMMENTARY_STRESS : COMMENTARY_BAD;
      var quip = randomFrom(pool);
      var kind = placementSeverity >= 7 || state.stress > 82 ? 'panic' :
                 placementSeverity >= 4 ? 'warning' : 'warning';
      addCommentary(state, quip, centerX, centerY - 12, 130, kind);
    }

    // Shake on hard drops
    var impactIntensity = fallDistance * 0.22 + (nearEcho ? 2.2 : 0) + (gapCreated ? 1.3 : 0) + isolatedCount * 0.45;
    if (impactIntensity > 1.2) {
      state._events.push({type: 'shake', data: {intensity: impactIntensity}});
    }
    if (placementSeverity >= 2) {
      state._events.push({type: 'badPlacement', data: {
        severity: placementSeverity,
        x: centerX,
        y: centerY,
        gapCreated: gapCreated,
        isolatedCount: isolatedCount,
        nearEcho: nearEcho,
      }});
    }

    state.activePiece = null;
    if (typeof StackyAudio !== 'undefined') StackyAudio.playLock();

    // Start async chain check (will spawn next piece when done)
    state.currentChainLevel = 0;
    startChainCheck(state);
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
        triggerGameOver(state, randomFrom(COMMENTARY_RIVER));
        return false;
      }
    }
    state.grid.shift();
    state.grid.push(createChocolateRow());
    state.stressGrid.shift();
    state.stressGrid.push(new Array(P.COLS).fill(0));
    state.chocolateRowsRisen++;
    state.stress = Math.min(STRESS_MAX, state.stress + 6);
    if (state.chocolateRowsRisen >= 2 || state.stress > 45) {
      addCommentary(state, randomFrom(COMMENTARY_RIVER), 150, 560, 95, 'river');
    }
    if (state.activePiece) {
      state.activePiece.y -= 1;
      if (state.activePiece.y < 0 || checkCollision(state.grid, state.activePiece)) {
        triggerGameOver(state, randomFrom(COMMENTARY_RIVER));
        return false;
      }
    }
    syncStressGrid(state);
    state._events.push({type: 'shake', data: {intensity: 3.5}});
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
    if (state.phase !== 'playing') return;

    // If chain reaction in progress, tick that instead of normal gameplay
    if (state.chainPhase !== 'none') {
      tickChain(state);
      return;
    }

    if (!state.activePiece) return;

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

    // Gravity drop
    if (timestamp - state.lastDropTime >= state.dropInterval) {
      state.lastDropTime = timestamp;
      var candidate = {type: state.activePiece.type, rotation: state.activePiece.rotation,
                       x: state.activePiece.x, y: state.activePiece.y + 1};
      if (!checkCollision(state.grid, candidate)) {
        state.activePiece.y = candidate.y;
        state.lockDelayActive = false;
      } else {
        // Piece can't drop — start lock delay
        if (!state.lockDelayActive) {
          state.lockDelayActive = true;
          state.lockDelayTimer = 0;
        }
      }
    }

    // Lock delay ticks every frame (not every drop interval)
    if (state.lockDelayActive) {
      state.lockDelayTimer++;
      if (state.lockDelayTimer >= state.lockDelayMax) {
        lockPiece(state);
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
      fracturedBlocks: state.fracturedBlocks,
      totalSolidBlocks: state.totalSolidBlocks,
      fracturePercent: state.fracturePercent,
      fractureSweetSpot: inFractureSweetSpot(state),
      activePiece: state.activePiece ? {
        type: state.activePiece.type, rotation: state.activePiece.rotation,
        x: state.activePiece.x, y: state.activePiece.y,
      } : null,
      heldPiece: state.heldPiece, nextPiece: state.nextPiece,
      comboCounter: state.comboCounter,
      grid: state.grid.map(function (row) { return row.slice(); }),
      stressGrid: state.stressGrid.map(function (row) { return row.slice(); }),
      dropInterval: state.dropInterval,
      player: state.activePiece ? {x: state.activePiece.x, y: state.activePiece.y} : null,
      chocolateRowsRisen: state.chocolateRowsRisen,
      chocolateCell: CHOCOLATE_CELL,
      commentary: state.commentary.map(function (entry) {
        return {
          text: entry.text,
          x: entry.x,
          y: entry.y,
          ttl: entry.ttl,
          kind: entry.kind || 'warning',
        };
      }),
      echoTrail: state.echoTrail.map(function (echo) {
        return {
          colorIndex: echo.colorIndex,
          ttl: echo.ttl,
          maxTtl: echo.maxTtl,
          cells: echo.cells.map(function (cell) {
            return {x: cell.x, y: cell.y};
          }),
        };
      }),
      _matchedCells: state._matchedCells.map(function (cell) {
        return {x: cell.x, y: cell.y, color: cell.color};
      }),
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
