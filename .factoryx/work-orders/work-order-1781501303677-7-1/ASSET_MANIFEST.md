# Factory Firebreak — Asset Manifest (work-order-1781501303677-7-1)

**Date:** 2026-06-15 (asset-pipeline blocking feedback pass, ~17:25Z+)
**Work Order:** work-order-1781501303677-7-1 (Factory Firebreak)
**Context:** polish_until_deadline; addresses operator asset-guard feedback after prior arcade polish passes (43-/46-/48-).

## Inspection Performed (per blocking feedback requirement)
- Used Glob/Shell/Read (direct sourced /bin/bash, full context) across workspace:
  - No `foundry/` directory, no `assets/` or `sprites/` at repo root or under games/92-factory-firebreak/ (except post-materialize screenshots/).
  - Only asset-like dir: `drops/5-stacky/assets/` — contains `bg-factory.jpg` (132kB photo, unrelated to ystackai terminal aesthetic) + `oompa-*.png` (6 cartoon face sprites from prior "stacky" drop; mismatched tone, not reusable for factory agent/fire/packet/secret without breaking house style or bloating single-file).
  - `team/avatars/*.jpg` — 6 crew headshots; not game sprites, would require heavy processing + base64 bloat.
  - No `.mp3`/`.wav`/`.ogg`/music or sfx files anywhere.
  - No asset generation scripts, pipelines, or tools exposed: searches for *generate*, *render*asset, *sprite*, foundry, asset-pipeline returned 0 relevant (only internal .factoryx-generated-skill metadata + agents.json).
  - `.codex/`, `.factoryx/skills/` (game-designer-2d, autoreview) — skills are for agent behavior, not image/audio authoring pipeline.
  - Game source (`games/92-factory-firebreak/index.html`): 0 uses of `<img>`, `new Image()`, `fetch`, external URLs, or pre-existing bitmap loads. 100% canvas 2D vector + WebAudio oscillators (pre-this-pass).
- Conclusion (recorded, not silently ignored): **No foundry or asset generation capability exposed in this runtime.** Reusing mismatched drops assets would violate "central heroes, enemies, worlds, and music-led moments should not remain throwaway vector blobs" (or introduce wrong-tone cartoon/photo elements). Per instruction: record as blocker/limitation + create deliberate local authored alternative.

## Deliberate Procedural Authored Art + Music System (this pass)
Created in `games/92-factory-firebreak/index.html` (single self-contained file preserved; no new net deps; payload ~58kB still <<2MB).

### Central Elements & Representation (not throwaway blobs)
- **Hero (player/worker avatar)**: 
  - Vector: larger cyan disc body (r=24), cyan glow (r=46), floor disk, thick action/urgency ring, helmet with lamp stripe, kit pack, animated legs + dust particles on move, action flash bar.
  - **Authored addition**: back-mounted extinguisher tank (rect + detail) + dynamic hose/nozzle line that extends from player toward fire cell on ACTION near fire (physical "reach" intervention animation). Headlamp + hardhat stripe for ystackai operator identity.
  - **Local code-defined pixel asset**: `PIXEL_HERO_BADGE` (8x8 stamp array with 0/1/2/3 values for helmet/skin/visor) + `drawPixelStamp()` renderer (scaled fillRect "pixels"). Rendered on kit as crisp identity patch. This is an "authored asset" authored directly in source (classic code-as-asset technique); not a generic circle.
- **Enemies/Hazards (fires/incidents)**:
  - Layered wobbly flame: core red + bright yellow inner + mid orange + outer heat with sin-phase tendrils.
  - **Animated spreading**: 5+ flying ember particles with trailing sparks (offset by phase + directed from spread source in `spreadFire`); faster flicker + larger size under wave pressure. Outer glow + alpha wobble for "crawling" visual. Health bar + ! danger when low.
