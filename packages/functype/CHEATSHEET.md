# Functype Cheatsheet — for Scala / cats / fp-ts users

You know functional programming. functype is Scala-inspired but TypeScript-idiomatic, and since 2.0 its extraction methods use Scala's names with lazy arguments, as Effect and fp-ts do. This page maps your existing muscle memory to functype 2.x.

For a JavaScript-first introduction, see [`docs/JAVASCRIPT_TO_FUNCTYPE_PATTERNS.md`](./docs/JAVASCRIPT_TO_FUNCTYPE_PATTERNS.md). For an exhaustive interface matrix, see [`docs/FUNCTYPE_FEATURE_MATRIX.md`](./docs/FUNCTYPE_FEATURE_MATRIX.md).

---

## Importing

functype ships per-module subpaths. Pick what you need:

```ts
import { Option, Some, None } from "functype/option"
import { Either, Left, Right } from "functype/either"
import { Try } from "functype/try"
import { List } from "functype/list"

// Or import everything from the root:
import { Option, Either, Try, List, IO } from "functype"
```

---

## Option

| Scala / cats                | fp-ts                           | functype                    |
| --------------------------- | ------------------------------- | --------------------------- |
| `Some(x)` / `None`          | `O.some(x)` / `O.none`          | `Some(x)` / `None()`        |
| `Option(x)` (null-aware)    | `O.fromNullable(x)`             | `Option(x)`                 |
| `opt.getOrElse(d)`          | `O.getOrElse(() => d)(opt)`     | `opt.getOrElse(() => d)`    |
| `opt.orElse(other)`         | `O.alt(() => other)(opt)`       | `opt.orElse(() => other)`   |
| `opt.map(f)` / `flatMap(f)` | `O.map(f)` / `O.chain(f)`       | `opt.map(f)` / `flatMap(f)` |
| `opt.fold(zero, f)`         | `O.fold(() => zero, f)(opt)`    | `opt.fold(() => zero, f)`   |
| `opt.getOrElse(throw err)`  | `O.getOrElseW(() => throw)`     | `opt.orThrow(err?)`         |
| `opt.toRight(left)`         | `E.fromOption(() => left)(opt)` | `opt.toEither(left)`        |
| `Option.sequence(opts)`     | `A.sequence(O.Applicative)`     | `Option.sequence(opts)`     |
| `opts.traverse(f)`          | `A.traverse(O.Applicative)(f)`  | `Option.traverse(opts, f)`  |

**Lazy fallbacks:** both methods take a function, which runs only when there is no value. This is Scala's by-name `default: => B`, written as a thunk the way Effect and fp-ts write it.

- `opt.getOrElse(() => 42)` returns `T | 42`.
- `opt.orElse(() => Option(42))` returns `Option<T | 42>`.

A bare value fails to compile at the argument: `getOrElse(42)` is a type error, and so is `orElse(Option(42))`. functype 1.x used `orElse(default)` and `or(alternative)` for these; see the 2.0 notes in [`CHANGELOG.md`](./CHANGELOG.md).

---

## Either

| Scala / cats              | fp-ts                       | functype                   |
| ------------------------- | --------------------------- | -------------------------- |
| `Right(x)` / `Left(e)`    | `E.right(x)` / `E.left(e)`  | `Right(x)` / `Left(e)`     |
| `e.isRight` / `isLeft`    | `E.isRight(e)` / `isLeft`   | `e.isRight()` / `isLeft()` |
| `e.map(f)` / `flatMap(f)` | `E.map(f)` / `E.chain(f)`   | `e.map(f)` / `flatMap(f)`  |
| `e.mapLeft(f)`            | `E.mapLeft(f)`              | `e.mapLeft(f)`             |
| `e.swap`                  | `E.swap`                    | `e.swap()`                 |
| `e.fold(l, r)`            | `E.fold(l, r)(e)`           | `e.fold(l, r)`             |
| `e.getOrElse(d)`          | `E.getOrElse(() => d)(e)`   | `e.getOrElse(() => d)`     |
| `e.toOption`              | `E.toOption`                | `e.toOption()`             |
| `Either.sequence(arr)`    | `A.sequence(E.Applicative)` | `Either.sequence(arr)`     |
| `arr.traverse(f)`         | `A.traverse(E.Applicative)` | `Either.traverse(arr, f)`  |

---

## Try

