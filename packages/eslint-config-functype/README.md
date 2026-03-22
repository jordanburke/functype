# eslint-config-functype

Curated ESLint flat config for functional TypeScript with [functype](https://github.com/jordanburke/functype). Composes rules from `typescript-eslint`, `prettier`, and `simple-import-sort` into opinionated `recommended` and `strict` presets.

## Install

```bash
npm install -D eslint-config-functype eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-prettier prettier eslint-plugin-simple-import-sort
```

## Usage

```js
// eslint.config.mjs
import recommended from "eslint-config-functype/recommended"
import testOverrides from "eslint-config-functype/test-overrides"

export default [recommended, testOverrides]
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
- `@typescript-eslint/strict-boolean-expressions` (warn, relaxed for functional patterns)
- Prettier formatting and import sorting

### `strict`

Everything in `recommended` plus:

- `@typescript-eslint/explicit-function-return-type` (error)
- `@typescript-eslint/no-non-null-assertion` (error)
- `@typescript-eslint/strict-boolean-expressions` (error, default strict)

### `test-overrides`

Extension point for test files (`*.test.ts`, `*.spec.ts`, `test/**`, `tests/**`, `__tests__/**`).

## Pairing with eslint-plugin-functype

For functype-specific rules (prefer-option, prefer-either, prefer-fold, etc.):

```bash
npm install -D eslint-plugin-functype
```

```js
import recommended from "eslint-config-functype/recommended"
import functype from "eslint-plugin-functype"

export default [recommended, functype.configs.recommended]
```

## CLI

```bash
npx functype-list-rules              # list all configured rules
npx functype-list-rules --verbose    # with rule details
npx functype-list-rules --check-deps # verify peer dependencies
```

## License

MIT
