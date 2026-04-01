# Template Setup Guide

Complete guide for creating a new TypeScript library using the ts-builds-template.

> For detailed tooling configuration (tsdown, Vitest, ESLint, Prettier, TypeScript), see the **ts-builds** skill.

## Prerequisites

Before starting, ensure you have:

- **Node.js**: ≥ 18.0.0
- **pnpm**: Latest version (template uses 10.18.3+)
- **Git**: For version control
- **npm account**: For publishing (optional)

Check versions:

```bash
node --version   # Should be 18.0.0 or higher
pnpm --version   # Latest stable version
git --version
```

## Initial Setup

### Step 1: Clone the Template

```bash
# Clone the repository
git clone https://github.com/jordanburke/ts-builds-template.git my-library-name

# Navigate to the directory
cd my-library-name

# Remove the template's git history
rm -rf .git

# Initialize your own repository
git init
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
pnpm install

# Verify installation
pnpm validate
```

If `pnpm validate` succeeds, you have a working setup!

## Customization Checklist

### Update package.json

Replace template placeholders with your project details:

```json
{
  "name": "your-library-name", // ← Change this
  "version": "1.0.0", // ← Start at 1.0.0 or 0.1.0
  "description": "Your library description", // ← Describe your library
  "keywords": [
    // ← Add relevant keywords
    "your",
    "keywords",
    "here"
  ],
  "author": "your.email@example.com", // ← Your email
  "license": "MIT", // ← Choose license (MIT, Apache-2.0, etc.)
  "homepage": "https://github.com/yourname/your-library", // ← Your repo
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/your-library" // ← Your repo URL
  }
}
```

**Important fields:**

- `name` - Must be unique on npm if publishing publicly
- `version` - Start at 1.0.0 (stable) or 0.1.0 (experimental)
- `description` - Shows up in npm search
- `keywords` - Helps users find your package
- `repository.url` - Links to source code

### Update README.md

Replace template content with your library information:

```markdown
# Your Library Name

Brief description of what your library does.

## Installation

\`\`\`bash
npm install your-library-name

# or

pnpm add your-library-name
\`\`\`

## Usage

\`\`\`typescript
import { YourFunction } from 'your-library-name'

// Example usage
const result = YourFunction('example')
\`\`\`

## API

Document your main functions and types here.

## License

MIT
```

### Update CLAUDE.md

Customize the Claude Code guidance for your project:

1. **Update project overview** - Describe what your library does
2. **Add architecture notes** - Explain key design decisions
3. **Document commands** - Keep the standard commands, add custom ones
4. **Add development tips** - Project-specific guidance

Example:

```markdown
# CLAUDE.md

## Project Overview

This is [your library name], a TypeScript library that [brief description].

## Architecture

- **Main module**: `src/index.ts` - exports all public APIs
- **Core logic**: `src/core/` - [describe organization]
- **Utilities**: `src/utils/` - [describe helpers]

## Development Commands

[Keep standard commands from template]

## Custom Workflows

[Add any project-specific workflows]
```

### Optional: Update License

If not using MIT license:

1. Delete `LICENSE` file
2. Create new license file for your chosen license
3. Update `package.json` license field
4. Update README.md license section

## Development Workflow

### Step 3: Write Your Code

```bash
# Start development watch mode
pnpm dev
```

This runs tsdown in watch mode, rebuilding on every file change.

**File structure:**

```
src/
├── index.ts           # Main entry point - export public API here
├── core/              # Core functionality
│   └── yourFeature.ts
├── utils/             # Helper utilities
│   └── helpers.ts
└── types/             # Type definitions (if needed)
    └── index.ts
```

**Example src/index.ts:**

```typescript
// Export your main functions and types
export { yourFunction } from "./core/yourFeature"
export { helperFunction } from "./utils/helpers"

// Export types
export type { YourType } from "./types"
```

### Step 4: Write Tests

```bash
# Run tests in watch mode
pnpm test:watch
```

**Test file structure:**

```
test/
├── yourFeature.spec.ts
└── helpers.spec.ts
```

**Example test:**

```typescript
import { describe, expect, it } from "vitest"
import { yourFunction } from "../src/core/yourFeature"

describe("yourFunction", () => {
  it("should return expected result", () => {
    const result = yourFunction("input")
    expect(result).toBe("expected")
  })

  it("should handle edge cases", () => {
    expect(() => yourFunction(null)).toThrow()
  })
})
```

### Step 5: Validate Before Commit

```bash
# Run full validation
pnpm validate
```

This runs:

1. Format code with Prettier
2. Lint with ESLint
3. Run all tests
4. Build for production

**All must pass** before committing!

## Git Workflow

### Step 6: Initial Commit

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit from ts-builds-template"

