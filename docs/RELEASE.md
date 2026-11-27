# Releasing from the monorepo

The functype family (7 packages) ships together on one version line, `2.x` from `main`; the eslint pair (2 packages) ships together on the mirrored `2.200.x` line (see Eslint mirror encoding). All 9 publishable packages release in lockstep from a single git tag.

## TL;DR

```bash
# 1. Land your feature PR(s) on main (or on release/<major>.x for the old major,
#    see Release branches). Write release notes under `## Unreleased`
#    in packages/functype/CHANGELOG.md as part of each PR.

# 2. From a clean main (or release/<major>.x) branch:
pnpm release patch        # or: minor, major
git push --follow-tags    # → triggers CI publish
```

That's it. `pnpm release` bumps all 8 packages, runs every safety gate locally, cuts the CHANGELOG `## Unreleased` section into a dated version header, commits, and tags `vX.Y.Z`. Pushing the tag triggers `.github/workflows/publish.yml` which validates again, runs `check-publish-safety`, and publishes any package whose version npm doesn't have yet.

## What `pnpm release` does

1. **Preflight** — verifies the working tree is clean, you're on `main` or a `release/<major>.x` branch, and that branch is in sync with its `origin` copy.
2. **Validate** — runs `pnpm validate` (full workspace: lint + typecheck + test + build).
3. **Bump functype family** — applies the new version to all 7 family `package.json`s (`functype`, `functype-os`, `functype-log`, `functype-react`, `functype-eval`, `functype-kysely`, `functype-mcp-server`). The list lives in `scripts/packages.ts`.
4. **Sync eslint mirror** — runs `pnpm sync:eslint-mirror`, computing the eslint pair version from the encoding `eslint = 2.{functype.major*100 + functype.minor}.{functype.patch}` (e.g. `functype@1.1.0` → `eslint@2.101.0`).
5. **Sync mcp-server `server.json`** — `pnpm -F functype-mcp-server sync:registry` writes the new version to the MCP registry manifest.
6. **Cut CHANGELOG** — takes `## Unreleased` content in `packages/functype/CHANGELOG.md` and rewrites the heading to `## {version} - {date}`, leaving a fresh empty `## Unreleased` at top.
7. **Final safety gate** — `pnpm check-publish-safety` re-verifies all 6 invariants (see below).
8. **Commit + tag** — `git commit -m "release: vX.Y.Z"` + `git tag -a vX.Y.Z`.

## What CI does on tag push

`.github/workflows/publish.yml` triggers on `push: tags: ['v*']`:

1. **Validate** — `pnpm validate`, as run locally, plus functype's coverage floor. Coverage runs only when `CI=true`, which GitHub sets, so a release whose functype coverage falls below the thresholds in `packages/functype/vitest.config.ts` fails here and publishes nothing. Run `CI=true pnpm -F functype test` locally to check before tagging. The same floor applies on `release/1.x`, with its own thresholds.
2. **Check publish safety** — independent re-run of `pnpm check-publish-safety` in the clean CI environment.
3. **Publish** — `pnpm -r publish --no-git-checks --access public --tag <tag>`, with the dist-tag `scripts/publish-tag.ts` picks (`latest`, or `latest-<major>` for an older line), walks every workspace package and publishes any whose local version npm doesn't have yet.
4. **Verify the release installs** — `pnpm verify-published` (see below). The GitHub release is created only after it passes.
5. **GitHub release** — creates a release entry with auto-generated notes from commits between this tag and the previous one.

OIDC trusted publishing produces npm provenance attestations for `functype`, `functype-os`, `functype-log`, `functype-react`. `functype-mcp-server`, `functype-kysely` and the eslint pair publish via `NPM_TOKEN`. A new package can't have a trusted publisher until its first version exists, so it publishes with the token until one is set up.

## Release branches (`release/<major>.x`)

Once `main` carries unreleased breaking changes, additive releases for the old major ship from a `release/<major>.x` branch instead. `release/1.x` was cut from `v1.15.0` on 2026-10-11, while `main` carried 2.0, and keeps shipping 1.x fixes now that 2.0 is out. Decided in #276 (the 2.0 release plan).

