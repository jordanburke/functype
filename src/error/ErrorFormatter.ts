import { Task } from "@/core"
import { Throwable } from "@/core/throwable/Throwable"

/**
 * Type definition for task information that may be attached to errors
 */
export type TaskErrorInfo = {
  name?: string
  description?: string
  [key: string]: unknown
}

/**
 * Type definition for an error with potential task information
 */
export type ErrorWithTaskInfo = Error & {
  taskInfo?: TaskErrorInfo
  data?: unknown
}

/**
 * Type definition for a structured error chain element
 */
export type ErrorChainElement = {
  message?: string
  name?: string
  taskInfo?: TaskErrorInfo
  stack?: string
  [key: string]: unknown
}

/**
 * Options for formatting error chains
 */
export type ErrorFormatterOptions = {
  /** Include task names in the formatted output */
  includeTasks?: boolean
  /** Include stack traces in the formatted output */
  includeStackTrace?: boolean
  /** Separator between error lines (default: newline) */
  separator?: string
  /** Include detailed error data in the output */
  includeData?: boolean
  /** Maximum number of stack frames to include if stack trace is enabled */
  maxStackFrames?: number
  /** Title to display at the start of the formatted error */
  title?: string
  /** Format the output with colors for console display */
  colors?: boolean
}

/**
 * Default options for error formatting
 */
const defaultOptions: ErrorFormatterOptions = {
  includeTasks: true,
  includeStackTrace: false,
  separator: "\n",
  includeData: false,
  maxStackFrames: 3,
  title: "Error",
  colors: false,
}

/**
 * Safely stringify data including BigInt values and circular references
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet()
  return JSON.stringify(
    obj,
    (key, value) => {
      // Handle BigInt
      if (typeof value === "bigint") {
        return `${value.toString()}n`
      }

      // Handle circular references
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular Reference]"
        }
        seen.add(value)
      }

      // Format stack traces for better readability
      if (key === "stack" && typeof value === "string") {
        return formatStackTrace(value)
      }

      return value
    },
    2,
  )
}

/**
 * Format a stack trace string for better readability
 */
export function formatStackTrace(stack: string | undefined): string {
  if (!stack) return ""
  if (!stack) return stack

  // Split the stack trace into lines
  const lines = stack.split("\n")

  // Process the error message (first line)
  const errorMessage = lines[0]

  // Process the stack frames (remaining lines)
  const stackFrames = lines.slice(1).map((line) => line.trim())

  // Return the formatted stack trace
  return [errorMessage, ...stackFrames].join("\n")
}

/**
 * Create a formatted string representation of an error for better logging and display
 *
 * @example
 * ```typescript
 * const error = new Error("Something went wrong");
 * console.error(formatError(error, { colors: true, includeData: true }));
 * ```
 */
export function formatError(error: unknown, options?: ErrorFormatterOptions): string {
  // Merge with default options
  const opts = { ...defaultOptions, ...options }

  // If it's not an Error object, wrap it with Throwable
  const throwableError = error instanceof Error ? error : Throwable.apply(error)

  // Try to get the error chain if possible
  const errorChain = Task?.getErrorChain ? Task.getErrorChain(throwableError as Error) : [throwableError]

  // Format the title
  const title = opts.colors
    ? `\x1b[31m${opts.title}:\x1b[0m ${throwableError.message}`
    : `${opts.title}: ${throwableError.message}`

  // Format the error chain
  const chainFormatted = errorChain
    .map((err, index) => {
      // Add indentation for nesting level
      const indentation = "  ".repeat(index)
      const prefix = index > 0 ? "↳ " : ""

      // Get task information if available
      const { taskInfo } = err as ErrorWithTaskInfo
      const taskName =
        opts.includeTasks && taskInfo?.name
          ? opts.colors
            ? `\x1b[36m[${taskInfo.name}]\x1b[0m `
            : `[${taskInfo.name}] `
          : ""

      // Main error line
      let errorLine = `${indentation}${prefix}${taskName}${err.message}`

      // Add stack trace if requested
      if (opts.includeStackTrace && err.stack) {
        // Format the stack trace
        const formattedStackTrace = formatStackTrace(err.stack)
        const stackLines = formattedStackTrace.split("\n").slice(1) // Skip the first line (error message)
        const maxFrames = opts.maxStackFrames ?? defaultOptions.maxStackFrames ?? 3
        const limitedStack = stackLines.slice(0, maxFrames)

        // Format the stack frames with indentation
        const formattedStack = limitedStack
          .map((line) => {
            return `${indentation}  ${opts.colors ? "\x1b[90m" : ""}${line}${opts.colors ? "\x1b[0m" : ""}`
          })
          .join("\n")

        // Add stack trace with a spacer
        errorLine += `\n${formattedStack}`

        // Add indicator if stack was truncated
        if (stackLines.length > maxFrames) {
          errorLine += `\n${indentation}  ${opts.colors ? "\x1b[90m" : ""}...${stackLines.length - maxFrames} more stack frames${opts.colors ? "\x1b[0m" : ""}`
        }
      }

      return errorLine
    })
    .join(opts.separator)

  // Build the complete output
  let output = `${title}\n\n${chainFormatted}`

  // Add error data if requested and available
  if (opts.includeData) {
    const { data } = throwableError as ErrorWithTaskInfo
    if (data) {
      const dataFormatted = opts.colors
        ? `\n\n\x1b[33mContext:\x1b[0m\n${safeStringify(data)}`
        : `\n\nContext:\n${safeStringify(data)}`

      output += dataFormatted
    }
  }

  return output
}

/**
 * Create a serializer function for Pino or other JSON loggers
 * to better represent errors with their full context
 */
export function createErrorSerializer() {
  return function errorSerializer(err: unknown) {
    if (!err) return err

    // Ensure we're working with an Error object
    const error = err instanceof Error ? err : new Error(String(err))

    // Basic error properties
    const serialized: Record<string, unknown> = {
      message: error.message,
      name: error.name || "Error",
      stack: error.stack ? formatStackTrace(error.stack) : undefined,
    }

    // Add taskInfo if available
    if ((error as ErrorWithTaskInfo).taskInfo) {
      serialized.taskInfo = (error as ErrorWithTaskInfo).taskInfo
    }

    // Add custom error data if available
    if ((error as ErrorWithTaskInfo).data) {
      serialized.data = (error as ErrorWithTaskInfo).data
    }

    // Add Error Chain if the error came from a Task
    if (typeof Task?.getErrorChain === "function") {
      try {
        const errorChain = Task.getErrorChain(error)
        if (errorChain.length > 1) {
          serialized.errorChain = Task.formatErrorChain(error, { includeTasks: true })

          // Also include structured error chain for processing
          serialized.structuredErrorChain = errorChain.map((e) => ({
            message: e.message,
            name: e.name,
            taskInfo: (e as ErrorWithTaskInfo).taskInfo,
            // Format stack trace for each error in the chain
            stack: (e as Error).stack ? formatStackTrace((e as Error).stack) : undefined,
          }))
        }
      } catch (e) {
        // If error chain extraction fails, ignore it
      }
    }

    // Copy all enumerable properties from the error object
    // Safely copy own properties from the error object
    Object.getOwnPropertyNames(error).forEach((key) => {
      if (!serialized[key]) {
        // First cast to unknown, then to Record to satisfy TypeScript
        const value = (error as unknown as Record<string, unknown>)[key]
        serialized[key] = value
      }
    })

    return serialized
  }
}
