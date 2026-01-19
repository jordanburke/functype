import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import { Base } from "@/core"
import { Throwable } from "@/core/throwable/Throwable"
import type { Doable, DoResult } from "@/do/protocol"
import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import type { Extractable } from "@/extractable/Extractable"
import type { FunctypeBase } from "@/functype"
import { ArrayBuilder } from "@/internal/mutation-utils"
import { List } from "@/list/List"
import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import { Ref } from "@/ref/Ref"
import type { Try } from "@/try/Try"
import { Try as TryConstructor } from "@/try/Try"
import type { AsyncMonad, Promisable } from "@/typeclass"

/**
 * Type definition for errors with a _tag property that identifies them as Throwables
 */
export type TaggedThrowable = Error & {
  _tag: "Throwable"
  cause?: Error
  taskInfo?: { name: string; description: string }
}

/**
 * Type guard to check if an error is a TaggedThrowable
 */
export function isTaggedThrowable(error: unknown): error is TaggedThrowable {
  return (
    error instanceof Error && typeof error === "object" && true && (error as { _tag?: string })._tag === "Throwable"
  )
}

// Input parameters for tasks (optional)
export interface TaskParams {
  readonly name?: string
  readonly description?: string
}

// Resolved metadata for tasks (required)
export interface TaskMetadata {
  readonly name: string
  readonly description: string
}

// Standalone TaskOutcome interface - no longer extends Either
export interface TaskOutcome<T>
  extends FunctypeBase<T, "Ok" | "Err">, Extractable<T>, AsyncMonad<T>, Promisable<T>, Doable<T> {
  readonly _tag: "Ok" | "Err"
  readonly _meta: TaskMetadata

  // Value access
  readonly value?: T
  readonly error?: Throwable

  // Functional methods
  readonly map: <U>(f: (value: T) => U) => TaskOutcome<U>
  readonly flatMap: <U>(f: (value: T) => TaskOutcome<U> | Either<Throwable, U>) => TaskOutcome<U>
  readonly ap: <U>(ff: TaskOutcome<(value: T) => U>) => TaskOutcome<U>
  readonly mapAsync: <U>(f: (value: T) => Promise<U>) => Promise<TaskOutcome<U>>
  readonly flatMapAsync: <U>(f: (value: T) => Promise<TaskOutcome<U>>) => Promise<TaskOutcome<U>>

  // Error handling methods
  readonly mapError: (f: (error: Throwable) => Throwable) => TaskOutcome<T>
  readonly recover: (value: T) => Ok<T>
  readonly recoverWith: (f: (error: Throwable) => T) => Ok<T>

  // Type guards
  readonly isSuccess: () => this is Ok<T>
  readonly isFailure: () => this is Err<T>
  readonly isOk: () => this is Ok<T>
  readonly isErr: () => this is Err<T>

  // Conversion methods
  readonly toEither: () => Either<Throwable, T>
  readonly toTry: () => Try<T>
  readonly toOption: () => Option<T>
  readonly toList: () => List<T>

  // Pattern matching
  readonly fold: <U>(onErr: (error: Throwable) => U, onOk: (value: T) => U) => U
  readonly match: <U>(patterns: { Ok: (value: T) => U; Err: (error: Throwable) => U }) => U
}

// Success case interface - extends TaskOutcome
export interface Ok<T> extends TaskOutcome<T> {
  readonly _tag: "Ok"
  readonly value: T
  readonly error: undefined
}

// Failure case interface - extends TaskOutcome
export interface Err<T> extends TaskOutcome<T> {
  readonly _tag: "Err"
  readonly value: undefined
  readonly error: Throwable
}

// Legacy type aliases for backwards compatibility
export type TaskSuccess<T> = Ok<T>
export type TaskFailure<T> = Err<T>

/**
 * Helper function to convert Either to TaskOutcome
 * @param either - The Either to convert
 * @param params - Task parameters to attach
 */