| Scala                           | fp-ts equivalent                    | functype                                                                                     |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `Try { code }`                  | `E.tryCatch(() => code, identity)`  | `Try(() => code)`                                                                            |
| `Success(x)` / `Failure(err)`   | `E.right(x)` / `E.left(err)`        | `Try.success(x)` / `Try.failure(err)`                                                        |
| `t.recover { case ... => ... }` | `E.orElse(...)`                     | `t.recover(err => fallback)`                                                                 |
| `t.recoverWith { case ... }`    | `E.orElse(err => E.right(...))`     | `t.recoverWith(err => Try.success(alt))`                                                     |
| `t.toEither` (loses error)      | n/a                                 | `t.toEither(left)` or `t.toEither(e => buildLeft(e))` ← **builder threads underlying Error** |
| `t.toOption`                    | `O.fromNullable(t.toOption.orNull)` | `t.toOption()`                                                                               |
| `Try.sequence(tries)`           | n/a                                 | `Try.sequence(tries)` (first Failure wins)                                                   |
| `tries.traverse(f)`             | n/a                                 | `Try.traverse(arr, f)`                                                                       |

**Wrapping a throwing call with structured error:**

```ts
// Scala-y / fp-ts-y
tryCatch(
  () => yaml.load(text),
  (e) => ScopeError(path, `parse: ${(e as Error).message}`),
)

// Try-shaped equivalent (0.60.4+)
Try(() => yaml.load(text)).toEither((e) => ScopeError(path, `parse: ${e.message}`))
```

---

## Containers

| Scala / cats          | fp-ts                          | functype                                      |
| --------------------- | ------------------------------ | --------------------------------------------- |
| `List(1, 2, 3)`       | `[1, 2, 3]` (with combinators) | `List([1, 2, 3])` or `List.of(1, 2, 3)`       |
| `list.foldLeft(z)(f)` | `RA.reduce(z, f)`              | `list.fold(z, f)` / `list.reduce(f)`          |
| `list.head` / `.tail` | `RA.head(xs)` / `RA.tail(xs)`  | `list.head()` / `list.tail()` (methods)       |
| `list.groupBy(f)`     | `RA.groupBy(f)`                | `list.groupBy(f)`                             |
| `Set(1, 2, 3)`        | `RS.fromArray(...)`            | `Set([1, 2, 3])` or `Set.of(1, 2, 3)`         |
| `Map(k -> v, ...)`    | `RM.fromFoldable(...)`         | `Map([[k, v], ...])` or `Map.of([k, v], ...)` |
| `(a, b)` tuple        | `[a, b]` as readonly tuple     | `Tuple(a, b)`                                 |
| `Stack`               | n/a                            | `Stack.of(1, 2, 3)`                           |

functype's `List` / `Set` / `Map` are immutable wrappers with FP combinators, and `Set` / `Map` are the default collections: import them under their own names. When you need the built-in (a cache you mutate, an API that takes a native `ReadonlyMap`), spell it `globalThis.Map` / `globalThis.Set`. The `eslint-plugin-functype` rules `collection-naming`, `prefer-functype-set` and `prefer-functype-map` enforce this; a mutated collection or one passed to a declared `ReadonlyMap` / `ReadonlySet` is allowed.

Unlike Scala, `head`, `last`, `tail`, `init`, `headOption` and `lastOption` are methods on List, Set and LazyList (2.0). functype's List is backed by an array, so `tail()` copies the rest of it rather than following a pointer. `size`, `length` and `isEmpty` stay properties. Every collection keeps only its data as own properties and shares its methods through one prototype per type, so a detached call such as `xs.filter(set.has)` throws; write `xs.filter((x) => set.has(x))`.

---

## Effects

| ZIO / cats-effect             | fp-ts                            | functype                           |
| ----------------------------- | -------------------------------- | ---------------------------------- |
| `ZIO.succeed(x)`              | `T.of(x)`                        | `IO.succeed(x)`                    |
| `ZIO.fail(e)`                 | `TE.left(e)`                     | `IO.fail(e)`                       |
| `ZIO.attempt(() => ...)`      | `TE.tryCatch(() => ..., id)`     | `IO.sync(() => ...)`               |
| `ZIO.tryPromise(p, e => ...)` | `TE.tryCatch(() => p, e => ...)` | `IO.tryPromise({ try, catch })`    |
| `ZIO.service(Tag)`            | `R.ask`                          | `IO.service(Tag)`                  |
| `effect.provide(layer)`       | `R.local(...)`                   | `effect.provide(layer)`            |
| `effect.retry(n)`             | `Schedule.recurs(n)`             | `effect.retry(n)`                  |
| `for { ... } yield`           | `pipe(..., chain(...))`          | `IO.gen(function*() { ... })`      |
| `effect.unsafeRun`            | `effect()`                       | `await effect.run()` / `runSync()` |

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
