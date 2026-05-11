import { Companion } from "@/companion/Companion"
import { Option } from "@/option/Option"
import type { Type } from "@/types"

/**
 * Type-level utilities for exhaustiveness checking
 * @internal
 */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

/** @internal */
type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true

/** @internal */
type RequireExhaustive<T, Cases> =
  IsUnion<T> extends true ? (keyof Cases extends T ? (T extends keyof Cases ? Cases : never) : never) : Cases

/**
 * Pattern types for nested matching
 * @internal
 */
type Pattern<T> = T | { [K in keyof T]?: Pattern<T[K]> } | ((value: T) => boolean) | { _: (value: T) => boolean } // Guard pattern

/**
 * Extract result from pattern
 * @internal
 */
type PatternResult<T, R> = R | ((matched: T) => R)

/**
 * Untyped Match (before first case is added).
 * The result type R is inferred when the first case method is called.
 * This enables proper type inference without requiring explicit type annotations.
 *
 * @internal
 */
export type UntypedMatch<T extends Type> = {
  /**
   * Match against a pattern - infers result type R from the result parameter
   */
  case: <R extends Type>(pattern: Pattern<T>, result: PatternResult<T, R>) => Match<T, R>

  /**
   * Match a specific value - infers result type R from the result parameter
   */
  caseValue: <R extends Type>(match: T, result: R | (() => R)) => Match<T, R>

  /**
   * Match multiple values - infers result type R from the result parameter
   */
  caseValues: <R extends Type>(matches: T[], result: R | (() => R)) => Match<T, R>

  /**
   * Match with a guard function - infers result type R from the result parameter
   */
  when: <R extends Type>(guard: (value: T) => boolean, result: PatternResult<T, R>) => Match<T, R>

  /**
   * Match multiple patterns (OR operation) - infers result type R from the result parameter
   */
  caseAny: <R extends Type>(patterns: Pattern<T>[], result: PatternResult<T, R>) => Match<T, R>
}

/**
 * Pattern matching construct similar to Scala's match expressions.
 * Supports exhaustive matching, nested patterns, and guards.
 *
 * @example
 * // Basic pattern matching
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
 *
 * @example
 * // Nested pattern matching
 * const user = { name: "John", age: 30, role: "admin" }
 * const msg = Match(user)
 *   .case({ role: "admin", age: n => n >= 18 }, "Adult admin")
 *   .case({ role: "user" }, u => `User: ${u.name}`)
 *   .default("Guest")
 */
export type Match<T extends Type, R extends Type> = {
  /**
   * Match against a pattern (value, nested object, or predicate).
   * The result type R2 is added to the union of possible results.
   */
  case: <R2 extends Type>(pattern: Pattern<T>, result: PatternResult<T, R2>) => Match<T, R | R2>

  /**
   * Add a case that matches a specific value.
   * The result type R2 is added to the union of possible results.
   */
  caseValue: <R2 extends Type>(match: T, result: R2 | (() => R2)) => Match<T, R | R2>

  /**
   * Add a case that matches multiple values.
   * The result type R2 is added to the union of possible results.
   */
  caseValues: <R2 extends Type>(matches: T[], result: R2 | (() => R2)) => Match<T, R | R2>

  /**
   * Match with a guard function (alias for readability).
   * The result type R2 is added to the union of possible results.
   */
  when: <R2 extends Type>(guard: (value: T) => boolean, result: PatternResult<T, R2>) => Match<T, R | R2>

  /**
   * Match multiple patterns (OR operation).
   * The result type R2 is added to the union of possible results.
   */
  caseAny: <R2 extends Type>(patterns: Pattern<T>[], result: PatternResult<T, R2>) => Match<T, R | R2>

  /**
   * Default case - makes match non-exhaustive.
   * The result type R2 is added to the union of possible results.
   */
  default: <R2 extends Type>(result: PatternResult<T, R2>) => R | R2

  /**
   * Force exhaustive matching (compile-time check for union types)
   */
  exhaustive: () => R

  /**
   * Get result if matched, throws if no match
   */
  orThrow: (errorMessage?: string) => R

  /**
   * Get result wrapped in Option
   */
  toOption: () => Option<R>
}

