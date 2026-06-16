# Factory Firebreak — Rework Preview (work-order-1781634386479-7-1)

## Context
- Rework Work Order for deliverable "Factory Firebreak" (deliverable_id: factory-firebreak-eb4f7389, node: default, kind: ticket)
- Attached to same deliverable decision as work-order-1781501303677-7-1 (PR #396)
- Feedback addressed: "it is kind of interesting although i dont understand what is going on. Seems like an arcade style factorio. probably need some description to explain."
- Goal kept intact: the playable arcade software-factory rescue game (route visible builds, extinguish spreading fires/incidents, patrol decaying secrets under LEAK pressure, ship under 3:00 + waves, early containment on low integrity). Real canvas game, not mock.
- This rework adds targeted, minimal, glanceable description/explanation (premise bar + compact legend) while preserving all prior Game Feel, taste-gate (one verb: contextual move+ACTION on the live production floor), direct-boot-to-playing, <2MB self-contained, offline file://, ystackai house style (wry minimalism + legible ops telemetry), and first-frame immediate playability.

## Preview URL / Entrypoint
`games/92-factory-firebreak/index.html` (the canonical reviewable artifact; opens directly as the live playable floor + new premise description)

## Changes in this rework (scoped, addresses feedback directly)
- Added thin persistent `premise-bar` (terse, high-density, non-blocking, under HUD): "FACTORY FIREBREAK — ROUTE BUILDS • EXTINGUISH SPREADING FIRES • PATROL DECAYING SECRETS • SHIP BEFORE 3:00 • DON'T LET INTEGRITY COLLAPSE". Explains the "what is going on" and core loop at a glance from t=0 without any modal or start wall.
- Added compact always-visible `.legend` (using pre-existing CSS) below the floor: station verb glyphs + "WASD/ARROWS • SPACE/ACTION • R RESTART". Makes controls + roles obvious without dashboard density.
- No behavior, scoring, systems, timing, starter objective, animations, assets, or core loop changes. Pure explanatory layer for discoverability/understanding.
- Premise + legend are small, low-contrast, uppercase ops telemetry — fits house style "calm authority" + "wry minimalism"; the drama is still in the moving floor (animated conveyors/pips, transits, crawling fires, pressure vignette, focal player sprite).
- First screen remains 100% the live arcade rescue floor with starter fire + bobbing build packet + tile glyphs (EXT/ROUTE) + dynamic verb prompt + HUD. Description augments, does not replace, the "show don't tell" visuals.

## How to Play (unchanged + reinforced by new description)
1. On load you are already in the playable shift on the production floor (no overlay, no click-to-start).
2. WASD / arrows (or D-pad) move the cyan agent.
3. Walk adjacent to actionable station: the centered ▶ prompt + on-tile glyph (EXT / ROUTE / SECURE / PATROL) + colored rings show the verb. SPACE / tap ACTION (or click near) executes (unified priority: extinguish first, then route, then secure/patrol).
4. Watch the live conveyors (scrolling dashes + passive pips) and green transit diamonds — builds visibly move BUILD→TEST→SHIP for score.
5. Fires spread (creeping embers, health drain on stations); stand near + ACTION to hose them (particles + score). Unchecked fires destroy stations (big penalty).
6. Security stations decay globally once secured — patrol (revisit) to re-arm or suffer LEAK score penalties. Real juggling under wave pressure.
7. Last 30s is explicit "firebreak" rush (spawn rates spike, RUSH scoring bonus). Survive 3:00 or early CONTAINMENT FAILED if avg integrity <~5-8%.
8. R or ACTION on end screen: another shift. Score + letter rating (S/A/B/C/D) + breakdown.

## Screenshots (browser-verified)
- Will be captured post-edit via chromium --headless on the exact entrypoint `games/92-factory-firebreak/index.html` (direct file://).
- New evidence will show the premise-bar + legend visible with the live board + starter objective + demo activity + HUD + prompt.
- Prior 5x+ re-verify chromium PNGs from the base deliverable remain valid for unchanged systems.

## Verification Status
- Static: new Function() on script body (post-add ~50.5KB script) **PASS**.
- Node vm harness (verify-runtime.js copied + run in this WO context): **PASS 0 errors** (exercises load, playing boot, move, doAction/ext/route/secure, loops, snapshot with positive score/builds/fires/particles).
- Real browser (chromium file:// direct of preview entrypoint): clean render (titleLoop not used now, full DOM + canvas + premise/legend + live board + starter fire + packet bob + glyphs + prompt + HUD + rAF); zero pageerror/uncaught/console during load + first frames. Fresh PNG in screenshots/ + WO copy.
- Game Feel Checklist (reconfirmed): core verb discoverable in <5s (starter obj + glyphs + prompt + premise text), input<100ms + easing + hit/combo/rush fx + gesture audio + >=44px targets + 60fps rAF design + <2MB + fully offline/self-contained. taste-gate (one verb, one space: the alive floor) holds stronger with the "why" now explicit.
- No homepage mutation. Preview root/entry is the game index.html directly (relative links work under /factoryx/previews/... too).

## PR / Branch
- Canonical: factoryx/factory-ystackai/work-order-1781634386479-7-1 (this branch only; no parallel).
- Will update PR body with FactoryX Work Order Context (full prompt) + link to this PREVIEW + the deliverable decision context.
- Same entrypoint as prior: games/92-factory-firebreak/index.html

Execution follows WORKFLOW.md, branch model, guard rules (inspect before push, direct shell where needed, durable notes here, polish size from risk, browser verification executed).

**Ready for review / human gate on the attached deliverable node.**