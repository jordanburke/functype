import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Extractable } from "@/extractable/Extractable"
import type { FunctypeSum } from "@/functype"
import { base64ToUtf8 } from "@/internal/base64"
import { type ConcurrencyOptions, traverseWithConcurrency } from "@/internal/concurrency"
import { type A, type B, define, type Mutable } from "@/internal/define"
import { showValue } from "@/internal/stringify"
import { List } from "@/list/List"
import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import type { Reshapeable } from "@/reshapeable"
import { createSerializer, expectMarker, type ParsedEnvelope } from "@/serialization"
import { Try } from "@/try"
import type { AsyncMonad, Promisable } from "@/typeclass"
import type { Type } from "@/types"

/**
 * Either type module
 * @module Either
 * @category Core
 */

/**
 * Shared interface for Either variants. Contains all methods and type guards but
 * does NOT include the discriminant `_tag` or `value` — those are declared on the
 * variant interfaces (LeftOf / RightOf) so that Either acts as a true discriminated
 * union. After `if (e.isLeft())`, the else branch narrows `e` to RightOf<L,R> and
 * `e.value` narrows to R without a cast.
 */
export interface EitherBase<out L extends Type, out R extends Type>
  extends FunctypeSum<R, "Left" | "Right">, Promisable<R>, Doable<R>, Reshapeable<R>, Extractable<R> {
  isLeft(): this is LeftOf<L, R>
  isRight(): this is RightOf<L, R>
  /**
   * Returns the Right value, or calls `defaultValue` on a Left. The default is lazy: it runs only
   * on a Left. A default that fits `R` keeps `R`, so a literal union is not widened; a default of
   * another type widens the result to `R | R2`.
   */
  getOrElse<R2 extends Type = never>(defaultValue: () => R | R2): R | R2
  /**
   * Returns the Right value, or throws on a Left. Pass an `Error` to throw it, or a builder to make one
   * from the Left value — for code that must throw for a host (a retrying step runner, an MCP tool, a
   * React Query `queryFn`). With no argument, throws the Left value itself.
   */
  orThrow(error?: Error | ((left: L) => Error)): R
  /**
   * Returns the right value, or calls the never-returning handler with the Left's value.
   * Use this when you have a helper like `(msg) => fail(msg, 2)` that terminates the
   * program — the result type is unconditionally `R`, so you avoid the TypeScript
   * narrowing trap where `if (e.isLeft()) fail(...)` fails to narrow `e.value` when
   * `fail` is an arrow function typed as `(...): never`.
   */
  expect(handler: (value: L) => never): R
  /**
   * Returns this Either if it is a Right, otherwise calls `alternative` for another Either.
   * The alternative is lazy: it runs only on a Left.
   */
  orElse<L2 extends Type, R2 extends Type>(alternative: () => Either<L2, R2>): Either<L | L2, R | R2>
  orNull(): R | null
  orUndefined(): R | undefined
  map<U extends Type>(f: (value: R) => U): Either<L, U>
  /**
   * Maps the Right value with a function that may throw, catching the throw into a Left built by
   * `onError`. `map` lets a throw escape. Use `mapTry` for a callback you don't own.
   *
   * - A Left passes through unchanged, and `f` doesn't run.
   * - A throw from `onError` itself escapes.
   * - Only a synchronous throw is caught. For an async callback, use `tryCatchAsync`.
   *
   * Same as `either.flatMap((value) => tryCatch(() => f(value), onError))`, with functype's `tryCatch`.
   */
  mapTry<U extends Type, L2 extends Type>(f: (value: R) => U, onError: (error: unknown) => L2): Either<L | L2, U>
  ap<L2 extends Type, U extends Type>(ff: Either<L2, (value: R) => U>): Either<L | L2, U>
  merge<L1 extends Type, R1 extends Type>(other: Either<L1, R1>): Either<L | L1, [R, R1]>
  /**
   * Maps the Right value with an async function. A Left resolves unchanged.
   * If `f` rejects or throws, the returned Promise rejects with the same reason: it does not
   * become a Left, and it never throws synchronously. To turn a rejection into a Left, use `Either.fromPromise(p, onRejected)`
   * or `tryCatchAsync`, which take a function from the reason to `L`.
   */
  mapAsync<U extends Type>(f: (value: R) => Promise<U>): Promise<Either<L, U>>
  flatMap<L2 extends Type, U extends Type>(f: (value: R) => Either<L2, U>): Either<L | L2, U>
  /**
   * Chains an async function that returns an Either. A Left resolves unchanged.
   * If `f` rejects or throws, the returned Promise rejects with the same reason, as with `mapAsync`.
   */
  flatMapAsync<L2 extends Type, U extends Type>(f: (value: R) => Promise<Either<L2, U>>): Promise<Either<L | L2, U>>
  toOption(): Option<R>
  toString(): string
  [Symbol.iterator]: () => Iterator<R>
  yield(): Generator<R, void, unknown>
  traverse<L2 extends Type, U extends Type>(f: (value: R) => Either<L2, U>): Either<L | L2, U[]>
  tap(f: (value: R) => void): Either<L, R>
  tapLeft(f: (value: L) => void): Either<L, R>
  mapLeft<L2 extends Type>(f: (value: L) => L2): Either<L2, R>
  /**
   * Applies a predicate to the Right value. If the predicate fails, short-circuits
   * to a Left carrying the value produced by `onUnsatisfied`. Left passes through
   * unchanged (predicate not evaluated). Lets you turn a value-level guard into the
   * Left channel without breaking the chain with an `if/return Left(...)` ladder.
   * @param predicate - The predicate to test the Right value
   * @param onUnsatisfied - Builds the new Left value when the predicate fails
   * @returns Right if the predicate holds, Left(onUnsatisfied(value)) otherwise
   */
  filterOrElse<L2 extends Type>(predicate: (value: R) => boolean, onUnsatisfied: (value: R) => L2): Either<L | L2, R>
  bimap<L2 extends Type, R2 extends Type>(fl: (value: L) => L2, fr: (value: R) => R2): Either<L2, R2>
  fold<T extends Type>(onLeft: (value: L) => T, onRight: (value: R) => T): T
  /**
   * Async variant of fold. Accepts sync or async handlers on either branch and
   * always returns a Promise, keeping chains fluent when at least one branch is async.
   */
  foldAsync<T extends Type>(onLeft: (value: L) => T | Promise<T>, onRight: (value: R) => T | Promise<T>): Promise<T>
  swap(): Either<R, L>
  /**
   * Pipes the value through the provided function based on whether this is a Left or Right
   */
  pipeEither<U extends Type>(onLeft: (value: L) => U, onRight: (value: R) => U): U

  /**
   * Pipes the Either value through the provided function
   */
  pipe<U extends Type>(f: (value: L | R) => U): U
  /**
   * Pattern matches over the Either, applying a handler function based on the variant
   */
  match<T>(patterns: { Left: (value: L) => T; Right: (value: R) => T }): T
  /**
   * Returns the value and tag for inspection
   */
  toValue(): { _tag: "Left" | "Right"; value: L | R }
  /**
   * Custom JSON serialization that excludes getter properties.
   * Emits the canonical functype envelope with `@functype: "Either"` so
   * native `JSON.stringify` recursion (e.g. inside a plain object body)
   * produces a marker-bearing envelope that survives a round-trip through
   * `Serialization.deserialize`.
   */
  toJSON(): { "@functype": "Either"; _tag: "Left" | "Right"; value: L | R }
}

