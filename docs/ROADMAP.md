# Development Roadmap

The roadmap is phase-gated. Completed implementation milestones are recorded below; production release remains separate from code completion.

## Phase 0 — Repository foundation

**Status: Complete**

- Public GitHub repository established.
- README, product plan, architecture, calculation specification, QA plan, roadmap, and notebook committed.
- Contribution/security guidance and GitHub issue/PR templates added.

## Phase 1 — Application scaffold

**Status: Implemented; dependency-backed CI pending**

- Vite + TypeScript package configuration.
- Strict TypeScript application settings.
- Vitest and Playwright configuration.
- Semantic HTML page shell, original brand identity, and responsive design system.
- GitHub Actions quality workflow.

## Phase 2 — Calculation core

**Status: Implemented**

- SI and IEC unit conversion.
- Explicit bit/byte upload-rate conversion.
- Upload-time, required-speed, and maximum-size formulas.
- Throughput-reduction validation and range handling.
- Duration, rate, and file-size formatting.
- Unit tests for worked examples and inverse calculation behavior.

## Phase 3 — Main calculator experience

**Status: Implemented**

- Three-mode switcher and input forms.
- Unit selectors and common presets.
- Result metrics and friendly validation.
- Copy and share actions.
- Shareable URLs with mode/unit allowlists.
- Dynamic speed comparison.

## Phase 4 — Visual design and responsive behavior

**Status: Implemented; manual device review pending**

- Premium light/dark interface.
- Responsive desktop/tablet/mobile layouts.
- Keyboard-friendly mode tabs and visible focus styling.
- Reduced-motion support.
- SEO metadata, favicon, web manifest, and social preview graphic.

## Phase 5 — Optional simulation and sharing

**Status: Implemented**

- Time-scaled mathematical transfer preview.
- Pause/resume/reset and playback multipliers.
- Shareable estimate URL.
- Explicit disclosure that the preview is not a live upload.

## Phase 6 — Content and SEO

**Status: Implemented**

- Formula explanation and worked examples.
- FAQs and visible privacy statements.
- Open Graph/Twitter metadata, WebApplication structured data, robots policy, and web manifest.

## Phase 7 — Verification and release

**Status: In progress**

- TypeScript source check and direct core calculation smoke checks completed in the build environment.
- Automated Vitest and Playwright suites are committed but were not executed locally because the npm registry could not be resolved from the build environment.
- CI workflow is configured to install dependencies and run typecheck, unit tests, browser tests, and production build.
- Production deployment, deployed-site smoke test, package lockfile generation, and `v1.0.0` tag remain outstanding.

## Post-v1.0 candidates

- Download-time mode using the same calculation engine.
- Multiple-file combined-size calculator.
- Additional language/localization options.
- Optional browser-local estimate history.
- More advanced transfer guidance with explicit uncertainty disclaimers.
