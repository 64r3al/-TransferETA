# Changelog

All notable changes to TransferETA are documented here. The project follows Semantic Versioning.

## [Unreleased] — Initial website implementation

### Added
- Opt-in Cloudflare-powered browser speed test for upload/download throughput, idle ping, jitter, and loaded latency.
- One-click handoff of the measured upload speed into the upload-time calculator, with extra throughput reduction reset to 0%.
- Visible provider/privacy disclosure, bounded test payload, cancellation/retry controls, and mocked speed-test browser coverage.
- Responsive TransferETA single-page website and original visual identity.
- Upload-time, required-speed, and maximum-transfer-size calculator modes.
- Decimal SI and binary IEC file-size conversion.
- Explicit bit/byte-aware upload-rate conversion.
- Throughput-reduction model with a measured-speed explanation.
- Result dashboard, common presets, speed comparison, copy and share actions.
- Time-scaled simulation preview with playback controls.
- Light/dark theme, FAQ, formula guide, reference examples, and SEO metadata.
- Core calculation tests, Playwright browser tests, and GitHub Actions quality workflow.

### Engineering
- Extracted pure calculation, conversion, and formatting modules.
- Added Vercel static build configuration.
- Updated README, architecture, QA, roadmap, and project notebook for implementation status.

### Not yet released
- Production deployment and `v1.0.0` release are pending full CI and deployed-site verification.
