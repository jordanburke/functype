# Functype Cheatsheet — for Scala / cats / Effect users

You know functional programming. functype is Scala-inspired but TypeScript-idiomatic, and since 2.0 its extraction methods use Scala's names with lazy arguments, as Effect does. This page maps your existing muscle memory to functype 2.x. The Effect column uses Effect 4's names: Effect 4 calls Either `Result`. Coming from fp-ts? fp-ts is merging into Effect, which Effect's docs call its successor, so the Effect column is where fp-ts's names went.

For a JavaScript-first introduction, see [`docs/JAVASCRIPT_TO_FUNCTYPE_PATTERNS.md`](./docs/JAVASCRIPT_TO_FUNCTYPE_PATTERNS.md). For an exhaustive interface matrix, see [`docs/FUNCTYPE_FEATURE_MATRIX.md`](./docs/FUNCTYPE_FEATURE_MATRIX.md).

---

## Importing

functype ships per-module subpaths. Pick what you need:

```ts
import { Option, Some, None } from "functype/option"
import { Either, Left, Right } from "functype/either"
import { Try } from "functype/try"
import { List } from "functype/list"

// The names most code needs, in one short import:
import { Option, Either, Try, IO, List, Set, Map } from "functype/core"

// Or everything, from the root:
import { Option, Either, Try, List, IO, Layer, Http } from "functype"
```

`functype/core` is a curated list of 17 names: Option, Some, None, Either, Left, Right, Try, IO, Tag, List, Set, Map, Tuple, `tryCatch`, `tryCatchAsync`, `isLeft` and `isRight`. It's for finding your way, not for bundle size: every import tree-shakes to the same bundle.

---

## Option

| Scala / cats                | Effect                                                 | functype                    |
| --------------------------- | ------------------------------------------------------ | --------------------------- |
| `Some(x)` / `None`          | `Option.some(x)` / `Option.none()`                     | `Some(x)` / `None()`        |
| `Option(x)` (null-aware)    | `Option.fromNullishOr(x)`                              | `Option(x)`                 |
| `opt.getOrElse(d)`          | `Option.getOrElse(opt, () => d)`                       | `opt.getOrElse(() => d)`    |
| `opt.orElse(other)`         | `Option.orElse(opt, () => other)`                      | `opt.orElse(() => other)`   |
| `opt.map(f)` / `flatMap(f)` | `Option.map(opt, f)` / `Option.flatMap(opt, f)`        | `opt.map(f)` / `flatMap(f)` |
| `opt.fold(zero, f)`         | `Option.match(opt, { onNone: () => zero, onSome: f })` | `opt.fold(() => zero, f)`   |
| `opt.getOrElse(throw err)`  | `Option.getOrThrowWith(opt, () => err)`                | `opt.orThrow(err?)`         |
| `opt.toRight(left)`         | `Result.fromOption(opt, () => left)`                   | `opt.toEither(left)`        |
| `Option.sequence(opts)`     | `Option.all(opts)`                                     | `Option.sequence(opts)`     |
| `opts.traverse(f)`          | `Option.all(Array.map(opts, f))`                       | `Option.traverse(opts, f)`  |

**Lazy fallbacks:** both methods take a function, which runs only when there is no value. This is Scala's by-name `default: => B`, written as a thunk the way Effect writes it.

- `opt.getOrElse(() => 42)` returns `T | 42`.
- `opt.orElse(() => Option(42))` returns `Option<T | 42>`.

A bare value fails to compile at the argument: `getOrElse(42)` is a type error, and so is `orElse(Option(42))`. functype 1.x used `orElse(default)` and `or(alternative)` for these; see the 2.0 notes in [`CHANGELOG.md`](./CHANGELOG.md).

---

## Either

