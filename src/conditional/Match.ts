import { Companion } from "@/companion/Companion"
import type { Type } from "@/types"

/**
 * Pattern matching construct similar to Scala's match expressions.
 * Enforces exhaustive matching and returns values.
 */
export type Match<T extends Type, R extends Type> = {
  /**
   * Add a case with a predicate
   */
  case: (predicate: (value: T) => boolean, result: R | ((value: T) => R)) => Match<T, R>

  /**
   * Add a case that matches a specific value
   */
  caseValue: (match: T, result: R | (() => R)) => Match<T, R>

  /**
   * Add a case that matches multiple values
   */
  caseValues: (matches: T[], result: R | (() => R)) => Match<T, R>

  /**
   * Default case - required to get result
   */
  default: (result: R | ((value: T) => R)) => R

  /**
   * Get result if a case matched, throws if no match
   */
  getOrThrow: () => R
}

type MatchState<T, R> = {
  value: T
  resolved: boolean
  result?: R
}

const MatchObject = <T extends Type, R extends Type>(state: MatchState<T, R>): Match<T, R> => {
  const getResult = (result: R | ((value: T) => R), value: T): R => {
    return typeof result === "function" ? (result as (value: T) => R)(value) : result
  }

  const match: Match<T, R> = {
    case: (predicate: (value: T) => boolean, result: R | ((value: T) => R)) => {
      if (state.resolved) return match
      if (predicate(state.value)) {
        return MatchObject({
          ...state,
          resolved: true,
          result: getResult(result, state.value),
        })
      }
      return match
    },

    caseValue: (matchValue: T, result: R | (() => R)) => {
      if (state.resolved) return match
      if (state.value === matchValue) {
        const res = typeof result === "function" ? (result as () => R)() : result
        return MatchObject({
          ...state,
          resolved: true,
          result: res,
        })
      }
      return match
    },

    caseValues: (matches: T[], result: R | (() => R)) => {
      if (state.resolved) return match
      if (matches.includes(state.value)) {
        const res = typeof result === "function" ? (result as () => R)() : result
        return MatchObject({
          ...state,
          resolved: true,
          result: res,
        })
      }
      return match
    },

    default: (result: R | ((value: T) => R)) => {
      if (state.resolved) return state.result as R
      return getResult(result, state.value)
    },

    getOrThrow: () => {
      if (!state.resolved) {
        throw new Error(`No matching case for value: ${String(state.value)}`)
      }
      return state.result as R
    },
  }

  return match
}

const MatchConstructor = <T extends Type, R extends Type>(value: T): Match<T, R> => {
  return MatchObject({ value, resolved: false })
}

const MatchCompanion = {
  /**
   * Create a type-safe exhaustive match for union types
   * @example
   * type Status = "pending" | "success" | "error"
   * const result = Match.exhaustive<Status, string>({
   *   pending: "Waiting...",
   *   success: "Done!",
   *   error: "Failed!"
   * })(status)
   *
   * // For function values, wrap in object to prevent execution
   * const ops = Match.exhaustive<"add" | "sub", { fn: (a: number, b: number) => number }>({
   *   add: { fn: (a, b) => a + b },
   *   sub: { fn: (a, b) => a - b }
   * })("add").fn
   */
  exhaustive: <T extends string | number | symbol, R extends Type>(cases: Record<T, R>) => {
    return (value: T): R => {
      const result = cases[value]
      if (result === undefined) {
        throw new Error(`No case defined for value: ${String(value)}`)
      }
      return result
    }
  },

  /**
   * Create a partial match that requires a default
   * @example
   * const message = Match.partial<number, string>({
   *   0: "Zero",
   *   1: "One",
   *   2: "Two"
   * }).withDefault("Many")(count)
   */
  partial: <T extends string | number | symbol, R extends Type>(cases: Partial<Record<T, R | ((value: T) => R)>>) => ({
    withDefault: (defaultValue: R | ((value: T) => R)) => {
      return (value: T): R => {
        const result = cases[value]
        if (result !== undefined) {
          return typeof result === "function" ? (result as (value: T) => R)(value) : (result as R)
        }
        return typeof defaultValue === "function" ? (defaultValue as (value: T) => R)(value) : (defaultValue as R)
      }
    },
  }),

  /**
   * Pattern match with guards
   * @example
   * const grade = Match.withGuards<number, string>([
   *   [n => n >= 90, "A"],
   *   [n => n >= 80, "B"],
   *   [n => n >= 70, "C"],
   *   [n => n >= 60, "D"]
   * ]).withDefault("F")(score)
   */
  withGuards: <T extends Type, R extends Type>(guards: Array<[(value: T) => boolean, R | ((value: T) => R)]>) => ({
    withDefault: (defaultValue: R | ((value: T) => R)) => {
      return (value: T): R => {
        for (const [guard, result] of guards) {
          if (guard(value)) {
            return typeof result === "function" ? (result as (value: T) => R)(value) : result
          }
        }
        return typeof defaultValue === "function" ? (defaultValue as (value: T) => R)(value) : defaultValue
      }
    },
  }),
}

export const Match = Companion(MatchConstructor, MatchCompanion)
