# TransferETA

**A precise, lightweight upload-time estimator.**

> Know how long your upload will take.

TransferETA is a planned, client-side web application for estimating file-transfer duration from file size, upload throughput, and an explicitly defined throughput-loss allowance. The project is designed around mathematical correctness, a calm and accessible interface, privacy by default, and a maintainable open-source codebase.

> **Project status:** Planning / pre-implementation. This repository currently contains the product and engineering blueprint; the calculator application itself has not been implemented yet.

Repository: [github.com/64r3al/-TransferETA](https://github.com/64r3al/-TransferETA)

## Product goals

- Calculate upload duration with consistent SI and IEC unit handling.
- Clearly distinguish bits from bytes (`Mb/s` versus `MB/s`).
- Explain every assumption that affects the estimate.
- Offer reverse calculations for required throughput and transferable file size.
- Provide an optional, clearly labelled mathematical transfer simulation.
- Work on mobile and desktop, with keyboard and screen-reader support.
- Perform calculations locally in the browser without uploading or reading users' files.

## Planned feature set

1. **Upload-time mode** — file size + upload speed + optional throughput-loss allowance.
2. **Required-speed mode** — file size + target duration + optional throughput-loss allowance.
3. **Maximum-size mode** — upload speed + available duration + optional throughput-loss allowance.
4. **Results panel** — human-readable duration, normalized speed, assumptions, and copy/share actions.
5. **Simulation preview** — progress, elapsed time, remaining time, pause/resume/reset, and optional accelerated playback.
6. **Unit support** — SI decimal units and IEC binary units, with explicit bit/byte labels.
7. **Presets and education** — common speed/file-size presets, formula explanation, examples, and FAQs.
8. **Light/dark themes** — respect system preference and remember a visitor's explicit choice locally.

## Proposed technology

- TypeScript for application and calculation logic.
- Vite for development and production builds.
- Semantic HTML and custom CSS for a lean interface.
- Vitest for deterministic unit tests.
- Playwright for browser-level and responsive interaction tests.
- GitHub Actions for continuous integration.
- Vercel or another static host for deployment.

No backend, database, authentication, or file upload is required for the planned first release.

## Documentation

- [Product and engineering plan](docs/PROJECT_PLAN.md)
- [Architecture and repository structure](docs/ARCHITECTURE.md)
- [Calculation and unit conventions](docs/CALCULATION_METHOD.md)
- [Quality and test plan](docs/QA_TEST_PLAN.md)
- [Development roadmap](docs/ROADMAP.md)
- [Project notebook and decision log](docs/PROJECT_NOTEBOOK.md)

## Planned local development commands

These commands are the intended interface once the application scaffold is implemented. They are not executable in this planning-only bundle yet.

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run preview
```

## Engineering principles

- Correct calculations before visual polish.
- One canonical conversion model shared by all calculator modes.
- No silent coercion of invalid input.
- Keep full precision internally; round only for display.
- No misleading claims that the simulation performs a real upload.
- No external analytics or network calls by default.
- Every feature must have acceptance criteria and tests.

## License

MIT is the proposed license for the implementation. The final repository should include the standard MIT license text and the copyright holder/year after ownership details are confirmed.
