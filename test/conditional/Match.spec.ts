import { describe, it, expect, expectTypeOf } from "vitest"
import { Match } from "@/conditional"

describe("Match", () => {
  describe("type inference", () => {
    it("should infer result type R from predicates without explicit annotations", () => {
      const value = 42

      // R should be inferred as Date from the first case result
      const result = Match(value)
        .case(
          (x) => x > 100,
          () => new Date(2024, 0, 1, 0, 0, 0),
        )
        .case(
          (x) => x > 25,
          () => new Date(2024, 0, 2, 0, 0, 0),
        )
        .default(() => new Date(2024, 0, 3, 0, 0, 0))

      // Verify runtime behavior
      expect(result).toBeInstanceOf(Date)
      expect(result.getDate()).toBe(2)

      // Verify type inference at compile time
      expectTypeOf(result).toEqualTypeOf<Date>()
    })

    it("should infer result type from case predicate", () => {
      const value = 42

      // R should be inferred as number from the first case
      const result = Match(value)
        .case(
          (x) => x > 50,
          () => 100,
        )
        .case(
          (x) => x > 25,
          () => 50,
        )
        .default(() => 0)

      expect(result).toBe(50)
      expectTypeOf(result).toEqualTypeOf<number>()
    })

    it("should infer result type from when guard", () => {
      const score = 85

      const result = Match(score)
        .when(
          (n) => n >= 90,
          () => "A",
        )
        .when(
          (n) => n >= 80,
          () => "B",
        )
        .default(() => "F")

      expect(result).toBe("B")
      expectTypeOf(result).toEqualTypeOf<string>()
    })

    it("should infer object result types", () => {
      const value = 42

      // Type is inferred as { status: string; count: number } from first case
      const result = Match(value)
        .case(
          (x) => x > 50,
          () => ({ status: "large", count: 100 }),
        )
        .case(
          (x) => x > 25,
          () => ({ status: "medium", count: 50 }),
        )
        .default(() => ({ status: "small", count: 0 }))

      expect(result).toEqual({ status: "medium", count: 50 })
      expectTypeOf(result).toEqualTypeOf<{ status: string; count: number }>()
    })

    it("should allow function results with computed values", () => {
      const userId = "user-123"

      // R is inferred as { role: string; id: string } from first case
      const result = Match(userId)
        .case(
          (id) => id.startsWith("admin-"),
          (id) => ({ role: "admin", id }),
        )
        .case(
          (id) => id.startsWith("user-"),
          (id) => ({ role: "user", id }),
        )
        .default((id) => ({ role: "guest", id }))

      expect(result).toEqual({ role: "user", id: "user-123" })
      expectTypeOf(result).toEqualTypeOf<{ role: string; id: string }>()
    })
  })

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

      expect(match.orThrow()).toBe("matched")
    })

    it("should throw when no match found", () => {
      const match = Match("unknown").caseValue("known", "found").caseValue("also-known", "found too")

      expect(() => match.orThrow()).toThrow("No matching pattern for value")
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

  describe("enhanced pattern matching", () => {
    describe("nested patterns", () => {
      type User = {
        name: string
        age: number
        role: "admin" | "user" | "guest"
        preferences?: {
          theme: "light" | "dark"
          notifications: boolean
        }
      }

      it("should match nested object patterns", () => {
        const user: User = {
          name: "Alice",
          age: 30,
          role: "admin",
          preferences: {
            theme: "dark",
            notifications: true,
          },
        }

        const result = Match(user)
          .case({ role: "admin", preferences: { theme: "dark" } }, "Dark mode admin")
          .case({ role: "admin" }, "Regular admin")
          .case({ role: "user" }, (u) => `User: ${u.name}`)
          .default("Guest")

        expect(result).toBe("Dark mode admin")
      })

      it("should match with nested guards", () => {
        const user: User = {
          name: "Bob",
          age: 17,
          role: "user",
        }

        const result = Match(user)
          .case({ age: (n: number) => n >= 18, role: "admin" }, "Adult admin")
          .case({ age: (n: number) => n >= 18, role: "user" }, "Adult user")
          .case({ age: (n: number) => n < 18 }, (u) => `Minor: ${u.name}`)
          .default("Unknown")

        expect(result).toBe("Minor: Bob")
      })

      it("should handle optional nested properties", () => {
        const userWithoutPrefs: User = {
          name: "Charlie",
          age: 25,
          role: "user",
        }

        const result = Match(userWithoutPrefs)
          .case({ preferences: { notifications: true } }, "Has notifications")
          .case({ role: "user" }, "Regular user")
          .default("Other")

        expect(result).toBe("Regular user")
      })
    })

    describe("when guards", () => {
      it("should support when method for readable guards", () => {
        const result = Match(15)
          .when((n: number) => n > 20, "large")
          .when((n: number) => n > 10, "medium")
          .when((n: number) => n > 0, "small")
          .default("invalid")

        expect(result).toBe("medium")
      })

      it("should support guard pattern object syntax", () => {
        const classify = (n: number) =>
          Match(n)
            .case({ _: (x: number) => x > 100 }, "huge")
            .case({ _: (x: number) => x > 50 }, "large")
            .case({ _: (x: number) => x > 10 }, "medium")
            .default("small")

        expect(classify(150)).toBe("huge")
        expect(classify(75)).toBe("large")
        expect(classify(25)).toBe("medium")
        expect(classify(5)).toBe("small")
      })
    })

    describe("caseAny", () => {
      it("should match multiple patterns with caseAny", () => {
        const result = Match("Saturday")
          .caseAny(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "Weekday")
          .caseAny(["Saturday", "Sunday"], "Weekend")
          .default("Invalid")

        expect(result).toBe("Weekend")
      })
    })

    describe("exhaustive method", () => {
      it("should enforce exhaustive matching with exhaustive method", () => {
        const httpCode = 200

        const result = Match(httpCode)
          .case((x) => x >= 500, "Server Error")
          .case((x) => x >= 400, "Client Error")
          .case((x) => x >= 300, "Redirect")
          .case((x) => x >= 200, "Success")
          .exhaustive()

        expect(result).toBe("Success")
      })

      it("should throw on non-exhaustive match when using exhaustive method", () => {
        const value = 42

        expect(() => {
          Match(value)
            .case((x) => x > 100, "large")
            .case((x) => x > 50, "medium")
            .exhaustive()
        }).toThrow("Non-exhaustive match")
      })
    })

    describe("toOption method", () => {
      it("should return Some for successful matches", () => {
        const someResult = Match(42).case(42, "found").toOption()

        expect(someResult.isEmpty).toBe(false)
        expect(someResult.orThrow()).toBe("found")
      })

      it("should return None for failed matches", () => {
        const noneResult = Match(99).case(0, "zero").toOption()

        expect(noneResult.isEmpty).toBe(true)
      })
    })

    describe("struct pattern matching", () => {
      type Event =
        | { type: "click"; x: number; y: number }
        | { type: "keypress"; key: string; shift?: boolean }
        | { type: "hover"; element: string }

      it("should match discriminated unions with struct", () => {
        const events: Event[] = [
          { type: "click", x: 100, y: 200 },
          { type: "keypress", key: "Enter" },
          { type: "hover", element: "button" },
        ]

        const handler = Match.struct<Event, string>()
          .case(
            { type: "click" },
            (e) =>
              `Click at (${(e as { type: "click"; x: number; y: number }).x}, ${(e as { type: "click"; x: number; y: number }).y})`,
          )
          .case({ type: "keypress", key: "Enter" }, () => "Enter pressed")
          .case({ type: "keypress" }, (e) => `Key: ${(e as { type: "keypress"; key: string }).key}`)
          .case({ type: "hover" }, (e) => `Hovering: ${(e as { type: "hover"; element: string }).element}`)
          .build()

        expect(handler(events[0]!)).toBe("Click at (100, 200)")
        expect(handler(events[1]!)).toBe("Enter pressed")
        expect(handler(events[2]!)).toBe("Hovering: button")
      })
    })

    describe("builder pattern", () => {
      it("should create reusable matchers with builder", () => {
        type Animal = { species: string; legs: number; canFly: boolean }

        const classifier = Match.builder<Animal, string>()
          .when((a) => a.canFly, "Flying creature")
          .case({ legs: 0 }, "Legless creature")
          .case({ legs: 2 }, "Biped")
          .case({ legs: 4 }, "Quadruped")
          .when((a) => a.legs > 4, "Multi-legged")
          .default("Unknown")
          .build()

        expect(classifier({ species: "bird", legs: 2, canFly: true })).toBe("Flying creature")
        expect(classifier({ species: "snake", legs: 0, canFly: false })).toBe("Legless creature")
        expect(classifier({ species: "dog", legs: 4, canFly: false })).toBe("Quadruped")
        expect(classifier({ species: "spider", legs: 8, canFly: false })).toBe("Multi-legged")
      })
    })

    describe("complex real-world patterns", () => {
      it("should handle Redux-style action matching", () => {
        type Action =
          | { type: "SET_USER"; payload: { id: string; name: string } }
          | { type: "LOGOUT" }
          | { type: "UPDATE_PROFILE"; payload: { field: string; value: any } }
          | { type: "API_REQUEST"; payload: { endpoint: string; method: string } }

        type State = {
          user: { id: string; name: string } | null
          profile: Record<string, any>
        }

        const reducer = (state: State, action: Action): State => {
          return Match(action)
            .case(
              { type: "SET_USER" },
              (a): State => ({
                ...state,
                user: (a as { type: "SET_USER"; payload: { id: string; name: string } }).payload,
              }),
            )
            .case({ type: "LOGOUT" }, (): State => ({ ...state, user: null, profile: {} }))
            .case(
              { type: "UPDATE_PROFILE" },
              (a): State => ({
                ...state,
                profile: {
                  ...state.profile,
                  [(a as { type: "UPDATE_PROFILE"; payload: { field: string; value: any } }).payload.field]: (
                    a as { type: "UPDATE_PROFILE"; payload: { field: string; value: any } }
                  ).payload.value,
                },
              }),
            )
            .case(
              { type: "API_REQUEST", payload: { method: "DELETE" } },
              (): State => state, // Ignore deletes
            )
            .default((): State => state)
        }

        const initialState: State = { user: null, profile: {} }

        let state = reducer(initialState, {
          type: "SET_USER",
          payload: { id: "123", name: "Alice" },
        })
        expect(state.user).toEqual({ id: "123", name: "Alice" })

        state = reducer(state, {
          type: "UPDATE_PROFILE",
          payload: { field: "email", value: "alice@example.com" },
        })
        expect(state.profile.email).toBe("alice@example.com")

        state = reducer(state, { type: "LOGOUT" })
        expect(state.user).toBeNull()
        expect(state.profile).toEqual({})
      })
    })
  })
})
