import { describe, expect, it } from "vitest"

import { createDirectConsoleLogger } from "../src/direct/DirectLogger"
import type { ConsoleLoggerOptions } from "../src/layers/ConsoleLogger"
import { createConsoleLogger } from "../src/layers/ConsoleLogger"
import type { Logger, LogLevel } from "../src/logger/Logger"

/**
 * Pins what `createConsoleLogger` writes, argument by argument. Log parsers may read this, and the
 * console logger is due to stop using loglayer, so any change here should be a decision.
 */
const capture = () => {
  const calls: unknown[][] = []
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push([method, ...args])
    }
  const sink = {
    log: record("log"),
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

const logEveryLevel = (logger: Logger): void => {
  LEVELS.forEach((level) => logger[level](level).runSyncOrThrow())
}

describe("ConsoleLogger: output format", () => {
  it("writes a bare message as a single argument", () => {
    expect(written((log) => log.info("m").runSyncOrThrow())).toEqual([["info", "m"]])
  })

  it("routes each level to its console method, and fatal to error", () => {
    expect(written(logEveryLevel)).toEqual([
      ["trace", "trace"],
      ["debug", "debug"],
      ["info", "info"],
      ["warn", "warn"],
      ["error", "error"],
      ["error", "fatal"],
    ])
  })

  it("writes metadata before the message", () => {
    expect(written((log) => log.info("m", { a: 1 }).runSyncOrThrow())).toEqual([["info", { a: 1 }, "m"]])
  })

  it("puts the prefix inside the message", () => {
    expect(written((log) => log.info("m", { a: 1 }).runSyncOrThrow(), { prefix: "[P]" })).toEqual([
      ["info", { a: 1 }, "[P] m"],
    ])
  })

  it("merges context and metadata, and metadata wins", () => {
    expect(written((log) => log.withContext({ c: 1, a: 0 }).info("m", { a: 1 }).runSyncOrThrow())).toEqual([
      ["info", { c: 1, a: 1 }, "m"],
    ])
  })

  it("adds a child's context to its parent's", () => {
    expect(written((log) => log.withContext({ c: 1 }).child({ d: 2 }).info("m").runSyncOrThrow())).toEqual([
      ["info", { c: 1, d: 2 }, "m"],
    ])
  })

  it("writes withError's error under err, on every call", () => {
    const err = new Error("x")
    expect(
      written((log) => {
        const failing = log.withError(err)
        failing.error("m1", { a: 1 }).runSyncOrThrow()
        failing.error("m2").runSyncOrThrow()
      }),
    ).toEqual([
      ["error", { a: 1, err }, "m1"],
      ["error", { err }, "m2"],
    ])
  })

  it("doesn't pass withError's error on to a child", () => {
    expect(written((log) => log.withError(new Error("x")).child().error("m").runSyncOrThrow())).toEqual([
      ["error", "m"],
    ])
  })

  it("lets a throwing console surface to the caller", () => {
    const throwing = {
      info: () => {
        throw new Error("sink boom")
      },
    }
    expect(() => createConsoleLogger({ console: throwing }).info("m").runSyncOrThrow()).toThrow("sink boom")
  })
})

describe("ConsoleLogger: level", () => {
  it("writes every level when no level is set", () => {
    expect(written(logEveryLevel)).toHaveLength(LEVELS.length)
  })

  it("drops anything below the level", () => {
    expect(written(logEveryLevel, { level: "warn" })).toEqual([
      ["warn", "warn"],
      ["error", "error"],
      ["error", "fatal"],
    ])
  })

  it("keeps only fatal at the fatal level", () => {
    expect(written(logEveryLevel, { level: "fatal" })).toEqual([["error", "fatal"]])
  })

  it("carries the level through withContext, withError and child", () => {
    expect(
      written(
        (log) => {
          log.withContext({ c: 1 }).info("context").runSyncOrThrow()
          log.withError(new Error("x")).info("error").runSyncOrThrow()
          log.child().info("child").runSyncOrThrow()
        },
        { level: "warn" },
      ),
    ).toEqual([])
  })

  it("applies to the direct logger", () => {
    const { calls, sink } = capture()
    const log = createDirectConsoleLogger({ level: "warn", console: sink })
    log.info("i")
    log.warn("w")
    expect(calls).toEqual([["warn", "w"]])
  })
})
