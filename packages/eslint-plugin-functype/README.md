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

| Rule                           | Recommended | Strict | Description                                                                              |
| ------------------------------ | :---------: | :----: | ---------------------------------------------------------------------------------------- |
| `functype/no-let`              |    error    | error  | Use `const`; no reassignment                                                             |
| `functype/no-imperative-loops` |    error    | error  | Use `List`/array methods or `IO.forEach` instead of loops                                |
| `functype/prefer-functype-map` |    error    | error  | Use functype `Map` instead of a native `Map` you only read                               |
| `functype/prefer-functype-set` |    error    | error  | Use functype `Set` instead of a native `Set` you only read                               |
| `functype/collection-naming`   |    error    | error  | Import functype's `Map`/`Set` under their own names; spell the built-in `globalThis.Map` |
| `functype/prefer-map`          |    error    | error  | Use `map` instead of pushing inside `forEach`                                            |
| `functype/prefer-fold`         |    error    | error  | Use `fold` instead of branching on `isSome()`/`isLeft()`/…                               |
| `functype/prefer-option`       |    warn     | error  | Use `Option` instead of `null`/`undefined`                                               |
| `functype/prefer-either`       |    warn     | error  | Use `Either` for typed domain errors instead of `throw`                                  |
| `functype/prefer-try`          |    warn     | error  | Use `Try` / `Try.fromPromise` instead of try/catch                                       |
| `functype/prefer-flatmap`      |    warn     |  warn  | Use `flatMap` instead of `map().flat()`                                                  |
| `functype/prefer-do-notation`  |    warn     |  warn  | Use `Do` notation for chained operations                                                 |
| `functype/no-get-unsafe`       |     off     | error  | Disallow unsafe extraction (`.orThrow()`, `.expect()`)                                   |
| `functype/prefer-list`         |     off     |  warn  | Use `List` instead of native arrays                                                      |

### Severity policy

A rule is **`error` in `recommended` once it is right on ~95–99% of real code**, meaning its known false-positive classes are closed. It stays `warn` only while those classes are still open. FP here is governance: a rule that is reliably right should fail the build, not print advice nobody reads. Expect `recommended` to get stricter as boundary markers (`Wire<T>`, `@interop`) close the remaining cases for `prefer-option`, `prefer-either` and `prefer-try`.

`prefer-fold` reports only; its rewrite is a suggestion you apply, never an autofix, so `eslint --fix` can't change code on your behalf.

## Throwing on purpose: `invariant()` and `@interop`

`prefer-either` reports every `throw`. Two kinds of throw are correct, and each has its own tool:

| The throw is…                                                                                                   | Use                                                           |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A bug check: the condition can only fail because of a programmer error                                          | `invariant(cond, msg)` from `functype`                        |
| A host contract: the caller (React `use()`, React Query, a step runner, an MCP tool) needs a throw or rejection | `@interop <reason>` on the declaration, or `orThrow(builder)` |
| Anything that can fail in normal operation                                                                      | return an `Either`                                            |

```ts
import { invariant } from "functype"

function deriveRunId(workflowId: string, step: number): string {
  invariant(step >= 0, "step must be non-negative") // a call, not a throw: nothing to report
  return `${workflowId}:${step}`
}

/**
 * Runs the effect, or throws a boxed error.
 *
 * @interop React Query signals failure only by promise rejection; an Either return reads as success.
 */
const runBoxed = async <E, A>(effect: () => IO<never, E, A>): Promise<A> => { … }

// A host throw built from the failure, with no tag at all:
const value = either.orThrow((left) => new StepError(left.message))
```

`invariant()` covers one statement and narrows the condition for the code after it, so a function can mix bug checks with `Either`-returning failures. `@interop` rules:

- **Scope:** the tagged declaration and everything nested in it. That can be a function, `const`, method, class field, object property, type alias or interface. A sibling declaration is not covered. Honored by `prefer-either`, `prefer-option`, `prefer-fold` and `prefer-try`.
- **The reason is required**, on the same line as the tag. A bare `@interop` exempts nothing.
- **Only JSDoc (`/** … */`) counts.** A `//` comment mentioning the tag does not.
- **Opt out** per rule with `allowInteropMarker: false`.

