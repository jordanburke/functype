# CLAUDE.md

This file provides guidance to Claude Code when working in this monorepo. Per-package guidance lives inside each package (e.g., [`packages/functype/CLAUDE.md`](./packages/functype/CLAUDE.md)).

## What lives here

| Workspace member | Path | Published as | Notes |
|---|---|---|---|
| `functype` | `packages/functype` | `functype` | Core FP library — zero runtime deps |
| `functype-os` | `packages/functype-os` | `functype-os` | OS utilities |
| `functype-log` | `packages/functype-log` | `functype-log` | IO-native logging via LogLayer |
| `functype-react` | `packages/functype-react` | `functype-react` | React bindings (v0.1 scaffold) |
| `functype-eval` | `packages/functype-eval` | `functype-eval` | FP fitness scoring CLI (consumes `eslint-plugin-functype`) |
| `functype-mcp-server` | `packages/mcp-server` | `functype-mcp-server` | Documentation/validation MCP server |
| `site` | `site` | (not published) | Astro docs site |

## Tooling

- **Package manager:** pnpm 10.x with workspaces (`packages/*` + `site`).
- **Task runner:** Turborepo (`turbo.json`) — pipelines: `build`, `test`, `lint`, `lint:check`, `format`, `format:check`, `typecheck`, `compile`, `validate`, `dev`. `build`/`test`/`validate` declare `^build` deps so workspace consumers wait for producers.
- **Build:** Each package builds via `ts-builds` (calls `tsdown` under the hood) — uniform across the workspace.
- **Versioning + publish:** **tag-driven release flow** (`scripts/release.ts` + `.github/workflows/publish.yml` on tag push). The 6 functype-* packages bump together on the `1.x` line. The eslint pair bumps together on the `2.100.x` line, **mirroring functype** per the encoding `eslint = 2.{functype.major*100 + functype.minor}.{functype.patch}` — so `functype@1.1.0` ↔ `eslint@2.101.0`, `functype@1.20.1` ↔ `eslint@2.120.1`. Run `pnpm release patch|minor|major` locally; it bumps all 8 packages, syncs the mirror, syncs `mcp-server/server.json`, cuts the `## Unreleased` section of `packages/functype/CHANGELOG.md`, commits, and tags. `git push --follow-tags` triggers CI publish. See [`docs/RELEASE.md`](./docs/RELEASE.md) for the full runbook including npm trusted-publisher setup.
  - **Major bumps require explicit publish-time authorization** via the `ALLOW_MAJOR=<pkg>[,<pkg>]` env on `pnpm release major` AND on the publish workflow step. Added after the 2026-05-30 `0.60.7 → 1.0.0` cascade — see history for the post-mortem.
  - **Peer dep convention:** packages in this workspace that peer-depend on `functype` use broad ranges like `">=0.60.0"` (NOT `"workspace:^"`). The narrow `workspace:^` range is what caused the cascade — it published as `^0.60.7` which goes out of scope on a 0.61 bump, and Changesets's auto-cascade force-major-bumped the dependents. The tag-driven flow no longer has Changesets's auto-cascade, but the broad range stays as defensive practice (peer ranges should accept the actual consumer surface).
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
pnpm release patch|minor|major     # bump all 8 packages, cut CHANGELOG, commit + tag
git push --follow-tags             # push the tag to trigger the CI publish
```

## Working across packages

- Workspace deps use `workspace:^`. When you change `packages/functype` and a dependent like `packages/functype-react` would consume that change, you don't need to publish — pnpm symlinks the in-tree version.
- Adding a new sibling: create `packages/<name>/`, mirror the conventions in `packages/functype-os/` or `packages/functype-react/`, and add to `pnpm-workspace.yaml` (covered by `packages/*` glob automatically).
- Cross-package PRs are encouraged: the release script bumps every affected package in one shot, so a change spanning packages ships as a single version.

## Workflows

- **`.github/workflows/ci.yml`** — runs on PR + push to main. `pnpm turbo run validate`. Includes a path-filtered bundle-size job for `packages/functype/**`.
- **`.github/workflows/publish.yml`** — runs on push of a `v*` tag (not on push to main). Re-runs `turbo run validate`, then `check-publish-safety` as the final gate, then `pnpm -r publish`, which publishes any package whose local version differs from npm `latest`. Publishes with provenance; auth is npm OIDC trusted publishing where configured, with `NPM_TOKEN` as the fallback. See the header comment in `publish.yml` for the current per-package split — that file is the source of truth, not this line.
- **`.github/workflows/deploy-docs.yml`** — builds the Astro site + TypeDoc on push to main, publishes to GitHub Pages.
- **`.github/workflows/auto-merge-dependabot.yml`** — auto-merges patch/minor Dependabot PRs.

## Conventions

- **TypeScript strict everywhere.** `tsconfig.base.json` sets `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`, `noImplicitReturns: true`. Per-package configs only add paths/outDir/include/lib.
- **No `any`.** Use `unknown` and narrow.
- **functype patterns when modeling state.** Option for nullables, Either/Try for errors, IO/Task for effects, Validated for accumulating errors. (`packages/functype/CLAUDE.md` covers the full library.)
- **Functional style.** Immutable data; constructor functions over classes; method chaining or pipe.
- **Tests are tightly colocated** — `test/` mirrors `src/` per package. Use `vitest`.
- **CHANGELOG: add to `## Unreleased`.** User-facing changes go under the `## Unreleased` heading in `packages/functype/CHANGELOG.md` — the family changelog for all 8 packages. `pnpm release` cuts that section into `## {version} - {date}`. It touches **only** that file — the other per-package CHANGELOGs are not maintained by the release flow (most sit frozen at the changesets-era `1.0.1` / `2.100.1`), so don't add entries there and don't hand-edit already-released sections.