const eitherToTaskOutcome = <T>(either: Either<Throwable, T>, params?: TaskParams): TaskOutcome<T> => {
  if (either.isRight()) {
    return Ok(either.orThrow(), params)
  } else if (either.isLeft()) {
    return Err<T>(
      either.fold(
        (left) => left,
        () => new Error("Unexpected right value"),
      ),
      undefined,
      params,
    )
  } else {
    throw new Error("Unrecognized task outcome")
  }
}

/**
 * Err constructor - Creates a failed TaskOutcome
 * @param error - The error object
 * @param data - Additional data related to the error
 * @param params - Task parameters
 */
export const Err = <T>(error: unknown, data?: unknown, params?: TaskParams): Err<T> => {
  const meta: TaskMetadata = {
    name: params?.name ?? "Task",
    description: params?.description ?? "",
  }

  // Pass metadata to Throwable for error chain tracking
  const throwable = Throwable.apply(error, data, meta)

  const errResult = {
    ...Base("Err", { error: throwable, meta }),
    _tag: "Err" as const,
    _meta: meta,
    value: undefined,
    error: throwable,

    // Type guards
    isSuccess(): this is Ok<T> {
      return false
    },
    isFailure(): this is Err<T> {
      return true
    },
    isOk(): this is Ok<T> {
      return false
    },
    isErr(): this is Err<T> {
      return true
    },

    // Functional methods (no-ops for Err)
    map: <U>(_f: (value: T) => U) => Err<U>(throwable, data, params),
    flatMap: <U>(_f: (value: T) => TaskOutcome<U> | Either<Throwable, U>) => Err<U>(throwable, data, params),
    ap: <U>(_ff: TaskOutcome<(value: T) => U>) => Err<U>(throwable, data, params),
    mapAsync: <U>(_f: (value: T) => Promise<U>) => Promise.resolve(Err<U>(throwable, data, params)),
    flatMapAsync: <U>(_f: (value: T) => Promise<TaskOutcome<U>>) => Promise.resolve(Err<U>(throwable, data, params)),

    // Error handling methods
    mapError: (f: (error: Throwable) => Throwable) => Err<T>(f(throwable), data, params),
    recover: (value: T) => Ok(value, params),
    recoverWith: (f: (error: Throwable) => T) => Ok(f(throwable), params),

    // Extractable methods
    orThrow: (error?: Error) => {
      throw error ?? throwable
    },
    orElse: (defaultValue: T) => defaultValue,
    or: (alternative: TaskOutcome<T>) => alternative,
    orNull: () => null as T | null,
    orUndefined: () => undefined as T | undefined,

    // Conversion methods
    toEither: () => Left<Throwable, T>(throwable),
    toTry: () =>
      TryConstructor<T>(() => {
        throw throwable
      }),
    toOption: () => None<T>(),
    toList: () => List<T>([]),

    // Pattern matching
    fold: <U>(onErr: (error: Throwable) => U, _onOk: (value: T) => U) => onErr(throwable),
    match: <U>(patterns: { Ok: (value: T) => U; Err: (error: Throwable) => U }) => patterns.Err(throwable),

    // Foldable methods
    foldLeft:
      <B>(z: B) =>
      (_op: (b: B, a: T) => B) =>
        z,
    foldRight:
      <B>(z: B) =>
      (_op: (a: T, b: B) => B) =>
        z,

    // Traversable methods
    size: 0,
    isEmpty: true,
    contains: (_value: T) => false,
    reduce: (_f: (b: T, a: T) => T) => {
      throw new Error("Cannot reduce empty Err")
    },
    reduceRight: (_f: (b: T, a: T) => T) => {
      throw new Error("Cannot reduceRight empty Err")
    },
    count: (_p: (value: T) => boolean) => 0,
    find: (_p: (value: T) => boolean) => None<T>(),
    exists: (_p: (value: T) => boolean) => false,
    forEach: (_f: (value: T) => void) => {},

    // Promise methods
    toPromise: () => Promise.reject(throwable),

    // Do-notation support
    doUnwrap(): DoResult<T> {
      return { ok: false, empty: false, error: throwable }
    },

    // Serializable methods
    serialize: () => ({
      toJSON: () => stringify({ _tag: "Err", error: throwable.message ?? throwable.toString() }) ?? "{}",
      toYAML: () => `_tag: Err\nerror: ${throwable.message ?? throwable.toString()}`,
      toBinary: () =>
        Buffer.from(JSON.stringify({ _tag: "Err", error: throwable.message ?? throwable.toString() })).toString(
          "base64",
        ),
    }),

    // Pipe method
    pipe: <U>(f: (value: TaskOutcome<T>) => U) => f(errResult as TaskOutcome<T>),
  }

  return errResult
}

