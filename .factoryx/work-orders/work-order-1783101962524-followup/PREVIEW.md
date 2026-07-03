# Preview — Firebreak Runner (rework follow-up)

Work Order: work-order-1783101962524-followup
Branch: factoryx/factory-ystackai/work-order-1783101962524-followup
Entrypoint: games/firebreak-runner/index.html (updated)

## What changed (material redesign per operator feedback)
- Replaced prior grid-based "Factory Firebreak" (station clicking, workers, incidents, waves) with the spec'd one-screen lane-dash runner.
- Core loop: 3 lanes, left/right switch (arrows/A-D or tap left/center/right zones), falling embers (dodge or lose), water drops (collect to douse).
- Progress: exactly 15 doused tiles at top = win + firebreak clear.
- Audio direction implemented: low rising ember hiss (modulated by #entities + progress), bright splash on each drop, quiet multi-layer wind on completion.
- Visuals: authored player sprite (file-backed PNG), drawn embers/drops for crisp motion, 15-tile strip, dark fire/cyan palette.
- One screen, one mechanic, no accounts/server.

## Assets (real file-backed)
See ASSET_MANIFEST.md. Player, ember, drop, and tile references generated under `games/firebreak-runner/assets/`.
Player sprite exercised in main play loop (drawn via drawImage from the authored file bytes).

## Evidence screenshots
- `screenshots/01-start.png` — start overlay + idle preview entities (embers/drops visible in lanes, HUD tiles, player at bottom).
- `screenshots/02-active-play.png` — captured after auto-start verification run (player, falling objects, hiss meter, douse progress).

## How to preview
Open `games/firebreak-runner/index.html` directly (self-contained; works file:// or served).
- Click ▶ RUN THE LINE or press Space/Enter.
- ← → or A/D or tap thirds of canvas to switch lanes.
- Collect drops (blue) → tiles at top turn doused.
- Hit ember (orange) → lose.
- Reach 15/15 → win + wind sfx.

## Runtime notes
- Uses Web Audio (resume on gesture). Hiss is continuous saw + bandpass noise, gain/filter driven by danger.
- No external loads except authored player PNG (also inlined as b64 for robustness).
- Responsive canvas, works on coarse pointer (touch zones active).

Preview root updated via `.factoryx/preview-entrypoint`.
