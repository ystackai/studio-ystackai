# Preview — Firebreak Runner

Work Order: work-order-1783034821336-8-1
Deliverable: firebreak-runner

## Artifact
- Entry: `games/firebreak-runner/index.html` (direct open; also via updated `.factoryx/preview-entrypoint`)
- One self-contained HTML: 3-lane endless dash, keyboard/tap/swipe controls, canvas.

## Gameplay (matches goal)
- Player switches lanes (left/right arrows, A/D, or tap zones) to dodge falling embers and collect water drops.
- Top: 15 burning tiles. Each collected drop douses one (cyan).
- Reach exactly 15 doused → success "FIREBREAK CLEAR" + quiet wind.
- Ember hit → "BURNED OUT", restartable.
- Hiss audio rises with ember danger; bright splash on drop; wind on clear.

## Evidence
- Start screen: `games/firebreak-runner/screenshots/01-title.png`
- Active play (player + hazards + objectives + doused tiles): `games/firebreak-runner/screenshots/04-active-play.png`
- Assets via Foundry job `asset-1783034942702-1ba7a458` (cozy_audio_pack): copied to `games/firebreak-runner/assets/` (see ASSET_MANIFEST.md for source paths + request JSON).

## Sound mapping (per direction)
- low ember hiss → sfx_danger.wav (looped, gain rises with count + proximity)
- bright splash → sfx_interaction.wav (on collect)
- quiet wind → sfx_reveal.wav (on 15 + low music tail)

## Scope
- No accounts, no server, one screen, one core mechanic.
- Changes limited to `games/firebreak-runner/` + work-order context + preview pointer.
- House style: dark operational palette, IBM Plex Mono, calm legible UI.
