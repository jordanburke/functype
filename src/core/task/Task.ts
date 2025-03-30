import { Throwable } from "@/core/throwable/Throwable"
import { Either, Left, Right } from "@/either/Either"
import { FPromise } from "@/fpromise/FPromise"
import type { Type } from "@/functor"

import { Base } from "../base/Base"

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
 * @param error
 * @param _task
 * @param data
 * @constructor
 */
export const TaskException = <T>(error: unknown, _task?: TaskParams, data?: unknown): TaskException<T> => {
  const name = _task?.name || "TaskException"
  const description = _task?.description || "Unspecified TaskException"
  const appError = Throwable.apply(error, data)
  return {
    ...Base("TaskException", Left(appError)),
    _task: { name, description },
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
export const Task = <T = unknown>(params?: TaskParams) => {
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
            reject(Throwable.apply(finallyError))
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
            reject(Throwable.apply(finallyError))
            return
          }
          // Process the original error through error handler
          try {
            const errorResult = await e(error)
            reject(Throwable.apply(errorResult))
          } catch (handlerError) {
            // If error handler throws, use that error
            reject(Throwable.apply(handlerError))
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
        return TaskException<U>(e(error), { name, description })
      } finally {
        f()
      }
    },

    /**
     * Create a successful Task result
     */
    success: (data: T): TaskResult<T> => TaskResult<T>(data, { name, description }),

    /**
     * Create a failed Task result
     */
    fail: (error: unknown): TaskException<T> => TaskException<T>(error, { name, description }),

    /**
     * Convert a Promise-returning function to a Task-compatible function
     */
    fromPromise: <U, Args extends unknown[]>(promiseFn: (...args: Args) => Promise<U>): ((...args: Args) => FPromise<U>) => {
      return (...args: Args) => {
        return body.Async<U>(
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

  return {
    ...Base("Task", body),
    _type: "Task",
  }
}
