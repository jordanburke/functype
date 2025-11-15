import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Extractable } from "@/extractable/Extractable"
import type { FunctypeBase } from "@/functype"
import { List } from "@/list/List"
import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import type { Reshapeable } from "@/reshapeable"
import { createSerializer } from "@/serialization"
import { Try } from "@/try"
import type { AsyncMonad, Promisable } from "@/typeclass"
import type { Type } from "@/types"

/**
 * Either type module
 * @module Either
 * @category Core
 */
export interface Either<L extends Type, R extends Type>
  extends FunctypeBase<R, "Left" | "Right">,
    Promisable<R>,
    Doable<R>,
    Reshapeable<R>,
    Extractable<R> {
  readonly _tag: "Left" | "Right"
  value: L | R
  isLeft(): this is Either<L, R> & { readonly _tag: "Left"; value: L }
  isRight(): this is Either<L, R> & { readonly _tag: "Right"; value: R }
  orElse: (defaultValue: R) => R
  orThrow: (error?: Error) => R
  or(alternative: Either<L, R>): Either<L, R>
  orNull: () => R | null
  orUndefined: () => R | undefined
  readonly map: <U extends Type>(f: (value: R) => U) => Either<L, U>
  ap: <U extends Type>(ff: Either<L, (value: R) => U>) => Either<L, U>
  merge: <L1 extends Type, R1 extends Type>(other: Either<L1, R1>) => Either<L | L1, [R, R1]>
  mapAsync: <U extends Type>(f: (value: R) => Promise<U>) => Promise<Either<L, U>>
  flatMap: <U extends Type>(f: (value: R) => Either<L, U>) => Either<L, U>
  flatMapAsync: <U extends Type>(f: (value: R) => Promise<Either<L, U>>) => Promise<Either<L, U>>
  toOption: () => Option<R>
  toList: () => List<R>
  toString: () => string
  [Symbol.iterator]: () => Iterator<R>
  yield: () => Generator<R, void, unknown>
  traverse: <U extends Type>(f: (value: R) => Either<L, U>) => Either<L, U[]>
  lazyMap: <U extends Type>(f: (value: R) => U) => Generator<Either<L, U>, void, unknown>
  tap: (f: (value: R) => void) => Either<L, R>
  tapLeft: (f: (value: L) => void) => Either<L, R>
  mapLeft: <L2 extends Type>(f: (value: L) => L2) => Either<L2, R>
  bimap: <L2 extends Type, R2 extends Type>(fl: (value: L) => L2, fr: (value: R) => R2) => Either<L2, R2>
  fold: <T extends Type>(onLeft: (value: L) => T, onRight: (value: R) => T) => T
  swap: () => Either<R, L>
  /**
   * Pipes the value through the provided function based on whether this is a Left or Right
   * @param onLeft - The function to apply if this is a Left
   * @param onRight - The function to apply if this is a Right
   * @returns The result of applying the appropriate function
   */
  pipeEither<U extends Type>(onLeft: (value: L) => U, onRight: (value: R) => U): U

  /**
   * Pipes the Either value through the provided function
   * @param f - The function to apply to the value (Left or Right)
   * @returns The result of applying the function to the value
   */
  pipe<U extends Type>(f: (value: L | R) => U): U
  /**
   * Pattern matches over the Either, applying a handler function based on the variant
   * @param patterns - Object with handler functions for Left and Right variants
   * @returns The result of applying the matching handler function
   */
  match<T>(patterns: { Left: (value: L) => T; Right: (value: R) => T }): T
  /**
   * Returns the value and tag for inspection
   */
  toValue(): { _tag: "Left" | "Right"; value: L | R }
  /**
   * Custom JSON serialization that excludes getter properties
   */
  toJSON(): { _tag: "Left" | "Right"; value: L | R }
}

export type TestEither<L extends Type, R extends Type> = Either<L, R> & AsyncMonad<R>

