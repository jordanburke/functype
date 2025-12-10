import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import type { Option } from "@/option/Option"
import { None, Option as OptionConstructor, Some } from "@/option/Option"
import { Try } from "@/try/Try"
import type { Type } from "@/types"

import type { Context } from "./Context"
import { Context as ContextCompanion } from "./Context"
import type { Exit as ExitType } from "./Exit"
import { Exit } from "./Exit"
import type { Layer } from "./Layer"
import type { Tag, TagService } from "./Tag"

/**
 * Internal utility for type coercion in the effect interpreter.
 * Used when TypeScript's type system can't express the actual type relationship.
 * This is a common pattern in effect libraries (Effect-TS uses similar internally).
 * @internal
 */
const unsafeCoerce = <A, B>(a: A): B => a as unknown as B

/**
 * Error thrown when an effect times out.
 */
// eslint-disable-next-line functional/no-classes
export class TimeoutError extends Error {
  readonly _tag = "TimeoutError" as const
  constructor(
    readonly duration: number,
    message?: string,
  ) {
    super(message ?? `Effect timed out after ${duration}ms`)
    this.name = "TimeoutError"
  }
}

/**
 * Error thrown when an effect is interrupted.
 */
// eslint-disable-next-line functional/no-classes
export class InterruptedError extends Error {
  readonly _tag = "InterruptedError" as const
  constructor(message?: string) {
    super(message ?? "Effect was interrupted")
    this.name = "InterruptedError"
  }
}

/**
 * IO Effect type module - a lazy, composable effect type with typed errors.
 * @module IO
 * @category IO
 *
 * IO<R, E, A> represents an effectful computation that:
 * - Requires environment R to run
 * - May fail with error E
 * - Produces value A on success
 *
 * Key features:
 * - Lazy execution (nothing runs until explicitly executed)
 * - Unified sync/async API
 * - Typed errors at compile time
 * - Composable via map/flatMap
 */

/**
 * Internal effect representation types
 */
type IOEffect<R, E, A> =
  | { readonly _tag: "Sync"; readonly thunk: () => A }
  | { readonly _tag: "Async"; readonly thunk: () => Promise<A> }
  | { readonly _tag: "Auto"; readonly thunk: () => A | Promise<A> }
  | { readonly _tag: "Succeed"; readonly value: A }
  | { readonly _tag: "Fail"; readonly error: E }
  | { readonly _tag: "Die"; readonly defect: unknown }
  | { readonly _tag: "Interrupt" }
  | { readonly _tag: "FlatMap"; readonly effect: IO<R, E, unknown>; readonly f: (a: unknown) => IO<R, E, A> }
  | { readonly _tag: "Map"; readonly effect: IO<R, E, unknown>; readonly f: (a: unknown) => A }
  | { readonly _tag: "MapError"; readonly effect: IO<R, unknown, A>; readonly f: (e: unknown) => E }
  | { readonly _tag: "Recover"; readonly effect: IO<R, E, A>; readonly fallback: A }
  | { readonly _tag: "RecoverWith"; readonly effect: IO<R, E, A>; readonly f: (e: E) => IO<R, E, A> }
  | {
      readonly _tag: "Fold"
      readonly effect: IO<R, E, unknown>
      readonly onFailure: (e: E) => A
      readonly onSuccess: (a: unknown) => A
    }
  | {
      readonly _tag: "Bracket"
      readonly acquire: IO<R, E, unknown>
      readonly use: (a: unknown) => IO<R, E, A>
      readonly release: (a: unknown) => IO<R, never, void>
    }
  | {
      readonly _tag: "Race"
      readonly effects: readonly IO<R, E, A>[]
    }
  | {
      readonly _tag: "Timeout"
      readonly effect: IO<R, E, A>
      readonly duration: number
    }
  | { readonly _tag: "Service"; readonly tag: Tag<A> }
  | { readonly _tag: "ProvideContext"; readonly effect: IO<R, E, A>; readonly context: Context<R> }

/**
 * IO<R, E, A> represents a lazy, composable effect.
 *
 * @typeParam R - Requirements (environment/dependencies needed to run)
 * @typeParam E - Error type (typed failures)
 * @typeParam A - Success type (value produced on success)
 */
export interface IO<R extends Type, E extends Type, A extends Type> {
  /**
   * Internal effect representation
   * @internal
   */
  readonly _effect: IOEffect<R, E, A>

  /**
   * Phantom type for requirements
   * @internal
   */
  readonly _R?: R

  /**
   * Phantom type for error
   * @internal
   */
  readonly _E?: E

  /**
   * Phantom type for success
   * @internal
   */
  readonly _A?: A

  // ============================================
  // Core Operations
  // ============================================

  /**
   * Transforms the success value.
   * @param f - Function to apply to the success value
   * @returns New IO with transformed value
   */
  map<B extends Type>(f: (a: A) => B): IO<R, E, B>

  /**
   * Chains another IO effect based on the success value.
   * @param f - Function returning next IO effect
   * @returns New IO with combined effects
   */
  flatMap<R2 extends Type, E2 extends Type, B extends Type>(f: (a: A) => IO<R2, E2, B>): IO<R | R2, E | E2, B>

  /**
   * Applies a side effect without changing the value.
   * @param f - Side effect function
   * @returns Same IO for chaining
   */
  tap(f: (a: A) => void): IO<R, E, A>

  /**
   * Applies an effectful side effect without changing the value.
   * @param f - Function returning IO for side effect
   * @returns Same value after running side effect
   */
  tapEffect<R2 extends Type, E2 extends Type, B extends Type>(f: (a: A) => IO<R2, E2, B>): IO<R | R2, E | E2, A>

  // ============================================
  // Error Handling
  // ============================================

  /**
   * Transforms the error value.
   * @param f - Function to apply to the error
   * @returns New IO with transformed error
   */
  mapError<E2 extends Type>(f: (e: E) => E2): IO<R, E2, A>

  /**
   * Executes a side effect on the error without changing it.
   * Useful for logging errors while preserving the error chain.
   *
   * @param f - Side effect function to run on error
   * @returns Same IO with the side effect attached
   *
   * @example
   * ```typescript
   * const io = IO.asyncResult(() => query(), toError)
   *   .tapError(err => console.error('Query failed:', err))
   *   .map(data => transform(data))
   * ```
   */
  tapError(f: (e: E) => void): IO<R, E, A>

  /**
   * Recovers from any error with a fallback value.
   * @param fallback - Value to use on error
   * @returns New IO that never fails
   */
  recover<B extends Type>(fallback: B): IO<R, never, A | B>

