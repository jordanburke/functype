# CLAUDE.md — functype-eval

Guidance for Claude Code when working in this package. Repo-wide conventions live in the root
[`CLAUDE.md`](../../CLAUDE.md); the library reference lives in
[`packages/functype/CLAUDE.md`](../functype/CLAUDE.md).

## What this package does

`functype-eval` measures how well a TypeScript codebase adheres to functype/FP idioms and produces a
**0–100 fitness score** with a per-dimension breakdown. One scorer, two intended use cases:

1. **Codebase fitness** — `functype-eval score ./src` → how functional is this code.
2. **LLM eval** (future) — `functype-eval bench` → can models write functype-compliant code, scored
   by the same engine.

## Phases

- **Phase 1 (current): the `score` CLI.** Fully implemented.
- **Phase 2 (future): `bench`** — run programming tasks through LLMs (Anthropic API) under varying
  context conditions, score each solution with the Phase 1 scorer. Currently a stub.
- **Phase 3 (future): MCP server** — expose `score-codebase` / `suggest-functype-fix` as MCP tools.

## Scoring model

The composite is a weighted sum of dimension scores (each 0.0–1.0), ×100.

| Dimension     | Weight | Source                 | Rules                                                       |
| ------------- | ------ | ---------------------- | ----------------------------------------------------------- |
| immutability  | 0.15   | eslint-plugin-functype | `no-let`                                                    |
| option        | 0.15   | eslint-plugin-functype | `prefer-option`                                             |
| either        | 0.15   | eslint-plugin-functype | `prefer-either`                                             |
| composition   | 0.10   | eslint-plugin-functype | `prefer-flatmap`, `prefer-fold`, `prefer-map`               |
| collections   | 0.10   | eslint-plugin-functype | `prefer-list`, `prefer-functype-map`, `prefer-functype-set` |
| do-notation   | 0.05   | eslint-plugin-functype | `prefer-do-notation`                                        |
| safety        | 0.10   | eslint-plugin-functype | `no-get-unsafe`                                             |
| loops         | 0.05   | eslint-plugin-functype | `no-imperative-loops`                                       |
| type-coverage | 0.10   | type-coverage-core     | (native percent)                                            |
| non-null      | 0.05   | ts-morph               | `!` non-null assertion density                              |

All 12 plugin rules are scored. Weights sum to 1.0 and are overridable via an optional
`functype-eval.config.json`.

### Normalization (density, not adherence ratio)

ESLint reports violation **counts**, not how many places _could_ have used the pattern. So lint
dimensions (and the non-null dimension) normalize by **density vs KLOC**:

```
score_d = 1 / (1 + (violations_d / KLOC) * k_d)
```

`k_d` is a per-dimension sensitivity constant (defaults in `src/types/index.ts`). `type-coverage` is
already a native ratio (`percent / 100`) and skips density normalization.

> **Future, fix-at-the-source path:** a _true_ adherence ratio (`1 - violations/opportunities`) would
> need an opportunity denominator. That belongs in `eslint-plugin-functype` (have rules emit
> opportunity counts), consumed here — **not** a second ts-morph pass that re-detects the same
> patterns. See anti-patterns.

### type-coverage tsconfig resolution

Only this dimension needs the target's TS program. Resolution: `--project <path>` → else autodetect
`tsconfig.json` in the target → else **skip the dimension and renormalize the other 9 weights** to
sum to 1.0 (breakdown shows `type-coverage: skipped`).

## Architecture

```
src/
  types/index.ts          # DimensionId, DimensionConfig, ScoreResult, DEFAULT_DIMENSIONS
  scorers/
    eslint.ts             # eslint-plugin-functype via ESLint Node API (plugin registered)
    type-coverage.ts      # type-coverage-core (native percent)
    ts-morph.ts           # non-null assertion scan
    aggregate.ts          # density formula + weighted composite + renormalization
  cli/
    index.ts              # bin entry (shebang): score | bench | --help
    score.ts              # `functype-eval score <target>` — table / --json / --threshold
    bench.ts              # Phase 2 stub
  index.ts                # public API: score(), ScoreResult
test/scorers/             # mirrors src/scorers
```

## Anti-patterns

- **Don't shell out to ESLint.** Use the Node API (`new ESLint(...)`).
- **Don't reimplement lint rules.** If a new pattern needs detection, add it to
  `eslint-plugin-functype` first, then consume it here. This is why scoring is density-based rather
  than opportunity-based today.
- **Don't couple scoring to an LLM.** The scorer is pure static analysis; Phase 2 `bench` calls LLMs
  but scoring stays deterministic.
- **No `any`.** Use `unknown` and narrow. functype patterns for state (Option/Either/List).
- **Don't hand-edit CHANGELOG.** The tag-driven release flow (`pnpm release`) manages versions.

## Conventions

- TypeScript strict; build/lint/format/test via `ts-builds`. Vitest, tests colocated in `test/`.
- ESM-only (`"type": "module"`).
- **Runtime deps** (`eslint-plugin-functype`, `@typescript-eslint/parser`, `ts-morph`,
  `type-coverage-core`) — this package evaluates code that _uses_ functype, so functype itself is a
  **devDep only**, not a peer.
- **Versioning:** part of the 5-package functype family on the `1.x` line. It must be listed in
  `FAMILY_PACKAGE_DIRS` in [`scripts/release.ts`](../../scripts/release.ts). Release with
  `pnpm release patch|minor|major` from the repo root (tag-driven).
