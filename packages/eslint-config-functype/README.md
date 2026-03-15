# eslint-config-functype

Curated ESLint flat config for functional TypeScript with [functype](https://github.com/jordanburke/functype). Composes rules from `eslint-plugin-functional`, `typescript-eslint`, `prettier`, and `simple-import-sort` into opinionated `recommended` and `strict` presets.

## Install

```bash
npm install -D eslint-config-functype eslint eslint-plugin-functional @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-prettier prettier eslint-plugin-simple-import-sort
```

## Usage

```js
// eslint.config.mjs
import recommended from "eslint-config-functype/recommended"
import testOverrides from "eslint-config-functype/test-overrides"

export default [
  recommended,
  testOverrides, // relaxes functional rules for test files
]
```

### Strict mode

```js
import strict from "eslint-config-functype/strict"
import testOverrides from "eslint-config-functype/test-overrides"

export default [strict, testOverrides]
```

## Configs

### `recommended`

- `prefer-const`, `no-var`, `no-throw-literal`
- `@typescript-eslint/consistent-type-imports`, `no-explicit-any`, `no-floating-promises`, `await-thenable`
- `functional/no-let`, `functional/immutable-data` (warn), `functional/no-throw-statements` (warn, allows reject)
- `functional/prefer-immutable-types` is **off** - functype types are immutable by design
- Prettier formatting and import sorting

### `strict`

Everything in `recommended` plus:

- `functional/no-loop-statements` (error)
- `functional/immutable-data` (error)
- `functional/prefer-immutable-types` (warn)
- `@typescript-eslint/explicit-function-return-type` (error)
- `@typescript-eslint/strict-boolean-expressions` (error, default strict)

### `test-overrides`

Disables `functional/no-let`, `immutable-data`, `no-throw-statements`, and `no-try-statements` for test files (`*.test.ts`, `*.spec.ts`, `test/**`, `tests/**`, `__tests__/**`).

## CLI

```bash
npx functype-list-rules              # list all configured rules
npx functype-list-rules --verbose    # with rule details
npx functype-list-rules --check-deps # verify peer dependencies
```

## License

MIT
