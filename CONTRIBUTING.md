# Contributing to TransferETA

Thank you for considering a contribution.

## Before opening an issue

- Search existing issues to avoid duplicates.
- For calculation defects, include reproducible input values and expected arithmetic.
- Do not include private files, credentials, or personal information.

## Pull requests

1. Create a focused branch from `main`.
2. Explain the user problem and intended behavior.
3. Include tests for calculation or state changes.
4. Update documentation when formulas, assumptions, or visible behavior change.
5. Run formatting, lint, typecheck, unit tests, end-to-end tests, and production build.
6. Keep screenshots or recordings focused on relevant UI changes.

## Calculation changes

Any modification to unit factors, throughput-loss semantics, formulas, or rounding behavior must update `docs/CALCULATION_METHOD.md` and include regression tests. Do not change the meaning of an input without changing its label and explanation.

## Design changes

Keep the interface responsive, keyboard-operable, and consistent with both themes. Avoid adding dependencies for small visual effects.