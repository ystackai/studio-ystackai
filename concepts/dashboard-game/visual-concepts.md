# Break the Dashboard - Visual Concepts

## Core Visual Direction

The game should have a **"curated crash"** aesthetic where the UI components deliberately appear broken and unstable. The design should feel intentional rather than buggy - components should wobble, glitch, and fail in controlled ways that give a sense of progression toward system collapse.

## Color Palette

### Primary Colors
- **Error Red**: #E53E3E (for stack trace counters, error indicators)
- **Warning Orange**: #FF6B35 (for warnings, active error sources)
- **System Blue**: #6366F1 (for UI elements, base components)
- **Dark Background**: #1A1A1A (for the dashboard background)

### Supporting Colors
- **Light Gray**: #F5F5F5 (for text, UI elements)
- **Dark Gray**: #2C2C2C (for UI panels)
- **Bronze**: #B8860B (for accent elements, highlights)

## UI Component Design

### Dashboard Structure
- **Error Counters**: Large, animated numbers with pulsing red glow
- **Wobbling Components**: UI elements that shake/jitter with increasing intensity
- **Stack Trace Display**: Terminal-style text that scrolls and glitches
- **Fix Button**: Prominent but deceptive - visually appealing but destructive
- **Timer**: Circular progress indicator with flickering numbers

### Component States
1. **Normal**: Clean, stable UI elements
2. **Warning**: Slight color shifts, subtle wobble
3. **Critical**: Intense shaking, color bleeding, text distortion
4. **Void Mode**: Screen fades to black with glitched audio effects

### Typography
- **Primary**: "IBM Plex Sans" or "Inter" for clean, modern look
- **Terminal Style**: Monospace font for stack traces
- **Hierarchy**: Clear visual distinction between error levels

## Visual Effects

### Glitch Effects
- Text distortion (jittering, character substitution)
- Color bleeding (RGB separation)
- Screen flickering
- Component shattering animation

### Animations
- **Wobble**: Subtle, rhythmic shaking for UI elements
- **Pulse**: Regular pulsing for error counters
- **Fade**: Progressive darkening as system approaches collapse
- **Stack Trace Scroll**: Text that continuously scrolls with jitter

## Component Examples

### Error Counter
- Large red numbers with glow effect
- Pulsing animation that increases in frequency
- Number grows with each error introduced

### Stack Trace Display
- Terminal-style background with green text
- Text scrolls from bottom to top
- Random character replacement and line breaks
- Text color changes from green to red as errors accumulate

### Fix Button
- Visually appealing but misleading
- Animated button that shakes when hovered
- Clicking triggers a cascading failure
- Button text changes from "Fix" to "ERROR" to "CRASH"

### Timer
- Circular progress indicator with red/orange gradient
- Numbers flicker as time decreases
- Progress bar becomes more jagged and unstable

## Design System Principles

### Intentional Failure
- Every visual element should communicate the "breaking" concept
- UI components should degrade gracefully, not disappear
- Visuals should feel controlled and curated, not chaotic
- The progression from normal to crash should be clearly visible

### Consistent Visual Language
- All components should follow the same design language
- Color usage should be consistent and meaningful
- Animations should be purposeful and not distracting
- Typography should support the technical/terminal aesthetic

## Mood Board Elements

### Technical Aesthetic
- Industrial design elements
- CRT monitor screens
- Circuit board patterns
- Factory machinery

### Glitch Art
- Digital artifacts
- Color bleeding effects
- Pixelation
- Data corruption visuals

### UI Design
- Modern dashboard layouts
- Component-based design
- Clean, minimal interfaces
- Error states and warnings

This visual direction will guide the creation of the dashboard UI where breaking it is the only way to win.
