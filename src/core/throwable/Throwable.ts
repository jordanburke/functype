import type { Typeable } from "@/typeable/Typeable"

/**
 * The identifier name for Throwable type
 */
export const NAME = "Throwable" as const

/**
 * @internal
 */
export type ThrowableType = Error &
  Typeable<typeof NAME> & {
    readonly data?: unknown
    readonly cause?: Error
    readonly taskInfo?: { name: string; description: string }
  }

// eslint-disable-next-line functional/no-classes -- Must extend Error class
export class Throwable extends Error implements ThrowableType {
  public readonly _tag: typeof NAME = NAME
  public readonly data?: unknown
  public readonly cause?: Error
  public readonly taskInfo?: { name: string; description: string }

  protected constructor(
    message: string,
    options?: {
      data?: unknown | undefined
      cause?: Error | undefined
      stack?: string | undefined
      taskInfo?: { name: string; description: string } | undefined
    },
  ) {
    super(message, { cause: options?.cause })

    // Set name before we capture stack trace
    this.name = options?.taskInfo?.name ?? NAME

    // Set immutable properties
    Object.defineProperties(this, {
      _tag: {
        value: NAME,
        writable: false,
        configurable: false,
      },
      data: {
        value: options?.data,
        writable: false,
        configurable: false,
      },
      taskInfo: {
        value: options?.taskInfo,
        writable: false,
        configurable: false,
      },
      name: {
        value: options?.taskInfo?.name ?? NAME,
        writable: false,
        configurable: false,
      },
    })

    // Handle cause separately since it comes from Error
    if (options?.cause) {
      Object.defineProperty(this, "cause", {
        value: options.cause,
        writable: false,
        configurable: false,
      })
    }

    // Handle stack trace
    if (options?.stack) {
      // If we have a stack from an original error, use it
      this.stack = options.stack
    } else if (Error.captureStackTrace) {
      // Otherwise capture a new stack trace
      Error.captureStackTrace(this, this.constructor)
    }
  }

  static apply(srcError: unknown, data?: unknown, taskInfo?: { name: string; description: string }): ThrowableType {
    if (srcError instanceof Error) {
      // For Error instances, preserve the original stack trace and all properties
      const throwable = new Throwable(srcError.message, {
        data,
        cause: (srcError.cause as Error | undefined) ?? undefined,
        stack: srcError.stack ?? undefined,
        taskInfo,
      })

      // Copy all enumerable properties from the source error
      for (const key of Object.keys(srcError)) {
        if (!(key in throwable)) {
          // Use type assertion with Record instead of any
          const throwableRecord = throwable as unknown as Record<string, unknown>
          const srcErrorRecord = srcError as unknown as Record<string, unknown>
          throwableRecord[key] = srcErrorRecord[key]
        }
      }

      return throwable
    }

    // For non-Error objects (like Supabase error objects), preserve their structure
    if (srcError && typeof srcError === "object") {
      // Create a properly typed reference to the object
      const errorObj = srcError as Record<string, unknown>

      // Try to extract a reasonable message
      const message =
        typeof errorObj.message === "string"
          ? errorObj.message
          : typeof errorObj.error === "string"
            ? errorObj.error
            : `Object error: ${JSON.stringify(
                errorObj,
                Object.getOwnPropertyNames(errorObj).filter((key) => errorObj[key] !== undefined),
              )}`

      const throwable = new Throwable(message, { data: data ?? errorObj, taskInfo })

      // Copy all properties from the source object
      for (const key of Object.keys(errorObj)) {
        if (!(key in throwable)) {
          // Use type assertion with Record instead of any
          const throwableRecord = throwable as unknown as Record<string, unknown>
          throwableRecord[key] = errorObj[key]
        }
      }

      return throwable
    }

    // Handle functions
    if (typeof srcError === "function") {
      const fnName = srcError.name ?? "anonymous function"
      const fnString = srcError.toString().substring(0, 100) + (srcError.toString().length > 100 ? "..." : "")
      return new Throwable(`Function error: ${fnName}`, {
        data: data ?? {
          functionType: typeof srcError,
          functionName: fnName,
          functionString: fnString,
        },
        taskInfo,
      })
    }

    // Handle primitive types
    const errorType = typeof srcError
    const errorValue = srcError === null ? "null" : srcError === undefined ? "undefined" : String(srcError)

    // Handle specific primitive types more precisely
    if (errorType === "number") {
      const numValue = srcError as number
      const message = Number.isNaN(numValue)
        ? "Number error: NaN"
        : !Number.isFinite(numValue)
          ? `Number error: ${numValue > 0 ? "Infinity" : "-Infinity"}`
          : `Number error: ${numValue}`

      return new Throwable(message, {
        data: data ?? {
          errorType,
          errorValue: numValue,
          originalError: srcError,
        },
        taskInfo,
      })
    }

    if (errorType === "bigint") {
      return new Throwable(`BigInt error: ${srcError}n`, {
        data: data ?? {
          errorType,
          errorValue: String(srcError),
          originalError: srcError,
        },
        taskInfo,
      })
    }

    if (errorType === "boolean") {
      return new Throwable(`Boolean error: ${srcError}`, {
        data: data ?? {
          errorType,
          errorValue: srcError,
          originalError: srcError,
        },
        taskInfo,
      })
    }

    if (errorType === "symbol") {
      const symbolDesc = (srcError as symbol).description ?? "unnamed symbol"
      return new Throwable(`Symbol error: Symbol(${symbolDesc})`, {
        data: data ?? {
          errorType,
          symbolDescription: symbolDesc,
          originalError: srcError,
        },
        taskInfo,
      })
    }

    const message =
      typeof srcError === "string"
        ? srcError
        : `${errorType.charAt(0).toUpperCase() + errorType.slice(1)} error: ${errorValue}`

    return new Throwable(message, {
      data: data ?? {
        errorType,
        errorValue,
        originalError: srcError,
      },
      taskInfo,
    })
  }
}