Prefer either tool to `eslint-disable`. A disable covers a whole file or line and says only "be quiet". `rg 'invariant\('` lists every bug check, and `rg '@interop'` lists every place the code touches a throw-based host.

## Rule options

### `functype/prefer-list`

| Option                | Default | Description                                                                                                                                                                                                                                                                                                                       |
| --------------------- | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowArraysInTests`  | `true`  | Silence the rule inside test files (`.test.ts`, `.spec.ts`, `__tests__/`, `/test/`, `/tests/`).                                                                                                                                                                                                                                   |
| `allowReadonlyArrays` | `true`  | When `true`, `ReadonlyArray<T>` **and** `readonly T[]` pass. When `false`, both are flagged consistently. Use `false` in combination with `Wire<T>` from `functype` to hold the rule at `error` — every unmarked `ReadonlyArray<T>` becomes a lint error, and wrapping a boundary type in `Wire<…>` is the explicit escape hatch. |
| `allowArrayLiterals`  | `false` | When `true`, `const xs = [1, 2, 3]` is not reported. Useful when you want type-position enforcement but tolerate idiomatic literals like `[...map.entries()]`. Mutable `T[]` in type positions is always reported regardless.                                                                                                     |

**Boundary recipe (recommended for codebases touching serialization boundaries):**

```jsonc
{
  "functype/prefer-list": ["error", { "allowReadonlyArrays": false }],
}
```

Then annotate boundaries with `Wire<T>` from `functype`:

```ts
import type { Wire } from "functype"
type ClaimedDocs = Wire<ReadonlyArray<Row>>
type UserRow = Wire<{ readonly email: string | null; readonly tags: ReadonlyArray<string> }>
```

`Wire<T>` is assignable both ways with the plain type, so no casts. `prefer-list` and `prefer-option` skip everything inside a `Wire<…>` type argument (`wireTypes` option, default `["Wire"]`; `[]` turns it off), and consumer aliases stack cleanly.

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

**A declared native read-only contract is also exempt.** The rules never report a `ReadonlyMap` / `ReadonlySet` annotation, so they don't report the constructor such an annotation requires. A `new Map(...)` / `new Set(...)` is skipped when its value flows directly into:

- a `return` in the nearest function declared to return `ReadonlyMap<…>` (or `Promise<ReadonlyMap<…>>`);
- the expression body of an arrow function with that return type;
- a variable, class field or parameter default annotated `ReadonlyMap<…>`;
- an `as ReadonlyMap<…>` / `satisfies ReadonlyMap<…>` assertion;
- any of the above through a ternary branch or a `??` / `||` / `&&` operand.

This is the escape for an interface that takes a native `ReadonlyMap` — declare the type, don't disable the rule. A callback nested inside such a function doesn't inherit its signature, and a mutable `Map<K, V>` annotation is still reported. To hand a functype `Map` to such an interface, put the conversion in one typed helper: `const toReadonly = <K, V>(m: Map<K, V>): ReadonlyMap<K, V> => new globalThis.Map(m)`.

**The built-in is spelled `globalThis.Map` / `globalThis.Set`.** `new globalThis.Map()` and `new ESMap()` are reported like a bare `new Map()`, with the same exemptions. Imports are resolved where `Map` / `Set` is used: functype's import (any name) or a local shadow isn't the built-in.

### `functype/collection-naming`

functype's `Map` / `Set` are the default collections (the Scala convention: the immutable collection owns the plain name). This rule reports:

- `new Map()` on functype's `Map` (or `Set`). It's a factory, so TypeScript only says TS7009 ("target lacks a construct signature"). The message says to write `Map(…)` / `Map.empty()`, or `new globalThis.Map(…)` for the built-in.
- `import { Map as FMap } from "functype"`. An alias lets the plain name keep meaning the built-in, which inverts the convention and drifts between files.

| Option       | Default | Description                                                                                                          |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `allowAlias` | `false` | Accept aliased imports of functype's `Map` / `Set`, for a codebase that prefers the built-ins under the plain names. |

It applies in test files too: tests are read as examples.

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
