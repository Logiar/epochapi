# Spec-First Website + Contract Enforcement Design

## Goal

Create a separate website that explains epochapi use cases, provides interactive API documentation, and enforces `openapi.yaml` as a single source of truth for both documentation and Rust backend contract checks.

## Decisions

- Separate web project (`web/`) with Astro.
- `openapi.yaml` is canonical.
- Generated artifacts:
  - `web/src/generated/openapi.ts`
  - `web/src/generated/docs-model.json`
  - Rust compile-time contract surface via `contracts/rust/api_contract` build generation.
- Enforcement in CI:
  - generation + drift checks,
  - backend tests,
  - runtime contract checks.

## Core User Experience

- Stylish, modern documentation site.
- Light and dark mode with accessible contrast.
- Semantic pages for three use cases:
  - trusted current time,
  - validating stored time,
  - preventing offline game cheating.
- Interactive API page built from generated OpenAPI model.

## Quality Bar

- Accessibility-first UI patterns and semantic structure.
- WCAG AAA target posture documented in accessibility evidence.
- CI gates for spec and generated artifact consistency.
