import { Either, Left, Right } from "../../either/Either"
import { Base } from "../base/Base"
import { Throwable } from "../error/Throwable"

export type AppException<T> = Either<Throwable, T>

/**
 * AppException factory function
 * @param error
 * @param data
 * @constructor
 */
export const AppException = <T>(error: unknown, data?: unknown): AppException<T> => {
  const appError = Throwable(error, data)
  return {
    ...Base("AppException"),
    ...Left(appError),
  }
}

export type AppResult<T> = Either<Throwable, T>

export const AppResult = <T>(data: T): AppResult<T> => {
  return {
    ...Base("AppResult"),
    ...Right(data),
  }
}

export type Task<T> = Either<Throwable, T>

export function Task<T>(f: () => T, e: (error: unknown) => unknown = (error: unknown) => error): Task<T> {
  try {
    return AppResult<T>(f())
  } catch (error) {
    return AppException<T>(e(error))
  }
}

Task.success = <T>(data: T) => AppResult<T>(data)
Task.fail = <T>(error: unknown) => AppException<T>(error)

export type AsyncTask<T> = Promise<Task<T>>

export async function AsyncTask<T>(
  f: () => T,
  e: (error: unknown) => unknown = (error: unknown) => error,
): AsyncTask<T> {
  try {
    const result = await f()
    return AppResult<T>(result)
  } catch (error) {
    const result = await e(error)
    return AppException<T>(result)
  }
}

AsyncTask.success = <T>(data: T) => AppResult<T>(data)
AsyncTask.fail = <T>(error: unknown) => AppException<T>(error)
