# Verification — Firebreak Runner

Work Order: work-order-1783034821336-8-1
id: firebreak-runner

## Runtime Verification
- Loaded via file:// + chromium --headless (no npm, no installs; used installed chromium + swiftshader)
- Start screen renders without error (overlay, title, instructions, hud)
- Active play (?demo seeds + forced draw + loop): player, embers, drops, tiles, lane dividers all painted
- 15 douse goal reachable; on collect douse counter and tile lighting advance; win triggers wind sfx path
- Hit ember ends run cleanly
- Controls: arrows/A D, canvas clicks map to lanes, touch zones present
- Audio init on gesture (or demo path); buffers decode from Foundry WAVs

## Screenshot Evidence (post-interaction / active)
- 01-title.png : clean title state, no console/runtime errors on load
- 04-active-play.png : player subject visible, nearest embers/drops identifiable, doused tiles (4/15 shown lit), separated from bg; no washout

## Asset Foundry
- Used before any fallback: job asset-1783034942702-1ba7a458 (cozy_audio_pack)
- Healthz + /api/recipes verified before submit
- job state: completed + review passed
- Files copied with full source URLs recorded in ASSET_MANIFEST.md
- No local oscillator-only or unlabeled blobs for audio; WAVs from /outputs/...

## Visual/Play Loop Contract
- Focal elements (player, embers, drops, tiles) drawn in main loop and exercised in active screenshot
- One mechanic: lane switch + dodge/collect until 15
- No external deps, no accounts, self contained

## Closeout
- Scoped to work order (no homepage mutation, no unrelated edits)
- Preview root points directly at artifact
- Ready for GitHub branch push + runtime PR attachment
