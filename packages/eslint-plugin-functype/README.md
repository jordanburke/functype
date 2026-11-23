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

export default [functype.configs.recommended, functype.configs.tests]
```

There is one preset. The code it checks is written by coding agents, and an agent acts on what fails its build and passes over a warning, so every rule is `error` or `off`. `tests` relaxes it for test files.

- **`error`:** every rule whose precision is measured on real code. A forgotten `.run()`, a dropped `Either` or a throw in render is the kind of mistake an agent makes and a reviewer misses.
- **`off`:** `prefer-flatmap` and `prefer-do-notation`, whose precision is unmeasured. At `error` they would teach an agent to write `eslint-disable`. Each moves to `error` once it's measured.
- **At a real boundary, mark it** rather than disable the rule: `@interop <reason>` or `invariant()` for a throw (see below), `Wire<T>` for a data shape.
- **Type-aware rules:** `no-array-mutation`, `no-floating-io`, `no-floating-result`, `no-serialize-container`, `no-uncalled-method` and `no-container-mutation` need typescript-eslint's parser with `parserOptions.projectService`. Without it they report nothing.
- **Make sure the agent runs lint.** An error it never sees doesn't steer it, so put `eslint` in the check it runs before it's done, such as `pnpm validate`.

In 1.x the plugin had three presets: `recommended` and `strict`, which warned on rules still being measured, and `agent`, which didn't. 2.0's `recommended` is 1.x's `agent`, and `strict` and `agent` are gone: a config that names one fails to load (ESLint reports an `Unexpected undefined config`), so update it to `recommended`.

## TypeScript 7

typescript-eslint, which this plugin runs on, doesn't support TypeScript 7 yet: it loads the TypeScript 6 compiler API, and TypeScript 7.0 ships none. With `typescript@7` as a project's only `typescript`, `npm install` fails on typescript-eslint's peer range, and a forced install fails at lint time with "typescript-eslint does not support TS 7.0". Two paths work today.

**Run TypeScript 7 side by side with 6.0, which is the setup Microsoft and typescript-eslint point to.** Alias `typescript` to the 6.0 package, so lint loads the 6.0 API, and install TypeScript 7 as `@typescript/native`:

```json
{
  "devDependencies": {
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "@typescript/native": "npm:typescript@7.0.2"
  }
}
```

`tsc` is then TypeScript 7 and `tsc6` is 6.0. Keep the name `@typescript/native`: under npm, the name decides which package's `tsc` gets linked, and with another alias name `tsc` ran 6.0. typescript-eslint 8.73.0 also declares an optional peer `@typescript/native` for TypeScript 7.1 builds, so a package manager may warn that 7.0.2 misses its range, or install a 7.1 nightly beside it; lint results are the same either way. ESLint, typescript-eslint and every rule here, the type-aware ones included, run unchanged. Checked on 2026-11-22 with typescript-eslint 8.73.0, ESLint 10.14.0 and this plugin's 2.127.2: `no-floating-result` and `no-array-mutation` reported, and `tsc` 7.0.2 type-checked the same project.

**Or run the plugin in Oxlint, without type information.** Oxlint loads it as a JS plugin, unchanged, on a project with only TypeScript 7. In `.oxlintrc.json`:

```json
{
  "jsPlugins": ["eslint-plugin-functype"],
  "rules": { "functype/no-let": "error", "functype/prefer-option": "error", "functype/prefer-list": "error" }
}
```

Every rule that works without type information works there. The six type-aware rules, `no-array-mutation`, `no-floating-io`, `no-floating-result`, `no-serialize-container`, `no-uncalled-method` and `no-container-mutation`, report nothing, because Oxlint doesn't pass type information to JS plugins yet. Checked on 2026-11-22 with Oxlint 1.94.0.

When typescript-eslint supports TypeScript 7.1's new compiler API, the 6.0 alias can go and nothing in this plugin changes; its `@typescript/native` peer suggests that name stays. Until then, prefer the side-by-side setup, which keeps the type-aware rules.

## Rules

| Rule                                     | `recommended` | `tests` | Description                                                                                  |
| ---------------------------------------- | :-----------: | :-----: | -------------------------------------------------------------------------------------------- |
| `functype/no-let`                        |     error     |         | Use `const`; no reassignment                                                                 |
| `functype/no-imperative-loops`           |     error     |         | Use `List`/array methods, async traversal or `IO.forEach` instead of loops                   |
| `functype/prefer-functype-map`           |     error     |         | Use functype `Map` instead of a native `Map` you only read                                   |
| `functype/prefer-functype-set`           |     error     |         | Use functype `Set` instead of a native `Set` you only read                                   |
| `functype/collection-naming`             |     error     |         | Import functype's `Map`/`Set` under their own names; spell the built-in `globalThis.Map`     |
| `functype/prefer-map`                    |     error     |         | Use `map` instead of pushing inside `forEach`                                                |
| `functype/prefer-fold`                   |    error¹     |         | Use `fold` instead of branching on `isSome()`/`isLeft()`/…                                   |
| `functype/prefer-option`                 |     error     |   off   | Use `Option` instead of `null`/`undefined`                                                   |
| `functype/prefer-either`                 |     error     |   off   | Use `Either` for typed domain errors instead of `throw`                                      |
| `functype/prefer-try`                    |     error     |   off   | Use `Try` / `Try.fromPromise` instead of try/catch                                           |
| `functype/prefer-flatmap`                |      off      |         | Use `flatMap` instead of `map().flat()`                                                      |
| `functype/prefer-do-notation`            |      off      |         | Use `Do` notation for chained operations                                                     |
| `functype/no-get-unsafe`                 |    error²     |         | Disallow unsafe extraction (`.orThrow()`, `.expect()`)                                       |
| `functype/prefer-list`                   |     error     |         | Use `List` instead of native arrays                                                          |
| `functype/no-array-mutation`             |     error     |         | Don't change an array in place (`push`, `sort`, `xs[i] = v`…); build a new one               |
| `functype/no-floating-io`                |     error     |         | Don't build an `IO` and drop it, or `await` it unrun; run, return or `yield*` it             |
| `functype/no-floating-result`            |     error     |   off   | Don't drop an `Either`/`Try` result; a failure in it is silently ignored                     |
| `functype/no-serialize-container`        |     error     |   off   | Don't send an `Either`/`Option`/`List` to `c.json()` or `JSON.stringify()`; unwrap it first  |
| `functype/no-uncalled-method`            |     error     |         | Call a functype method: `list.head()`, not `list.head`; read without `()` it is the function |
| `functype/no-container-mutation`         |     error     |         | Don't change a functype value in place, even through a cast; build a new one                 |
| `functype/no-getOrThrow-in-render`       |     error     |         | React: no bare `.orThrow()` in a component or hook body; a throw in render unmounts the tree |
| `functype/must-fold-on-component-return` |     error     |         | React: render an `Option`/`Either`/`Try` with `fold` or `<MatchOption>`, not a guard or `&&` |

¹ With `checkGuards: true`: a guard followed by an unwrap is reported too.
² Allowed in test files by its own `allowInTests` option.

### Severity policy

A rule is **`error` once it is right on ~95–99% of real code**, meaning its known false-positive classes are closed. Until then it is `off`, never `warn`: a warning is advice an agent passes over, and a rule that is reliably right should fail the build.

`prefer-fold` reports only; its rewrite is a suggestion you apply, never an autofix, so `eslint --fix` can't change code on your behalf.

## Throwing on purpose: `invariant()` and `@interop`

`prefer-either` reports every `throw`. Two kinds of throw are correct, and each has its own tool:

| The throw is…                                                                                                   | Use                                                           |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A bug check: the condition can only fail because of a programmer error                                          | `invariant(cond, msg)` from `functype`                        |
| A host contract: the caller (React `use()`, React Query, a step runner, an MCP tool) needs a throw or rejection | `@interop <reason>` on the declaration, or `orThrow(builder)` |
| A router's control flow: `throw redirect(…)` or `throw notFound()` in a loader or route guard                   | nothing: recognized by its import (below)                     |
| Anything that can fail in normal operation                                                                      | return an `Either`                                            |

```ts ignore
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

