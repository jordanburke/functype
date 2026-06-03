import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { gray, green, red, yellow } from "../../src/config/colors"
import { maskValue } from "../../src/config/mask"

describe("colors", () => {
  const originalEnv = process.env
  const originalIsTTY = process.stdout.isTTY

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NO_COLOR
    delete process.env.FORCE_COLOR
  })

  afterEach(() => {
    process.env = originalEnv
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: originalIsTTY })
  })

  it("emits ANSI escapes when stdout is a TTY and no overrides are set", () => {
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true })
    const out = green("hello")
    expect(out).toBe("\x1b[32mhello\x1b[0m")
  })

  it("emits plain text when stdout is not a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: false })
    expect(red("oops")).toBe("oops")
  })

  it("respects NO_COLOR — never colorizes even on a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true })
    process.env.NO_COLOR = "1"
    expect(yellow("warn")).toBe("warn")
  })

  it("respects FORCE_COLOR — colorizes even when not a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: false })
    process.env.FORCE_COLOR = "1"
    expect(gray("dim")).toBe("\x1b[90mdim\x1b[0m")
  })

  it("treats NO_COLOR as higher priority than FORCE_COLOR", () => {
    process.env.NO_COLOR = "1"
    process.env.FORCE_COLOR = "1"
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true })
    expect(green("x")).toBe("x")
  })
})

describe("maskValue", () => {
  it("returns '****' for values 8 chars or fewer", () => {
    expect(maskValue("")).toBe("****")
    expect(maskValue("a")).toBe("****")
    expect(maskValue("12345678")).toBe("****")
  })

  it("returns 'first2****last2' for longer values", () => {
    expect(maskValue("123456789")).toBe("12****89")
    expect(maskValue("supersecretvalue")).toBe("su****ue")
  })

  it("does not leak length for short values, partially exposes for longer", () => {
    expect(maskValue("abc")).toBe("****")
    expect(maskValue("abcdefghijklmnop")).toBe("ab****op")
  })
})
