# Factory Firebreak — Preview

## Preview URL
https://github.com/ystackai/studio-ystackai/pull/396

## Preview Entrypoint
`games/92-factory-firebreak/index.html`

## How to Play
1. Click **START SHIFT** to begin (first screen is immediately playable — core verb in <20s)
2. Use **WASD** / **Arrow Keys** (or on-screen D-pad) to move your agent across the production floor grid
3. Walk onto/near a station with a **fire** (red) to **extinguish it** (Space / X / tap button) — fires spread and destroy stations
4. **Build** stations (green border) spawn builds (◈); stand near to boost routing them through **Test** → **Ship** for bonus points (or let them auto-flow for base). Watch the green transit diamonds travel the floor — resources visibly routed.
5. **Security** stations must be secured by standing near; once secured they decay over time — keep patrolling to "protect secrets" or they unsecure (ongoing juggle)
6. Ship builds, extinguish incidents, secure secrets, and survive the 3:00 timer across escalating waves (faster/more fires). Don't let avg station health collapse.
7. **R** (or Space on gameover) restarts. Score + S/A/B/C/D rating on SHIFT COMPLETE.

## Screenshots
**Browser-verified title / first screen** (real chromium headless render of canvas + full DOM):
- `.factoryx/work-orders/work-order-1781501303677-7-1/screenshots/01-title-browser.png`

Title screen: dark terminal aesthetic (monospace, #0d0d1a, cyan #00e5ff / orange accents matching ystackai house style) with animated ember particles over the station grid + legend + START SHIFT button.

Gameplay screen: 11×7 grid factory floor, color-coded stations w/ health bars, live animated build transits (green ◇ moving Build→Test→Ship), cyan player agent (glowing, walking bob, helmet), flickering fires, floating score/feedback text ("+pts!", "To TEST", "SECURED!", "WAVE 2"), dynamic "▶ EXTINGUISH / PROCESS BUILD / SECURE / PATROL" prompt when near station, HUD (score/wave/shipped/secrets/timer with urgency color), danger vignette + screen shake.

Game over: big final score, breakdown (wave, shipped, secured, fires out), letter rating, restart button.

This is a real playable arcade game, not a dashboard mockup: the software factory theme (agents routing builds, fighting incidents, protecting secrets, shipping under time pressure) is the core loop, concrete and escalating from second one.