### Router control-flow throws

TanStack Router redirects or shows Not found only when `beforeLoad` or `loader` throws the value `redirect()` or `notFound()` returns, and React Router and Remix loaders work the same way. That throw is the router's API, so `prefer-either` leaves it alone when the helper is imported from one of these modules, under any local name or through a namespace import:

| Module                                                                          | Helpers                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `@tanstack/react-router`, `@tanstack/router-core`                               | `redirect`, `notFound`                                    |
| `react-router`                                                                  | `redirect`, `redirectDocument`, `replace`, `data`         |
| `react-router-dom` (React Router 6), `@remix-run/node`, `@remix-run/cloudflare` | `redirect`, `redirectDocument`, `replace`, `data`, `json` |

```ts ignore
import { redirect } from "@tanstack/react-router"

beforeLoad: ({ params }) => {
  if (params.id === "all") throw redirect({ to: "/queue" }) // fine: the router's redirect
  if (!isValid(params.id)) throw new Error("bad id") // still reported
}
```

Unlike `@interop`, this exempts only the router's own throws, so a real error thrown in the same function is still reported. A local `redirect` helper isn't the router's, and neither is `throw new Response(…)`. Add your own framework with the `hostThrows` option: `{ hostThrows: { "@acme/router": ["bounce"] } }`. It adds to the defaults: naming a default module adds helpers to its list rather than replacing it, and a module set to `[]` turns that module's defaults off.

