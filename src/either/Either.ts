import stringify from "safe-stable-stringify"

import type { AsyncMonad } from "@/functor/Functor"
import type { FunctypeBase } from "@/functype"
import { List } from "@/list/List"
import { None, Option, Some } from "@/option/Option"
import type { Type } from "@/types"

/**
 * Either type module
 * @module Either
 * @category Core
 */
export interface Either<L extends Type, R extends Type> extends FunctypeBase<R, "Left" | "Right">, PromiseLike<R> {
  readonly _tag: "Left" | "Right"
  value: L | R
  isLeft: () => boolean
  isRight: () => boolean
  get: () => R
  getOrElse: (defaultValue: R) => R
  getOrThrow: (error?: Error) => R
  orElse(alternative: Either<L, R>): Either<L, R>
  orNull: () => R | null
  orUndefined: () => R | undefined
  map: <U extends Type>(f: (value: R) => U) => Either<L, U>
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
  isLeft: () => false,
  isRight: () => true,
  get: () => value,
  getOrElse: (_defaultValue: R) => value,
  getOrThrow: () => value,
  orElse: (_alternative: Either<L, R>) => Right<L, R>(value),
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
  toJSON: function () {
    return { _tag: "Right", value }
  },
  toString: () => {
    return `Right(${stringify(value)})`
  },
  [Symbol.iterator]: function* () {
    yield value
  },
  yield: function* () {
    yield value
  },
  traverse: <U extends Type>(f: (value: R) => Either<L, U>): Either<L, U[]> => {
    const result = f(value)
    return result.isLeft() ? Left(result.value as L) : Right([result.value as U])
  },
  lazyMap: function* <U extends Type>(f: (value: R) => U) {
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
  then: <TResult1 = R, TResult2 = never>(
    onfulfilled?: ((value: R) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2> => {
    return Promise.resolve(value).then(onfulfilled, onrejected)
  },
  toValue: () => ({ _tag: "Right", value }),
  pipeEither: <U extends Type>(_onLeft: (value: L) => U, onRight: (value: R) => U) => onRight(value),
  pipe: <U extends Type>(f: (value: L | R) => U) => f(value),
  serialize: () => {
    return {
      toJSON: () => JSON.stringify({ _tag: "Right", value }),
      toYAML: () => `_tag: Right\nvalue: ${stringify(value)}`,
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "Right", value })).toString("base64"),
    }
  },
  get size() {
    return 1
  },
  get isEmpty() {
    return false
  },
  contains: (v: R) => value === v,
  reduce: (f: (b: R, a: R) => R) => value,
  reduceRight: (f: (b: R, a: R) => R) => value,
})

const LeftConstructor = <L extends Type, R extends Type>(value: L): Either<L, R> => ({
  _tag: "Left",
  value,
  isLeft: () => true,
  isRight: () => false,
  get: () => {
    throw new Error(`Cannot call get() on Left(${stringify(value)})`)
  },
  getOrElse: (defaultValue: R): R => defaultValue,
  getOrThrow: (error?: Error) => {
    throw error || value
  },
  orElse: (alternative: Either<L, R>) => alternative,
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
  toJSON: function () {
    return { _tag: "Left", value }
  },
  toString: () => `Left(${stringify(value)})`,
  [Symbol.iterator]: function* () {
    // Left doesn't yield any values
  },
  yield: function* () {
    // Left doesn't yield any values
  },
  traverse: <U extends Type>(_f: (value: R) => Either<L, U>): Either<L, U[]> => Left(value),
  lazyMap: function* <U extends Type>(_f: (value: R) => U) {
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
  then: <TResult1 = R, TResult2 = never>(
    _onfulfilled?: ((value: R) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2> => {
    return Promise.reject(value).then(null, onrejected)
  },
  toValue: () => ({ _tag: "Left", value }),
  pipeEither: <U extends Type>(onLeft: (value: L) => U, _onRight: (value: R) => U) => onLeft(value),
  pipe: <U extends Type>(f: (value: L | R) => U) => f(value),
  serialize: () => {
    return {
      toJSON: () => JSON.stringify({ _tag: "Left", value }),
      toYAML: () => `_tag: Left\nvalue: ${stringify(value)}`,
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "Left", value })).toString("base64"),
    }
  },
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

export const Either = {
  sequence: <L extends Type, R extends Type>(eithers: Either<L, R>[]): Either<L, R[]> => {
    const rights: R[] = []
    for (const either of eithers) {
      if (either.isLeft()) {
        return Left(either.value as L)
      }
      rights.push(either.value as R)
    }
    return Right(rights)
  },

  traverse: <L extends Type, R extends Type, U extends Type>(
    arr: R[],
    f: (value: R) => Either<L, U>,
  ): Either<L, U[]> => {
    return Either.sequence(arr.map(f))
  },

  fromNullable: <L extends Type, R extends Type>(value: R | null | undefined, leftValue: L): Either<L, R> =>
    value === null || value === undefined ? Left(leftValue) : Right(value as R),

  fromPredicate: <L extends Type, R extends Type>(
    value: R,
    predicate: (value: R) => boolean,
    leftValue: L,
  ): Either<L, R> => (predicate(value) ? Right(value) : Left(leftValue)),

  ap: <L extends Type, R extends Type, U extends Type>(
    eitherF: Either<L, (value: R) => U>,
    eitherV: Either<L, R>,
  ): Either<L, U> => eitherF.flatMap((f) => eitherV.map(f)),

  fromPromise: async <L, R>(promise: Promise<R>, onRejected: (reason: unknown) => L): Promise<Either<L, R>> => {
    try {
      const result = await promise
      return Right<L, R>(result)
    } catch (error) {
      return Left<L, R>(onRejected(error))
    }
  },

  fromJSON: <L extends Type, R extends Type>(json: string): Either<L, R> => {
    const parsed = JSON.parse(json)
    return parsed._tag === "Right" ? Right<L, R>(parsed.value) : Left<L, R>(parsed.value)
  },

  fromYAML: <L extends Type, R extends Type>(yaml: string): Either<L, R> => {
    const lines = yaml.split("\n")
    const tag = lines[0]?.split(": ")[1]
    const valueStr = lines[1]?.split(": ")[1]
    if (!tag || !valueStr) {
      throw new Error("Invalid YAML format for Either")
    }
    const value = JSON.parse(valueStr)
    return tag === "Right" ? Right<L, R>(value) : Left<L, R>(value)
  },

  fromBinary: <L extends Type, R extends Type>(binary: string): Either<L, R> => {
    const json = Buffer.from(binary, "base64").toString()
    return Either.fromJSON<L, R>(json)
  },
}
