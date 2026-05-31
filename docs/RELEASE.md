# Releasing from the monorepo

The functype family (5 packages) ships together on the `1.x` line; the eslint pair (2 packages) ships together on the `2.100.x` line, version-mirrored from functype. All 7 publishable packages release in lockstep from a single git tag.

## TL;DR

```bash
# 1. Land your feature PR(s) on main. Write release notes under `## Unreleased`
#    in packages/functype/CHANGELOG.md as part of each PR.

# 2. From a clean main branch:
pnpm release patch        # or: minor, major
git push --follow-tags    # → triggers CI publish
```

That's it. `pnpm release` bumps all 7 packages, runs every safety gate locally, cuts the CHANGELOG `## Unreleased` section into a dated version header, commits, and tags `vX.Y.Z`. Pushing the tag triggers `.github/workflows/publish.yml` which validates again, runs `check-publish-safety`, and publishes any package whose version differs from npm `latest`.

## What `pnpm release` does

1. **Preflight** — verifies the working tree is clean, you're on `main`, and `main` is in sync with `origin/main`.
2. **Validate** — runs `pnpm validate` (full workspace: lint + typecheck + test + build).
3. **Bump functype family** — applies the new version to all 5 family `package.json`s (`functype`, `functype-os`, `functype-log`, `functype-react`, `functype-mcp-server`).
4. **Sync eslint mirror** — runs `pnpm sync:eslint-mirror`, computing the eslint pair version from the encoding `eslint = 2.{functype.major*100 + functype.minor}.{functype.patch}` (e.g. `functype@1.1.0` → `eslint@2.101.0`).
5. **Sync mcp-server `server.json`** — `pnpm -F functype-mcp-server sync:registry` writes the new version to the MCP registry manifest.
6. **Cut CHANGELOG** — takes `## Unreleased` content in `packages/functype/CHANGELOG.md` and rewrites the heading to `## {version} - {date}`, leaving a fresh empty `## Unreleased` at top.
7. **Final safety gate** — `pnpm check-publish-safety` re-verifies all 5 invariants (see below).
8. **Commit + tag** — `git commit -m "release: vX.Y.Z"` + `git tag -a vX.Y.Z`.

## What CI does on tag push

`.github/workflows/publish.yml` triggers on `push: tags: ['v*']`:

1. **Validate** — same `pnpm validate` as local.
2. **Check publish safety** — independent re-run of `pnpm check-publish-safety` in the clean CI environment.
3. **Publish** — `pnpm -r publish --no-git-checks --access public` walks every workspace package and publishes any whose local version differs from npm `latest`.
4. **GitHub release** — creates a release entry with auto-generated notes from commits between this tag and the previous one.

OIDC trusted publishing produces npm provenance attestations for `functype`, `functype-os`, `functype-log`, `functype-react`. `functype-mcp-server` and the eslint pair publish via `NPM_TOKEN`.

## Safety invariants (`scripts/check-publish-safety.ts`)

The publish gate refuses to proceed if any of these holds:

1. **Unauthorized major.** Any package bumping its major version requires `ALLOW_MAJOR=<pkg>[,<pkg>]` env on the publish step. Per-release authorization, no "always allow" mode.
2. **Downgrade.** Local version < npm `latest`. Never auto-authorized.
3. **Family alignment drift.** The 5 functype-* packages must be at the same version. Drift here means something bypassed `pnpm release` (manual edit, conflict resolution, snapshot leakage, dependabot).
4. **Eslint mirror drift.** The eslint pair must match `2.{functype.major*100 + functype.minor}.{functype.patch}`. Verified by `pnpm sync:eslint-mirror:check`.
5. **mcp-server `server.json` drift.** The MCP registry manifest version must match `packages/mcp-server/package.json`. Verified by `pnpm -F functype-mcp-server sync:registry:check`.

All 5 are independent gates and all 5 fail closed.

## Eslint mirror encoding

The eslint pair version is derived from the functype family version per:

```
eslint.major = 2  (fixed offset)
eslint.minor = functype.major * 100 + functype.minor
eslint.patch = functype.patch
```

Examples:

| functype | eslint |
|---|---|
| `1.0.1` | `2.100.1` |
| `1.1.0` | `2.101.0` |
| `1.20.1` | `2.120.1` |
| `2.0.0` | `2.200.0` |
| `9.99.0` | `2.999.0` (formula ceiling) |

The `×100` reserves headroom for double-digit minors. At `functype.minor >= 100` the formula would collide (`functype@1.100.x` and `functype@2.0.x` both encode to `eslint@2.200.x`) — `sync-eslint-mirror.ts` throws clearly in that case, and the safety gate blocks publish. Update the formula in `scripts/sync-eslint-mirror.ts` if you hit it.

## Major bumps

When you intentionally do a major:

```bash
ALLOW_MAJOR="functype,functype-os,functype-log,functype-react,functype-mcp-server" pnpm release major
git push --follow-tags
```

And edit `.github/workflows/publish.yml` to set the same `ALLOW_MAJOR` on the `Check publish safety` step env. Remove the override in a follow-up PR after the major lands.

(All 5 family packages must be listed because the family bumps together and `check-publish-safety` requires explicit per-package authorization for any major.)

## Snapshot releases (testing pre-publish)

To dry-run a version bump without publishing:

```bash
# Manually:
# 1. Read current functype version (e.g. 1.0.1)
# 2. Edit packages/functype/package.json to a temp version
# 3. Run `pnpm sync:eslint-mirror` to see what the mirror would produce
# 4. Run `pnpm check-publish-safety` to see what the gates say
# 5. `git checkout HEAD -- packages/` to revert
```

A more polished snapshot mode could be added to `release.ts` (a `--dry-run` flag); not done today.

## npm trusted-publisher setup

`functype`, `functype-os`, `functype-log`, `functype-react` use OIDC trusted publishing. For each:

- npmjs.com → package → **Settings → Publishing access → Trusted Publisher**
- GitHub repository: `jordanburke/functype`
- Workflow filename: `publish.yml`
- Environment: (blank)

`functype-mcp-server` and the eslint pair publish via `NPM_TOKEN`. The token is stored as a repo secret; no per-package npm config needed.

## Node version requirement

`publish.yml` reads from `.nvmrc` (currently pinned to Node **24**). Required to sidestep the npm 10.x OIDC handshake bug ([npm/cli#8976](https://github.com/npm/cli/issues/8976)) — Node 22 surfaces it as `E404 PUT https://registry.npmjs.org/<pkg>` immediately after sigstore signing. npm 11.5.1+ (Node 24 LTS) fixes it.

## Historical post-mortems

See git history for the 0.60.7 → 1.0.0 cascade (2026-05-30) and the 1.0.1 family-cadence reset. Those incidents motivated the safety gate, the eslint mirror sync script, and ultimately the move from `@changesets/cli` to this tag-based release flow.
