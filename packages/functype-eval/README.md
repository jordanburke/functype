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

- **Phase 1 (current):** the `score` CLI.
- **Phase 2:** `functype-eval bench` — run programming tasks through LLMs and score the output with
  this same engine.
- **Phase 3:** an MCP server exposing `score-codebase` / `suggest-functype-fix`.

## License

MIT © Jordan Burke