Prefer either tool to `eslint-disable`. A disable covers a whole file or line and says only "be quiet". `rg 'invariant\('` lists every bug check, and `rg '@interop'` lists every place the code touches a throw-based host.

## Rule options

### `functype/prefer-list`

| Option                | Default | Description                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | :-----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowArraysInTests`  | `true`  | Silence the rule inside test files (`.test.ts`, `.spec.ts`, `__tests__/`, `/test/`, `/tests/`).                                                                                                                                                                                                                                                         |
| `allowReadonlyArrays` | `true`  | When `true`, `ReadonlyArray<T>`, `readonly T[]` **and** `Readonly<T[]>` pass. When `false`, all three are flagged consistently. Use `false` in combination with `Wire<T>` from `functype` to hold the rule at `error` — every unmarked `ReadonlyArray<T>` becomes a lint error, and wrapping a boundary type in `Wire<…>` is the explicit escape hatch. |
| `allowArrayLiterals`  | `false` | When `true`, `const xs = [1, 2, 3]` is not reported. Useful when you want type-position enforcement but tolerate idiomatic literals like `[...map.entries()]`. Mutable `T[]` in type positions is always reported regardless.                                                                                                                           |

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

Also skipped: `as const` and other tuple assertions, tuple rest elements (`[string, ...string[]]`), rest parameters (`...args: T[]`), literals passed straight into `List(…)` / `Set(…)`, and files marked generated (`@generated`, "auto-generated", "DO NOT EDIT"). Supabase's generated types carry no marker, so a file whose top level exports both `Json` and `Database` is skipped too. Any other generator with no marker needs an `ignores` entry. Anything still reported that is a deliberate host shape gets `Wire<…>`.

Measured on five consumers (2026-10-10), with type-aware linting: **2,000 hits under 2.114, 696 after.** By repo, before → after: a private app monorepo 821 → 215, agent-todo 843 → 328, dokploy-mcp-server 170 → 68, ts-builds 111 → 43, supabase-typed-query 55 → 42. Known false positives left: 25 hits in agent-todo's unmarked Supabase types (an `ignores` entry), one nested ReactFlow return type (`Wire`), one AWS SES request built in an untyped object. Linting all of that monorepo with the rule on takes about 18 seconds.

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

```ts ignore
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

Measured on five consumers (2026-10-10): 91 hits, every one a real in-place mutation. Most were `push` accumulators building a list or a Markdown body line by line; the rest were `sort` on a named array and element assignment. It's `error` in every preset since 2.0. In 1.x it was `off` in `recommended`, to avoid failing builds on a minor upgrade.

A local array that is declared and then changed by a method or an index write (`acc.push(x)`, `acc[i] = x`) is reported once, here at the change: with type information, `prefer-list` leaves its declaration to this rule. Without type information this rule reports nothing, so `prefer-list` reports the declaration instead. A field, a change through an alias, `acc[i]++` and `delete acc[i]` can still be reported by both. The dedupe assumes this rule is on, as it is in `recommended`.

### `functype/no-floating-io`

Reports an `IO` that is built and never run, so it does nothing:

- an expression statement whose value is an `IO`;
- `await` on an `IO`. `IO` is not a Promise, so `await io` hands back the `IO` itself, unrun.

