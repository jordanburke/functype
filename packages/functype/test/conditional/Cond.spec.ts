import { describe, it, expect } from "vitest"
import { Cond } from "@/conditional"

describe("Cond", () => {
  describe("basic conditionals", () => {
    it("should handle if/else pattern", () => {
      const x = 5
      const result = Cond.of<string>()
        .when(x > 10, "large")
        .else("small")

      expect(result).toBe("small")
    })

    it("should handle if/elseif/else pattern", () => {
      const x = 7
      const result = Cond.of<string>()
        .when(x > 10, "large")
        .elseWhen(x > 5, "medium")
        .else("small")

      expect(result).toBe("medium")
    })

    it("should handle multiple elseWhen conditions", () => {
      const score = 85
      const grade = Cond.of<string>()
        .when(score >= 90, "A")
        .elseWhen(score >= 80, "B")
        .elseWhen(score >= 70, "C")
        .elseWhen(score >= 60, "D")
        .else("F")

      expect(grade).toBe("B")
    })

    it("should support lazy evaluation with functions", () => {
      let sideEffect = 0
      const result = Cond.of<number>()
        .when(false, () => {
          sideEffect = 1
          return 1
        })
        .when(true, () => {
          sideEffect = 2
          return 2
        })
        .else(() => {
          sideEffect = 3
          return 3
        })

      expect(result).toBe(2)
      expect(sideEffect).toBe(2) // Only the matching branch was evaluated
    })

    it("should short-circuit on first true condition", () => {
      let callCount = 0
      const result = Cond.of<string>()
        .when(true, "first")
        .when(true, () => {
          callCount++
          return "second"
        })
        .else("default")

      expect(result).toBe("first")
      expect(callCount).toBe(0) // Second condition not evaluated
    })
  })

  describe("match helper", () => {
    it("should match string literals exhaustively", () => {
      type Status = "pending" | "success" | "error"
      const status: Status = "success"

      const result = Cond.match<Status>(status)({
        pending: "Waiting...",
        success: "Done!",
        error: "Failed!",
      })

      expect(result).toBe("Done!")
    })

    it("should match numeric values", () => {
      const code = 200
      const message = Cond.match<200 | 404 | 500>(code)({
        200: "OK",
        404: "Not Found",
        500: "Server Error",
      })

      expect(message).toBe("OK")
    })

    it("should support function values in match", () => {
      const action: "compute" | "noop" = "compute"
      const result = Cond.match<"compute" | "noop">(action)({
        compute: () => 2 + 2,
        noop: () => 0,
      })

      expect(result).toBe(4)
    })

    it("should throw on missing case", () => {
      expect(() => {
        Cond.match("unknown" as any)({
          known: "value",
        })
      }).toThrow("No case defined for value: unknown")
    })
  })

  describe("lazy evaluation", () => {
    it("should defer all evaluations until resolution", () => {
      let checkCount = 0
      let computeCount = 0

      const result = Cond.lazy<string>()
        .when(
          () => {
            checkCount++
            return false
          },
          () => {
            computeCount++
            return "first"
          },
        )
        .when(
          () => {
            checkCount++
            return true
          },
          () => {
            computeCount++
            return "second"
          },
        )
        .else(() => {
          computeCount++
          return "default"
        })

      expect(checkCount).toBe(2)
      expect(computeCount).toBe(1)
      expect(result).toBe("second")
    })

    it("should handle complex lazy computations", () => {
      const expensiveCheck = () => {
        // Simulate expensive computation
        return Math.random() > 0.5
      }

      const getMessage = (isError: boolean) =>
        Cond.lazy<string>()
          .when(
            () => isError && expensiveCheck(),
            () => "Critical Error!",
          )
          .when(
            () => isError,
            () => "Error occurred",
          )
          .else(() => "All good")

      // This should work without throwing
      const msg1 = getMessage(false)
      expect(msg1).toBe("All good")

      const msg2 = getMessage(true)
      expect(["Critical Error!", "Error occurred"]).toContain(msg2)
    })
  })

  describe("getOrThrow", () => {
    it("should return value when condition matches", () => {
      const cond = Cond.of<number>().when(true, 42).when(false, 0)

      expect(cond.orThrow()).toBe(42)
    })

    it("should throw when no condition matches", () => {
      const cond = Cond.of<number>().when(false, 42).elseWhen(false, 0)

      expect(() => cond.orThrow()).toThrow("Conditional expression has no matching condition")
    })
  })

  describe("real-world examples", () => {
    it("should handle user permission levels", () => {
      type User = { role: "admin" | "user" | "guest"; isActive: boolean }

      const getPermissions = (user: User) =>
        Cond.of<string[]>()
          .when(user.role === "admin" && user.isActive, ["read", "write", "delete"])
          .when(user.role === "user" && user.isActive, ["read", "write"])
          .when(user.role === "guest", ["read"])
          .else([])

      expect(getPermissions({ role: "admin", isActive: true })).toEqual(["read", "write", "delete"])
      expect(getPermissions({ role: "admin", isActive: false })).toEqual([])
      expect(getPermissions({ role: "user", isActive: true })).toEqual(["read", "write"])
      expect(getPermissions({ role: "guest", isActive: false })).toEqual(["read"])
    })

    it("should handle pricing tiers", () => {
      const calculatePrice = (units: number) =>
        Cond.of<number>()
          .when(units > 1000, units * 0.5)
          .elseWhen(units > 500, units * 0.7)
          .elseWhen(units > 100, units * 0.9)
          .else(units * 1.0)

      expect(calculatePrice(1500)).toBe(750) // 1500 * 0.5
      expect(calculatePrice(600)).toBe(420) // 600 * 0.7
      expect(calculatePrice(200)).toBe(180) // 200 * 0.9
      expect(calculatePrice(50)).toBe(50) // 50 * 1.0
    })
  })
})
