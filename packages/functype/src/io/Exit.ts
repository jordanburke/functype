import { Companion } from "@/companion/Companion"
import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import { type A as AnyA, type B as AnyE, define, type Mutable } from "@/internal/define"
import { safeStringify } from "@/internal/stringify"
import { unify } from "@/internal/unify"
import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import type { Type, Unify } from "@/types"

/**
 * Exit type module - represents the outcome of running an IO effect.
 * @module Exit
 * @category IO
 */

/**
 * Possible outcome types for an Exit
 */
export type ExitTag = "Success" | "Failure" | "Die" | "Interrupted"

/**
 * What every Exit has, whichever variant it is. `Exit<E, A>` is the union of the four variants, so
 * TypeScript narrows it on the guards and on `_tag`.
 */
export interface ExitBase<E extends Type, A extends Type> {
  readonly [Symbol.toStringTag]: string

  /**
   * Type guard to check if this is a Success
   */
  isSuccess(): this is SuccessExitOf<E, A>

  /**
   * Type guard to check if this is a Failure
   */
  isFailure(): this is FailureExitOf<E, A>

  /**
   * Type guard to check if this is a Die (a defect — the carried value is not an `E`)
   */
  isDie(): this is DieExitOf<E, A>

  /**
   * Type guard to check if this is Interrupted
   */
  isInterrupted(): this is InterruptedExitOf<E, A>

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
   * Pattern matches over the Exit.
   *
   * `onDie` is optional and appended rather than inserted so existing three-argument
   * calls keep compiling. Omitting it routes a defect to `onFailure` — the pre-`Die`
   * behaviour, where defects were indistinguishable from typed failures. Supply it
   * when the distinction matters; note the value it receives is `unknown`, not `E`.
   */
  fold<T, U = T, V = T, W = T>(
    onFailure: (e: E) => T,
    onSuccess: (a: A) => U,
    onInterrupted?: (fiberId: string) => V,
    onDie?: (defect: unknown) => W,
  ): Unify<T, Unify<U, Unify<V, W>>>

  /**
   * Pattern matches over the Exit with object patterns.
   *
   * `Die` is optional for the same back-compat reason as {@link fold}'s `onDie`, and
   * falls back to `Failure` when absent.
   */
  match<T, U = T, V = T, W = T>(patterns: {
    Success: (value: A) => T
    Failure: (error: E) => U
    Interrupted: (fiberId: string) => V
    Die?: (defect: unknown) => W
  }): Unify<T, Unify<U, Unify<V, W>>>

  /**
   * Returns the success value or throws
   */
  orThrow(): A

  /**
   * Returns the success value, or calls `defaultValue` for any other outcome.
   * The default is lazy: it runs only when the Exit is not a Success.
   */
  getOrElse(defaultValue: () => A): A

  /**
   * Converts to Option (Some for Success, None otherwise)
   */
  toOption(): Option<A>

  /**
   * Converts to Either (Right for Success, Left for Failure)
   * Throws if Interrupted
   *
   * A `Die` becomes `Left(defect)`, which widens the Left beyond `E`. (`IO.run()` rejects on a
   * `Die` instead, so its Left stays an `E`.) Use {@link isDie} first if the distinction matters.
   */
  toEither(): Either<E, A>

  /**
   * Returns the raw value for inspection
   */
  toValue(): { _tag: ExitTag; value?: A; error?: E; defect?: unknown; fiberId?: string }

  /**
   * String representation
   */
  toString(): string

  /**
   * JSON serialization
   */
  toJSON(): { _tag: ExitTag; value?: A; error?: E; defect?: unknown; fiberId?: string }
}

/** The effect completed with a value. */
export interface SuccessExitOf<E extends Type, A extends Type> extends ExitBase<E, A> {
  readonly _tag: "Success"
  readonly value: A
}

/** The effect failed with a typed error, a value from the declared `E` channel. */
export interface FailureExitOf<E extends Type, A extends Type> extends ExitBase<E, A> {
  readonly _tag: "Failure"
  readonly error: E
}

/** The effect produced a defect: a value that is not an `E`. */
export interface DieExitOf<E extends Type, A extends Type> extends ExitBase<E, A> {
  readonly _tag: "Die"
  readonly defect: unknown
}

/** The effect was cancelled. */
export interface InterruptedExitOf<E extends Type, A extends Type> extends ExitBase<E, A> {
  readonly _tag: "Interrupted"
  readonly fiberId: string
}

