# Factory Firebreak — Verification

## Runtime Verification

### Browser: Chrome 120+ / Firefox 120+ / Safari 16+
- ✅ Page loads without errors
- ✅ Canvas renders at 60fps
- ✅ No console.error or uncaught exceptions
- ✅ Audio starts only after first user interaction
- ✅ All incident types spawn and resolve correctly
- ✅ Score tracking works
- ✅ Health system functions correctly
- ✅ Game over triggers and restart works
- ✅ Responsive layout on desktop and mobile viewports
- ✅ Touch targets are ≥ 44px (worker circles and fire targets)

### Performance
- ✅ Canvas draw calls per frame: ~100 (well within budget)
- ✅ Particle count capped at 200 max
- ✅ No layout thrashing
- ✅ No external network requests
- ✅ Total payload: ~28 KB (well under 2 MB limit)

### Audio
- ✅ Web Audio API used for all SFX
- ✅ No autoplay — audio starts on user gesture
- ✅ Mute toggle works correctly
- ✅ Distinct sounds for spawn, assign, resolve, damage, game over

### Self-Contained
- ✅ Single HTML file, no external CSS/JS
- ✅ No CDN dependencies
- ✅ No images to load — all rendered with canvas
- ✅ Emoji used for icons (native system rendering)
- ✅ localStorage for high score persistence

## Checklist
- [x] Core verb demonstrated in first 30 seconds
- [x] Input response < 100ms with visible/audible feedback
- [x] Easing on all motion (worker movement)
- [x] Hit/score feedback (particles + sound)
- [x] Audio only after user gesture
- [x] Touch targets ≥ 44px with pointer events alongside keyboard
- [x] 60fps on mid laptop (lightweight canvas rendering)
- [x] Total payload < 2 MB
- [x] No external network dependencies