`no-floating-promises` and `await-thenable` miss both, because `IO` isn't thenable.

```ts ignore
log.info("saved") // reported, when info returns an IO → yield* it, or .run() it
save(user).tap(audit) // reported → return it, or run it
const user = await loadUser(id) // reported: user is the IO → await loadUser(id).runOrThrow()
return save(user) // fine: the caller runs it
void save(user) // fine: a deliberate drop
```

**It only runs with type-aware linting** (`parserOptions.projectService`). It recognizes `IO` by its type (it has `runExit` and `provideLayer`), whatever the call is named. Without type information it reports nothing.

Measured (2026-10-16) on functype's own source and tests, functype-log, functype-react, agent-todo's agent-gate-api and a private web app's API: 0 false positives across about 1,340 IO-typed calls. The only hits were four deliberate drops in type-only tests. It's `error` in `recommended`.

### `functype/no-floating-result`

Reports a statement that computes a result that can carry a failure, such as an `Either` or `Try`, and drops it. A `Left` or `Failure` in it is silently ignored. `no-floating-promises` doesn't help: awaiting the promise satisfies it while the result inside is thrown away.

```ts ignore
await userService.updateSubscription(id, plan) // reported: a failed write goes unnoticed
parse(input) // reported, when parse returns an Either
await save(user).run() // reported: run() returns an Either → check it, or use runOrThrow()

const result = await userService.updateSubscription(id, plan) // fine: then check result.isLeft()
await audit.write(entry).tapLeft((e) => log.error(e)) // fine: a best-effort write that logs its failure
void (await cache.refresh()) // fine: a deliberate drop
```

- **What counts:** a type, or a member of its union, with `fold` and `isLeft` or `isFailure`. That covers `Either`, `Try`, `Exit`, `Validation` and Either-shaped wrappers such as a `ServiceResult`. An ignored `Option` or `List` loses no error, so it isn't reported. An `IO` that is never run is `no-floating-io`'s.
- **Handled chains:** a chain that passes through `.tapError(…)` or `.tapLeft(…)` isn't reported, because it handles its failure. A `.flatMap(…)` after the handler can bring in a new failure, so that chain is reported again. `Try` has no failure tap, so mark a deliberate `Try` drop with `void`.
- **Tests:** a test that calls something for its side effect and then checks mocks is reported too. Assert on the result, or turn the rule off for test files.
- **Not seen yet:** a drop inside a callback, such as `xs.forEach((x) => save(x))`, or in the first part of a comma expression, isn't its own statement, so it isn't reported. `ok && save(x)` and `ok ? a() : b()` are.

**It only runs with type-aware linting** (`parserOptions.projectService`). Without type information it reports nothing.

Measured (2026-10-30) on agent-todo's agent-gate-api, which kept a hand-written check for this: at the commit that added that check, the rule reports 20 drops in production code. agent-todo fixed every one of them as a real bug, among them 8 in the Stripe webhook handler, where a failed write still answered Stripe 200. On the current code, after those fixes, it reports none in production code and 12 in tests. functype-os, functype-log, functype-react, functype-eval and functype-mcp-server report none. It's `error` in `recommended`, and `off` in `tests`, where a result is often dropped on purpose.

### `functype/no-serialize-container`

Reports a functype container handed to a JSON sink, anywhere inside the value. An `Either`, `Option` or `List` serializes as its `{"@functype", _tag, value}` envelope, so a client reading `subscription.plan` gets `undefined`, and a body built around a `Left` answers 200. The compiler can't catch it, because `c.json()` and `JSON.stringify()` accept any value.

```ts ignore
return c.json(await svc.getDetails(id)) // reported: sends the Either's envelope
return c.json({ user, subscription: details }) // reported, at subscription
return JSON.stringify({ success: true, checkout }) // reported, at checkout: an MCP tool reporting success on failure

return c.json(result.orThrow()) // fine, after checking result.isLeft()
return c.json({ items: list.toArray() }) // fine
return c.json(result.toJSON()) // fine: the envelope on purpose
```