| Scala / cats              | Effect (`Result`)                                 | functype                   |
| ------------------------- | ------------------------------------------------- | -------------------------- |
| `Right(x)` / `Left(e)`    | `Result.succeed(x)` / `Result.fail(e)`            | `Right(x)` / `Left(e)`     |
| `e.isRight` / `isLeft`    | `Result.isSuccess(r)` / `Result.isFailure(r)`     | `e.isRight()` / `isLeft()` |
| `e.map(f)` / `flatMap(f)` | `Result.map(r, f)` / `Result.flatMap(r, f)`       | `e.map(f)` / `flatMap(f)`  |
| `e.mapLeft(f)`            | `Result.mapError(r, f)`                           | `e.mapLeft(f)`             |
| `e.swap`                  | `Result.flip(r)`                                  | `e.swap()`                 |
| `e.fold(l, r)`            | `Result.match(r, { onFailure: l, onSuccess: r })` | `e.fold(l, r)`             |
| `e.getOrElse(d)`          | `Result.getOrElse(r, () => d)`                    | `e.getOrElse(() => d)`     |
| `e.toOption`              | `Result.getSuccess(r)`                            | `e.toOption()`             |
| `Either.sequence(arr)`    | `Result.all(arr)`                                 | `Either.sequence(arr)`     |
| `arr.traverse(f)`         | `Result.all(Array.map(arr, f))`                   | `Either.traverse(arr, f)`  |

---

## Try

Effect has no Try type: a throwing call becomes a `Result` through `Result.try`.

| Scala                           | Effect equivalent                                   | functype                                                                                     |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Try { code }`                  | `Result.try(() => code)`                            | `Try(() => code)`                                                                            |
| `Success(x)` / `Failure(err)`   | `Result.succeed(x)` / `Result.fail(err)`            | `Try.success(x)` / `Try.failure(err)`                                                        |
| `t.recover { case ... => ... }` | `Result.orElse(r, (e) => Result.succeed(fallback))` | `t.recover(err => fallback)`                                                                 |
| `t.recoverWith { case ... }`    | `Result.orElse(r, (e) => alt)`                      | `t.recoverWith(err => Try.success(alt))`                                                     |
| `t.toEither` (loses error)      | n/a                                                 | `t.toEither(left)` or `t.toEither(e => buildLeft(e))` ← **builder threads underlying Error** |
| `t.toOption`                    | `Result.getSuccess(r)`                              | `t.toOption()`                                                                               |
| `Try.sequence(tries)`           | `Result.all(results)`                               | `Try.sequence(tries)` (first Failure wins)                                                   |
| `tries.traverse(f)`             | `Result.all(Array.map(arr, f))`                     | `Try.traverse(arr, f)`                                                                       |

**Wrapping a throwing call with structured error:**

```ts
// Either-shaped, as Scala and Effect write it
tryCatch(
  () => yaml.load(text),
  (e) => ScopeError(path, `parse: ${(e as Error).message}`),
)

