# eslint-plugin-functype

Custom ESLint rules for functional TypeScript with [functype](https://github.com/jordanburke/functype). Encourages idiomatic functype patterns like `Option`, `Either`, `List`, `Do` notation, and safe data access.

## Install

```bash
npm install -D eslint-plugin-functype eslint
```

## Usage

```js
// eslint.config.mjs
import functype from "eslint-plugin-functype"

export default [functype.configs.recommended]
```

### Strict mode

```js
import functype from "eslint-plugin-functype"

export default [functype.configs.strict]
```

## Rules

| Rule                           | Recommended | Strict | Description                                              |
| ------------------------------ | :---------: | :----: | -------------------------------------------------------- |
| `functype/prefer-option`       |    warn     | error  | Use `Option`/`Some`/`None` instead of `null`/`undefined` |
| `functype/prefer-either`       |    warn     | error  | Use `Either`/`Left`/`Right` for typed domain errors      |
| `functype/prefer-try`          |    warn     | error  | Prefer `Try(() => …)` for computations that may throw    |
| `functype/prefer-fold`         |    warn     |  warn  | Use `fold`/`match` instead of manual unwrapping          |
| `functype/prefer-map`          |    warn     |  warn  | Use `map` instead of manual option/either checks         |
| `functype/prefer-flatmap`      |    warn     |  warn  | Use `flatMap` instead of nested `map`                    |
| `functype/no-imperative-loops` |    warn     |  warn  | Use `List` methods instead of imperative loops           |
| `functype/prefer-do-notation`  |    warn     |  warn  | Use `Do` notation for chained operations                 |
| `functype/no-get-unsafe`       |     off     | error  | Disallow unsafe `.get()` on `Option`/`Either`            |
| `functype/prefer-list`         |     off     |  warn  | Use `List` instead of native arrays                      |

## Rule options

### `functype/prefer-list`

| Option                | Default | Description                                                                                                                                                                                                                                                                                               |
| --------------------- | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowArraysInTests`  | `true`  | Silence the rule inside test files (`.test.ts`, `.spec.ts`, `__tests__/`, `/test/`, `/tests/`).                                                                                                                                                                                                           |
| `allowReadonlyArrays` | `true`  | When `true`, `ReadonlyArray<T>` **and** `readonly T[]` pass. When `false`, both are flagged consistently. Use `false` in combination with `Wire<T>` from `functype` to hold the rule at `error` — every unmarked `ReadonlyArray<T>` becomes a lint error and `Wire<T>` is the sole explicit escape hatch. |
| `allowArrayLiterals`  | `false` | When `true`, `const xs = [1, 2, 3]` is not reported. Useful when you want type-position enforcement but tolerate idiomatic literals like `[...map.entries()]`. Mutable `T[]` in type positions is always reported regardless.                                                                             |

**Boundary recipe (recommended for codebases touching serialization boundaries):**

```jsonc
{
  "functype/prefer-list": ["error", { "allowReadonlyArrays": false }],
}
```

Then annotate boundaries with `Wire<T>` from `functype`:

```ts
import type { Wire } from "functype"
type ClaimedDoc = Wire<Row>
```

`Wire<T>` is `ReadonlyArray<T>` structurally, so no casts. The syntactic rule ignores unrecognized type names — `Wire<T>` passes for free, and consumer aliases stack cleanly.

### `functype/no-get-unsafe`

| Option          | Default                                                | Description                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowInTests`  | `true`                                                 | Silence the rule inside test files (same predicate as above).                                                                                                                                     |
| `unsafeMethods` | `["orThrow", "expect", "get", "getOrThrow", "unwrap"]` | Method names flagged when called on a suspected `Option` / `Either` / other `Extractable` receiver. Includes both current (`orThrow`, `expect`) and legacy (`get`, `getOrThrow`, `unwrap`) names. |

The rule reports each match with two suggestions — `.orElse(default)` for value fallback and `.fold(onNone, onSome)` for branch handling. There is no autofix: the correct replacement depends on human judgment about a default value, and `.expect(msg)` / `.orThrow(err)` would silently lose their argument. Apply a suggestion explicitly in your editor when you know which one fits.

## Combining with eslint-config-functype

For a complete setup with functional rules, TypeScript, Prettier, and import sorting:

```bash
npm install -D eslint-config-functype eslint-plugin-functype
```

```js
import recommended from "eslint-config-functype/recommended"
import testOverrides from "eslint-config-functype/test-overrides"
import functype from "eslint-plugin-functype"

export default [recommended, functype.configs.recommended, testOverrides]
```

## License

MIT
