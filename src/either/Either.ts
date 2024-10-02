import { Functor, Type } from "../functor"
import { List } from "../list/List"
import { None, Option, Some } from "../option/Option"
import { Typeable } from "../typeable/Typeable"

export type Either<L extends Type, R extends Type> = {
  readonly _tag: "Left" | "Right"
  value: L | R
  isLeft: () => boolean
  isRight: () => boolean
  getOrElse: (value: R) => R
  map: <U extends Type>(f: (value: R) => U) => Either<L, U>
  mapAsync: <U extends Type>(f: (value: R) => Promise<U>) => Promise<Either<L, U>>
  flatMap: <U extends Type>(f: (value: R) => Either<L, U>) => Either<L, U>
  flatMapAsync: <U extends Type>(f: (value: R) => Promise<Either<L, U>>) => Promise<Either<L, U>>
  toOption: () => Option<R>
  toList: () => List<R>
  valueOf: () => { _tag: "Left" | "Right"; value: L | R }
  toString: () => string
} & Functor<R> &
  Typeable<"Left" | "Right">

const RightConstructor = <L, R>(value: R): Either<L, R> => ({
  _tag: "Right",
  value,
  isLeft: () => false,
  isRight: () => true,
  getOrElse: (_else: R) => value,
  map: <U extends Type>(f: (value: R) => U): Either<L, U> => RightConstructor<L, U>(f(value)),
  mapAsync: async <U extends Type>(f: (value: R) => Promise<U>): Promise<Either<L, U>> => {
    const result = await f(value)
    return RightConstructor<L, U>(result)
  },
  flatMap: <U extends Type>(f: (value: R) => Either<L, U>): Either<L, U> => f(value),
  flatMapAsync: async <U extends Type>(f: (value: R) => Promise<Either<L, U>>): Promise<Either<L, U>> => {
    return await f(value)
  },
  toOption: () => Some<R>(value),
  toList: () => List<R>([value]),
  valueOf: () => ({ _tag: "Right", value }),
  toString: () => `Right(${JSON.stringify(value)})`,
})

const LeftConstructor = <L, R>(value: L): Either<L, R> => ({
  _tag: "Left",
  value,
  isLeft: () => true,
  isRight: () => false,
  getOrElse: (value: R) => value,
  map: <U extends Type>(_f: (_value: R) => U): Either<L, U> => LeftConstructor<L, U>(value),
  mapAsync: async <U extends Type>(_f: (_value: R) => Promise<U>): Promise<Either<L, U>> =>
    LeftConstructor<L, U>(value),
  flatMap: <U extends Type>(_f: (_value: R) => Either<L, U>): Either<L, U> => LeftConstructor<L, U>(value),
  flatMapAsync: async <U extends Type>(_f: (_value: R) => Promise<Either<L, U>>): Promise<Either<L, U>> =>
    LeftConstructor<L, U>(value),
  toOption: () => None<R>(),
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