// Try-shaped equivalent (0.60.4+)
Try(() => yaml.load(text)).toEither((e) => ScopeError(path, `parse: ${e.message}`))
```

---

## Containers

| Scala / cats          | Effect                                        | functype                                      |
| --------------------- | --------------------------------------------- | --------------------------------------------- |
| `List(1, 2, 3)`       | `[1, 2, 3]` with the `Array` module           | `List([1, 2, 3])` or `List.of(1, 2, 3)`       |
| `list.foldLeft(z)(f)` | `Array.reduce(xs, z, f)`                      | `list.fold(z, f)` / `list.reduce(f)`          |
| `list.head` / `.tail` | `Array.head(xs)` / `Array.tail(xs)` (Options) | `list.head()` / `list.tail()` (methods)       |
| `list.groupBy(f)`     | `Array.groupBy(xs, f)`                        | `list.groupBy(f)`                             |
| `Set(1, 2, 3)`        | `HashSet.make(1, 2, 3)`                       | `Set([1, 2, 3])` or `Set.of(1, 2, 3)`         |
| `Map(k -> v, ...)`    | `HashMap.make([k, v], ...)`                   | `Map([[k, v], ...])` or `Map.of([k, v], ...)` |
| `(a, b)` tuple        | `Tuple.make(a, b)`                            | `Tuple(a, b)`                                 |
| `Stack`               | n/a                                           | `Stack.of(1, 2, 3)`                           |

functype's `List` / `Set` / `Map` are immutable wrappers with FP combinators, and `Set` / `Map` are the default collections: import them under their own names. When you need the built-in (a cache you mutate, an API that takes a native `ReadonlyMap`), spell it `globalThis.Map` / `globalThis.Set`. The `eslint-plugin-functype` rules `collection-naming`, `prefer-functype-set` and `prefer-functype-map` enforce this; a mutated collection or one passed to a declared `ReadonlyMap` / `ReadonlySet` is allowed.

Unlike Scala, `head`, `last`, `tail`, `init`, `headOption` and `lastOption` are methods on List, Set and LazyList (2.0). functype's List is backed by an array, so `tail()` copies the rest of it rather than following a pointer. `size`, `length` and `isEmpty` stay properties. Every collection keeps only its data as own properties and shares its methods through one prototype per type, so a detached call such as `xs.filter(set.has)` throws; write `xs.filter((x) => set.has(x))`.

---

## Effects

| ZIO / cats-effect             | Effect                                       | functype                           |
| ----------------------------- | -------------------------------------------- | ---------------------------------- |
| `ZIO.succeed(x)`              | `Effect.succeed(x)`                          | `IO.succeed(x)`                    |
| `ZIO.fail(e)`                 | `Effect.fail(e)`                             | `IO.fail(e)`                       |
| `ZIO.attempt(() => ...)`      | `Effect.try(() => ...)`                      | `IO.sync(() => ...)`               |
| `ZIO.tryPromise(p, e => ...)` | `Effect.tryPromise({ try, catch })`          | `IO.tryPromise({ try, catch })`    |
| `effect.mapAttempt(f)`        | `Effect.flatMap` with `Effect.try`           | `effect.mapTry(f, onError)`        |
| `ZIO.service(Tag)`            | `Effect.service(Tag)`                        | `IO.service(Tag)`                  |
| `effect.provide(layer)`       | `Effect.provide(effect, layer)`              | `effect.provide(layer)`            |
| `effect.retry(n)`             | `Effect.retry(effect, Schedule.recurs(n))`   | `effect.retry(n)`                  |
| `for { ... } yield`           | `Effect.gen(function* () { ... })`           | `IO.gen(function*() { ... })`      |
| `effect.unsafeRun`            | `Effect.runPromise(e)` / `Effect.runSync(e)` | `await effect.run()` / `runSync()` |

`IO<R, E, A>` is functype's one effect type. functype 2.0 deleted `Task`: cancel an IO with `runCancellable()`, `runExit({ signal })` or `interruptOn(signal)`.

---

## HTTP

`Http` is a typed `fetch` wrapper. Pass `decode: Decoder<T>` to check the response: compose one from `Decoder.object` and friends, or wrap a throwing parser (Zod, TypeBox, Valibot, manual) in `Decoder.fromThrowing`. Returns `IO<never, HttpError, HttpResponse<T>>`:

```ts
import { Decoder, Http } from "functype"

const user = await Http.get(`/api/users/${id}`, {
  decode: Decoder.fromThrowing((data) => UserSchema.parse(data)),
})
  .map((r) => r.data)
  .retry(3)
  .timeout(5000)
  .runOrThrow()
```

`HttpError` is an ADT — `NetworkError | HttpStatusError | DecodeError`. Use `.catchTag("HttpStatusError", e => ...)` for selective recovery.

---

## Where to look next

- **All methods per type:** [`docs/FUNCTYPE_FEATURE_MATRIX.md`](./docs/FUNCTYPE_FEATURE_MATRIX.md)
- **JS-style migration recipes:** [`docs/JAVASCRIPT_TO_FUNCTYPE_PATTERNS.md`](./docs/JAVASCRIPT_TO_FUNCTYPE_PATTERNS.md)
- **CLI API reference:** `npx functype` / `npx functype Option`
- **Variance / `<out T>` patterns:** [`docs/variance-guide.md`](./docs/variance-guide.md)
- **Design notes:** [`docs/design-decisions/`](./docs/design-decisions/)
