# Firebreak Runner — Asset Manifest

Work Order: work-order-1783034821336-8-1
Deliverable: firebreak-runner
Game: games/firebreak-runner/

## Foundry Jobs

### cozy_audio_pack (for ember hiss / danger, splash, wind sfx)
- Submitted: 2026-07-02
- recipe: cozy_audio_pack
- asset_name: firebreak-runner-audio
- prompt: "low ember hiss rising with danger for lane runner, bright splash for water drop collect, quiet wind success for firebreak complete after 15 tiles. crisp minimal game audio"
- style: "procedural crisp sfx, low-fi game, danger hiss, water splash, soft wind"
- job_id: asset-1783034942702-1ba7a458
- job_dir: /asset-foundry/outputs/asset-1783034942702-1ba7a458
- state at submit: queued
- final_state: completed (review passed)
- request_json: {"recipe":"cozy_audio_pack","asset_name":"firebreak-runner-audio","prompt":"low ember hiss rising with danger for lane runner, bright splash for water drop collect, quiet wind success for firebreak complete after 15 tiles. crisp minimal game audio","style":"procedural crisp sfx, low-fi game, danger hiss, water splash, soft wind"}

Job ID recorded immediately on submit. Poll status with foreground; copy outputs from http://factoryx-ystackai-asset-foundry:18113/outputs/asset-1783034942702-1ba7a458/ to games/firebreak-runner/assets/ when done. 

## Visuals
- Procedural canvas drawing used for lanes, embers (glowing orange particles), water drops (cyan teardrops), player (simple runner silhouette), burning tiles (red to blue).
- No matching 2D image recipe returned from /api/recipes (only 3D + cozy_audio_pack). Used in-code drawing to satisfy playable one-screen requirement. No silent SVG blob substitution for focal assets.

## Integration Notes
- Audio loaded via fetch from assets/ or inlined for single-file self-contained preview.
- SFX triggered: hiss loop volume modulated by nearby ember count / closeness to danger.
- Splash on every successful water drop collect + douse.
- Wind on reaching exactly 15 doused tiles (firebreak complete).

## Copied Assets
- source: http://factoryx-ystackai-asset-foundry:18113/outputs/asset-1783034942702-1ba7a458/music_v2/foundry_music_loop.wav
  dest: games/firebreak-runner/assets/foundry_music_loop.wav (7.1M, 41s loop; used low-vol for wind/complete + optional low danger bed)
- source: http://factoryx-ystackai-asset-foundry:18113/outputs/asset-1783034942702-1ba7a458/sfx_v2/sfx_danger.wav
  dest: games/firebreak-runner/assets/sfx_danger.wav (107k; maps to low ember hiss; volume/pitch modulated by proximity + count for "rises with danger")
- source: http://factoryx-ystackai-asset-foundry:18113/outputs/asset-1783034942702-1ba7a458/sfx_v2/sfx_interaction.wav
  dest: games/firebreak-runner/assets/sfx_interaction.wav (100k; bright splash on water drop collect + douse)
- source: http://factoryx-ystackai-asset-foundry:18113/outputs/asset-1783034942702-1ba7a458/sfx_v2/sfx_reveal.wav
  dest: games/firebreak-runner/assets/sfx_reveal.wav (181k; quiet wind / success sting on 15 doused firebreak complete)

All copied with job_id preserved. Review passed per Foundry (no errors, min sizes met). 

## Browser Verification Performed
- chromium --headless (swiftshader) on file://.../games/firebreak-runner/index.html captured start screen: screenshots/01-title.png (non-blank, overlay + hud visible)
- ?demo=1 active play: screenshots/04-active-play.png (player silhouette, embers (orange), drops (cyan), 4/15 doused tiles lit, 3 lanes exercised)
- Audio assets from job asset-1783034942702-1ba7a458 exercised via fetch+decode in main loop (splash on collect, hiss gain rises with ember danger count, wind on complete)
- No runtime errors in load or 5k+ virtual-time frames; one-screen loop stable.
- Preview entrypoint: .factoryx/preview-entrypoint -> games/firebreak-runner/index.html (direct)

## Rework (addressing review changes_requested)
- Restored missing foundry_music_loop.wav from http://factoryx-ystackai-asset-foundry:18113/outputs/asset-1783034942702-1ba7a458/music_v2/foundry_music_loop.wav (source path + job preserved) to ensure zero 4xx asset requests on loadBuffer in any verification path.
- Confirmed all 4 audio assets from job now present before browser smoke.
