import { describe, expect, it, vi } from "vitest"
import { IO } from "functype"

import { Logger } from "../src/logger"
import { LoggerLive, silentLogger } from "../src/layers"

describe("LoggerLive", () => {
  describe("silent", () => {
    it("should not throw when logging", async () => {
      const program = IO.service(Logger).flatMap((log) => log.info("silent message"))
      await program.provideLayer(LoggerLive.silent()).runOrThrow()
    })

    it("should return same instance for withContext/withError/child", () => {
      expect(silentLogger.withContext({ key: "value" })).toBe(silentLogger)
      expect(silentLogger.withError(new Error("test"))).toBe(silentLogger)
      expect(silentLogger.child()).toBe(silentLogger)
    })
  })

  describe("console", () => {
    it("should create a working logger layer", async () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {})
      try {
        const program = IO.service(Logger).flatMap((log) => log.info("hello console"))
        await program.provideLayer(LoggerLive.console()).runOrThrow()
        expect(spy).toHaveBeenCalled()
      } finally {
        spy.mockRestore()
      }
    })

    it("should support prefix option", async () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {})
      try {
        const program = IO.service(Logger).flatMap((log) => log.info("prefixed"))
        await program.provideLayer(LoggerLive.console({ prefix: "[APP]" })).runOrThrow()
        expect(spy).toHaveBeenCalled()
      } finally {
        spy.mockRestore()
      }
    })
  })
})
