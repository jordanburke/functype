import { Companion } from "@/companion/Companion"
import { Base } from "@/core"
import { Throwable } from "@/core/throwable/Throwable"
import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import { FPromise } from "@/fpromise/FPromise"

/**
 * Type definition for errors with a _tag property that identifies them as Throwables
 */
export type TaggedThrowable = Error & {
  _tag: "Throwable"
  cause?: Error
  taskInfo?: TaskInfo
}

/**
 * Type guard to check if an error is a TaggedThrowable
 */
export function isTaggedThrowable(error: unknown): error is TaggedThrowable {
  return (
    error instanceof Error && typeof error === "object" && true && (error as { _tag?: string })._tag === "Throwable"
  )
}

export type TaskParams = {
  name?: string
  description?: string
}

export type TaskInfo = {
  _task: TaskParams
  name?: string
  description?: string
}

export type TaskException<T> = Either<Throwable, T> & TaskInfo

/**
 * TaskException factory function
 * @param error - The error object
 * @param data - Additional data related to the error
 * @param _task - Task parameters
 */
export const TaskException = <T>(error: unknown, data?: unknown, _task?: TaskParams): TaskException<T> => {
  const name = _task?.name || "TaskException"
  const description = _task?.description || "Unspecified TaskException"
  const taskInfo = { name, description }
  // Pass task info to the Throwable
  const appError = Throwable.apply(error, data, taskInfo)
  return {
    ...Base("TaskException", Left(appError)),
    _task: taskInfo,
  }
}

export type TaskResult<T> = Either<Throwable, T> & TaskInfo

