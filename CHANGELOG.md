# Changelog

All notable changes to TransferETA are documented here. The project follows Semantic Versioning.

## [Unreleased] — Initial website implementation

### Added
- Upgraded the opt-in Cloudflare speed test with up to 10 throughput samples per direction, 25 idle-latency probes, median bandwidth, p10–p90 spread, sample chart, and loaded jitter.
- One-click handoff of the measured upload speed into the upload-time calculator, with extra throughput reduction reset to 0%.
- Visible provider/privacy disclosure, 80.1 MB configured payload ceiling, 65-second run cap, cancellation/retry controls, and mocked speed-test browser coverage.
- Added progressive section reveals, subtle hero illustration motion, animated throughput traces, and responsive measurement-quality diagnostics.
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