const RightConstructor = <L extends Type, R extends Type>(value: R): Either<L, R> => ({
  _tag: "Right",
  value,
  isLeft(): this is Either<L, R> & { readonly _tag: "Left"; value: L } {
    return false
  },
  isRight(): this is Either<L, R> & { readonly _tag: "Right"; value: R } {
    return true
  },
  orElse: (_defaultValue: R) => value,
  orThrow: () => value,
  or: (_alternative: Either<L, R>) => Right<L, R>(value),
  orNull: () => value,
  orUndefined: () => value,
  map: <U extends Type>(f: (value: R) => U): Either<L, U> => Right(f(value)),
  ap: <U extends Type>(ff: Either<L, (value: R) => U>): Either<L, U> =>
    ff._tag === "Right" ? Right((ff.value as (value: R) => U)(value)) : Left(ff.value as L),
  mapAsync: <U extends Type>(f: (value: R) => Promise<U>): Promise<Either<L, U>> =>
    f(value)
      .then((result) => Right<L, U>(result))
      .catch((error: unknown) => Promise.resolve(Left<L, U>(error as L))) as Promise<Either<L, U>>,
  merge: <L1 extends Type, R1 extends Type>(other: Either<L1, R1>): Either<L | L1, [R, R1]> =>
    other.isLeft() ? Left<L | L1, [R, R1]>(other.value as L1) : Right<L | L1, [R, R1]>([value, other.value as R1]),
  flatMap: <U extends Type>(f: (value: R) => Either<L, U>): Either<L, U> => f(value),
  flatMapAsync: <U extends Type>(f: (value: R) => Promise<Either<L, U>>): Promise<Either<L, U>> =>
    f(value).catch((error: unknown) => Left<L, U>(error as L)) as Promise<Either<L, U>>,
  toOption: () => Some<R>(value),
  toList: () => List<R>([value]),
  toEither: <E extends Type>(_leftValue: E) => Right<E, R>(value),
  toTry: () => Try(() => value),
  toJSON() {
    return { _tag: "Right", value }
  },
  toString: () => {
    return `Right(${stringify(value)})`
  },
  *[Symbol.iterator]() {
    yield value
  },
  *yield() {
    yield value
  },
  traverse: <U extends Type>(f: (value: R) => Either<L, U>): Either<L, U[]> => {
    const result = f(value)
    return result.isLeft() ? Left(result.value as L) : Right([result.value as U])
  },
  *lazyMap<U extends Type>(f: (value: R) => U) {
    yield Right<L, U>(f(value))
  },
  tap: (f: (value: R) => void) => {
    f(value)
    return Right<L, R>(value)
  },
  tapLeft: (_f: (value: L) => void) => Right<L, R>(value),
  mapLeft: <L2 extends Type>(_f: (value: L) => L2) => Right<L2, R>(value),
  bimap: <L2 extends Type, R2 extends Type>(_fl: (value: L) => L2, fr: (value: R) => R2) => Right<L2, R2>(fr(value)),
  fold: <T extends Type>(_onLeft: (value: L) => T, onRight: (value: R) => T) => onRight(value),
  foldLeft:
    <B>(z: B) =>
    (op: (b: B, a: R) => B) =>
      op(z, value),
  foldRight:
    <B>(z: B) =>
    (op: (a: R, b: B) => B) =>
      op(value, z),
  match: <T>(patterns: { Left: (value: L) => T; Right: (value: R) => T }): T => patterns.Right(value),
  swap: () => Left<R, L>(value),
  toPromise: (): Promise<R> => Promise.resolve(value),
  toValue: () => ({ _tag: "Right", value }),
  pipeEither: <U extends Type>(_onLeft: (value: L) => U, onRight: (value: R) => U) => onRight(value),
  pipe: <U extends Type>(f: (value: L | R) => U) => f(value),
  serialize: () => createSerializer("Right", value),
  get size() {
    return 1
  },
  get isEmpty() {
    return false
  },
  contains: (v: R) => value === v,
  reduce: (_f: (b: R, a: R) => R) => value,
  reduceRight: (_f: (b: R, a: R) => R) => value,
  count: (p: (x: R) => boolean) => (p(value) ? 1 : 0),
  find: (p: (a: R) => boolean) => (p(value) ? Some(value) : None<R>()),
  exists: (p: (a: R) => boolean) => p(value),
  forEach: (f: (a: R) => void) => f(value),
  // Implement Doable interface for Do-notation
  doUnwrap(): DoResult<R> {
    return { ok: true, value }
  },
})

