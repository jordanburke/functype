import type { Logger } from "functype"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { bootDiagnostics, Layered, StaticSource } from "../../src/config"

type CapturedLog = { level: "debug" | "info" | "warn" | "error"; message: string; metadata?: Record<string, unknown> }

const captureLogger = (): { logger: Logger; entries: CapturedLog[] } => {
  const entries: CapturedLog[] = []
  const logger: Logger = {
    debug: (m, meta) => entries.push({ level: "debug", message: m, metadata: meta }),
    info: (m, meta) => entries.push({ level: "info", message: m, metadata: meta }),
    warn: (m, meta) => entries.push({ level: "warn", message: m, metadata: meta }),
    error: (m, meta) => entries.push({ level: "error", message: m, metadata: meta }),
  }
  return { logger, entries }
}

const stripAnsi = (s: string): string => s.replace(/\x1b\[\d+m/g, "")

describe("bootDiagnostics", () => {
  const originalEnv = process.env
  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NO_COLOR
    delete process.env.FORCE_COLOR
  })
  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it("returns Right when all required keys are present", () => {
    const { logger, entries } = captureLogger()
    const source = StaticSource({ A: "1", B: "2" })
    const result = bootDiagnostics({
      source,
      required: ["A", "B"],
      logger,
    })

    expect(result.isRight()).toBe(true)
    expect(entries.some((e) => stripAnsi(e.message).includes("All required keys present"))).toBe(true)
  })

  it("returns Left(List<MissingKey>) when required keys are missing", () => {
    const { logger, entries } = captureLogger()
    const source = StaticSource({ A: "present" })
    const result = bootDiagnostics({
      source,
      required: ["A", "MISSING_1", "MISSING_2"],
      logger,
    })

    expect(result.isLeft()).toBe(true)
    const missing = result.fold(
      (l) => l.toArray(),
      () => [],
    )
    expect(missing.map((m) => m.key).sort()).toEqual(["MISSING_1", "MISSING_2"])
    expect(missing.every((m) => m.required)).toBe(true)
    expect(entries.some((e) => e.level === "error" && stripAnsi(e.message).includes("Missing required keys"))).toBe(
      true,
    )
  })

  it("logs sensitive keys with masked values; missing sensitive shows NOT_LOADED", () => {
    const { logger, entries } = captureLogger()
    const source = StaticSource({ TOKEN: "supersecretvalue123" }) // long → "su****23"
    bootDiagnostics({
      source,
      sensitive: ["TOKEN", "MISSING_SECRET"],
      logger,
    })

    const messages = entries.map((e) => stripAnsi(e.message))
    expect(messages.some((m) => m.includes("TOKEN") && m.includes("su****23"))).toBe(true)
    expect(messages.some((m) => m.includes("MISSING_SECRET") && m.includes("NOT_LOADED"))).toBe(true)
    // Critical: raw secret never appears in any log message
    expect(messages.some((m) => m.includes("supersecretvalue123"))).toBe(false)
  })

  it("logs public keys with raw values", () => {
    const { logger, entries } = captureLogger()
    const source = StaticSource({ ENV: "local", FEATURE_X: "true" })
    bootDiagnostics({
      source,
      public: ["ENV", "FEATURE_X"],
      logger,
    })

    const messages = entries.map((e) => stripAnsi(e.message))
    expect(messages.some((m) => m.includes("ENV") && m.includes("local"))).toBe(true)
    expect(messages.some((m) => m.includes("FEATURE_X") && m.includes("true"))).toBe(true)
  })

  it("logs success (info) on env match between host and vault", () => {
    const { logger, entries } = captureLogger()
    const source = StaticSource({ ENV: "staging" })
    bootDiagnostics({
      source,
      hostEnv: "staging",
      vaultEnvKey: "ENV",
      logger,
    })

    expect(
      entries.some((e) => e.level === "info" && stripAnsi(e.message).includes("staging (host) ↔ staging (vault)")),
    ).toBe(true)
  })

  it("logs error on env mismatch with both values in metadata", () => {
    const { logger, entries } = captureLogger()
    const source = StaticSource({ ENV: "production" })
    bootDiagnostics({
      source,
      hostEnv: "staging",
      vaultEnvKey: "ENV",
      logger,
    })

    const mismatchEntry = entries.find((e) => e.level === "error" && stripAnsi(e.message).includes("MISMATCH"))
    expect(mismatchEntry).toBeDefined()
    expect(mismatchEntry?.metadata).toEqual({ hostEnv: "staging", vaultEnv: "production" })
  })

  it("warns when vaultEnvKey is missing in the source", () => {
    const { logger, entries } = captureLogger()
    const source = StaticSource({})
    bootDiagnostics({
      source,
      hostEnv: "staging",
      vaultEnvKey: "ENV",
      logger,
    })

    expect(entries.some((e) => e.level === "warn" && e.message.includes("ENV"))).toBe(true)
  })

  it("calls process.exit(1) when failOn='missing' and a required key is absent", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`)
    }) as never)
    const { logger } = captureLogger()
    const source = StaticSource({})

    expect(() =>
      bootDiagnostics({
        source,
        required: ["GONE"],
        failOn: "missing",
        logger,
      }),
    ).toThrowError("process.exit(1)")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it("does NOT call process.exit when failOn is not 'missing'", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`)
    }) as never)
    const { logger } = captureLogger()
    const source = StaticSource({})
    const result = bootDiagnostics({
      source,
      required: ["GONE"],
      failOn: "never",
      logger,
    })
    expect(result.isLeft()).toBe(true)
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it("echoes the source name in the header", () => {
    const { logger, entries } = captureLogger()
    const composed = Layered([StaticSource({}, "primary"), StaticSource({}, "fallback")])
    bootDiagnostics({ source: composed, serviceName: "test-app", logger })

    expect(entries.some((e) => e.message.includes("test-app"))).toBe(true)
    expect(entries.some((e) => e.message.includes("primary > fallback"))).toBe(true)
  })

  it("uses consoleBootLogger as the default when no logger is provided", () => {
    // Just verify it runs without throwing — actual output not asserted.
    const infoSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const source = StaticSource({ A: "1" })
    bootDiagnostics({ source, required: ["A"] })
    expect(infoSpy).toHaveBeenCalled()
  })
})
