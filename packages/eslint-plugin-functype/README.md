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
| `functype/prefer-either`       |    warn     | error  | Use `Either`/`Right`/`Left` instead of throwing          |
| `functype/prefer-fold`         |    warn     |  warn  | Use `fold`/`match` instead of manual unwrapping          |
| `functype/prefer-map`          |    warn     |  warn  | Use `map` instead of manual option/either checks         |
| `functype/prefer-flatmap`      |    warn     |  warn  | Use `flatMap` instead of nested `map`                    |
| `functype/no-imperative-loops` |    warn     |  warn  | Use `List` methods instead of imperative loops           |
| `functype/prefer-do-notation`  |    warn     |  warn  | Use `Do` notation for chained operations                 |
| `functype/no-get-unsafe`       |     off     | error  | Disallow unsafe `.get()` on `Option`/`Either`            |
| `functype/prefer-list`         |     off     |  warn  | Use `List` instead of native arrays                      |

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
