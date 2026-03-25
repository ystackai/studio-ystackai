/**
 * StackY Game Engine — Falling-block candy factory puzzle.
 *
 * 7 candy block shapes with SRS rotation, gravity, line clearing,
 * chocolate river hazard, gravity echoes, stress scars, and
 * Oompa Loompa commentary.
 *
 * Depends on: pieces.js (StackyPieces)
 */
'use strict';

var StackyGame = (function () {
  var P = StackyPieces;

  // Scoring table (Guideline)
  var LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };

  // Chocolate river constants
  var CHOCOLATE_CELL = 8;            // grid value for chocolate blocks
  var CHOCOLATE_INTERVAL = 30000;    // ms between chocolate row rises
  var CHOCOLATE_GAPS = 2;            // random gaps per chocolate row
  var CHOCOLATE_CLEAR_BONUS = 500;   // flat bonus per chocolate row cleared
  var BOUNDARY_CHECK_INTERVAL = 500; // ms between top-boundary collision checks

  // localStorage key
  var LS_KEY = 'stacky_hi';

  function loadHi() {
    try { return parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0; }
    catch (_) { return 0; }
  }
  function saveHi(n) {
    try { localStorage.setItem(LS_KEY, String(n)); } catch (_) {}
  }

  // 7-bag randomizer
  function createBag() {
    var bag = P.TYPES.slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
    return bag;
  }

  /**
   * Create a fresh game state object.
   */
  // Oompa Loompa commentary pool
  var COMMENTARY = [
    "The Oompa Loompas are watching.",
    "Wonka would never.",
    "That's going straight to the chocolate river.",
    "Veruca Salt made better moves.",
    "Even Augustus Gloop wouldn't do that.",
    "The factory is not impressed.",
    "That gap will haunt you.",
    "The candy blocks weep.",
    "Wonka just shook his head.",
    "The squirrels would reject this.",
  ];
  var GAMEOVER_COMMENTARY = [
    "The factory is disappointed.",
    "Wonka has seen enough.",
    "The Oompa Loompas will sing about this failure.",
    "The chocolate river claims another soul.",
  ];

  function createState() {
    return {
      grid: createEmptyGrid(),
      activePiece: null,
      heldPiece: null,
      holdUsedThisTurn: false,
      score: 0,
      hi: loadHi(),
      level: 1,
      linesCleared: 0,
      alive: true,
      phase: 'idle',       // 'idle' | 'playing' | 'paused' | 'gameOver'
      goldenTickets: 0,
      comboCounter: 0,
      dropInterval: 1000,  // ms between gravity drops
      lastDropTime: 0,
      lockDelayActive: false,
      lockDelayTimer: 0,
      lockDelayMax: 30,    // frames before auto-lock
      bag: [],
      nextPiece: null,
      // Chocolate river state
      lastChocolateTime: 0,
      chocolateRowsRisen: 0,
      lastBoundaryCheck: 0,
      // Gravity echo — ghost afterimages of recent placements
      echoTrail: [],       // [{cells, colorIndex, ttl, maxTtl}]
      // Stress grid — scars from near-misses
      stressGrid: createEmptyGrid(),
      // Commentary events for renderer
      commentary: [],      // [{text, x, y, ttl}]
      // Events for renderer/audio hooks
      _events: [],         // [{type, data}] — consumed each frame
    };
  }

  function createEmptyGrid() {
    var grid = [];
    for (var y = 0; y < P.ROWS; y++) {
      grid.push(new Array(P.COLS).fill(0));
    }
    return grid;
  }

  /**
   * Check if a piece placement causes a collision.
   * Uses >= for boundary checks (fixes off-by-one issue).
   */
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

  /** Pull next piece type from the 7-bag. */
  function nextFromBag(state) {
    if (state.bag.length === 0) {
      state.bag = createBag();
    }
    return state.bag.pop();
  }

  /** Spawn a new piece at the top. */
  function spawnPiece(state) {
    var type = state.nextPiece || nextFromBag(state);
    state.nextPiece = nextFromBag(state);

    state.activePiece = {
      type: type,
      rotation: 0,
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
      // Game over commentary
      var goQuip = GAMEOVER_COMMENTARY[Math.floor(Math.random() * GAMEOVER_COMMENTARY.length)];
      state.commentary.push({text: goQuip, x: 150, y: 250, ttl: 180});
      state._events.push({type: 'gameOver', data: {commentary: goQuip}});
      if (state.score > state.hi) {
        state.hi = state.score;
        saveHi(state.hi);
      }
    }
  }

  /** Start a new game. */
  function start(state) {
    state.grid = createEmptyGrid();
    state.activePiece = null;
    state.heldPiece = null;
    state.holdUsedThisTurn = false;
    state.score = 0;
    state.level = 1;
    state.linesCleared = 0;
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
    state.lastBoundaryCheck = 0;
    state.echoTrail = [];
    state.stressGrid = createEmptyGrid();
    state.commentary = [];
    state._events = [];
    spawnPiece(state);
    syncGameState(state);
  }

  /** Move active piece left. Returns true on success. */
  function moveLeft(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var candidate = {
      type: state.activePiece.type,
      rotation: state.activePiece.rotation,
      x: state.activePiece.x - 1,
      y: state.activePiece.y,
    };
    if (!checkCollision(state.grid, candidate)) {
      state.activePiece.x = candidate.x;
      if (state.lockDelayActive) state.lockDelayTimer = 0;
      return true;
    }
    return false;
  }

  /** Move active piece right. */
  function moveRight(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var candidate = {
      type: state.activePiece.type,
      rotation: state.activePiece.rotation,
      x: state.activePiece.x + 1,
      y: state.activePiece.y,
    };
    if (!checkCollision(state.grid, candidate)) {
      state.activePiece.x = candidate.x;
      if (state.lockDelayActive) state.lockDelayTimer = 0;
      return true;
    }
    return false;
  }

  /** Rotate clockwise with SRS wall kicks. */
  function rotateCW(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    if (state.activePiece.type === 'O') return true;
    var fromRot = state.activePiece.rotation;
    var toRot = (fromRot + 1) % 4;
    var kicks = P.getKicks(state.activePiece.type, fromRot, toRot);
    for (var i = 0; i < kicks.length; i++) {
      var candidate = {
        type: state.activePiece.type,
        rotation: toRot,
        x: state.activePiece.x + kicks[i][0],
        y: state.activePiece.y - kicks[i][1], // SRS Y is inverted
      };
      if (!checkCollision(state.grid, candidate)) {
        state.activePiece.rotation = toRot;
        state.activePiece.x = candidate.x;
        state.activePiece.y = candidate.y;
        if (state.lockDelayActive) state.lockDelayTimer = 0;
        return true;
      }
    }
    return false;
  }

  /** Rotate counter-clockwise with SRS wall kicks. */
  function rotateCCW(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    if (state.activePiece.type === 'O') return true;
    var fromRot = state.activePiece.rotation;
    var toRot = (fromRot + 3) % 4;
    var kicks = P.getKicks(state.activePiece.type, fromRot, toRot);
    for (var i = 0; i < kicks.length; i++) {
      var candidate = {
        type: state.activePiece.type,
        rotation: toRot,
        x: state.activePiece.x + kicks[i][0],
        y: state.activePiece.y - kicks[i][1],
      };
      if (!checkCollision(state.grid, candidate)) {
        state.activePiece.rotation = toRot;
        state.activePiece.x = candidate.x;
        state.activePiece.y = candidate.y;
        if (state.lockDelayActive) state.lockDelayTimer = 0;
        return true;
      }
    }
    return false;
  }

  /** Soft drop: move piece down one row. +1 score. */
  function softDrop(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var candidate = {
      type: state.activePiece.type,
      rotation: state.activePiece.rotation,
      x: state.activePiece.x,
      y: state.activePiece.y + 1,
    };
    if (!checkCollision(state.grid, candidate)) {
      state.activePiece.y = candidate.y;
      state.score += 1;
      state.lockDelayActive = false;
      return true;
    }
    return false;
  }

  /** Hard drop: instant placement at lowest valid y. +2 per row. */
  function hardDrop(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    var dropDistance = 0;
    while (true) {
      var candidate = {
        type: state.activePiece.type,
        rotation: state.activePiece.rotation,
        x: state.activePiece.x,
        y: state.activePiece.y + dropDistance + 1,
      };
      if (checkCollision(state.grid, candidate)) break;
      dropDistance++;
    }
    state.activePiece.y += dropDistance;
    state.score += dropDistance * 2;
    lockPiece(state);
    return true;
  }

  /** Get the ghost piece Y position (hard drop preview). */
  function getGhostY(state) {
    if (!state.activePiece) return 0;
    var ghostY = state.activePiece.y;
    while (true) {
      var candidate = {
        type: state.activePiece.type,
        rotation: state.activePiece.rotation,
        x: state.activePiece.x,
        y: ghostY + 1,
      };
      if (checkCollision(state.grid, candidate)) break;
      ghostY++;
    }
    return ghostY;
  }

  /** Lock piece into grid and handle line clears. */
  function lockPiece(state) {
    if (!state.activePiece) return;
    var cells = P.getCells(state.activePiece);
    var colorIndex = P.TYPES.indexOf(state.activePiece.type) + 1;

    // Record echo trail before locking
    state.echoTrail.push({
      cells: cells.map(function(c) { return {x: c.x, y: c.y}; }),
      colorIndex: colorIndex,
      ttl: 300,     // frames (~5 seconds at 60fps)
      maxTtl: 300,
    });
    // Limit trail size
    if (state.echoTrail.length > 20) state.echoTrail.shift();

    // Calculate drop distance for shake event
    var ghostY = getGhostY(state);
    var dropDist = ghostY - state.activePiece.y;

    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.y >= 0 && c.y < P.ROWS && c.x >= 0 && c.x < P.COLS) {
        state.grid[c.y][c.x] = colorIndex;
      }
    }

    // Check if placement created gaps (bad move → commentary)
    var createdGap = false;
    for (var gi = 0; gi < cells.length; gi++) {
      var gc = cells[gi];
      if (gc.y + 1 < P.ROWS && state.grid[gc.y + 1] && state.grid[gc.y + 1][gc.x] === 0) {
        // Block placed with empty space below — gap created
        createdGap = true;
        break;
      }
    }
    if (createdGap && Math.random() < 0.2) {
      var quip = COMMENTARY[Math.floor(Math.random() * COMMENTARY.length)];
      var cx = cells[0].x * 30 + 15;
      var cy = cells[0].y * 30;
      state.commentary.push({text: quip, x: cx, y: cy, ttl: 120});
      state._events.push({type: 'commentary', data: {text: quip}});
    }

    // Emit lock event with drop distance for shake
    if (dropDist > 3) {
      state._events.push({type: 'shake', data: {intensity: dropDist * 0.5}});
    }

    state.activePiece = null;
    if (typeof StackyAudio !== 'undefined') {
      StackyAudio.playLock();
    }
    var cleared = clearLines(state);
    if (cleared > 0) {
      updateScore(state, cleared);
      state.comboCounter++;
      // Emit line clear events
      state._events.push({type: 'lineClear', data: {count: cleared}});
      if (cleared >= 4) {
        state._events.push({type: 'scream'});
      } else {
        state._events.push({type: 'whisper', data: {intensity: Math.min(state.level / 5, 3)}});
      }
    } else {
      state.comboCounter = 0;
    }

    // Update stress grid — cells in rows that were almost full get stressed
    for (var sy = 0; sy < P.ROWS; sy++) {
      var filled = 0;
      for (var sx = 0; sx < P.COLS; sx++) {
        if (state.grid[sy][sx] !== 0) filled++;
      }
      // Row 80%+ full but not cleared = near-miss stress
      if (filled >= P.COLS * 0.8 && filled < P.COLS) {
        for (var ssx = 0; ssx < P.COLS; ssx++) {
          if (state.grid[sy][ssx] !== 0) {
            state.stressGrid[sy][ssx] = Math.min((state.stressGrid[sy][ssx] || 0) + 1, 5);
          }
        }
      }
    }

    spawnPiece(state);
  }

  /**
   * Create a chocolate row: filled with CHOCOLATE_CELL except for random gaps.
   */
  function createChocolateRow() {
    var row = new Array(P.COLS).fill(CHOCOLATE_CELL);
    // Punch random gaps so the row doesn't auto-clear
    var gaps = [];
    while (gaps.length < CHOCOLATE_GAPS) {
      var g = Math.floor(Math.random() * P.COLS);
      if (gaps.indexOf(g) === -1) gaps.push(g);
    }
    for (var i = 0; i < gaps.length; i++) {
      row[gaps[i]] = 0;
    }
    return row;
  }

  /**
   * Rise one chocolate row from the bottom, pushing the grid up.
   * Returns false if the rise causes game over (top row occupied).
   */
  function riseChocolateRow(state) {
    // Check if top row has any blocks — if so, rising will push them off
    for (var x = 0; x < P.COLS; x++) {
      if (state.grid[0][x] !== 0) {
        state.alive = false;
        state.phase = 'gameOver';
        if (state.score > state.hi) {
          state.hi = state.score;
          saveHi(state.hi);
        }
        return false;
      }
    }
    // Shift grid up by removing top row, push chocolate row at bottom
    state.grid.shift();
    state.grid.push(createChocolateRow());
    state.chocolateRowsRisen++;

    // Adjust active piece position
    if (state.activePiece) {
      state.activePiece.y -= 1;
      if (state.activePiece.y < 0 || checkCollision(state.grid, state.activePiece)) {
        lockPiece(state);
      }
    }
    // Emit shake for chocolate rise
    state._events.push({type: 'shake', data: {intensity: 3}});
    state._events.push({type: 'chocolateRise'});
    return true;
  }

  /**
   * Clear completed lines, return count.
   * Also counts how many cleared rows contained chocolate cells (for bonus).
   */
  function clearLines(state) {
    var cleared = 0;
    var chocolateCleared = 0;
    for (var y = P.ROWS - 1; y >= 0; y--) {
      var full = true;
      for (var x = 0; x < P.COLS; x++) {
        if (state.grid[y][x] === 0) { full = false; break; }
      }
      if (full) {
        // Check if this row had any chocolate cells
        var hasChocolate = false;
        for (var cx = 0; cx < P.COLS; cx++) {
          if (state.grid[y][cx] === CHOCOLATE_CELL) { hasChocolate = true; break; }
        }
        if (hasChocolate) chocolateCleared++;
        state.grid.splice(y, 1);
        state.grid.unshift(new Array(P.COLS).fill(0));
        cleared++;
        y++; // re-check this row
      }
    }
    state.linesCleared += cleared;
    state._lastChocolateCleared = chocolateCleared;
    return cleared;
  }

  /** Update score based on lines cleared. */
  function updateScore(state, lines) {
    var points = (LINE_SCORES[lines] || 0) * state.level;
    // Chocolate river bonus: flat 500 per chocolate row cleared
    var chocoCleared = state._lastChocolateCleared || 0;
    if (chocoCleared > 0) {
      points += chocoCleared * CHOCOLATE_CLEAR_BONUS;
    }
    state.score += points;

    // Golden Ticket: 4-line clear (Tetris)
    if (lines === 4) {
      state.goldenTickets++;
    }

    // Level progression: every 10 lines
    var newLevel = Math.floor(state.linesCleared / 10) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      state.dropInterval = Math.max(100, 1000 - (state.level - 1) * 75);
    }

    if (state.score > state.hi) {
      state.hi = state.score;
      saveHi(state.hi);
    }
  }

  /** Hold piece: swap active with held. */
  function hold(state) {
    if (!state.activePiece || state.phase !== 'playing') return false;
    if (state.holdUsedThisTurn) return false;
    var currentType = state.activePiece.type;
    if (state.heldPiece) {
      state.activePiece = {
        type: state.heldPiece,
        rotation: 0,
        x: Math.floor((P.COLS - 4) / 2),
        y: 0,
      };
      state.heldPiece = currentType;
    } else {
      state.heldPiece = currentType;
      spawnPiece(state);
    }
    state.holdUsedThisTurn = true;
    return true;
  }

  /** Get the maximum tower height (highest occupied row from bottom). */
  function getMaxHeight(state) {
    for (var y = 0; y < P.ROWS; y++) {
      for (var x = 0; x < P.COLS; x++) {
        if (state.grid[y][x] !== 0) return P.ROWS - y;
      }
    }
    return 0;
  }

  /** Gravity tick — called each frame with timestamp. */
  function tick(state, timestamp) {
    if (state.phase !== 'playing' || !state.activePiece) return;

    // Decay echo trail
    for (var ei = state.echoTrail.length - 1; ei >= 0; ei--) {
      state.echoTrail[ei].ttl--;
      if (state.echoTrail[ei].ttl <= 0) state.echoTrail.splice(ei, 1);
    }

    // Decay commentary
    for (var ci = state.commentary.length - 1; ci >= 0; ci--) {
      state.commentary[ci].ttl--;
      state.commentary[ci].y -= 0.5; // float upward
      if (state.commentary[ci].ttl <= 0) state.commentary.splice(ci, 1);
    }

    // Emit tower height for music tempo
    var height = getMaxHeight(state);
    state._events.push({type: 'heightUpdate', data: {height: height}});
    // Near-collapse bass drop
    if (height >= P.ROWS - 3) {
      state._events.push({type: 'nearCollapse'});
    }

    // Chocolate river: rise a row every CHOCOLATE_INTERVAL ms
    if (state.lastChocolateTime === 0) {
      state.lastChocolateTime = timestamp;
    }
    if (timestamp - state.lastChocolateTime >= CHOCOLATE_INTERVAL) {
      state.lastChocolateTime = timestamp;
      // Rise 2 chocolate rows per interval ("bottom 2 rows fill")
      for (var cr = 0; cr < 2; cr++) {
        if (!riseChocolateRow(state)) return; // game over from chocolate
      }
    }

    // Periodic boundary check: detect if any locked block has been pushed
    // into the top row by rising chocolate, triggering game over.
    if (state.lastBoundaryCheck === 0) {
      state.lastBoundaryCheck = timestamp;
    }
    if (timestamp - state.lastBoundaryCheck >= BOUNDARY_CHECK_INTERVAL) {
      state.lastBoundaryCheck = timestamp;
      // If active piece now collides after grid shift, end the game
      if (state.activePiece && checkCollision(state.grid, state.activePiece)) {
        state.alive = false;
        state.phase = 'gameOver';
        if (state.score > state.hi) {
          state.hi = state.score;
          saveHi(state.hi);
        }
        return;
      }
    }

    if (timestamp - state.lastDropTime >= state.dropInterval) {
      state.lastDropTime = timestamp;
      var candidate = {
        type: state.activePiece.type,
        rotation: state.activePiece.rotation,
        x: state.activePiece.x,
        y: state.activePiece.y + 1,
      };
      if (!checkCollision(state.grid, candidate)) {
        state.activePiece.y = candidate.y;
      } else {
        if (state.lockDelayActive) {
          state.lockDelayTimer++;
          if (state.lockDelayTimer >= state.lockDelayMax) {
            lockPiece(state);
          }
        } else {
          state.lockDelayActive = true;
          state.lockDelayTimer = 0;
        }
      }
    }
  }

  /** Pause / resume / toggle. */
  function pause(state) {
    if (state.phase === 'playing') state.phase = 'paused';
  }
  function resume(state) {
    if (state.phase === 'paused') state.phase = 'playing';
  }
  function togglePause(state) {
    if (state.phase === 'playing') pause(state);
    else if (state.phase === 'paused') resume(state);
  }

  /** Process a single input key. */
  function processInput(state, key) {
    if (state.phase !== 'playing') {
      if (key === 'Escape' || key === 'p' || key === 'P') {
        togglePause(state);
      }
      return;
    }
    switch (key) {
      case 'ArrowLeft':  case 'a': case 'A': moveLeft(state); break;
      case 'ArrowRight': case 'd': case 'D': moveRight(state); break;
      case 'ArrowDown':  case 's': case 'S': softDrop(state); break;
      case 'ArrowUp':    case 'w': case 'W': rotateCW(state); break;
      case ' ':          hardDrop(state); break;
      case 'z': case 'Z': rotateCCW(state); break;
      case 'c': case 'C': hold(state); break;
      case 'Escape': case 'p': case 'P': togglePause(state); break;
    }
  }

  /** Sync window.gameState for automated testing. */
  function syncGameState(state) {
    window.gameState = {
      score: state.score,
      hi: state.hi,
      level: state.level,
      linesCleared: state.linesCleared,
      alive: state.alive,
      gameOver: !state.alive,
      phase: state.phase,
      goldenTickets: state.goldenTickets,
      activePiece: state.activePiece ? {
        type: state.activePiece.type,
        rotation: state.activePiece.rotation,
        x: state.activePiece.x,
        y: state.activePiece.y,
      } : null,
      heldPiece: state.heldPiece,
      nextPiece: state.nextPiece,
      comboCounter: state.comboCounter,
      grid: state.grid.map(function (row) { return row.slice(); }),
      dropInterval: state.dropInterval,
      player: state.activePiece ? {
        x: state.activePiece.x,
        y: state.activePiece.y,
      } : null,
      chocolateRowsRisen: state.chocolateRowsRisen,
      chocolateCell: CHOCOLATE_CELL,
    };
  }

  return {
    createState: createState,
    start: start,
    moveLeft: moveLeft,
    moveRight: moveRight,
    rotateCW: rotateCW,
    rotateCCW: rotateCCW,
    softDrop: softDrop,
    hardDrop: hardDrop,
    hold: hold,
    tick: tick,
    pause: pause,
    resume: resume,
    togglePause: togglePause,
    processInput: processInput,
    syncGameState: syncGameState,
    getGhostY: getGhostY,
    checkCollision: checkCollision,
    riseChocolateRow: riseChocolateRow,
    getMaxHeight: getMaxHeight,
    CHOCOLATE_CELL: CHOCOLATE_CELL,
    CHOCOLATE_INTERVAL: CHOCOLATE_INTERVAL,
  };
})();