- `pnpm release` and `ci.yml` accept `main` or `release/<major>.x`.
- Feature PRs for the old major target the release branch, and write their notes under `## Unreleased` there.
- After each release from the branch, merge it into `main` (merge, never rebase) and keep both CHANGELOG sections. That is how the additive work reaches the next major.

**An old line publishes beside `latest`, not over it.** These shipped in #581 (publish an older line under latest-<major>) and #585 (its review follow-ups), on `release/1.x`, before 2.0.0:

1. **The dist-tag is picked at run time.** `scripts/publish-tag.ts` publishes under `latest`, unless functype's local major is below npm `latest`'s; then under `latest-<major>`, such as `latest-1`. The workflow runs on a tag push and doesn't know its branch, so the choice can't be written into a branch. The tag can't be `v1` or `1.x`: npm rejects a tag that parses as a semver range.
2. **The downgrade check is keyed by line.** `check-publish-safety` compares each version with the highest npm version on its own functype line, not with `latest`. The eslint pair's line is `floor(minor / 100)`. The logic is in `scripts/publish-line.ts`, tested by `pnpm test:scripts`.
3. **The GitHub release** is created with `gh release create --latest=<bool>` and `--notes-start-tag` the previous tag on the same major, so a 1.x release after 2.0.0 isn't the repo's "Latest release", and its notes start from the last 1.x tag.
4. **`verify-published`** checks the dist-tag the publish used.

Also note:

- `deploy-docs.yml` deploys from `main` only, so a 1.x release doesn't reach the site. See "Docs and the Claude plugin" below.
- After that merge, run `pnpm turbo run validate` on the merge commit, and commit any regenerated `site/public/llms*.txt`, before pushing. CI's stale-artifact check fails otherwise.

## Docs and the Claude plugin

- **functype.org** deploys on pushes to `main`. `deploy-docs.yml` has the same filter on `release/1.x`, so a 1.x release doesn't redeploy the 1.x site over 2.0.
- **The `functype` Claude plugin** reads its skills and `.mcp.json` from `main` (`"source": "./"` in `.claude-plugin/marketplace.json`). Raise its version there when its skills change; `pnpm sync:plugin-lock:check` fails until you do.

From 2.0-prep until 2.0.0 shipped, both served `release/1.x` instead, so users read the docs and skills for the version npm served. The 2.0 release switched them back.

## Verify the release installs (`scripts/verify-published.ts`)

"Published" in the publish log means npm accepted the upload, not that anyone can install it. In 1.16.1 and 1.17.0, `functype-log`, `functype-eval` and `functype-mcp-server` had `latest` pointing at the new version while its metadata and tarball returned 404, so a clean `npm install` failed for about 6 minutes. Both cleared on their own.

`pnpm verify-published` reads the document `npm install` reads, the abbreviated packument at `registry.npmjs.org/<name>`. It checks that the packument lists the version, that the dist-tag points at it, and that its tarball answers 200. It retries every 30 seconds for up to 30 minutes, and each request times out after 15 seconds. It exits 0 once all 8 install.

- **It fails in CI:** don't republish. A staged version can still finish or roll back on its own, and republishing over it gets `E409`. Re-run `pnpm verify-published` locally until it passes, then create the GitHub release by hand: `gh release create vX.Y.Z --generate-notes`. For a release on an older line than npm `latest`, such as a 1.x fix after 2.0.0, add `--latest=false --notes-start-tag <the previous tag on that major>`; `pnpm exec tsx scripts/publish-tag.ts vX.Y.Z` prints both.
- **Check one version:** `pnpm verify-published functype@1.16.1`.
- **Knobs:** `VERIFY_TIMEOUT_SECONDS`, `VERIFY_INTERVAL_SECONDS` (at least 1), and `NPM_DIST_TAG` (default `latest`). CI passes the dist-tag it published to, `latest` or `latest-<major>` (see `scripts/publish-tag.ts`). Set `NPM_DIST_TAG` to check a tag by hand.

## Safety invariants (`scripts/check-publish-safety.ts`)

