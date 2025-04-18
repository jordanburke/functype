import { Typeable } from "@/typeable/Typeable"

const NAME = "Throwable" as const

export type ThrowableType = Error &
  Typeable<typeof NAME> & {
    readonly data?: unknown
    readonly cause?: Error
  }

export class Throwable extends Error implements ThrowableType {
  public readonly _tag: typeof NAME = NAME
  public readonly data?: unknown
  public readonly cause?: Error

  protected constructor(
    message: string,
    options?: { data?: unknown | undefined; cause?: Error | undefined; stack?: string | undefined },
  ) {
    super(message, { cause: options?.cause })

    // Set name before we capture stack trace
    this.name = NAME

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
      name: {
        value: NAME,
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

  static apply(srcError: unknown, data?: unknown): ThrowableType {
    if (srcError instanceof Error) {
      // For Error instances, preserve the original stack trace and all properties
      const throwable = new Throwable(srcError.message, {
        data,
        cause: (srcError.cause as Error | undefined) || undefined,
        stack: srcError.stack || undefined,
      })

      // Copy all enumerable properties from the source error
      for (const key of Object.keys(srcError)) {
        if (!(key in throwable)) {
          // Use type assertion with Record instead of any
          ;(throwable as unknown as Record<string, unknown>)[key] = (srcError as unknown as Record<string, unknown>)[
            key
          ]
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
            : "An unknown error occurred"

      const throwable = new Throwable(message, { data })

      // Copy all properties from the source object
      for (const key of Object.keys(errorObj)) {
        if (!(key in throwable)) {
          // Use type assertion with Record instead of any
          ;(throwable as unknown as Record<string, unknown>)[key] = errorObj[key]
        }
      }

      return throwable
    }

    const message = typeof srcError === "string" ? srcError : "An unknown error occurred"
    return new Throwable(message, { data })
  }
}
