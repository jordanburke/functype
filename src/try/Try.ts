import { Left, Right, Either } from "../either"

export type _Try_<T> = {
  isSuccess(): boolean

  isFailure(): boolean

  getOrElse(defaultValue: T): T

  orElse(alternative: _Try_<T>): _Try_<T>

  toEither(): Either<Error, T>
}

export class Try<T> implements _Try_<T> {
  private constructor(
    private readonly value: T | null,
    private readonly error: Error | null,
  ) {}

  static of<T>(f: () => T): _Try_<T> {
    try {
      return new Try<T>(f(), null)
    } catch (error) {
      return new Try<T>(null, error instanceof Error ? error : new Error(String(error)))
    }
  }

  isSuccess(): boolean {
    return this.error === null
  }

  isFailure(): boolean {
    return this.error !== null
  }

  getOrElse(defaultValue: T): T {
    return this.isSuccess() ? (this.value as T) : defaultValue
  }

  orElse(alternative: _Try_<T>): _Try_<T> {
    return this.isSuccess() ? this : alternative
  }

  toEither(): Either<Error, T> {
    return this.isSuccess() ? new Right<Error, T>(this.value as T) : new Left<Error, T>(this.error as Error)
  }
}