- **Sinks:** `JSON.stringify(x)`, and any `.json(x)` call with an argument: Hono's `c.json`, `Response.json`, Express's `res.json`. `new Response(JSON.stringify(x))` is covered by the first. A read such as `await res.json()` has no argument, so it never matches.
- **What counts:** a type with `_tag` and `fold`, which every functype container has and its `toJSON()` envelope doesn't. The rule looks through unions and intersections, array and tuple elements, object properties, `Record` values and utility types such as `Partial<T>` and `Omit<T, K>`, up to 4 levels deep, and names the path in the message.
- **The envelope on purpose:** call `.toJSON()` or `.serialize()` first. A test that checks a container's JSON output is reported too, so call `.toJSON()` there as well.

**It only runs with type-aware linting** (`parserOptions.projectService`). Without type information it reports nothing.

Measured (2026-10-31) on agent-todo's agent-gate-api, which kept a hand-written check for this. Before its fix commit (f002b90), the rule reports 4 calls, and each is a bug agent-todo fixed: `GET /billing`, which showed every paying user "billing account isn't properly linked" for about nine months; `PATCH /user/me` and `PATCH /user/preferences`, which answered 200 with a `Left` in the body; and an MCP tool that reported success on failure. On the current code it reports none, and none in agent-todo's UI or in functype's own packages. It's `error` in `recommended`, and `off` in `tests`, which assert on a container's `JSON.stringify` envelope.

### `functype/no-uncalled-method`

Reports a functype method read as a value instead of called. On functype 2, `head`, `last`, `tail`, `init`, `headOption` and `lastOption` are methods, and a read without `()` compiles wherever any value is accepted. It yields the function itself: always truthy, never the element. A detached functype method also throws when it's called later.

```ts ignore
const checkout = results.head // reported: a function, so `if (!checkout)` is never taken
return Option(results.head) // reported: Some(<function>), not Some(firstRow)
expect(results.head).toEqual(row) // reported
if (opt.isSome) {
} // reported: always true
const { head } = results // reported

results.head() // fine
results.headOption() // fine
results.head.bind(results) // fine: the function on purpose
results.size // fine: a property
```

- **What counts:** a member declared as a method in functype's own files, read on a value with `_tag` and `fold`. A type of your own with that shape, or an interface extending `List` with methods of its own, isn't reported for those methods. Getters such as `size` and `isEmpty`, and function-valued data such as `Some(fn).value` or a `Ref` holding a callback, are never reported.
- **Deliberate uses:** a call (`?.()`, `new` and a tagged template included, also through `as`, `!` or `satisfies`), `.bind` / `.call` / `.apply`, `typeof`, an assignment target, and `delete`.
- **Not covered yet:** destructuring in parameters, nested patterns and `for…of`, and computed reads with a variable key (`results[key]`).
- **Why a lint rule:** the upgrade tool rewrites these reads once, in your own code. The rule keeps them from coming back, and runs in libraries that never run the upgrade tool.

**It only runs with type-aware linting** (`parserOptions.projectService`). Without type information it reports nothing.

Measured (2026-11-22) on seven codebases on functype 1.x and 2.x, 1,126 files: no hits. Run on a library's code from before its 2.0 port, it reports the `Option(list.head)` that library shipped. It's `error` in `recommended`, and stays on in `tests`: `expect(list.head)` is one of the bugs it's for.

### `functype/no-container-mutation`

Reports a write to a functype value that TypeScript can't see. The types mark every field read-only, so such a write needs the value's type hidden: an `as` cast, or a variable that holds one. Since functype 2.2, collections no longer freeze each value, so at run time nothing else stops these writes.

```ts ignore
;(list as unknown as { value: number[] }).value = [9] // reported
;(list as any).value[0] = 9 // reported: the List's own array
;(list as any).value.push(9) // reported: a mutating method through a cast
const record = list as unknown as Record<string, unknown>
record.extra = 1 // reported: a variable holding a cast
delete (opt as any).value // reported
Object.assign(list, { extra: 1 }) // reported: compiles without a cast
for ((list as any).extra of xs) {
} // reported

list.map((x) => x + 1) // fine: a new List
if (box.isSome()) box.value.n = 1 // fine: the Option's payload, not the Option
mine.dirty = true // fine: a field of your own subtype of List
```

