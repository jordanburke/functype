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

### Agent mode

For code a coding agent writes. An agent acts on what fails its build and passes over a warning, so `agent` has no warnings: every rule is `error` or `off`.

```js
import functype from "eslint-plugin-functype"

export default [functype.configs.agent]
```

- **`error`:** everything `strict` errors on, plus `no-floating-io` and the two React rules, which `strict` still warns on while they're measured. A forgotten `.run()` or a throw in render is the kind of mistake an agent makes and a reviewer misses.
- **`off`:** `prefer-flatmap` and `prefer-do-notation`, whose precision is unmeasured. At `error` they would teach an agent to write `eslint-disable`. Each moves to `error` once it's measured. `prefer-list` is off too: with type-aware linting, `no-array-mutation`, at `error`, covers its in-place-change case, and the rest asks for `ReadonlyArray<T>` types, a typing choice `strict` keeps at `warn`.
- `prefer-option`, `prefer-either` and `prefer-try` are `error`, as in `strict`. At a real boundary the agent marks it instead: `@interop <reason>` or `invariant()` for a throw (see below), `Wire<T>` for a data shape.
- `no-array-mutation` and `no-floating-io` need type-aware linting (typescript-eslint's parser with `parserOptions.projectService`). Without it they report nothing.
- Make sure the agent runs lint. An error it never sees doesn't steer it, so put `eslint` in the check it runs before it's done, such as `pnpm validate`.

## Rules

| Rule                                     | Recommended | Strict | Agent | Description                                                                                  |
| ---------------------------------------- | :---------: | :----: | :---: | -------------------------------------------------------------------------------------------- |
| `functype/no-let`                        |    error    | error  | error | Use `const`; no reassignment                                                                 |
| `functype/no-imperative-loops`           |    error    | error  | error | Use `List`/array methods, async traversal or `IO.forEach` instead of loops                   |
| `functype/prefer-functype-map`           |    error    | error  | error | Use functype `Map` instead of a native `Map` you only read                                   |
| `functype/prefer-functype-set`           |    error    | error  | error | Use functype `Set` instead of a native `Set` you only read                                   |
| `functype/collection-naming`             |    error    | error  | error | Import functype's `Map`/`Set` under their own names; spell the built-in `globalThis.Map`     |
| `functype/prefer-map`                    |    error    | error  | error | Use `map` instead of pushing inside `forEach`                                                |
| `functype/prefer-fold`                   |    error    | error  | error | Use `fold` instead of branching on `isSome()`/`isLeft()`/…                                   |
| `functype/prefer-option`                 |    warn     | error  | error | Use `Option` instead of `null`/`undefined`                                                   |
| `functype/prefer-either`                 |    warn     | error  | error | Use `Either` for typed domain errors instead of `throw`                                      |
| `functype/prefer-try`                    |    warn     | error  | error | Use `Try` / `Try.fromPromise` instead of try/catch                                           |
| `functype/prefer-flatmap`                |    warn     |  warn  |  off  | Use `flatMap` instead of `map().flat()`                                                      |
| `functype/prefer-do-notation`            |    warn     |  warn  |  off  | Use `Do` notation for chained operations                                                     |
| `functype/no-get-unsafe`                 |     off     | error  | error | Disallow unsafe extraction (`.orThrow()`, `.expect()`)                                       |
| `functype/prefer-list`                   |     off     |  warn  |  off  | Use `List` instead of native arrays                                                          |
| `functype/no-array-mutation`             |     off     | error  | error | Don't change an array in place (`push`, `sort`, `xs[i] = v`…); build a new one               |
| `functype/no-floating-io`                |     off     |  warn  | error | Don't build an `IO` and drop it, or `await` it unrun; run, return or `yield*` it             |
| `functype/no-floating-result`            |     off     | error  | error | Don't drop an `Either`/`Try` result; a failure in it is silently ignored                     |
| `functype/no-getOrThrow-in-render`       |     off     |  warn  | error | React: no bare `.orThrow()` in a component or hook body; a throw in render unmounts the tree |
| `functype/must-fold-on-component-return` |     off     |  warn  | error | React: render an `Option`/`Either`/`Try` with `fold` or `<MatchOption>`, not a guard or `&&` |

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

- **Scope:** the tagged declaration and everything nested in it. That can be a function, `const`, method, class field, object property, type alias or interface. A sibling declaration is not covered. Honored by `prefer-either`, `prefer-option`, `prefer-fold`, `prefer-try`, `no-get-unsafe`, `no-getOrThrow-in-render` and `must-fold-on-component-return`.
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

**What it reports.** The defect is a collection that can change under you, so:

- **A mutable `T[]` / `Array<T>` type.** The first suggestion is `ReadonlyArray<T>`, which every caller and library accepts; `List<T>` is second, for a collection you transform. With `allowReadonlyArrays: true` (the default) one accepted suggestion silences the report, so in practice the rule asks for read-only types; set it to `false` with `Wire<T>` at boundaries to push towards `List`.
- **An array changed in place** (`push`, `sort`, `splice`, `x[i] = …`, on a binding, a literal accumulator or a field). This gets advice instead of a suggestion, because `ReadonlyArray` wouldn't compile there: build it with `map` / `filter` / `flatMap`, a `List`, or a fold. (This only fires where the rule has an annotation or a literal to hook onto; an inferred array that's pushed to isn't seen.)
- **A cast of untyped data to an array** (`JSON.parse(raw) as Row[]`, `raw as Row[]` after `Array.isArray`), with type information. Decoded outside data belongs in a `Wire<ReadonlyArray<Row>>` shape.
- **An array literal that becomes a collection in your own code** (stored, then transformed with `map` / `filter` / `slice` / `reduce`), with type information.

**What it leaves alone.** Data handed to a library in the shape the library demands isn't yours to change. With type-aware linting (`projectService`) the rule skips:

- a literal passed where an array is expected (drizzle `.values([...])`, an index definition, a prop typed as an array, a parameter typed `Iterable`), or spread into a call (`and(...conds)`);
- a literal inside an object passed to an untyped parameter (a `JSON.stringify` request body), or to a generic one that doesn't hand it back (`c.json<T>(data: T)`). A generic that returns the argument (`useState(init)`, including React's `S | (() => S)` signature, `identity(x)`, `Promise<T>`) leaves the shape with you, so it's reported;
- a method chain whose result goes to JSX children or an array slot (`{["PDF", "DOCX"].map((f) => <Chip />)}`);
- a mutable type whose value goes to a slot that **requires** a mutable array (pg's `query(text, values: unknown[])`, an SDK option typed `string[]`), including through a function's declared return type;
- a `const` whose every use is one of those, or a single-value read.

**Single-value reads** are temporaries, with or without type information: `.length`, `[i]`, `join` / `includes` / `indexOf` / `some` / `every` / `find` / `at`, and chains that end in one (`[a, b].filter(Boolean).join(" ")`, `[...xs].sort(byRank)[0]`). A chain that produces another collection is collection work and is reported.

**Without type information, array literals aren't reported at all.** The rule can't tell a literal handed to a library from one of your own, so it reports neither rather than guess. Type positions and in-place mutation are still reported. Turn on type-aware linting to get literal checks.

Also skipped: `as const` and other tuple assertions, tuple rest elements (`[string, ...string[]]`), rest parameters (`...args: T[]`), literals passed straight into `List(…)` / `Set(…)`, and files marked generated (`@generated`, "auto-generated", "DO NOT EDIT"). Generators with no marker, such as Supabase's types, need an `ignores` entry. Anything still reported that is a deliberate host shape gets `Wire<…>`.

Measured on five consumers (2026-10-10), with type-aware linting: **2,000 hits under 2.114, 696 after.** By repo, before → after: CivalaOS 821 → 215, agent-todo 843 → 328, dokploy-mcp-server 170 → 68, ts-builds 111 → 43, supabase-typed-query 55 → 42. Known false positives left: 25 hits in agent-todo's unmarked Supabase types (an `ignores` entry), one nested ReactFlow return type (`Wire`), one AWS SES request built in an untyped object. Linting all of CivalaOS with the rule on takes about 18 seconds.

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

### `functype/no-array-mutation`

Reports changing an array in place:

- the methods `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill` and `copyWithin`;
- assigning to an element (`xs[i] = v`, `xs[i] += 1`, `xs[i]++`);
- `delete xs[i]`;
- setting `length`.

It catches the mutation wherever the array came from, including an inferred `const rows = load(); rows.push(x)`, which `prefer-list` can't see because there's no annotation or literal.

```ts
rows.push(row) // reported → [...rows, row], or build rows with map / flatMap
xs.sort(byRank) // reported → xs.toSorted(byRank)
xs[i] = v // reported → xs.with(i, v)
const sorted = [...xs].sort(byRank) // fine: sorts a fresh copy
```

**It only runs with type-aware linting** (`parserOptions.projectService`). It checks the receiver's type, so `push` on a queue class, a `Set` or an `any` value is never mistaken for an array. Without type information it reports nothing.

**What it skips:**

- mutating a value assumed fresh on the spot: a literal or any call result (`[...xs].sort()`, `xs.slice().reverse()`, `(await load()).sort()`). This also misses a call that returns a shared array (`getSharedCache().push(x)`), a recall gap the rule accepts to stay free of false positives;
- `ReadonlyArray`, which the compiler already guards.

For a host that has to mutate, such as a charting library that takes the array it fills, tag the function `@interop <reason>`.

| Option               | Default | Description                                                |
| -------------------- | ------- | ---------------------------------------------------------- |
| `allowInTests`       | `true`  | Silence the rule inside test files.                        |
| `allowInteropMarker` | `true`  | Skip code inside a declaration tagged `@interop <reason>`. |

Measured on five consumers (2026-10-10): 91 hits, every one a real in-place mutation. Most were `push` accumulators building a list or a Markdown body line by line; the rest were `sort` on a named array and element assignment. It's `off` in `recommended` until 2.0, to avoid failing builds on a 1.x upgrade.

### `functype/no-floating-io`

Reports an `IO` that is built and never run, so it does nothing:

- an expression statement whose value is an `IO`;
- `await` on an `IO`. `IO` is not a Promise, so `await io` hands back the `IO` itself, unrun.

`no-floating-promises` and `await-thenable` miss both, because `IO` isn't thenable.

```ts
log.info("saved") // reported, when info returns an IO → yield* it, or .run() it
save(user).tap(audit) // reported → return it, or run it
const user = await loadUser(id) // reported: user is the IO → await loadUser(id).runOrThrow()
return save(user) // fine: the caller runs it
void save(user) // fine: a deliberate drop
```

**It only runs with type-aware linting** (`parserOptions.projectService`). It recognizes `IO` by its type (it has `runExit` and `provideLayer`), whatever the call is named. Without type information it reports nothing.

Measured (2026-10-16) on functype's own source and tests, functype-log, functype-react, agent-todo's agent-gate-api and civala.ai's API: 0 false positives across about 1,340 IO-typed calls. The only hits were four deliberate drops in type-only tests. It's `off` in `recommended` and `warn` in `strict` while it is measured further.

### `functype/no-floating-result`

Reports a statement that computes a result that can carry a failure, such as an `Either` or `Try`, and drops it. A `Left` or `Failure` in it is silently ignored. `no-floating-promises` doesn't help: awaiting the promise satisfies it while the result inside is thrown away.

```ts
await userService.updateSubscription(id, plan) // reported: a failed write goes unnoticed
parse(input) // reported, when parse returns an Either
await save(user).run() // reported: run() returns an Either → check it, or use runOrThrow()

const result = await userService.updateSubscription(id, plan) // fine: then check result.isLeft()
await audit.write(entry).tapLeft((e) => log.error(e)) // fine: a best-effort write that logs its failure
void (await cache.refresh()) // fine: a deliberate drop
```

- **What counts:** a type, or a member of its union, with `fold` and `isLeft` or `isFailure`. That covers `Either`, `Try`, `Exit`, `Validation`, `Task`'s result (`TaskOutcome`) and Either-shaped wrappers such as a `ServiceResult`. An ignored `Option` or `List` loses no error, so it isn't reported. An `IO` that is never run is `no-floating-io`'s.
- **Handled chains:** a chain that passes through `.tapError(…)` or `.tapLeft(…)` isn't reported, because it handles its failure. A `.flatMap(…)` after the handler can bring in a new failure, so that chain is reported again. `Try` has no failure tap, so mark a deliberate `Try` drop with `void`.
- **Tests:** a test that calls something for its side effect and then checks mocks is reported too. Assert on the result, or turn the rule off for test files.
- **Not seen yet:** a drop inside a callback, such as `xs.forEach((x) => save(x))`, or in the first part of a comma expression, isn't its own statement, so it isn't reported. `ok && save(x)` and `ok ? a() : b()` are.

**It only runs with type-aware linting** (`parserOptions.projectService`). Without type information it reports nothing.

Measured (2026-10-30) on agent-todo's agent-gate-api, which kept a hand-written check for this: at the commit that added that check, the rule reports 20 drops in production code. agent-todo fixed every one of them as a real bug, among them 8 in the Stripe webhook handler, where a failed write still answered Stripe 200. On the current code, after those fixes, it reports none in production code and 12 in tests. functype-os, functype-log, functype-react, functype-eval and functype-mcp-server report none. It's `error` in `strict` and `agent`, and `off` in `recommended`, where it moves to `error` in 2.0.

### React rules

Two rules are for React code. They fire only inside a **component** (a function named in PascalCase whose body has JSX, including one wrapped in `memo` or `forwardRef`) or a **hook** (a function named `use` + a capital letter), so other code rarely trips them. The one exception is a non-React function whose name starts with `use` + a capital letter, which is read as a hook. Both are `off` in `recommended` and `warn` in `strict` while they're measured on real React code. To turn them on with `recommended`:

```js
import functype from "eslint-plugin-functype"

export default [
  functype.configs.recommended,
  {
    files: ["**/*.tsx", "**/*.jsx"],
    rules: {
      "functype/no-getOrThrow-in-render": "error",
      "functype/must-fold-on-component-return": "warn",
    },
  },
]
```

Both work without type information. With it (`parserOptions.projectService`), the receiver must also be a functype container, so an unrelated object that happens to have an `orThrow` or `isSome` method is not reported.

Only the component's or hook's own body counts as render. An event handler, an effect, or a callback passed to `.map` is a separate function, so a call there is not reported. That also means a call inside a callback that does run during render (`useMemo(() => …)`, `items.map((o) => o.orThrow())` in JSX) is missed: the rules prefer missing a case to reporting valid code.

### `functype/no-getOrThrow-in-render`

Reports a bare `.orThrow()` (or the older `.getOrThrow()`) in a component or hook body. When the value is missing it throws during render, and React unmounts the tree up to the nearest error boundary.

```tsx
function Profile({ user }: { user: Option<User> }) {
  const u = user.orThrow() // reported → user.fold(() => <SignIn />, (u) => <Card user={u} />)
  return <Card user={u} />
}

user.isSome() ? <Card user={user.orThrow()} /> : null // fine: guarded, it can't throw
if (user.isNone()) return null // …and every later user.orThrow() in this body is guarded too
const u = user.orThrow((e) => new NotFound(e)) // fine: a named error, sent to the error boundary on purpose
<button onClick={() => save(user.orThrow())} /> // fine: an event handler runs after render
```

A call is guarded when its test proves the value is there on the same receiver:

- it sits in the branch of an `if`, a ternary, an `&&` or an `||` that only runs once the value is there: `user.isSome() ? … : …`, `!user.isSome() ? null : …`, `busy && user.isSome() ? … : …`, `user.isNone() || …`;
- it comes after a statement that only lets control past once the value is there: an early `return` / `throw` on the missing case (`if (!user.isSome()) return null`, `if (busy || user.isNone()) return <Spinner />`, `if (user.isEmpty) return null`), an if / else-if chain whose branches all exit, or `invariant(user.isSome(), "…")`.

The test can be `isSome()` / `isRight()` / `isSuccess()`, their opposites, `isEmpty`, and `!`, `&&` and `||` over them. `.expect(handler)` is not reported, because its handler is the chosen throw. The rule is named after `getOrThrow`, the method's older name; functype's containers spell it `orThrow`.

| Option               | Default | Description                                                 |
| -------------------- | :-----: | ----------------------------------------------------------- |
| `allowInteropMarker` | `true`  | Skip calls inside a declaration tagged `@interop <reason>`. |

`no-get-unsafe` reports the same calls anywhere. This rule is narrower and more confident: it reports only where the throw lands in render.

### `functype/must-fold-on-component-return`

Reports a component that chooses what it renders by asking an `Option`, `Either` or `Try` which case it holds, in the two shapes `prefer-fold` doesn't report at its default options:

- an **early return**: `if (user.isNone()) return <SignIn />` (or `return null`, `if (!user.isSome())`, `if (busy || user.isNone())`), with the other case rendered below it;
- a **short-circuit**: `{user.isSome() && <Card />}`, which renders one case and silently drops the other.

```tsx
function Profile({ user }: { user: Option<User> }) {
  if (user.isNone()) return <SignIn /> // reported
  return <Card user={user.orThrow()} />
}

// → one expression for both cases:
return user.fold(
  () => <SignIn />,
  (u) => <Card user={u} />,
)
// → or, from functype-react:
return <MatchOption value={user} Some={(u) => <Card user={u} />} None={() => <SignIn />} />

const header = <h1>{user.isSome() && <Badge />}</h1> // reported → {user.fold(() => null, () => <Badge />)}
```

The message names the `Match` component that fits: `<MatchOption>` for `isSome`/`isNone`, `<MatchEither>` for `isLeft`/`isRight`, `<MatchTry>` for `isSuccess`/`isFailure`.

A ternary or an if/else on a predicate is `prefer-fold`'s, everywhere, so this rule leaves it alone rather than report it twice. If you turn on `prefer-fold`'s `checkGuards`, an early return followed by an unwrap is reported by both rules. Only a predicate _call_ counts: `state.isPending` on a `useIO` result and `items.isEmpty` are properties, and are never reported. A guard that does other work before it returns, or returns something other than JSX or `null`, is not reported either. The rule reports only; there are no suggestions, because the rewrite moves code between branches.

| Option               | Default | Description                                                |
| -------------------- | :-----: | ---------------------------------------------------------- |
| `allowInteropMarker` | `true`  | Skip code inside a declaration tagged `@interop <reason>`. |

Measured (2026-10-25) with both rules on functype-react's source and tests (type-aware), and on agent-todo, mnemons and civala.ai (1,403 files, without type information): no reports. None of that code uses these shapes in a component, and `useIOValue`'s `exit.orThrow()` is guarded by `exit.isSuccess()`, so the measurement shows the false-positive rate, not the hit rate.

### `functype/no-get-unsafe`

| Option               | Default                                                | Description                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowInTests`       | `true`                                                 | Silence the rule inside test files (same predicate as above).                                                                                                                                     |
| `allowInteropMarker` | `true`                                                 | Skip calls inside a declaration tagged `@interop <reason>`, as `prefer-either` does.                                                                                                              |
| `unsafeMethods`      | `["orThrow", "expect", "get", "getOrThrow", "unwrap"]` | Method names flagged when called on a suspected `Option` / `Either` / other `Extractable` receiver. Includes both current (`orThrow`, `expect`) and legacy (`get`, `getOrThrow`, `unwrap`) names. |

**Which receivers count.** With type-aware linting on (`parserOptions.projectService` or `project`), the rule checks the receiver's type: anything with both `orThrow` and `fold` (every functype container) is checked, whatever the variable is called, and a native `Map` named `options` is not. Without type information it falls back to guessing from the receiver's name and shape (`option`, `either`, `result`… or a `.map/.flatMap/.filter/.fold` chain), which misses a container bound to any other name. Turn type-aware linting on if you rely on this rule.

`.orThrow(error)` and `.orThrow((e) => error)` are not reported: the caller chose the error, which is the documented way to throw for a host that needs it (see the decision table above). A bare `.orThrow()` throws a generic error and is reported.

The rule reports each match with two suggestions — `.orElse(default)` for value fallback and `.fold(onNone, onSome)` for branch handling. There is no autofix: the correct replacement depends on human judgment about a default value, and `.expect(msg)` would silently lose its argument. Apply a suggestion explicitly in your editor when you know which one fits.

### `functype/prefer-fold`

| Option          | Default | Description                                                                                                                                                                                                        |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `minComplexity` | `2`     | Minimum if/else chain length (root + branches) before it is reported.                                                                                                                                              |
| `checkNullable` | `false` | Also report null checks on plain values (`x === null ? a : b`). Off because whether `x` should be an `Option` is `prefer-option`'s call; at `error` this path fired on JSX, style objects and conditional spreads. |
| `checkGuards`   | `false` | Also report a guard followed by an unwrap: `if (e.isLeft()) return …` and then `e.value` / `e.orThrow()` / `e.get()` later in the same block. Off while it rolls out: `prefer-fold` is `error` in `recommended`.   |

Reports only; the rewrite is a **suggestion, never an autofix**. A fold rewrite can't be proven type-correct without type information, and `eslint --fix` applies fixable rules at warn severity too, so an autofix here would rewrite working code during `validate`. The suggestion reads narrowed values through the fold's parameters (`e.value` after `isLeft()` becomes `left`), omits unused parameters, keeps `return` on if/else chains, parenthesizes object-literal branches, and offers `a.or(b)` for `a.isSome() ? a : b`. Rewrites follow the syntax tree, so text inside strings, template literals and comments is left alone. No suggestion is offered when the rewrite would drop a comment or could not type-check (`a.isSome() ? a : 5`). Suggestions are applied by hand, so review each one: the rule has no type information and can't prove the result compiles.

**`checkGuards`: guard, then unwrap.** Checking a container with an early exit and then pulling the value out is imperative branching. Getting a value out is fine: `orElse(default)` and `fold` are both proper exits and are never reported. What's reported is the shape below. The message picks its advice from what the guard does:

```ts
if (e.isLeft()) return e // hands the failure back      → e.flatMap(…) / e.map(…)
if (e.isLeft()) return Left({ kind: e.value.kind }) // a new failure → e.mapLeft(…).flatMap(…)
if (o.isNone()) return 0 // a fallback                 → o.map(…).orElse(0), or o.fold(() => 0, …)
if (r.isLeft()) return c.json({ error: r.value }, 500) // fallback reads the failure → r.fold(…), only
if (a.isLeft()) return a
if (b.isLeft()) return b // several in a row → Do(function* () { … })
if (e.isLeft()) throw new Error("x") // a host throw   → e.orThrow((err) => new MyError(err))
if (t.isFailure()) {
  log(t.error)
  return
} // other work first → t.fold(onFailure, onSuccess)
```

`orThrow(error)` / `orThrow((e) => …)` after a guard isn't counted as an unwrap, matching `no-get-unsafe`, which treats a named error as a deliberate host throw. A receiver reassigned after the guard isn't reported. Only the negative predicates (`isLeft` / `isNone` / `isFailure`) are matched; `if (!e.isRight())` isn't yet.

Pass-through guards are the clear case: they are hand-written `flatMap`. Fallback and other-work-first guards are closer to a style choice, since TypeScript narrows `Either` after the guard (Rust's `let-else` and Swift's `guard let` make the same trade). For `Option` and `Try` the guard doesn't narrow `.value`, so the case is stronger there. That split is why this is planned for `strict`, not `recommended`, in 2.0.

When the code after the guard awaits, the advice uses `flatMapAsync` / `foldAsync`. Declarations tagged `@interop <reason>` are skipped. On CivalaOS it finds 75 guards, all of this shape.

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

- `new Map()` on functype's `Map` (or `Set`). It's a factory, so TypeScript only says TS7009 ("target lacks a construct signature"), or TS2350 ("Only a void function can be called with the 'new' keyword") when `noImplicitAny` is off. The message says to write `Map(…)` / `Map.empty()`, or `new globalThis.Map(…)` for the built-in.
- `import { Map as FMap } from "functype"`. An alias lets the plain name keep meaning the built-in, which inverts the convention and drifts between files.

| Option       | Default | Description                                                                                                          |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `allowAlias` | `false` | Accept aliased imports of functype's `Map` / `Set`, for a codebase that prefers the built-ins under the plain names. |

It applies in test files too: tests are read as examples.

### `functype/no-imperative-loops` / `functype/prefer-map`

These rules don't report loops that have no functional equivalent:

- `for await` consumes a stream, and collecting it first would defeat the streaming.
- A loop whose body `yield`s is a generator's body, and a callback can't yield.

A loop whose body `await`s is still reported by `no-imperative-loops`, which points at `List(items).mapAsync(f)`, `Either.traverseAsync` (stops at the first `Left`) or, inside `IO`, `IO.forEach`. `prefer-map` doesn't report it.

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
