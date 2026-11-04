# TransferETA — Product & Engineering Master Plan

**Document status:** Baseline plan  
**Plan version:** 1.0  
**Prepared:** 2026-11-04  
**Product name:** TransferETA (working name; branding and trademark clearance are separate checks)  
**Repository slug:** `-TransferETA`  
**Initial release target:** `v1.0.0`  
**Implementation status:** First website implementation committed; automated CI and deployment verification pending

---

## 1. Executive summary

TransferETA will be a fast, privacy-first web calculator that estimates how long a file transfer will take at a specified upload throughput. It will also answer two reverse questions: what throughput is needed to finish within a target duration, and how much data can be transferred in a given time.

The application will be a static, browser-based tool. Its calculations will run locally, and visitors will not need an account or need to select, upload, or expose a file. The product will favour transparent assumptions, exact unit conversion, clear error handling, accessible interaction, and a small production footprint over unnecessary complexity.

The reference calculator is treated as a functional reference only. TransferETA will use original copy, original visual design, and independently implemented code. No source code, branding, or assets will be copied.

## 2. Product identity

| Item | Decision |
|---|---|
| Product name | TransferETA |
| Short description | Upload time calculator |
| Tagline | Know how long your upload will take. |
| GitHub repository | [`64r3al/-TransferETA`](https://github.com/64r3al/-TransferETA) |
| Default branch | `main` |
| Initial release | `v1.0.0` |
| License | MIT, pending final ownership/copyright details |
| Hosting | Static hosting; Vercel is the preferred option |
| Application model | Client-side only |

The product name is a working selection, not a claim of trademark or domain availability. Before launch, check relevant domain names, social handles, and trademark conflicts. A repository slug can be unique within the owner's GitHub namespace even if similar names exist elsewhere.

## 3. Vision and product principles

### Vision

Give users a dependable answer to a simple question—“How long will this upload take?”—without requiring technical knowledge or compromising privacy.

### Product principles

1. **Correctness:** unit semantics and formulas must be explicit and tested.
2. **Clarity:** show the inputs, assumptions, and effective throughput behind each result.
3. **Privacy:** never request a real file for a mathematical estimate.
4. **Speed:** avoid frameworks, services, and dependencies that do not earn their cost.
5. **Accessibility:** all core tasks must work with a keyboard and assistive technology.
6. **Maintainability:** one calculation core, typed domain models, predictable modules, and automated tests.
7. **Honesty:** distinguish an estimate from an actual transfer and distinguish a simulation from a live upload.

## 4. Users and jobs to be done

### Primary users

- People uploading videos, images, backups, archives, and project files.
- Creators and freelancers estimating delivery time for large assets.
- Users comparing internet plans or measured upload speeds.
- Anyone who needs a quick estimate without installing software.

### Core jobs

- Estimate a transfer duration from file size and upload speed.
- Compare the impact of different upload speeds.
- Determine the minimum upload rate needed to meet a deadline.
- Estimate the maximum amount of data transferable during a fixed time window.
- Understand why an actual transfer may differ from the estimate.

## 5. Scope

### Must-have for v1.0

- Opt-in browser network speed test for download throughput, upload throughput, idle latency, and jitter.
- One-click handoff of measured upload speed into upload-time mode, with additional throughput reduction reset to 0%.
- Upload-time calculator.
- Required-upload-speed calculator.
- Maximum-transferable-size calculator.
- SI and IEC unit conversions.
- Explicit bits-versus-bytes presentation.
- Optional throughput-loss percentage, defaulting to 0%.
- Validation and useful inline error messages.
- Results panel with sensible duration formatting.
- Common presets.
- Copy-result action with clipboard fallback and user feedback.
- Responsive desktop/tablet/mobile layout.
- Light and dark themes.
- Educational formula explanation and concise FAQs.
- Local-only calculation; no accounts, database, file access, or file uploads.
- Unit tests, browser tests, lint/type checks, and CI.
- README, architecture notes, calculation specification, QA plan, and project notebook.

### Should-have for v1.0 if schedule and quality allow

- Optional accelerated simulation preview with pause, resume, and reset.
- Shareable estimate URL using validated, non-sensitive query parameters.
- Browser-local theme preference.
- Print-friendly result summary.

### Explicitly out of scope for v1.0

- Actual file transfer or cloud storage.
- Speed testing or measuring a user's network.
- Accounts, user profiles, or server-side history.
- Ads, tracking pixels, or analytics by default.
- Download scheduling or background transfer management.
- Guaranteed completion times or ISP performance predictions.
- Mobile native applications.

## 6. Information architecture

The single-page experience will use the following hierarchy:

1. **Header:** wordmark, concise navigation, theme control.
2. **Hero:** title, one-sentence value proposition, short privacy note.
3. **Calculator workspace:** three mode tabs or segmented controls.
4. **Inputs:** clearly labelled values, units, presets, optional overhead control.
5. **Primary action:** calculate; no automatic calculation that unexpectedly changes focus.
6. **Results:** prominent duration or computed output, plus normalized values and assumptions.
7. **Optional simulation:** clearly marked as a time-scaled mathematical preview.
8. **How it works:** formula, unit explanation, example calculation.
9. **Typical file sizes and speed examples:** labelled as illustrative only.
10. **FAQ:** actual visible answers; structured data only if it accurately matches visible content.
11. **Footer:** project links, source, privacy statement, version.

The first useful calculator interaction must be visible without excessive scrolling on common laptop and phone viewports.

## 7. Functional requirements

### 7.1 Browser speed test

- Start only after an explicit visitor action; never run on page load.
- Use the official `@cloudflare/speedtest` browser engine and Cloudflare's edge network.
- Report measured upload/download throughput, idle latency, jitter, and loaded latency where available.
- Provide visible progress, phase labels, cancellation, retry, partial-result handling, and an apply action.
- Apply only the measured upload rate to upload-time mode; do not treat download rate as upload rate.
- Disable the package's optional result-logging endpoints (`logAimApiUrl` and `logMeasurementApiUrl` are null).
- Disclose that measurement traffic goes to Cloudflare and exposes ordinary request metadata, including IP address.
- Keep a bounded measurement plan and hard timeouts. No TURN/packet-loss test is included because that requires separately provisioned infrastructure.

### 7.2 Upload-time mode

Inputs:
- File size: positive or zero finite numeric value.
- File-size unit: bytes, SI byte units, or IEC byte units.
- Upload throughput: finite numeric value greater than zero.
- Throughput unit: bits/s or bytes/s with SI prefixes.
- Optional throughput reduction: 0–99.9%, default 0%.

Output:
- Estimated duration in seconds internally.
- Human-friendly duration.
- Effective payload throughput in both a user-relevant unit and a normalized base unit.
- Echoed file size, nominal speed, and reduction assumption.

Zero-byte input is a valid edge case and yields zero duration. A zero upload speed is invalid because the transfer cannot progress; it must not produce a finite duration.

### 7.3 Required-speed mode

Inputs:
- File size and unit.
- Target duration, represented as a positive finite duration (initial UI may use hours/minutes/seconds fields or a duration value with unit).
- Throughput reduction: 0–99.9%.

Output:
- Required nominal throughput, because users normally compare the result to a plan or speed-test reading.
- Required effective payload throughput.
- Clear statement of the assumed reduction.

### 7.4 Maximum-size mode

Inputs:
- Nominal upload throughput and unit.
- Available duration.
- Throughput reduction: 0–99.9%.

Output:
- Maximum transferable bytes under the model.
- Human-friendly SI and IEC size representations.
- Effective payload throughput and stated assumptions.

### 7.5 Presets

Speed presets should be useful examples rather than claims about typical real-world plans. Proposed values: 1, 5, 10, 25, 50, 100, 500 Mbps and 1 Gbps.

File-size presets should include representative sizes such as 100 MB, 500 MB, 1 GB, 5 GB, 10 GB, 25 GB, 50 GB, and 100 GB. Presets must be labelled clearly and must not overwrite unrelated fields.

### 7.6 Results and sharing

- Copy the result text to the clipboard.
- Show a non-blocking success/failure message.
- Shareable URLs, if implemented, must contain only calculator inputs and mode; do not encode private file names or user data.
- On invalid or incomplete inputs, preserve user-entered values and focus or announce the relevant error.

### 7.7 Simulation preview

The simulation is a visualized estimate, not a real network transfer. It must never ask for a file or claim bytes were uploaded.

- Progress is derived from elapsed simulated time and the computed duration.
- Pause/resume uses a monotonic clock and must not accumulate interval drift.
- Reset returns progress to zero.
- Optional playback multipliers (for example 1×, 10×, 60×, 300×) must be visibly described as simulation speed, not upload speed.
- The displayed transfer speed remains the calculated effective throughput; the playback multiplier affects only the preview clock.
- Respect reduced-motion preferences.

## 8. Non-functional requirements

### Performance

- Keep the application static and dependency-light.
- Avoid large UI libraries for a small calculator.
- Lazy-load only if a feature genuinely benefits from it.
- Do not add remote fonts, analytics, or third-party widgets without a clear product reason.
- Set a performance budget after the first working build and monitor regressions in CI where practical.

### Accessibility

Target WCAG 2.2 AA practices:
- Semantic landmarks and heading hierarchy.
- Explicit labels and input instructions.
- Keyboard-operable controls and visible focus.
- Error text associated with the relevant field.
- Results announced appropriately without stealing focus.
- Sufficient contrast in both themes.
- Reduced-motion support.
- Touch targets and responsive spacing appropriate for mobile.

### Compatibility

Support current stable versions of major evergreen browsers: Chromium-based browsers, Firefox, and Safari. Define the exact browser test matrix in CI once the release environment is established.

### Reliability

- No `NaN`, `Infinity`, or silent invalid conversions in user-visible outputs.
- Guard against overflow and unsupported magnitudes.
- Use a consistent internal representation.
- Keep output formatting independent from core arithmetic.

### Privacy and security

- All calculations happen in the browser.
- No file input element is needed.
- No backend or personal data collection in v1.0.
- Do not persist calculator values unless a future feature explicitly requires it and the user is informed.
- Theme preference may be stored locally; avoid storing sensitive information.
- Validate any imported or URL-provided values before calculation.
- Keep dependencies minimal and reviewed; enable dependency and secret scanning where available.

## 9. User experience and visual design

### Design direction

A premium, restrained utility interface: clean typography, precise spacing, clear grouping, subtle borders, restrained depth, and one deliberate accent colour. It should feel trustworthy and modern rather than playful or visually noisy.

### Layout

- Desktop: centered content column with a well-proportioned input card and result area.
- Tablet: fluid layout with controlled widths and no clipped controls.
- Mobile: single-column inputs, full-width primary action, readable results, no horizontal scrolling.

### Interaction rules

- Make the selected calculator mode obvious.
- Use text labels in addition to icons.
- Preserve values when switching modes when they remain semantically valid.
- Never use placeholder text as the only field label.
- Provide immediate validation on submit and restrained field-level feedback.
- Avoid excessive animations; respect the system's reduced-motion setting.

## 10. Technical approach

Proposed stack:
- TypeScript.
- Vite.
- Semantic HTML.
- Custom CSS using design tokens.
- Vitest for unit tests.
- Playwright for end-to-end browser tests.
- ESLint and Prettier (or one consistent lint/format approach).
- GitHub Actions for CI.

The framework decision is intentionally conservative: a small vanilla TypeScript application should be sufficient. A UI framework may be introduced only if the component/state complexity grows enough to justify the extra runtime and maintenance cost.

## 11. Current implementation status

The website implementation includes the responsive one-page interface, all three calculator modes, SI/IEC conversion, throughput-reduction assumptions, result metrics, speed comparison, a time-scaled preview, copy/share actions, theme support, formula guidance, FAQ, SEO assets, and an opt-in Cloudflare browser speed test with one-click upload-speed handoff. Pure calculation and speed-test adapter modules, unit tests, mocked Playwright browser tests, GitHub Actions, and Vercel static build configuration are committed. The speed-test integration is implemented in source; its external-provider behavior still needs CI/browser verification and live manual testing.

The remaining release gates are dependency-backed CI execution for the Cloudflare package and tests, cross-browser/manual accessibility review, speed-test validation against Cloudflare from real browsers/networks, a production deployment smoke test, lockfile generation and commit, and the `v1.0.0` release. Code being present in `main` does not by itself mean it has been deployed or released.

## 12. Definition of done

A feature is complete only when:
- Requirements and edge cases are documented.
- TypeScript checks pass.
- Relevant unit tests pass.
- Browser interaction tests pass where applicable.
- Keyboard navigation and screen-reader semantics are reviewed.
- Mobile and desktop layouts are checked.
- No console errors or uncaught promise rejections remain.
- Documentation is updated.
- A reviewer can explain the formulas and assumptions.

The v1.0 release is ready only when all P0 requirements in the QA plan pass and the production build is verified on the deployed URL.

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Confusing Mbps and MB/s | 8× calculation error | Explicit `bit`/`byte` labels, unit tests, examples |
| Mixing SI and IEC units | Inconsistent results | Named conversion constants and tests for every unit |
| Treating a speed-test result like a raw link rate | Double-counted overhead | Default reduction to 0%; explain measured throughput |
| Overclaiming estimate precision | User mistrust | Explain that real-world congestion and server limits vary |
| Simulation mistaken for real upload | Misleading UX | Persistent “simulation only” label; no file access |
| Overengineering with backend or framework | More maintenance and attack surface | Static client-side v1.0; add services only for a justified need |
| Poor small-screen usability | Abandonment | Mobile-first layout and browser tests |
| Unclear brand availability | Legal/brand conflict | Separate trademark/domain review before public marketing |

## 14. Release policy

- Use semantic versioning.
- Keep `main` deployable.
- Use feature branches for meaningful changes.
- Require CI checks before merging changes.
- Tag the initial stable release as `v1.0.0` only after the release checklist passes.
- Maintain a concise `CHANGELOG.md`.
- Document known limitations instead of hiding them.
