import { describe, expect, it } from "vitest"

import { createTestLogger } from "../src/testing"

describe("Logger", () => {
  describe("log levels", () => {
    it.each(["trace", "debug", "info", "warn", "error", "fatal"] as const)("should log at %s level", async (level) => {
      const { logger, entries, hasEntry } = createTestLogger()
      await logger[level](`test ${level} message`).runOrThrow()

      expect(entries().size).toBe(1)
      expect(hasEntry(level, `test ${level} message`)).toBe(true)
    })
  })

  describe("metadata", () => {
    it("should attach metadata to log entry", async () => {
      const { logger, entries } = createTestLogger()
      await logger.info("with meta", { userId: "123", action: "login" }).runOrThrow()

      const entry = entries().head
      expect(entry.metadata).toEqual({ userId: "123", action: "login" })
    })

    it("should not include metadata when none provided", async () => {
      const { logger, entries } = createTestLogger()
      await logger.info("no meta").runOrThrow()

      const entry = entries().head
      expect(entry.metadata).toBeUndefined()
    })
  })

  describe("withError", () => {
    it("should attach error to log entry", async () => {
      const { logger, entries } = createTestLogger()
      const err = new Error("something broke")
      await logger.withError(err).error("operation failed").runOrThrow()

      const entry = entries().head
      expect(entry.error).toBe(err)
      expect(entry.level).toBe("error")
    })
  })

  describe("withContext", () => {
    it("should persist context across log calls", async () => {
      const { logger, entries } = createTestLogger()
      const contextLogger = logger.withContext({ requestId: "req-1" })
      await contextLogger.info("first").runOrThrow()
      await contextLogger.info("second").runOrThrow()

      expect(
        entries()
          .toArray()
          .every((e) => e.metadata?.requestId === "req-1"),
      ).toBe(true)
    })

    it("should merge per-message metadata with context", async () => {
      const { logger, entries } = createTestLogger()
      const contextLogger = logger.withContext({ requestId: "req-1" })
      await contextLogger.info("merged", { action: "fetch" }).runOrThrow()

      const entry = entries().head
      expect(entry.metadata).toEqual({ requestId: "req-1", action: "fetch" })
    })
  })

  describe("child", () => {
    it("should inherit parent context", async () => {
      const { logger, entries } = createTestLogger()
      const parent = logger.withContext({ service: "api" })
      const child = parent.child({ handler: "users" })
      await child.info("from child").runOrThrow()

      const entry = entries().head
      expect(entry.metadata).toEqual({ service: "api", handler: "users" })
    })

    it("should share entry store with parent", async () => {
      const { logger, entries } = createTestLogger()
      const child = logger.child()
      await logger.info("parent entry").runOrThrow()
      await child.info("child entry").runOrThrow()

      expect(entries().size).toBe(2)
    })
  })

  describe("laziness", () => {
    it("should not execute until run", () => {
      const { logger, entries } = createTestLogger()
      // Create the IO but don't run it
      const _effect = logger.info("should not appear")

      expect(entries().size).toBe(0)
    })
  })
})
