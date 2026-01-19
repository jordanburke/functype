import { Throwable } from "@/core"
import { Either } from "@/either"

/**
 * Enhanced TaskException that maintains an error chain
 */
export type EnhancedTaskException<T> = Either<EnhancedThrowable, T> & { _task: { name: string; description: string } }

/**
 * Enhanced Throwable that maintains an error chain by tracking the original cause
 */
export type EnhancedThrowable = Throwable & {
  cause?: Throwable | Error | unknown
}

/**
 * Creates an enhanced Throwable that preserves the error chain
 */
export const EnhancedThrowable = (
  error: unknown,
  data?: unknown,
  taskInfo?: { name: string; description?: string },
  cause?: unknown,
): EnhancedThrowable => {
  // Ensure description is always defined
  const fullTaskInfo = taskInfo
    ? {
        name: taskInfo.name,
        description: taskInfo.description || "",
      }
    : undefined

  const throwable = Throwable.apply(error, data, fullTaskInfo) as EnhancedThrowable

  // Add the cause to maintain the error chain
  if (cause) {
    // Define cause as a property with error
    Object.defineProperty(throwable, "cause", {
      value: cause,
      writable: false,
      configurable: false,
      enumerable: true,
    })
  }

  return throwable
}

/**
 * Enhanced version of Task that properly maintains error chains
 */
export const EnhancedTask = (params?: { name?: string; description?: string }) => {
  const name = params?.name || "EnhancedTask"
  const description = params?.description || ""

  return {
    /**
     * Run an async operation with proper error chain handling
     */
    Async: <U>(
      t: () => U | Promise<U>,
      e: (error: unknown) => unknown = (error: unknown) => error,
      f: () => Promise<void> | void = () => {},
    ): Promise<U> => {
      return new Promise<U>((resolve, reject) => {
        void (async () => {
          try {
            // Run the main operation
            const result = await t()

            try {
              // Run finally before resolving
              await f()
            } catch (finallyError) {
              // Finally errors take precedence
              reject(EnhancedThrowable(finallyError, undefined, { name, description }))
              return
            }

            // Success path - resolve with the value directly
            resolve(result)
          } catch (error) {
            try {
              // Always run finally
              await f()
            } catch (finallyError) {
              // Finally errors take precedence over operation errors
              reject(EnhancedThrowable(finallyError, undefined, { name, description }))
              return
            }

            // Here's the key improvement:
            // If the error is already a Throwable (from an inner task), preserve it
            if (error instanceof Error && (error as any)._tag === "Throwable") {
              // Add outer task context while preserving inner task context
              const enhancedError = EnhancedThrowable(
                new Error(`${name}: ${(error as Error).message}`),
                undefined,
                { name, description },
                error, // Store the original error as the cause
              )
              reject(enhancedError)
            } else {
              // Process the original error through error handler
              try {
                const errorResult = await e(error)
                reject(EnhancedThrowable(errorResult, undefined, { name, description }))
              } catch (handlerError) {
                // If error handler throws, use that error
                reject(EnhancedThrowable(handlerError, undefined, { name, description }))
              }
            }
          }
        })()
      })
    },

    /**
     * Extracts the full error chain from an enhanced throwable
     */
    getErrorChain: (error: Error | EnhancedThrowable): Error[] => {
      if (!error) return []

      // Use any to avoid TypeScript issues in test code
      const chain: Error[] = [error]
      let current: any = error

      // Safely traverse the cause chain
      while (current && current.cause) {
        // Skip non-error causes
        if (current.cause instanceof Error) {
          chain.push(current.cause)
        } else {
          chain.push(new Error(String(current.cause)))
        }

        // Move to the next cause
        current = current.cause

        // Prevent infinite loops if circular references exist
        if (chain.length > 100) break
      }

      return chain
    },

    /**
     * Formats the error chain as a string with full context
     */
    formatErrorChain: (error: Error | EnhancedThrowable): string => {
      const chain = EnhancedTask().getErrorChain(error)

      return chain
        .map((err, index) => {
          // Safely extract taskInfo if it exists
          const taskInfo = (err as any).taskInfo
          const taskName = taskInfo?.name || "Unknown"

          return `${index > 0 ? "↳ " : ""}[${taskName}] ${err.message}`
        })
        .join("\n")
    },
  }
}
