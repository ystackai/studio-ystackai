# Component Library

## Overview

This document outlines the reusable UI components that make up the visual design system for the cyberpunk-themed game project.

## Buttons

### Default Button
```html
<button class="btn">Button Text</button>
```
- Transparent background with neon blue border
- Hover effect with neon blue background and glow
- Text-transform: uppercase with letter-spacing

### Primary Button
```html
<button class="btn btn-primary">Primary Button</button>
```
- Neon blue background with white text
- Hover effect with neon pink background and glow

### Button Sizes
```html
<button class="btn btn-small">Small</button>
<button class="btn">Medium</button>
<button class="btn btn-large">Large</button>
```

## Panels

### Default Panel
```html
<div class="panel">Panel Content</div>
```
- Dark background with semi-transparent overlay
- Border with neon blue transparency
- Box-shadow for depth

### Glass Panel
```html
<div class="panel panel-glass">Glass Panel Content</div>
```
- Backdrop-filter blur effect
- Semi-transparent background

## Forms

### Form Group
```html
<div class="form-group">
  <label class="form-label">Label Text</label>
  <input class="form-input" type="text">
</div>
```
- Dark background with neon blue border
- Focus state with glow effect
- Responsive design

## Typography

### Headings
```html
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
```
- Primary font family (Orbitron)
- Varying font sizes based on heading level
- Consistent spacing

### Paragraphs
```html
<p>Paragraph text with line-height for readability</p>
```
- Secondary font family (Roboto)
- Proper line-height for readability
- Margin-bottom for spacing

## Animations

### Wobble Animation
```html
<div class="animate-wobble">Wobbling Element</div>
```
- Continuous wobble animation
- Smooth easing for natural movement

### Glitch Effect
```html
<div class="glitch-effect" data-text="Glitch Text">Glitch Text</div>
```
- Text glitch effect with animated overlays
- Dual-color effect for cyberpunk feel

### Void Transition
```html
<div class="void-transition">Void Transition</div>
```
- Animated background transition
- Subtle motion for depth

## Utility Classes

### Accessibility
```html
<span class="sr-only">Screen reader only text</span>
```
- Visually hidden but accessible to screen readers

### Responsive
```html
<div class="responsive-element">Responsive Content</div>
```
- Adapts to different screen sizes
- Font sizes and spacing adjust accordingly
