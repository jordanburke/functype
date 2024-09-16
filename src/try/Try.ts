import { Left, Right, Either } from "../either"
import { Typeable } from "../functor"

export type Try<T> = {
  readonly _tag: "Success" | "Failure"
  readonly value: T | undefined
  readonly error: Error | undefined
  isSuccess: () => boolean
  isFailure: () => boolean
  getOrElse: (defaultValue: T) => T
  orElse: (alternative: Try<T>) => Try<T>
  toEither: () => Either<Error, T>
  map: <U>(f: (value: T) => U) => Try<U>
  flatMap: <U>(f: (value: T) => Try<U>) => Try<U>
  valueOf: () => { _tag: "Success" | "Failure"; value?: T; error?: Error }
  toString: () => string
} & Typeable

const createSuccess = <T>(value: T): Try<T> => ({
  _tag: "Success",
  value,
  error: undefined,
  isSuccess: () => true,
  isFailure: () => false,
  getOrElse: (_defaultValue: T) => value,
  orElse: (_alternative: Try<T>) => createSuccess(value),
  toEither: () => Right<Error, T>(value),
  map: <U>(f: (value: T) => U) => Try(() => f(value)),
  flatMap: <U>(f: (value: T) => Try<U>) => f(value),
  valueOf: () => ({ _tag: "Success", value }),
  toString: () => `Success(${JSON.stringify(value)})`,
})

const createFailure = <T>(error: Error): Try<T> => ({
  _tag: "Failure",
  value: undefined,
  error,
  isSuccess: () => false,
  isFailure: () => true,
  getOrElse: (defaultValue: T) => defaultValue,
  orElse: (alternative: Try<T>) => alternative,
  toEither: () => Left<Error, T>(error),
  map: <U>(_f: (value: T) => U) => createFailure<U>(error),
  flatMap: <U>(_f: (value: T) => Try<U>) => createFailure<U>(error),
  valueOf: () => ({ _tag: "Failure", error }),
  toString: () => `Failure(${error.message})`,
})

export const Try = <T>(f: () => T): Try<T> => {
  try {
    return createSuccess(f())
  } catch (error) {
    return createFailure(error instanceof Error ? error : new Error(String(error)))
  }
}

// Pattern matching function
export const match = <T, U>(
  tryValue: Try<T>,
  patterns: { Success: (value: T) => U; Failure: (error: Error) => U },
): U =>
  tryValue._tag === "Success" ? patterns.Success(tryValue.value as T) : patterns.Failure(tryValue.error as Error)