/**
 * Ok constructor - Creates a successful TaskOutcome
 * @param data - The successful value
 * @param params - Task parameters
 */
export const Ok = <T>(data: T, params?: TaskParams): Ok<T> => {
  const meta: TaskMetadata = {
    name: params?.name ?? "Task",
    description: params?.description ?? "",
  }

  const okResult = {
    ...Base("Ok", { value: data, meta }),
    _tag: "Ok" as const,
    _meta: meta,
    value: data,
    error: undefined,

    // Type guards
    isSuccess(): this is Ok<T> {
      return true
    },
    isFailure(): this is Err<T> {
      return false
    },
    isOk(): this is Ok<T> {
      return true
    },
    isErr(): this is Err<T> {
      return false
    },

    // Functional methods
    map: <U>(f: (value: T) => U) => Ok<U>(f(data), params),
    flatMap: <U>(f: (value: T) => TaskOutcome<U> | Either<Throwable, U>) => {
      const result = f(data)
      // Check if it's an Either
      if (result && typeof result === "object" && "isLeft" in result && "isRight" in result) {
        return eitherToTaskOutcome(result as Either<Throwable, U>, params)
      }
      // It's already a TaskOutcome
      return result as TaskOutcome<U>
    },
    ap: <U>(ff: TaskOutcome<(value: T) => U>) =>
      ff.isOk() ? Ok<U>(ff.value!(data), params) : Err<U>(ff.error!, undefined, params),
    mapAsync: async <U>(f: (value: T) => Promise<U>) => Ok<U>(await f(data), params),
    flatMapAsync: async <U>(f: (value: T) => Promise<TaskOutcome<U>>) => await f(data),

    // Error handling methods (no-ops for success)
    mapError: (_f: (error: Throwable) => Throwable) => Ok(data, params),
    recover: (_value: T) => Ok(data, params),
    recoverWith: (_f: (error: Throwable) => T) => Ok(data, params),

    // Extractable methods
    orThrow: (_error?: Error) => data,
    orElse: (_defaultValue: T) => data,
    or: (_alternative: TaskOutcome<T>) => Ok(data, params),
    orNull: () => data as T | null,
    orUndefined: () => data as T | undefined,

    // Conversion methods
    toEither: () => Right<Throwable, T>(data),
    toTry: () => TryConstructor<T>(() => data),
    toOption: () => Some(data),
    toList: () => List<T>([data]),

    // Pattern matching
    fold: <U>(_onErr: (error: Throwable) => U, onOk: (value: T) => U) => onOk(data),
    match: <U>(patterns: { Ok: (value: T) => U; Err: (error: Throwable) => U }) => patterns.Ok(data),

    // Foldable methods
    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: T) => B) =>
        op(z, data),
    foldRight:
      <B>(z: B) =>
      (op: (a: T, b: B) => B) =>
        op(data, z),

    // Traversable methods
    size: 1,
    isEmpty: false,
    contains: (value: T) => data === value,
    reduce: (_f: (b: T, a: T) => T) => data,
    reduceRight: (_f: (b: T, a: T) => T) => data,
    count: (p: (value: T) => boolean) => (p(data) ? 1 : 0),
    find: (p: (value: T) => boolean) => (p(data) ? Some(data) : None<T>()),
    exists: (p: (value: T) => boolean) => p(data),
    forEach: (f: (value: T) => void) => f(data),

    // Promise methods
    toPromise: () => Promise.resolve(data),

    // Do-notation support
    doUnwrap(): DoResult<T> {
      return { ok: true, value: data }
    },

    // Serializable methods
    serialize: () => ({
      toJSON: () => stringify({ _tag: "Ok", value: data }) ?? "{}",
      toYAML: () => `_tag: Ok\nvalue: ${stringify(data) ?? "undefined"}`,
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "Ok", value: data })).toString("base64"),
    }),

    // Pipe method
    pipe: <U>(f: (value: TaskOutcome<T>) => U) => f(okResult as TaskOutcome<T>),
  }

  return okResult
}

