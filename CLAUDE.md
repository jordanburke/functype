# CLAUDE.md

This file provides guidance to Claude Code when working in this monorepo. Per-package guidance lives inside each package (e.g., [`packages/functype/CLAUDE.md`](./packages/functype/CLAUDE.md)).

## What lives here

| Workspace member | Path | Published as | Notes |
|---|---|---|---|
| `functype` | `packages/functype` | `functype` | Core FP library — zero runtime deps |
| `functype-os` | `packages/functype-os` | `functype-os` | OS utilities |
| `functype-log` | `packages/functype-log` | `functype-log` | IO-native logging via LogLayer |
| `functype-react` | `packages/functype-react` | `functype-react` | React bindings (v0.1 scaffold) |
| `functype-mcp-server` | `packages/mcp-server` | `functype-mcp-server` | Documentation/validation MCP server |
| `site` | `site` | (not published) | Astro docs site |

## Tooling

- **Package manager:** pnpm 10.x with workspaces (`packages/*` + `site`).
- **Task runner:** Turborepo (`turbo.json`) — pipelines: `build`, `test`, `lint`, `lint:check`, `format`, `format:check`, `typecheck`, `compile`, `validate`, `dev`. `build`/`test`/`validate` declare `^build` deps so workspace consumers wait for producers.
- **Build:** Each package builds via `ts-builds` (calls `tsdown` under the hood) — uniform across the workspace.
- **Versioning + publish:** [Changesets](https://github.com/changesets/changesets) — independent versions per package, peer-dep range bumps automated via `updateInternalDependencies: "patch"`. See [`docs/RELEASE.md`](./docs/RELEASE.md) for the full release runbook including the one-time npm trusted-publisher reconfig.
- **Node version:** Read from `.nvmrc` (currently `24`). Required by `publish.yml` to avoid the npm 10.x OIDC bug.
- **Shared TS config:** `tsconfig.base.json` at the repo root; each package's `tsconfig.json` extends it.

## Quick commands

From the repo root:

```bash
pnpm install                       # install everything
pnpm turbo run validate            # format + lint + typecheck + test + build across all packages
pnpm turbo run build               # parallel build of every package (respects deps)
pnpm -F functype test              # run one package's test suite
pnpm -F functype-react dev         # dev mode for one package
pnpm changeset                     # author a new changeset for the next release
pnpm changeset status              # see what's queued
```

## Working across packages

- Workspace deps use `workspace:^`. When you change `packages/functype` and a dependent like `packages/functype-react` would consume that change, you don't need to publish — pnpm symlinks the in-tree version.
- Adding a new sibling: create `packages/<name>/`, mirror the conventions in `packages/functype-os/` or `packages/functype-react/`, and add to `pnpm-workspace.yaml` (covered by `packages/*` glob automatically).
- Cross-package PRs are encouraged: changesets handle the version bump for every affected package in one shot.

## Workflows

- **`.github/workflows/ci.yml`** — runs on PR + push to main. `pnpm turbo run validate`. Includes a path-filtered bundle-size job for `packages/functype/**`.
- **`.github/workflows/publish.yml`** — runs on push to main. Uses `changesets/action@v1` to either open a "Version Packages" PR (when changesets are queued) or run `pnpm -r publish` when that PR merges. Provenance + OIDC for `functype`, `functype-os`, `functype-log`, `functype-react`; token auth for `functype-mcp-server`.
- **`.github/workflows/deploy-docs.yml`** — builds the Astro site + TypeDoc on push to main, publishes to GitHub Pages.
- **`.github/workflows/auto-merge-dependabot.yml`** — auto-merges patch/minor Dependabot PRs.

## Conventions

- **TypeScript strict everywhere.** `tsconfig.base.json` sets `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`, `noImplicitReturns: true`. Per-package configs only add paths/outDir/include/lib.
- **No `any`.** Use `unknown` and narrow.
- **functype patterns when modeling state.** Option for nullables, Either/Try for errors, IO/Task for effects, Validated for accumulating errors. (`packages/functype/CLAUDE.md` covers the full library.)
- **Functional style.** Immutable data; constructor functions over classes; method chaining or pipe.
- **Tests are tightly colocated** — `test/` mirrors `src/` per package. Use `vitest`.
- **CHANGELOG via changesets only.** Don't hand-edit CHANGELOG files.
