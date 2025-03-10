import { Companion } from "@/core/companion/Companion"
import type { Type } from "@/functor"
import { Typeable } from "@/typeable/Typeable"

export type FPromise<T extends Type> = PromiseLike<T> & {
  map: <U>(f: (value: T) => U) => FPromise<U>
  flatMap: <U extends Type>(f: (value: T) => PromiseLike<U>) => FPromise<U>
  flatMapAsync: <U extends Type>(f: (value: T) => PromiseLike<U>) => Promise<FPromise<U>>
  tap: (f: (value: T) => void) => FPromise<T>
  mapError: <E>(f: (error: unknown) => E) => FPromise<T>
  tapError: (f: (error: unknown) => void) => FPromise<T>
  toPromise: () => Promise<T>
} & Typeable<"FPromise">

/**
 * Creates an FPromise from an executor function
 */
const FPromiseImpl = <T extends Type>(
  executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void,
): FPromise<T> => {
  const promise = new Promise<T>(executor)

  const fPromise: FPromise<T> = {
    _tag: "FPromise",

    map: <U extends Type>(f: (value: T) => U): FPromise<U> => {
      return FPromiseImpl<U>((resolve, reject) => {
        promise
          .then((value) => {
            try {
              resolve(f(value))
            } catch (error) {
              reject(error)
            }
          })
          .catch(reject)
      })
    },

    flatMap: <U extends Type>(f: (value: T) => PromiseLike<U>): FPromise<U> => {
      return FPromiseImpl<U>((resolve, reject) => {
        promise
          .then((value) => {
            try {
              const result = f(value)
              if (result instanceof Promise) {
                result.then(resolve).catch(reject)
              } else {
                // Handle PromiseLike objects that may not have catch
                result.then(resolve, reject)
              }
            } catch (error) {
              reject(error)
            }
          })
          .catch(reject)
      })
    },

    // Fixed flatMapAsync to return Promise<FPromise<U>> instead of FPromise<FPromise<U>>
    flatMapAsync: <U extends Type>(f: (value: T) => PromiseLike<U>): Promise<FPromise<U>> => {
      return promise.then(
        (value) => {
          try {
            const innerPromise = f(value)
            if (innerPromise instanceof Promise) {
              return innerPromise.then(
                (result) => FPromise.resolve(result),
                (error) => FPromise.reject<U>(error),
              )
            } else {
              return new Promise<FPromise<U>>((resolve, reject) => {
                innerPromise.then(
                  (result) => resolve(FPromise.resolve(result)),
                  (error) => resolve(FPromise.reject<U>(error)),
                )
              })
            }
          } catch (error) {
            return Promise.resolve(FPromise.reject<U>(error))
          }
        },
        (error) => Promise.resolve(FPromise.reject<U>(error)),
      )
    },

    tap: (f: (value: T) => void): FPromise<T> => {
      return FPromiseImpl<T>((resolve, reject) => {
        promise
          .then((value) => {
            try {
              f(value)
              resolve(value)
            } catch (error) {
              reject(error)
            }
          })
          .catch(reject)
      })
    },

    mapError: <E>(f: (error: unknown) => E): FPromise<T> => {
      return FPromiseImpl<T>((resolve, reject) => {
        promise.then(resolve).catch((error: unknown) => {
          try {
            reject(f(error))
          } catch (mappingError) {
            reject(mappingError)
          }
        })
      })
    },

    tapError: (f: (error: unknown) => void): FPromise<T> => {
      return FPromiseImpl<T>((resolve, reject) => {
        promise.then(resolve).catch((error: unknown) => {
          try {
            f(error)
            reject(error)
          } catch (sideEffectError) {
            reject(sideEffectError)
          }
        })
      })
    },

    then: <TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> => {
      return promise.then(onfulfilled, onrejected)
    },

    toPromise: (): Promise<T> => {
      return promise
    },
  }

  return fPromise
}

// Add static utility methods using the Companion pattern
export const FPromiseCompanion = {
  /**
   * Creates an FPromise from a value
   */
  resolve: <T>(value: T | PromiseLike<T>): FPromise<T> => {
    return FPromiseImpl<T>((resolve) => resolve(value))
  },

  /**
   * Creates a rejected FPromise
   */
  reject: <T>(reason?: unknown): FPromise<T> => {
    return FPromiseImpl<T>((_, reject) => reject(reason))
  },

  /**
   * Creates an FPromise from a regular Promise
   */
  from: <T>(promise: Promise<T>): FPromise<T> => {
    return FPromiseImpl<T>((resolve, reject) => {
      promise.then(resolve).catch(reject)
    })
  },

  /**
   * Runs multiple FPromises in parallel and returns an array of results
   */
  all: <T>(promises: Array<FPromise<T> | PromiseLike<T> | T>): FPromise<T[]> => {
    return FPromiseImpl<T[]>((resolve, reject) => {
      Promise.all(promises.map((p) => (p instanceof Promise ? p : Promise.resolve(p))))
        .then(resolve)
        .catch(reject)
    })
  },
}

export const FPromise = Companion(FPromiseImpl, FPromiseCompanion)

const promise = FPromise.resolve(42)
const fpromise = promise.flatMapAsync((x) => FPromise.resolve(x.toString()))
