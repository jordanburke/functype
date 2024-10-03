import { Either, isLeft, isRight, Left, Right } from "./Either"

export type EitherT<L, R> = {
  value: Promise<Either<L, R>>
  map<U>(f: (value: R) => U): EitherT<L, U>
  flatMap<U>(f: (value: R) => EitherT<L, U>): EitherT<L, U>
  mapLeft<U>(f: (value: L) => U): EitherT<U, R>
  fold<U>(onLeft: (error: L) => U, onRight: (value: R) => U): Promise<U>
}

export function EitherT<L, R>(value: Promise<Either<L, R>>): EitherT<L, R> {
  return {
    value,

    // Map over the Right value inside the Either inside the Promise
    map<U>(f: (value: R) => U): EitherT<L, U> {
      const newValue = value.then((either) => {
        if (isRight(either)) {
          try {
            const result = f(either.value as R)
            return Right<L, U>(result)
          } catch (error) {
            return Left<L, U>(error as L)
          }
        } else {
          return Left<L, U>(either.value as L)
        }
      })
      return EitherT<L, U>(newValue)
    },

    // FlatMap over the Right value, returning a new EitherT
    flatMap<U>(f: (value: R) => EitherT<L, U>): EitherT<L, U> {
      const newValue = value.then((either) => {
        if (isRight(either)) {
          try {
            return f(either.value as R).value
          } catch (error) {
            return Promise.resolve(Left<L, U>(error as L))
          }
        } else {
          return Promise.resolve(Left<L, U>(either.value as L))
        }
      })
      return EitherT<L, U>(newValue)
    },

    // Handle the Left case, allowing you to map over the error
    mapLeft<U>(f: (value: L) => U): EitherT<U, R> {
      const newValue = value.then((either) => {
        if (isLeft(either)) {
          try {
            const result = f(either.value as L)
            return Left<U, R>(result)
          } catch (error) {
            return Left<U, R>(error as U)
          }
        } else {
          return Right<U, R>(either.value as R)
        }
      })
      return EitherT<U, R>(newValue)
    },

    fold<U>(onLeft: (error: L) => U, onRight: (value: R) => U): Promise<U> {
      return value.then((either) => {
        if (isRight(either)) {
          return onRight(either.value)
        } else {
          return onLeft(either.value as L)
        }
      }) as Promise<U>
    },
  }
}
