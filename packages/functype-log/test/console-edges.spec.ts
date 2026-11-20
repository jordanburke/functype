import { afterEach, describe, expect, it, vi } from "vitest"

import type { ConsoleLoggerOptions } from "../src/layers/ConsoleLogger"
import { createConsoleLogger } from "../src/layers/ConsoleLogger"
import type { Logger, LogLevel, LogSink } from "../src/logger/Logger"

/**
 * Cases `console-format.spec.ts` doesn't reach. Each one held while the console logger used
 * loglayer, so a log parser sees the same arguments now that it doesn't.
 */
const capture = () => {
  const calls: unknown[][] = []
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push([method, ...args])
    }
  const sink = {
    info: record("info"),
    debug: record("debug"),
    trace: record("trace"),
    warn: record("warn"),
    error: record("error"),
  }
  return { calls, sink }
}

const written = (run: (logger: Logger) => void, options?: Omit<ConsoleLoggerOptions, "console">): unknown[][] => {
  const { calls, sink } = capture()
  run(createConsoleLogger({ ...options, console: sink }))
  return calls
}

const LEVELS: ReadonlyArray<LogLevel> = ["trace", "debug", "info", "warn", "error", "fatal"]

describe("ConsoleLogger: output edges", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes empty metadata as an empty object", () => {
    expect(written((log) => log.info("m", {}).runSyncOrThrow())).toEqual([["info", {}, "m"]])
  })

  it("keeps a metadata key whose value is undefined", () => {
    const calls = written((log) => log.info("m", { u: undefined }).runSyncOrThrow())
    expect(calls).toEqual([["info", { u: undefined }, "m"]])
    expect(Object.keys(calls[0]?.[1] as object)).toEqual(["u"])
  })

  it("puts withError's error over a metadata key named err", () => {
    const err = new Error("x")
    expect(written((log) => log.withError(err).error("m", { err: "mine" }).runSyncOrThrow())).toEqual([
      ["error", { err }, "m"],
    ])
  })

  it("puts no prefix on the message when the prefix is empty", () => {
    expect(written((log) => log.info("m").runSyncOrThrow(), { prefix: "" })).toEqual([["info", "m"]])
  })

  it("calls each console method on the console it was given", () => {
    const seen: unknown[] = []
    const target = {
      info(this: unknown, ..._args: unknown[]) {
        seen.push(this)
      },
    }
    createConsoleLogger({ console: target }).info("m").runSyncOrThrow()
    expect(seen).toEqual([target])
  })

  it("looks up the console method on each call", () => {
    const logger = createConsoleLogger()
    const spy = vi.spyOn(console, "info").mockImplementation(() => {})
    logger.info("after").runSyncOrThrow()
    expect(spy).toHaveBeenCalledWith("after")
  })

  it("throws a TypeError for a level whose console method is missing", () => {
    const logger = createConsoleLogger({ console: { info: () => {} } })
    expect(() => logger.info("m").runSyncOrThrow()).not.toThrow()
    expect(() => logger.warn("m").runSyncOrThrow()).toThrow(TypeError)
  })

  it("lets every level through when level isn't a level name", () => {
    const logEveryLevel = (logger: Logger): void => {
      LEVELS.forEach((level) => logger[level](level).runSyncOrThrow())
    }
    const options = { level: "WARN" } as unknown as Omit<ConsoleLoggerOptions, "console">
    expect(written(logEveryLevel, options)).toHaveLength(LEVELS.length)
  })
})

/**
 * Where the console logger without loglayer writes something different. Each is a decision, and
 * the CHANGELOG names it.
 */
describe("ConsoleLogger: changes from the loglayer version", () => {
  it("writes a Promise in metadata as it is, at once", () => {
    const pending = Promise.resolve(1)
    expect(written((log) => log.info("m", { p: pending }).runSyncOrThrow())).toEqual([["info", { p: pending }, "m"]])
  })

  it("adds nothing for an empty withContext", () => {
    expect(written((log) => log.withContext({}).info("m").runSyncOrThrow())).toEqual([["info", "m"]])
  })

  it("lets every level through the sink option when level isn't a level name", () => {
    const levels: LogLevel[] = []
    const sink: LogSink = ({ level }) => {
      levels.push(level)
    }
    const options = { level: "WARN", sink } as unknown as ConsoleLoggerOptions
    const logger = createConsoleLogger(options)
    LEVELS.forEach((level) => logger[level](level).runSyncOrThrow())
    expect(levels).toEqual(LEVELS)
  })
})
