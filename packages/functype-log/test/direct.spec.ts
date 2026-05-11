import { describe, expect, it } from "vitest"

import { createDirectTestLogger, createTestLogger, toDirectLogger } from "../src"

describe("DirectLogger", () => {
  describe("log levels", () => {
    it.each(["trace", "debug", "info", "warn", "error", "fatal"] as const)("should log at %s level", (level) => {
      const { logger, entries, hasEntry } = createDirectTestLogger()
      logger[level](`test ${level} message`)

      expect(entries().size).toBe(1)
      expect(hasEntry(level, `test ${level} message`)).toBe(true)
    })
  })

  describe("metadata", () => {
    it("should attach metadata to log entry", () => {
      const { logger, entries } = createDirectTestLogger()
      logger.info("with meta", { userId: "123", action: "login" })

      const entry = entries().head
      expect(entry.metadata).toEqual({ userId: "123", action: "login" })
    })

    it("should not include metadata when none provided", () => {
      const { logger, entries } = createDirectTestLogger()
      logger.info("no meta")

      const entry = entries().head
      expect(entry.metadata).toBeUndefined()
    })
  })

  describe("withError", () => {
    it("should attach error to log entry", () => {
      const { logger, entries } = createDirectTestLogger()
      const err = new Error("something broke")
      logger.withError(err).error("operation failed")

      const entry = entries().head
      expect(entry.error).toBe(err)
      expect(entry.level).toBe("error")
    })
  })

  describe("withContext", () => {
    it("should persist context across log calls", () => {
      const { logger, entries } = createDirectTestLogger()
      const contextLogger = logger.withContext({ requestId: "req-1" })
      contextLogger.info("first")
      contextLogger.info("second")

      expect(
        entries()
          .toArray()
          .every((e) => e.metadata?.requestId === "req-1"),
      ).toBe(true)
    })

    it("should merge per-message metadata with context", () => {
      const { logger, entries } = createDirectTestLogger()
      const contextLogger = logger.withContext({ requestId: "req-1" })
      contextLogger.info("merged", { action: "fetch" })

      const entry = entries().head
      expect(entry.metadata).toEqual({ requestId: "req-1", action: "fetch" })
    })
  })

  describe("child", () => {
    it("should inherit parent context", () => {
      const { logger, entries } = createDirectTestLogger()
      const parent = logger.withContext({ service: "api" })
      const child = parent.child({ handler: "users" })
      child.info("from child")

      const entry = entries().head
      expect(entry.metadata).toEqual({ service: "api", handler: "users" })
    })

    it("should share entry store with parent", () => {
      const { logger, entries } = createDirectTestLogger()
      const child = logger.child()
      logger.info("parent entry")
      child.info("child entry")

      expect(entries().size).toBe(2)
    })
  })

  describe("toDirectLogger", () => {
    it("should convert an IO Logger to DirectLogger", () => {
      const testHandle = createTestLogger()
      const direct = toDirectLogger(testHandle.logger)
      direct.info("via conversion")

      expect(testHandle.hasEntry("info", "via conversion")).toBe(true)
    })
  })

  describe("clear", () => {
    it("should clear all entries", () => {
      const { logger, entries, clear } = createDirectTestLogger()
      logger.info("first")
      logger.info("second")
      expect(entries().size).toBe(2)

      clear()
      expect(entries().size).toBe(0)
    })
  })
})