- **World/Floor (production routing space)**:
  - Pre-existing: 11x7 grid, color-coded stations (BUILD green, TEST blue, SHIP purple, SEC red), live animated conveyors (dashed scrolling + passive pips), transits (bobbing diamonds with trails).
  - **Authored additions (drawWorldDetails)**: 
    - Pipe runs (thick stroked lines + joint dots) linking Build/Test/Ship logically (visible "loom" infrastructure).
    - 4 bolt/rivet heads per station (tiny authored rects for constructed feel).
    - Diagonal hazard tape lines on perimeter/edge stations (yellow-black safety suggestion).
    - Retains pressure vignette/edge pulse + idle pips/embers scaled by fire count + rush + low integrity.
- **Resources (build packets, secrets)**:
  - Build: replaced simple rect/dot with 3d-ish crate (dark body + lid + 3 rivet dots + "YST" stamp text) that bobs with phase — queued work now reads as physical moving packets on the floor.
  - Secrets (SEC): replaced generic shield/warn with folder/card motif — dark body + red "CONF" classification bar when unsecured; secured shows chip with "OK" bars + diamond lock. Pulsing when unsecure. Makes "protect secrets" visually distinct and thematic.
- **Interventions & feedback**: Extinguish sprays (17 arcing particles from player toward fire), secure bursts, combo floats, RUSH/FLOW labels, shake on hits. Enhanced with the new hose line on player.

All motion eases (sin phases, particle decay, bob, prog). No linear teleports. Hit/score feedback present (particles, floats, shake, color flash on tile glyphs).

### Procedural Music System ("Factory Floor Protocol")
- **Continuous bed (hum/drone)**: On first gesture (`initAudio` + explicit `initProceduralMusic()` in start + direct boot), starts multi-osc (saw 47Hz + sine 95Hz) through dynamic lowpass filter + slow LFO on cutoff. Very low gain (0.011–0.04) — sparse "loom" undercurrent, not intrusive. Volume + filter openness scale live with fire count + rushFactor (pressure raises the floor tone).
- **Music-led motifs** (triggered on key moments, throttled):
  - Wave/rush start: 4-note rising square danger stab (bandpassed, minor-leaning) — telegraphs escalation.
  - Ship success: bright 3-note sine resolving cadence (major feel) — "ship it" payoff sting.
  - Secure/patrol success: calm 3-note confirm chord.
  - Leak penalty: low "rush" danger motif (negative pressure feedback).
- Replaces prior "sparse oscillator/blip audio" for central music-led moments (wave pressure, successful interventions, containment risk) while keeping sfx tones for immediate hits. All audio still requires user gesture (no autoplay); defaults sparse/off.
- Implemented with scheduled WebAudio nodes (no external files, self-contained).

### Why This Satisfies the Feedback (without placeholders)
- Central hero/enemy/world/music no longer "throwaway vector blobs or oscillator-only bleeps".
- Local authored (pixel stamp data + detailed layered drawing fns + composed multi-osc music scheduler) created in this runtime.
- Inspection + limitation explicitly recorded here (no foundry exposed → did not silently sub).
- Preserves ystackai house style (dark terminal, legible telemetry, calm authority + wry copy) + all prior Game Feel / taste-gate / playtest fixes (larger focal player, immediate playable floor, moving hazards/packets, reduced labels, combo/pressure, starter objective, animated interventions).
- Total payload remains lightweight; no new files loaded at runtime (pure code); preview entrypoint `games/92-factory-firebreak/index.html` unchanged.

## Files Changed (this asset pass)
- `games/92-factory-firebreak/index.html` (authored procedural enhancements + music system + wiring)
- `.factoryx/work-orders/work-order-1781501303677-7-1/ASSET_MANIFEST.md` (this file)
- Updated durable notes + fresh browser verification evidence (49-*.png etc) in `games/.../screenshots/` + WO `screenshots/`

## Next / Blockers
- If a future runtime exposes foundry/asset gen (e.g. via new MCP or .factoryx bin), re-inspect and migrate central authored elements to produced assets (base64-embed small versions to keep single-file preview).
- Current approach is the required deliberate system per the 17:25Z blocking note.

Work Order: work-order-1781501303677-7-1
PR: https://github.com/ystackai/studio-ystackai/pull/396 (update with this pass)