  /**
   * Recovers from error by running another effect.
   * @param f - Function returning recovery effect
   * @returns New IO with error handling
   */
  recoverWith<R2 extends Type, E2 extends Type, B extends Type>(f: (e: E) => IO<R2, E2, B>): IO<R | R2, E2, A | B>

  /**
   * Pattern matches on success and failure.
   * @param onFailure - Handler for failures
   * @param onSuccess - Handler for successes
   * @returns New IO with handled result
   */
  fold<B extends Type>(onFailure: (e: E) => B, onSuccess: (a: A) => B): IO<R, never, B>

  /**
   * Pattern matches with object pattern syntax.
   */
  match<B extends Type>(patterns: { failure: (e: E) => B; success: (a: A) => B }): IO<R, never, B>

  /**
   * Catches errors with a specific tag and handles them.
   * @param tag - The error tag to catch
   * @param handler - Handler for the caught error
   */
  catchTag<K extends E extends { _tag: string } ? E["_tag"] : never, R2 extends Type, E2 extends Type, B extends Type>(
    tag: K,
    handler: (e: Extract<E, { _tag: K }>) => IO<R2, E2, B>,
  ): IO<R | R2, Exclude<E, { _tag: K }> | E2, A | B>

  /**
   * Catches all errors (alias for recoverWith).
   */
  catchAll<R2 extends Type, E2 extends Type, B extends Type>(handler: (e: E) => IO<R2, E2, B>): IO<R | R2, E2, A | B>

  /**
   * Retries the effect up to n times on failure.
   * @param n - Maximum number of retries
   */
  retry(n: number): IO<R, E, A>

  /**
   * Retries the effect with a delay between attempts.
   * @param n - Maximum number of retries
   * @param delayMs - Delay between retries in milliseconds
   */
  retryWithDelay(n: number, delayMs: number): IO<R, E, A>

  // ============================================
  // Combinators
  // ============================================

  /**
   * Sequences two IOs, keeping the second value.
   */
  zipRight<R2 extends Type, E2 extends Type, B extends Type>(that: IO<R2, E2, B>): IO<R | R2, E | E2, B>

  /**
   * Sequences two IOs, keeping the first value.
   */
  zipLeft<R2 extends Type, E2 extends Type, B extends Type>(that: IO<R2, E2, B>): IO<R | R2, E | E2, A>

  /**
   * Zips two IOs into a tuple.
   */
  zip<R2 extends Type, E2 extends Type, B extends Type>(that: IO<R2, E2, B>): IO<R | R2, E | E2, readonly [A, B]>

  /**
   * Flattens a nested IO.
   */
  flatten<R2 extends Type, E2 extends Type, B extends Type>(this: IO<R, E, IO<R2, E2, B>>): IO<R | R2, E | E2, B>

  // ============================================
  // Dependency Injection
  // ============================================

  /**
   * Provides a context to satisfy the requirements of this effect.
   * @param context - The context containing required services
   */
  provideContext<R2 extends R>(context: Context<R2>): IO<Exclude<R, R2>, E, A>

  /**
   * Provides a single service to satisfy part of the requirements.
   * @param tag - The service tag
   * @param service - The service implementation
   */
  provideService<S extends Type>(tag: Tag<S>, service: S): IO<Exclude<R, S>, E, A>

  /**
   * Provides services using a layer.
   * @param layer - The layer that provides services
   */
  provideLayer<RIn extends Type, E2 extends Type, ROut extends R>(
    layer: Layer<RIn, E2, ROut>,
  ): IO<RIn | Exclude<R, ROut>, E | E2, A>

  // ============================================
  // Execution (R must be never to run)
  // ============================================

  /**
   * Runs the effect and returns an Either. Never throws.
   * This is the safe default - all errors become Left.
   * Requires R = never.
   */
  run(this: IO<never, E, A>): Promise<Either<E, A>>

  /**
   * Runs the effect and returns a Promise of the value.
   * Throws on any error (typed E, defect, or interrupt).
   * Requires R = never.
   */
  runOrThrow(this: IO<never, E, A>): Promise<A>

  /**
   * Runs a sync effect and returns an Either. Never throws.
   * This is the safe default - all errors become Left.
   * Throws only if the effect is async (cannot be made safe synchronously).
   * Requires R = never.
   */
  runSync(this: IO<never, E, A>): Either<E, A>

  /**
   * Runs a sync effect and returns the value.
   * Throws on any error or if the effect is async.
   * Requires R = never.
   */
  runSyncOrThrow(this: IO<never, E, A>): A

  /**
   * Runs the effect and returns an Exit.
   */
  runExit(this: IO<never, E, A>): Promise<ExitType<E, A>>

  /**
   * Runs the effect and returns an Option.
   * Some(value) on success, None on failure.
   */
  runOption(this: IO<never, E, A>): Promise<Option<A>>

  /**
   * Runs the effect and returns a Try.
   * Success(value) on success, Failure(error) on failure.
   */
  runTry(this: IO<never, E, A>): Promise<ReturnType<typeof Try<A>>>

  // ============================================
  // Utilities
  // ============================================

  /**
   * Pipes the IO through a function.
   */
  pipe<B>(f: (self: IO<R, E, A>) => B): B

  /**
   * Delays execution by the specified milliseconds.
   */
  delay(ms: number): IO<R, E, A>

  /**
   * Fails with TimeoutError if the effect doesn't complete within the specified duration.
   * @param ms - Maximum time in milliseconds
   */
  timeout(ms: number): IO<R, E | TimeoutError, A>

  /**
   * Returns a fallback value if the effect doesn't complete within the specified duration.
   * @param ms - Maximum time in milliseconds
   * @param fallback - Value to return on timeout
   */
  timeoutTo<B extends Type>(ms: number, fallback: B): IO<R, E, A | B>

  /**
   * Converts to string representation.
   */
  toString(): string

  /**
   * Converts to JSON representation.
   */
  toJSON(): { _tag: string; effect: unknown }

  /**
   * Makes IO iterable for generator do-notation (yield* syntax).
   * Yields the IO itself, allowing IO.gen to extract the value.
   */
  [Symbol.iterator](): Generator<IO<R, E, A>, A, A>
}

// ============================================
// Internal Implementation
// ============================================

/**
 * Creates an IO instance from an effect
 */