- **What it reports:** an assignment, compound assignment, `++`/`--`, `delete`, or a destructuring or `for…of`/`for…in` target whose path starts from a functype value held under an `as` cast or `<T>` assertion. That includes a variable written only where it's declared and initialised from one, or declared `: any`. It also reports a mutating method, such as `push`, `splice`, `sort`, `add`, `set`, `delete` or `clear`, called on data reached through such a value. Called on the functype value itself, cast or not, the method is functype's own and returns a new value, so `(fmap as Map<string, number>).set("a", 1)` isn't reported. And it reports `Object.assign`, `Object.defineProperty`, `Object.defineProperties` and `Object.setPrototypeOf`, and the matching `Reflect` calls, aimed at a functype value, cast or not, since those compile without one. `globalThis.Object.assign` and `Object["assign"]` count too.
- **What it leaves alone:** a write that compiles without a cast. That's either a field of your own type, or data a container holds but doesn't own, such as an Option's payload or a List element's own field. Freezing never stopped those writes either. A cast anywhere on the path still counts, so `(opt.value as T).n = 1` is reported.
- **A functype value** has `_tag` and a `fold` that functype itself declares, so a type of your own with that shape isn't reported. A union counts when any of its members is a functype value.
- **What it can't see:** a value passed to a parameter typed `any` and written there, plain JavaScript, `Reflect.apply` and `.call` on these functions, and a destructured `assign`. Linting can't follow a value once its type is gone. It also doesn't follow a cast through:
  - a variable assigned again after its declaration;
  - an object field;
  - a conditional or `??` (`const o = ok ? (list as any) : null`);
  - a comma expression.

**It only runs with type-aware linting** (`parserOptions.projectService`). Without type information it reports nothing.

Measured (2026-11-23) on seven codebases, 1,128 files including 343 test files, all with type information: no hits. Writes planted in one of those test files, through a cast-holding variable and through `: any`, are reported. It's `error` in `recommended`, and stays on in `tests`.

### React rules

Two rules are for React code. They fire only inside a **component** (a function named in PascalCase whose body has JSX, including one wrapped in `memo` or `forwardRef`) or a **hook** (a function named `use` + a capital letter), so other code rarely trips them. The one exception is a non-React function whose name starts with `use` + a capital letter, which is read as a hook. Both are `error` in `recommended`.

Both work without type information. With it (`parserOptions.projectService`), the receiver must also be a functype container, so an unrelated object that happens to have an `orThrow` or `isSome` method is not reported.

Only the component's or hook's own body counts as render. An event handler, an effect, or a callback passed to `.map` is a separate function, so a call there is not reported. That also means a call inside a callback that does run during render (`useMemo(() => …)`, `items.map((o) => o.orThrow())` in JSX) is missed: the rules prefer missing a case to reporting valid code.

### `functype/no-getOrThrow-in-render`

Reports a bare `.orThrow()` (or the older `.getOrThrow()`) in a component or hook body. When the value is missing it throws during render, and React unmounts the tree up to the nearest error boundary.

```tsx ignore
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

```tsx ignore
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

A ternary or an if/else on a predicate is `prefer-fold`'s, everywhere, so this rule leaves it alone rather than report it twice. `prefer-fold`'s `checkGuards` is on in `recommended`, so an early return followed by an unwrap is reported by both rules. Only a predicate _call_ counts: `state.isPending` on a `useIO` result and `items.isEmpty` are properties, and are never reported. A guard that does other work before it returns, or returns something other than JSX or `null`, is not reported either. The rule reports only; there are no suggestions, because the rewrite moves code between branches.

| Option               | Default | Description                                                |
| -------------------- | :-----: | ---------------------------------------------------------- |
| `allowInteropMarker` | `true`  | Skip code inside a declaration tagged `@interop <reason>`. |

Measured (2026-10-25) with both rules on functype-react's source and tests (type-aware), and on agent-todo, mnemons and a private web app (1,403 files, without type information): no reports. None of that code uses these shapes in a component, and `useIOValue`'s `exit.orThrow()` is guarded by `exit.isSuccess()`, so the measurement shows the false-positive rate, not the hit rate.

### `functype/no-get-unsafe`

