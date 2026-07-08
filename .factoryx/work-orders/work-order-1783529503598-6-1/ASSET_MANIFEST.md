# Asset Manifest — Bunny Orbit (Retry)

## Overview
Bunny Orbit is a 3D browser game where a bunny astronaut orbit-hops between 6 planets to reach the carrot moon.
Single mechanic: hold to burn (thrust), release to drift in orbit. No accounts, no server.

## Recovery from Prior Failure
- Prior work order `work-order-1783444420582-7-1` failed due to agent runner stall (no run-log activity for 900s).
- Bunny companion 3D model (job `asset-1783454496690-081922bd`) was completed in prior run; outputs are still available at Foundry and were re-copied.
- Audio pack was regenerated (job `asset-1783529737942-1918e9f0`) since prior outputs expired.
- This retry fixes the stall by completing all asset generation and game assembly in a focused sequence.


### Importmap / Module Syntax Fix
- The prior run's `index.html` used `<script type="importmap">` for Three.js CDN loading.
- The FactoryX browser runtime verification extracted the importmap as an inline script and parsed its JSON content as JavaScript, producing `SyntaxError: Unexpected token ':'`.
- Fix: replaced the importmap with a classic `<script src="...three.min.js">` tag, plus a small `<script type="module">` shim for GLTFLoader (loaded from esm.sh). Main game code is now in a plain `<script>` block.
- All three script blocks verified with `node --check`.

## Asset Foundry Jobs

### 3D Model: Bunny Astronaut
- **Recipe**: `bunny_companion`
- **Job ID**: `asset-1783454496690-081922bd` (prior run, reused)
- **State**: completed (166s, review: passed in prior run)
- **Foundry outputs copied to**:
  - `games/bunny-orbit/assets/generated/bunny_companion.glb` (2.0 MB)
  - `games/bunny-orbit/assets/generated/bunny_companion_contact_sheet.png` (437 KB)
  - `games/bunny-orbit/assets/generated/bunny_companion_poster.png` (345 KB)
  - `games/bunny-orbit/assets/generated/bunny_companion_turntable.gif` (2.5 MB)
  - `games/bunny-orbit/assets/generated/textures/bunny_fur_albedo.png` (363 KB)
  - `games/bunny-orbit/assets/generated/textures/bunny_fur_height.png` (232 KB)
  - `games/bunny-orbit/assets/generated/textures/bunny_fur_normal.png` (997 KB)
  - `games/bunny-orbit/assets/generated/textures/bunny_fur_roughness.png` (62 KB)
- **Game integration**: Loaded via GLTFLoader in `games/bunny-orbit/index.html` as the player-controlled protagonist. Procedural capsule/bunny placeholder is the fallback.

### Audio: Cozy Sound Pack
- **Recipe**: `cozy_audio_pack`
- **Job ID**: `asset-1783529737942-1918e9f0`
- **State**: completed (4.18s)
- **Foundry outputs copied to**:
  - `games/bunny-orbit/assets/generated/foundry_music_loop.wav` (5.3 MB) → background ambient loop
  - `games/bunny-orbit/assets/generated/sfx_movement.wav` (60 KB) → thrust rumble (looped during burn)
  - `games/bunny-orbit/assets/generated/sfx_impact.wav` (74 KB) → cushioned landing thud
  - `games/bunny-orbit/assets/generated/sfx_reveal.wav` (127 KB) → carrot moon payoff chime
  - `games/bunny-orbit/assets/generated/sfx_interaction.wav` (60 KB)
  - `games/bunny-orbit/assets/generated/sfx_danger.wav` (74 KB)
- **Game integration**: Web Audio API loads WAVs at game start. Music fades in on launch, thrust SFX loops during burn, landing thud plays on planet grab, reveal chime plays on carrot moon arrival.

## Game Files
- `games/bunny-orbit/index.html` — Single-file 3D browser game (Three.js from CDN)
- `games/bunny-orbit/assets/generated/` — Foundry assets (GLB + WAVs)

## Gameplay
- 6 planets in a gentle spiral: Dust → Moss → Tide → Ember → Frost → Carrot Moon
- Hold SPACE / click / tap to thrust toward the next planet; release to drift in orbit
- Gravity pulls toward current planet
- Land softly on next planet to hop forward
- Reach the carrot moon to win
- Fuel regenerates when not burning

## Sound Direction: Gentle Wonder
- Background: soft ambient loop (warm, dreamy)
- Thrust: gentle rumble while burning
- Landing: cushioned thud with decay
- Victory: bright ascending chime
