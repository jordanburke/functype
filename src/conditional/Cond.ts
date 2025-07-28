import { Companion } from "@/companion/Companion"
import type { Type } from "@/types"

/**
 * Conditional expression that enforces exhaustive returns without early returns.
 * Similar to Scala's if/else expressions that always return a value.
 *
 * @example
 * const discount = Cond.of<number>()
 *   .when(isPremiumMember, 0.2)
 *   .elseWhen(isRegularMember, 0.1)
 *   .else(0)
 *
 * @example
 * // Chaining multiple conditions
 * const status = Cond.of<string>()
 *   .when(response.status >= 500, "Server Error")
 *   .elseWhen(response.status >= 400, "Client Error")
 *   .elseWhen(response.status >= 200, "Success")
 *   .else("Unknown")
 */
export type Cond<T extends Type> = {
  /**
   * Add an if condition
   */
  when: (condition: boolean, value: T | (() => T)) => Cond<T>

  /**
   * Add an else-if condition
   */
  elseWhen: (condition: boolean, value: T | (() => T)) => Cond<T>

  /**
   * Terminal else clause - required to get the result
   */
  else: (value: T | (() => T)) => T

  /**
   * Get the result if a condition was met, throws if no condition met
   */
  getOrThrow: () => T
}

type CondState<T> = {
  resolved: boolean
  value?: T
}

/** @internal */
type LazyCondChain<T> = {
  when: (condition: () => boolean, value: () => T) => LazyCondChain<T>
  elseWhen: (condition: () => boolean, value: () => T) => LazyCondChain<T>
  else: (value: () => T) => T
}

const CondObject = <T extends Type>(state: CondState<T>): Cond<T> => {
  const getValue = (value: T | (() => T)): T => {
    return typeof value === "function" ? (value as () => T)() : value
  }

  const cond: Cond<T> = {
    when: (condition: boolean, value: T | (() => T)) => {
      if (state.resolved) return cond
      if (condition) {
        return CondObject({ resolved: true, value: getValue(value) })
      }
      return cond
    },

    elseWhen: (condition: boolean, value: T | (() => T)) => {
      if (state.resolved) return cond
      if (condition) {
        return CondObject({ resolved: true, value: getValue(value) })
      }
      return cond
    },

    else: (value: T | (() => T)) => {
      if (state.resolved) return state.value as T
      return getValue(value)
    },

    getOrThrow: () => {
      if (!state.resolved) {
        throw new Error("Conditional expression has no matching condition")
      }
      return state.value as T
    },
  }

  return cond
}

/**
 * Create a new conditional expression
 * @example
 * const message = Cond<string>()
 *   .when(isError, "Error occurred")
 *   .when(isWarning, "Warning")
 *   .else("All good")
 */
const CondConstructor = <T extends Type>(): Cond<T> => {
  return CondObject({ resolved: false })
}

const CondCompanion = {
  /**
   * Create a conditional expression that must end with else
   * @example
   * const x = 7
   * const result = Cond.of<string>()
   *   .when(x > 10, "large")
   *   .elseWhen(x > 5, "medium")
   *   .else("small")
   * // result = "medium"
   *
   * @example
   * // With lazy evaluation
   * const discount = Cond.of<number>()
   *   .when(isPremium, () => calculatePremiumDiscount())
   *   .when(isLoyal, () => calculateLoyaltyDiscount())
   *   .else(0)
   */
  of: <T extends Type>(): Cond<T> => CondConstructor<T>(),

  /**
   * Pattern matching helper that ensures exhaustiveness
   * @example
   * type Status = "pending" | "success" | "error"
   * const status: Status = "success"
   * const result = Cond.match(status)({
   *   "pending": "Waiting...",
   *   "success": "Done!",
   *   "error": "Failed!"
   * })
   * // result = "Done!"
   *
   * @example
   * // With function values
   * const action = "compute"
   * const result = Cond.match(action)({
   *   "compute": () => expensiveComputation(),
   *   "cache": () => getCachedValue(),
   *   "skip": () => defaultValue
   * })
   */
  match: <T extends string | number | symbol>(value: T) => {
    return <R extends Type>(cases: Record<T, R | (() => R)>): R => {
      const result = cases[value]
      if (result === undefined) {
        throw new Error(`No case defined for value: ${String(value)}`)
      }
      return typeof result === "function" ? (result as () => R)() : (result as R)
    }
  },

  /**
   * Create a lazy conditional that defers evaluation
   * @example
   * // Only evaluates conditions and values when needed
   * const getMessage = Cond.lazy<string>()
   *   .when(() => isError(), () => computeErrorMessage())
   *   .when(() => isWarning(), () => computeWarningMessage())
   *   .else(() => "Success")
   *
   * @example
   * // Complex conditional with expensive checks
   * const result = Cond.lazy<Action>()
   *   .when(
   *     () => user.role === "admin" && checkAdminPermissions(),
   *     () => ({ type: "admin", permissions: loadAdminPermissions() })
   *   )
   *   .when(
   *     () => user.role === "user" && user.isActive,
   *     () => ({ type: "user", permissions: loadUserPermissions() })
   *   )
   *   .else(() => ({ type: "guest", permissions: [] }))
   */
  lazy: <T extends Type>(): LazyCondChain<T> => {
    // Note: We use mutable state here for performance reasons.
    // The state is encapsulated and not exposed externally.
    const state: CondState<T> = { resolved: false }

    const lazyChain: LazyCondChain<T> = {
      when: (condition: () => boolean, value: () => T) => {
        if (state.resolved) return lazyChain
        if (condition()) {
          // eslint-disable-next-line functional/immutable-data
          state.resolved = true
          // eslint-disable-next-line functional/immutable-data
          state.value = value()
        }
        return lazyChain
      },
      elseWhen: (condition: () => boolean, value: () => T) => {
        if (state.resolved) return lazyChain
        if (condition()) {
          // eslint-disable-next-line functional/immutable-data
          state.resolved = true
          // eslint-disable-next-line functional/immutable-data
          state.value = value()
        }
        return lazyChain
      },
      else: (value: () => T): T => {
        if (state.resolved) return state.value as T
        return value()
      },
    }

    return lazyChain
  },
}

/**
 * Conditional expression builder for functional if/else chains
 * @example
 * // Basic usage
 * const size = Cond.of<string>()
 *   .when(value > 100, "large")
 *   .elseWhen(value > 50, "medium")
 *   .else("small")
 *
 * @example
 * // Pattern matching
 * const message = Cond.match(errorCode)({
 *   404: "Not Found",
 *   500: "Server Error",
 *   200: "OK"
 * })
 *
 * @example
 * // Lazy evaluation
 * const result = Cond.lazy<string>()
 *   .when(() => checkCondition1(), () => "Result 1")
 *   .when(() => checkCondition2(), () => "Result 2")
 *   .else(() => "Default")
 */
export const Cond = Companion(CondConstructor, CondCompanion)
