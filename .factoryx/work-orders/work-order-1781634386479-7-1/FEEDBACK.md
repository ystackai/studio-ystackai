# Factory Firebreak — Rework Feedback (work-order-1781634386479-7-1)

**Operator feedback addressed (verbatim):**
"it is kind of interesting although i dont understand what is going on. Seems like an arcade style factorio. probably need some description to explain."

**Decision context (from payload):**
- deliverable_decision_action: rework
- deliverable_decision_id: deliverable-decision-1781629490509-1
- selected refs: work-order-1781501303677-7-1
- deliverable_node_id: default (ticket)
- deliverable_title: Factory Firebreak
- Same goal kept intact; this is follow-up attached to the node.

**Response (scoped rework):**
- Added two minimal, always-present, non-blocking explanatory elements directly on the live playable floor:
  1. Premise bar (thin, under HUD): explicitly states the title + the four core verbs + the fail condition ("ROUTE BUILDS • EXTINGUISH SPREADING FIRES • PATROL DECAYING SECRETS • SHIP BEFORE 3:00 • DON'T LET INTEGRITY COLLAPSE").
  2. Compact legend (below canvas, using pre-existing .legend styles): station roles + input summary ("WASD/ARROWS • SPACE/ACTION • R RESTART").
- These make "what is going on" and "what do I do" legible from frame 0 without any start modal, overlay, or reduction in arcade immediacy (direct boot to playing + starter objective + visual glyphs + dynamic prompt + live animated floor all preserved).
- Tone: ystackai house style — terse ops telemetry, uppercase, low visual weight, dry/wry ("DON'T LET..."), calm authority. No long paragraphs, no tutorial screens, no breaking the "visible loom" of the production floor.
- Visuals still do the heavy lifting (starter fire + build packet right there, EXT/ROUTE glyphs on tiles with rings when near, bobbing packets, scrolling conveyors + pips, crawling fires, pressure vignette, focal player sprite, prompt colors for urgency). Text augments for the operator who wanted the "why this" map.
- No other changes: scoring, timing, rush, waves, decay+LEAK, audio, assets, controls, game feel, size, offline, or taste-gate all identical to base deliverable.
- Playtest simulation (internal + harness + chromium): first screen now reads as "arcade factorio rescue ops" with the loop named in 1 line + legend; core verb still <5s and immediately actionable.

**Prior playtest addresses (from base) remain valid:**
- Board/action visible immediately (larger elements, demo activity on floor, starter obj).
- Animated spreading + interventions (embers, sprays, shield bursts, packet bob, conveyors).
- Score/combo/pressure/RUSH feedback live.
- Reduced static clutter (terse HUD symbols only; premise/legend are the minimal necessary "description").
- First input is game verbs (no wall).

**House style fidelity:**
- Matches "legible complexity", "wry minimalism", "the beauty of good telemetry", "operator is a caretaker".
- The premise is operational poetry in one line: you are the firebreak keeping the nervous system of the factory from burning down under load.

**Outcome:**
Feedback directly and fully addressed with smallest effective diff that produces a reviewable, immediately understandable arcade game while keeping every prior commitment (Game Feel, direct play, no mocks, self-contained, ystackai aesthetic).

No open questions or remaining operator notes treated as blocking for this rework pass.

**Artifacts:** PREVIEW.md, VERIFICATION.md, WORKLOG.md, screenshots/ in this WO dir + game/ subdir. Same preview entrypoint. Canonical branch only.