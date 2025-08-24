import { DO_PROTOCOL, type DoResult, EmptyListError, FailureError, LeftError, NoneError } from "@/do"
import { Typeable } from "@/typeable/Typeable"

/**
 * Base Object from which most other objects inherit
 * Now includes automatic Do-notation support via DO_PROTOCOL
 * @param type - The type name for the object
 * @param body - The implementation body
 */
export function Base<T extends Record<string, unknown>>(type: string, body: T) {
  return {
    ...Typeable({ _tag: type, impl: body }),
    toString() {
      return `${type}()`
    },
    // Add Do-notation protocol support
    [DO_PROTOCOL](): DoResult<unknown> {
      // Check for Option pattern
      if ("isSome" in body && "isNone" in body) {
        if (typeof body.isSome === "function" && body.isSome()) {
          // It's Some - unwrap the value
          if ("get" in body && typeof body.get === "function") {
            return { ok: true, value: body.get() }
          }
        }
        if (typeof body.isNone === "function" && body.isNone()) {
          // It's None - return error
          return { ok: false, error: NoneError(), recoverable: true }
        }
      }

      // Check for Either pattern
      if ("isLeft" in body && "isRight" in body) {
        if (typeof body.isRight === "function" && body.isRight()) {
          // It's Right - unwrap the value
          if ("value" in body) {
            return { ok: true, value: body.value }
          }
        }
        if (typeof body.isLeft === "function" && body.isLeft()) {
          // It's Left - return the left value as error
          if ("value" in body) {
            return { ok: false, error: LeftError(body.value), recoverable: true }
          }
        }
      }

      // Check for Try pattern
      if ("isSuccess" in body && "isFailure" in body) {
        if (typeof body.isSuccess === "function" && body.isSuccess()) {
          // It's Success - unwrap the value
          if ("get" in body && typeof body.get === "function") {
            return { ok: true, value: body.get() }
          }
        }
        if (typeof body.isFailure === "function" && body.isFailure()) {
          // It's Failure - return the error
          if ("getError" in body && typeof body.getError === "function") {
            return { ok: false, error: FailureError(body.getError()), recoverable: false }
          }
        }
      }

      // Check for List pattern
      if ("isEmpty" in body && "head" in body) {
        if (typeof body.isEmpty === "function" && body.isEmpty()) {
          // Empty list - return error
          return { ok: false, error: EmptyListError(), recoverable: true }
        }
        if (typeof body.head === "function") {
          // Non-empty list - return first element
          return { ok: true, value: body.head() }
        }
        // If head is a property, not a function
        if ("head" in body) {
          return { ok: true, value: body.head }
        }
      }

      // Default: pass through the value itself
      // This allows regular values to be yielded in Do-comprehensions
      return { ok: true, value: body }
    },
  }
}
