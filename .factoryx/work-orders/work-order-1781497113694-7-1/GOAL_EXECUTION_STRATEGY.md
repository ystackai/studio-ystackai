# Factory Firebreak — Goal Execution Strategy

## Vision & Player Fantasy

**You are the last shift lead at ystackai's AI factory when everything goes sideways.**

The factory is alive with GPU clusters, model pipelines, and training jobs — but a cascade of incidents (bug fires, security leaks, resource overflows) is burning through the production floor. The player's job: grab workers, route them to burning stations, patch broken work orders, and shield secret data from unsafe containers before the whole facility goes dark.

**Player fantasy:** Frantic but satisfying factory firefighting. You're not reading dashboards — you're *doing* something with immediate visual feedback. Every incident extinguished gives a burst of particles, a satisfying sound, and a score pop. Every failure costs health. The tension comes from managing multiple fires across a factory floor where incidents spawn faster than you can put them out.

**Emotional target:** 60 seconds in = "oh no, three fires at once, I need to prioritize." 2 minutes in = muscle memory and rhythm. 5 minutes in = "just one more run to beat my high score." Think *Klax* meets *Dungeon Keeper* (but the dungeon is a GPU factory and you're the hero).

## Mood, World & References

**Visual mood:** Dark control-room aesthetic with neon accent colors. The factory floor is a grid of stations with glowing edges. Incidents appear as fire/explosion effects (CSS/canvas animated particles). UI is minimal — HUD at top with health bar, score, level, and a muted SFX toggle.

**References:**
- **Klax** (1990) — color-matching puzzle speed, satisfying cascade clears
- **Plants vs. Zombies** — wave-based escalation, lane/zone management
- **Papers Please** — the dark humor of bureaucratic chaos (work order jokes, funny incident descriptions)
- **Dungeon Keeper** — managing resources under pressure
- **StackY** (existing ystackai game) — dark theme, neon accents, arcade feel

**Color palette:**
- Background: `#0a0a12` (deep navy/black)
- Stations: dark `#141420` with `#6366f1` (indigo) glow on active
- Fire incidents: `#ef4444` → `#f97316` → `#fbbf24` (red → orange → yellow gradient)
- Shielded: `#22c55e` (green glow)
- Health bar: red when low, pulsing
- Score popups: `#e2e8f0` with `#6366f1` glow
- Worker sprites: small colored circles (team members)

**Humor:** Light, self-deprecating ystackai flavor. Incident descriptions like "GPU cluster is having a philosophical crisis", "Embedding model questioned reality", "Quantum model went Schrödinger on the data pipeline", "Token limit exceeded — the model wrote a novel instead of generating responses".

## Core Interaction Loop & Progression

### Core Loop (understandable in 10 seconds)
1. **Analyze:** Look at the factory floor. Which stations are on fire? Which need patching?
2. **Act:** Click/tap a worker, then click/tap a station to route them. Or click directly on an incident to auto-assign the nearest available worker.
3. **Resolve:** Incidents take time/effort to extinguish. Watch the progress bar on each station.
4. **Reward:** Successful resolution gives score, particles, and audio feedback.
5. **Escalate:** New incidents spawn faster. New incident types appear.

### Primary Action (the one verb)
**Click/tap to assign workers to incidents.** One finger or one click does everything:
- Click an incident → worker automatically routes there (simplest mode)
- Click a worker first, then a station → manual routing (advanced mode)

### Progression
- **Levels/Waves:** 30-second waves. Each wave gets more incidents, faster spawn rate, and higher-stakes incidents.
- **Incident types:**
  - 🔥 **Bug Fire** (red) — Classic fire, needs 1 worker, 2 seconds to fix
  - 🔒 **Secret Leak** (orange) — Data container is exposed, needs 1 worker + 3 seconds
  - ⚡ **Overload** (yellow) — GPU cluster overloaded, needs 2 workers, 3 seconds
  - 🐛 **Work Order Broken** (purple) — Pipeline crashed, needs 1 worker + patch click
  - 💀 **Cascade Failure** (dark red, boss-level) — Multiple stations affected, 5 seconds to resolve
- **Score:** Base 100 per incident, multiplied by combo streak (consecutive quick clears).
- **Health:** Start at 100%. Each un-resolved incident that reaches max duration costs 10% health. Game over at 0%.
- **Difficulty curve:** Waves 1-3 introduce incident types one at a time. Waves 4-6 mix them. Waves 7+ add cascade failures and faster spawns.

## Art / Audio / Interaction Direction

### Visual Style
- **Canvas-based 2D** top-down factory grid (8×6 or 10×8 depending on screen size)
- **Stations:** Rounded rectangles with subtle glow, labeled with emoji icons (🧠, 🔬, 📊, 💾, ⚙️)
- **Workers:** Small colored circles with tiny name tags, animated movement between stations
- **Incidents:** Animated particle systems — fire sparks for bug fires, leaking droplets for secret leaks, pulsing overload rings, broken pipe animations
- **HUD:** Minimal bar at top: health (left), score (center), wave (right), mute toggle (far right)
- **Game Over:** Dramatic screen with factory shutdown animation, final score, high score, retry button

### Audio (Web Audio API, no external files)
- **Incident spawn:** Quick "alert" chirp (sine wave sweep up)
- **Worker assigned:** Low "thud" click
- **Incident resolved:** Satisfying "ding" with ascending notes
- **Health loss:** Deep bass thud, slightly distorted
- **Game over:** Descending alarm with static
- **Background:** Very subtle ambient hum (low-frequency oscillator), toggleable
- **All audio starts only after first user click/tap**
- **Mute button** in top-right of HUD

### Interaction Design
- **Desktop:** Click/tap to interact. No keyboard required (mouse/pointer primary).
- **Mobile:** Tap targets ≥ 44px. Workers slightly larger on touch devices.
- **Easing:** All worker movement uses ease-in-out (not linear teleporting). Score popups fade in/out with opacity easing.
- **Feedback:** Every action has visual + audio response within 100ms.

## Real Asset Plan

### Generated Assets (no external files, everything self-contained)

**Workers:**
- Drawn procedurally as circles with distinct colors and emoji "faces" (👩‍💻, 👨‍🔧, 🤖, etc.)
- Each worker has a unique color (indigo, amber, rose, emerald, sky) and a tiny emoji identifier
- Idle animation: subtle bob up/down
- Active animation: moves toward target with a small trail

**Stations:**
- Drawn with canvas primitives — rounded rectangles with emoji icons
- Glow effect using canvas shadowBlur
- Station labels: single emoji + short text

**Incidents:**
- Bug Fire: Canvas particle system with orange/red/yellow sparks flying upward
- Secret Leak: Blue particles dripping downward with a "drip" animation
- Overload: Concentric pulsing rings in yellow
- Work Order Broken: Cracked line effect with purple sparks
- Cascade: Dark red pulsing with multiple particle types

**Background:**
- Dark grid pattern (subtle, low opacity)
- Station glow effects for ambient feel
- No external images needed

**UI Elements:**
- Health bar: filled rectangle with gradient (green → yellow → red)
- Score popups: canvas text with glow
- All UI drawn with canvas primitives

**Total payload estimate: ~50-80 KB** (single HTML file with inline CSS/JS)

## Engine, Controls & Verification

### Technical Architecture
- **Single HTML file** with inline CSS and JavaScript (self-contained)
- **Canvas rendering** for game grid, workers, incidents, particles
- **Web Audio API** for all sound effects (oscillator-based, no external files)
- **RequestAnimationFrame** game loop at 60fps
- **Responsive sizing** — canvas fills available space with proper aspect ratio
- **Touch events** + mouse events for controls

### Verification Plan
1. Open `games/88-factory-firebreak/index.html` directly in browser
2. Verify game starts immediately (no loading screens, no menus)
3. Click/tap to start, play for 60+ seconds
4. Check console for errors
5. Verify all incident types appear and resolve correctly
6. Check audio works after user gesture
7. Test on different screen sizes (responsive)
8. Capture screenshots of gameplay
9. Verify no external network requests

### Performance Targets
- 60fps on mid-range laptop
- Canvas redraws optimized (only dirty rectangles/regions)
- Particle systems capped at 50 particles per incident
- No layout thrashing

## What NOT to Build

- ❌ No landing page, no marketing hero section, no explanation panel as the first screen
- ❌ No save/load system (arcade-style, single-session scoring)
- ❌ No multiple levels with distinct themes (one factory, escalating incidents)
- ❌ No procedural generation of the factory layout (static grid)
- ❌ No achievements or unlockables
- ❌ No multiplayer or network features
- ❌ No external dependencies (no CDN, no npm packages)
- ❌ No placeholder geometric blobs as the hero art — all visual elements must be intentional
- ❌ No text overlap on any screen size

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Canvas performance on mobile | Cap particles, use simple shapes, requestAnimationFrame |
| Audio autoplay restrictions | All audio tied to user gesture |
| Touch target size on mobile | Minimum 44px touch areas, scale workers up on touch |
| Game too simple | Add incident types, combo system, escalating waves |
| Game too complex | One-click interaction model, clear visual hierarchy |

## Success Criteria

1. **Playable in 10 seconds:** First screen is the game, not a menu
2. **Fun in 60 seconds:** Player can judge the game after one wave
3. **No blank screens, no console errors**
4. **Audio works after gesture, has mute toggle**
5. **Responsive: playable on desktop and mobile**
6. **Self-contained: no external dependencies, < 2 MB**
7. **First screen makes sense without reading anything**

## Progress Updates

- [ ] Strategy document created
- [ ] Playable prototype built (one incident type, basic loop)
- [ ] Prototype playtested — core verb is fun
- [ ] All incident types implemented
- [ ] Audio SFX implemented with mute toggle
- [ ] Responsive layout verified on desktop and mobile
- [ ] All incidents resolve correctly, no console errors
- [ ] Screenshots captured for verification
- [ ] PR body updated with scope, preview path, verification output
- [ ] Strategy document final
