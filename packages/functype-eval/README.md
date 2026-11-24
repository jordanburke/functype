# functype-eval

Fitness scoring for functional TypeScript codebases using the [functype](https://github.com/jordanburke/functype) ecosystem.

`functype-eval` measures how well a TypeScript codebase adheres to functype / functional-programming
idioms and produces a **0–100 fitness score** with a per-dimension breakdown. It runs
[`eslint-plugin-functype`](https://www.npmjs.com/package/eslint-plugin-functype) programmatically (no
shelling out), plus type-coverage and a non-null-assertion scan, and aggregates the results.

## Install

```bash
pnpm add -D functype-eval
# or run directly
npx functype-eval score ./src
```

## Usage

```bash
functype-eval score <target>            # score a directory, print breakdown + 0–100
functype-eval score ./src --json        # machine-readable output (for CI)
functype-eval score ./src --threshold 80   # exit 1 if score < 80 (CI gate)
functype-eval score ./src --project tsconfig.json   # explicit tsconfig for type-coverage
```

**Exit codes:** `0` scored ok (and at/above `--threshold` if given), `1` score below
`--threshold`, `2` no TypeScript sources found under the target (nothing to score — guards against a
misleading `100/100` on an empty or non-TS directory).

### Example

```
functype-eval score ./src

  Dimension       Weight   Score
  ─────────────────────────────────
  immutability     0.15     0.94
  option           0.15     0.88
  either           0.15     0.91
  composition      0.10     0.97
  collections      0.10     1.00
  do-notation      0.05     1.00
  safety           0.10     1.00
  loops            0.05     0.96
  type-coverage    0.10     0.99
  non-null         0.05     1.00
  ─────────────────────────────────
  Fitness score:  94 / 100
```

## Baseline and check: a per-file ratchet

`score --threshold` gates on one number for the whole codebase, so a new finding can hide behind a
cleanup somewhere else. For a codebase adopting functype gradually, `baseline` and `check` gate each
file instead:

```bash
functype-eval baseline ./src            # write .functype-baseline.json (commit it)
functype-eval check ./src               # exit 1 if any file got worse
functype-eval check ./src --update      # accept the counts once they went down or stayed level
```

- `baseline` records, for every file with findings, how many each tracked rule reports. Paths are
  relative to the current directory and use `/`, and keys are sorted, so the file is the same on
  every machine. Run it from the repo root and commit the file.
- `check` fails when a file's count for a tracked rule rose, or when a file missing from the baseline
  has findings. It prints each one as `path  rule  old → new`. When nothing rose it exits 0 and says
  how many findings went down.
- `check --update` rewrites the baseline with the lower counts. It refuses while anything regressed,
  so a regression can't be accepted by accident. To accept new findings on purpose, re-run
  `baseline`.
- Both lint the same files as `score`: `.ts`/`.tsx` under the directory, without tests, `.d.ts`,
  `node_modules`, `dist`, `lib` or `coverage`. Each file is counted once.

**Exit codes:** `0` baseline written, or nothing regressed; `1` a count rose, or `--update` was
refused; `2` nothing to compare: a bad `trackedRules` config, no TypeScript sources, no or
unreadable baseline, a baseline written for a different directory, or a file ESLint couldn't parse.

### Tracked rules

By default `check` tracks the rules where a new finding is a real defect: `no-imperative-loops`,
`prefer-functype-map`, `prefer-functype-set`, `prefer-map`, `prefer-fold`, `no-let`,
`prefer-flatmap` and `prefer-do-notation`. `prefer-option`, `prefer-either` and `prefer-try` are left
out because they still fire on correct boundary code, such as a nullable database column.

Override the list in `functype-eval.config.json`, in the directory you run from. Names work with or
without the `functype/` prefix:

```json
{ "trackedRules": ["no-let", "functype/no-imperative-loops", "prefer-option"] }
```

Rules that need type information (`no-uncalled-method`, `no-floating-io` and the like) are refused,
because `check` lints without a tsconfig and they would always count 0. When the list changes, a rule
you stopped tracking is ignored and dropped on the next `--update`. A rule you started tracking is
compared against 0, so `check` fails until you re-run `baseline` to record it.

## How the score works

The composite is a weighted sum of ten dimensions (see [CLAUDE.md](./CLAUDE.md) for the full table
and weights). The eight ESLint dimensions and the non-null dimension are normalized by **violation
density** per 1000 lines of code:

```
score = 1 / (1 + (violations / KLOC) * k)
```

`type-coverage` contributes its native percentage. If the target has no resolvable `tsconfig.json`,
the type-coverage dimension is skipped and the remaining weights are renormalized — you still get a
score. Weights and per-dimension sensitivity are overridable via an optional
`functype-eval.config.json`.

The score is **deterministic**: same input → same output. No network, no LLM calls.

## Roadmap

- **Phase 1 (current):** the `score` CLI, and `baseline`/`check` for a per-file ratchet.
- **Phase 2:** `functype-eval bench` — run programming tasks through LLMs and score the output with
  this same engine.
- **Phase 3:** an MCP server exposing `score-codebase` / `suggest-functype-fix`.

## License

MIT © Jordan Burke