/**
 * Left variant of Either. Discriminated by `_tag: "Left"` with `value: L`.
 */
export interface LeftOf<out L extends Type, out R extends Type> extends EitherBase<L, R> {
  readonly _tag: "Left"
  readonly value: L
}

/**
 * Right variant of Either. Discriminated by `_tag: "Right"` with `value: R`.
 */
export interface RightOf<out L extends Type, out R extends Type> extends EitherBase<L, R> {
  readonly _tag: "Right"
  readonly value: R
}

/**
 * Either is a discriminated union of LeftOf and RightOf. TypeScript narrows
 * across both branches of `isLeft()` / `isRight()` and `_tag` checks. Variance
 * is inherited from LeftOf/RightOf (both covariant in L and R) — union type
 * aliases cannot carry their own variance annotations in TS.
 */
export type Either<L extends Type, R extends Type> = LeftOf<L, R> | RightOf<L, R>

export type TestEither<L extends Type, R extends Type> = Either<L, R> & AsyncMonad<R>

/** Builds a pair typed as a tuple, not an array. */
const pair = <X, Y>(x: X, y: Y): [X, Y] => [x, y]

/** Every Right shares these methods (#276 §14). `this.value` is the Right's own data. */
const RightProto = define<RightOf<B, A>>()("Right", {
  [Symbol.toStringTag]: "Either",
  isLeft(): this is LeftOf<B, A> {
    return false
  },
  isRight(): this is RightOf<B, A> {
    return true
  },
  getOrElse() {
    return this.value
  },
  orThrow() {
    return this.value
  },
  expect() {
    return this.value
  },
  orElse() {
    return this
  },
  orNull() {
    return this.value
  },
  orUndefined() {
    return this.value
  },
  map(f) {
    return RightConstructor(f(this.value))
  },
  mapTry(f, onError) {
    return tryCatch(() => f(this.value), onError)
  },
  ap(ff) {
    return ff._tag === "Right" ? RightConstructor(ff.value(this.value)) : Left(ff.value)
  },
  async mapAsync(f) {
    return RightConstructor(await f(this.value))
  },
  merge(other) {
    return other.isLeft() ? Left(other.value) : RightConstructor(pair(this.value, other.value))
  },
  flatMap(f) {
    return f(this.value)
  },
  async flatMapAsync(f) {
    return f(this.value)
  },
  toOption() {
    return Some(this.value)
  },
  toList() {
    return List([this.value])
  },
  toEither() {
    return RightConstructor(this.value)
  },
  toTry() {
    return Try(() => this.value)
  },
  toJSON() {
    return { "@functype": "Either", _tag: "Right", value: this.value }
  },
  toString() {
    return `Right(${showValue(this.value)})`
  },
  *[Symbol.iterator]() {
    yield this.value
  },
  *yield() {
    yield this.value
  },
  traverse(f) {
    const result = f(this.value)
    return result.isLeft() ? Left(result.value) : RightConstructor([result.value])
  },
  tap(f) {
    f(this.value)
    return this
  },
  tapLeft() {
    return this
  },
  mapLeft() {
    return RightConstructor(this.value)
  },
  filterOrElse(predicate, onUnsatisfied) {
    return predicate(this.value) ? this : Left(onUnsatisfied(this.value))
  },
  bimap(_fl, fr) {
    return RightConstructor(fr(this.value))
  },
  fold(_onLeft, onRight) {
    return onRight(this.value)
  },
  async foldAsync(_onLeft, onRight) {
    return onRight(this.value)
  },
  foldLeft(z) {
    return (op) => op(z, this.value)
  },
  foldRight(z) {
    return (op) => op(this.value, z)
  },
  match(patterns) {
    return patterns.Right(this.value)
  },
  swap() {
    return Left(this.value)
  },
  toPromise() {
    return Promise.resolve(this.value)
  },
  toValue() {
    return { _tag: "Right", value: this.value }
  },
  pipeEither(_onLeft, onRight) {
    return onRight(this.value)
  },
  pipe(f) {
    return f(this.value)
  },
  serialize() {
    return createSerializer("Either", "Right", this.value)
  },
  contains(v) {
    return this.value === v
  },
  exists(p) {
    return p(this.value)
  },
  every(p) {
    return p(this.value)
  },
  forEach(f) {
    f(this.value)
  },
  doUnwrap(): DoResult<A> {
    return { ok: true, value: this.value }
  },
})

