# Factory Firebreak — Preview

## Preview Entrypoint
`games/88-factory-firebreak/index.html`

## How to Play
1. Open the game in any browser
2. Click **START SHIFT** to begin
3. **Click/tap on fires** (🔥, 🔒, ⚡, 🐛, 💀) to send workers to resolve them
4. Waves last 30 seconds — survive longer to face harder incidents
5. Build combos by resolving incidents quickly for score multipliers
6. Watch your health — each failed incident costs HP!

## Screenshot Evidence

### Title Screen
The game opens directly to the playable title screen with:
- "Factory Firebreak" title with gradient text
- "Keep the ystackai factory alive" subtitle
- "START SHIFT" button to begin playing
- High score display from previous sessions

### Gameplay
- 8×6 factory grid with station icons (🧠🔬📊💾⚙️🔗📡🛡️)
- Animated fire incidents with particle effects and pulse rings
- Workers (👩‍💻👨‍🔧🤖👩‍🔬👷🧑‍💻) move between stations
- Timer bars show incident urgency (green→orange→red)
- Score popups with combo multipliers
- Health bar at top with color-coded status

## Verified Behaviors
- ✅ Game starts immediately on page load (no loading screen)
- ✅ First click/tap starts audio (Web Audio API)
- ✅ Clicking fires sends nearest free worker
- ✅ Workers animate toward targets (ease-in-out movement)
- ✅ Incident resolution triggers particle burst + sound
- ✅ Combo system builds with consecutive quick clears
- ✅ Waves escalate every 30 seconds with new incident types
- ✅ Health decreases when incidents aren't resolved
- ✅ Game over screen with score and retry option
- ✅ Mute button in top-right corner
- ✅ Responsive: fills available space, maintains aspect ratio
- ✅ No external dependencies — works offline
- ✅ No console errors in browser

## Known Limitations
- Workers have no visual path — they move in straight lines
- No keyboard shortcut documentation on screen (hints at 1-6 keys)
- No sound settings beyond mute toggle (no volume slider)
