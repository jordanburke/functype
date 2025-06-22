import { Companion } from "@/companion/Companion"
import type { Type } from "@/types"

/**
 * Conditional expression that enforces exhaustive returns without early returns.
 * Similar to Scala's if/else expressions that always return a value.
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

const CondConstructor = <T extends Type>(): Cond<T> => {
  return CondObject({ resolved: false })
}

const CondCompanion = {
  /**
   * Create a conditional expression that must end with else
   * @example
   * const result = Cond.of<string>()
   *   .when(x > 10, "large")
   *   .elseWhen(x > 5, "medium")
   *   .else("small")
   */
  of: <T extends Type>(): Cond<T> => CondConstructor<T>(),

  /**
   * Pattern matching helper that ensures exhaustiveness
   * @example
   * const result = Cond.match(status)({
   *   "pending": () => "Waiting...",
   *   "success": () => "Done!",
   *   "error": () => "Failed!"
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
   * const getMessage = Cond.lazy<string>()
   *   .when(() => isError(), () => computeErrorMessage())
   *   .else(() => "Success")
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

export const Cond = Companion(CondConstructor, CondCompanion)
