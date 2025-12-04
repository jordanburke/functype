import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import type { Type } from "@/types"

/**
 * Exit type module - represents the outcome of running an IO effect.
 * @module Exit
 * @category IO
 */

/**
 * Possible outcome types for an Exit
 */
export type ExitTag = "Success" | "Failure" | "Interrupted"

/**
 * Exit represents the outcome of running an IO effect.
 * - Success: The effect completed successfully with a value
 * - Failure: The effect failed with a typed error
 * - Interrupted: The effect was cancelled/interrupted
 */
export interface Exit<E extends Type, A extends Type> {
  readonly _tag: ExitTag

  /**
   * Type guard to check if this is a Success
   */
  isSuccess(): this is Exit<E, A> & { readonly _tag: "Success"; value: A }

  /**
   * Type guard to check if this is a Failure
   */
  isFailure(): this is Exit<E, A> & { readonly _tag: "Failure"; error: E }

  /**
   * Type guard to check if this is Interrupted
   */
  isInterrupted(): this is Exit<E, A> & { readonly _tag: "Interrupted"; fiberId: string }

  /**
   * Maps the success value
   */
  map<B extends Type>(f: (a: A) => B): Exit<E, B>

  /**
   * Maps the error value
   */
  mapError<E2 extends Type>(f: (e: E) => E2): Exit<E2, A>

  /**
   * Maps both error and success values
   */
  mapBoth<E2 extends Type, B extends Type>(onError: (e: E) => E2, onSuccess: (a: A) => B): Exit<E2, B>

  /**
   * Flat maps the success value
   */
  flatMap<B extends Type>(f: (a: A) => Exit<E, B>): Exit<E, B>

  /**
   * Pattern matches over the Exit
   */
  fold<T>(onFailure: (e: E) => T, onSuccess: (a: A) => T, onInterrupted?: (fiberId: string) => T): T

  /**
   * Pattern matches over the Exit with object patterns
   */
  match<T>(patterns: { Success: (value: A) => T; Failure: (error: E) => T; Interrupted: (fiberId: string) => T }): T

  /**
   * Returns the success value or throws
   */
  orThrow(): A

  /**
   * Returns the success value or a default
   */
  orElse(defaultValue: A): A

  /**
   * Converts to Option (Some for Success, None otherwise)
   */
  toOption(): Option<A>

  /**
   * Converts to Either (Right for Success, Left for Failure)
   * Throws if Interrupted
   */
  toEither(): Either<E, A>

  /**
   * Returns the raw value for inspection
   */
  toValue(): { _tag: ExitTag; value?: A; error?: E; fiberId?: string }

  /**
   * String representation
   */
  toString(): string

  /**
   * JSON serialization
   */
  toJSON(): { _tag: ExitTag; value?: A; error?: E; fiberId?: string }
}

/**
 * Creates a Success Exit
 */
const SuccessExit = <E extends Type, A extends Type>(value: A): Exit<E, A> => ({
  _tag: "Success",

  isSuccess(): this is Exit<E, A> & { readonly _tag: "Success"; value: A } {
    return true
  },

  isFailure(): this is Exit<E, A> & { readonly _tag: "Failure"; error: E } {
    return false
  },

  isInterrupted(): this is Exit<E, A> & { readonly _tag: "Interrupted"; fiberId: string } {
    return false
  },

  map<B extends Type>(f: (a: A) => B): Exit<E, B> {
    return SuccessExit(f(value))
  },

  mapError<E2 extends Type>(_f: (e: E) => E2): Exit<E2, A> {
    return SuccessExit(value)
  },

  mapBoth<E2 extends Type, B extends Type>(_onError: (e: E) => E2, onSuccess: (a: A) => B): Exit<E2, B> {
    return SuccessExit(onSuccess(value))
  },

  flatMap<B extends Type>(f: (a: A) => Exit<E, B>): Exit<E, B> {
    return f(value)
  },

  fold<T>(_onFailure: (e: E) => T, onSuccess: (a: A) => T, _onInterrupted?: (fiberId: string) => T): T {
    return onSuccess(value)
  },

  match<T>(patterns: { Success: (value: A) => T; Failure: (error: E) => T; Interrupted: (fiberId: string) => T }): T {
    return patterns.Success(value)
  },

  orThrow(): A {
    return value
  },

  orElse(_defaultValue: A): A {
    return value
  },

  toOption(): Option<A> {
    return Some(value)
  },

  toEither(): Either<E, A> {
    return Right(value)
  },

  toValue() {
    return { _tag: "Success" as const, value }
  },

  toString() {
    return `Exit.Success(${stringify(value)})`
  },

  toJSON() {
    return { _tag: "Success" as const, value }
  },
})

