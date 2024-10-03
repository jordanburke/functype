import { Functor, Type } from "../functor"
import { List } from "../list/List"
import { None, Option, Some } from "../option/Option"
import { Typeable } from "../typeable/Typeable"

export type Either<L extends Type, R extends Type> = Functor<R> &
  Typeable<"Left" | "Right"> & {
    readonly _tag: "Left" | "Right"
    value: L | R
    isLeft: () => boolean
    isRight: () => boolean
    getOrElse: (defaultValue: R) => R
    getOrThrow: () => R
    map: <U extends Type>(f: (value: R) => U) => Either<L, U>
    mapAsync: <U extends Type>(f: (value: R) => Promise<U>) => Promise<Either<L, U>>
    flatMap: <U extends Type>(f: (value: R) => Either<L, U>) => Either<L, U>
    flatMapAsync: <U extends Type>(f: (value: R) => Promise<Either<L, U>>) => Promise<Either<L, U>>
    toOption: () => Option<R>
    toList: () => List<R>
    valueOf: () => { _tag: "Left" | "Right"; value: L | R }
    toString: () => string
  }

const RightConstructor = <L extends Type, R extends Type>(value: R): Either<L, R> => ({
  _tag: "Right",
  value,
  isLeft: () => false,
  isRight: () => true,
  getOrElse: (_defaultValue: R) => value,
  getOrThrow: () => value,
  map: <U extends Type>(f: (value: R) => U): Either<L, U> => Right(f(value)),
  mapAsync: <U extends Type>(f: (value: R) => Promise<U>): Promise<Either<L, U>> =>
    f(value)
      .then((result) => Right<L, U>(result))
      .catch((error: unknown) => Left<L, U>(error as L)),
  flatMap: <U extends Type>(f: (value: R) => Either<L, U>): Either<L, U> => f(value),
  flatMapAsync: <U extends Type>(f: (value: R) => Promise<Either<L, U>>): Promise<Either<L, U>> =>
    f(value).catch((error: unknown) => Left<L, U>(error as L)),
  toOption: () => Some<R>(value),
  toList: () => List<R>([value]),
  valueOf: () => ({ _tag: "Right", value }),
  toString: () => `Right(${JSON.stringify(value)})`,
})

const LeftConstructor = <L extends Type, R extends Type>(value: L): Either<L, R> => ({
  _tag: "Left",
  value,
  isLeft: () => true,
  isRight: () => false,
  getOrElse: (defaultValue: R) => defaultValue,
  getOrThrow: () => {
    throw value
  },
  map: <U extends Type>(_f: (value: R) => U): Either<L, U> => Left<L, U>(value),
  mapAsync: <U extends Type>(_f: (value: R) => Promise<U>): Promise<Either<L, U>> => Promise.resolve(Left<L, U>(value)),
  flatMap: <U extends Type>(_f: (value: R) => Either<L, U>): Either<L, U> => Left<L, U>(value),
  flatMapAsync: <U extends Type>(_f: (value: R) => Promise<Either<L, U>>): Promise<Either<L, U>> =>
    Promise.resolve(Left<L, U>(value)),
  toOption: () => None<R>(),
  toList: () => List<R>(),
  valueOf: () => ({ _tag: "Left", value }),
  toString: () => `Left(${JSON.stringify(value)})`,
})

export const Right = <L extends Type, R extends Type>(value: R): Either<L, R> => RightConstructor(value)
export const Left = <L extends Type, R extends Type>(value: L): Either<L, R> => LeftConstructor(value)

// Type guards
export const isRight = <L extends Type, R extends Type>(either: Either<L, R>): either is Either<L, R> & { value: R } =>
  either.isRight()
export const isLeft = <L extends Type, R extends Type>(either: Either<L, R>): either is Either<L, R> & { value: L } =>
  either.isLeft()

// Helper function to create Either from a potentially error-throwing function
export const tryCatch = <L extends Type, R extends Type>(f: () => R, onError: (error: unknown) => L): Either<L, R> => {
  try {
    return Right<L, R>(f())
  } catch (error: unknown) {
    return Left<L, R>(onError(error))
  }
}

// Async tryCatch
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
