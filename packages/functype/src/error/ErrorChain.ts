import { ArrayBuilder } from "@/internal/mutation-utils"
import { Ref } from "@/ref/Ref"

/**
 * An `Error` marked as a functype `Throwable`, with an optional cause and the name of the step that raised it.
 */
export type TaggedThrowable = Error & {
  _tag: "Throwable"
  cause?: Error
  taskInfo?: { name: string; description: string }
}

/**
 * Type guard to check if an error is a TaggedThrowable
 */
export function isTaggedThrowable(error: unknown): error is TaggedThrowable {
  return error instanceof Error && (error as { _tag?: string })._tag === "Throwable"
}

/**
 * Options for {@link formatErrorChain}
 */
export type ErrorChainFormatOptions = {
  /** Prefix each line with the step name from `taskInfo`, as `[name] ` */
  includeTasks?: boolean
  /** Separator between lines (default: newline) */
  separator?: string
  /** Append each error's stack frames */
  includeStackTrace?: boolean
}

/**
 * Extract the chain of errors linked by `cause`, from outermost to innermost.
 *
 * Stops after 100 links, so a circular `cause` can't loop forever.
 *
 * @param error - The error to extract the chain from
 * @returns An array of errors in the chain, from outermost to innermost
 *
 * @example
 * ```typescript
 * const inner = new Error("connection refused")
 * const outer = new Error("load user failed", { cause: inner })
 * getErrorChain(outer) // [outer, inner]
 * ```
 */
export const getErrorChain = (error: Error | undefined): Error[] => {
  if (!error) return []

  const chain = ArrayBuilder<Error>()
  chain.add(error)
  const current = Ref(error)

  // Traverse the cause chain
  while (current.get() && (current.get() as TaggedThrowable).cause) {
    const { cause } = current.get() as TaggedThrowable
    if (cause) {
      chain.add(cause)
      current.set(cause)
    } else {
      break
    }

    // Prevent infinite loops if circular references exist
    if (chain.size() > 100) break
  }

  return chain.build()
}

/**
 * Format an error's cause chain as a string, one error per line.
 *
 * Lines after the first start with `↳ `. With `includeTasks`, a line whose error carries
 * `taskInfo.name` (as `Throwable` does) is prefixed with `[name] `.
 *
 * @param error - The error to format
 * @param options - Formatting options
 * @returns A formatted string representation of the error chain
 *
 * @example
 * ```typescript
 * const inner = new Error("connection refused")
 * const outer = new Error("load user failed", { cause: inner })
 * formatErrorChain(outer) // "load user failed\n↳ connection refused"
 * ```
 */
export const formatErrorChain = (error: Error | undefined, options?: ErrorChainFormatOptions): string => {
  const chain = getErrorChain(error)
  const separator = options?.separator ?? "\n"

  return chain
    .map((err, index) => {
      if (!err) {
        return `${index > 0 ? "↳ " : ""}Unknown error`
      }

      const { taskInfo } = err as TaggedThrowable
      const taskName = options?.includeTasks && taskInfo?.name ? `[${taskInfo.name}] ` : ""
      const message = err.message ?? "No message"

      const result = Ref(`${index > 0 ? "↳ " : ""}${taskName}${message}`)

      // Add stack trace if requested
      if (options?.includeStackTrace && err.stack) {
        result.set(`${result.get()}\n${err.stack.split("\n").slice(1).join("\n")}`)
      }

      return result.get()
    })
    .join(separator)
}
