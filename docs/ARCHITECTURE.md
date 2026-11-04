# Architecture & Repository Design

## 1. Architecture overview

TransferETA is a static, client-side TypeScript application. The HTML provides the semantic page structure, the main controller manages form state and interactions, and pure functions in `src/core/` handle every conversion and calculation.

```text
User input
   │
   ▼
Accessible HTML form + main controller
   │
   ▼
Validation and conversion
   │
   ▼
Canonical units (bytes, bits per second, seconds)
   │
   ▼
Pure calculation core
   │
   ▼
Typed result model
   │
   ▼
Formatting, metrics, share URL, simulation preview
```

The UI does not duplicate the calculation formulas. Each mode calls the same core utilities.

## 2. Current repository layout

```text
-TransferETA/
├── public/
│   ├── favicon.svg
│   ├── og-preview.svg
│   ├── robots.txt
│   └── site.webmanifest
├── src/
│   ├── core/
│   │   ├── calculator.ts
│   │   ├── speed-test.ts
│   │   ├── format.ts
│   │   └── units.ts
│   ├── main.ts
│   ├── styles.css
│   └── vite-env.d.ts
├── tests/
│   ├── e2e/website.spec.ts
│   ├── unit/calculator.test.ts
│   └── unit/speed-test.test.ts
├── docs/
│   ├── PROJECT_PLAN.md
│   ├── PROJECT_NOTEBOOK.md
│   ├── ARCHITECTURE.md
│   ├── CALCULATION_METHOD.md
│   ├── SPEED_TEST_METHODOLOGY.md
│   ├── QA_TEST_PLAN.md
│   └── ROADMAP.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/ci.yml
├── index.html
├── package.json
├── tsconfig.app.json
├── vitest.config.ts
├── playwright.config.ts
├── vercel.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

## 3. Module responsibilities

### `src/core/units.ts`

- Defines supported upload-rate and file-size units.
- Holds exact SI and IEC conversion factors.
- Converts values to canonical bytes or bits per second.
- Formats file sizes and rates.
- Enforces conservative supported numeric bounds.
- Has no DOM or browser dependency.

### `src/core/calculator.ts`

- Exposes pure functions for upload duration, required nominal rate, and maximum transferable size.
- Applies the documented throughput-reduction model.
- Returns typed results or clear calculation errors.
- Has no formatting or UI code.

### `src/core/format.ts`

- Formats seconds into human-readable durations and clock values.
- Delegates size and rate formatting to the unit module.
- Keeps presentation rounding separate from arithmetic.

### `src/core/speed-test.ts`

- Defines the bounded measurement plan for Cloudflare's official browser engine.
- Disables the module's optional result and per-measurement logging endpoints.
- Maps optional network measurement getters into a safe result model.
- Converts a valid measured upload rate to an exact Mbps input string.
- Contains no DOM or network execution code.

### `src/main.ts`

- Owns selected mode and per-mode form drafts.
- Renders input fields and handles presets.
- Validates user input before calling core functions.
- Renders results and comparison cards.
- Builds and parses share URLs using an allowlist of modes and units.
- Handles theme preference, clipboard actions, toast feedback, and the preview simulation.
- Lazy-loads the speed-test package only after an explicit user action; supports progress, cancellation, partial results, and applying measured upload throughput to the upload-time calculator.

### `src/styles.css`

- Defines light/dark design tokens.
- Implements responsive layout and component styling.
- Includes keyboard focus and reduced-motion behavior.
- Uses local CSS and system font stacks; no remote font or visual dependency is required.

### `tests/`

- Unit tests cover conversions, all three formulas, bounds, and duration formatting.
- Playwright tests cover the main user workflows and key page interactions.

## 4. Canonical data model

All core functions operate on:

- File size in bytes.
- Nominal/effective transfer rate in bits per second.
- Duration in seconds.
- Throughput reduction as a percentage from 0 to 99.9.

The domain contracts are declared in `src/core/calculator.ts`.

## 5. State and rendering principles

- Keep core calculations pure and deterministic.
- Keep transient form drafts separate for each mode.
- Recalculate on explicit submit and when switching modes.
- Preserve values when changing modes where their meaning remains valid.
- Announce results through a restrained `aria-live` region.
- Show an error and invalidate the previous result when the current input set is invalid.
- Never automatically move focus to the result.

## 6. Optional network speed test

The test uses the official `@cloudflare/speedtest` browser engine against Cloudflare's edge network. It is loaded only after the visitor presses Start. The measurement plan is bounded (about 36.4 MB maximum payload), and the per-request and overall test timeouts prevent indefinitely long test runs. Packet loss is not enabled because the optional TURN test requires separate TURN infrastructure and credentials.

`logAimApiUrl` and `logMeasurementApiUrl` are explicitly set to `null`; the optional Cloudflare results-logging endpoints are not used. Cloudflare still receives the actual measurement requests and their ordinary connection metadata. The app does not send the test result to a TransferETA server or persist it. A valid upload result is applied to the calculator only after the visitor chooses the Apply button.

## 7. Simulation design

The preview advances a mathematical elapsed-time value using `performance.now()` and `requestAnimationFrame`. Playback multipliers affect only preview time. The displayed nominal/effective network rate remains unchanged. The preview makes no network requests and does not access the File API.

## 8. Build and deployment

- Vite builds the static production bundle into `dist/`.
- `vercel.json` declares Vite and the `dist` output directory.
- The site requires no serverless functions, API routes, environment secrets, or runtime database.
- The production URL must be smoke-tested before the first release.

## 9. Dependency policy

The application has one pinned runtime dependency: Cloudflare's `@cloudflare/speedtest` module, which is dynamically loaded only after an explicit user action. Development dependencies are limited to Vite, TypeScript, Vitest, and Playwright. Avoid additional runtime dependencies, analytics, remote fonts, or a backend unless the concrete benefit and cost are documented.
