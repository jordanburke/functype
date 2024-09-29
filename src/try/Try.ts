import { Either, Left, Right } from "../either/Either"
import { Typeable } from "../typeable/Typeable"

export type Try<T> = {
  readonly _tag: "Success" | "Failure"
  readonly value: T | undefined
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
  valueOf: () => { _tag: "Success" | "Failure"; value?: T; error?: Error }
  toString: () => string
} & Typeable<"Success" | "Failure">

const Success = <T>(value: T): Try<T> => ({
  _tag: "Success",
  value,
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
  valueOf: () => ({ _tag: "Success", value }),
  toString: () => `Success(${JSON.stringify(value)})`,
})

const Failure = <T>(error: Error): Try<T> => ({
  _tag: "Failure",
  value: undefined,
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
  valueOf: () => ({ _tag: "Failure", error }),
  toString: () => `Failure(${error.message})`,
})

export const Try = <T>(f: () => T): Try<T> => {
  try {
    return Success(f())
  } catch (error) {
    return Failure(error instanceof Error ? error : new Error(String(error)))
  }
}