// Promise wrapper for async operations
export type TaskResult<T> = Promise<TaskOutcome<T>>

// Legacy aliases removed - Ok and Err are now the primary constructors

/**
 * The CancellationToken is a control structure that allows long-running tasks to be cancelled
 * Cancellation is cooperative, meaning the task must check the token and respond to cancellation requests
 */
export type CancellationToken = {
  /** Whether the token has been cancelled */
  readonly isCancelled: boolean
  /** Signal that can be used with fetch and other abortable APIs */
  readonly signal: AbortSignal
  /** Register a callback to be called when cancellation occurs */
  onCancel(callback: () => void): void
}

/**
 * Create a cancellation token and controller
 * The controller can be used to cancel operations that use the token
 */
export type CancellationTokenSource = {
  /** The token to be passed to cancellable operations */
  readonly token: CancellationToken
  /** Cancel all operations using this token */
  cancel(): void
}

/**
 * Create a cancellation token source
 * @returns A CancellationTokenSource that can be used to create and control cancellation tokens
 */
export const createCancellationTokenSource = (): CancellationTokenSource => {
  const controller = new AbortController()
  const callbacks = ArrayBuilder<() => void>()

  const token: CancellationToken = {
    get isCancelled() {
      return controller.signal.aborted
    },
    get signal() {
      return controller.signal
    },
    onCancel(callback: () => void) {
      if (controller.signal.aborted) {
        // Already cancelled, execute callback immediately
        callback()
      } else {
        callbacks.add(callback)
      }
    },
  }

  return {
    token,
    cancel() {
      if (!controller.signal.aborted) {
        controller.abort()
        // Execute all callbacks
        callbacks.build().forEach((callback) => {
          try {
            callback()
          } catch (e) {
            // Ignore callback errors
            console.error("Error in cancellation callback:", e)
          }
        })
      }
    },
  }
}

// Legacy type aliases - can be removed if not needed
export type Sync<T> = TaskOutcome<T>
export type Async<T> = TaskResult<T>

/**
 * Task adapter for bridging promise-based code with functional error handling patterns
 */
