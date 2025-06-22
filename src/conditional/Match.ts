import { Companion } from "@/companion/Companion"
import type { Type } from "@/types"

/**
 * Pattern matching construct similar to Scala's match expressions.
 * Enforces exhaustive matching and returns values.
 *
 * @example
 * const result = Match(value)
 *   .case(x => x > 100, "large")
 *   .case(x => x > 50, "medium")
 *   .default("small")
 *
 * @example
 * // Matching exact values
 * const message = Match(status)
 *   .caseValue("pending", "Please wait...")
 *   .caseValue("success", "Completed!")
 *   .caseValue("error", "Failed")
 *   .default("Unknown")
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

/**
 * Create a new pattern match expression
 * @example
 * const result = Match(httpStatus)
 *   .case(s => s >= 200 && s < 300, "Success")
 *   .case(s => s >= 400 && s < 500, "Client Error")
 *   .case(s => s >= 500, "Server Error")
 *   .default("Unknown")
 */
const MatchConstructor = <T extends Type, R extends Type>(value: T): Match<T, R> => {
  return MatchObject({ value, resolved: false })
}

const MatchCompanion = {
  /**
   * Create a type-safe exhaustive match for union types
   * @example
   * type Status = "pending" | "success" | "error"
   * const status: Status = "success"
   * const result = Match.exhaustive<Status, string>({
   *   pending: "Waiting...",
   *   success: "Done!",
   *   error: "Failed!"
   * })(status)
   * // result = "Done!"
   *
   * @example
   * // For function values, wrap in object to prevent execution
   * type Operation = "add" | "subtract" | "multiply"
   * const ops = Match.exhaustive<Operation, { fn: (a: number, b: number) => number }>({
   *   add: { fn: (a, b) => a + b },
   *   subtract: { fn: (a, b) => a - b },
   *   multiply: { fn: (a, b) => a * b }
   * })
   * const compute = ops("multiply").fn
   * const result = compute(4, 5) // 20
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
   * const httpCode = 404
   * const message = Match.partial<number, string>({
   *   200: "OK",
   *   201: "Created",
   *   404: "Not Found",
   *   500: "Server Error"
   * }).withDefault("Unknown Status")(httpCode)
   * // message = "Not Found"
   *
   * @example
   * // With function default
   * const getMessage = Match.partial<number, string>({
   *   0: "Zero",
   *   1: "One",
   *   2: "Two"
   * }).withDefault((n) => `Number: ${n}`)
   * getMessage(5) // "Number: 5"
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
   * const score = 85
   * const grade = Match.withGuards<number, string>([
   *   [n => n >= 90, "A"],
   *   [n => n >= 80, "B"],
   *   [n => n >= 70, "C"],
   *   [n => n >= 60, "D"]
   * ]).withDefault("F")(score)
   * // grade = "B"
   *
   * @example
   * // With function results for custom messages
   * const age = 25
   * const category = Match.withGuards<number, string>([
   *   [n => n < 13, n => `Child (${n} years)`],
   *   [n => n < 20, n => `Teenager (${n} years)`],
   *   [n => n < 60, n => `Adult (${n} years)`],
   *   [n => n >= 60, n => `Senior (${n} years)`]
   * ]).withDefault("Unknown")(age)
   * // category = "Adult (25 years)"
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

/**
 * Pattern matching utility for type-safe conditional logic
 * @example
 * // Basic pattern matching
 * const result = Match(value)
 *   .case(x => x > 0, "positive")
 *   .case(x => x < 0, "negative")
 *   .default("zero")
 *
 * @example
 * // Exhaustive matching for union types
 * type Color = "red" | "green" | "blue"
 * const hex = Match.exhaustive<Color, string>({
 *   red: "#FF0000",
 *   green: "#00FF00",
 *   blue: "#0000FF"
 * })(color)
 *
 * @example
 * // Partial matching with default
 * const name = Match.partial<number, string>({
 *   1: "one",
 *   2: "two",
 *   3: "three"
 * }).withDefault(n => `number ${n}`)(value)
 */
export const Match = Companion(MatchConstructor, MatchCompanion)
