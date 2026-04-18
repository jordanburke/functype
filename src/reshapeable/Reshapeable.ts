import type { Either } from "@/either"
import type { List } from "@/list"
import type { Option } from "@/option"
import type { Try } from "@/try"
import type { Type } from "@/types"

/**
 * Interface for types that can be reshaped (converted) between different monadic containers.
 * Provides standard conversion methods to transform between Option, Either, List, and Try types.
 *
 * @typeParam T - The type of the value contained in the monad
 *
 * @example
 * // Convert Option to Either
 * const opt = Option(5)
 * const either = opt.toEither("None value")  // Right(5)
 *
 * @example
 * // Convert Either to Option
 * const right = Right(10)
 * const option = right.toOption()  // Some(10)
 *
 * @example
 * // Convert List to Try
 * const list = List([1, 2, 3])
 * const tryVal = list.toTry()  // Success(1) - uses first element
 *
 * @example
 * // Use with Do comprehensions
 * const result = Do(function* () {
 *   const x = yield* $(Option(5))
 *   const y = yield* $(Right<string, number>(10))
 *   return x + y
 * })
 *
 * // Convert to desired type for chaining
 * const asOption = result.toOption()
 * asOption.map(x => x * 2).orElse(0)
 */
export interface Reshapeable<T extends Type> {
  /**
   * Converts this monad to an Option.
   *
   * Conversion rules:
   * - Option: returns self
   * - Either: Right → Some, Left → None
   * - List: non-empty → Some(head), empty → None
   * - Try: Success → Some, Failure → None
   *
   * @returns An Option containing the value if present, None otherwise
   */
  toOption(): Option<T>

  /**
   * Converts this monad to an Either.
   *
   * Conversion rules:
   * - Option: Some → Right, None → Left(leftValue)
   * - Either: returns self
   * - List: non-empty → Right(head), empty → Left(leftValue)
   * - Try: Success → Right, Failure → Left(error)
   *
   * @param leftValue - The value to use for the Left case when the source is empty/none/failure
   * @returns An Either with the value as Right or the provided leftValue as Left
   */
  toEither<E extends Type>(leftValue: E): Either<E, T>

  /**
   * Converts this monad to a List.
   *
   * Conversion rules:
   * - Option: Some → List([value]), None → List([])
   * - Either: Right → List([value]), Left → List([])
   * - List: returns self
   * - Try: Success → List([value]), Failure → List([])
   *
   * @returns A List containing the value(s) if present, empty List otherwise
   */
  toList(): List<T>

  /**
   * Converts this monad to a Try.
   *
   * Conversion rules:
   * - Option: Some → Success, None → Failure(Error("None"))
   * - Either: Right → Success, Left → Failure(Error(leftValue))
   * - List: non-empty → Success(head), empty → Failure(Error("Empty list"))
   * - Try: returns self
   *
   * @returns A Try containing Success with the value or Failure with an appropriate error
   */
  toTry(): Try<T>
}

/**
 * Utility functions for working with Reshapeable types
 */
export const ReshapeableUtils = {
  /**
   * Helper to check if a value implements Reshapeable
   */
  isReshapeable: <T extends Type>(value: unknown): value is Reshapeable<T> => {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      "toOption" in value &&
      "toEither" in value &&
      "toList" in value &&
      "toTry" in value &&
      typeof (value as Record<string, unknown>).toOption === "function" &&
      typeof (value as Record<string, unknown>).toEither === "function" &&
      typeof (value as Record<string, unknown>).toList === "function" &&
      typeof (value as Record<string, unknown>).toTry === "function"
    )
  },

  /**
   * Safely reshape a value if it implements Reshapeable, otherwise return None
   */
  safeReshapeToOption: async <T extends Type>(value: unknown): Promise<Option<T>> => {
    if (ReshapeableUtils.isReshapeable<T>(value)) {
      return value.toOption()
    }
    // Dynamic import to avoid circular dependency
    const { Option } = await import("@/option")
    return Option.none()
  },
}
