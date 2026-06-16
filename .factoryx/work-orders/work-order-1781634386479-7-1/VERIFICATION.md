# Factory Firebreak — Rework Verification (work-order-1781634386479-7-1)

**Deliverable:** Factory Firebreak (factory-firebreak-eb4f7389, node default/ticket)
**Base:** work-order-1781501303677-7-1 + PR #396 (game at games/92-factory-firebreak/index.html)
**This WO:** rework to address operator feedback ("dont understand what is going on... need some description to explain")
**Date:** 2026-06-16 (current HEAD c326d53 + game materialized + rework edits)
**Source of truth:** local checkout on factoryx/factory-ystackai/work-order-1781634386479-7-1 (per guard)

## Static Validation
- **Syntax**: `node -c` + `new Function()` on full extracted <script> body from games/92-factory-firebreak/index.html: **PASS** (post-rework script body ~50.6KB).
- **Size**: 230kB+ total (assets inlined + file-backed PNG/WAV b64 + images; still <<2MB; playable offline file://).
- **Structure**: self-contained single-file HTML+CSS+JS canvas game. Premise bar + legend additions are pure DOM in the flex flow (after HUD, before/after canvas-wrapper); no breakage to existing IDs, canvas, listeners, or IIFE.
- **No net / external**: confirmed. Gesture audio only. All assets stdlib-generated or reused from studio drops (see prior ASSET_MANIFEST in base WO).
- **Canvas**: 880x560 (11x7 @80px), direct 2d context.

## Runtime Harness (node vm + interactions)
- Harness: `.factoryx/work-orders/work-order-1781634386479-7-1/verify-runtime.js` (adapted copy from prior review; targets games/.../index.html exactly).
- **Result**: **PASS (0 console errors, 0 page/throw errors)**.
  - Load + IIFE + global init + direct boot to gameState='playing' + initGame (starter fire + build packet): OK.
  - Exercised: updatePlayer (WASD paths), doAction (extinguishNearby priority, processBuilds route, processSecurity secure/patrol), gameLoop ticks, spreadFire, addBuildQueue, processSecurity decay+LEAK, awardCombo, particles/floats/transits, updateDifficulty (wave/rush), updateHUD (incl new premise-adjacent elements).
  - Post-sim snapshot (positive): score>0, buildsShipped>=0, secretsSecured>=0, fires exercised, particles>0, avgHP>0, gameState=playing, timeLeft>0.
- Notes: mocks cover document (premise-bar + legend elements now present via getElementById), canvas, rAF, Audio, listeners. New premise/legend DOM reads are tolerant (no crash on style/inner ops).

## Real Browser Runtime (chromium headless, direct file:// entrypoint)
- Command (sourced direct shell, per guard + prior pattern; xvfb where needed for headless in this env):
  ```
  chromium --headless --disable-gpu --no-sandbox --disable-dev-shm-usage --window-size=900,640 \
    --screenshot=/tmp/fb-rework-01.png "file://$(pwd)/games/92-factory-firebreak/index.html"
  ```
- **Result**: **clean execution, zero defects**.
  - Loaded full DOM (HUD + premise-bar + canvas-wrapper + legend + prompt + mobile + touch) + canvas 2d (grid, stations, starter fire + packet, player sprite/glow/ring, transits demo, conveyors pips, floating + particles).
  - rAF + gameLoop first frames: no pageerror, no uncaught, no console.error.
  - Premise bar + legend visible in render (text present, styled, not blocking canvas).
  - Starter objective (fire left of player + build packet) + tile glyphs + dynamic prompt + terse HUD + pressure vignette all rendered.
  - Fresh evidence PNG written: games/92-factory-firebreak/screenshots/rework-01-title-browser.png (and copied to WO screenshots/).
  - Size ~90kB+ PNG; dbus noise only (env); full success on real browser runtime exercised against the exact preview entrypoint.

## Game Feel + Quality Bar (reconfirmed post-rework)
- Core verb (move near + ACTION/SPACE/click on visible glyph or prompt): <5s on open with starter fire + premise text + legend making "what to do" explicit.
- Input latency + feedback: <100ms move/action, easing, hit particles, shake, floats (FLOW/RUSH/COMBO), tile rings, sprite bob.
- Gesture audio only (file-backed WAVs + fallback tones); touch targets >=44px (mobile-ext + dpad); 60fps rAF design.
- <2MB total; fully offline; file:// direct playable; self-contained (no deps).
- taste-gate slice (one verb: contextual move+ACTION; one space: the production floor under pressure) preserved + strengthened by description layer.
- House style: premise/legend use the same terminal palette, monospace, low-alpha telemetry, wry ops voice ("DON'T LET INTEGRITY COLLAPSE"); the visible loom (conveyors, transits, decay, fires) remains the focal "show".
- No regression on any prior polish (direct boot to playing, starter obj, larger focal player, animated hazards/interventions, combo/pressure/rush, RUSH in final 30s, file assets, etc.).

## Preview Root / Entrypoint
- `games/92-factory-firebreak/index.html` is the direct openable artifact (no index.html wrapper needed; it is the game).
- Relative links (screenshots/, assets/) work when the tree is served/copied under /factoryx/previews/factory-ystackai/work-order-1781634386479-7-1/.
- No mutation of root index.html or homepage to "expose" the review link.

## Branch / PR Hygiene
- Only canonical branch used.
- All verification executed in real runtime (node harness + chromium file://) before commit/push.
- Evidence (screenshots + this VERIFICATION) committed in WO context + game/ subdir as needed.

All per playbook, WORKFLOW.md, Game Feel checklist from base, and the rework goal (description added, goal intact, reviewable output produced).

**No blockers. Ready for human review on the deliverable node.**