# Create main branch (if needed)
git branch -M main
```

### Step 7: Connect to Remote Repository

```bash
# Add remote (create repo on GitHub first)
git remote add origin https://github.com/yourname/your-library.git

# Push initial commit
git push -u origin main
```

## Publishing to npm

### Step 8: Prepare for Publishing

**Create npm account** (if you don't have one):

```bash
npm login
```

**Verify package name is available:**

```bash
npm view your-library-name
# Should show "npm ERR! 404 Not Found" if available
```

**Choose access level:**

- Public packages: Free, anyone can install
- Private packages: Requires paid npm account

### Step 9: Publish

```bash
# First publish (public package)
npm publish --access public

# Subsequent publishes (after updates)
npm publish
```

The `prepublishOnly` hook automatically runs `pnpm validate`, ensuring:

- Code is formatted
- Linting passes
- Tests pass
- Build succeeds

### Version Updates

Follow semantic versioning (semver):

```bash
# Patch: bug fixes (1.0.0 → 1.0.1)
npm version patch

# Minor: new features, backward compatible (1.0.0 → 1.1.0)
npm version minor

# Major: breaking changes (1.0.0 → 2.0.0)
npm version major
```

After version bump:

```bash
# Publish new version
npm publish

# Push version tag to git
git push --tags
```

## Testing Your Published Package

Before announcing your package, test it works:

```bash
# Create test directory outside your project
mkdir /tmp/test-my-library
cd /tmp/test-my-library

# Initialize package
npm init -y

# Install your package
npm install your-library-name

# Test CommonJS
node -e "const lib = require('your-library-name'); console.log(lib)"

# Test ES modules (need package.json with "type": "module")
node -e "import('your-library-name').then(console.log)"
```

## Post-Setup Checklist

After completing setup, verify:

- [ ] package.json has correct name, version, description
- [ ] package.json repository URL points to your repo
- [ ] README.md describes your library
- [ ] CLAUDE.md reflects your project
- [ ] LICENSE file is correct
- [ ] `pnpm validate` passes
- [ ] Git repository initialized and pushed
- [ ] First commit made
- [ ] (Optional) Published to npm
- [ ] (Optional) Tested published package works

## Continuous Integration Setup

### GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Run validation
        run: pnpm validate
```

This runs your full validation on every push and pull request.

## Next Steps

Now that your library is set up:

1. **Develop features** - Add your core functionality
2. **Write comprehensive tests** - Aim for high coverage
3. **Document your API** - Keep README up to date
4. **Set up CI** - Automate testing
5. **Add badges** - Build status, coverage, npm version
6. **Create examples** - Help users understand usage
7. **Write changelog** - Document changes between versions

## Common Customizations

### Adding Dependencies

```bash
# Production dependencies (users need these)
pnpm add dependency-name

# Development dependencies (only for development)
pnpm add -D dev-dependency-name
```

### Adding Scripts

Add to package.json scripts:

```json
{
  "scripts": {
    "custom-script": "your command here"
  }
}
```

### Configuring TypeScript

Edit `tsconfig.json` for your needs. The template uses strict mode with pragmatic defaults.

### Customizing Build

Edit `tsdown.config.ts` to:

- Add/remove formats (CJS, ESM, IIFE)
- Configure minification
- Add external dependencies
- Customize output files

### Adding Subpath Exports

Support imports like `your-library/feature`:

**package.json:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.mjs"
    },
    "./feature": {
      "types": "./dist/feature.d.ts",
      "require": "./dist/feature.js",
      "import": "./dist/feature.mjs"
    }
  }
}
```

**tsdown.config.ts:**

```typescript
export default defineConfig({
  entry: {
    index: "src/index.ts",
    feature: "src/feature/index.ts", // Additional entry point
  },
  // ... rest of config
})
```

## Troubleshooting

### "Command not found: pnpm"

Install pnpm:

```bash
npm install -g pnpm
```

### Validation fails after cloning

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm validate
```

### Tests failing

```bash
# Run with verbose output
pnpm test --reporter=verbose

# Check specific test
pnpm vitest run test/specific.spec.ts
```

### Build issues

```bash
# Clean and rebuild
rm -rf dist lib
pnpm build
```

### npm publish fails

Common issues:

- **Name taken**: Choose different package name
- **Not logged in**: Run `npm login`
- **Validation fails**: Fix issues, then try again
- **No permission**: Check npm account and package scope

## Resources

- **Template Repository**: https://github.com/jordanburke/ts-builds-template
- **npm Documentation**: https://docs.npmjs.com/
- **tsdown Documentation**: https://tsdown.dev/
- **Vitest Documentation**: https://vitest.dev/
- **Semantic Versioning**: https://semver.org/
