# Changelog

`functype-eval` is part of the 6-package functype family and bumps in lockstep with `functype`.

**Write new entries in [`packages/functype/CHANGELOG.md`](../functype/CHANGELOG.md), not here.** That
is the canonical changelog for the family, and the only one `pnpm release` cuts — `scripts/release.ts`
rewrites that file alone, so an `## Unreleased` section in *this* file would never be dated or
released. This file is kept as a historical record of the package's own initial release.

## 1.6.0 - 2026-07-01

### Added

- Initial release: `functype-eval score <target>` — a 0–100 FP fitness score with a per-dimension
  breakdown, running `eslint-plugin-functype` via the ESLint Node API, `type-coverage-core`, and a
  ts-morph non-null-assertion scan. Supports `--json` and `--threshold N` for CI gating. `bench`
  (Phase 2 LLM eval) ships as a stub.
