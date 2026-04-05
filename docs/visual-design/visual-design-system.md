# Visual Design System

## Overview

This document outlines the visual design system for the cyberpunk-themed game project. The system is built around a consistent color palette, typography, spacing, and interactive elements that reflect the neon-drenched cyberpunk aesthetic.

## Color Palette

### Primary Colors
- **Background**: `#0A0A0A` (Deep black)
- **Neon Blue**: `#00F3FF` (Primary highlight)
- **Electric Purple**: `#8A2BE2` (Accent color)
- **Neon Pink**: `#FF00FF` (Critical systems)

### Text Colors
- **Primary Text**: `#FFFFFF` (White)
- **Secondary Text**: `#CCCCCC` (Light gray)

### UI Elements
- **Panel Background**: `rgba(10, 10, 10, 0.8)` (Glass-morphism effect)
- **Border**: `rgba(0, 243, 255, 0.3)` (Neon blue with transparency)

## Typography

### Font Families
- **Primary**: 'Orbitron', sans-serif (for headings)
- **Secondary**: 'Roboto', sans-serif (for body text)

### Font Sizes
- **Small**: 12px
- **Medium**: 16px
- **Large**: 20px
- **X-Large**: 24px
- **XX-Large**: 32px

## Spacing System

### Units
- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **XXL**: 48px

## Shadows

### Depth Effects
- **Small**: `0 2px 4px rgba(0, 0, 0, 0.3)`
- **Medium**: `0 4px 8px rgba(0, 0, 0, 0.4)`
- **Large**: `0 8px 16px rgba(0, 0, 0, 0.5)`

### Glow Effects
- **Primary Glow**: `0 0 8px var(--color-secondary)`
- **Accent Glow**: `0 0 12px var(--color-accent-primary)`
- **Error Glow**: `0 0 8px var(--color-error)`

## Border Radius

### Rounded Corners
- **Small**: 4px
- **Medium**: 8px
- **Large**: 16px
- **Full**: 50%

## Animation Durations

### Timing
- **Fast**: 150ms
- **Normal**: 300ms
- **Slow**: 600ms

## Interactive States

### Opacity Values
- **Hover**: 0.8
- **Active**: 0.6
- **Disabled**: 0.4

## Components

### Buttons
- **Default**: Transparent with neon blue border
- **Primary**: Neon blue background with white text
- **Sizes**: Small, Medium, Large

### Panels
- **Default**: Glass-morphism effect with dark background
- **Glass**: Backdrop-filter blur effect

### Forms
- **Inputs**: Dark background with neon blue border
- **Focus**: Glow effect on input focus

## Effects

### Glitch Effect
- **Primary Color**: Neon pink (`#FF00FF`)
- **Secondary Color**: Neon blue (`#00F3FF`)
- **Animation Duration**: 5 seconds

### Wobble Animation
- **Delay**: 0.5 seconds
- **Duration**: 2 seconds

### Void Transition
- **Duration**: 1.5 seconds

## Responsive Design

The system adapts to different screen sizes with appropriate font sizing and spacing adjustments for mobile devices.

## Accessibility

### Focus States
- All interactive elements have visible focus indicators
- High contrast mode support
- Reduced motion support

## Implementation

### CSS Variables
All design values are implemented using CSS variables for easy customization and consistency.

### Component Classes
Reusable CSS classes for common UI elements that follow the design system.