type MatchState<T, R> = {
  value: T
  resolved: boolean
  result?: R
  patterns: Array<{ pattern: Pattern<T>; result: PatternResult<T, R> }>
}

/**
 * Check if a value matches a pattern
 */
const matchesPattern = <T>(value: T, pattern: Pattern<T>): boolean => {
  // Direct value match
  if (pattern === value) return true

  // Function predicate
  if (typeof pattern === "function") {
    return (pattern as (value: T) => boolean)(value)
  }

  // Guard pattern
  if (pattern && typeof pattern === "object" && "_" in pattern) {
    return (pattern._ as (value: T) => boolean)(value)
  }

  // Nested object pattern
  if (typeof pattern === "object" && pattern !== null && typeof value === "object" && value !== null) {
    return Object.entries(pattern).every(([key, subPattern]) => {
      const subValue = (value as Record<string, unknown>)[key]
      return matchesPattern(subValue, subPattern as Pattern<unknown>)
    })
  }

  return false
}

const MatchObject = <T extends Type, R extends Type>(state: MatchState<T, R>): Match<T, R> => {
  const getResult = <RX>(result: PatternResult<T, RX>, value: T): RX => {
    return typeof result === "function" ? (result as (value: T) => RX)(value) : result
  }

  const tryMatch = (): { matched: boolean; result?: R } => {
    for (const { pattern, result } of state.patterns) {
      if (matchesPattern(state.value, pattern)) {
        return { matched: true, result: getResult(result, state.value) }
      }
    }
    return { matched: false }
  }

  // Use type assertions throughout - the runtime behavior is the same,
  // types accumulate at compile time via the Match<T, R | R2> return types

  const match: Match<T, R> = {
    case: <R2 extends Type>(pattern: Pattern<T>, result: PatternResult<T, R2>): Match<T, R | R2> => {
      if (state.resolved) return match as unknown as Match<T, R | R2>

      if (matchesPattern(state.value, pattern)) {
        return MatchObject({
          value: state.value,
          resolved: true,
          result: getResult(result, state.value),
          patterns: [],
        } as MatchState<T, R | R2>) as Match<T, R | R2>
      }

      return MatchObject({
        ...state,
        patterns: [...state.patterns, { pattern, result }] as MatchState<T, R | R2>["patterns"],
      } as MatchState<T, R | R2>) as Match<T, R | R2>
    },

    caseValue: <R2 extends Type>(matchValue: T, result: R2 | (() => R2)): Match<T, R | R2> => {
      if (state.resolved) return match as unknown as Match<T, R | R2>
      if (state.value === matchValue) {
        const res = typeof result === "function" ? (result as () => R2)() : result
        return MatchObject({
          value: state.value,
          resolved: true,
          result: res,
          patterns: [],
        } as MatchState<T, R | R2>) as Match<T, R | R2>
      }
      return match as unknown as Match<T, R | R2>
    },

    caseValues: <R2 extends Type>(matches: T[], result: R2 | (() => R2)): Match<T, R | R2> => {
      if (state.resolved) return match as unknown as Match<T, R | R2>
      if (matches.includes(state.value)) {
        const res = typeof result === "function" ? (result as () => R2)() : result
        return MatchObject({
          value: state.value,
          resolved: true,
          result: res,
          patterns: [],
        } as MatchState<T, R | R2>) as Match<T, R | R2>
      }
      return match as unknown as Match<T, R | R2>
    },

    when: <R2 extends Type>(guard: (value: T) => boolean, result: PatternResult<T, R2>): Match<T, R | R2> => {
      return match.case(guard, result)
    },

    caseAny: <R2 extends Type>(patterns: Pattern<T>[], result: PatternResult<T, R2>): Match<T, R | R2> => {
      if (state.resolved) return match as unknown as Match<T, R | R2>

      for (const pattern of patterns) {
        if (matchesPattern(state.value, pattern)) {
          return MatchObject({
            value: state.value,
            resolved: true,
            result: getResult(result, state.value),
            patterns: [],
          } as MatchState<T, R | R2>) as Match<T, R | R2>
        }
      }

      return MatchObject({
        ...state,
        patterns: [...state.patterns, ...patterns.map((p) => ({ pattern: p, result }))] as MatchState<
          T,
          R | R2
        >["patterns"],
      } as MatchState<T, R | R2>) as Match<T, R | R2>
    },

    default: <R2 extends Type>(result: PatternResult<T, R2>): R | R2 => {
      if (state.resolved) return state.result as R | R2
      return getResult(result, state.value)
    },

    exhaustive: () => {
      if (state.resolved) return state.result as R
      const matchResult = tryMatch()
      if (!matchResult.matched) {
        throw new Error(`Non-exhaustive match. No pattern matched value: ${JSON.stringify(state.value)}`)
      }
      return matchResult.result as R
    },

    orThrow: (errorMessage?: string) => {
      if (state.resolved) return state.result as R
      const matchResult = tryMatch()
      if (!matchResult.matched) {
        throw new Error(errorMessage ?? `No matching pattern for value: ${JSON.stringify(state.value)}`)
      }
      return matchResult.result as R
    },

    toOption: () => {
      if (state.resolved) return Option(state.result)
      const matchResult = tryMatch()
      return matchResult.matched ? Option(matchResult.result) : Option.none()
    },
  }

  return match
}