const createIO = <R extends Type, E extends Type, A extends Type>(effect: IOEffect<R, E, A>): IO<R, E, A> => {
  const io: IO<R, E, A> = {
    _effect: effect,

    // Core Operations
    map<B extends Type>(f: (a: A) => B): IO<R, E, B> {
      return createIO(unsafeCoerce({ _tag: "Map", effect: io, f }))
    },

    flatMap<R2 extends Type, E2 extends Type, B extends Type>(f: (a: A) => IO<R2, E2, B>): IO<R | R2, E | E2, B> {
      return createIO(unsafeCoerce({ _tag: "FlatMap", effect: io, f }))
    },

    tap(f: (a: A) => void): IO<R, E, A> {
      return io.map((a) => {
        f(a)
        return a
      })
    },

    tapEffect<R2 extends Type, E2 extends Type, B extends Type>(f: (a: A) => IO<R2, E2, B>): IO<R | R2, E | E2, A> {
      return io.flatMap((a) => f(a).map(() => a))
    },

    // Error Handling
    mapError<E2 extends Type>(f: (e: E) => E2): IO<R, E2, A> {
      return createIO(unsafeCoerce({ _tag: "MapError", effect: io, f }))
    },

    tapError(f: (e: E) => void): IO<R, E, A> {
      return io.mapError((e) => {
        f(e)
        return e
      })
    },

    recover<B extends Type>(fallback: B): IO<R, never, A | B> {
      return createIO(unsafeCoerce({ _tag: "Recover", effect: io, fallback }))
    },

    recoverWith<R2 extends Type, E2 extends Type, B extends Type>(f: (e: E) => IO<R2, E2, B>): IO<R | R2, E2, A | B> {
      return createIO(unsafeCoerce({ _tag: "RecoverWith", effect: io, f }))
    },

    fold<B extends Type>(onFailure: (e: E) => B, onSuccess: (a: A) => B): IO<R, never, B> {
      return createIO(unsafeCoerce({ _tag: "Fold", effect: io, onFailure, onSuccess }))
    },

    match<B extends Type>(patterns: { failure: (e: E) => B; success: (a: A) => B }): IO<R, never, B> {
      return io.fold(patterns.failure, patterns.success)
    },

    catchTag<
      K extends E extends { _tag: string } ? E["_tag"] : never,
      R2 extends Type,
      E2 extends Type,
      B extends Type,
    >(tag: K, handler: (e: Extract<E, { _tag: K }>) => IO<R2, E2, B>): IO<R | R2, Exclude<E, { _tag: K }> | E2, A | B> {
      const f = (e: E): IO<R | R2, Exclude<E, { _tag: K }> | E2, A | B> => {
        if (typeof e === "object" && e !== null && "_tag" in e && (e as { _tag: string })._tag === tag) {
          return unsafeCoerce(handler(e as Extract<E, { _tag: K }>))
        }
        return unsafeCoerce(IOCompanion.fail(e))
      }
      return createIO(unsafeCoerce({ _tag: "RecoverWith", effect: io, f }))
    },

    catchAll<R2 extends Type, E2 extends Type, B extends Type>(
      handler: (e: E) => IO<R2, E2, B>,
    ): IO<R | R2, E2, A | B> {
      return io.recoverWith(handler)
    },

    retry(n: number): IO<R, E, A> {
      if (n <= 0) return io
      return io.recoverWith(() => io.retry(n - 1))
    },

    retryWithDelay(n: number, delayMs: number): IO<R, E, A> {
      if (n <= 0) return io
      return io.recoverWith(() => IOCompanion.sleep(delayMs).flatMap(() => io.retryWithDelay(n - 1, delayMs)))
    },

    // Combinators
    zipRight<R2 extends Type, E2 extends Type, B extends Type>(that: IO<R2, E2, B>): IO<R | R2, E | E2, B> {
      return io.flatMap(() => that)
    },

    zipLeft<R2 extends Type, E2 extends Type, B extends Type>(that: IO<R2, E2, B>): IO<R | R2, E | E2, A> {
      return io.flatMap((a) => that.map(() => a))
    },

    zip<R2 extends Type, E2 extends Type, B extends Type>(that: IO<R2, E2, B>): IO<R | R2, E | E2, readonly [A, B]> {
      return io.flatMap((a) => that.map((b) => [a, b] as const))
    },

    flatten<R2 extends Type, E2 extends Type, B extends Type>(this: IO<R, E, IO<R2, E2, B>>): IO<R | R2, E | E2, B> {
      return this.flatMap((inner) => inner)
    },

    // Dependency Injection
    provideContext<R2 extends R>(context: Context<R2>): IO<Exclude<R, R2>, E, A> {
      return createIO(unsafeCoerce({ _tag: "ProvideContext", effect: io, context }))
    },

    provideService<S extends Type>(tag: Tag<S>, service: S): IO<Exclude<R, S>, E, A> {
      const context = ContextCompanion.make(tag, service)
      return createIO(unsafeCoerce({ _tag: "ProvideContext", effect: io, context }))
    },

    provideLayer<RIn extends Type, E2 extends Type, ROut extends R>(
      layer: Layer<RIn, E2, ROut>,
    ): IO<RIn | Exclude<R, ROut>, E | E2, A> {
      // Build the layer and provide its context
      const buildIO: IO<RIn, E2, Context<ROut>> = unsafeCoerce(
        IOCompanion.async(async () => {
          const inputContext = ContextCompanion.empty()
          return await layer.build(unsafeCoerce(inputContext))
        }),
      )
      const provideFn = (context: Context<ROut>): IO<Exclude<R, ROut>, E, A> =>
        createIO(unsafeCoerce({ _tag: "ProvideContext", effect: io, context }))
      return unsafeCoerce(buildIO.flatMap(provideFn))
    },

    // Execution
    async run(this: IO<never, E, A>): Promise<Either<E, A>> {
      const exit = await runEffect(this._effect)
      if (exit.isSuccess()) {
        return Right(exit.orThrow())
      }
      // All errors including InterruptedError go to Left
      const error = exit.isFailure() ? (exit.toValue() as { error: E }).error : new InterruptedError()
      return Left(error as E)
    },

    async runOrThrow(this: IO<never, E, A>): Promise<A> {
      const exit = await runEffect(this._effect)
      if (exit.isSuccess()) {
        return exit.orThrow()
      }
      throw exit.isFailure() ? (exit.toValue() as { error: E }).error : new InterruptedError()
    },

    runSync(this: IO<never, E, A>): Either<E, A> {
      try {
        return Right(runEffectSync(this._effect))
      } catch (e) {
        return Left(e as E)
      }
    },

    runSyncOrThrow(this: IO<never, E, A>): A {
      return runEffectSync(this._effect)
    },

    async runExit(this: IO<never, E, A>): Promise<ExitType<E, A>> {
      return runEffect(this._effect)
    },

    async runOption(this: IO<never, E, A>): Promise<Option<A>> {
      const exit = await runEffect(this._effect)
      if (exit.isSuccess()) {
        return Some(exit.orThrow())
      }
      return None()
    },

    async runTry(this: IO<never, E, A>): Promise<ReturnType<typeof Try<A>>> {
      const exit = await runEffect(this._effect)
      if (exit.isSuccess()) {
        return unsafeCoerce(Try(() => exit.orThrow()))
      }
      const error = exit.isFailure() ? (exit.toValue() as { error: E }).error : new Error("Effect was interrupted")
      return unsafeCoerce(
        Try(() => {
          throw error
        }),
      )
    },

    // Utilities
    pipe<B>(f: (self: IO<R, E, A>) => B): B {
      return f(io)
    },

    delay(ms: number): IO<R, E, A> {
      return unsafeCoerce(
        IOCompanion.async<void>(() => new Promise((resolve) => setTimeout(resolve, ms))).flatMap(() => io),
      )
    },

    timeout(ms: number): IO<R, E | TimeoutError, A> {
      return createIO(unsafeCoerce({ _tag: "Timeout", effect: io, duration: ms }))
    },

    timeoutTo<B extends Type>(ms: number, fallback: B): IO<R, E, A | B> {
      return unsafeCoerce(io.timeout(ms).recover(unsafeCoerce(fallback)))
    },

    toString() {
      return `IO(${stringify(effect._tag)})`
    },

    toJSON() {
      return { _tag: "IO", effect: effect._tag }
    },

    *[Symbol.iterator](): Generator<IO<R, E, A>, A, A> {
      return yield io
    },
  }

  return io
}

