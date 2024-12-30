import stringify from "safe-stable-stringify"

import { Either, Left, Right } from "@/either/Either"
import { Typeable } from "@/typeable/Typeable"
import { Valuable } from "@/valuable/Valuable"

type TypeNames = "Success" | "Failure"

export type Try<T> = {
  readonly _tag: TypeNames
  readonly error: Error | undefined
  isSuccess: () => boolean
  isFailure: () => boolean
  get: () => T
  getOrElse: (defaultValue: T) => T
  orElse: (alternative: Try<T>) => Try<T>
  orThrow: (error: Error) => T
  toEither: () => Either<Error, T>
  map: <U>(f: (value: T) => U) => Try<U>
  flatMap: <U>(f: (value: T) => Try<U>) => Try<U>
  toString: () => string
} & Typeable<TypeNames> &
  Valuable<TypeNames, T | Error>

const Success = <T>(value: T): Try<T> => ({
  _tag: "Success",
  error: undefined,
  isSuccess: () => true,
  isFailure: () => false,
  get: () => value,
  getOrElse: (_defaultValue: T) => value,
  orElse: (_alternative: Try<T>) => Success(value),
  orThrow: (_error: Error) => value,
  toEither: () => Right<Error, T>(value),
  map: <U>(f: (value: T) => U) => Try(() => f(value)),
  flatMap: <U>(f: (value: T) => Try<U>) => f(value),
  toString: () => `Success(${stringify(value)})`,
  toValue: () => ({ _tag: "Success", value }),
})

const Failure = <T>(error: Error): Try<T> => ({
  _tag: "Failure",
  error,
  isSuccess: () => false,
  isFailure: () => true,
  get: () => {
    throw error
  },
  getOrElse: (defaultValue: T) => defaultValue,
  orElse: (alternative: Try<T>) => alternative,
  orThrow: (error: Error) => {
    throw error
  },
  toEither: () => Left<Error, T>(error),
  map: <U>(_f: (value: T) => U) => Failure<U>(error),
  flatMap: <U>(_f: (value: T) => Try<U>) => Failure<U>(error),
  toString: () => `Failure(${stringify(error)}))`,
  toValue: () => ({ _tag: "Failure", value: error }),
})

export const Try = <T>(f: () => T): Try<T> => {
  try {
    return Success(f())
  } catch (error) {
    return Failure(error instanceof Error ? error : new Error(String(error)))
  }
}
