---
name: mobile-web-app
description: Design, implement, or review this project's mobile-first React interface, PWA behavior, responsive layouts, touch interactions, bottom navigation, bottom sheets, safe areas, and complete dark mode. Use for UI/UX work that must feel like a polished phone app across mobile, tablet, and desktop rather than a dashboard-style website.
---

# Mobile Web App

Build this project as a touch-first mobile application with a restrained, youthful, modern visual language that leans slightly toward iOS without copying proprietary assets.

## Responsive baseline

- Design primarily at 375 px, 390 px, and 430 px widths.
- Support widths down to 320 px.
- Support iPhone, Android phones, iPad, and desktop browsers.
- Use `100dvh` where viewport-height layout is required.
- Account for `safe-area-inset-top` and `safe-area-inset-bottom` in fixed or edge-aligned UI.
- Constrain the application shell on desktop so the mobile layout does not stretch indefinitely.
- Keep long Chinese text readable and apply intentional wrapping, line clamping, or ellipsis where space is bounded.

## Interaction model

- Make every core action usable by touch and do not require hover.
- Keep primary touch targets approximately 44 x 44 px or larger.
- Prefer bottom navigation for 3–5 primary destinations.
- Prefer bottom sheets for mobile forms and detail views when they fit the interaction.
- Use Lucide icons for interface icons; do not use emoji as primary UI icons.
- Keep ordinary UI transitions around 150–250 ms and respect reduced-motion preferences.

## Visual direction

- Keep the interface clean, soft, calm, modern, and information-dense without clutter.
- Implement dark mode completely, including surfaces, text, borders, overlays, sheets, controls, and system chrome metadata where applicable.
- Avoid admin-dashboard composition, Bootstrap-like styling, oversized web-page headings, excessive gradients, and excessive glassmorphism.

## Verification

After completing material UI work, inspect all core flows in both light and dark modes at:

- 320 x 568
- 375 x 812
- 390 x 844
- 430 x 932
- 768 x 1024
- 1440 x 900

Check safe areas, fixed navigation, sheet height, overflow, text truncation, keyboard/form usability, touch targets, and the desktop width constraint. Fix defects before declaring the UI complete.