/** Every Left shares these methods. `this.value` is the Left's own data. */
const LeftProto = define<LeftOf<B, A>>()("Left", {
  [Symbol.toStringTag]: "Either",
  isLeft(): this is LeftOf<B, A> {
    return true
  },
  isRight(): this is RightOf<B, A> {
    return false
  },
  getOrElse(defaultValue) {
    return defaultValue()
  },
  orThrow(error) {
    throw error === undefined ? this.value : typeof error === "function" ? error(this.value) : error
  },
  expect(handler) {
    return handler(this.value)
  },
  orElse(alternative) {
    return alternative()
  },
  orNull() {
    return null
  },
  orUndefined() {
    return undefined
  },
  map() {
    return LeftConstructor(this.value)
  },
  mapTry() {
    return LeftConstructor(this.value)
  },
  ap() {
    return LeftConstructor(this.value)
  },
  mapAsync() {
    return Promise.resolve(LeftConstructor(this.value))
  },
  merge() {
    return LeftConstructor(this.value)
  },
  flatMap() {
    return LeftConstructor(this.value)
  },
  flatMapAsync() {
    return Promise.resolve(LeftConstructor(this.value))
  },
  toOption() {
    return None()
  },
  toList() {
    return List<A>()
  },
  toEither(leftValue) {
    return LeftConstructor(leftValue)
  },
  toTry() {
    return Try<A>(() => {
      throw new Error(String(this.value))
    })
  },
  toJSON() {
    return { "@functype": "Either", _tag: "Left", value: this.value }
  },
  toString() {
    return `Left(${showValue(this.value)})`
  },
  *[Symbol.iterator]() {
    // A Left yields nothing.
  },
  *yield() {
    // A Left yields nothing.
  },
  traverse() {
    return LeftConstructor(this.value)
  },
  tap() {
    return this
  },
  tapLeft(f) {
    f(this.value)
    return this
  },
  mapLeft(f) {
    return LeftConstructor(f(this.value))
  },
  filterOrElse() {
    return this
  },
  bimap(fl) {
    return LeftConstructor(fl(this.value))
  },
  fold(onLeft) {
    return onLeft(this.value)
  },
  async foldAsync(onLeft) {
    return onLeft(this.value)
  },
  foldLeft(z) {
    return () => z
  },
  foldRight(z) {
    return () => z
  },
  match(patterns) {
    return patterns.Left(this.value)
  },
  swap() {
    return RightConstructor(this.value)
  },
  toPromise() {
    return Promise.reject(this.value)
  },
  toValue() {
    return { _tag: "Left", value: this.value }
  },
  pipeEither(onLeft) {
    return onLeft(this.value)
  },
  pipe(f) {
    return f(this.value)
  },
  serialize() {
    return createSerializer("Either", "Left", this.value)
  },
  contains() {
    return false
  },
  exists() {
    return false
  },
  every() {
    return true
  },
  forEach() {},
  doUnwrap(): DoResult<never> {
    return { ok: false, empty: false, error: this.value }
  },
})