/**
 * Interprets and runs an effect synchronously
 */
const runEffectSync = <R extends Type, E extends Type, A extends Type>(
  effect: IOEffect<R, E, A>,
  context: Context<R> = ContextCompanion.empty() as Context<R>,
): A => {
  switch (effect._tag) {
    case "Succeed":
      return effect.value
    case "Fail":
      throw effect.error
    case "Die":
      throw effect.defect
    case "Sync":
      return effect.thunk()
    case "Async":
      throw new Error("Cannot run async effect synchronously")
    case "Auto": {
      const result = effect.thunk()
      if (result instanceof Promise) {
        throw new Error("Cannot run async effect synchronously")
      }
      return result
    }
    case "Map": {
      const a = runEffectSync(effect.effect._effect, context)
      return effect.f(a)
    }
    case "FlatMap": {
      const a = runEffectSync(effect.effect._effect, context)
      const nextIO = effect.f(a)
      return runEffectSync(nextIO._effect, context)
    }
    case "MapError": {
      try {
        return runEffectSync(effect.effect._effect, context)
      } catch (e) {
        throw effect.f(e)
      }
    }
    case "Recover": {
      try {
        return runEffectSync(effect.effect._effect, context)
      } catch {
        return effect.fallback
      }
    }
    case "RecoverWith": {
      try {
        return runEffectSync(effect.effect._effect, context)
      } catch (e) {
        const recoveryIO = effect.f(e as E)
        return runEffectSync(recoveryIO._effect, context)
      }
    }
    case "Fold": {
      try {
        const a = runEffectSync(effect.effect._effect, context)
        return effect.onSuccess(a)
      } catch (e) {
        return effect.onFailure(e as E)
      }
    }
    case "Service": {
      const service = context.get(effect.tag)
      if (service.isNone()) {
        throw new Error(`Service not found: ${effect.tag.id}`)
      }
      return service.orThrow() as A
    }
    case "ProvideContext": {
      const mergedContext = context.merge(effect.context)
      return runEffectSync(effect.effect._effect, mergedContext as Context<R>)
    }
    case "Interrupt":
      throw new InterruptedError()
    case "Bracket": {
      const resource = runEffectSync(effect.acquire._effect, context)
      try {
        return runEffectSync(effect.use(resource)._effect, context)
      } finally {
        runEffectSync(effect.release(resource)._effect, context)
      }
    }
    case "Race":
      throw new Error("Cannot run race effect synchronously")
    case "Timeout":
      throw new Error("Cannot run timeout effect synchronously")
  }
}

/**
 * Interprets and runs an effect asynchronously
 */
const runEffect = async <R extends Type, E extends Type, A extends Type>(
  effect: IOEffect<R, E, A>,
  context: Context<R> = ContextCompanion.empty() as Context<R>,
): Promise<ExitType<E, A>> => {
  try {
    switch (effect._tag) {
      case "Succeed":
        return unsafeCoerce(Exit.succeed(effect.value))
      case "Fail":
        return unsafeCoerce(Exit.fail(effect.error))
      case "Die":
        throw effect.defect
      case "Sync":
        return unsafeCoerce(Exit.succeed(effect.thunk()))
      case "Async": {
        const result = await effect.thunk()
        return unsafeCoerce(Exit.succeed(result))
      }
      case "Auto": {
        const result = effect.thunk()
        if (result instanceof Promise) {
          return unsafeCoerce(Exit.succeed(await result))
        } else {
          return unsafeCoerce(Exit.succeed(result))
        }
      }
      case "Map": {
        const exitA = await runEffect(effect.effect._effect, context)
        if (!exitA.isSuccess()) {
          return unsafeCoerce(exitA)
        }
        return unsafeCoerce(Exit.succeed(effect.f(exitA.orThrow())))
      }
      case "FlatMap": {
        const exitA = await runEffect(effect.effect._effect, context)
        if (!exitA.isSuccess()) {
          return unsafeCoerce(exitA)
        }
        const nextIO = effect.f(exitA.orThrow())
        return runEffect(nextIO._effect, context)
      }
      case "MapError": {
        const exitA = await runEffect(effect.effect._effect, context)
        if (exitA.isSuccess()) {
          return unsafeCoerce(exitA)
        }
        if (exitA.isFailure()) {
          return unsafeCoerce(Exit.fail(effect.f((exitA.toValue() as { error: unknown }).error)))
        }
        return unsafeCoerce(exitA)
      }
      case "Recover": {
        const exitA = await runEffect(effect.effect._effect, context)
        if (exitA.isSuccess()) {
          return exitA
        }
        return Exit.succeed(effect.fallback)
      }
      case "RecoverWith": {
        const exitA = await runEffect(effect.effect._effect, context)
        if (exitA.isSuccess()) {
          return exitA
        }
        if (exitA.isFailure()) {
          const recoveryIO = effect.f((exitA.toValue() as { error: E }).error)
          return runEffect(recoveryIO._effect, context)
        }
        return exitA
      }
      case "Fold": {
        const exitA = await runEffect(effect.effect._effect, context)
        if (exitA.isSuccess()) {
          return Exit.succeed(effect.onSuccess(exitA.orThrow()))
        }
        if (exitA.isFailure()) {
          return Exit.succeed(effect.onFailure((exitA.toValue() as { error: E }).error))
        }
        return exitA as ExitType<E, A>
      }
      case "Service": {
        const service = context.get(effect.tag)
        if (service.isNone()) {
          return Exit.fail(new Error(`Service not found: ${effect.tag.id}`) as E)
        }
        return Exit.succeed(service.orThrow() as A)
      }
      case "ProvideContext": {
        const mergedContext = context.merge(effect.context)
        return runEffect(effect.effect._effect, mergedContext as Context<R>)
      }
      case "Interrupt":
        return Exit.interrupted()
      case "Bracket": {
        const acquireExit = await runEffect(effect.acquire._effect, context)
        if (!acquireExit.isSuccess()) {
          return acquireExit as ExitType<E, A>
        }
        const resource = acquireExit.orThrow()
        try {
          return await runEffect(effect.use(resource)._effect, context)
        } finally {
          // Release always runs, even if use fails
          await runEffect(effect.release(resource)._effect, context)
        }
      }
      case "Race": {
        if (effect.effects.length === 0) {
          return Exit.fail(new Error("No effects to race") as E)
        }
        // Race all effects - first one to complete wins
        const result = await Promise.race(effect.effects.map((e) => runEffect(e._effect, context)))
        return result
      }
      case "Timeout": {
        const timeoutPromise = new Promise<ExitType<E, A>>((resolve) =>
          setTimeout(() => resolve(Exit.fail(new TimeoutError(effect.duration) as E)), effect.duration),
        )
        const effectPromise = runEffect(effect.effect._effect, context)
        return Promise.race([effectPromise, timeoutPromise])
      }
    }
  } catch (e) {
    // Unhandled defects
    return Exit.fail(e as E)
  }
}

