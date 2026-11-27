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

That is the whole config. `recommended` lints `**/*.{ts,tsx,mts,cts}`, and registers everything its rules need:

- `@typescript-eslint/parser`, with `parserOptions: { projectService: true }`, so the type-aware rules such as `no-floating-promises` get type information from each file's nearest `tsconfig.json`;
- the `@typescript-eslint`, `prettier` and `simple-import-sort` plugins.

Install all five peers. A missing `@typescript-eslint` package stops the config from loading, with the command that installs it. A missing `prettier`, `eslint-plugin-prettier` or `eslint-plugin-simple-import-sort` prints a warning, and the preset's rules from that plugin then fail to load.

`projectService` lints a TypeScript file only if a `tsconfig.json` includes it. So `eslint .` stops at a root `vitest.config.ts` or `tsdown.config.ts` that no tsconfig includes: "was not found by the project service". Lint the source directories (`eslint src`), add those files to `ignores`, or list them in `parserOptions.projectService.allowDefaultProject`.

### Strict mode

```js
import strict from "eslint-config-functype/strict"
import testOverrides from "eslint-config-functype/test-overrides"

export default [strict, testOverrides]
```

### A config that already registers the plugins

If your config already registers these plugins, for example through `typescript-eslint`'s configs, or sets `parserOptions.project`, use the preset's rules in your own block, as `ts-builds` does:

```js
import functypeConfig from "eslint-config-functype"

export default [
  // ...your parser and plugin setup
  { files: ["**/*.ts"], rules: functypeConfig.configs.recommended.rules },
  functypeConfig.configs.testOverrides,
]
```

Two things fail when the whole preset sits beside such a config:

- **Two copies of a plugin.** ESLint accepts a plugin registered twice only when both are the same object. With one copy of each plugin installed, they are. When your direct `@typescript-eslint/eslint-plugin` is a different version from the one `typescript-eslint` depends on, npm installs two, and ESLint stops with `Cannot redefine plugin "@typescript-eslint"`. Align the versions, or use the rules as above.
- **`project` beside `projectService`.** typescript-eslint rejects a file whose `parserOptions` set both: `Enabling "project" does nothing when "projectService" is enabled`. Drop `project`, or use the rules as above.

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

For test files (`*.test.ts`, `*.spec.ts` and their `.tsx`, `.mts`, `.cts` forms, `test/**`, `tests/**`, `__tests__/**`). Put it after `recommended` or `strict`, so it wins. It turns off the two rules that misread a test's shape:

- `@typescript-eslint/require-await`: tests stub async contracts with async functions that never await.
- `@typescript-eslint/no-unnecessary-condition`: tests probe values the types say are present, with `?.` and `??` in assertions.

It changes nothing else. `eslint-plugin-functype` has a `tests` config for its own rules.

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