/* eslint-disable functional/immutable-data -- each constructor fills in the object it just created */
// The one cast in each: a prototype checked at the opaque A and B works for every L and R.
const RightConstructor = <L extends Type, R extends Type>(value: R): RightOf<L, R> => {
  const right = Object.create(RightProto) as Mutable<RightOf<L, R>>
  right._tag = "Right"
  right.value = value
  return right
}

const LeftConstructor = <L extends Type, R extends Type>(value: L): LeftOf<L, R> => {
  const left = Object.create(LeftProto) as Mutable<LeftOf<L, R>>
  left._tag = "Left"
  left.value = value
  return left
}
/* eslint-enable functional/immutable-data */

export const Right = <L extends Type, R extends Type>(value: R): Either<L, R> => RightConstructor(value)
export const Left = <L extends Type, R extends Type>(value: L): Either<L, R> => LeftConstructor(value)

export const isRight = <L extends Type, R extends Type>(either: Either<L, R>): either is RightOf<L, R> =>
  either.isRight()
export const isLeft = <L extends Type, R extends Type>(either: Either<L, R>): either is LeftOf<L, R> => either.isLeft()

export const tryCatch = <L extends Type, R extends Type>(f: () => R, onError: (error: unknown) => L): Either<L, R> => {
  try {
    return Right<L, R>(f())
  } catch (error: unknown) {
    return Left<L, R>(onError(error))
  }
}