// ============================================
// Companion Object
// ============================================

/**
 * IO companion methods for constructing effects
 */
const IOCompanion = {
  // ============================================
  // Constructors
  // ============================================

  /**
   * Creates an IO from a synchronous thunk.
   * The function is not executed until the IO is run.
   */
  sync: <A extends Type>(f: () => A): IO<never, never, A> => createIO({ _tag: "Sync", thunk: f }),

  /**
   * Creates an IO that succeeds with the given value.
   */
  succeed: <A extends Type>(value: A): IO<never, never, A> => createIO({ _tag: "Succeed", value }),

  /**
   * Creates an IO that fails with the given error.
   */
  fail: <E extends Type>(error: E): IO<never, E, never> => createIO({ _tag: "Fail", error }),

  /**
   * Creates an IO that dies with an unrecoverable defect.
   */
  die: (defect: unknown): IO<never, never, never> => createIO({ _tag: "Die", defect }),

  /**
   * Creates an IO from an async thunk.
   * The Promise is not created until the IO is run.
   */
  async: <A extends Type>(f: () => Promise<A>): IO<never, unknown, A> =>
    createIO(unsafeCoerce({ _tag: "Async", thunk: f })),

  /**
   * Creates an IO from a Promise with error handling.
   */
  tryPromise: <A extends Type, E extends Type>(opts: {
    readonly try: () => Promise<A>
    readonly catch: (error: unknown) => E
  }): IO<never, E, A> => createIO<never, unknown, A>({ _tag: "Async", thunk: opts.try }).mapError(opts.catch),

  /**
   * Creates an IO from a function that might throw.
   */
  tryCatch: <A extends Type, E extends Type>(f: () => A, onError: (error: unknown) => E): IO<never, E, A> =>
    IOCompanion.sync(() => {
      try {
        return f()
      } catch (e) {
        throw onError(e)
      }
    }) as unknown as IO<never, E, A>,

  // ============================================
  // Lifting Functions
  // ============================================

  /**
   * Lifts a synchronous function into an IO-returning function.
   */
  liftSync:
    <Args extends unknown[], A extends Type>(f: (...args: Args) => A) =>
    (...args: Args): IO<never, never, A> =>
      IOCompanion.sync(() => f(...args)),

  /**
   * Lifts a Promise-returning function into an IO-returning function.
   */
  liftPromise:
    <Args extends unknown[], A extends Type>(f: (...args: Args) => Promise<A>) =>
    (...args: Args): IO<never, unknown, A> =>
      IOCompanion.async(() => f(...args)),

  // ============================================
  // Integration with Other Types
  // ============================================

  /**
   * Creates an IO from an Either.
   */
  fromEither: <E extends Type, A extends Type>(either: Either<E, A>): IO<never, E, A> =>
    unsafeCoerce(either.isRight() ? IOCompanion.succeed(either.value as A) : IOCompanion.fail(either.value as E)),

  /**
   * Creates an IO from an Option.
   */
  fromOption: <A extends Type>(option: Option<A>): IO<never, void, A> =>
    unsafeCoerce(option.isSome() ? IOCompanion.succeed(option.value) : IOCompanion.fail(undefined as void)),

  /**
   * Creates an IO from an Option with custom error.
   */
  fromOptionOrFail: <E extends Type, A extends Type>(option: Option<A>, onNone: () => E): IO<never, E, A> =>
    unsafeCoerce(option.isSome() ? IOCompanion.succeed(option.value) : IOCompanion.fail(onNone())),

  /**
   * Creates an IO from a Try.
   */
  fromTry: <A extends Type>(t: ReturnType<typeof Try<A>>): IO<never, Error, A> =>
    unsafeCoerce(t.isSuccess() ? IOCompanion.succeed(t.orThrow()) : IOCompanion.fail(t.error as Error)),

  /**
   * Creates an IO from a result object with data/error pattern.
   * If error is present (truthy), fails with the error.
   * Otherwise succeeds with Option-wrapped data (None if data is null/undefined).
   *
   * This handles the common `{ data, error }` response pattern used by
   * Supabase, many REST APIs, and similar libraries.
   *
   * @example
   * ```typescript
   * const response = { data: user, error: null }
   * const io = IO.fromResult(response) // IO<never, null, Option<User>> -> Some(user)
   *
   * const emptyResponse = { data: null, error: null }
   * const emptyIo = IO.fromResult(emptyResponse) // IO<never, null, Option<User>> -> None
   *
   * const errorResponse = { data: null, error: new Error("Not found") }
   * const failedIo = IO.fromResult(errorResponse) // IO<never, Error, Option<null>> -> fails
   * ```
   */
  fromResult: <D extends Type, E extends Type>(result: { data: D | null; error: E | null }): IO<never, E, Option<D>> =>
    unsafeCoerce(result.error ? IOCompanion.fail(result.error) : IOCompanion.succeed(OptionConstructor(result.data))),

  /**
   * Creates an IO from an async thunk with typed error handling.
   * Catches any thrown errors and maps them using the provided function.
   * Supports cancellation via AbortSignal.
   *
   * This is a simpler alternative to `tryPromise` that takes a direct
   * error mapper function instead of an options object.
   *
   * @param f - Async function to execute (receives optional AbortSignal)
   * @param onError - Function to map caught errors to typed error E
   * @param signal - Optional AbortSignal for cancellation support
   *
   * @example
   * ```typescript
   * const io = IO.tryAsync(
   *   () => fetch('/api/users').then(r => r.json()),
   *   (e) => new ApiError(e)
   * )
   *
   * // With cancellation:
   * const controller = new AbortController()
   * const io = IO.tryAsync(
   *   (signal) => fetch('/api/users', { signal }).then(r => r.json()),
   *   (e) => new ApiError(e),
   *   controller.signal
   * )
   * controller.abort() // Cancels the request
   * ```
   */
  tryAsync: <A extends Type, E extends Type>(
    f: (signal?: AbortSignal) => Promise<A>,
    onError: (error: unknown) => E,
    signal?: AbortSignal,
  ): IO<never, E, A> => {
    // Check if already aborted before starting
    if (signal?.aborted) {
      return unsafeCoerce(IOCompanion.fail(onError(signal.reason ?? new DOMException("Aborted", "AbortError"))))
    }
    return IOCompanion.async(() => f(signal)).mapError(onError)
  },

  /**
   * Creates an IO from an async function that returns { data, error }.
   * Handles both:
   * - Thrown errors (mapped via onThrow)
   * - Returned errors in the result object
   * Supports cancellation via AbortSignal.
   *
   * This is the most ergonomic way to wrap Supabase and similar API calls.
   *
   * @param f - Async function returning { data, error } object (receives optional AbortSignal)
   * @param onThrow - Function to map thrown errors to typed error E
   * @param config - Optional configuration for custom field names and cancellation
   *
   * @example
   * ```typescript
   * // Supabase query in one line:
   * const getUser = (id: string): IO<never, Error, Option<User>> =>
   *   IO.asyncResult(
   *     () => supabase.from('users').select('*').eq('id', id).single(),
   *     toError
   *   )
   *
   * // With custom field names:
   * const result = IO.asyncResult(
   *   () => customApi.fetch(),
   *   toError,
   *   { dataKey: 'result', errorKey: 'err' }
   * )
   *
   * // With cancellation:
   * const controller = new AbortController()
   * const getUser = IO.asyncResult(
   *   (signal) => supabase.from('users').abortSignal(signal).select('*').single(),
   *   toError,
   *   { signal: controller.signal }
   * )
   * controller.abort() // Cancels the request
   * ```
   */
  asyncResult: <D extends Type, E extends Type>(
    f: (signal?: AbortSignal) => Promise<Record<string, unknown>>,
    onThrow: (error: unknown) => E,
    config?: { dataKey?: string; errorKey?: string; signal?: AbortSignal },
  ): IO<never, E, Option<D>> => {
    const dataKey = config?.dataKey ?? "data"
    const errorKey = config?.errorKey ?? "error"
    return IOCompanion.tryAsync((signal) => f(signal), onThrow, config?.signal).flatMap((result) =>
      IOCompanion.fromResult({
        data: result[dataKey] as D | null,
        error: result[errorKey] as E | null,
      }),
    )
  },

  // ============================================
  // Dependency Injection
  // ============================================

  /**
   * Creates an IO that requires a service identified by the tag.
   * The service must be provided before the effect can be run.
   *
   * @example
   * ```typescript
   * interface Logger {
   *   log(message: string): void
   * }
   * const Logger = Tag<Logger>("Logger")
   *
   * const program = IO.service(Logger).flatMap(logger =>
   *   IO.sync(() => logger.log("Hello!"))
   * )
   *
   * // Provide the service to run
   * program.provideService(Logger, consoleLogger).run()
   * ```
   */
  service: <S extends Type>(tag: Tag<S>): IO<S, never, S> => createIO({ _tag: "Service", tag }),

  /**
   * Accesses a service and applies a function to it.
   */
  serviceWith: <S extends Type, A extends Type>(tag: Tag<S>, f: (service: S) => A): IO<S, never, A> =>
    IOCompanion.service(tag).map(f),

  /**
   * Accesses a service and applies an effectful function to it.
   */
  serviceWithIO: <S extends Type, R extends Type, E extends Type, A extends Type>(
    tag: Tag<S>,
    f: (service: S) => IO<R, E, A>,
  ): IO<S | R, E, A> => IOCompanion.service(tag).flatMap(f),

  /**
   * Accesses multiple services and applies a function to them.
   * Provides a convenient way to work with multiple dependencies.
   *
   * @example
   * ```typescript
   * const program = IO.withServices(
   *   { logger: Logger, db: Database },
   *   ({ logger, db }) => {
   *     logger.log("Querying...")
   *     return db.query("SELECT * FROM users")
   *   }
   * )
   * ```
   */
  withServices: <Services extends Record<string, Tag<Type>>, A extends Type>(
    services: Services,
    f: (ctx: { [K in keyof Services]: TagService<Services[K]> }) => A | Promise<A>,
  ): IO<TagService<Services[keyof Services]>, unknown, A> => {
    const entries = Object.entries(services) as [string, Tag<Type>][]
    if (entries.length === 0) {
      return unsafeCoerce(
        createIO({ _tag: "Auto", thunk: () => f({} as { [K in keyof Services]: TagService<Services[K]> }) }),
      )
    }

    // Build up the context by fetching each service
    type Ctx = { [K in keyof Services]: TagService<Services[K]> }
    const initial: IO<TagService<Services[keyof Services]>, never, Partial<Ctx>> = unsafeCoerce(IOCompanion.succeed({}))
    const buildContext = entries.reduce(
      (acc: IO<TagService<Services[keyof Services]>, never, Partial<Ctx>>, [name, tag]) =>
        unsafeCoerce(
          acc.flatMap((ctx: Partial<Ctx>) =>
            IOCompanion.service(tag).map((service) => ({
              ...ctx,
              [name]: service,
            })),
          ),
        ),
      initial,
    )

    return unsafeCoerce(
      buildContext.flatMap((ctx: Partial<Ctx>) => createIO({ _tag: "Auto", thunk: () => f(ctx as Ctx) })),
    )
  },

  // ============================================
  // Combinators
  // ============================================

  /**
   * Runs all IOs in parallel and collects results.
   */
  all: <R extends Type, E extends Type, A extends Type>(effects: readonly IO<R, E, A>[]): IO<R, E, readonly A[]> => {
    if (effects.length === 0) {
      return unsafeCoerce(IOCompanion.succeed([]))
    }
    const initial: IO<R, E, A[]> = unsafeCoerce(IOCompanion.succeed([]))
    return unsafeCoerce(
      effects.reduce(
        (acc: IO<R, E, A[]>, effect) => acc.flatMap((results: A[]) => effect.map((a) => [...results, a])),
        initial,
      ),
    )
  },

  /**
   * Runs IOs in sequence, returning the first success or last failure.
   */
  firstSuccessOf: <R extends Type, E extends Type, A extends Type>(effects: readonly IO<R, E, A>[]): IO<R, E, A> => {
    if (effects.length === 0) {
      return unsafeCoerce(IOCompanion.fail(new Error("No effects provided")))
    }
    return effects.reduce((acc, effect) => acc.recoverWith(() => effect))
  },

  /**
   * Creates an IO that sleeps for the specified duration.
   */
  sleep: (ms: number): IO<never, never, void> =>
    unsafeCoerce(IOCompanion.async(() => new Promise((resolve) => setTimeout(resolve, ms)))),

  /**
   * Creates an IO that never completes.
   */
  never: <A extends Type = never>(): IO<never, never, A> =>
    unsafeCoerce(IOCompanion.async(() => new Promise(() => {}))),

  /**
   * Creates a unit IO.
   */
  get unit(): IO<never, never, void> {
    return unsafeCoerce(createIO({ _tag: "Succeed", value: undefined }))
  },

  /**
   * Converts a nullable value to an IO.
   */
  fromNullable: <A extends Type>(value: A | null | undefined): IO<never, void, A> =>
    unsafeCoerce(
      value === null || value === undefined ? IOCompanion.fail(undefined as void) : IOCompanion.succeed(value),
    ),

  // ============================================
  // Structured Concurrency
  // ============================================

  /**
   * Creates an IO that is immediately interrupted.
   */
  interrupt: (): IO<never, never, never> => createIO({ _tag: "Interrupt" }),

  /**
   * Ensures a resource is properly released after use.
   * The release function always runs, even if use fails.
   *
   * @example
   * ```typescript
   * const withFile = IO.bracket(
   *   IO.sync(() => openFile("data.txt")),   // acquire
   *   file => IO.async(() => file.read()),    // use
   *   file => IO.sync(() => file.close())     // release
   * )
   * ```
   */
  bracket: <R extends Type, E extends Type, A extends Type, B extends Type>(
    acquire: IO<R, E, A>,
    use: (a: A) => IO<R, E, B>,
    release: (a: A) => IO<R, never, void>,
  ): IO<R, E, B> =>
    createIO({
      _tag: "Bracket",
      acquire: acquire as IO<R, E, unknown>,
      use: use as (a: unknown) => IO<R, E, B>,
      release: release as (a: unknown) => IO<R, never, void>,
    }),

  /**
   * Alias for bracket with a more descriptive name.
   */
  acquireRelease: <R extends Type, E extends Type, A extends Type, B extends Type>(
    acquire: IO<R, E, A>,
    use: (a: A) => IO<R, E, B>,
    release: (a: A) => IO<R, never, void>,
  ): IO<R, E, B> => IOCompanion.bracket(acquire, use, release),

  /**
   * Races multiple effects, returning the first to complete.
   * Note: Other effects are NOT cancelled (JS limitation).
   *
   * @example
   * ```typescript
   * const result = await IO.race([
   *   IO.sleep(1000).map(() => "slow"),
   *   IO.sleep(100).map(() => "fast")
   * ]).run() // "fast"
   * ```
   */
  race: <R extends Type, E extends Type, A extends Type>(effects: readonly IO<R, E, A>[]): IO<R, E, A> =>
    createIO({ _tag: "Race", effects }),

  /**
   * Returns the first effect to succeed, or fails if all fail.
   *
   * @example
   * ```typescript
   * const result = await IO.any([
   *   IO.fail("error1"),
   *   IO.succeed("success"),
   *   IO.fail("error2")
   * ]).run() // "success"
   * ```
   */
  any: <R extends Type, E extends Type, A extends Type>(effects: readonly IO<R, E, A>[]): IO<R, E, A> => {
    if (effects.length === 0) {
      return unsafeCoerce(IOCompanion.fail(new Error("No effects provided")))
    }
    // Try each effect, return first success
    return effects.reduce((acc, effect) => acc.recoverWith(() => effect))
  },

  /**
   * Executes an effect for each element in the array, collecting results.
   *
   * @example
   * ```typescript
   * const results = await IO.forEach([1, 2, 3], n =>
   *   IO.sync(() => n * 2)
   * ).run() // [2, 4, 6]
   * ```
   */
  forEach: <R extends Type, E extends Type, A extends Type, B extends Type>(
    items: readonly A[],
    f: (a: A) => IO<R, E, B>,
  ): IO<R, E, readonly B[]> => {
    if (items.length === 0) {
      return unsafeCoerce(IOCompanion.succeed([]))
    }
    const initial: IO<R, E, B[]> = unsafeCoerce(IOCompanion.succeed([]))
    return unsafeCoerce(
      items.reduce(
        (acc: IO<R, E, B[]>, item) => acc.flatMap((results: B[]) => f(item).map((b) => [...results, b])),
        initial,
      ),
    )
  },

  /**
   * Executes effects for each element in parallel (limited concurrency coming later).
   * Alias for forEach.
   */
  forEachPar: <R extends Type, E extends Type, A extends Type, B extends Type>(
    items: readonly A[],
    f: (a: A) => IO<R, E, B>,
  ): IO<R, E, readonly B[]> => IOCompanion.forEach(items, f),

  /**
   * Creates a timeout effect that fails with TimeoutError.
   */
  timeout: <R extends Type, E extends Type, A extends Type>(
    effect: IO<R, E, A>,
    ms: number,
  ): IO<R, E | TimeoutError, A> => createIO(unsafeCoerce({ _tag: "Timeout", effect, duration: ms })),

  // ============================================
  // Generator Syntax Support (Phase 2 preparation)
  // ============================================

  /**
   * Creates an IO from a generator function.
   * This enables do-notation style programming.
   *
   * @example
   * ```typescript
   * const program = IO.gen(function* () {
   *   const a = yield* IO.succeed(1)
   *   const b = yield* IO.succeed(2)
   *   return a + b
   * })
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gen: <A extends Type>(f: () => Generator<IO<any, any, any>, A, any>): IO<never, any, A> => {
    return unsafeCoerce(
      IOCompanion.sync(() => {
        const iterator = f()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const runGenerator = (input: unknown): IO<never, any, A> => {
          const result = iterator.next(input)
          if (result.done) {
            return unsafeCoerce(IOCompanion.succeed(result.value))
          }
          return unsafeCoerce(result.value.flatMap((value: unknown) => runGenerator(value)))
        }
        return runGenerator(undefined)
      }).flatMap((io) => io),
    )
  },

  // ============================================
  // Do-Builder Pattern
  // ============================================

  /**
   * Starts a Do-builder context for binding values.
   * This enables do-notation style programming without generators.
   *
   * @example
   * ```typescript
   * const program = IO.Do
   *   .bind("user", () => getUser("123"))
   *   .bind("posts", ({ user }) => getPosts(user.id))
   *   .let("count", ({ posts }) => posts.length)
   *   .map(({ user, posts, count }) => ({ user, posts, count }))
   * ```
   */
  get Do(): DoBuilder<never, never, Record<never, never>> {
    return createDoBuilder(IOCompanion.succeed({} as Record<never, never>))
  },
}