/**
 * Exit represents the outcome of running an IO effect.
 * - Success: The effect completed successfully with a value
 * - Failure: The effect failed with a typed error — a value from the declared `E` channel
 * - Die: The effect produced a *defect* — a value that is **not** an `E`
 * - Interrupted: The effect was cancelled/interrupted
 *
 * `Die` exists so the error channel stops lying. `IO.sync` and `IO.die` declare
 * `E = never`, so nothing they put in the error channel can be an `E`: a throwing
 * `IO.sync` thunk, a throwing `map`/`flatMap`/`mapError` callback, and `IO.die` all
 * produce values the declared type says cannot exist. Before `Die` these collapsed
 * into `Failure`, so a consumer that pattern-matched on `error._tag` got `undefined`
 * with no runtime signal that anything was wrong.
 *
 * Defects remain **recoverable** — `recover` / `recoverWith` / `fold` / `mapError`
 * treat `Die` exactly as they treat `Failure`. That is deliberate, and it is where
 * functype parts company with ZIO: promoting defects to uncatchable would silently
 * change what every existing `.recover()` catches. `Die` is an *observability* fix,
 * not a control-flow one — it records what the outcome really was when nothing
 * recovered it.
 *
 * `run()` and `runSync()` return `Either<E, A>`, which has no branch for a defect, so they
 * throw it instead. `Die` is observable through `runExit()` and through the `Exit` handed
 * to a `bracketExit` release.
 *
 * `Exit` is a discriminated union of {@link SuccessExitOf}, {@link FailureExitOf},
 * {@link DieExitOf} and {@link InterruptedExitOf}. Each variant holds its own field (`value`,
 * `error`, `defect`, `fiberId`), and the guards narrow to it, so `exit.isSuccess() && exit.value`
 * reads the value. The methods live on {@link ExitBase}, shared through one prototype per variant.
 * Variance comes from the variants, because a union type alias can't carry its own annotation.
 */
export type Exit<E extends Type, A extends Type> =
  SuccessExitOf<E, A> | FailureExitOf<E, A> | DieExitOf<E, A> | InterruptedExitOf<E, A>

const interruptedError = (fiberId: string): Error => new Error(`Effect was interrupted: ${fiberId}`)

/** Every Success shares these methods (#276 §14). `this.value` is the Success's own data. */
const SuccessProto = define<SuccessExitOf<AnyE, AnyA>>()("Success", {
  [Symbol.toStringTag]: "Exit",
  isSuccess(): this is SuccessExitOf<AnyE, AnyA> {
    return true
  },
  isFailure(): this is FailureExitOf<AnyE, AnyA> {
    return false
  },
  isDie(): this is DieExitOf<AnyE, AnyA> {
    return false
  },
  isInterrupted(): this is InterruptedExitOf<AnyE, AnyA> {
    return false
  },
  map(f) {
    return SuccessExit(f(this.value))
  },
  mapError() {
    return SuccessExit(this.value)
  },
  mapBoth(_onError, onSuccess) {
    return SuccessExit(onSuccess(this.value))
  },
  flatMap(f) {
    return f(this.value)
  },
  fold<T, U, V, W>(_onFailure: (e: AnyE) => T, onSuccess: (a: AnyA) => U): Unify<T, Unify<U, Unify<V, W>>> {
    return unify(onSuccess(this.value))
  },
  match<T, U, V, W>(patterns: {
    Success: (value: AnyA) => T
    Failure: (error: AnyE) => U
    Interrupted: (fiberId: string) => V
    Die?: (defect: unknown) => W
  }): Unify<T, Unify<U, Unify<V, W>>> {
    return unify(patterns.Success(this.value))
  },
  orThrow() {
    return this.value
  },
  getOrElse() {
    return this.value
  },
  toOption() {
    return Some(this.value)
  },
  toEither() {
    return Right(this.value)
  },
  toValue() {
    return { _tag: "Success" as const, value: this.value }
  },
  toString() {
    return `Exit.Success(${safeStringify(this.value)})`
  },
  toJSON() {
    return { _tag: "Success" as const, value: this.value }
  },
})

