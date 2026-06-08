# Changelog

`functype-eval` is part of the 5-package functype family and bumps in lockstep with `functype`. The
canonical changelog for the family is [`packages/functype/CHANGELOG.md`](../functype/CHANGELOG.md).
Entries follow [Keep a Changelog](https://keepachangelog.com/) conventions; `pnpm release` cuts the
`## Unreleased` section into a dated version header.

## Unreleased

### Added

- Initial release: `functype-eval score <target>` — a 0–100 FP fitness score with a per-dimension
  breakdown, running `eslint-plugin-functype` via the ESLint Node API, `type-coverage-core`, and a
  ts-morph non-null-assertion scan. Supports `--json` and `--threshold N` for CI gating. `bench`
  (Phase 2 LLM eval) ships as a stub.
