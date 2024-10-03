import { Functor } from "../functor"
import { List } from "../list/List"
import { None, Option, Some } from "../option/Option"
import { Typeable } from "../typeable/Typeable"

export type Left<L, R> = {
  readonly _tag: "Left"
  readonly value: L
  isLeft: () => true
  isRight: () => false
  getOrElse: (defaultValue: R) => R
  getOrThrow: () => R
  map: <U>(f: (value: R) => U) => Left<L, U>
  mapAsync: <U>(f: (value: R) => Promise<U>) => Promise<Left<L, U>>
  flatMap: <L1, U>(f: (value: R) => Either<L1, U>) => Left<L | L1, U>
  flatMapAsync: <L1, U>(f: (value: R) => Promise<Either<L1, U>>) => Promise<Left<L | L1, U>>
  toOption: () => Option<R>
  toList: () => List<R>
  valueOf: () => { _tag: "Left"; value: L }
  toString: () => string
} & Typeable<"Left">

export type Right<L, R> = {
  readonly _tag: "Right"
  readonly value: R
  isLeft: () => false
  isRight: () => true
  getOrElse: (defaultValue: R) => R
  getOrThrow: () => R
  map: <U>(f: (value: R) => U) => Right<L, U>
  mapAsync: <U>(f: (value: R) => Promise<U>) => Promise<Right<L, U>>
  flatMap: <L1, U>(f: (value: R) => Either<L1, U>) => Either<L | L1, U>
  flatMapAsync: <L1, U>(f: (value: R) => Promise<Either<L1, U>>) => Promise<Either<L | L1, U>>
  toOption: () => Option<R>
  toList: () => List<R>
  valueOf: () => { _tag: "Right"; value: R }
  toString: () => string
} & Functor<R> &
  Typeable<"Right">

export type Either<L, R> = Left<L, R> | Right<L, R>

// Left Constructor
const LeftConstructor = <L, R>(value: L): Left<L, R> => ({
  _tag: "Left",
  value,
  isLeft: () => true as const,
  isRight: () => false as const,
  getOrElse: (defaultValue: R) => defaultValue,
  getOrThrow: () => {
    throw value
  },
  map: <U>(_: (value: R) => U): Left<L, U> => LeftConstructor<L, U>(value),
  mapAsync: async <U>(_: (value: R) => Promise<U>): Promise<Left<L, U>> => LeftConstructor<L, U>(value),
  flatMap: <L1, U>(_: (value: R) => Either<L1, U>): Left<L | L1, U> => LeftConstructor<L | L1, U>(value),
  flatMapAsync: async <L1, U>(_: (value: R) => Promise<Either<L1, U>>): Promise<Left<L | L1, U>> =>
    LeftConstructor<L | L1, U>(value),
  toOption: () => None<R>(),
  toList: () => None<R>().toList(),
  valueOf: () => ({ _tag: "Left", value }),
  toString: () => `Left(${JSON.stringify(value)})`,
})

// Right Constructor
const RightConstructor = <L, R>(value: R): Right<L, R> => ({
  _tag: "Right",
  value,
  isLeft: () => false as const,
  isRight: () => true as const,
  getOrElse: (_defaultValue: R) => value,
  getOrThrow: () => value,
  map: <U>(f: (value: R) => U): Right<L, U> => RightConstructor<L, U>(f(value)),
  mapAsync: async <U>(f: (value: R) => Promise<U>): Promise<Right<L, U>> => RightConstructor<L, U>(await f(value)),
  flatMap: <L1, U>(f: (value: R) => Either<L1, U>): Either<L | L1, U> => f(value),
  flatMapAsync: <L1, U>(f: (value: R) => Promise<Either<L1, U>>): Promise<Either<L | L1, U>> => f(value),
  toOption: () => Some(value),
  toList: () => Some(value).toList(),
  valueOf: () => ({ _tag: "Right", value }),
  toString: () => `Right(${JSON.stringify(value)})`,
})

// Exported Constructors
export const Left = <L, R>(value: L): Left<L, R> => LeftConstructor<L, R>(value)
export const Right = <L, R>(value: R): Right<L, R> => RightConstructor<L, R>(value)

// Type Guards
export const isLeft = <L, R>(either: Either<L, R>): either is Left<L, R> => either._tag === "Left"

export const isRight = <L, R>(either: Either<L, R>): either is Right<L, R> => either._tag === "Right"

// Helper function to create Either from a potentially error-throwing function
export const tryCatch = <L, R>(f: () => R, onError: (error: unknown) => L): Either<L, R> => {
  try {
    return Right<L, R>(f())
  } catch (error) {
    return Left<L, R>(onError(error))
  }
}

// Async tryCatch
export const tryCatchAsync = async <L, R>(
  f: () => Promise<R>,
  onError: (error: unknown) => L,
): Promise<Either<L, R>> => {
  try {
    const result = await f()
    return Right<L, R>(result)
  } catch (error) {
    return Left<L, R>(onError(error))
  }
}
