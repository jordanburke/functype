import { describe, expect, it } from "vitest"
import { IO } from "functype"

import { Logger } from "../src/logger"
import { tapLog, withLogging } from "../src/middleware"
import { createTestLogger } from "../src/testing"

describe("Middleware", () => {
  describe("withLogging", () => {
    it("should log start and complete around an effect", async () => {
      const { logger, entries } = createTestLogger()
      const effect = IO.succeed(42)
      const result = await withLogging("myTask", effect).provideService(Logger, logger).runOrThrow()

      expect(result).toBe(42)
      const logs = entries().toArray()
      expect(logs).toHaveLength(2)
      expect(logs[0]?.message).toBe("myTask: starting")
      expect(logs[0]?.level).toBe("debug")
      expect(logs[1]?.message).toBe("myTask: completed")
      expect(logs[1]?.level).toBe("debug")
    })

    it("should propagate the effect value through", async () => {
      const { logger } = createTestLogger()
      const effect = IO.succeed("hello")
      const result = await withLogging("passthrough", effect).provideService(Logger, logger).runOrThrow()

      expect(result).toBe("hello")
    })
  })

  describe("tapLog", () => {
    it("should log after effect completes", async () => {
      const { logger, entries } = createTestLogger()
      const effect = IO.succeed(42)
      const result = await tapLog<number>("info", "got result")(effect).provideService(Logger, logger).runOrThrow()

      expect(result).toBe(42)
      expect(entries().head.message).toBe("got result")
      expect(entries().head.level).toBe("info")
    })

    it("should support message function", async () => {
      const { logger, entries } = createTestLogger()
      const effect = IO.succeed([1, 2, 3])
      const result = await tapLog<number[]>(
        "info",
        (arr) => `fetched ${arr.length} items`,
      )(effect)
        .provideService(Logger, logger)
        .runOrThrow()

      expect(result).toEqual([1, 2, 3])
      expect(entries().head.message).toBe("fetched 3 items")
    })
  })
})