/**
 * Creates a Failure Exit
 */
const FailureExit = <E extends Type, A extends Type>(error: E): Exit<E, A> => ({
  _tag: "Failure",

  isSuccess(): this is Exit<E, A> & { readonly _tag: "Success"; value: A } {
    return false
  },

  isFailure(): this is Exit<E, A> & { readonly _tag: "Failure"; error: E } {
    return true
  },

  isInterrupted(): this is Exit<E, A> & { readonly _tag: "Interrupted"; fiberId: string } {
    return false
  },

  map<B extends Type>(_f: (a: A) => B): Exit<E, B> {
    return FailureExit(error)
  },

  mapError<E2 extends Type>(f: (e: E) => E2): Exit<E2, A> {
    return FailureExit(f(error))
  },

  mapBoth<E2 extends Type, B extends Type>(onError: (e: E) => E2, _onSuccess: (a: A) => B): Exit<E2, B> {
    return FailureExit(onError(error))
  },

  flatMap<B extends Type>(_f: (a: A) => Exit<E, B>): Exit<E, B> {
    return FailureExit(error)
  },

  fold<T>(onFailure: (e: E) => T, _onSuccess: (a: A) => T, _onInterrupted?: (fiberId: string) => T): T {
    return onFailure(error)
  },

  match<T>(patterns: { Success: (value: A) => T; Failure: (error: E) => T; Interrupted: (fiberId: string) => T }): T {
    return patterns.Failure(error)
  },

  orThrow(): A {
    throw error
  },

  orElse(defaultValue: A): A {
    return defaultValue
  },

  toOption(): Option<A> {
    return None()
  },

  toEither(): Either<E, A> {
    return Left(error)
  },

  toValue() {
    return { _tag: "Failure" as const, error }
  },

  toString() {
    return `Exit.Failure(${stringify(error)})`
  },

  toJSON() {
    return { _tag: "Failure" as const, error }
  },
})

/**
 * Creates an Interrupted Exit
 */
const InterruptedExit = <E extends Type, A extends Type>(fiberId: string): Exit<E, A> => ({
  _tag: "Interrupted",

  isSuccess(): this is Exit<E, A> & { readonly _tag: "Success"; value: A } {
    return false
  },

  isFailure(): this is Exit<E, A> & { readonly _tag: "Failure"; error: E } {
    return false
  },

  isInterrupted(): this is Exit<E, A> & { readonly _tag: "Interrupted"; fiberId: string } {
    return true
  },

  map<B extends Type>(_f: (a: A) => B): Exit<E, B> {
    return InterruptedExit(fiberId)
  },

  mapError<E2 extends Type>(_f: (e: E) => E2): Exit<E2, A> {
    return InterruptedExit(fiberId)
  },

  mapBoth<E2 extends Type, B extends Type>(_onError: (e: E) => E2, _onSuccess: (a: A) => B): Exit<E2, B> {
    return InterruptedExit(fiberId)
  },

  flatMap<B extends Type>(_f: (a: A) => Exit<E, B>): Exit<E, B> {
    return InterruptedExit(fiberId)
  },

  fold<T>(_onFailure: (e: E) => T, _onSuccess: (a: A) => T, onInterrupted?: (fiberId: string) => T): T {
    if (onInterrupted) {
      return onInterrupted(fiberId)
    }
    throw new Error(`Effect was interrupted: ${fiberId}`)
  },

  match<T>(patterns: { Success: (value: A) => T; Failure: (error: E) => T; Interrupted: (fiberId: string) => T }): T {
    return patterns.Interrupted(fiberId)
  },

  orThrow(): A {
    throw new Error(`Effect was interrupted: ${fiberId}`)
  },

  orElse(defaultValue: A): A {
    return defaultValue
  },

  toOption(): Option<A> {
    return None()
  },

  toEither(): Either<E, A> {
    throw new Error(`Cannot convert Interrupted Exit to Either: ${fiberId}`)
  },

  toValue() {
    return { _tag: "Interrupted" as const, fiberId }
  },

  toString() {
    return `Exit.Interrupted(${fiberId})`
  },

  toJSON() {
    return { _tag: "Interrupted" as const, fiberId }
  },
})