/**
 * Do-builder interface for chaining binds and maps
 */
interface DoBuilder<R extends Type, E extends Type, Ctx extends Record<string, Type>> {
  /**
   * The underlying IO effect
   */
  readonly effect: IO<R, E, Ctx>

  /**
   * Binds the result of an effect to a named property in the context.
   * @param name - The property name to bind to
   * @param f - Function that returns an IO effect (receives current context)
   */
  bind<N extends string, R2 extends Type, E2 extends Type, A extends Type>(
    name: Exclude<N, keyof Ctx>,
    f: (ctx: Ctx) => IO<R2, E2, A>,
  ): DoBuilder<R | R2, E | E2, Ctx & Record<N, A>>

  /**
   * Binds a pure value to a named property in the context.
   * @param name - The property name to bind to
   * @param f - Function that returns a value (receives current context)
   */
  let<N extends string, A extends Type>(
    name: Exclude<N, keyof Ctx>,
    f: (ctx: Ctx) => A,
  ): DoBuilder<R, E, Ctx & Record<N, A>>

  /**
   * Transforms the final context value.
   * @param f - Function to transform the context
   */
  map<B extends Type>(f: (ctx: Ctx) => B): IO<R, E, B>

  /**
   * Chains to another IO based on the context.
   * @param f - Function that returns an IO effect
   */
  flatMap<R2 extends Type, E2 extends Type, B extends Type>(f: (ctx: Ctx) => IO<R2, E2, B>): IO<R | R2, E | E2, B>

