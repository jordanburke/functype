---
name: ts-builds-template
description: Guide for bootstrapping new TypeScript libraries from the ts-builds-template. Use when creating a new npm package from this template, customizing the template for a new project, or understanding the template's project structure and dev workflow.
---

# ts-builds-template

## Overview

This skill helps you bootstrap new TypeScript libraries from the [ts-builds-template](https://github.com/jordanburke/ts-builds-template). It covers cloning, customizing, developing, and publishing a new library.

For detailed tooling configuration (tsdown, Vitest, ESLint, Prettier, TypeScript), migration guides, and standardization of existing projects, see the **ts-builds** skill.

## When to Use This Skill

- Creating a new TypeScript library or npm package from this template
- Customizing the template for a new project (package.json, README, etc.)
- Understanding the template's project structure and dev workflow
- Publishing a new library to npm for the first time

## Quick Start

```bash
# Clone the template
git clone https://github.com/jordanburke/ts-builds-template.git my-library
cd my-library

# Remove template's git history
rm -rf .git
git init

# Install dependencies
pnpm install

# Validate everything works
pnpm validate
```

See `references/template-setup.md` for the full customization checklist.

## Project Structure

```
my-library/
├── src/
│   └── index.ts           # Main entry point — export public API here
├── test/
│   └── *.spec.ts          # Vitest tests
├── dist/                  # Production builds (gitignored)
│   ├── index.js           # ES module
│   └── index.d.ts         # TypeScript declarations
├── tsdown.config.ts       # Build config (imports from ts-builds)
├── tsconfig.json          # TypeScript config (extends ts-builds)
├── package.json           # Scripts, exports, dependencies
├── CLAUDE.md              # Claude Code project guidance
└── README.md
```

## Customization Checklist

After cloning, update these files for your new library:

- [ ] `package.json` — name, description, version, repository URL, keywords, author, license
- [ ] `README.md` — describe your library, installation, usage examples, update npm badge to your package name
- [ ] README npm badge — update `ts-builds-template` in the badge URLs to your package name:
  ```markdown
  [![npm version](https://img.shields.io/npm/v/YOUR-PACKAGE-NAME.svg)](https://www.npmjs.com/package/YOUR-PACKAGE-NAME)
  ```
- [ ] `CLAUDE.md` — project overview, architecture notes, custom workflows
- [ ] `LICENSE` — update if not using MIT
- [ ] `src/index.ts` — replace template code with your library's public API
- [ ] `test/*.spec.ts` — replace template tests

## Development Workflow

```bash
pnpm dev             # Watch mode — rebuilds on file changes
pnpm test:watch      # Run tests in watch mode
pnpm validate        # Format + Lint + Test + Build (run before commits)
```

All commands delegate to [ts-builds](https://github.com/jordanburke/ts-builds) for consistency across projects.

### Available Commands

```bash
pnpm validate        # Main pre-commit command
pnpm format          # Format with Prettier
pnpm format:check    # Check formatting only
pnpm lint            # Fix ESLint issues
pnpm lint:check      # Check only
pnpm test            # Run tests once
pnpm test:watch      # Watch mode
pnpm test:coverage   # With coverage report
pnpm build           # Production build (dist/)
pnpm dev             # Development watch (lib/)
pnpm typecheck       # TypeScript type check
```

## Publishing

```bash
# Verify package name is available
npm view my-library-name

# First publish
npm version 1.0.0
npm publish --access public

# Subsequent releases
npm version patch|minor|major
npm publish
```

The `prepublishOnly` hook runs `pnpm validate` automatically, ensuring code is formatted, linted, tested, and built before every publish.

## ESM Output

The template is `"type": "module"` and outputs ES modules with TypeScript declarations:

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

## Troubleshooting

### Validation fails after cloning

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm validate
```

### Build issues

```bash
rm -rf dist lib
pnpm build
```

### Tests not found

Ensure test files are in `test/` and named `*.spec.ts` or `*.test.ts`.

## Related Skills

- **ts-builds** — Detailed tooling configuration, migration guides, and standardization for existing projects

## Resources

- **Template Repository**: https://github.com/jordanburke/ts-builds-template
- **ts-builds**: https://github.com/jordanburke/ts-builds
- **tsdown**: https://tsdown.dev/
- **Vitest**: https://vitest.dev/
