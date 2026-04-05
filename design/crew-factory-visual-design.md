# Crew Factory Visual Design

## Design Principles

### 1. Theatrical yet Clear
The interface should feel like part of the ystackai world while remaining understandable. The design should balance entertainment value with functional utility.

### 2. Interactive
Users should be able to engage with the crew and see immediate feedback. Visual elements should respond to user interactions in meaningful ways.

### 3. Consistent
Maintain visual and interaction patterns that align with the broader ystackai brand. This includes color schemes, typography, and design language.

### 4. Functional
Every element should serve a purpose in the onboarding or demonstration experience.

## Color Palette

### Primary Colors
- **Primary Accent**: #6366f1 (Indigo)
- **Secondary Accent**: #f59e0b (Amber)
- **Background**: #f7f7ff (Light indigo)
- **Background Warm**: #fefefe (White)
- **Text Ink**: #16162a (Dark gray)
- **Text Soft**: #5b607c (Medium gray)

### Supporting Colors
- **Panel Background**: #ffffff (White)
- **Border Line**: #d9def4 (Light indigo)
- **Accent Dim**: rgba(99, 102, 241, 0.08) (Light indigo)
- **Accent 2 Dim**: rgba(245, 158, 11, 0.10) (Light amber)

## Typography

### Font Family
- **Primary**: "IBM Plex Sans", "Inter", system-ui, sans-serif
- **Fallback**: system-ui, sans-serif

### Font Sizes
- **Hero Title**: clamp(2.4rem, 5.5vw, 4rem)
- **Section Titles**: 1.05rem
- **Body Text**: 16px (1rem)
- **Small Text**: 0.88rem
- **Eyebrow Text**: 11px

### Line Heights
- **Body**: 1.6
- **Hero**: 0.95
- **Headings**: 1.7

## Component Design

### Hero Section
- **Padding**: 56px 44px 52px
- **Border**: 1px solid var(--cf-line)
- **Border Radius**: 6px
- **Background**: 
  - Linear gradient with var(--cf-accent-dim) and var(--cf-accent-2-dim)
  - Background color: var(--cf-panel)

### Crew Cards
- **Border**: 1px solid var(--cf-line)
- **Border Radius**: 6px
- **Padding**: 22px 20px
- **Background**: 
  - Linear gradient from #fff to #fafaff
- **Hover Effects**: 
  - Box shadow: 0 4px 20px rgba(99, 102, 241, 0.08)
  - Transform: translateY(-2px)

### Step Cards (How It Works)
- **Grid**: 4 columns
- **Gap**: 14px
- **Border**: 1px solid var(--cf-line)
- **Border Radius**: 6px
- **Padding**: 20px 18px
- **Background**: var(--cf-panel)
- **Hover Effects**: 
  - Box shadow: 0 2px 12px rgba(99, 102, 241, 0.06)

## Interactive Elements

### Buttons
- **Background**: var(--cf-accent) or var(--cf-accent-2) 
- **Text Color**: white
- **Border Radius**: 6px
- **Padding**: 12px 24px
- **Transition**: All transitions should be smooth (0.25s ease)

### Forms
- **Input Fields**: 
  - Border: 1px solid var(--cf-line)
  - Border Radius: 6px
  - Padding: 12px
- **Submit Button**: 
  - Background: var(--cf-accent)
  - Text Color: white
  - Border Radius: 6px
  - Padding: 12px 24px

### Audio Feedback
- **Ambient Sound**: Very faint warm pad (low-frequency oscillator through low-pass filter)
- **Hover Sound**: Tiny soft tick
- **Confirmation Sound**: Two-tone confirmation

## Layout Structure

### Page Layout
- **Width**: min(1080px, calc(100vw - 48px))
- **Margin**: 0 auto
- **Padding**: 48px 0 80px

### Section Spacing
- **Section Gap**: 32px
- **Section Title**: 
  - Font size: 1.05rem
  - Font weight: 700
  - Letter spacing: 0.01em
  - Margin bottom: 16px

## Responsive Design
- **Mobile First**: Design should be responsive to all screen sizes
- **Breakpoints**: Use CSS clamp() and relative units for fluid layouts
- **Touch Targets**: Ensure all interactive elements are appropriately sized for touch

## Accessibility Considerations
- Ensure sufficient color contrast ratios
- Provide focus states for interactive elements
- Use semantic HTML structure
- Support keyboard navigation
- Consider screen reader compatibility