The publish gate refuses to proceed if any of these holds:

1. **Unauthorized major.** Any package bumping its major version requires `ALLOW_MAJOR=<pkg>[,<pkg>]` env on the publish step. Per-release authorization, no "always allow" mode.
2. **Downgrade.** Local version below the highest npm version on its own functype line, so a 1.x fix after 2.0.0 is compared with 1.x, not with `latest`. The eslint pair's line is its minor divided by 100. Never auto-authorized. See `scripts/publish-line.ts`.
3. **Family alignment drift.** The 7 functype-* packages must be at the same version. Drift here means something bypassed `pnpm release` (manual edit, conflict resolution, snapshot leakage, dependabot).
4. **Eslint mirror drift.** The eslint pair must match `2.{functype.major*100 + functype.minor}.{functype.patch}`. Verified by `pnpm sync:eslint-mirror:check`.
5. **mcp-server `server.json` drift.** The MCP registry manifest version must match `packages/mcp-server/package.json`. Verified by `pnpm -F functype-mcp-server sync:registry:check`.
6. **Unlisted package.** Every non-private workspace package must be in `scripts/packages.ts`, the one list `release.ts`, this gate, `verify-published` and `sync-eslint-mirror` all read. Otherwise `pnpm -r publish` would publish it with no bump, alignment check or install check.

All 6 are independent gates and all 6 fail closed.

## Eslint mirror encoding

The eslint pair version is derived from the functype family version per:

```
eslint.major = 2  (fixed offset)
eslint.minor = functype.major * 100 + functype.minor
eslint.patch = functype.patch
```

Examples:

| functype | eslint                      |
| -------- | --------------------------- |
| `1.0.1`  | `2.100.1`                   |
| `1.1.0`  | `2.101.0`                   |
| `1.20.1` | `2.120.1`                   |
| `2.0.0`  | `2.200.0`                   |
| `9.99.0` | `2.999.0` (formula ceiling) |

The `×100` reserves headroom for double-digit minors. At `functype.minor >= 100` the formula would collide (`functype@1.100.x` and `functype@2.0.x` both encode to `eslint@2.200.x`) — `sync-eslint-mirror.ts` throws clearly in that case, and the safety gate blocks publish. Update the formula in `scripts/sync-eslint-mirror.ts` if you hit it.

## Major bumps

When you intentionally do a major:

```bash
ALLOW_MAJOR="functype,functype-os,functype-log,functype-react,functype-eval,functype-kysely,functype-mcp-server" pnpm release major
git push --follow-tags
```

And edit `.github/workflows/publish.yml` to set the same `ALLOW_MAJOR` on the `Check publish safety` step env. Remove the override in a follow-up PR after the major lands.

(All 7 family packages must be listed because the family bumps together and `check-publish-safety` requires explicit per-package authorization for any major.)

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

`functype-mcp-server`, `functype-kysely` and the eslint pair publish via `NPM_TOKEN`. A new package can't have a trusted publisher until its first version exists, so it publishes with the token until one is set up. The token is stored as a repo secret; no per-package npm config needed.

## Node version requirement

`publish.yml` reads from `.nvmrc`, pinned to an **exact** Node version (currently `24.20.0`, bundling npm 11.19.0). Node 22's npm 10.x has an OIDC handshake bug ([npm/cli#8976](https://github.com/npm/cli/issues/8976)) that surfaces as `E404 PUT https://registry.npmjs.org/<pkg>` right after sigstore signing. A bare `24` isn't enough either: `actions/setup-node` then resolves whatever 24.x the runner has cached, and npm 11.17 (Node 24.19.0) failed OIDC with `E401 … Failed to generate Web Auth URLs` where 11.19 (24.20.0) published. The release job is the one job that can't be safely retried, so its toolchain is pinned. Bump the pin deliberately, on a branch.

## Historical post-mortems

See git history for the 0.60.7 → 1.0.0 cascade (2026-05-30) and the 1.0.1 family-cadence reset. Those incidents motivated the safety gate, the eslint mirror sync script, and ultimately the move from `@changesets/cli` to this tag-based release flow.
