import { FPromise } from "./FPromise"

/**
 * A utility function to retry an operation multiple times until it succeeds
 *
 * @param operation A function that returns an FPromise
 * @param maxRetries Maximum number of retry attempts
 * @param currentAttempt Current attempt number (used internally)
 * @returns An FPromise that will be resolved when the operation succeeds or rejected after all retries fail
 */
export const retry = <T>(operation: () => FPromise<T>, maxRetries: number, currentAttempt: number = 0): FPromise<T> => {
  return FPromise<T>((resolve, reject) => {
    operation()
      .toPromise()
      .then(resolve)
      .catch((error) => {
        if (currentAttempt < maxRetries) {
          // Retry the operation
          retry(operation, maxRetries, currentAttempt + 1)
            .toPromise()
            .then(resolve)
            .catch(reject)
        } else {
          // All retries failed
          reject(error)
        }
      })
  })
}

/**
 * A version of retry that uses exponential backoff
 *
 * @param operation A function that returns an FPromise
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds
 * @param currentAttempt Current attempt number (used internally)
 * @returns An FPromise that will be resolved when the operation succeeds or rejected after all retries fail
 */
export const retryWithBackoff = <T>(
  operation: () => FPromise<T>,
  maxRetries: number,
  baseDelay: number = 100,
  currentAttempt: number = 0,
): FPromise<T> => {
  return FPromise<T>((resolve, reject) => {
    operation()
      .toPromise()
      .then(resolve)
      .catch((error) => {
        if (currentAttempt < maxRetries) {
          // Calculate backoff delay
          const delay = baseDelay * Math.pow(2, currentAttempt)

          // Retry after delay
          setTimeout(() => {
            retryWithBackoff(operation, maxRetries, baseDelay, currentAttempt + 1)
              .toPromise()
              .then(resolve)
              .catch(reject)
          }, delay)
        } else {
          // All retries failed
          reject(error)
        }
      })
  })
}
