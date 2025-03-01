import { Throwable } from "@/core/throwable/Throwable"
import { Either, Left, Right } from "@/either/Either"

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
 * AppException factory function
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
    ///..Right(data),
  }
}

export type Task<T> = Either<Throwable, T>
export type Async<T> = Promise<Task<T>>

export const Task = <T = unknown>(params?: TaskParams) => {
  const name = params?.name || "Task"
  const description = params?.description || ""
  const body = {
    Async: async <U = T>(
      t: () => U,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => Promise<void> | void = async () => {},
    ): Async<U> => {
      try {
        const result = await t()
        return TaskResult<U>(result, { name, description })
      } catch (error) {
        const errorResult = await e(error)
        return TaskException<U>(errorResult, { name, description })
      } finally {
        await f()
      }
    },
    Sync: <U = T>(
      t: () => U,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => void = () => {},
    ): Task<U> => {
      try {
        return TaskResult<U>(t(), { name, description })
      } catch (error) {
        return TaskException<U>(e(error), { name, description })
      } finally {
        f()
      }
    },
    success: (data: T) => TaskResult<T>(data, { name, description }),
    fail: (error: unknown) => TaskException<T>(error, { name, description }),
  }
  return Base("Task", body)
}