const TaskConstructor = <T = unknown>(params?: TaskParams) => {
  const name = params?.name ?? "Task"
  const description = params?.description ?? ""
  const body = {
    /**
     * Run an async operation with explicit try/catch/finally semantics
     * Returns a raw Promise that can interact with traditional Promise-based code
     *
     * @param t - The main operation function that returns a value or Promise
     * @param e - Optional error handler function
     * @param f - Optional finally handler function
     * @param cancellationToken - Optional token for cancellation support
     */
    Async: <U = T>(
      t: () => U | Promise<U> | TaskOutcome<U> | Promise<TaskOutcome<U>>,
      e: (error: unknown) => unknown | TaskOutcome<U> = (error: unknown) => error,
      f: () => Promise<void> | void = () => {},
      cancellationToken?: CancellationToken,
    ): Promise<TaskOutcome<U>> => {
      return new Promise<TaskOutcome<U>>((resolve) => {
        // Wrap async logic in IIFE to avoid async executor
        void (async () => {
          // Setup cancellation if a token was provided
          const isCancelled = Ref(false)
          const cancelError = Ref<Error | null>(null)
          const cleanupCancellation = Ref<() => void>(() => {})

          if (cancellationToken) {
            // Check if already cancelled
            if (cancellationToken.isCancelled) {
              try {
                // Always run finally before rejecting
                await f()
              } catch (finallyError) {
                resolve(Err<U>(finallyError, undefined, { name, description }))
                return
              }

              resolve(
                Err<U>(new Error("Task was cancelled before execution started"), undefined, {
                  name,
                  description,
                }),
              )
              return
            }

            // Setup cancellation handler
            const handleCancellation = () => {
              isCancelled.set(true)
              cancelError.set(new Error("Task was cancelled during execution"))
              // We don't reject immediately to allow the finally block to run
            }

            cancellationToken.onCancel(handleCancellation)
            cleanupCancellation.set(() => {
              // No way to remove the callback, but we can track if cancelled
            })
          }

          try {
            // Run the main operation
            const result = await t()

            // Always run finally first
            try {
              await f()
            } catch (finallyError) {
              // Finally errors take precedence
              resolve(Err<U>(finallyError, undefined, { name, description }))
              return
            }

            // Check for cancellation after finally
            if (isCancelled.get()) {
              if (cancelError.get()) {
                resolve(Err<U>(cancelError.get(), undefined, { name, description }))
              } else {
                resolve(Err<U>(new Error("Task was cancelled during execution"), undefined, { name, description }))
              }
              return
            }

            // Check if result is already a TaskOutcome
            if (result && typeof result === "object" && "_tag" in result) {
              const outcome = result as TaskOutcome<U>
              if (outcome._tag === "Ok" || outcome._tag === "Err") {
                // Result is already a TaskOutcome, use it directly
                resolve(outcome)
              } else {
                // Not a TaskOutcome, wrap as success
                resolve(Ok(result as U, { name, description }))
              }
            } else {
              // Raw value, wrap as success
              resolve(Ok(result as U, { name, description }))
            }
          } catch (error) {
            // Always run finally first, regardless of cancellation
            try {
              await f()
            } catch (finallyError) {
              // Finally errors take precedence over all other errors
              resolve(Err<U>(finallyError, undefined, { name, description }))
              return
            }

            // Now handle cancellation or regular error
            if (isCancelled.get()) {
              // Task was cancelled
              if (cancelError.get()) {
                resolve(Err<U>(cancelError.get(), undefined, { name, description }))
              } else {
                resolve(Err<U>(new Error("Task was cancelled during execution"), undefined, { name, description }))
              }
              return
            }

            // Process the original error through error handler
            try {
              // Check if error is already a Throwable (from an inner task)
              if (error instanceof Error && isTaggedThrowable(error)) {
                // Create a new Throwable that wraps the inner error as its cause
                // This preserves the error chain while adding outer task context
                const outerError = new Error(`${name}: ${(error as Error).message}`)
                const enhancedError = Throwable.apply(outerError, undefined, { name, description })

                // Set the original error as the cause
                Object.defineProperty(enhancedError, "cause", {
                  value: error,
                  writable: false,
                  configurable: false,
                })

                // Call the error handler for logging/side effects but don't use its result
                // This allows handlers to be called without changing the error propagation logic
                // Use a non-awaited promise to avoid blocking the error propagation
                // This improves performance while still ensuring the handler runs
                void Promise.resolve().then(() => {
                  try {
                    e(error)
                  } catch (handlerError) {
                    // Ignore errors from the handler when preserving error chain
                    console.error("Error in error handler:", handlerError)
                  }
                })

                // Return the enhanced error as a TaskFailure
                resolve(Err<U>(enhancedError, undefined, { name, description }))
              } else {
                // Regular error handling for non-Throwable errors
                const errorResult = await e(error)

                // Check if error handler returned a TaskOutcome
                if (errorResult && typeof errorResult === "object" && "_tag" in errorResult) {
                  const outcome = errorResult as TaskOutcome<U>
                  if (outcome._tag === "Ok" || outcome._tag === "Err") {
                    // Error handler returned a TaskOutcome, use it directly
                    resolve(outcome)
                  } else {
                    // Not a TaskOutcome, wrap as failure
                    resolve(Err<U>(errorResult, undefined, { name, description }))
                  }
                } else {
                  // Regular error, wrap as failure
                  resolve(Err<U>(errorResult, undefined, { name, description }))
                }
              }
            } catch (handlerError) {
              // If error handler throws, wrap as failure
              resolve(Err<U>(handlerError, undefined, { name, description }))
            }
          } finally {
            cleanupCancellation.get()()
          }
        })().catch((error) => resolve(Err<U>(error, undefined, { name, description }))) // Handle any errors from the async IIFE
      })
    },

    /**
     * Run a synchronous operation with explicit try/catch/finally semantics
     * Returns a TaskOutcome for functional error handling
     *
     * @param t - The main operation function that returns a value
     * @param e - Optional error handler function
     * @param f - Optional finally handler function
     */
    Sync: <U = T>(
      t: () => U,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => void = () => {},
    ): TaskOutcome<U> => {
      try {
        return Ok<U>(t(), { name, description })
      } catch (error) {
        return Err<U>(e(error), undefined, { name, description })
      } finally {
        f()
      }
    },

    /**
     * Run an async operation with progress tracking capabilities
     * Returns a Promise and provides progress updates via callback
     *
     * @param t - The main operation that receives a progress updater function
     * @param onProgress - Callback that receives progress updates (0-100)
     * @param e - Optional error handler function
     * @param f - Optional finally handler function
     * @param cancellationToken - Optional token for cancellation support
     */
    AsyncWithProgress: <U = T>(
      t: (updateProgress: (percent: number) => void) => U | Promise<U> | TaskOutcome<U> | Promise<TaskOutcome<U>>,
      onProgress: (percent: number) => void,
      e: (error: unknown) => unknown | TaskOutcome<U> = (error: unknown) => error,
      f: () => Promise<void> | void = () => {},
      cancellationToken?: CancellationToken,
    ): Promise<TaskOutcome<U>> => {
      // Create a progress updater that validates and forwards progress
      const updateProgress = (percent: number) => {
        // Validate progress value
        const validPercent = Math.max(0, Math.min(100, percent))
        // Only report progress if not already at 100%
        if (validPercent <= 100) {
          onProgress(validPercent)
        }
      }

      // Use the regular Async method with the progress-enabled function
      return body.Async<U>(() => t(updateProgress), e, f, cancellationToken)
    },
  }

  return {
    ...Base("Task", body),
    _type: "Task",
  }
}

