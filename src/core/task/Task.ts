import { Companion } from "@/companion"
import { Base } from "@/core"
import { Throwable } from "@/core/throwable/Throwable"
import { Either, Left, Right } from "@/either/Either"
import { FPromise } from "@/fpromise/FPromise"

export type TaskParams = {
  name?: string
  description?: string
}

export type TaskInfo = {
  _task: TaskParams
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
     */
    Async: <U = T>(
      t: () => U | Promise<U>,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => Promise<void> | void = () => {},
    ): FPromise<U> => {
      return FPromise<U>(async (resolve, reject) => {
        try {
          // Run the main operation
          const result = await t()
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
          // Save error but don't reject yet - need to run finally first
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
            const errorResult = await e(error)
            reject(Throwable.apply(errorResult, undefined, { name, description }))
          } catch (handlerError) {
            // If error handler throws, use that error
            reject(Throwable.apply(handlerError, undefined, { name, description }))
          }
        }
      })
    },

    /**
     * Run a synchronous operation with explicit try/catch/finally semantics
     * Returns an Either for functional error handling
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
   * Convert a Promise-returning function to a Task-compatible function
   */
  fromPromise: <U, Args extends unknown[]>(
    promiseFn: (...args: Args) => Promise<U>,
    params?: TaskParams,
  ): ((...args: Args) => FPromise<U>) => {
    return (...args: Args) => {
      return Task(params).Async<U>(
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
}

export const Task = Companion(TaskConstructor, TaskCompanion)

export type Task = ReturnType<typeof Task>
