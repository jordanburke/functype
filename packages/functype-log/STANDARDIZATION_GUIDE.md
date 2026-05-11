# TypeScript Project Script Standardization Guide

This guide helps you standardize npm/pnpm scripts across TypeScript projects using the established pattern from [ts-builds-template](https://github.com/jordanburke/ts-builds-template).

## Quick Copy-Paste Prompt for Claude Code

````
Please standardize this TypeScript project's npm scripts to match our established pattern. Here's what needs to be done:

1. **Update package.json scripts section** with these standardized commands:
   ```json
   "scripts": {
     "ci": "pnpm format && pnpm lint:check && pnpm test && pnpm build",
     "format": "prettier --write .",
     "format:check": "prettier --check .",
     "lint": "eslint ./src --fix",
     "lint:check": "eslint ./src",
     "test": "vitest run",
     "test:watch": "vitest",
     "test:coverage": "vitest run --coverage",
     "test:ui": "vitest --ui",
     "build": "rimraf dist && cross-env NODE_ENV=production tsdown",
     "build:watch": "tsdown --watch",
     "dev": "tsdown --watch",
     "prepublishOnly": "pnpm ci",
     "ts-types": "tsc --noEmit"
   }
````

2. **Update GitHub Actions workflows** to use `pnpm run ci` instead of individual commands

3. **Update CLAUDE.md or README.md** with the new command structure, emphasizing:
   - `pnpm ci` as the main pre-checkin command
   - Clear separation between check vs fix commands
   - Consistent format/lint naming

4. **Find and replace** any references to old commands in documentation files

Key principles:

- `ci` command does format → lint:check → test → build (full validation)
- `format` writes changes, `format:check` only validates
- `lint` fixes issues, `lint:check` only reports
- `build` is production build, `dev` is watch mode
- `prepublishOnly` uses `ci` for safety

After changes, test with `pnpm run ci` to ensure everything works.

````

## Detailed Implementation Steps

### 1. Script Structure Analysis

The standardized pattern follows this hierarchy:

**Main Command:**
- `ci` - Complete pre-checkin validation pipeline

**Core Operations:**
- `format` / `format:check` - Prettier formatting (write vs validate)
- `lint` / `lint:check` - ESLint linting (fix vs validate)
- `test` / `test:*` - Vitest testing with variants
- `build` / `dev` - Production build vs development watch

**Publishing Safety:**
- `prepublishOnly` - Automatically runs `ci` before npm publish

### 2. GitHub Actions Updates

Update workflow files to use the standardized commands:

**Before:**
```yaml
- run: pnpm install
- run: pnpm run lint:format
- run: pnpm run test
- run: pnpm run build:prod
````

**After:**

```yaml
- run: pnpm install
- run: pnpm run ci
```

### 3. Documentation Updates

Update your project documentation to reflect the new commands:

````markdown
## Development Commands

### Pre-Checkin Command

```bash
pnpm run ci        # 🚀 Main command: format, lint, test, and build everything
```
````

### Individual Commands

```bash
# Formatting
pnpm format        # Format code with Prettier
pnpm format:check  # Check formatting without writing

# Linting
pnpm lint          # Fix ESLint issues
pnpm lint:check    # Check ESLint issues without fixing

# Testing
pnpm test          # Run tests once
pnpm test:watch    # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report

# Building
pnpm build         # Production build
pnpm dev           # Development mode with watch
```

## Benefits of This Standardization

1. **Consistency** - Same commands work across all projects
2. **Safety** - `ci` command ensures full validation before checkin
3. **Clarity** - Clear distinction between check vs fix operations
4. **Efficiency** - Single command for complete validation
5. **CI/CD Simplification** - Workflows can use single `ci` command

## Migration Checklist

- [ ] Update `package.json` scripts section
- [ ] Test `pnpm run ci` command works
- [ ] Update GitHub Actions workflows
- [ ] Update CLAUDE.md or README.md documentation
- [ ] Search and replace old command references
- [ ] Verify `prepublishOnly` uses `ci` command
- [ ] Test individual commands work as expected
- [ ] Update any custom scripts or tools that reference old commands

## Common Gotchas

1. **ESLint Path** - Adjust `./src` path if your source is elsewhere
2. **Test Framework** - Replace `vitest` commands if using Jest/Mocha
3. **Build Tool** - Replace `tsdown` commands if using different bundler
4. **Prettier Config** - Ensure Prettier config works with `--write .` pattern
5. **Dependencies** - May need to install `rimraf`, `cross-env`, etc.

## Example Migration

**Before (inconsistent):**

```json
{
  "scripts": {
    "build": "tsc && webpack",
    "test": "jest",
    "lint:format": "prettier --write .",
    "lint:fix": "eslint --fix src",
    "prepublishOnly": "npm run build"
  }
}
```

**After (standardized):**

```json
{
  "scripts": {
    "ci": "pnpm format && pnpm lint:check && pnpm test && pnpm build",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint ./src --fix",
    "lint:check": "eslint ./src",
    "test": "jest",
    "build": "rimraf dist && tsc && webpack",
    "dev": "webpack --watch",
    "prepublishOnly": "pnpm ci"
  }
}
```

This standardization makes your project consistent with the established pattern and provides a reliable, safe workflow for all contributors.
