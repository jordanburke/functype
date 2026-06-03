import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createConsoleLogger } from "../src/layers/ConsoleLogger"
import { createDirectConsoleLogger } from "../src/direct/DirectLogger"

/**
 * Stream-routing tests for createConsoleLogger / createDirectConsoleLogger.
 *
 * The default is `stdout` — matches every other Node logging library (pino,
 * winston, bunyan) and loglayer's `ConsoleTransport` per-level routing
 * (info/debug → stdout via `console.info`/`console.debug`; warn/error/trace
 * → stderr via `console.warn`/`console.error`/`console.trace`).
 *
 * Opt into `stream: "stderr"` to route ALL levels through stderr. Required
 * for MCP-over-stdio servers where stdout is reserved for JSON-RPC.
 *
 * Opt into `console: customSink` to fully override (e.g. file streams,
 * structured collectors). Takes precedence over `stream`.
 */
describe("ConsoleLogger — stream routing", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let debugSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>
  let traceSpy: ReturnType<typeof vi.spyOn>
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    traceSpy = vi.spyOn(console, "trace").mockImplementation(() => {})
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("default (stdout)", () => {
    it("info routes to console.info (stdout)", async () => {
      const logger = createConsoleLogger()
      await logger.info("hello").runSyncOrThrow()
      expect(infoSpy).toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it("debug routes to console.debug (stdout)", async () => {
      const logger = createConsoleLogger()
      await logger.debug("debugging").runSyncOrThrow()
      expect(debugSpy).toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it("warn routes to console.warn (stderr)", async () => {
      const logger = createConsoleLogger()
      await logger.warn("careful").runSyncOrThrow()
      expect(warnSpy).toHaveBeenCalled()
    })

    it("error routes to console.error (stderr)", async () => {
      const logger = createConsoleLogger()
      await logger.error("boom").runSyncOrThrow()
      expect(errorSpy).toHaveBeenCalled()
    })
  })

  describe('stream: "stderr"', () => {
    it("info routes to console.error (stderr), NOT console.info", async () => {
      const logger = createConsoleLogger({ stream: "stderr" })
      await logger.info("hello").runSyncOrThrow()
      expect(errorSpy).toHaveBeenCalled()
      expect(infoSpy).not.toHaveBeenCalled()
    })

    it("debug routes to console.error (stderr), NOT console.debug", async () => {
      const logger = createConsoleLogger({ stream: "stderr" })
      await logger.debug("debugging").runSyncOrThrow()
      expect(errorSpy).toHaveBeenCalled()
      expect(debugSpy).not.toHaveBeenCalled()
    })

    it("warn routes to console.error (stderr), NOT console.warn", async () => {
      const logger = createConsoleLogger({ stream: "stderr" })
      await logger.warn("careful").runSyncOrThrow()
      expect(errorSpy).toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it("error routes to console.error (stderr) as expected", async () => {
      const logger = createConsoleLogger({ stream: "stderr" })
      await logger.error("boom").runSyncOrThrow()
      expect(errorSpy).toHaveBeenCalled()
    })

    it("NO output lands on stdout (MCP-over-stdio safety)", async () => {
      const logger = createConsoleLogger({ stream: "stderr" })
      await logger.info("must not corrupt JSON-RPC").runSyncOrThrow()
      await logger.debug("ditto").runSyncOrThrow()
      // console.info / console.debug / console.log all write to stdout in Node
      expect(infoSpy).not.toHaveBeenCalled()
      expect(debugSpy).not.toHaveBeenCalled()
      expect(logSpy).not.toHaveBeenCalled()
    })
  })

  describe("console override", () => {
    it("custom sink receives all calls", async () => {
      const sink = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
        log: vi.fn(),
      }
      const logger = createConsoleLogger({ console: sink })
      await logger.info("captured").runSyncOrThrow()
      expect(sink.info).toHaveBeenCalled()
      // Real console untouched
      expect(infoSpy).not.toHaveBeenCalled()
    })

    it("takes precedence over stream", async () => {
      const sink = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
        log: vi.fn(),
      }
      // stream: "stderr" should be ignored when console is provided
      const logger = createConsoleLogger({ stream: "stderr", console: sink })
      await logger.info("via custom sink").runSyncOrThrow()
      expect(sink.info).toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled() // stderrConsole shim NOT used
    })
  })

  describe("createDirectConsoleLogger forwards options", () => {
    it("default goes to stdout (info → console.info)", () => {
      const logger = createDirectConsoleLogger()
      logger.info("hello")
      expect(infoSpy).toHaveBeenCalled()
    })

    it('stream: "stderr" routes info to console.error', () => {
      const logger = createDirectConsoleLogger({ stream: "stderr" })
      logger.info("hello")
      expect(errorSpy).toHaveBeenCalled()
      expect(infoSpy).not.toHaveBeenCalled()
    })

    it("console override is honored", () => {
      const sink = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
        log: vi.fn(),
      }
      const logger = createDirectConsoleLogger({ console: sink })
      logger.info("captured")
      expect(sink.info).toHaveBeenCalled()
    })
  })

  describe("backward compatibility", () => {
    it("no options → same behavior as before the option was added", async () => {
      const logger = createConsoleLogger()
      await logger.info("backcompat info").runSyncOrThrow()
      await logger.warn("backcompat warn").runSyncOrThrow()
      // info on stdout (console.info), warn on stderr (console.warn) — loglayer default split
      expect(infoSpy).toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalled()
    })

    it("level + prefix options still respected alongside stream", async () => {
      // Smoke: passing all options together does not throw
      const logger = createConsoleLogger({ level: "debug", prefix: "[test]", stream: "stderr" })
      await logger.info("multi-option").runSyncOrThrow()
      expect(errorSpy).toHaveBeenCalled()
    })
  })
})
