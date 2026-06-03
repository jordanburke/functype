import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { Layered, ProcessEnvSource, StaticSource, type ConfigSource } from "../../src/config"

describe("StaticSource", () => {
  it("returns Some for known keys, None for unknown", () => {
    const src = StaticSource({ ENV: "local", PORT: "3000" }, "defaults")
    expect(src.name).toBe("defaults")
    expect(src.get("ENV").orElse("")).toBe("local")
    expect(src.get("PORT").orElse("")).toBe("3000")
    expect(src.get("MISSING").isEmpty).toBe(true)
  })

  it("defaults the name to 'static' when not provided", () => {
    const src = StaticSource({ k: "v" })
    expect(src.name).toBe("static")
  })
})

describe("ProcessEnvSource", () => {
  const originalEnv = process.env
  beforeEach(() => {
    process.env = { ...originalEnv }
  })
  afterEach(() => {
    process.env = originalEnv
  })

  it("reads from process.env", () => {
    process.env.FUNCTYPE_OS_TEST_KEY = "from-env"
    const src = ProcessEnvSource()
    expect(src.name).toBe("process.env")
    expect(src.get("FUNCTYPE_OS_TEST_KEY").orElse("")).toBe("from-env")
  })

  it("returns None for missing env vars", () => {
    delete process.env.FUNCTYPE_OS_MISSING
    const src = ProcessEnvSource()
    expect(src.get("FUNCTYPE_OS_MISSING").isEmpty).toBe(true)
  })
})

describe("Layered", () => {
  it("returns the first Some across sources (first-wins precedence)", () => {
    const primary = StaticSource({ A: "primary-A" }, "primary")
    const secondary = StaticSource({ A: "secondary-A", B: "secondary-B" }, "secondary")
    const composed = Layered([primary, secondary])

    // A is in both; primary wins
    expect(composed.get("A").orElse("")).toBe("primary-A")
    // B only in secondary; falls through
    expect(composed.get("B").orElse("")).toBe("secondary-B")
    // neither: None
    expect(composed.get("MISSING").isEmpty).toBe(true)
  })

  it("composes the name field as 'src1 > src2 > src3'", () => {
    const a = StaticSource({}, "a")
    const b = StaticSource({}, "b")
    const c = StaticSource({}, "c")
    expect(Layered([a, b, c]).name).toBe("a > b > c")
  })

  it("works with an empty source list (None for everything)", () => {
    const empty = Layered([])
    expect(empty.name).toBe("")
    expect(empty.get("anything").isEmpty).toBe(true)
  })

  it("composes process.env over a static fallback", () => {
    process.env.LAYERED_TEST_OVERRIDE = "from-env"
    const config: ConfigSource = Layered([
      ProcessEnvSource(),
      StaticSource({ LAYERED_TEST_OVERRIDE: "from-static", FALLBACK_ONLY: "static-only" }, "fallback"),
    ])
    expect(config.get("LAYERED_TEST_OVERRIDE").orElse("")).toBe("from-env")
    expect(config.get("FALLBACK_ONLY").orElse("")).toBe("static-only")
    delete process.env.LAYERED_TEST_OVERRIDE
  })
})
