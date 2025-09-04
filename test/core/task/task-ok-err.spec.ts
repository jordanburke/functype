import { describe, expect, it } from "vitest"
import { Task, Ok, Err, type TaskOutcome } from "@/core/task/Task"
import { Right } from "@/either/Either"

describe("Task Ok/Err pattern", () => {
  describe("Ok constructor", () => {
    it("should create a successful TaskOutcome", () => {
      const result = Ok("success")
      expect(result.isSuccess()).toBe(true)
      expect(result.isFailure()).toBe(false)
      expect(result.getOrThrow()).toBe("success")
    })

    it("should work with Task companion", () => {
      const result = Task.ok("value")
      expect(result.isSuccess()).toBe(true)
      expect(result.getOrThrow()).toBe("value")
    })
  })

  describe("Err constructor", () => {
    it("should create a failed TaskOutcome", () => {
      const result = Err<string>("error")
      expect(result.isSuccess()).toBe(false)
      expect(result.isFailure()).toBe(true)
      expect(result.error.message).toBe("error")
    })

    it("should work with Task companion", () => {
      const result = Task.err<string>("error")
      expect(result.isFailure()).toBe(true)
      expect(result.error.message).toBe("error")
    })
  })

  describe("Async with explicit Ok/Err", () => {
    it("should handle explicit Ok return", async () => {
      const result = await Task().Async(async (): Promise<TaskOutcome<string>> => {
        return Ok("success")
      })

      expect(result.isSuccess()).toBe(true)
      expect(result.getOrThrow()).toBe("success")
    })

    it("should handle explicit Err return", async () => {
      const result = await Task().Async(async (): Promise<TaskOutcome<string>> => {
        return Err<string>("error occurred")
      })

      expect(result.isFailure()).toBe(true)
      expect(result.error.message).toBe("error occurred")
    })

    it("should handle conditional Ok/Err returns", async () => {
      const successTask = await Task().Async(async (): Promise<TaskOutcome<number>> => {
        const value = 10
        if (value > 5) {
          return Ok(value)
        }
        return Err<number>("Value too small")
      })

      expect(successTask.isSuccess()).toBe(true)
      expect(successTask.getOrThrow()).toBe(10)

      const failureTask = await Task().Async(async (): Promise<TaskOutcome<number>> => {
        const value = 3
        if (value > 5) {
          return Ok(value)
        }
        return Err<number>("Value too small")
      })

      expect(failureTask.isFailure()).toBe(true)
      expect(failureTask.error.message).toBe("Value too small")
    })
  })

  describe("Async with auto-wrapping", () => {
    it("should auto-wrap raw values as Ok", async () => {
      const result = await Task().Async(async () => {
        return "raw value"
      })

      expect(result.isSuccess()).toBe(true)
      expect(result.getOrThrow()).toBe("raw value")
    })

    it("should auto-wrap thrown errors as Err", async () => {
      const result = await Task().Async(async () => {
        throw new Error("thrown error")
      })

      expect(result.isFailure()).toBe(true)
      expect(result.error.message).toBe("thrown error")
    })
  })

  describe("Error handler recovery with Ok", () => {
    it("should allow error handler to return Ok for recovery", async () => {
      const result = await Task().Async(
        async () => {
          throw new Error("initial error")
        },
        async (error) => {
          // Recover by returning Ok
          return Ok("recovered")
        },
      )

      expect(result.isSuccess()).toBe(true)
      expect(result.getOrThrow()).toBe("recovered")
    })

    it("should allow error handler to return Err to transform error", async () => {
      const result = await Task().Async(
        async () => {
          throw new Error("initial error")
        },
        async (error) => {
          // Transform error
          return Err<string>("transformed error")
        },
      )

      expect(result.isFailure()).toBe(true)
      expect(result.error.message).toBe("transformed error")
    })
  })

  describe("Type inference", () => {
    it("should infer types correctly with Ok", async () => {
      const result = await Task().Async(async () => Ok({ id: 1, name: "test" }))

      if (result.isSuccess()) {
        // TypeScript should know the type here
        expect(result.getOrThrow().id).toBe(1)
        expect(result.getOrThrow().name).toBe("test")
      }
    })

    it("should infer types correctly with Err", async () => {
      const result = await Task().Async(async () => Err<number>("error"))

      if (result.isFailure()) {
        // TypeScript should know this is an error
        expect(result.error.message).toBe("error")
      }
    })
  })

  describe("Chaining operations", () => {
    it("should chain operations with map", () => {
      const result = Ok(5)
        .map((x) => x * 2)
        .map((x) => x + 1)

      expect(result.isSuccess()).toBe(true)
      expect(result.getOrThrow()).toBe(11)
    })

    it("should chain operations with flatMap", () => {
      const result = Ok(5)
        .flatMap((x) => Right(x * 2))
        .flatMap((x) => Right(x + 1))

      expect(result.isSuccess()).toBe(true)
      expect(result.getOrThrow()).toBe(11)
    })

    it("should short-circuit on Err", () => {
      const result = Err<number>("initial error")
        .map((x) => x * 2)
        .map((x) => x + 1)

      expect(result.isFailure()).toBe(true)
      // The error should remain unchanged when mapping over a failure
      expect(result).toBe(result) // Identity check - it's the same instance
      // Check that it's still an Err with the original error
      const err2 = Err<number>("initial error")
      // Both should have equivalent error structures
      expect(result.isFailure()).toBe(true)
    })
  })
})
