import { Either, isLeft, isRight, Left, Right } from "./Either"

export function EitherT<L, R>(value: Promise<Either<L, R>>) {
  return {
    value,

    // Map over the Right value inside the Either inside the Promise
    map<U>(f: (value: R) => U): ReturnType<typeof EitherT<L, U>> {
      const newValue = value.then((either) => {
        if (isRight(either)) {
          return Right<L, U>(f(either.value as R))
        } else {
          return Left<L, U>(either.value as L)
        }
      })
      return EitherT<L, U>(newValue)
    },

    // FlatMap over the Right value, returning a new EitherT
    flatMap<U>(f: (value: R) => ReturnType<typeof EitherT<L, U>>): ReturnType<typeof EitherT<L, U>> {
      const newValue = value.then((either) => {
        if (isRight(either)) {
          return f(either.value as R).value
        } else {
          return Promise.resolve(Left<L, U>(either.value as L))
        }
      })
      return EitherT<L, U>(newValue)
    },

    // Handle the Left case, allowing you to map over the error
    mapLeft<U>(f: (value: L) => U): ReturnType<typeof EitherT<U, R>> {
      const newValue = value.then((either) => {
        if (isLeft(either)) {
          return Left<U, R>(f(either.value as L))
        } else {
          return Right<U, R>(either.value as R)
        }
      })
      return EitherT<U, R>(newValue)
    },

    fold<U>(onLeft: (error: L) => U, onRight: (value: R) => U): ReturnType<typeof EitherT<U, R>> {
      return value.then((either) => {
        if (isRight(either)) {
          return onRight(either.value)
        } else {
          return onLeft(either.value as L)
        }
      })
    },
  }
}
