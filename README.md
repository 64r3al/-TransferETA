# TransferETA

[![Quality checks](https://github.com/64r3al/-TransferETA/actions/workflows/ci.yml/badge.svg)](https://github.com/64r3al/-TransferETA/actions/workflows/ci.yml)

**A precise, lightweight upload-time calculator.**  
Know how long your upload will take.

TransferETA is a privacy-first browser tool for estimating file-transfer time, finding the upload speed needed to meet a deadline, or estimating the maximum amount of data transferable in a given time. It uses explicit units, transparent assumptions, and a single calculation core shared by all three modes.

> **Current status:** The complete first website implementation is in the repository. It is ready for local development and CI verification. A production deployment and `v1.0.0` release have not yet been published.

**Repository:** [github.com/64r3al/-TransferETA](https://github.com/64r3al/-TransferETA)

## Features

- **Three calculator modes:** upload time, required upload speed, and maximum transferable size.
- **SI and IEC file-size units:** B, KB, MB, GB, TB, KiB, MiB, GiB, and TiB.
- **Bits and bytes kept distinct:** bit/s, Kbit/s, Mbit/s, Gbit/s, B/s, KB/s, MB/s, and GB/s.
- **Transparent throughput reduction:** optional 0–99.9% estimate, defaulting to 0%.
- **Useful presets:** common upload speeds, file sizes, and target durations.
- **Readable results:** duration, normalized throughput, size, and assumptions.
- **Comparison view:** see how the same transfer changes across several upload rates.
- **Mathematical transfer preview:** progress, elapsed time, remaining time, pause/resume/reset, and accelerated preview rates. It never uploads a file.
- **Shareable estimates:** validated calculation settings can be encoded in a share URL.
- **Copy actions:** copy the result or a shareable link.
- **Responsive interface:** desktop, tablet, and mobile layouts.
- **Light and dark themes:** system preference support and locally saved explicit choice.
- **Accessible interaction:** semantic sections, labelled inputs, keyboard-operable mode tabs, error announcements, and reduced-motion support.
- **Privacy by design:** calculation happens locally; no accounts, backend, database, tracking, or file selection.

## Preview

The website is a single-page application. Its main areas are:

1. Calculator workspace with three modes.
2. Result dashboard and comparison cards.
3. Time-scaled transfer preview (simulation only).
4. Feature overview and formula explanation.
5. Reference examples and FAQ.

A production URL will be added after deployment and smoke testing.

## Technology

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Build tool | Vite |
| Interface | Semantic HTML + custom CSS |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Automation | GitHub Actions |
| Hosting target | Vercel static deployment |

The application does not need a backend. All calculator modes use pure functions in `src/core/` and run in the visitor's browser.

## Requirements

- Node.js 22.12 or later.
- npm 10 or later is recommended.

The Vite version used by this project requires a supported modern Node.js release. See the [Vite setup guide](https://vite.dev/guide/).

## Run locally

```bash
git clone https://github.com/64r3al/-TransferETA.git
cd -TransferETA
npm install
npm run dev
```

The first install creates the npm lockfile. Commit that generated `package-lock.json` after verifying the install so later local and CI installs can be pinned exactly.

Vite prints the local development URL in the terminal (normally `http://localhost:5173`).

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

Run the Playwright browser suite after installing its Chromium runtime:

```bash
npx playwright install chromium
npm run test:e2e
```

Other available scripts:

```bash
npm run test:watch
npm run preview
```

## Calculation model

All calculations use canonical internal units:

- File size: bytes.
- Transfer rate: bits per second.
- Time: seconds.

Let `S` be the file size in bytes, `R` the nominal upload rate in bits per second, and `L` the throughput reduction as a fraction from 0 to less than 1.

```text
Effective payload rate = R × (1 − L)
Upload time            = (S × 8) / effective payload rate
Required nominal rate  = (S × 8 / target time) / (1 − L)
Maximum bytes          = effective payload rate × available time / 8
```

The reduction control is a simplified planning allowance, not a packet-level network model. A speed-test result normally already represents measured throughput, so users should generally leave additional reduction at 0% when entering a measured speed.

### Unit conventions

- SI prefixes are decimal: 1 KB = 1,000 bytes; 1 MB = 1,000,000 bytes; 1 GB = 1,000,000,000 bytes.
- IEC prefixes are binary: 1 KiB = 1,024 bytes; 1 MiB = 1,048,576 bytes; 1 GiB = 1,073,741,824 bytes.
- One byte is eight bits. Therefore, 1 MB/s = 8 Mbit/s using decimal units.

See [Calculation Method](docs/CALCULATION_METHOD.md) for the full specification and test vectors.

## Privacy

TransferETA does not ask for a file and does not read file contents. Values entered into the calculator are processed locally in the browser. The theme preference may be stored in local storage; calculator inputs and estimates are not persisted automatically. Share URLs contain only the calculation mode, entered numeric values, units, and throughput-reduction setting.

## Project documentation

- [Product and engineering plan](docs/PROJECT_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Calculation method](docs/CALCULATION_METHOD.md)
- [QA and test plan](docs/QA_TEST_PLAN.md)
- [Development roadmap](docs/ROADMAP.md)
- [Project notebook](docs/PROJECT_NOTEBOOK.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), use the templates, and include a regression test for calculation changes. Any change to units, formulas, rounding, or assumptions must also update the calculation documentation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