/** Every Failure shares these methods. `this.error` is the Failure's own data. */
const FailureProto = define<FailureExitOf<AnyE, AnyA>, "_tag" | "error">()("Failure", {
  [Symbol.toStringTag]: "Exit",
  isSuccess(): this is SuccessExitOf<AnyE, AnyA> {
    return false
  },
  isFailure(): this is FailureExitOf<AnyE, AnyA> {
    return true
  },
  isDie(): this is DieExitOf<AnyE, AnyA> {
    return false
  },
  isInterrupted(): this is InterruptedExitOf<AnyE, AnyA> {
    return false
  },
  map() {
    return FailureExit(this.error)
  },
  mapError(f) {
    return FailureExit(f(this.error))
  },
  mapBoth(onError) {
    return FailureExit(onError(this.error))
  },
  flatMap() {
    return FailureExit(this.error)
  },
  fold<T, U, V, W>(onFailure: (e: AnyE) => T): Unify<T, Unify<U, Unify<V, W>>> {
    return unify(onFailure(this.error))
  },
  match<T, U, V, W>(patterns: {
    Success: (value: AnyA) => T
    Failure: (error: AnyE) => U
    Interrupted: (fiberId: string) => V
    Die?: (defect: unknown) => W
  }): Unify<T, Unify<U, Unify<V, W>>> {
    return unify(patterns.Failure(this.error))
  },
  orThrow() {
    throw this.error
  },
  getOrElse(defaultValue) {
    return defaultValue()
  },
  toOption() {
    return None()
  },
  toEither() {
    return Left(this.error)
  },
  toValue() {
    return { _tag: "Failure" as const, error: this.error }
  },
  toString() {
    return `Exit.Failure(${safeStringify(this.error)})`
  },
  toJSON() {
    return { _tag: "Failure" as const, error: this.error }
  },
})

/**
 * Every Die shares these methods. `this.defect` is the Die's own data.
 *
 * Mirrors Failure everywhere the payload can be treated opaquely. It diverges on
 * {@link ExitBase.mapError}, which is typed `(e: E) => E2`: a defect is not an `E`, so handing it
 * to that callback would be the exact type lie `Die` exists to end. A defect passes through
 * `mapError` unchanged, as an interruption does.
 *
 * (`IO`'s own `.mapError` *does* rewrite a defect — it reads the error channel directly rather than
 * through this method, and its callback is documented to receive `unknown`. That keeps the pre-`Die`
 * behaviour of `.mapError` intact for callers.)
 */
const DieProto = define<DieExitOf<AnyE, AnyA>, "_tag" | "defect">()("Die", {
  [Symbol.toStringTag]: "Exit",
  isSuccess(): this is SuccessExitOf<AnyE, AnyA> {
    return false
  },
  isFailure(): this is FailureExitOf<AnyE, AnyA> {
    return false
  },
  isDie(): this is DieExitOf<AnyE, AnyA> {
    return true
  },
  isInterrupted(): this is InterruptedExitOf<AnyE, AnyA> {
    return false
  },
  map() {
    return DieExit(this.defect)
  },
  mapError() {
    return DieExit(this.defect)
  },
  mapBoth() {
    return DieExit(this.defect)
  },
  flatMap() {
    return DieExit(this.defect)
  },
  fold<T, U, V, W>(
    onFailure: (e: AnyE) => T,
    _onSuccess: (a: AnyA) => U,
    _onInterrupted?: (fiberId: string) => V,
    onDie?: (defect: unknown) => W,
  ): Unify<T, Unify<U, Unify<V, W>>> {
    return unify(onDie ? onDie(this.defect) : onFailure(this.defect as AnyE))
  },
  match<T, U, V, W>(patterns: {
    Success: (value: AnyA) => T
    Failure: (error: AnyE) => U
    Interrupted: (fiberId: string) => V
    Die?: (defect: unknown) => W
  }): Unify<T, Unify<U, Unify<V, W>>> {
    return unify(patterns.Die ? patterns.Die(this.defect) : patterns.Failure(this.defect as AnyE))
  },
  orThrow() {
    throw this.defect
  },
  getOrElse(defaultValue) {
    return defaultValue()
  },
  toOption() {
    return None()
  },
  toEither() {
    return Left(this.defect as AnyE)
  },
  toValue() {
    return { _tag: "Die" as const, defect: this.defect }
  },
  toString() {
    return `Exit.Die(${safeStringify(this.defect)})`
  },
  toJSON() {
    return { _tag: "Die" as const, defect: this.defect }
  },
})

