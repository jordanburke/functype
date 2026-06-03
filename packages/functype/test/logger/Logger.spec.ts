import { describe, expect, it, vi } from "vitest"

import type { Logger } from "@/logger"

/**
 * Logger is type-only — the entire test surface is structural assignability.
 * If the assertions below compile, the contract holds. The runtime `expect`s
 * are just there to make Vitest count something.
 */
describe("Logger interface", () => {
  it("accepts a hand-rolled 4-method impl", () => {
    const calls: string[] = []
    const logger: Logger = {
      debug: (msg) => calls.push(`debug:${msg}`),
      info: (msg) => calls.push(`info:${msg}`),
      warn: (msg) => calls.push(`warn:${msg}`),
      error: (msg) => calls.push(`error:${msg}`),
    }

    logger.debug("d")
    logger.info("i", { extra: 1 })
    logger.warn("w")
    logger.error("e", { code: 500 })

    expect(calls).toEqual(["debug:d", "info:i", "warn:w", "error:e"])
  })

  it("accepts a DirectLogger-shaped impl (structural superset)", () => {
    // Mirrors functype-log's DirectLogger shape. The point is: a richer logger
    // (extra trace/fatal/withContext/child methods) assigns to Logger without
    // an adapter, because Logger's surface is a subset of DirectLogger's.
    type LogMetadata = Record<string, unknown>
    type DirectLogger = {
      readonly trace: (message: string, metadata?: LogMetadata) => void
      readonly debug: (message: string, metadata?: LogMetadata) => void
      readonly info: (message: string, metadata?: LogMetadata) => void
      readonly warn: (message: string, metadata?: LogMetadata) => void
      readonly error: (message: string, metadata?: LogMetadata) => void
      readonly fatal: (message: string, metadata?: LogMetadata) => void
      readonly withError: (error: Error) => DirectLogger
      readonly withContext: (context: LogMetadata) => DirectLogger
      readonly child: (context?: LogMetadata) => DirectLogger
    }

    const noop = vi.fn()
    const direct: DirectLogger = {
      trace: noop,
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
      fatal: noop,
      withError: () => direct,
      withContext: () => direct,
      child: () => direct,
    }

    // Structural compatibility: DirectLogger → Logger requires no adapter.
    const asLogger: Logger = direct
    asLogger.info("hello", { ctx: 1 })

    expect(noop).toHaveBeenCalledWith("hello", { ctx: 1 })
  })

  it("rejects an impl missing a required method", () => {
    // Type-level negative test. Vitest will run the runtime body unchanged;
    // the @ts-expect-error proves the type-system catches the missing method.
    // @ts-expect-error — 'error' method missing
    const _bad: Logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
    }
    expect(_bad).toBeDefined()
  })
})
