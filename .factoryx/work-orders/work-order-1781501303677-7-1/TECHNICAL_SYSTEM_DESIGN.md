# Factory Firebreak — Technical System Design

## Overview
Single-file (index.html) browser game using HTML5 Canvas and vanilla JS.
No external dependencies. All assets drawn procedurally — no images or audio files.

## Core Systems

### 1. Grid & Stations
- 11×7 grid with factory stations (Build, Test, Ship, Security)
- Conveyor lines show production flow from Build → Test → Ship
- Each station has health bar; fires damage stations over time
- Stations destroyed at 0 HP; score penalty

### 2. Player Agent
- Moves with WASD/Arrow keys (grid-based movement)
- Animated sprite with head, body, walking legs
- Can extinguish fires in adjacent tiles
- Touch controls for mobile (D-pad + extinguish button)

### 3. Fire System
- Fires spawn randomly at stations
- Spread to adjacent stations over time
- Player must move to station to extinguish
- Difficulty scales with wave number (faster spawn, faster spread)

### 4. Build Queue
- Builds spawn at Build stations periodically
- Auto-propagate: Build → Test → Ship
- Shipped builds award bonus score
- Visual indicator (green diamond, ship progress bar)

### 5. Audio
- Web Audio API synthesized tones
- No autoplay — audio starts on first user gesture
- Effects: extinguish, fire, ship, death, wave-up

### 6. Game Flow
- Title screen with animated ember particles
- 3-minute timer, waves every 30 seconds
- Final score with S/A/B/C/D rating
- Restart button on game over

## Architecture
- IIFE (Immediately Invoked Function Expression) pattern
- requestAnimationFrame game loop
- Particle system for visual effects
- Floating score text system
- Shake effect on events

## File Structure
```
games/92-factory-firebreak/
  index.html  (36KB, self-contained, 1089 lines)
```
