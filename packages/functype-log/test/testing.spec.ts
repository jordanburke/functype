import { describe, expect, it } from "vitest"

import { createTestLogger } from "../src/testing"

describe("TestLogger", () => {
  describe("entries", () => {
    it("should return List of captured entries", async () => {
      const { logger, entries } = createTestLogger()
      await logger.info("one").runOrThrow()
      await logger.warn("two").runOrThrow()

      const list = entries()
      expect(list.size).toBe(2)
      expect(list.head.level).toBe("info")
      expect(list.head.message).toBe("one")
    })

    it("should include timestamps", async () => {
      const { logger, entries } = createTestLogger()
      await logger.info("timed").runOrThrow()

      expect(entries().head.timestamp).toBeInstanceOf(Date)
    })
  })

  describe("clear", () => {
    it("should remove all captured entries", async () => {
      const { logger, entries, clear } = createTestLogger()
      await logger.info("to be cleared").runOrThrow()
      expect(entries().size).toBe(1)

      clear()
      expect(entries().size).toBe(0)
    })
  })

  describe("hasEntry", () => {
    it("should match by string inclusion", async () => {
      const { logger, hasEntry } = createTestLogger()
      await logger.error("user not found: id=42").runOrThrow()

      expect(hasEntry("error", "not found")).toBe(true)
      expect(hasEntry("error", "success")).toBe(false)
      expect(hasEntry("info", "not found")).toBe(false)
    })

    it("should match by regex", async () => {
      const { logger, hasEntry } = createTestLogger()
      await logger.info("request took 150ms").runOrThrow()

      expect(hasEntry("info", /\d+ms/)).toBe(true)
      expect(hasEntry("info", /\d+s$/)).toBe(false)
    })
  })
})
