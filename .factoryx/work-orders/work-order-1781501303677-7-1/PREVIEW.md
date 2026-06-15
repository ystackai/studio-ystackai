# Factory Firebreak — Preview

## Preview URL
https://github.com/ystackai/studio-ystackai/pull/396

## Preview Entrypoint
`games/92-factory-firebreak/index.html`

## How to Play
1. Click **START SHIFT** to begin (first screen is immediately playable — core verb in <20s)
2. Use **WASD** / **Arrow Keys** (or on-screen D-pad) to move your agent across the production floor grid
3. Walk near actionable stations; the centered **▶ PROMPT** shows the verb. Press **SPACE / X / tap the ACTION button** to do it (unified control: prioritizes extinguish, then route builds, then secure/patrol).
4. **Build** stations (green border) spawn builds (◈); stand near + ACTION (or wait) to route them through **Test** → **Ship** for points. Watch the animated cyan conveyor dashes + green transit diamonds — resources visibly routed under pressure.
5. **Security** stations: stand + ACTION to SECURE (takes time, wave-scaled); once secured they **decay globally** — patrol to re-arm or suffer LEAK penalties (-pts + fx). Real juggling.
6. **HUD now shows Integrity %** (avg station health, color-coded) and **Transit** (in-flight builds + active routings) so the queue pressure is visible at a glance.
7. Ship builds, extinguish incidents, secure secrets, and survive the 3:00 timer across escalating waves. If floor integrity collapses (<5%) you get CONTAINMENT FAILED early. Fires destroy stations with score penalty.
8. **R** (or ACTION on gameover) restarts. Score + S/A/B/C/D rating on SHIFT COMPLETE / FAILED. Animated conveyors, wave-up bursts, low-health ! alerts, leak fx, screen shake + vignette all feed game feel.

## Screenshots
**Browser-verified title / first screen** (real chromium headless render of canvas + full DOM, re-captured post-polish + re-verify run):
- `screenshots/01-title-browser.png` (original)
- `screenshots/02-title-browser-fresh.png`
- `screenshots/03-title-polish.png` (after unified ACTION, HUD additions, conveyors)
- `screenshots/04-title-browser-final.png` (post-final-polish: Ext HUD, lower prompt badge, de-cluttered conveyors)
- `screenshots/05-title-browser-reverify.png` (2026-06-15 direct-run re-verify, chromium --headless --screenshot on file://`games/92-factory-firebreak/index.html`, 77.7KB, zero pageerror/console during titleLoop + DOM render; confirms first screen loads cleanly pre-deadline)
- `screenshots/06-title-browser-feedback.png` (2026-06-15 ~08:50Z, post-monitor-feedback polish: CELL=80 enlarged grid 880×560, overlay 0.58 so live board+demo transits+fires+conveyors visible behind start modal, routing/firebreak theme concrete on first screen immediately; 89.7KB PNG, chromium file:// load clean)

Title screen: dark terminal aesthetic (monospace, #0d0d1a, cyan #00e5ff / orange accents matching ystackai house style) with animated ember particles, live station grid, faint conveyors, demo transits and flickering fires visible through the semi-transparent overlay (per monitor feedback) + legend + START SHIFT button. The production floor and core verbs are visible immediately.

Gameplay screen: 11×7 grid factory floor, color-coded stations w/ health bars + low-HP ! alerts, live animated build transits (green ◇) + scrolling cyan conveyor dashes, cyan player agent (glowing, walking bob, helmet), flickering fires, floating score/feedback text ("+pts!", "To TEST", "SECURED!", "LEAK! -25", "WAVE 2"), dynamic "▶ ..." prompt, HUD now with Integrity % (color) + Transit count (queues visible), danger vignette + screen shake on events.

Game over: big final score, breakdown, letter rating; can be "CONTAINMENT FAILED" if integrity collapses. R / ACTION restarts.

This is a real playable arcade game, not a dashboard mockup: the software factory theme (route resources visibly, extinguish incidents, protect secrets under decay pressure, ship builds, juggle escalating queues) is the core loop, concrete and escalating from second one. All per Game Feel Checklist.