/**
 * Create an UntypedMatch that defers R inference until the first case.
 * This is the key to proper type inference - R is not bound until needed.
 */
const UntypedMatchObject = <T extends Type>(value: T): UntypedMatch<T> => {
  const getResult = <R>(result: PatternResult<T, R>, v: T): R => {
    return typeof result === "function" ? (result as (value: T) => R)(v) : result
  }

  return {
    case: <R extends Type>(pattern: Pattern<T>, result: PatternResult<T, R>): Match<T, R> => {
      const newState: MatchState<T, R> = {
        value,
        resolved: false,
        patterns: [{ pattern, result }],
      }

      if (matchesPattern(value, pattern)) {
        return MatchObject({
          ...newState,
          resolved: true,
          result: getResult(result, value),
        })
      }

      return MatchObject(newState)
    },

    caseValue: <R extends Type>(matchValue: T, result: R | (() => R)): Match<T, R> => {
      if (value === matchValue) {
        const res = typeof result === "function" ? (result as () => R)() : result
        return MatchObject<T, R>({
          value,
          resolved: true,
          result: res,
          patterns: [],
        })
      }
      return MatchObject<T, R>({
        value,
        resolved: false,
        patterns: [],
      })
    },

    caseValues: <R extends Type>(matches: T[], result: R | (() => R)): Match<T, R> => {
      if (matches.includes(value)) {
        const res = typeof result === "function" ? (result as () => R)() : result
        return MatchObject<T, R>({
          value,
          resolved: true,
          result: res,
          patterns: [],
        })
      }
      return MatchObject<T, R>({
        value,
        resolved: false,
        patterns: [],
      })
    },

    when: <R extends Type>(guard: (value: T) => boolean, result: PatternResult<T, R>): Match<T, R> => {
      const newState: MatchState<T, R> = {
        value,
        resolved: false,
        patterns: [{ pattern: guard, result }],
      }

      if (guard(value)) {
        return MatchObject({
          ...newState,
          resolved: true,
          result: getResult(result, value),
        })
      }

      return MatchObject(newState)
    },

    caseAny: <R extends Type>(patterns: Pattern<T>[], result: PatternResult<T, R>): Match<T, R> => {
      for (const pattern of patterns) {
        if (matchesPattern(value, pattern)) {
          return MatchObject<T, R>({
            value,
            resolved: true,
            result: getResult(result, value),
            patterns: patterns.map((p) => ({ pattern: p, result })),
          })
        }
      }

      return MatchObject<T, R>({
        value,
        resolved: false,
        patterns: patterns.map((p) => ({ pattern: p, result })),
      })
    },
  }
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
const MatchConstructor = <T extends Type>(value: T): UntypedMatch<T> => {
  return UntypedMatchObject(value)
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
  exhaustive: <T extends string | number | symbol, R extends Type>(cases: RequireExhaustive<T, Record<T, R>>) => {
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

  /**
   * Pattern matching for objects with specific structure
   * @example
   * type Event =
   *   | { type: "click"; x: number; y: number }
   *   | { type: "keypress"; key: string }
   *   | { type: "hover"; element: string }
   *
   * const handler = Match.struct<Event, void>()
   *   .case({ type: "click" }, (e) => console.log(`Click at ${e.x}, ${e.y}`))
   *   .case({ type: "keypress", key: "Enter" }, () => console.log("Enter pressed"))
   *   .case({ type: "hover" }, (e) => console.log(`Hovering over ${e.element}`))
   *   .build()
   */
  struct: <T extends Type, R extends Type>() => {
    const patterns: Array<{ pattern: Pattern<T>; handler: (value: T) => R }> = []

    const builder = {
      case: (pattern: Pattern<T>, handler: (value: T) => R) => {
        patterns.push({ pattern, handler })
        return builder
      },
      build:
        () =>
        (value: T): R => {
          for (const { pattern, handler } of patterns) {
            if (matchesPattern(value, pattern)) {
              return handler(value)
            }
          }
          throw new Error(`No matching pattern for value: ${JSON.stringify(value)}`)
        },
    }

    return builder
  },

  /**
   * Create a pattern matcher with guards and nested patterns
   * @example
   * type User = {
   *   name: string
   *   age: number
   *   permissions: string[]
   * }
   *
   * const canAccess = Match.builder<User, boolean>()
   *   .when(u => u.permissions.includes("admin"), true)
   *   .case({ age: n => n >= 18, permissions: p => p.length > 0 }, true)
   *   .default(false)
   *   .build()
   */
  builder: <T extends Type, R extends Type>() => {
    const patterns: Array<{ pattern: Pattern<T>; result: PatternResult<T, R> }> = []
    let defaultResult: PatternResult<T, R> | undefined

    const builder = {
      case: (pattern: Pattern<T>, result: PatternResult<T, R>) => {
        patterns.push({ pattern, result })
        return builder
      },
      when: (guard: (value: T) => boolean, result: PatternResult<T, R>) => {
        patterns.push({ pattern: guard, result })
        return builder
      },
      default: (result: PatternResult<T, R>) => {
        defaultResult = result
        return {
          build:
            () =>
            (value: T): R => {
              for (const { pattern, result } of patterns) {
                if (matchesPattern(value, pattern)) {
                  return typeof result === "function" ? (result as (value: T) => R)(value) : result
                }
              }
              if (defaultResult !== undefined) {
                return typeof defaultResult === "function" ? (defaultResult as (value: T) => R)(value) : defaultResult
              }
              throw new Error(`No matching pattern for value: ${JSON.stringify(value)}`)
            },
        }
      },
    }

    return builder
  },
}

/**
 * Pattern matching utility for type-safe conditional logic with exhaustiveness checking,
 * nested patterns, and guard support
 *
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
 * // Nested pattern matching
 * type User = { name: string; age: number; role: "admin" | "user" }
 * const user: User = { name: "John", age: 30, role: "admin" }
 *
 * const message = Match<User, string>(user)
 *   .case({ role: "admin", age: (n) => n >= 18 }, "Adult admin")
 *   .case({ role: "user" }, u => `User: ${u.name}`)
 *   .default("Unknown")
 *
 * @example
 * // Using exhaustive() method
 * type Status = "idle" | "loading" | "success" | "error"
 * const result = Match<Status, string>("success")
 *   .case("idle", "Waiting...")
 *   .case("loading", "Loading...")
 *   .case("success", "Done!")
 *   .case("error", "Failed!")
 *   .exhaustive()
 */
export const Match = Companion(MatchConstructor, MatchCompanion)