const LeftConstructor = <L extends Type, R extends Type>(value: L): Either<L, R> => ({
  _tag: "Left",
  value,
  isLeft(): this is Either<L, R> & { readonly _tag: "Left"; value: L } {
    return true
  },
  isRight(): this is Either<L, R> & { readonly _tag: "Right"; value: R } {
    return false
  },
  orElse: (defaultValue: R): R => defaultValue,
  orThrow: (error?: Error) => {
    throw error ?? value
  },
  or: (alternative: Either<L, R>) => alternative,
  orNull: () => null,
  orUndefined: () => undefined,
  map: <U extends Type>(_f: (value: R) => U): Either<L, U> => Left<L, U>(value),
  ap: <U extends Type>(_ff: Either<L, (value: R) => U>): Either<L, U> => Left<L, U>(value),
  mapAsync: <U extends Type>(_f: (value: R) => Promise<U>): Promise<Either<L, U>> =>
    Promise.resolve(Left<L, U>(value)) as Promise<Either<L, U>>,
  merge: <L1 extends Type, R1 extends Type>(_other: Either<L1, R1>): Either<L | L1, [R, R1]> =>
    Left<L | L1, [R, R1]>(value),
  flatMap: <U extends Type>(_f: (value: R) => Either<L, U>): Either<L, U> => Left<L, U>(value),
  flatMapAsync: <U extends Type>(_f: (value: R) => Promise<Either<L, U>>): Promise<Either<L, U>> =>
    Promise.resolve(Left<L, U>(value)) as Promise<Either<L, U>>,
  toOption: () => None<R>(),
  toList: () => List<R>(),
  toEither: <E extends Type>(leftValue: E) => Left<E, R>(leftValue),
  toTry: () =>
    Try<R>(() => {
      throw new Error(String(value))
    }),
  toJSON() {
    return { _tag: "Left", value }
  },
  toString: () => `Left(${stringify(value)})`,
  *[Symbol.iterator]() {
    // Left doesn't yield any values
  },
  *yield() {
    // Left doesn't yield any values
  },
  traverse: <U extends Type>(_f: (value: R) => Either<L, U>): Either<L, U[]> => Left(value),
  *lazyMap<U extends Type>(_f: (value: R) => U) {
    yield Left<L, U>(value)
  },
  tap: (_f: (value: R) => void) => Left<L, R>(value),
  tapLeft: (f: (value: L) => void) => {
    f(value)
    return Left<L, R>(value)
  },
  mapLeft: <L2 extends Type>(f: (value: L) => L2) => Left<L2, R>(f(value)),
  bimap: <L2 extends Type, R2 extends Type>(fl: (value: L) => L2, _fr: (value: R) => R2) => Left<L2, R2>(fl(value)),
  fold: <T extends Type>(onLeft: (value: L) => T, _onRight: (value: R) => T) => onLeft(value),
  foldLeft:
    <B>(z: B) =>
    (_op: (b: B, a: R) => B) =>
      z,
  foldRight:
    <B>(z: B) =>
    (_op: (a: R, b: B) => B) =>
      z,
  match: <T>(patterns: { Left: (value: L) => T; Right: (value: R) => T }): T => patterns.Left(value),
  swap: () => Right<R, L>(value),
  toPromise: (): Promise<R> => Promise.reject(value),
  toValue: () => ({ _tag: "Left", value }),
  pipeEither: <U extends Type>(onLeft: (value: L) => U, _onRight: (value: R) => U) => onLeft(value),
  pipe: <U extends Type>(f: (value: L | R) => U) => f(value),
  serialize: () => createSerializer("Left", value),
  get size() {
    return 0
  },
  get isEmpty() {
    return true
  },
  contains: (_v: R) => false,
  reduce: (_f: (b: R, a: R) => R) => {
    throw new Error("Cannot reduce a Left")
  },
  reduceRight: (_f: (b: R, a: R) => R) => {
    throw new Error("Cannot reduceRight a Left")
  },
  count: (_p: (x: R) => boolean) => 0,
  find: (_p: (a: R) => boolean) => None<R>(),
  exists: (_p: (a: R) => boolean) => false,
  forEach: (_f: (a: R) => void) => {},
  // Implement Doable interface for Do-notation
  doUnwrap(): DoResult<never> {
    return { ok: false, empty: false, error: value }
  },
})

