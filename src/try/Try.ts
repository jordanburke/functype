import stringify from "safe-stable-stringify"

import { Companion } from "@/companion"
import { Either, Left, Right } from "@/either/Either"
import type { Foldable } from "@/foldable"
import type { Type } from "@/functor"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
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
  /**
   * Pattern matches over the Try, applying onFailure if Failure and onSuccess if Success
   * @param onFailure - Function to apply if the Try is Failure
   * @param onSuccess - Function to apply if the Try is Success
   * @returns The result of applying the appropriate function
   */
  fold: <U extends Type>(onFailure: (error: Error) => U, onSuccess: (value: T) => U) => U
  toString: () => string
} & Typeable<TypeNames> &
  Valuable<TypeNames, T | Error> &
  Serializable<T> &
  Pipe<T> &
  Foldable<T>

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
  fold: <U extends Type>(_onFailure: (error: Error) => U, onSuccess: (value: T) => U): U => onSuccess(value),
  foldLeft:
    <B>(z: B) =>
    (op: (b: B, a: T) => B) =>
      op(z, value),
  foldRight:
    <B>(z: B) =>
    (op: (a: T, b: B) => B) =>
      op(value, z),
  toString: () => `Success(${stringify(value)})`,
  toValue: () => ({ _tag: "Success", value }),
  pipe: <U>(f: (value: T) => U) => f(value),
  serialize: () => {
    return {
      toJSON: () => JSON.stringify({ _tag: "Success", value }),
      toYAML: () => `_tag: Success\nvalue: ${stringify(value)}`,
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "Success", value })).toString("base64"),
    }
  },
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
  fold: <U extends Type>(onFailure: (error: Error) => U, _onSuccess: (value: T) => U): U => onFailure(error),
  foldLeft:
    <B>(z: B) =>
    (_op: (b: B, a: T) => B) =>
      z, // No transformation on failure
  foldRight:
    <B>(z: B) =>
    (_op: (a: T, b: B) => B) =>
      z, // No transformation on failure
  toString: () => `Failure(${stringify(error)}))`,
  toValue: () => ({ _tag: "Failure", value: error }),
  pipe: <U>(_f: (value: T) => U) => {
    throw error
  },
  serialize: () => {
    return {
      toJSON: () => JSON.stringify({ _tag: "Failure", error: error.message, stack: error.stack }),
      toYAML: () => `_tag: Failure\nerror: ${error.message}\nstack: ${error.stack}`,
      toBinary: () =>
        Buffer.from(JSON.stringify({ _tag: "Failure", error: error.message, stack: error.stack })).toString("base64"),
    }
  },
})

const TryConstructor = <T>(f: () => T): Try<T> => {
  try {
    return Success(f())
  } catch (error) {
    return Failure(error instanceof Error ? error : new Error(String(error)))
  }
}

const TryCompanion = {
  /**
   * Creates a Try from JSON string
   * @param json - The JSON string
   * @returns Try instance
   */
  fromJSON: <T>(json: string): Try<T> => {
    const parsed = JSON.parse(json)
    if (parsed._tag === "Success") {
      return Success<T>(parsed.value)
    } else {
      const error = new Error(parsed.error)
      if (parsed.stack) {
        error.stack = parsed.stack
      }
      return Failure<T>(error)
    }
  },

  /**
   * Creates a Try from YAML string
   * @param yaml - The YAML string
   * @returns Try instance
   */
  fromYAML: <T>(yaml: string): Try<T> => {
    const lines = yaml.split("\n")
    const tag = lines[0]?.split(": ")[1]

    if (!tag) {
      return Failure<T>(new Error("Invalid YAML format for Try"))
    }

    if (tag === "Success") {
      const valueStr = lines[1]?.split(": ")[1]
      if (!valueStr) {
        return Failure<T>(new Error("Invalid YAML format for Try Success"))
      }
      const value = JSON.parse(valueStr)
      return Success<T>(value)
    } else {
      const errorMsg = lines[1]?.split(": ")[1]
      if (!errorMsg) {
        return Failure<T>(new Error("Invalid YAML format for Try Failure"))
      }
      const stackLine = lines[2]?.split(": ")
      const stack = stackLine && stackLine.length > 1 ? stackLine.slice(1).join(": ") : undefined
      const error = new Error(errorMsg)
      if (stack) {
        error.stack = stack
      }
      return Failure<T>(error)
    }
  },

  /**
   * Creates a Try from binary string
   * @param binary - The binary string
   * @returns Try instance
   */
  fromBinary: <T>(binary: string): Try<T> => {
    const json = Buffer.from(binary, "base64").toString()
    return TryCompanion.fromJSON<T>(json)
  },
}

export const Try = Companion(TryConstructor, TryCompanion)
