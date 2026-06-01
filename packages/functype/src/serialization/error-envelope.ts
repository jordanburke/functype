/**
 * Canonical projection of `Error` to JSON, shared by every Serializable type
 * that carries an `Error` in its failure branch (`Try.Failure`, `Task.Err`,
 * `Lazy` with a thrown thunk).
 *
 * Round-trip guarantees:
 *  - `err.name` survives (preserves discriminator: `e.name === "TypeError"` works)
 *  - `err.message` survives
 *  - `err.stack` survives if present at serialize time
 *  - `err.cause` survives recursively (arbitrary nesting depth)
 *
 * What does NOT survive:
 *  - `instanceof TypeError` and other subclass identity checks (JSON cannot
 *    reconstruct user-defined classes without arbitrary code execution).
 *  - Custom Error-subclass fields (e.g. `HttpError.status`). The generic
 *    projection doesn't know about them; a future registry mechanism may
 *    address this.
 *
 * Use `e.name` for discriminator checks across the serialization boundary,
 * not `e instanceof SomeError`.
 */

import { safeStringify } from "@/internal/stringify"

export type SerializedError = {
  readonly name: string
  readonly message: string
  readonly stack?: string
  readonly cause?: SerializedError | string
}

const serializeCause = (cause: unknown): SerializedError | string => {
  if (cause instanceof Error) {
    return serializeError(cause)
  }
  if (typeof cause === "string") {
    return cause
  }
  return safeStringify(cause) ?? "<unserializable cause>"
}

/**
 * Project an arbitrary thrown value to the canonical SerializedError shape.
 * Accepts both `Error` instances and non-Error throwables (strings, plain
 * objects, etc.). Non-Error throwables get `name: "NonErrorThrowable"` and
 * the best textual representation we can produce.
 */
export const serializeError = (err: unknown): SerializedError => {
  if (err instanceof Error) {
    const envelope: { -readonly [K in keyof SerializedError]: SerializedError[K] } = {
      name: err.name,
      message: err.message,
    }
    if (err.stack !== undefined) {
      envelope.stack = err.stack
    }
    // `Error.cause` was added in ES2022; runtime presence is the test.
    const { cause } = err as Error & { cause?: unknown }
    if (cause !== undefined) {
      envelope.cause = serializeCause(cause)
    }
    return envelope
  }
  return {
    name: "NonErrorThrowable",
    message: typeof err === "string" ? err : (safeStringify(err) ?? "<unserializable>"),
  }
}

/**
 * Reconstruct an Error from a SerializedError. The reconstructed Error has
 * the same `name`, `message`, `stack`, and `cause` chain as the original,
 * but its prototype is always `Error.prototype` — subclass identity does
 * not round-trip.
 *
 * A `string` is accepted as a shorthand for `{name: "Error", message: <string>}`,
 * matching what `serializeCause` emits when a `cause` was a bare string.
 */
export const deserializeError = (s: SerializedError | string): Error => {
  if (typeof s === "string") {
    return new Error(s)
  }
  const e = new Error(s.message)
  if (s.name) {
    e.name = s.name
  }
  if (s.stack !== undefined) {
    e.stack = s.stack
  }
  if (s.cause !== undefined) {
    const target = e as Error & { cause?: unknown }
    target.cause = deserializeError(s.cause)
  }
  return e
}