  /**
   * Executes a side effect without changing the context.
   * @param f - Side effect function
   */
  tap(f: (ctx: Ctx) => void): DoBuilder<R, E, Ctx>

  /**
   * Executes an effectful side effect without changing the context.
   * @param f - Function returning an IO for the side effect
   */
  tapEffect<R2 extends Type, E2 extends Type, B extends Type>(
    f: (ctx: Ctx) => IO<R2, E2, B>,
  ): DoBuilder<R | R2, E | E2, Ctx>

  /**
   * Returns the final context as is.
   */
  done(): IO<R, E, Ctx>
}

/**
 * Creates a DoBuilder from an IO effect
 */
const createDoBuilder = <R extends Type, E extends Type, Ctx extends Record<string, Type>>(
  effect: IO<R, E, Ctx>,
): DoBuilder<R, E, Ctx> => ({
  effect,

  bind<N extends string, R2 extends Type, E2 extends Type, A extends Type>(
    name: Exclude<N, keyof Ctx>,
    f: (ctx: Ctx) => IO<R2, E2, A>,
  ): DoBuilder<R | R2, E | E2, Ctx & Record<N, A>> {
    const newEffect = effect.flatMap((ctx) => f(ctx).map((a) => ({ ...ctx, [name]: a }) as Ctx & Record<N, A>))
    return createDoBuilder(newEffect)
  },

  let<N extends string, A extends Type>(
    name: Exclude<N, keyof Ctx>,
    f: (ctx: Ctx) => A,
  ): DoBuilder<R, E, Ctx & Record<N, A>> {
    const newEffect = effect.map((ctx) => ({ ...ctx, [name]: f(ctx) }) as Ctx & Record<N, A>)
    return createDoBuilder(newEffect)
  },

  map<B extends Type>(f: (ctx: Ctx) => B): IO<R, E, B> {
    return effect.map(f)
  },

  flatMap<R2 extends Type, E2 extends Type, B extends Type>(f: (ctx: Ctx) => IO<R2, E2, B>): IO<R | R2, E | E2, B> {
    return effect.flatMap(f)
  },

  tap(f: (ctx: Ctx) => void): DoBuilder<R, E, Ctx> {
    return createDoBuilder(effect.tap(f))
  },

  tapEffect<R2 extends Type, E2 extends Type, B extends Type>(
    f: (ctx: Ctx) => IO<R2, E2, B>,
  ): DoBuilder<R | R2, E | E2, Ctx> {
    return createDoBuilder(effect.tapEffect(f))
  },

  done(): IO<R, E, Ctx> {
    return effect
  },
})

