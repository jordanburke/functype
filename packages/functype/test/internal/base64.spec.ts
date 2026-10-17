import { afterEach, describe, expect, it, vi } from "vitest"

import { Either, List, Map, Obj, Option, Set, Stack, Try } from "../../src"
import { base64ToUtf8, utf8ToBase64 } from "../../src/internal/base64"

const SAMPLES = [
  ["empty", ""],
  ["ASCII", '{"_tag":"Some","value":"hello"}'],
  ["Latin-1", "café naïve"],
  ["CJK", "日本語のテキスト"],
  ["emoji", "otters 🦦 and a 👩‍💻"],
  ["larger than one chunk", "ü".repeat(70_000)],
] as const

describe("internal base64", () => {
  describe.each(SAMPLES)("%s", (_label, text) => {
    it("encodes byte-for-byte like Buffer", () => {
      expect(utf8ToBase64(text)).toBe(Buffer.from(text).toString("base64"))
    })

    it("decodes what Buffer encoded", () => {
      expect(base64ToUtf8(Buffer.from(text).toString("base64"))).toBe(text)
    })
  })

  it("decodes without padding, with whitespace, and in the URL-safe alphabet", () => {
    const text = "subjects?>~ 🦦"
    const standard = Buffer.from(text).toString("base64")
    expect(standard).toMatch(/[+/=]/)
    expect(base64ToUtf8(standard.replace(/=+$/, ""))).toBe(text)
    expect(base64ToUtf8(standard.replace(/(.{4})/g, "$1\n"))).toBe(text)
    expect(base64ToUtf8(Buffer.from(text).toString("base64url"))).toBe(text)
  })

  it("throws on a character outside the alphabet, where Buffer skipped it", () => {
    expect(() => base64ToUtf8("aGVs!bG8=")).toThrow()
  })

  it("keeps a leading byte-order mark, as Buffer does", () => {
    const withBom = Buffer.from([0xef, 0xbb, 0xbf, 0x41]).toString("base64")
    expect(base64ToUtf8(withBom)).toBe(Buffer.from(withBom, "base64").toString())
  })
})

describe("toBinary / fromBinary without Buffer", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("imports without TextEncoder or TextDecoder", async () => {
    // Jest 29's jsdom has neither; importing functype must not touch them.
    vi.stubGlobal("TextEncoder", undefined)
    vi.stubGlobal("TextDecoder", undefined)
    vi.resetModules()
    await expect(import("../../src")).resolves.toHaveProperty("Option")
  })

  it("round-trips every serializable type when Buffer does not exist", () => {
    // Cloudflare Workers without nodejs_compat has no Buffer global.
    vi.stubGlobal("Buffer", undefined)
    const text = "naïve 🦦"

    expect(Option.fromBinary(Option(text).serialize().toBinary()).orThrow()).toBe(text)
    expect(Either.fromBinary(Either.right<string, string>(text).serialize().toBinary()).orThrow()).toBe(text)
    expect(
      Try.fromBinary(
        Try(() => text)
          .serialize()
          .toBinary(),
      ).orThrow(),
    ).toBe(text)
    expect(List.fromBinary(List([text]).serialize().toBinary()).toArray()).toEqual([text])
    expect(Set.fromBinary(Set([text]).serialize().toBinary()).toArray()).toEqual([text])
    expect(
      Map.fromBinary(
        Map([[text, 1]])
          .serialize()
          .toBinary(),
      )
        .get(text)
        .orThrow(),
    ).toBe(1)
    expect(Stack.fromBinary<string>(Stack.of(text).serialize().toBinary()).toArray()).toEqual([text])
    expect(Obj.fromBinary<{ text: string }>(Obj({ text }).serialize().toBinary()).value()).toEqual({ text })
  })

  it("reads binaries written by the Buffer-based implementation", () => {
    const legacy = Buffer.from(Option("café 🦦").serialize().toJSON()).toString("base64")
    vi.stubGlobal("Buffer", undefined)
    expect(Option.fromBinary(legacy).orThrow()).toBe("café 🦦")
  })
})