export const TypeCheckRight = <L extends Type, R extends Type>(value: R): TestEither<L, R> => RightConstructor(value)
console.assert(TypeCheckRight)
export const TypeCheckLeft = <L extends Type, R extends Type>(value: L): TestEither<L, R> => LeftConstructor(value)
console.assert(TypeCheckLeft)

export const tryCatchAsync = async <L extends Type, R extends Type>(
  f: () => Promise<R>,
  onError: (error: unknown) => L,
): Promise<Either<L, R>> => {
  try {
    const result = await f()
    return Right<L, R>(result)
  } catch (error: unknown) {
    return Left<L, R>(onError(error))
  }
}

/**
 * Either constructor that creates Left or Right based on the isRight parameter
 * @param value - The value to wrap
 * @param isRight - If true, creates Right, otherwise creates Left
 * @returns Either instance
 */
const EitherConstructor = <L extends Type, R extends Type>(value: R | L, isRight: boolean): Either<L, R> =>
  isRight ? Right<L, R>(value as R) : Left<L, R>(value as L)

/** Rebuilds an Either from a parsed envelope. */
const eitherFromEnvelope = <L extends Type, R extends Type>(parsed: ParsedEnvelope, method: string): Either<L, R> => {
  expectMarker(parsed, "Either", method)
  return parsed._tag === "Right" ? Right<L, R>(parsed.value as R) : Left<L, R>(parsed.value as L)
}