export const Right = <L extends Type, R extends Type>(value: R): Either<L, R> => RightConstructor(value)
export const Left = <L extends Type, R extends Type>(value: L): Either<L, R> => LeftConstructor(value)

export const isRight = <L extends Type, R extends Type>(either: Either<L, R>): either is Either<L, R> & { value: R } =>
  either.isRight()
export const isLeft = <L extends Type, R extends Type>(either: Either<L, R>): either is Either<L, R> & { value: L } =>
  either.isLeft()

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
   * Type guard to check if an Either is Right
   * @param either - The Either to check
   * @returns True if Either is Right
   */
  isRight: <L extends Type, R extends Type>(either: Either<L, R>): either is Either<L, R> & { value: R } =>
    either.isRight(),

  /**
   * Type guard to check if an Either is Left
   * @param either - The Either to check
   * @returns True if Either is Left
   */
  isLeft: <L extends Type, R extends Type>(either: Either<L, R>): either is Either<L, R> & { value: L } =>
    either.isLeft(),

  /**
   * Combines an array of Eithers into a single Either containing an array
   * @param eithers - Array of Either values
   * @returns Either with array of values or first Left encountered
   */
  sequence: <L extends Type, R extends Type>(eithers: Either<L, R>[]): Either<L, R[]> => {
    return eithers.reduce<Either<L, R[]>>((acc, either) => {
      if (acc.isLeft()) return acc
      if (either.isLeft()) return Left(either.value as L)
      return acc.map((rights) => [...rights, either.value as R])
    }, Right<L, R[]>([]))
  },

  /**
   * Maps an array through a function that returns Either, then sequences the results
   * @param arr - Array of values
   * @param f - Function that returns Either
   * @returns Either with array of results or first Left encountered
   */
  traverse: <L extends Type, R extends Type, U extends Type>(
    arr: R[],
    f: (value: R) => Either<L, U>,
  ): Either<L, U[]> => {
    return EitherCompanion.sequence(arr.map(f))
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
  fromJSON: <L extends Type, R extends Type>(json: string): Either<L, R> => {
    const parsed = JSON.parse(json) as { _tag: string; value: L | R }
    return parsed._tag === "Right" ? Right<L, R>(parsed.value as R) : Left<L, R>(parsed.value as L)
  },

  /**
   * Creates an Either from YAML string
   * @param yaml - The YAML string
   * @returns Either instance
   */
  fromYAML: <L extends Type, R extends Type>(yaml: string): Either<L, R> => {
    const lines = yaml.split("\n")
    const tag = lines[0]?.split(": ")[1]
    const valueStr = lines[1]?.split(": ")[1]
    if (!tag || !valueStr) {
      throw new Error("Invalid YAML format for Either")
    }
    const value = JSON.parse(valueStr) as L | R
    return tag === "Right" ? Right<L, R>(value as R) : Left<L, R>(value as L)
  },

  /**
   * Creates an Either from binary string
   * @param binary - The binary string
   * @returns Either instance
   */
  fromBinary: <L extends Type, R extends Type>(binary: string): Either<L, R> => {
    const json = Buffer.from(binary, "base64").toString()
    return EitherCompanion.fromJSON<L, R>(json)
  },
}

export const Either = Companion(EitherConstructor, EitherCompanion)