/** Every Interrupted shares these methods. `this.fiberId` is the Interrupted's own data. */
const InterruptedProto = define<InterruptedExitOf<AnyE, AnyA>, "_tag" | "fiberId">()("Interrupted", {
  [Symbol.toStringTag]: "Exit",
  isSuccess(): this is SuccessExitOf<AnyE, AnyA> {
    return false
  },
  isFailure(): this is FailureExitOf<AnyE, AnyA> {
    return false
  },
  isDie(): this is DieExitOf<AnyE, AnyA> {
    return false
  },
  isInterrupted(): this is InterruptedExitOf<AnyE, AnyA> {
    return true
  },
  map() {
    return InterruptedExit(this.fiberId)
  },
  mapError() {
    return InterruptedExit(this.fiberId)
  },
  mapBoth() {
    return InterruptedExit(this.fiberId)
  },
  flatMap() {
    return InterruptedExit(this.fiberId)
  },
  fold<T, U, V, W>(
    _onFailure: (e: AnyE) => T,
    _onSuccess: (a: AnyA) => U,
    onInterrupted?: (fiberId: string) => V,
  ): Unify<T, Unify<U, Unify<V, W>>> {
    if (onInterrupted) return unify(onInterrupted(this.fiberId))
    throw interruptedError(this.fiberId)
  },
  match<T, U, V, W>(patterns: {
    Success: (value: AnyA) => T
    Failure: (error: AnyE) => U
    Interrupted: (fiberId: string) => V
    Die?: (defect: unknown) => W
  }): Unify<T, Unify<U, Unify<V, W>>> {
    return unify(patterns.Interrupted(this.fiberId))
  },
  orThrow() {
    throw interruptedError(this.fiberId)
  },
  getOrElse(defaultValue) {
    return defaultValue()
  },
  toOption() {
    return None()
  },
  toEither() {
    throw new Error(`Cannot convert Interrupted Exit to Either: ${this.fiberId}`)
  },
  toValue() {
    return { _tag: "Interrupted" as const, fiberId: this.fiberId }
  },
  toString() {
    return `Exit.Interrupted(${this.fiberId})`
  },
  toJSON() {
    return { _tag: "Interrupted" as const, fiberId: this.fiberId }
  },
})

/* eslint-disable functional/immutable-data -- each constructor fills in the object it just created */
// The one cast in each: a prototype checked at the opaque AnyE and AnyA works for every E and A.
const SuccessExit = <E extends Type, A extends Type>(value: A): SuccessExitOf<E, A> => {
  const exit = Object.create(SuccessProto) as Mutable<SuccessExitOf<E, A>>
  exit._tag = "Success"
  exit.value = value
  return exit
}

const FailureExit = <E extends Type, A extends Type>(error: E): FailureExitOf<E, A> => {
  const exit = Object.create(FailureProto) as Mutable<FailureExitOf<E, A>>
  exit._tag = "Failure"
  exit.error = error
  return exit
}

const DieExit = <E extends Type, A extends Type>(defect: unknown): DieExitOf<E, A> => {
  const exit = Object.create(DieProto) as Mutable<DieExitOf<E, A>>
  exit._tag = "Die"
  exit.defect = defect
  return exit
}

const InterruptedExit = <E extends Type, A extends Type>(fiberId: string): InterruptedExitOf<E, A> => {
  const exit = Object.create(InterruptedProto) as Mutable<InterruptedExitOf<E, A>>
  exit._tag = "Interrupted"
  exit.fiberId = fiberId
  return exit
}
/* eslint-enable functional/immutable-data */

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
   * Creates a Die Exit carrying a defect — a value that is not an `E`
   */
  die: <E extends Type, A extends Type>(defect: unknown): Exit<E, A> => DieExit(defect),

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
  isSuccess: <E extends Type, A extends Type>(exit: Exit<E, A>): exit is SuccessExitOf<E, A> => exit.isSuccess(),

  /**
   * Type guard for Failure
   */
  isFailure: <E extends Type, A extends Type>(exit: Exit<E, A>): exit is FailureExitOf<E, A> => exit.isFailure(),

  /**
   * Type guard for Die
   */
  isDie: <E extends Type, A extends Type>(exit: Exit<E, A>): exit is DieExitOf<E, A> => exit.isDie(),

  /**
   * Type guard for Interrupted
   */
  isInterrupted: <E extends Type, A extends Type>(exit: Exit<E, A>): exit is InterruptedExitOf<E, A> =>
    exit.isInterrupted(),

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
    if (exitA.isDie()) return exitA as unknown as Exit<E, readonly [A, B]>
    if (exitB.isDie()) return exitB as unknown as Exit<E, readonly [A, B]>
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
      if (exit.isDie()) return exit as unknown as Exit<E, readonly A[]>
      if (exit.isFailure()) return exit as unknown as Exit<E, readonly A[]>
      results.push(exit.orThrow())
    }
    return SuccessExit(results as readonly A[])
  },
}

/**
 * Exit constructor - creates an Exit from a value (defaults to Success)
 */
const ExitConstructor = <E extends Type, A extends Type>(value: A): Exit<E, A> => SuccessExit(value)

// The statics under a second name: the .d.ts then declares no value called ExitCompanion beside the interface
const ExitStatics = ExitCompanion

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
export const Exit: ExitCompanion = Companion(ExitConstructor, ExitStatics)

/** The type of `Exit`: its constructor and its statics, named so that errors and hovers print `ExitCompanion`. */
export interface ExitCompanion extends ExitConstructorType, ExitStaticsType {}
type ExitConstructorType = typeof ExitConstructor
type ExitStaticsType = typeof ExitStatics
