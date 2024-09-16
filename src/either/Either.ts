import { Functor, Type } from "../functor"
import { List } from "../list"
import { none, Option, some } from "../option"
import { Typeable } from "../index"

export type Either<L extends Type, R extends Type> = {
  readonly _tag: "Left" | "Right"
  value: L | R
  isLeft: () => boolean
  isRight: () => boolean
  map: <U extends Type>(f: (value: R) => U) => Either<L, U>
  flatMap: <U extends Type>(f: (value: R) => Either<L, U>) => Either<L, U>
  toOption: () => Option<R>
  toList: () => List<R>
  valueOf: () => { _tag: "Left" | "Right"; value: L | R }
  toString: () => string
} & Functor<R> &
  Typeable

const RightConstructor = <L, R>(value: R): Either<L, R> => ({
  _tag: "Right",
  value,
  isLeft: () => false,
  isRight: () => true,
  map: <U extends Type>(f: (value: R) => U): Either<L, U> => RightConstructor<L, U>(f(value)),
  flatMap: <U extends Type>(f: (value: R) => Either<L, U>): Either<L, U> => f(value),
  toOption: () => some<R>(value),
  toList: () => List<R>([value]),
  valueOf: () => ({ _tag: "Right", value }),
  toString: () => `Right(${JSON.stringify(value)})`,
})

const LeftConstructor = <L, R>(value: L): Either<L, R> => ({
  _tag: "Left",
  value,
  isLeft: () => true,
  isRight: () => false,
  map: <U extends Type>(_f: (value: R) => U): Either<L, U> => LeftConstructor<L, U>(value),
  flatMap: <U extends Type>(_f: (value: R) => Either<L, U>): Either<L, U> => LeftConstructor<L, U>(value),
  toOption: () => none<R>(),
  toList: () => List<R>(),
  valueOf: () => ({ _tag: "Left", value }),
  toString: () => `Left(${JSON.stringify(value)})`,
})

export const Right = <L, R>(value: R): Either<L, R> => RightConstructor(value)
export const Left = <L, R>(value: L): Either<L, R> => LeftConstructor(value)

// Type guards
export const isRight = <L, R>(either: Either<L, R>): either is Either<L, R> & { value: R } => either.isRight()
export const isLeft = <L, R>(either: Either<L, R>): either is Either<L, R> & { value: L } => either.isLeft()

// Helper function to create Either from a potential error-throwing function
export const tryCatch = <L, R>(f: () => R, onError: (error: unknown) => L): Either<L, R> => {
  try {
    return Right<L, R>(f())
  } catch (error) {
    return Left<L, R>(onError(error))
  }
}

// Pattern matching function
export const match = <L, R, U>(either: Either<L, R>, patterns: { Left: (value: L) => U; Right: (value: R) => U }): U =>
  either._tag === "Right" ? patterns.Right(either.value as R) : patterns.Left(either.value as L)
