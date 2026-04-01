# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library template designed to be cloned/forked for creating new npm packages. It uses the `ts-builds` toolchain for standardized build scripts with ESM output.

**Template Usage**: See STANDARDIZATION_GUIDE.md for applying this pattern to other TypeScript projects.

## Development Commands

All commands delegate to `ts-builds` for consistency across projects:

```bash
pnpm validate        # Main command: format + lint + test + build (use before commits)

pnpm format          # Format code with Prettier
pnpm format:check    # Check formatting only

pnpm lint            # Fix ESLint issues
pnpm lint:check      # Check ESLint issues only

pnpm test            # Run tests once
pnpm test:watch      # Run tests in watch mode
pnpm test:coverage   # Run tests with coverage

pnpm build           # Production build (outputs to dist/)
pnpm dev             # Development build with watch mode

pnpm typecheck       # Check TypeScript types
```

### Running a Single Test

```bash
pnpm test -- --testNamePattern="pattern"    # Filter by test name
pnpm test -- test/specific.spec.ts          # Run specific file
```

## Architecture

### Build System: ts-builds + tsdown

- **ts-builds**: Centralized toolchain package providing all build scripts
- **tsdown**: Underlying bundler configured via `ts-builds/tsdown`
- **Configuration**: `tsdown.config.ts` imports default config from ts-builds
- **TypeScript**: `tsconfig.json` extends `ts-builds/tsconfig`
- **Prettier**: Uses `ts-builds/prettier` shared config

### Output Format

- **dist/**: Production builds containing:
  - `index.js` - ES module format
  - `index.d.ts` - TypeScript declarations
- **lib/**: Development builds (also published)

### Package Exports

```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

### Testing: Vitest

- Tests located in `test/*.spec.ts`
- Uses Vitest with configuration from ts-builds
- Coverage via v8 provider

## Key Files

- `src/index.ts` - Main library entry point
- `test/*.spec.ts` - Test files
- `tsdown.config.ts` - Build config (imports from ts-builds)
- `tsconfig.json` - TypeScript config (extends ts-builds)
- `.claude/skills/ts-builds-template/` - Claude Code skill for bootstrapping libraries from this template

## Publishing

```bash
npm version patch|minor|major
npm publish --access public
```

The `prepublishOnly` hook automatically runs `pnpm validate` before publishing.