/**
 * IO constructor - creates an IO from a function.
 * Automatically detects if the function returns a Promise and handles it appropriately.
 *
 * @example
 * ```typescript
 * // Sync usage
 * const syncIO = IO(() => 42)
 *
 * // Async usage - auto-detected
 * const asyncIO = IO(() => fetch('/api/data'))
 * ```
 */
const IOConstructor = <A extends Type>(f: () => A | Promise<A>): IO<never, unknown, A> =>
  createIO(unsafeCoerce({ _tag: "Auto", thunk: f }))

/**
 * IO effect type for lazy, composable effects with typed errors.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const program = IO.sync(() => 42)
 *   .map(x => x * 2)
 *   .flatMap(x => IO.succeed(x + 1))
 *
 * const result = await program.run() // 85
 *
 * // Error handling
 * const safe = IO.tryPromise({
 *   try: () => fetch('/api/data'),
 *   catch: (e) => new NetworkError(e)
 * })
 *   .map(res => res.json())
 *   .recover({ fallback: 'default' })
 *
 * // Composition
 * const composed = IO.all([
 *   IO.succeed(1),
 *   IO.succeed(2),
 *   IO.succeed(3)
 * ]) // IO<never, never, [1, 2, 3]>
 * ```
 */
export const IO = Companion(IOConstructor, IOCompanion)

// ============================================
// Type Aliases for Common Cases
// ============================================

/**
 * An IO with no requirements and no error
 */
export type UIO<A extends Type> = IO<never, never, A>

/**
 * An IO with no requirements
 */
export type Task<E extends Type, A extends Type> = IO<never, E, A>

/**
 * An IO with no error
 */
export type RIO<R extends Type, A extends Type> = IO<R, never, A>