const TaskCompanion = {
  /**
   * Create a successful Task result
   */
  success: <T>(data: T, params?: TaskParams): Ok<T> => Ok<T>(data, params),

  /**
   * Create a failed Task result
   */
  fail: <T>(error: unknown, data?: unknown, params?: TaskParams): Err<T> => Err<T>(error, data, params),

  /**
   * Create a successful Task result (alias for success)
   * Preferred for new code
   */
  ok: <T>(data: T, params?: TaskParams): Ok<T> => Ok<T>(data, params),

  /**
   * Create a failed Task result (alias for fail)
   * Preferred for new code
   */
  err: <T>(error: unknown, data?: unknown, params?: TaskParams): Err<T> => Err<T>(error, data, params),

  /**
   * Create TaskOutcome from Either
   * @param either - Either to convert
   * @param params - Task parameters
   */
  fromEither: <T>(either: Either<Throwable, T>, params?: TaskParams): TaskOutcome<T> =>
    eitherToTaskOutcome(either, params),

  /**
   * Create TaskOutcome from Try
   * @param tryValue - Try to convert
   * @param params - Task parameters
   */
  fromTry: <T>(tryValue: Try<T>, params?: TaskParams): TaskOutcome<T> =>
    tryValue.isSuccess()
      ? Ok<T>(tryValue.orThrow(), params)
      : Err<T>(
          tryValue.fold(
            (error) => error,
            () => new Error("Unexpected success"),
          ),
          undefined,
          params,
        ),

  /**
   * Extract the error chain from a Throwable error
   * Returns an array of errors from outermost to innermost
   *
   * @param error - The error to extract the chain from
   * @returns An array of errors in the chain, from outermost to innermost
   */
  getErrorChain: (error: Error | undefined): Error[] => {
    if (!error) return []

    const chain = ArrayBuilder<Error>()
    chain.add(error)
    const current = Ref(error)

    // Traverse the cause chain
    while (current.get() && (current.get() as TaggedThrowable).cause) {
      const { cause } = current.get() as TaggedThrowable
      if (cause) {
        chain.add(cause)
        current.set(cause)
      } else {
        break
      }

      // Prevent infinite loops if circular references exist
      if (chain.size() > 100) break
    }

    return chain.build()
  },

  /**
   * Format the error chain as a string with the option to include task details
   *
   * @param error - The error to format
   * @param options - Formatting options
   * @returns A formatted string representation of the error chain
   */
  formatErrorChain: (
    error: Error | undefined,
    options?: {
      includeTasks?: boolean
      separator?: string
      includeStackTrace?: boolean
    },
  ): string => {
    const chain = TaskCompanion.getErrorChain(error)
    const separator = options?.separator ?? "\n"

    return chain
      .map((err, index) => {
        if (!err) {
          return `${index > 0 ? "↳ " : ""}Unknown error`
        }

        const { taskInfo } = err as TaggedThrowable
        const taskName = options?.includeTasks && taskInfo?.name ? `[${taskInfo.name}] ` : ""
        const message = err.message ?? "No message"

        const result = Ref(`${index > 0 ? "↳ " : ""}${taskName}${message}`)

        // Add stack trace if requested
        if (options?.includeStackTrace && err.stack) {
          result.set(`${result.get()}\n${err.stack.split("\n").slice(1).join("\n")}`)
        }

        return result.get()
      })
      .join(separator)
  },

  /**
   * Convert a Promise-returning function to a Task-compatible function
   */
  fromPromise: <U, Args extends unknown[]>(
    promiseFn: (...args: Args) => Promise<U>,
    params?: TaskParams,
  ): ((...args: Args) => Promise<TaskOutcome<U>>) => {
    return (...args: Args) => {
      const taskParams = params ?? { name: "PromiseTask", description: "Task from Promise" }
      return Task(taskParams).Async<U>(
        () => promiseFn(...args),
        (error) => error,
      )
    }
  },

  /**
   * Convert a Task result to a Promise
   */
  toPromise: <U>(taskOutcome: TaskOutcome<U>): Promise<U> => {
    return new Promise((resolve, reject) => {
      if (taskOutcome.isSuccess()) {
        // TypeScript now knows this is Ok<U>
        resolve(taskOutcome.orThrow())
      } else {
        // TypeScript now knows this is Err<U>
        reject((taskOutcome as Err<U>).error)
      }
    })
  },

  /**
   * Race multiple tasks and return the result of the first one to complete
   * Optionally specify a timeout after which the race will fail
   *
   * @param tasks - Array of tasks to race (as Promises)
   * @param timeoutMs - Optional timeout in milliseconds
   * @param params - Task parameters for the race operation
   * @returns A promise that resolves with the first task to complete or rejects if all tasks fail
   */
  race: <T>(
    tasks: Array<Promise<T> | Promise<TaskOutcome<T>>>,
    timeoutMs?: number,
    params?: TaskParams,
  ): Promise<TaskOutcome<T>> => {
    const name = params?.name ?? "TaskRace"
    const description = params?.description ?? "Race between multiple tasks"
    const taskParams = { name, description }

    return Task(taskParams).Async<T>(
      async () => {
        // Create the race between all tasks - need to handle both T and TaskOutcome<T>
        const racePromises = ArrayBuilder<Promise<T> | Promise<TaskOutcome<T>>>()
        tasks.forEach((task) => racePromises.add(task))

        // Add timeout promise if timeoutMs is specified
        const timeoutId = Ref<NodeJS.Timeout | undefined>(undefined)
        if (typeof timeoutMs === "number" && timeoutMs > 0) {
          // Create a timeout promise
          const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId.set(
              setTimeout(() => {
                reject(new Error(`Task race timed out after ${timeoutMs}ms`))
              }, timeoutMs),
            )
          })
          racePromises.add(timeoutPromise)
        }

        try {
          // Create a compatible race implementation
          // We need to handle both T and TaskOutcome<T> types
          return await new Promise<T>((resolve, reject) => {
            // Setup promises to handle their own resolution
            racePromises.build().forEach((promise) => {
              // Handle promise resolution - need to check if result is TaskOutcome
              promise.then(
                // Success handler - check if result is already TaskOutcome
                (result: T | TaskOutcome<T>) => {
                  // Check if this is a TaskOutcome
                  if (result && typeof result === "object" && "_tag" in result) {
                    const outcome = result as TaskOutcome<T>
                    if (outcome._tag === "Ok") {
                      // Extract the value from Ok
                      resolve(outcome.orThrow())
                    } else if (outcome._tag === "Err") {
                      // Err - reject with the error
                      reject((outcome as Err<T>).error)
                    } else {
                      // Not a TaskOutcome, treat as raw value
                      resolve(result as T)
                    }
                  } else {
                    // Raw value
                    resolve(result as T)
                  }
                },
                // Error handler
                (error: unknown) => reject(error),
              )
            })
          })
        } finally {
          // Clear timeout if it was set
          if (timeoutId.get()) {
            clearTimeout(timeoutId.get())
          }
        }
      },
      (error) => error,
    )
  },

  /**
   * Convert a Node.js style callback function to a Task-compatible function
   * Node.js callbacks typically have the signature (error, result) => void
   *
   * @param nodeFn - Function that accepts a Node.js style callback
   * @param params - Task parameters
   * @returns A function that returns a Promise
   */
  fromNodeCallback: <T, Args extends unknown[]>(
    nodeFn: (...args: [...Args, (error: unknown, result: T) => void]) => void,
    params?: TaskParams,
  ): ((...args: Args) => Promise<TaskOutcome<T>>) => {
    const name = params?.name ?? "NodeCallbackTask"
    const description = params?.description ?? "Task from Node.js callback function"
    const taskParams = { name, description }

    return (...args: Args) => {
      return Task(taskParams).Async<T>(
        () => {
          return new Promise<T>((resolve, reject) => {
            try {
              nodeFn(...args, (error: unknown, result: T) => {
                if (error) {
                  reject(error)
                } else {
                  resolve(result)
                }
              })
            } catch (syncError) {
              reject(syncError)
            }
          })
        },
        (error) => error,
      )
    }
  },

  /**
   * Create a cancellation token source
   * @returns A cancellation token source that can be used to control task cancellation
   */
  createCancellationTokenSource,

  /**
   * Create a task that can be cancelled
   *
   * @param task - The task function to make cancellable
   * @param params - Task parameters
   * @returns An object with the task and a function to cancel it
   */
  cancellable: <T>(
    task: (token: CancellationToken) => Promise<T> | Promise<TaskOutcome<T>>,
    params?: TaskParams,
  ): { task: Promise<TaskOutcome<T>>; cancel: () => void } => {
    const tokenSource = createCancellationTokenSource()
    const taskPromise = Task(params).Async<T>(
      () => task(tokenSource.token),
      (error) => error,
      () => {},
      tokenSource.token,
    )

    return {
      task: taskPromise,
      cancel: () => tokenSource.cancel(),
    }
  },

  /**
   * Creates a task with progress tracking
   *
   * @param task - The task function that accepts a progress updater
   * @param onProgress - Callback function that receives progress updates
   * @param params - Task parameters
   * @returns An object with the task, cancel function, and current progress
   */
  withProgress: <T>(
    task: (updateProgress: (percent: number) => void, token: CancellationToken) => Promise<T> | Promise<TaskOutcome<T>>,
    onProgress: (percent: number) => void = () => {},
    params?: TaskParams,
  ): { task: Promise<TaskOutcome<T>>; cancel: () => void; currentProgress: () => number } => {
    const tokenSource = createCancellationTokenSource()
    const currentProgressValue = Ref(0)

    const updateProgress = (percent: number) => {
      currentProgressValue.set(Math.max(0, Math.min(100, percent)))
      onProgress(currentProgressValue.get())
    }

    const taskPromise = Task(params).Async<T>(
      () => task(updateProgress, tokenSource.token),
      (error) => error,
      () => {},
      tokenSource.token,
    )

    return {
      task: taskPromise,
      cancel: () => tokenSource.cancel(),
      currentProgress: () => currentProgressValue.get(),
    }
  },
}

export const Task = Companion(TaskConstructor, TaskCompanion)

export type Task = ReturnType<typeof Task>
