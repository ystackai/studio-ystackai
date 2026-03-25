'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const STACKY_DIR = __dirname;

function loadRuntime() {
  const context = {
    console,
    Math,
    Date,
    setTimeout,
    clearTimeout,
    performance: { now: () => Date.now() },
    localStorage: {
      _store: Object.create(null),
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null;
      },
      setItem(key, value) {
        this._store[key] = String(value);
      },
    },
  };
  context.window = context;
  vm.createContext(context);

  for (const file of ['pieces.js', 'game.js']) {
    const source = fs.readFileSync(path.join(STACKY_DIR, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }

  return {
    context,
    StackyGame: context.StackyGame,
    StackyPieces: context.StackyPieces,
  };
}

function runTicks(StackyGame, state, frames) {
  for (let i = 0; i < frames; i++) {
    StackyGame.tick(state, i * 16);
  }
}

function takeEvents(state) {
  const events = state._events.slice();
  state._events.length = 0;
  return events;
}

function testStressGridAndImpactShake() {
  const { StackyGame } = loadRuntime();
  const state = StackyGame.createState();
  StackyGame.start(state);

  state.activePiece = { type: 'O', rotation: 0, x: 4, y: 0, spawnY: 0 };
  takeEvents(state);
  StackyGame.hardDrop(state);
  const events = takeEvents(state);

  assert.ok(events.some((event) => event.type === 'shake'), 'hard drop should emit a shake event');
  assert.equal(state.stressGrid.length, 20, 'stressGrid should track all rows');
  assert.ok(
    state.stressGrid.some((row) => row.some((value) => value > 0)),
    'stressGrid should record placement scars after a heavy landing'
  );
}

function testHoldCollisionTriggersGameOver() {
  const { StackyGame } = loadRuntime();
  const state = StackyGame.createState();
  StackyGame.start(state);

  state.activePiece = { type: 'O', rotation: 0, x: 4, y: 0, spawnY: 0 };
  state.heldPiece = 'I';
  state.grid[0][3] = 7;

  const result = StackyGame.hold(state);

  assert.equal(result, false, 'hold should fail if the swapped piece cannot spawn');
  assert.equal(state.phase, 'gameOver', 'blocked hold swap should end the run');
}

function testChocolateRiverCatchesActivePiece() {
  const { StackyGame } = loadRuntime();
  const state = StackyGame.createState();
  StackyGame.start(state);

  state.activePiece = { type: 'T', rotation: 0, x: 3, y: 0, spawnY: 0 };
  const survived = StackyGame.riseChocolateRow(state);

  assert.equal(survived, false, 'river rise should fail when it catches the active piece');
  assert.equal(state.phase, 'gameOver', 'river catching the active piece should cause game over');
}

function testLineClearCarriesRealEventData() {
  const { StackyGame } = loadRuntime();
  const state = StackyGame.createState();
  StackyGame.start(state);

  state.grid[19][4] = 1;
  state.activePiece = { type: 'I', rotation: 0, x: 0, y: 0, spawnY: 0 };
  takeEvents(state);

  StackyGame.hardDrop(state);
  runTicks(StackyGame, state, 31);
  const events = takeEvents(state);
  const clearEvent = events.find((event) => event.type === 'lineClear');

  assert.ok(clearEvent, 'detonation should emit a lineClear event');
  assert.deepEqual(Array.from(clearEvent.data.affectedRows), [19], 'lineClear should point at the actual cleared row');
  assert.equal(clearEvent.data.cellsCleared, 5, 'lineClear should report the actual number of cleared cells');
  assert.equal(clearEvent.data.cells.length, 5, 'lineClear should include the actual cleared cells');
  assert.equal(typeof clearEvent.data.phrase, 'string', 'lineClear should include a regret phrase');
  assert.ok(
    state.commentary.some((entry) => entry.kind === 'regret'),
    'line clears should leave visible regret commentary behind'
  );
}

function testStressGridFollowsChocolateShift() {
  const { StackyGame } = loadRuntime();
  const state = StackyGame.createState();
  StackyGame.start(state);

  state.grid[5][2] = 4;
  state.stressGrid[5][2] = 3;
  state.activePiece = null;
  state.grid[0] = new Array(10).fill(0);

  const survived = StackyGame.riseChocolateRow(state);

  assert.equal(survived, true, 'river should rise on an otherwise safe board');
  assert.equal(state.grid[4][2], 4, 'grid cells should move upward when the river rises');
  assert.equal(state.stressGrid[4][2], 3, 'stress scars should move with the blocks they belong to');
}

const tests = [
  testStressGridAndImpactShake,
  testHoldCollisionTriggersGameOver,
  testChocolateRiverCatchesActivePiece,
  testLineClearCarriesRealEventData,
  testStressGridFollowsChocolateShift,
];

let passed = 0;
for (const test of tests) {
  test();
  passed++;
  console.log('PASS', test.name);
}

console.log(`runtime regression tests: ${passed}/${tests.length} passed`);