| Option               | Default                                                | Description                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowInTests`       | `true`                                                 | Silence the rule inside test files (same predicate as above).                                                                                                                                     |
| `allowInteropMarker` | `true`                                                 | Skip calls inside a declaration tagged `@interop <reason>`, as `prefer-either` does.                                                                                                              |
| `unsafeMethods`      | `["orThrow", "expect", "get", "getOrThrow", "unwrap"]` | Method names flagged when called on a suspected `Option` / `Either` / other `Extractable` receiver. Includes both current (`orThrow`, `expect`) and legacy (`get`, `getOrThrow`, `unwrap`) names. |

**Which receivers count.** With type-aware linting on (`parserOptions.projectService` or `project`), the rule checks the receiver's type: anything with both `orThrow` and `fold` (every functype container) is checked, whatever the variable is called, and a native `Map` named `options` is not. Without type information it falls back to guessing from the receiver's name and shape (`option`, `either`, `result`… or a `.map/.flatMap/.filter/.fold` chain), which misses a container bound to any other name. Turn type-aware linting on if you rely on this rule.

`.orThrow(error)` and `.orThrow((e) => error)` are not reported: the caller chose the error, which is the documented way to throw for a host that needs it (see the decision table above). A bare `.orThrow()` throws a generic error and is reported.

The rule reports each match with two suggestions — `.getOrElse(() => default)` for value fallback and `.fold(onNone, onSome)` for branch handling. There is no autofix: the correct replacement depends on human judgment about a default value, and `.expect(msg)` would silently lose its argument. Apply a suggestion explicitly in your editor when you know which one fits.

### `functype/prefer-fold`

| Option          | Default | Description                                                                                                                                                                                                        |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `minComplexity` | `2`     | Minimum if/else chain length (root + branches) before it is reported.                                                                                                                                              |
| `checkNullable` | `false` | Also report null checks on plain values (`x === null ? a : b`). Off because whether `x` should be an `Option` is `prefer-option`'s call; at `error` this path fired on JSX, style objects and conditional spreads. |
| `checkGuards`   | `false` | Also report a guard followed by an unwrap: `if (e.isLeft()) return …` and then `e.value` / `e.orThrow()` / `e.get()` later in the same block. On in `recommended`.                                                 |

Reports only; the rewrite is a **suggestion, never an autofix**. A fold rewrite can't be proven type-correct without type information, and `eslint --fix` applies fixable rules at warn severity too, so an autofix here would rewrite working code during `validate`. The suggestion reads narrowed values through the fold's parameters (`e.value` after `isLeft()` becomes `left`), omits unused parameters, keeps `return` on if/else chains, parenthesizes object-literal branches, and offers `a.orElse(() => b)` for `a.isSome() ? a : b`. Rewrites follow the syntax tree, so text inside strings, template literals and comments is left alone. No suggestion is offered when the rewrite would drop a comment or could not type-check (`a.isSome() ? a : 5`). Suggestions are applied by hand, so review each one: the rule has no type information and can't prove the result compiles.

**`checkGuards`: guard, then unwrap.** Checking a container with an early exit and then pulling the value out is imperative branching. Getting a value out is fine: `getOrElse(() => default)` and `fold` are both proper exits and are never reported. What's reported is the shape below. The message picks its advice from what the guard does:

```ts ignore
if (e.isLeft()) return e // hands the failure back      → e.flatMap(…) / e.map(…)
if (e.isLeft()) return Left({ kind: e.value.kind }) // a new failure → e.mapLeft(…).flatMap(…)
if (o.isNone()) return 0 // a fallback                 → o.map(…).getOrElse(() => 0), or o.fold(() => 0, …)
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

Pass-through guards are the clear case: they are hand-written `flatMap`. Fallback and other-work-first guards are closer to a style choice, since TypeScript narrows `Either` after the guard (Rust's `let-else` and Swift's `guard let` make the same trade). For `Option` and `Try` the guard doesn't narrow `.value`, so the case is stronger there. It is on in `recommended`. To turn it off, set `"functype/prefer-fold": ["error", { "checkGuards": false }]`; a bare `"error"` after the preset keeps it on, because ESLint keeps the earlier options.

When the code after the guard awaits, the advice uses `flatMapAsync` / `foldAsync`. Declarations tagged `@interop <reason>` are skipped. On a private app monorepo it finds 75 guards, all of this shape.

### `functype/prefer-option`

| Option                 | Default | Description                                                                                              |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `allowUseState`        | `true`  | Don't report `T \| null` inside the type argument of `useState` / `useRef` (bare or `React.`-qualified). |
| `checkOptionalMembers` | `false` | Report "may be absent" members and parameters too: `a?: T` and `a: T \| undefined` alike.                |