const EitherCompanion = {
  /**
   * Creates a Left instance
   * @param value - The left value
   * @returns Left Either
   */
  left: <L extends Type, R extends Type>(value: L): Either<L, R> => Left<L, R>(value),

  /**
   * Creates a Right instance
   * @param value - The right value
   * @returns Right Either
   */
  right: <L extends Type, R extends Type>(value: R): Either<L, R> => Right<L, R>(value),

  /**
   * Creates a Right<L, void> — convenience for "operation succeeded with no meaningful value".
   * Avoids variance quirks around Either<L, void> vs Either<L, undefined>.
   * @returns Right Either with void value
   */
  void: <L extends Type>(): Either<L, void> => Right<L, void>(undefined as void),

  /**
   * Type guard to check if an Either is Right
   * @param either - The Either to check
   * @returns True if Either is Right
   */
  isRight: <L extends Type, R extends Type>(either: Either<L, R>): either is RightOf<L, R> => either.isRight(),

  /**
   * Type guard to check if an Either is Left
   * @param either - The Either to check
   * @returns True if Either is Left
   */
  isLeft: <L extends Type, R extends Type>(either: Either<L, R>): either is LeftOf<L, R> => either.isLeft(),

  /**
   * Combines an array of Eithers into a single Either containing an array
   * @param eithers - Array of Either values
   * @returns Either with array of values or first Left encountered
   */
  sequence: <L extends Type, R extends Type>(eithers: ReadonlyArray<Either<L, R>>): Either<L, R[]> => {
    return eithers.reduce<Either<L, R[]>>((acc, either) => {
      if (acc.isLeft()) return acc
      if (either.isLeft()) return Left(either.value as L)
      return acc.map((rights) => [...rights, either.value as R])
    }, Right<L, R[]>([]))
  },

  /**
   * Maps an array through a function that returns Either, then sequences the results.
   * Short-circuits on the first Left: `f` is not called for the elements after it.
   * @param arr - Array of values
   * @param f - Function that returns Either, given each value and its index
   * @returns Either with array of results or first Left encountered
   */
  traverse: <L extends Type, R extends Type, U extends Type>(
    arr: ReadonlyArray<R>,
    f: (value: R, index: number) => Either<L, U>,
  ): Either<L, U[]> =>
    arr.reduce<Either<L, U[]>>(
      (acc, item, i) => acc.flatMap((us) => f(item, i).map((u) => [...us, u])),
      Right<L, U[]>([]),
    ),

  /**
   * Async traverse: runs `f` over `items` and collects the Right values, stopping at the first Left.
   *
   * Runs one call at a time, in order, by default. Pass `{ concurrency: n }` to allow up to `n` calls at once,
   * or `"unbounded"` to start them all together. After a Left no new calls start; calls already running
   * finish, and the result is the Left of the earliest item that failed. A rejected promise rejects the result.
   *
   * @param items - Values to traverse (an array, List, or any iterable)
   * @param f - Async function returning Either
   * @param options - `{ concurrency }`; defaults to 1 (sequential)
   * @returns Right of all results in input order, or the first Left
   *
   * @example
   * ```typescript
   * const saved = await Either.traverseAsync(rows, (row) => saveRow(row))
   * // Either<SaveError, SavedRow[]>, one save at a time, stopping at the first failure
   *
   * const fetched = await Either.traverseAsync(ids, fetchUser, { concurrency: 4 })
   * ```
   */
  traverseAsync: async <L extends Type, A extends Type, U extends Type>(
    items: Iterable<A>,
    f: (value: A) => PromiseLike<Either<L, U>>,
    options?: ConcurrencyOptions,
  ): Promise<Either<L, U[]>> => {
    const results = await traverseWithConcurrency(items, f, options?.concurrency ?? 1, (either) => either.isLeft())
    return EitherCompanion.sequence(results)
  },

  /**
   * Creates an Either from a nullable value
   * @param value - The value that might be null or undefined
   * @param leftValue - The value to use for Left if value is null/undefined
   * @returns Right if value is not null/undefined, Left otherwise
   */
  fromNullable: <L extends Type, R extends Type>(value: R | null | undefined, leftValue: L): Either<L, R> =>
    value === null || value === undefined ? Left(leftValue) : Right(value as R),

  /**
   * Creates an Either based on a predicate
   * @param value - The value to test
   * @param predicate - The predicate function
   * @param leftValue - The value to use for Left if predicate fails
   * @returns Right if predicate passes, Left otherwise
   */
  fromPredicate: <L extends Type, R extends Type>(
    value: R,
    predicate: (value: R) => boolean,
    leftValue: L,
  ): Either<L, R> => (predicate(value) ? Right(value) : Left(leftValue)),

  /**
   * Applicative apply - applies a wrapped function to a wrapped value
   * @param eitherF - Either containing a function
   * @param eitherV - Either containing a value
   * @returns Either with function applied to value
   */
  ap: <L extends Type, R extends Type, U extends Type>(
    eitherF: Either<L, (value: R) => U>,
    eitherV: Either<L, R>,
  ): Either<L, U> => eitherF.flatMap((f) => eitherV.map(f)),

  /**
   * Creates an Either from a Promise
   * @param promise - The Promise to convert
   * @param onRejected - Function to convert rejection reason to Left value
   * @returns Promise that resolves to Either
   */
  fromPromise: async <L, R>(promise: Promise<R>, onRejected: (reason: unknown) => L): Promise<Either<L, R>> => {
    try {
      const result = await promise
      return Right<L, R>(result)
    } catch (error) {
      return Left<L, R>(onRejected(error))
    }
  },

  /**
   * Creates an Either from JSON string
   * @param json - The JSON string
   * @returns Either instance
   */
  fromJSON: <L extends Type, R extends Type>(json: string): Either<L, R> =>
    eitherFromEnvelope<L, R>(JSON.parse(json) as ParsedEnvelope, "fromJSON"),

  /**
   * Creates an Either from binary string
   * @param binary - The binary string
   * @returns Either instance
   */
  fromBinary: <L extends Type, R extends Type>(binary: string): Either<L, R> => {
    const json = base64ToUtf8(binary)
    return EitherCompanion.fromJSON<L, R>(json)
  },
}

// The statics under a second name: the .d.ts then declares no value called EitherCompanion beside the interface
const EitherStatics = EitherCompanion

export const Either: EitherCompanion = Companion(EitherConstructor, EitherStatics)

/** The type of `Either`: its constructor and its statics, named so that errors and hovers print `EitherCompanion`. */
export interface EitherCompanion extends EitherConstructorType, EitherStaticsType {}
type EitherConstructorType = typeof EitherConstructor
type EitherStaticsType = typeof EitherStatics
