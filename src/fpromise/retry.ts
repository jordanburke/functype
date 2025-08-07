import { Counter } from "@/internal/mutation-utils"

import { FPromise } from "./FPromise"

/**
 * A utility function to retry an operation multiple times until it succeeds.
 * This function will attempt the operation and retry it up to maxRetries times if it fails.
 * Unlike retryWithBackoff, this function retries immediately without any delay between attempts.
 *
 * @template T - The type of the value that the operation produces
 * @template E - The type of the error that the operation may produce
 * @param operation - A function that returns an FPromise
 * @param maxRetries - Maximum number of retry attempts
 * @returns An FPromise that will be resolved when the operation succeeds or rejected after all retries fail
 *
 * @example
 * const unreliableOperation = () => {
 *   if (Math.random() < 0.7) {
 *     return FPromise.reject(new Error("Operation failed"));
 *   }
 *   return FPromise.resolve("Success!");
 * };
 *
 * retry(unreliableOperation, 3)
 *   .toPromise()
 *   .then(result => console.log(result))
 *   .catch(error => console.error("All attempts failed:", error));
 */
export const retry = <T, E = unknown>(operation: () => FPromise<T, E>, maxRetries: number): FPromise<T, E> => {
  return FPromise<T, E>((resolve, reject) => {
    const attempts = Counter(0)

    const attemptOperation = () => {
      operation()
        .toPromise()
        .then(resolve)
        .catch((error: E) => {
          const currentAttempt = attempts.increment()
          if (currentAttempt <= maxRetries) {
            // Retry the operation
            attemptOperation()
          } else {
            // All retries failed
            reject(error)
          }
        })
    }

    // Start the first attempt
    attemptOperation()
  })
}

/**
 * A version of retry that uses exponential backoff between retry attempts.
 * This is useful for operations that may fail due to rate limiting or temporary network issues.
 * The delay between retries increases exponentially: baseDelay * 2^attempt.
 *
 * @template T - The type of the value that the operation produces
 * @template E - The type of the error that the operation may produce
 * @param operation - A function that returns an FPromise
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds (default: 100ms)
 * @param shouldRetry - Optional function to determine if a retry should be attempted based on the error
 * @returns An FPromise that will be resolved when the operation succeeds or rejected after all retries fail
 *
 * @example
 * const fetchData = () => {
 *   return FPromise.from(fetch('https://api.example.com/data'))
 *     .flatMap(response => {
 *       if (!response.ok) {
 *         return FPromise.reject(new Error(`HTTP error: ${response.status}`));
 *       }
 *       return FPromise.from(response.json());
 *     });
 * };
 *
 * retryWithBackoff(fetchData, 3, 200, (error) => {
 *   // Only retry on network errors or 429 (Too Many Requests)
 *   return error.name === 'NetworkError' ||
 *          (error.message && error.message.includes('HTTP error: 429'));
 * })
 *   .toPromise()
 *   .then(data => console.log("Data:", data))
 *   .catch(error => console.error("Failed to fetch data:", error));
 */
export const retryWithBackoff = <T, E = unknown>(
  operation: () => FPromise<T, E>,
  maxRetries: number,
  baseDelay: number = 100,
  shouldRetry: (error: E, attempt: number) => boolean = () => true,
): FPromise<T, E> => {
  return FPromise<T, E>((resolve, reject) => {
    const attempts = Counter(0)

    const attemptOperation = () => {
      operation()
        .toPromise()
        .then(resolve)
        .catch((error: E) => {
          const currentAttempt = attempts.increment()
          if (currentAttempt <= maxRetries && shouldRetry(error, currentAttempt)) {
            // Calculate backoff delay
            const delay = baseDelay * Math.pow(2, currentAttempt - 1)

            // Retry after delay
            setTimeout(attemptOperation, delay)
          } else {
            // All retries failed or shouldRetry returned false
            reject(error)
          }
        })
    }

    // Start the first attempt
    attemptOperation()
  })
}

/**
 * A highly configurable version of retry that allows for custom delay calculation,
 * conditional retries, and retry event callbacks.
 *
 * @template T - The type of the value that the operation produces
 * @template E - The type of the error that the operation may produce
 * @param operation - A function that returns an FPromise
 * @param options - Configuration options for the retry
 * @param options.maxRetries - Maximum number of retry attempts
 * @param options.delayFn - Optional function to calculate delay between retries (default: no delay)
 * @param options.shouldRetry - Optional function to determine if a retry should be attempted (default: always retry)
 * @param options.onRetry - Optional callback that is called before each retry attempt
 * @returns An FPromise that will be resolved when the operation succeeds or rejected after all retries fail
 *
 * @example
 * const fetchWithAuth = () => {
 *   return FPromise.from(fetch('https://api.example.com/protected', {
 *     headers: { 'Authorization': `Bearer ${getToken()}` }
 *   }))
 *   .flatMap(response => {
 *     if (response.status === 401) {
 *       return FPromise.reject(new AuthError("Unauthorized"));
 *     }
 *     return FPromise.from(response.json());
 *   });
 * };
 *
 * retryWithOptions(fetchWithAuth, {
 *   maxRetries: 2,
 *   delayFn: (attempt) => 500 * attempt, // Linear backoff: 500ms, 1000ms
 *   shouldRetry: (error) => error instanceof AuthError,
 *   onRetry: (error, attempt) => {
 *     console.log(`Retry attempt ${attempt} after auth error, refreshing token...`);
 *     refreshAuthToken();
 *   }
 * })
 *   .toPromise()
 *   .then(data => console.log("Data:", data))
 *   .catch(error => console.error("Failed after retries:", error));
 */
export const retryWithOptions = <T, E = unknown>(
  operation: () => FPromise<T, E>,
  options: {
    maxRetries: number
    delayFn?: (attempt: number) => number
    shouldRetry?: (error: E, attempt: number) => boolean
    onRetry?: (error: E, attempt: number) => void
  },
): FPromise<T, E> => {
  const { maxRetries, delayFn = () => 0, shouldRetry = () => true, onRetry = () => {} } = options

  return FPromise<T, E>((resolve, reject) => {
    const attempts = Counter(0)

    const attemptOperation = () => {
      operation()
        .toPromise()
        .then(resolve)
        .catch((error: E) => {
          const currentAttempt = attempts.increment()
          if (currentAttempt <= maxRetries && shouldRetry(error, currentAttempt)) {
            try {
              // Call the onRetry callback
              onRetry(error, currentAttempt)
            } catch (callbackError) {
              // Ignore errors in the callback
            }

            // Calculate delay using the provided function
            const delay = delayFn(currentAttempt)

            // Retry after delay
            setTimeout(attemptOperation, delay)
          } else {
            // All retries failed or shouldRetry returned false
            reject(error)
          }
        })
    }

    // Start the first attempt
    attemptOperation()
  })
}
