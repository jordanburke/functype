import { Either, Left, Right } from "@/either/Either"

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
    ...Base("AppException", Left(appError)),
  }
}

export type AppResult<T> = Either<Throwable, T>

export const AppResult = <T>(data: T): AppResult<T> => {
  return {
    ...Base("AppResult", Right(data)),
    ///..Right(data),
  }
}

export type Task<T> = Either<Throwable, T>

export function Task<T>(
  t: () => T,
  e: (error: unknown) => unknown = (error: unknown) => error,
  f: () => void = () => {},
): Task<T> {
  try {
    return AppResult<T>(t())
  } catch (error) {
    return AppException<T>(e(error))
  } finally {
    f()
  }
}

Task.success = <T>(data: T) => AppResult<T>(data)
Task.fail = <T>(error: unknown) => AppException<T>(error)

export type AsyncTask<T> = Promise<Task<T>>

export async function AsyncTask<T>(
  t: () => T,
  e: (error: unknown) => unknown = (error: unknown) => error,
  f: () => Promise<void> | void = async () => {},
): AsyncTask<T> {
  try {
    const result = await t()
    return AppResult<T>(result)
  } catch (error) {
    const errorResult = await e(error)
    return AppException<T>(errorResult)
  } finally {
    await f()
  }
}

AsyncTask.success = <T>(data: T): AppResult<T> => AppResult<T>(data)
AsyncTask.fail = <T>(error: unknown): AppException<T> => AppException<T>(error)
