# Quality Assurance & Test Plan

## 1. Quality gates

A pull request must pass:

1. Dependency installation from the lockfile.
2. Formatting and lint checks.
3. TypeScript type checking.
4. Unit tests.
5. Production build.
6. End-to-end browser tests for core flows.

The release candidate must additionally pass responsive, accessibility, privacy, and deployed-site smoke checks.
## 2. Unit test coverage

### Conversion tests

- Every supported speed unit to canonical bits per second.
- Every supported file-size unit to canonical bytes.
- SI/IEC distinctions.
- Bit/byte case distinctions.
- Round-trip conversion within a defined tolerance.

### Calculation tests

- Standard worked examples from `CALCULATION_METHOD.md`.
- Zero-byte file.
- Very small and large supported values.
- Fractional rates.
- Throughput reduction boundaries.
- Required-speed and maximum-size inverse properties.
- Invalid and non-finite values.

### Formatting tests

- Seconds, minutes, hours, days, and longer periods.
- Singular/plural forms.
- Sub-second estimates.
- Rounding boundaries.
- Large values and overflow guards.

## 3. Speed-test tests

- The external measurement engine is not loaded and no request to Cloudflare is made on page load.
- The engine is loaded only after the visitor explicitly starts the test.
- The test can be cancelled and can be run again.
- Progress phases are announced and the interface remains usable during the test.
- Missing upload or download measurements do not crash the interface.
- Partial measurement failures are disclosed rather than presented as a full success.
- The apply action remains disabled until a valid upload result is available.
- Only upload throughput (never download throughput) is copied into upload-time mode.
- Applying a measured speed sets additional throughput reduction to 0%.
- Cloudflare optional result-logging endpoints remain disabled.
- E2E tests mock the external endpoints and do not consume real bandwidth.

## 4. Browser-level tests

- User can calculate an upload estimate.
- User can switch between all three calculator modes.
- Unit selectors update the estimate correctly.
- Presets update only their intended inputs.
- Invalid fields show useful messages and retain entered values.
- Results are announced accessibly.
- Copy action produces the correct text and feedback.
- Theme preference persists as intended.
- Simulation starts, pauses, resumes, completes, and resets.
- Simulation never requests a file or triggers network transfer.
- Share URL parameters, if shipped, are validated before use.

## 5. Responsive checks

Test at representative viewport sizes, including:

- Small mobile: 320–360 CSS px wide.
- Standard mobile: 375–430 CSS px wide.
- Tablet: approximately 768 CSS px wide.
- Laptop: approximately 1366 CSS px wide.
- Large desktop: approximately 1440 CSS px and above.

Acceptance:
- No horizontal scrolling caused by the app.
- Controls remain visible and operable.
- Results do not clip or overlap.
- Text remains readable at 200% zoom.
- Focus indicators remain visible.

## 6. Accessibility checks

- Keyboard-only completion of every core calculator task.
- Logical focus order.
- Visible focus indicators.
- Accessible names for inputs and controls.
- Errors associated with their fields.
- Live announcements for calculated results and action feedback.
- Contrast review in both themes.
- Reduced-motion preference respected.
- Automated checks supplemented by manual keyboard and screen-reader review.

## 7. Privacy and security checks

- No file upload control or file read API is used.
- No unexpected external network requests from the application.
- No secrets committed to the repository.
- Query parameters are parsed defensively.
- No HTML injection from user-entered values.
- Dependency audit is reviewed before release.
- Theme persistence stores no sensitive calculator data.

## 8. Performance checks

Record initial build size and page-load baseline after the first implementation. Set a practical production bundle budget based on that baseline. Check:

- Initial JavaScript and CSS size.
- Initial render and input responsiveness.
- Long tasks during calculation or simulation.
- Unnecessary re-renders or DOM replacement.
- Images and icons are optimized.

A small calculator should not require a large runtime bundle. Any material budget increase must be explained in the pull request.

## 9. Release checklist

- [ ] All P0 unit tests pass.
- [ ] All three calculation modes pass browser tests.
- [ ] Unit semantics are visible and accurate.
- [ ] SI and IEC unit behavior is verified.
- [ ] Error and boundary handling is verified.
- [ ] Mobile, tablet, and desktop layouts are checked.
- [ ] Keyboard and accessibility review is complete.
- [ ] Simulation is clearly labelled and tested (if included).
- [ ] No console errors or failed requests remain.
- [ ] Privacy statement matches actual application behavior.
- [ ] README and project notebook are updated.
- [ ] Production build succeeds from a clean install.
- [ ] Deployed URL passes smoke tests.
- [ ] Changelog and release tag are prepared.


## 10. Current verification record

- Strict TypeScript application source check completed successfully using the compiler available in the build environment (TypeScript 5.8.3).
- Ten direct Node-based calculation smoke checks passed, covering SI/IEC conversion, bit/byte conversion, upload time, throughput reduction, maximum-size calculation, required-speed calculation, formatting, and invalid speed.
- The speed-test adapter has been type-checked against a temporary declaration stub matching Cloudflare's published public API; the actual pinned package has not yet been installed in this environment because DNS resolution for the npm registry is unavailable. GitHub Actions is configured to install dependencies and perform the authoritative typecheck, Vitest suite, Playwright suite, and build.
- A production build and deployed-site smoke test remain release gates.
