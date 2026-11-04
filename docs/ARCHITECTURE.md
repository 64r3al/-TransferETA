# Architecture & Repository Design

## 1. Architecture overview

TransferETA is a static, client-side application. The UI collects values, validates them, converts them into canonical units, calls pure calculation functions, and renders formatted results. No calculation requires a server.

```text
User input
   │
   ▼
UI / form state
   │
   ▼
Validation + normalization
   │
   ▼
Canonical units (bytes, bits per second, seconds)
   │
   ▼
Pure calculation core
   │
   ▼
Result model
   │
   ▼
Formatting + accessible result presentation
```

The UI must not reimplement formulas. All three calculator modes use the same conversion and calculation modules.

## 2. Proposed repository layout

```text
-TransferETA/
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   ├── robots.txt
│   └── site.webmanifest
├── src/
│   ├── core/
│   │   ├── calculator.ts
│   │   ├── units.ts
│   │   ├── formatter.ts
│   │   ├── validation.ts
│   │   └── types.ts
│   ├── components/
│   │   ├── calculator-form.ts
│   │   ├── result-panel.ts
│   │   ├── simulation.ts
│   │   ├── theme-toggle.ts
│   │   └── notifications.ts
│   ├── state/
│   │   └── calculator-state.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   ├── layout.css
│   │   └── components.css
│   ├── app.ts
│   └── main.ts
├── tests/
│   ├── unit/
│   │   ├── calculator.test.ts
│   │   ├── units.test.ts
│   │   ├── formatter.test.ts
│   │   └── validation.test.ts
│   └── e2e/
│       ├── calculator.spec.ts
│       ├── responsive.spec.ts
│       └── accessibility.spec.ts
├── docs/
│   ├── PROJECT_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── CALCULATION_METHOD.md
│   ├── QA_TEST_PLAN.md
│   ├── ROADMAP.md
│   └── PROJECT_NOTEBOOK.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/ci.yml
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.js
├── .editorconfig
├── .gitignore
├── LICENSE
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── CHANGELOG.md
```

## 3. Module responsibilities

### `core/units.ts`

- Defines supported speed and size units.
- Holds canonical conversion factors.
- Converts user values to bytes or bits per second.
- Converts canonical values to requested display units.
- Contains no DOM or browser dependencies.

### `core/validation.ts`

- Validates finite numeric values and allowed ranges.
- Rejects invalid units and impossible durations.
- Returns structured validation errors rather than throwing for expected user mistakes.

### `core/calculator.ts`

- Exposes pure functions for upload duration, required speed, and maximum transferable size.
- Accepts canonical values and explicit throughput reduction.
- Returns a typed result or structured error.
- Contains no formatting or UI code.

### `core/formatter.ts`

- Converts seconds into human-friendly duration strings.
- Formats bytes and rates with explicit units.
- Keeps rounding and display conventions out of calculation logic.

### `components/`

- Owns DOM rendering and user interaction.
- Delegates all calculations to `core/`.
- Uses accessible labels, live regions, and focus handling.

### `components/simulation.ts`

- Runs a mathematical playback preview.
- Uses a monotonic time source (`performance.now()` where available).
- Does not create network requests or read local files.

### `state/`

- Maintains selected mode, inputs, validation state, and result state.
- Avoids duplicating source-of-truth values in multiple DOM components.

## 4. Data model

Proposed canonical input types:

```ts
export type CalculatorMode = "upload-time" | "required-speed" | "maximum-size";

export interface TransferAssumptions {
  /** Fraction of nominal throughput unavailable for payload, from 0 to < 1. */
  throughputLoss: number;
}

export interface UploadTimeInput {
  fileSizeBytes: number;
  nominalBitsPerSecond: number;
  assumptions: TransferAssumptions;
}

export interface RequiredSpeedInput {
  fileSizeBytes: number;
  targetDurationSeconds: number;
  assumptions: TransferAssumptions;
}

export interface MaximumSizeInput {
  nominalBitsPerSecond: number;
  availableDurationSeconds: number;
  assumptions: TransferAssumptions;
}
```

These are design contracts. The implementation may refine names, branded types, and error unions while preserving the semantics.

## 5. State and rendering principles

- Keep core calculations pure and deterministic.
- Keep transient form state separate from computed result state.
- Recalculate only on an intentional user action or a clearly documented live-update interaction.
- Preserve valid inputs when changing modes where practical.
- Avoid rebuilding the entire page for a small input change.
- Announce result changes through a restrained `aria-live` region.
- Do not move focus to the result automatically unless the interaction pattern explicitly requires it.

## 6. Build and deployment

- Vite builds the static production bundle into `dist/`.
- The host serves `index.html` and static assets over HTTPS.
- No API routes, environment secrets, or runtime database are required.
- Configure correct cache headers for fingerprinted assets and revalidation for HTML.
- Verify the deployed build and browser console after each production release.

## 7. Dependency policy

Every runtime dependency must have a clear, documented value. Prefer browser APIs and small local utilities. Development tools such as Vitest, Playwright, TypeScript, and linting may be included because they support quality assurance, but should not increase the production runtime unnecessarily.