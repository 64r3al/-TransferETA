# Development Roadmap

The roadmap is phase-gated: each phase is reviewed and tested before the next begins. Dates are intentionally not promised until implementation effort and scope are validated.

## Phase 0 — Repository foundation

**Deliverables**
- Create the GitHub repository under the intended owner.
- Add README, license, contribution and security guidance.
- Add this documentation set and initial project notebook.
- Configure branch and repository settings where available.
- Add issue templates and pull-request template.

**Exit criteria**
- Repository metadata is correct.
- Documentation is internally consistent.
- Default branch and first commit are in place.

## Phase 1 — Application scaffold

**Deliverables**
- Vite + TypeScript setup.
- Strict TypeScript configuration.
- Lint/format configuration.
- Vitest and Playwright setup.
- Minimal semantic page shell and design tokens.

**Exit criteria**
- Clean install, typecheck, tests, and production build pass in CI.

## Phase 2 — Calculation core

**Deliverables**
- Canonical unit constants and conversions.
- Validation utilities.
- Upload-time calculation.
- Required-speed calculation.
- Maximum-size calculation.
- Duration, size, and speed formatters.

**Exit criteria**
- All worked examples and edge cases in the calculation specification pass.
- Core has no DOM dependencies.

## Phase 3 — Main calculator experience

**Deliverables**
- Mode switcher.
- Accessible forms and unit selectors.
- Presets.
- Results panel.
- Error handling and reset behavior.

**Exit criteria**
- All three modes work end to end on desktop and mobile.

## Phase 4 — Visual design and responsive behavior

**Deliverables**
- Final design tokens and typography.
- Polished layout, input, result, and navigation components.
- Light/dark themes.
- Reduced-motion behavior.

**Exit criteria**
- Responsive and accessibility checks pass.

## Phase 5 — Optional simulation and sharing

**Deliverables**
- Mathematical simulation preview.
- Pause/resume/reset.
- Optional playback multipliers.
- Shareable estimate URLs, if retained in scope.

**Exit criteria**
- No confusion with actual transfer; state and timer behavior is deterministic and tested.

## Phase 6 — Content, SEO, and launch preparation

**Deliverables**
- How-it-works content.
- Worked examples and FAQs.
- Metadata, favicon, social preview, sitemap, and robots policy.
- Privacy and limitations copy.

**Exit criteria**
- Metadata matches visible content; no unsupported claims or misleading structured data.

## Phase 7 — Release candidate and v1.0.0

**Deliverables**
- Full QA pass.
- Production build and deployment.
- Smoke test on the production URL.
- Changelog and release notes.
- `v1.0.0` Git tag.

**Exit criteria**
- All release checklist items pass; known limitations are documented.

## Post-v1.0 candidates

- Download-time mode using the same engine.
- Compare several upload rates side by side.
- Multiple-file total size calculator.
- Local-only estimate history, opt-in.
- More localization options.
- Advanced real-world guidance with clear uncertainty disclaimers.