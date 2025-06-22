import { describe, it, expect } from "vitest"
import { Match } from "@/conditional"

describe("Match", () => {
  describe("basic pattern matching", () => {
    it("should match with case predicates", () => {
      const value = 42
      const result = Match(value)
        .case((x) => x > 50, "large")
        .case((x) => x > 25, "medium")
        .case((x) => x > 0, "small")
        .default("invalid")

      expect(result).toBe("medium")
    })

    it("should match exact values", () => {
      const status = "success"
      const result = Match(status)
        .caseValue("pending", "Please wait...")
        .caseValue("success", "Operation completed")
        .caseValue("error", "Something went wrong")
        .default("Unknown status")

      expect(result).toBe("Operation completed")
    })

    it("should match multiple values", () => {
      const day = "Saturday"
      const result = Match(day)
        .caseValues(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "Weekday")
        .caseValues(["Saturday", "Sunday"], "Weekend")
        .default("Invalid day")

      expect(result).toBe("Weekend")
    })

    it("should support function results", () => {
      const score = 85
      const result = Match(score)
        .case(
          (s: number) => s >= 90,
          (s: number) => `Excellent: ${s}`,
        )
        .case(
          (s: number) => s >= 80,
          (s: number) => `Good: ${s}`,
        )
        .case(
          (s: number) => s >= 70,
          (s: number) => `Fair: ${s}`,
        )
        .default((s: number) => `Needs improvement: ${s}`)

      expect(result).toBe("Good: 85")
    })
  })

  describe("exhaustive matching", () => {
    it("should enforce exhaustive matches for union types", () => {
      type Color = "red" | "green" | "blue"
      const color: Color = "green"

      const rgb = Match.exhaustive<Color, string>({
        red: "#FF0000",
        green: "#00FF00",
        blue: "#0000FF",
      })(color)

      expect(rgb).toBe("#00FF00")
    })

    it("should support function values in exhaustive match", () => {
      type Operation = "add" | "subtract" | "multiply"
      const op: Operation = "add"

      // For function values, we need to wrap them to prevent auto-execution
      type OpFunc = { fn: (a: number, b: number) => number }
      const compute = Match.exhaustive<Operation, OpFunc>({
        add: { fn: (a, b) => a + b },
        subtract: { fn: (a, b) => a - b },
        multiply: { fn: (a, b) => a * b },
      })(op).fn

      expect(compute(10, 5)).toBe(15)
    })

    it("should throw on missing exhaustive case", () => {
      expect(() => {
        Match.exhaustive({
          a: "A",
          b: "B",
        })("c" as any)
      }).toThrow("No case defined for value: c")
    })
  })

  describe("partial matching", () => {
    it("should handle partial matches with default", () => {
      const httpCode = 201
      const message = Match.partial<number, string>({
        200: "OK",
        201: "Created",
        404: "Not Found",
        500: "Server Error",
      }).withDefault("Unknown Status")(httpCode)

      expect(message).toBe("Created")
    })

    it("should use default for unmatched values", () => {
      const code = 403
      const message = Match.partial<number, string>({
        200: "OK",
        404: "Not Found",
      }).withDefault((code) => `Status code: ${code}`)(code)

      expect(message).toBe("Status code: 403")
    })
  })

  describe("guard patterns", () => {
    it("should match with guard conditions", () => {
      const age = 25
      const category = Match.withGuards<number, string>([
        [(n) => n < 13, "Child"],
        [(n) => n < 20, "Teenager"],
        [(n) => n < 60, "Adult"],
        [(n) => n >= 60, "Senior"],
      ]).withDefault("Unknown")(age)

      expect(category).toBe("Adult")
    })

    it("should respect guard order", () => {
      const value = 15
      const result = Match.withGuards<number, string>([
        [(n) => n > 10, "Greater than 10"],
        [(n) => n > 5, "Greater than 5"],
        [(n) => n > 0, "Positive"],
      ]).withDefault("Non-positive")(value)

      expect(result).toBe("Greater than 10")
    })

    it("should support function results in guards", () => {
      const temperature = 25
      const description = Match.withGuards<number, string>([
        [(t) => t < 0, (t) => `Freezing: ${t}°C`],
        [(t) => t < 15, (t) => `Cold: ${t}°C`],
        [(t) => t < 25, (t) => `Mild: ${t}°C`],
        [(t) => t >= 25, (t) => `Warm: ${t}°C`],
      ]).withDefault("Unknown")(temperature)

      expect(description).toBe("Warm: 25°C")
    })
  })

  describe("getOrThrow", () => {
    it("should return matched value", () => {
      const match = Match(10)
        .case((x) => x > 5, "matched")
        .case((x) => x <= 5, "not this one")

      expect(match.getOrThrow()).toBe("matched")
    })

    it("should throw when no match found", () => {
      const match = Match("unknown").caseValue("known", "found").caseValue("also-known", "found too")

      expect(() => match.getOrThrow()).toThrow("No matching case for value: unknown")
    })
  })

  describe("real-world examples", () => {
    it("should handle error classification", () => {
      type AppError = {
        code: string
        severity: "low" | "medium" | "high" | "critical"
      }

      const getErrorAction = (error: AppError) =>
        Match(error)
          .case(
            (e: AppError) => e.severity === "critical",
            () => ({ action: "page", message: "Critical system error" }),
          )
          .case(
            (e: AppError) => e.severity === "high" && e.code.startsWith("AUTH"),
            () => ({ action: "logout", message: "Authentication failed" }),
          )
          .case(
            (e: AppError) => e.severity === "high",
            () => ({ action: "alert", message: "An error occurred" }),
          )
          .case(
            (e: AppError) => e.severity === "medium",
            (e: AppError) => ({ action: "notify", message: `Warning: ${e.code}` }),
          )
          .default(() => ({ action: "log", message: "Minor issue" }))

      expect(getErrorAction({ code: "SYS001", severity: "critical" })).toEqual({
        action: "page",
        message: "Critical system error",
      })

      expect(getErrorAction({ code: "AUTH403", severity: "high" })).toEqual({
        action: "logout",
        message: "Authentication failed",
      })

      expect(getErrorAction({ code: "WARN001", severity: "medium" })).toEqual({
        action: "notify",
        message: "Warning: WARN001",
      })
    })

    it("should handle state machine transitions", () => {
      type State = "idle" | "loading" | "success" | "error"
      type Event = "fetch" | "succeed" | "fail" | "reset"

      const transition = (state: State, event: Event): State =>
        Match.exhaustive<Event, State>({
          fetch: Match.exhaustive<State, State>({
            idle: "loading",
            loading: "loading",
            success: "loading",
            error: "loading",
          })(state),
          succeed: Match.exhaustive<State, State>({
            idle: "idle",
            loading: "success",
            success: "success",
            error: "error",
          })(state),
          fail: Match.exhaustive<State, State>({
            idle: "idle",
            loading: "error",
            success: "success",
            error: "error",
          })(state),
          reset: "idle",
        })(event)

      expect(transition("idle", "fetch")).toBe("loading")
      expect(transition("loading", "succeed")).toBe("success")
      expect(transition("loading", "fail")).toBe("error")
      expect(transition("error", "reset")).toBe("idle")
    })
  })
})
