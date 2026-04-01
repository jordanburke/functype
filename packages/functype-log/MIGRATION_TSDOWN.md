# Migration Guide: tsup → tsdown

This guide covers migrating TypeScript libraries from tsup to tsdown.

## Quick Migration

```bash
# Install tsdown and run automatic migration
pnpm add -D tsdown
npx tsdown migrate

# Remove tsup
pnpm remove tsup
```

## Manual Changes Required

### 1. Config File (`tsdown.config.ts`)

Replace the old export style with `defineConfig`:

```typescript
// Before (tsup style)
import type { Options } from "tsup"
export const tsup: Options = { ... }

// After (tsdown style)
import { defineConfig } from "tsdown"
export default defineConfig({ ... })
```

**Remove unsupported options:**

- `splitting` - handled automatically
- `skipNodeModulesBundle` - default behavior
- `bundle` - always bundles
- `watch` - use CLI flag instead

### 2. Package.json Updates

**Add module type:**

```json
{
  "type": "module"
}
```

**Update exports for ESM-only:**

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

**Or for dual ESM + CJS:**

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "exports": {
    ".": {
      "types": {
        "import": "./dist/index.d.mts",
        "require": "./dist/index.d.cts"
      },
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

**Update scripts:**

```json
{
  "scripts": {
    "build": "rimraf dist && cross-env NODE_ENV=production tsdown",
    "build:watch": "tsdown --watch",
    "dev": "tsdown --watch"
  }
}
```

### 3. Output Extensions (Optional)

For clean `.js` output instead of `.mjs`:

```typescript
export default defineConfig({
  format: ["esm"],
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
})
```

## Example Config

Complete `tsdown.config.ts` for ESM-only library:

```typescript
import { defineConfig } from "tsdown"

const env = process.env.NODE_ENV

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: env === "production",
  target: "es2020",
  outDir: env === "production" ? "dist" : "lib",
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
})
```

## Verification

Run validation after migration:

```bash
pnpm validate
```

Expected output:

```
dist/index.js      - ESM bundle
dist/index.js.map  - Source map
dist/index.d.ts    - Type declarations
```

## Benefits

- **Faster builds** - Powered by Rolldown (Rust-based)
- **Better types** - `defineConfig` provides full type inference
- **Simpler config** - Less boilerplate needed
- **Modern output** - Clean ESM with `.js` extensions

## Resources

- [tsdown documentation](https://tsdown.dev/guide/)
- [Migration guide](https://tsdown.dev/guide/migrate-from-tsup)
