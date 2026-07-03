# blocks-2d usage — Firebreak Runner

Work Order: work-order-1783034821336-8-1
Game: games/firebreak-runner/index.html (self-contained)

## Decision
No blocks-2d modules were copied or inlined.

## Rationale
- The deliverable is specified as one self-contained HTML file (`index.html`) for direct file:// preview, runtime checks, and copied preview trees under `/factoryx/previews/...`. Including separate `.js` files would require either:
  - Multiple files (violates one-file contract for this minimal game)
  - Inlining ~500+ lines of block sources into the HTML (defeats "small scoped" and bloats the single file for a 3-lane toy)
- Game scope matches the Work Order exactly: one screen, one mechanic (lane switch + dodge/collect), no scenes beyond overlay toggle, no tweens, no particles, no screen shake, trivial input (3 discrete lanes).
- The inline rAF loop + manual spawn/collision is <60 LOC for update+draw combined, fixed spawn rate scaling, simple collision. It is stable (no tunneling at these speeds, no frame-dependent speed exposed to player), and produces deterministic title + active screenshots under headless chromium.
- Input uses direct listeners + immediate lane snap (no buffered multi-frame needs for this control model).
- Audio uses WebAudio directly for the exact 3 sfx behaviors described (hiss gain ramp, one-shot splash, wind tail); no webaudio-kit block required.
- Adding blocks would introduce unnecessary abstractions and load order for zero functional or charm gain on this spec.

## What the game implements inline (for transparency)
- Loop: `requestAnimationFrame` calling `update()` then `draw()` (variable dt, but dt never multiplies motion — speeds are per-tick constants + doused ramp).
- Spawn/collision: manual array walk + splice on y-threshold + lane match.
- State: 3 simple flags + scalar counters (playerLane, doused, running).
- Input: keydown + mousedown + touch/click zones map directly to lane index change.
- Render: immediate ctx calls, no retained display list or interpolation.

## If scope grew
For a larger game (multi-scene, easing motion, pooled fx, trauma camera) the `game-loop.js` + `input.js` + `scenes.js` would be copied verbatim into `games/firebreak-runner/` (as plain script tags before game code) and adapted only via config. That is not the case here.

## Verification
- `blocks_usage.md` now present next to `index.html`.
- Matches contract: documented use (none) + honest why.
- Browser smoke (chromium --headless on title + ?demo) still passes with current inline loop.
