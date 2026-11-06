import { IO } from "functype"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createDirectConsoleLogger } from "../src/direct/DirectLogger"
import { createConsoleLogger } from "../src/layers/ConsoleLogger"
import { LoggerLive } from "../src/layers/LoggerLayer"
import type { LogEntry, LogLevel, LogSink } from "../src/logger/Logger"
import { Logger } from "../src/logger/Logger"

const collect = (): { readonly entries: LogEntry[]; readonly sink: LogSink } => {
  const entries: LogEntry[] = []
  return {
    entries,
    sink: (entry) => {
      entries.push(entry)
    },
  }
}

describe("ConsoleLogger: sink", () => {
  it("receives one entry for each call, when the IO runs", () => {
    const { entries, sink } = collect()
    const pending = createConsoleLogger({ sink }).info("m", { a: 1 })
    expect(entries).toHaveLength(0)

    pending.runSyncOrThrow()

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ level: "info", message: "m", metadata: { a: 1 } })
    expect(entries[0]?.timestamp).toBeInstanceOf(Date)
  })

  it("leaves metadata and error undefined when there are none", () => {
    const { entries, sink } = collect()
    createConsoleLogger({ sink }).info("m").runSyncOrThrow()
    expect(entries[0]?.metadata).toBeUndefined()
    expect(entries[0]?.error).toBeUndefined()
  })

  it("passes every level through under its own name", () => {
    const { entries, sink } = collect()
    const log = createConsoleLogger({ sink })
    const levels: ReadonlyArray<LogLevel> = ["trace", "debug", "info", "warn", "error", "fatal"]
    levels.forEach((level) => log[level]("m").runSyncOrThrow())
    expect(entries.map((entry) => entry.level)).toEqual(levels)
  })

  it("applies the prefix to the message", () => {
    const { entries, sink } = collect()
    createConsoleLogger({ sink, prefix: "[P]" }).info("m").runSyncOrThrow()
    expect(entries[0]?.message).toBe("[P] m")
  })

  it("drops anything below the level", () => {
    const { entries, sink } = collect()
    const log = createConsoleLogger({ sink, level: "warn" })
    log.info("i").runSyncOrThrow()
    log.withContext({ c: 1 }).info("context").runSyncOrThrow()
    log.withError(new Error("x")).info("error").runSyncOrThrow()
    log.child().info("child").runSyncOrThrow()
    log.warn("w").runSyncOrThrow()
    log.fatal("f").runSyncOrThrow()
    expect(entries.map((entry) => entry.message)).toEqual(["w", "f"])
  })

  it("merges context and metadata, and metadata wins", () => {
    const { entries, sink } = collect()
    createConsoleLogger({ sink }).withContext({ c: 1, a: 0 }).info("m", { a: 1 }).runSyncOrThrow()
    expect(entries[0]?.metadata).toEqual({ c: 1, a: 1 })
  })

  it("adds a child's context to its parent's", () => {
    const { entries, sink } = collect()
    createConsoleLogger({ sink }).withContext({ c: 1 }).child({ d: 2 }).info("m").runSyncOrThrow()
    expect(entries[0]?.metadata).toEqual({ c: 1, d: 2 })
  })

  it("carries withError's error on the entry, not in metadata", () => {
    const { entries, sink } = collect()
    const err = new Error("x")
    const failing = createConsoleLogger({ sink }).withError(err)
    failing.error("m1").runSyncOrThrow()
    failing.withContext({ c: 1 }).error("m2").runSyncOrThrow()
    expect(entries[0]?.error).toBe(err)
    expect(entries[0]?.metadata).toBeUndefined()
    expect(entries[1]?.error).toBe(err)
    expect(entries[1]?.metadata).toEqual({ c: 1 })
  })

  it("doesn't pass withError's error on to a child", () => {
    const { entries, sink } = collect()
    createConsoleLogger({ sink }).withError(new Error("x")).child().error("m").runSyncOrThrow()
    expect(entries[0]?.error).toBeUndefined()
  })

  it("lets a throwing sink surface to the caller", () => {
    const throwing: LogSink = () => {
      throw new Error("sink boom")
    }
    expect(() => createConsoleLogger({ sink: throwing }).info("m").runSyncOrThrow()).toThrow("sink boom")
  })

  it("works through createDirectConsoleLogger", () => {
    const { entries, sink } = collect()
    const log = createDirectConsoleLogger({ sink, level: "warn" }).withContext({ c: 1 })
    log.info("i")
    log.warn("w", { a: 1 })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ level: "warn", message: "w", metadata: { c: 1, a: 1 } })
  })

  it("works through LoggerLive.console, and keeps its order across an await", async () => {
    const { entries, sink } = collect()
    const program = IO.service(Logger).flatMap((log) =>
      log
        .info("before")
        .flatMap(() => IO.sleep(1))
        .flatMap(() => log.info("after")),
    )
    await program.provideLayer(LoggerLive.console({ sink })).runOrThrow()
    expect(entries.map((entry) => entry.message)).toEqual(["before", "after"])
  })

  describe("alongside the other sink options", () => {
    let infoSpy: ReturnType<typeof vi.spyOn>
    let errorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("writes nothing to the console itself", () => {
      createConsoleLogger({ sink: collect().sink }).info("m").runSyncOrThrow()
      expect(infoSpy).not.toHaveBeenCalled()
    })

    it("takes precedence over stream", () => {
      const { entries, sink } = collect()
      createConsoleLogger({ sink, stream: "stderr" }).info("m").runSyncOrThrow()
      expect(entries).toHaveLength(1)
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it("takes precedence over console", () => {
      const { entries, sink } = collect()
      const customConsole = { info: vi.fn() }
      createConsoleLogger({ sink, console: customConsole }).info("m").runSyncOrThrow()
      expect(entries).toHaveLength(1)
      expect(customConsole.info).not.toHaveBeenCalled()
    })
  })
})