`null` is idiomatic React state, and an `Option` there fights the hook's own API.

The message names both ways out, because a nullable type can be a correct boundary shape. Use `Option` when your own code reads the absence, and `Wire<…>` when a serializer, driver, schema or host reads it. [Wire or Option?](https://functype.org/wire#wire-or-option) has the full rule.

One union holding both `null` and `undefined`, as a type alias's body or a type-literal or interface member, gets its own message and no `Option` suggestion. So does an optional member that can also be `null` (`a?: T | null`). Left out, cleared and set are three states, and `Option` has two, so the message names both fixes: `Wire<…>` for a row, body or payload, or, for a value that only meant "may be absent", one of the two spellings and `Option`. A parameter's own type, a return type, a variable or a class field with that union keeps the `Option` message. A member inside a parameter's type, such as an options bag, is still a shape, so it gets the three-state message.

A union nested in a union, such as `(string | null) | undefined`, is read as one union and reported once.

On a type-literal or interface member, and on a parameter, `a?: T` and `a: T | undefined` both mean "may be absent", so both are skipped by default. The caller writes `<X b="v" />` or `f()`, and an `Option` there would make every caller wrap the value. Skipping only one spelling would teach people to rewrite `b: string | undefined` as `b?: string`, which makes a required key optional.

```ts ignore
type Props = {
  a?: string // fine
  b: string | undefined // fine: the same "may be absent" as a?
  c?: string | undefined // fine: the spelling exactOptionalPropertyTypes needs
  d: string | null // reported: null is a deliberate value
}
const f = (x: string | undefined) => x ?? "" // fine
function g(): string | undefined {} // reported: a return type, where an Option pays
```

Return types, variables, class fields and generic arguments (`Array<string | undefined>`) are still reported. With `checkOptionalMembers: true`, `a?: T` is reported too, so the two spellings still get the same verdict, and `c?: T | undefined` is reported once, as an optional member.

### `functype/prefer-do-notation`

| Option              | Default | Description                                                                               |
| ------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `minChainDepth`     | `3`     | Report a `.flatMap(…)` chain once it has this many `flatMap`/`map`/`filter`/`fold` steps. |
| `detectMixedMonads` | `true`  | Report a composition chain that moves between Option, Either and Try.                     |

It reports three shapes, each once, at the outermost step:

```ts ignore
o.flatMap(f).flatMap(g).flatMap(h) // a flatMap chain 3 steps deep → Do notation
Option(x)
  .flatMap((v) => Either.right(v))
  .map(f) // a chain that mixes monads → Do notation
user && user.profile && user.profile.name // a guard on each step of a path → user?.profile?.name
```

- **Only chains on a monad count.** With type information the type of the value each step is called on decides, so an array's `.flatMap(…)` chain is never reported, and neither is one after `.getOrElse(() => [])` or `.fold(…)` has unwrapped the monad. Without it, the chain must start from a monad constructor, companion or conversion (`Option(x)`, `Either.right(x)`, `Try(f).toOption()`), an identifier annotated with a monad type, or one named like a monad (`option`, `result`, or a capitalized suffix such as `userOption`; `entry` and `registry` don't count).
- **Mixing is read along the chain**, from the monad each step's callback returns. A conversion such as `.toOption()` keeps the chain in one monad, and a monad built somewhere inside a callback isn't a step.
- **A guard chain is read from the AST.** Each operand must be a property of the one before it, so `isAdmin && settings.theme && user.profile.name` isn't one.
- **It has no autofix.** It reports only, so `eslint --fix` can't change code on its behalf.

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

export default [recommended, functype.configs.recommended, testOverrides, functype.configs.tests]
```

`functype.configs.tests` turns off `prefer-option`, `prefer-either`, `prefer-try`, `no-floating-result` and `no-serialize-container` for the same test files as `test-overrides`: tests call plain `T | undefined` APIs, assert on thrown errors, drop results on purpose and assert on `JSON.stringify` envelopes. It changes no other rule. `no-let` and `no-imperative-loops` already skip test files themselves, unless you set their `allowInTests: false`. Put both after the recommended configs, so they win.

## License

MIT
