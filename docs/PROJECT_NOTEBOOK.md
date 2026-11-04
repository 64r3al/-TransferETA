# TransferETA — Project Notebook

This notebook is the living engineering record for the project. It should be updated when decisions change, implementation phases complete, or a significant defect is discovered and resolved.

## Project record

| Field | Value |
|---|---|
| Product | TransferETA |
| Repository slug | `-TransferETA` |
| Intended owner | `64r3al` |
| Initial plan version | 1.0 |
| Current status | Planning / pre-implementation |
| Baseline date | 2026-11-04 |
| Planned first release | `v1.0.0` |

## 1. Objectives

- Deliver a dependable upload-time calculator.
- Support SI and IEC units without conflating them.
- Make bit/byte distinctions explicit.
- Support upload-time, required-speed, and maximum-size modes.
- Keep all calculations local to the browser.
- Build an original, polished, responsive, accessible interface.
- Maintain high confidence through deterministic tests and documented assumptions.

## 2. Baseline decisions

### Decision 001 — Client-side architecture

**Decision:** Use a static TypeScript application with Vite; do not add a backend for v1.0.

**Reason:** The product performs deterministic arithmetic and does not need accounts, storage, file access, or server computation. A backend would add cost and complexity without improving the core job.

### Decision 002 — Canonical units

**Decision:** Use bytes, bits per second, and seconds as the internal canonical units.

**Reason:** This provides a single conversion boundary and keeps all three calculator modes mathematically consistent.

### Decision 003 — Explicit throughput-loss model

**Decision:** Model the optional percentage as a fraction of nominal throughput unavailable for payload: `effective = nominal × (1 − loss)`.

**Reason:** This is easy to explain and invert for required-speed calculations. The UI must disclose that it is a simplifying estimate and that measured speed-test throughput normally should be entered with 0% additional reduction.

### Decision 004 — Simulation is not a transfer

**Decision:** Any progress animation is a mathematical preview and must never access files or make network transfer requests.

**Reason:** The calculator does not upload user data. Clear wording avoids misleading visitors.

### Decision 005 — Original implementation and identity

**Decision:** Use the supplied reference site only as functional inspiration. Create original copy, styling, information architecture, and code.

**Reason:** The project should have its own identity and maintainable implementation.

## 3. Phase log

### 2026-11-04 — Planning baseline

- Selected TransferETA as the working product name.
- Confirmed repository: [`64r3al/-TransferETA`](https://github.com/64r3al/-TransferETA).
- Defined three calculator modes.
- Specified SI and IEC units and bit/byte conventions.
- Established the canonical formulas and sample values.
- Defined the client-side architecture and initial quality gates.
- No application implementation or production deployment has been completed at this stage.

## 4. Defect and issue log

| ID | Date | Description | Severity | Status | Resolution / notes |
|---|---|---|---|---|---|
| — | — | No implementation defects recorded yet. | — | — | Implementation has not started. |

## 5. Change log for decisions

Do not silently rewrite a decision that affects the calculation model, unit semantics, privacy, or architecture. Add a dated entry explaining the previous decision, the replacement, and the migration or test impact.

## 6. Implementation notes template

For each completed phase, record:

- Date and branch/commit.
- Scope delivered.
- Files or modules added/changed.
- Tests added and results.
- Known limitations.
- Review findings.
- Follow-up work.

## 7. Release notes template

For every release, document:

- Version and date.
- Added features.
- Changed behavior.
- Fixed defects.
- Known limitations.
- Test/build status.
- Deployment URL.