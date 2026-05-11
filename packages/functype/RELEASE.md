# Release Process

This package uses **npm trusted publishers** for secure, tokenless publishing from GitHub Actions.

## Automatic Releases (Dependency Updates)

When Dependabot updates dependencies:

1. Dependabot creates a PR
2. CI validates (`pnpm validate`)
3. PR auto-merges (patch/minor updates)
4. Version auto-bumps and publishes to npm

**No action required** - fully automated.

## Manual Releases

For new features or breaking changes:

```bash
# Patch release (bug fixes)
npm version patch -m "fix: description"
git push --follow-tags

# Minor release (new features)
npm version minor -m "feat: description"
git push --follow-tags

# Major release (breaking changes)
npm version major -m "feat!: description"
git push --follow-tags
```

The tag push triggers the publish workflow automatically.

## What Happens on Release

1. **Validation**: Runs `pnpm validate` (format, lint, test, build)
2. **Publish**: Publishes to npm with provenance
3. **GitHub Release**: Creates release with auto-generated notes

## Authentication

This package uses [npm trusted publishers](https://docs.npmjs.com/trusted-publishers) (OIDC) instead of tokens:

- No `NPM_TOKEN` secret needed
- Authentication tied to GitHub repo/workflow
- Configured at: npmjs.com → package settings → Publishing access

## Troubleshooting

### Publish fails with 404

- Verify trusted publisher config on npmjs.com matches:
  - Repository owner: `jordanburke`
  - Repository name: `functype`
  - Workflow filename: `publish.yml`
  - Environment: _(blank)_

### GitHub release fails with 403

- Check `contents: write` permission in `.github/workflows/publish.yml`

### npm version compatibility

- Workflow updates npm to latest before publishing
- Requires Node 22+ (configured in `.nvmrc`)
