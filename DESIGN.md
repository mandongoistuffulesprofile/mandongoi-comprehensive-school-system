---
name: Academic Enterprise Ledger
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for high-density school management and financial auditing. It prioritizes clarity, data integrity, and professional reliability. The aesthetic is **Corporate Modern**, leaning into a structured, systematic layout that minimizes visual noise to favor information density. 

The target audience consists of school administrators, registrars, and bursars who require a tool that feels authoritative and efficient. The UI evokes a sense of stability through a neutral-heavy palette, precision typography, and subtle tactile feedback. It avoids decorative elements, ensuring that every pixel serves a functional purpose in the management of complex academic ecosystems.

## Colors
This design system utilizes a high-contrast functional palette. The **Primary** blue serves as the tenant identity marker, used for core actions and active states. 

**Neutral** shades are strictly tiered to ensure WCAG AA compliance:
- **Surface (#f8fafc):** Backgrounds and container fills.
- **Muted (#64748b):** Secondary labels and metadata.
- **Body (#475569):** Standard reading text and descriptions.
- **Heading (#0f172a):** High-impact titles and primary data points.

Semantic roles for Success, Warning, and Danger are reserved for status indicators, financial trends, and destructive actions. Background tints (10% opacity) of these colors should be used for alerts to maintain legibility.

## Typography
The system uses a dual-font approach. **Inter** is the primary typeface for all UI elements, providing exceptional legibility at small sizes. **JetBrains Mono** is introduced specifically for financial figures, student IDs, and tabular data to ensure character alignment and numerical clarity.

To meet accessibility requirements, metadata and descriptions use the "Body-sm" or "Data-mono" tokens with the Neutral-Body (#475569) color at minimum. Headlines utilize tighter tracking and heavier weights to establish a clear hierarchy against dense data tables.

## Layout & Spacing
This design system follows a **Fixed-Fluid hybrid grid**. The sidebar is fixed at 280px, while the main content area utilizes a 12-column fluid grid. 

Desktop density is high; use the 4px base unit to define narrow vertical rhythm in tables (8px cell padding) and wider breathing room in dashboard views (24px padding). Breakpoints are set at 768px (Tablet) and 1280px (Desktop). On desktop, dashboards should use a 3-column or 4-column layout for metric cards to maximize horizontal real estate.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Subtle Shadows**. 

- **Level 0 (Base):** The #f8fafc background.
- **Level 1 (Cards/Containers):** Pure white (#ffffff) surfaces with a `shadow-sm` (0 1px 2px 0 rgba(0,0,0,0.05)).
- **Level 2 (Overlays/Modals):** Pure white with a `shadow-md` (0 4px 6px -1px rgba(0,0,0,0.1)).

Interactive elements like buttons should utilize a subtle 1px border (#e2e8f0) even when elevated to maintain structural definition in high-brightness environments.

## Shapes
The shape language combines approachability with professional structure. 
- **Large Cards:** Use `radius-xl` (12px) for main dashboard sections and content containers.
- **Standard Components:** Use `radius-lg` (8px) for buttons, input fields, and dropdowns.
- **Small Elements:** Use `radius-md` (6px) for chips, tags, and checkboxes.

This nesting strategy (smaller radius inside larger radius) ensures visual harmony when components are placed inside cards.

## Components
- **Buttons:** Primary buttons use a solid #2563eb fill with white text. Secondary buttons use a white fill with a 1px #e2e8f0 border and #0f172a text. All buttons have a height of 36px for desktop density.
- **Metric Cards:** High-contrast containers for financial data. Use #0f172a for the value and Success/Danger colors for the "trend" indicators. Include a subtle 1px border.
- **Input Fields:** 8px radius. Active state is defined by a 2px outer ring of Primary color with 20% opacity.
- **Data Tables:** Striped rows are not required; use subtle dividers (#f1f5f9). Headers must be #f8fafc with `label-caps` typography.
- **Monoline Icons:** Use 20px size for standard actions and 24px for navigation. Stroke weight should be 1.5px to match the professional weight of the typography.
- **Quick Links:** Displayed as a list of `radius-lg` tiles with a subtle hover state (#f1f5f9) and monoline icons.