export const TaskResult = <T>(data: T, _task?: TaskParams): TaskResult<T> => {
  const name = _task?.name || "TaskResult"
  const description = _task?.description || "Unspecified TaskResult"
  return {
    ...Base("TaskResult", Right(data)),
    _task: { name, description },
  }
}

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
  const callbacks: Array<() => void> = []

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
        callbacks.push(callback)
      }
    },
  }

  return {
    token,
    cancel() {
      if (!controller.signal.aborted) {
        controller.abort()
        // Execute all callbacks
        callbacks.forEach((callback) => {
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

export type Sync<T> = Either<Throwable, T>
export type Async<T> = FPromise<Sync<T>>

/**
 * Task adapter for bridging promise-based code with functional error handling patterns
 */
const TaskConstructor = <T = unknown>(params?: TaskParams) => {
  const name = params?.name || "Task"
  const description = params?.description || ""
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
      t: () => U | Promise<U>,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => Promise<void> | void = () => {},
      cancellationToken?: CancellationToken,
    ): FPromise<U> => {
      return FPromise<U>(async (resolve, reject) => {
        // Setup cancellation if a token was provided
        let isCancelled = false
        let cancelError: Error | null = null
        let cleanupCancellation = () => {}

        if (cancellationToken) {
          // Check if already cancelled
          if (cancellationToken.isCancelled) {
            try {
              // Always run finally before rejecting
              await f()
            } catch (finallyError) {
              reject(Throwable.apply(finallyError, undefined, { name, description }))
              return
            }

            reject(
              Throwable.apply(new Error("Task was cancelled before execution started"), undefined, {
                name,
                description,
              }),
            )
            return
          }

          // Setup cancellation handler
          const handleCancellation = () => {
            isCancelled = true
            cancelError = new Error("Task was cancelled during execution")
            // We don't reject immediately to allow the finally block to run
          }

          cancellationToken.onCancel(handleCancellation)
          cleanupCancellation = () => {
            // No way to remove the callback, but we can track if cancelled
          }
        }

        try {
          // Run the main operation
          const result = await t()

          // Process cancellation if it occurred during execution
          if (isCancelled) {
            try {
              // Always run finally
              await f()
            } catch (finallyError) {
              // Finally errors take precedence
              reject(Throwable.apply(finallyError, undefined, { name, description }))
              return
            }

            if (cancelError) {
              reject(Throwable.apply(cancelError, undefined, { name, description }))
            } else {
              reject(
                Throwable.apply(new Error("Task was cancelled during execution"), undefined, { name, description }),
              )
            }
            return
          }

          try {
            // Run finally before resolving
            await f()
          } catch (finallyError) {
            // Finally errors take precedence
            reject(Throwable.apply(finallyError, undefined, { name, description }))
            return
          }

          // Success path - resolve with the value directly
          resolve(result)
        } catch (error) {
          // Process cancellation first if it occurred
          if (isCancelled) {
            try {
              // Always run finally
              await f()
            } catch (finallyError) {
              // Finally errors take precedence
              reject(Throwable.apply(finallyError, undefined, { name, description }))
              return
            }

            if (cancelError) {
              reject(Throwable.apply(cancelError, undefined, { name, description }))
            } else {
              reject(
                Throwable.apply(new Error("Task was cancelled during execution"), undefined, { name, description }),
              )
            }
            return
          }

          // Handle regular error with finally
          try {
            // Always run finally
            await f()
          } catch (finallyError) {
            // Finally errors take precedence over operation errors
            reject(Throwable.apply(finallyError, undefined, { name, description }))
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
              Promise.resolve().then(() => {
                try {
                  e(error)
                } catch (handlerError) {
                  // Ignore errors from the handler when preserving error chain
                  console.error("Error in error handler:", handlerError)
                }
              })

              reject(enhancedError)
            } else {
              // Regular error handling for non-Throwable errors
              const errorResult = await e(error)
              reject(Throwable.apply(errorResult, undefined, { name, description }))
            }
          } catch (handlerError) {
            // If error handler throws, use that error
            reject(Throwable.apply(handlerError, undefined, { name, description }))
          }
        } finally {
          cleanupCancellation()
        }
      })
    },

    /**
     * Run a synchronous operation with explicit try/catch/finally semantics
     * Returns an Either for functional error handling
     *
     * @param t - The main operation function that returns a value
     * @param e - Optional error handler function
     * @param f - Optional finally handler function
     */
    Sync: <U = T>(
      t: () => U,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => void = () => {},
    ): Sync<U> => {
      try {
        return TaskResult<U>(t(), { name, description })
      } catch (error) {
        return TaskException<U>(e(error), undefined, { name, description })
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
      t: (updateProgress: (percent: number) => void) => U | Promise<U>,
      onProgress: (percent: number) => void,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => Promise<void> | void = () => {},
      cancellationToken?: CancellationToken,
    ): FPromise<U> => {
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
  success: <T>(data: T, params?: TaskParams): TaskResult<T> => TaskResult<T>(data, params),

  /**
   * Create a failed Task result
   */
  fail: <T>(error: unknown, data?: unknown, params?: TaskParams): TaskException<T> =>
    TaskException<T>(error, data, params),

  /**
   * Extract the error chain from a Throwable error
   * Returns an array of errors from outermost to innermost
   *
   * @param error - The error to extract the chain from
   * @returns An array of errors in the chain, from outermost to innermost
   */
  getErrorChain: (error: Error | undefined): Error[] => {
    if (!error) return []

    const chain = [error]
    let current = error

    // Traverse the cause chain
    while (current && (current as TaggedThrowable).cause) {
      const cause = (current as TaggedThrowable).cause
      if (cause) {
        chain.push(cause)
        current = cause
      } else {
        break
      }

      // Prevent infinite loops if circular references exist
      if (chain.length > 100) break
    }

    return chain
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
    const separator = options?.separator || "\n"

    return chain
      .map((err, index) => {
        if (!err) {
          return `${index > 0 ? "↳ " : ""}Unknown error`
        }

        const taskInfo = (err as TaggedThrowable).taskInfo
        const taskName = options?.includeTasks && taskInfo?.name ? `[${taskInfo.name}] ` : ""
        const message = err.message || "No message"

        let result = `${index > 0 ? "↳ " : ""}${taskName}${message}`

        // Add stack trace if requested
        if (options?.includeStackTrace && err.stack) {
          result += `\n${err.stack.split("\n").slice(1).join("\n")}`
        }

        return result
      })
      .join(separator)
  },

  /**
   * Convert a Promise-returning function to a Task-compatible function
   */
  fromPromise: <U, Args extends unknown[]>(
    promiseFn: (...args: Args) => Promise<U>,
    params?: TaskParams,
  ): ((...args: Args) => FPromise<U>) => {
    return (...args: Args) => {
      const taskParams = params || { name: "PromiseTask", description: "Task from Promise" }
      return Task(taskParams).Async<U>(
        () => promiseFn(...args),
        (error) => error,
      )
    }
  },

  /**
   * Convert a Task result to a Promise
   */
  toPromise: <U>(taskResult: TaskResult<U> | TaskException<U>): Promise<U> => {
    return new Promise((resolve, reject) => {
      if (taskResult.isRight()) {
        resolve(taskResult.value as U)
      } else {
        reject(taskResult.value)
      }
    })
  },

  /**
   * Race multiple tasks and return the result of the first one to complete
   * Optionally specify a timeout after which the race will fail
   *
   * @param tasks - Array of tasks to race (as FPromises)
   * @param timeoutMs - Optional timeout in milliseconds
   * @param params - Task parameters for the race operation
   * @returns A promise that resolves with the first task to complete or rejects if all tasks fail
   */
  race: <T>(tasks: Array<FPromise<T>>, timeoutMs?: number, params?: TaskParams): FPromise<T> => {
    const name = params?.name || "TaskRace"
    const description = params?.description || "Race between multiple tasks"
    const taskParams = { name, description }

    return Task(taskParams).Async<T>(
      async () => {
        // Create the race between all tasks
        const racePromises = [...tasks]

        // Add timeout promise if timeoutMs is specified
        let timeoutId: NodeJS.Timeout | undefined
        if (typeof timeoutMs === "number" && timeoutMs > 0) {
          // Create a timeout promise using FPromise to maintain type compatibility
          const timeoutPromise = FPromise<T>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error(`Task race timed out after ${timeoutMs}ms`))
            }, timeoutMs)
          })
          racePromises.push(timeoutPromise)
        }

        try {
          // Create a compatible race implementation for FPromise
          // We can't use Promise.race directly due to typing issues
          return await new Promise<T>((resolve, reject) => {
            // Setup promises to handle their own resolution
            racePromises.forEach((promise) => {
              // Handle promise resolution
              promise.then(
                // Success handler
                (result: T) => resolve(result),
                // Error handler
                (error: unknown) => reject(error),
              )
            })
          })
        } finally {
          // Clear timeout if it was set
          if (timeoutId) {
            clearTimeout(timeoutId)
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
   * @returns A function that returns an FPromise
   */
  fromNodeCallback: <T, Args extends unknown[]>(
    nodeFn: (...args: [...Args, (error: unknown, result: T) => void]) => void,
    params?: TaskParams,
  ): ((...args: Args) => FPromise<T>) => {
    const name = params?.name || "NodeCallbackTask"
    const description = params?.description || "Task from Node.js callback function"
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
    task: (token: CancellationToken) => Promise<T>,
    params?: TaskParams,
  ): { task: FPromise<T>; cancel: () => void } => {
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
    task: (updateProgress: (percent: number) => void, token: CancellationToken) => Promise<T>,
    onProgress: (percent: number) => void = () => {},
    params?: TaskParams,
  ): { task: FPromise<T>; cancel: () => void; currentProgress: () => number } => {
    const tokenSource = createCancellationTokenSource()
    let currentProgressValue = 0

    const updateProgress = (percent: number) => {
      currentProgressValue = Math.max(0, Math.min(100, percent))
      onProgress(currentProgressValue)
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
      currentProgress: () => currentProgressValue,
    }
  },
}

export const Task = Companion(TaskConstructor, TaskCompanion)

export type Task = ReturnType<typeof Task>