/**
 * Exit companion methods
 */
const ExitCompanion = {
  /**
   * Creates a Success Exit
   */
  succeed: <E extends Type, A extends Type>(value: A): Exit<E, A> => SuccessExit(value),

  /**
   * Creates a Failure Exit
   */
  fail: <E extends Type, A extends Type>(error: E): Exit<E, A> => FailureExit(error),

  /**
   * Creates an Interrupted Exit with a fiber ID
   */
  interrupt: <E extends Type, A extends Type>(fiberId: string): Exit<E, A> => InterruptedExit(fiberId),

  /**
   * Creates an Interrupted Exit with a default fiber ID
   */
  interrupted: <E extends Type, A extends Type>(): Exit<E, A> => InterruptedExit("interrupted"),

  /**
   * Type guard for Success
   */
  isSuccess: <E extends Type, A extends Type>(
    exit: Exit<E, A>,
  ): exit is Exit<E, A> & { readonly _tag: "Success"; value: A } => exit.isSuccess(),

  /**
   * Type guard for Failure
   */
  isFailure: <E extends Type, A extends Type>(
    exit: Exit<E, A>,
  ): exit is Exit<E, A> & { readonly _tag: "Failure"; error: E } => exit.isFailure(),

  /**
   * Type guard for Interrupted
   */
  isInterrupted: <E extends Type, A extends Type>(
    exit: Exit<E, A>,
  ): exit is Exit<E, A> & { readonly _tag: "Interrupted"; fiberId: string } => exit.isInterrupted(),

  /**
   * Creates an Exit from an Either
   */
  fromEither: <E extends Type, A extends Type>(either: Either<E, A>): Exit<E, A> =>
    either.isRight() ? SuccessExit(either.value as A) : FailureExit(either.value as E),

  /**
   * Creates an Exit from an Option
   */
  fromOption: <A extends Type>(option: Option<A>, onNone: () => unknown): Exit<unknown, A> =>
    option.isSome() ? SuccessExit(option.value) : FailureExit(onNone()),

  /**
   * Combines two Exits, keeping the first failure or combining successes
   */
  zip: <E extends Type, A extends Type, B extends Type>(
    exitA: Exit<E, A>,
    exitB: Exit<E, B>,
  ): Exit<E, readonly [A, B]> => {
    if (exitA.isInterrupted()) return exitA as unknown as Exit<E, readonly [A, B]>
    if (exitB.isInterrupted()) return exitB as unknown as Exit<E, readonly [A, B]>
    if (exitA.isFailure()) return exitA as unknown as Exit<E, readonly [A, B]>
    if (exitB.isFailure()) return exitB as unknown as Exit<E, readonly [A, B]>
    return SuccessExit([exitA.orThrow(), exitB.orThrow()] as const)
  },

  /**
   * Collects all Exits into an Exit of array
   */
  all: <E extends Type, A extends Type>(exits: readonly Exit<E, A>[]): Exit<E, readonly A[]> => {
    const results: A[] = []
    for (const exit of exits) {
      if (exit.isInterrupted()) return exit as unknown as Exit<E, readonly A[]>
      if (exit.isFailure()) return exit as unknown as Exit<E, readonly A[]>
      results.push(exit.orThrow())
    }
    return SuccessExit(results)
  },
}

/**
 * Exit constructor - creates an Exit from a value (defaults to Success)
 */
const ExitConstructor = <E extends Type, A extends Type>(value: A): Exit<E, A> => SuccessExit(value)

/**
 * Exit type for representing effect outcomes.
 *
 * @example
 * ```typescript
 * const success = Exit.succeed(42)
 * const failure = Exit.fail(new Error("oops"))
 * const interrupted = Exit.interrupt("fiber-123")
 *
 * success.fold(
 *   (err) => console.error(err),
 *   (value) => console.log(value),
 *   (fiberId) => console.log("interrupted:", fiberId)
 * )
 * ```
 */
export const Exit = Companion(ExitConstructor, ExitCompanion)
