# Accessibility Evidence

This site targets WCAG 2.2 AAA where technically feasible.

## Current controls

- Semantic landmarks on all pages (`header`, `nav`, `main`, `footer`)
- Skip link to main content
- Keyboard-visible focus styles
- Theme toggle supports both light and dark modes
- Reduced-motion support via `prefers-reduced-motion`
- API response updates announced with `aria-live`

## Verification performed

- Manual keyboard pass on all routes
- Astro production build succeeded (`npm run build`)
- Automated unit tests for API tester helpers (`npm run test:unit`)
- Playwright + axe checks on core routes (`npm run test:a11y`)

## Planned follow-up

- Add automated `axe` checks in CI
- Add screen reader walkthrough notes
