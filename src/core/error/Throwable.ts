import { Typeable } from "../../typeable/Typeable"

const NAME = "Throwable" as const

export type Throwable = Error &
  Typeable<typeof NAME> & {
    readonly data?: unknown // Optional readonly data field for extra info
  }

// AppError factory function
export const Throwable = (srcError: unknown, data?: unknown): Throwable => {
  const message: string =
    srcError instanceof Error ? srcError.message : typeof srcError === "string" ? srcError : "An unknown error occurred" // Fallback message if srcError is neither Error nor string

  const stack: string | undefined = srcError instanceof Error ? srcError.stack : undefined

  // Create a new Error object
  const error = new Error(message)
  error.name = NAME

  // Return the custom error with readonly properties for message, stack, and data
  return {
    _tag: NAME, // Use const for the _tag to make it immutable
    name: error.name,
    message: error.message,
    stack: stack ?? error.stack, // Use original stack if available, otherwise fallback to new error's stack
    data, // Optional readonly data
  }
}

Throwable.NAME = NAME
