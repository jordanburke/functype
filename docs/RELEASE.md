# Releasing from the monorepo

This monorepo uses [Changesets](https://github.com/changesets/changesets) to coordinate independent versioning across `functype`, `functype-os`, `functype-log`, `functype-react`, and `functype-mcp-server`. CI handles version bumps and publishing.

## Adding a changeset

When you make a user-visible change in any package:

```bash
pnpm changeset
```

Pick the affected packages, choose major/minor/patch, write a 1–2 sentence note. The CLI drops a markdown file in `.changeset/` — commit it with your PR. Changesets that touch internal-only changes (CI tweaks, doc fixes) don't need one.

## Release flow

1. PR merges to `main` carrying one or more `.changeset/*.md` files.
2. `publish.yml` runs and finds queued changesets.
3. The workflow opens (or updates) a "Version Packages" PR by running
   `pnpm run version-packages`, which:
   - Bumps each affected package's `version` in `package.json` (`changeset version`)
   - Bumps consumer packages' workspace peer-dep ranges (because `updateInternalDependencies: "patch"`)
   - **Syncs `packages/mcp-server/server.json`** so the MCP registry manifest
     tracks the new `functype-mcp-server` version (`pnpm -F functype-mcp-server sync:registry`).
     Without this step the MCP registry would point at the previous npm tarball.
   - Appends entries to each package's `CHANGELOG.md`
   - Deletes the consumed changesets from `.changeset/`
4. When that PR merges, `publish.yml` runs again, sees no pending changesets, and instead runs `pnpm -r publish --no-git-checks`. Only packages whose `version` differs from npm get published. GitHub releases are created automatically via `createGithubReleases: true`.
5. `functype-mcp-server`'s `prepublishOnly` runs `sync:registry:check` as a
   belt-and-braces guard. If anyone bypasses the version-packages step and
   triggers publish with drifted server.json, the publish hard-fails before
   anything reaches npm.

## npm trusted-publisher reconfig — REQUIRED before first release from the monorepo

`functype-os` and `functype-log` previously published via OIDC trusted publishing from their old GitHub repositories (`jordanburke/functype-os` and `jordanburke/functype-log`). npm's trusted-publisher config is repo-scoped, so it must be updated before the first publish from the monorepo or the publish will be rejected.

For each of the four provenance-enabled packages, log into [npmjs.com](https://www.npmjs.com), navigate to the package, then **Settings → "Publishing access" → "Trusted Publisher"**, and apply:

| Package | GitHub repository | Workflow filename | Notes |
|---|---|---|---|
| `functype` | `jordanburke/functype` | `publish.yml` | Repo unchanged from pre-migration. |
| `functype-os` | `jordanburke/functype` | `publish.yml` | Was scoped to `jordanburke/functype-os` + `publish.yml`; repo updated to monorepo, filename unchanged. |
| `functype-log` | `jordanburke/functype` | `publish.yml` | Was scoped to `jordanburke/functype-log` + `publish.yml`; repo updated to monorepo, filename unchanged. |
| `functype-react` | `jordanburke/functype` | `publish.yml` | **Required before first publish.** v0.1 ships Tier 1–4 hooks/components; package was `private: true` through scaffolding and is now unblocked. Configure the trusted publisher on npmjs.com BEFORE merging the v0.1 PR or the first publish will be rejected by npm. |
| `eslint-config-functype` | `jordanburke/functype` | `publish.yml` | Was scoped to `jordanburke/eslint-functype` + `publish.yml`; repo updated to monorepo, filename unchanged. **Required before first publish from the monorepo at `2.60.6`** (the cadence-mirror version — see *Mirror invariant* below). |
| `eslint-plugin-functype` | `jordanburke/functype` | `publish.yml` | Same as above. |

Environment: leave blank unless previously set. Already-published versions retain their existing provenance attestations (per-version, immutable) — only new publishes are affected.

`functype-mcp-server` does **not** use trusted publishing today; it publishes via `NPM_TOKEN`. `publish.yml` preserves that pattern through the `NODE_AUTH_TOKEN` env var on the changesets step. No npm admin action needed for it.

## Mirror invariant for eslint packages

The two eslint packages mirror functype's minor and patch positions: `eslint-{config,plugin}-functype` versions are always `2.<functype-minor>.<functype-patch>`. Major stays at `2` until functype reaches `1.0`, at which point both eslint packages catch up to `3.0.0` and the family converges on a single version line.

Enforcement: `scripts/check-eslint-mirror.ts` runs:
- After every `changeset version` (chained into the `version-packages` script) — fails a release before publish if the mirror is broken.
- On every PR via CI (`ci.yml` → `pnpm check-eslint-mirror`) — surfaces drift at PR-author time, not release-author time.

**Rule for authoring changesets:** every release that touches functype must include all 7 publishable packages at the same bump level. Per-package or mismatched-level changesets break the mirror and the script will reject the release.

## Node version requirement

`publish.yml` reads from the repo-root `.nvmrc`, currently pinned to Node **24**. This sidesteps the npm 10.x OIDC handshake bug ([npm/cli#8976](https://github.com/npm/cli/issues/8976)) that surfaces on Node 22 as `E404 PUT https://registry.npmjs.org/<pkg>` immediately after a successful sigstore signing — npm 11.5.1+ (bundled with Node 24 LTS) is required.

## Snapshot releases (testing pre-publish)

To dry-run the version bump without publishing:

```bash
pnpm changeset           # add a changeset describing the change
pnpm changeset version --snapshot rehearsal
git diff packages/*/package.json   # confirm only intended version bumps
git restore .            # undo
```

To publish a snapshot to npm under a non-default dist-tag (e.g. for downstream testing):

```bash
pnpm changeset version --snapshot rc
pnpm -r publish --tag rc --no-git-checks
```

## Rolling back

Every Phase 0 commit in the monorepo migration tagged the pre-migration tip of `functype`, `functype-os`, and `functype-log` as `pre-monorepo-migration` on their respective repos. If a rollback is needed:

```bash
git checkout pre-monorepo-migration   # in the old satellite repo
```

restores the satellite to its pre-migration state.
