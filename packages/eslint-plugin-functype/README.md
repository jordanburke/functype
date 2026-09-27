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

| Rule                           | Recommended | Strict | Description                                                |
| ------------------------------ | :---------: | :----: | ---------------------------------------------------------- |
| `functype/no-let`              |    error    | error  | Use `const`; no reassignment                               |
| `functype/no-imperative-loops` |    error    | error  | Use `List`/array methods or `IO.forEach` instead of loops  |
| `functype/prefer-functype-map` |    error    | error  | Use functype `Map` instead of a native `Map` you only read |
| `functype/prefer-functype-set` |    error    | error  | Use functype `Set` instead of a native `Set` you only read |
| `functype/prefer-map`          |    error    | error  | Use `map` instead of pushing inside `forEach`              |
| `functype/prefer-fold`         |    error    | error  | Use `fold` instead of branching on `isSome()`/`isLeft()`/… |
| `functype/prefer-option`       |    warn     | error  | Use `Option` instead of `null`/`undefined`                 |
| `functype/prefer-either`       |    warn     | error  | Use `Either` for typed domain errors instead of `throw`    |
| `functype/prefer-try`          |    warn     | error  | Use `Try` / `Try.fromPromise` instead of try/catch         |
| `functype/prefer-flatmap`      |    warn     |  warn  | Use `flatMap` instead of `map().flat()`                    |
| `functype/prefer-do-notation`  |    warn     |  warn  | Use `Do` notation for chained operations                   |
| `functype/no-get-unsafe`       |     off     | error  | Disallow unsafe extraction (`.orThrow()`, `.expect()`)     |
| `functype/prefer-list`         |     off     |  warn  | Use `List` instead of native arrays                        |

### Severity policy

A rule is **`error` in `recommended` once it is right on ~95–99% of real code**, meaning its known false-positive classes are closed. It stays `warn` only while those classes are still open. FP here is governance: a rule that is reliably right should fail the build, not print advice nobody reads. Expect `recommended` to get stricter as boundary markers (`Wire<T>`, `@interop`) close the remaining cases for `prefer-option`, `prefer-either` and `prefer-try`.

`prefer-fold` reports only; its rewrite is a suggestion you apply, never an autofix, so `eslint --fix` can't change code on your behalf.

## Boundary markers: `@interop` and `@invariant`

Some code is correct _because_ it isn't FP-shaped: a bridge to a host whose contract is the throw, the rejection or the nullable. Mark the declaration instead of disabling the rule:

```ts
/**
 * Runs the effect, or throws a boxed error.
 *
 * @interop React Query signals failure only by promise rejection; an Either return reads as success.
 */
const runBoxed = async <E, A>(effect: () => IO<never, E, A>): Promise<A> => { … }

/** @invariant Called only inside a DBOS step, where every argument is already validated. */
function deriveRunId(workflowId: string, step: number): string {
  if (step < 0) throw new Error("step must be non-negative")
  …
}
```

| Tag                   | Honored by                                                    | Means                                                                                                              |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@interop <reason>`   | `prefer-either`, `prefer-option`, `prefer-fold`, `prefer-try` | This declaration bridges functype to a host (React, React Query, an SDK) whose contract requires the non-FP shape. |
| `@invariant <reason>` | `prefer-either`                                               | This declaration throws only for programmer errors, never for expected failures.                                   |

- **Scope:** the tagged declaration and everything nested in it. That can be a function, `const`, method, class field, object property, type alias or interface. A sibling declaration is not covered.
- **The reason is required**, on the same line as the tag. A bare `@interop` exempts nothing.
- **Only JSDoc (`/** … */`) counts.** A `//` comment mentioning the tag does not.
- **Opt out** per rule with `allowInteropMarker: false` / `allowInvariantMarker: false`.

Prefer a marker to `eslint-disable`. A disable covers a whole file or line and says only "be quiet". A marker covers one declaration, carries its reason, and `rg '@interop'` gives the complete inventory of places the code touches a throw-based host.

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

### `functype/prefer-fold`

| Option          | Default | Description                                                                                                                                                                                                        |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `minComplexity` | `2`     | Minimum if/else chain length (root + branches) before it is reported.                                                                                                                                              |
| `checkNullable` | `false` | Also report null checks on plain values (`x === null ? a : b`). Off because whether `x` should be an `Option` is `prefer-option`'s call; at `error` this path fired on JSX, style objects and conditional spreads. |

Reports only; the rewrite is a **suggestion, never an autofix**. A fold rewrite can't be proven type-correct without type information, and `eslint --fix` applies fixable rules at warn severity too, so an autofix here would rewrite working code during `validate`. The suggestion reads narrowed values through the fold's parameters (`e.value` after `isLeft()` becomes `left`), omits unused parameters, keeps `return` on if/else chains, parenthesizes object-literal branches, and offers `a.or(b)` for `a.isSome() ? a : b`. Rewrites follow the syntax tree, so text inside strings, template literals and comments is left alone. No suggestion is offered when the rewrite would drop a comment or could not type-check (`a.isSome() ? a : 5`). Suggestions are applied by hand, so review each one: the rule has no type information and can't prove the result compiles.

### `functype/prefer-option`

| Option          | Default | Description                                                                                              |
| --------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `allowUseState` | `true`  | Don't report `T \| null` inside the type argument of `useState` / `useRef` (bare or `React.`-qualified). |

`null` is idiomatic React state, and an `Option` there fights the hook's own API. Nullable component parameters and props are still reported.

### `functype/prefer-map`

| Option              | Default | Description                                                                                                    |
| ------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `checkArrayMethods` | `true`  | Report `.push` inside `forEach` callbacks and `forEach` used as a map.                                         |
| `checkForLoops`     | `false` | Also report `for`/`for..of`/`for..in` loops that push. Off because `no-imperative-loops` already reports them. |

### `functype/prefer-functype-set` / `functype/prefer-functype-map`

| Option         | Default | Description                                                                                     |
| -------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `allowInTests` | `true`  | Silence the rule inside test files.                                                             |
| `allowMutable` | `true`  | Don't report a native `Set`/`Map` the code mutates on purpose. Set `false` to report it anyway. |

A collection counts as mutated when `.add` / `.delete` / `.clear` (Set) or `.set` / `.delete` / `.clear` (Map) is called on it, including `x!.add(…)`. The call can be made:

- directly on a `new` expression that copies something (`new Set(prev).add(id)`, the React copy-then-add). An empty-`new` builder chain like `new Map().set(a, 1).set(b, 2)` is not exempt; use `Map.of` / `Set.of`.
- directly through the variable, parameter or later-assigned `let` holding it, in any nested scope.
- through `this.<field>` in the owning class: a field initializer, a constructor assignment, or a constructor parameter property.

Not followed: aliases (`const t = s; t.add(x)`), `useRef(new Set()).current.add(x)`, a mutator passed as a callback (`xs.forEach(seen.add, seen)`), and a collection passed into another function. Those are still reported.

functype's collections are immutable, so a cache, registry or in-place accumulator can't use them. A native collection that is only read (`.has`, `.get`, iteration) is still reported.

### `functype/no-imperative-loops` / `functype/prefer-map`

These rules don't report loops that have no functional equivalent:

- `for await` consumes a stream, and collecting it first would defeat the streaming.
- A loop whose body `yield`s is a generator's body, and a callback can't yield.

A loop whose body `await`s is still reported by `no-imperative-loops`, which points at `IO.forEach`. `prefer-map` doesn't report it.

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
