# ASSET_MANIFEST — Firebreak Runner (rework)

Work Order: work-order-1783101962524-followup
Deliverable: firebreak-runner (default node)
Parent: work-order-1783034821336-8-1
Operator feedback: rework (🔁 reaction on preview)

## Summary
Material redesign from prior Factory Firebreak grid sim (click-to-assign workers on stations) to the specified one-screen endless lane-dash runner:
- Three vertical lanes
- Player switches lanes (keyboard arrows/A-D or tap zones)
- Falling embers (dodge) + water drops (collect)
- Top progress: 15 burning tiles; each collected drop douses one tile sequentially
- Run completes with clear firebreak after exactly 15 doused tiles
- Audio: rising low ember hiss (danger-modulated saw+noise), bright splash per drop, quiet layered wind on win

## Generated / Authored Assets (file-backed, per asset_contract_v2)
All assets live under `games/firebreak-runner/assets/` (real files on disk, reviewable, plus used in play loop):

- `player.png` (48x64, 506B) — authored firefighter/runner silhouette (hardhat, orange jacket, water-drop emblem, boots). Generated via PIL for consistent silhouette, head/visor, grounded feet. Focal visual subject exercised in main play loop.
- `ember.png` (32x32, 2.5kB) — layered glowing flame hazard. Source for hazard concept; runtime uses crisp canvas draw for speed/scale but file stands as authored reference.
- `drop.png` (32x32, 292B) — blue teardrop with specular. Reference for collectible; runtime canvas draw.
- `tile_burn.png` / `tile_clear.png` (24x24) — 15-tile progress strip references (burning orange, doused cyan with check). HUD uses DOM + CSS for crisp scaling; files document the treatment.

Provenance: deterministic PIL draw scripts executed during this work order (see shell history in worker log). No external images or procedural-only in final (files + manifest present).

Integration notes:
- Player sprite loaded via data URL (b64 of the file) for self-contained direct open + served preview. Same bytes as `assets/player.png`.
- Hazards/collectibles drawn in-canvas for zero extra loads + perfect pixel control under ramping speed.
- All audio is Web Audio procedural matching the spec direction (no samples needed; hiss rises with entity count + progress).
- Entities, collisions, and douse count run in the active play loop (not title-only).

## Verification performed
- Browser load + start screen + active play (see PREVIEW.md / VERIFICATION.md)
- Keyboard lane switch, pointer/tap lane set, collect vs. hit paths exercised
- 15 douse win path + wind sfx, ember hit lose path
- Hiss gain + filter modulation audible with rising danger
- Screenshot evidence captured via chromium --headless

## Prior work kept / changed
- Kept: canvas/HUD/overlay/audioContext patterns and color language from useful prior iteration (dark + fire/cyan accents)
- Materially changed: core mechanic, input model (lane switch vs click grid), win/lose conditions, progress visualization, sound design, player subject, camera framing (one screen runner), and asset treatment.
- Removed: grid, stations, workers, waves, complex incidents, crew portraits, 180s timer — not part of the runner spec.

No Asset Foundry used (2D browser runner, not 3D or music pack recipe match). All required assets are local file-backed under games/.

## Next
Commit + push per GitHub closeout gate. Preview entrypoint updated. Runtime verification + screenshots attached to work order notes.
