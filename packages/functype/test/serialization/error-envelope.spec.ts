import { describe, expect, it } from "vitest"

import { deserializeError, serializeError } from "@/serialization/error-envelope"

describe("error-envelope", () => {
  describe("serializeError", () => {
    it("captures name, message, and stack of a plain Error", () => {
      const err = new Error("boom")
      const s = serializeError(err)
      expect(s.name).toBe("Error")
      expect(s.message).toBe("boom")
      expect(s.stack).toBe(err.stack)
      expect(s.cause).toBeUndefined()
    })

    it("preserves Error subclass name as discriminator", () => {
      const err = new TypeError("not a function")
      const s = serializeError(err)
      expect(s.name).toBe("TypeError")
      expect(s.message).toBe("not a function")
    })

    it("recursively serializes a cause that is itself an Error", () => {
      const inner = new TypeError("inner")
      const outer = new Error("outer", { cause: inner })
      const s = serializeError(outer)
      expect(s.cause).toBeTypeOf("object")
      const causeEnvelope = s.cause as { name: string; message: string }
      expect(causeEnvelope.name).toBe("TypeError")
      expect(causeEnvelope.message).toBe("inner")
    })

    it("emits a string cause when cause is a bare string", () => {
      const err = new Error("outer", { cause: "raw reason" })
      const s = serializeError(err)
      expect(s.cause).toBe("raw reason")
    })

    it("captures non-Error throwables under NonErrorThrowable", () => {
      const s = serializeError("just a string")
      expect(s.name).toBe("NonErrorThrowable")
      expect(s.message).toBe("just a string")
    })

    it("captures non-Error objects via safeStringify", () => {
      const s = serializeError({ foo: 1, bar: "x" })
      expect(s.name).toBe("NonErrorThrowable")
      expect(s.message).toContain("foo")
      expect(s.message).toContain("bar")
    })

    it("omits stack and cause fields when absent", () => {
      const err = new Error("bare")
      // Some runtimes omit stack on a freshly-constructed Error in unusual harnesses;
      // simulate by clearing it explicitly to verify the conditional is respected.
      err.stack = undefined as unknown as string
      const s = serializeError(err)
      expect("stack" in s).toBe(false)
      expect("cause" in s).toBe(false)
    })
  })

  describe("deserializeError", () => {
    it("reconstructs name, message, and stack", () => {
      const original = new TypeError("nope")
      const round = deserializeError(serializeError(original))
      expect(round).toBeInstanceOf(Error)
      expect(round.name).toBe("TypeError")
      expect(round.message).toBe("nope")
      expect(round.stack).toBe(original.stack)
    })

    it("does NOT reconstruct subclass identity", () => {
      const original = new TypeError("nope")
      const round = deserializeError(serializeError(original))
      expect(round instanceof TypeError).toBe(false)
      // But name-based discriminator still works:
      expect(round.name).toBe("TypeError")
    })

    it("rebuilds the cause chain recursively", () => {
      const inner = new RangeError("inner")
      const outer = new Error("outer", { cause: inner })
      const round = deserializeError(serializeError(outer))
      const cause = (round as Error & { cause?: unknown }).cause as Error
      expect(cause).toBeInstanceOf(Error)
      expect(cause.name).toBe("RangeError")
      expect(cause.message).toBe("inner")
    })

    it("accepts a bare string as shorthand cause", () => {
      const e = deserializeError("plain reason")
      expect(e).toBeInstanceOf(Error)
      expect(e.message).toBe("plain reason")
    })

    it("rebuilds a NonErrorThrowable as a plain Error", () => {
      const round = deserializeError(serializeError("string thrown"))
      expect(round.name).toBe("NonErrorThrowable")
      expect(round.message).toBe("string thrown")
    })
  })

  describe("round-trip law", () => {
    it("preserves name + message + stack + cause depth=3", () => {
      const a = new TypeError("level 1")
      const b = new RangeError("level 2", { cause: a })
      const c = new Error("level 3", { cause: b })
      const round = deserializeError(serializeError(c))

      expect(round.name).toBe("Error")
      expect(round.message).toBe("level 3")

      const level2 = (round as Error & { cause?: unknown }).cause as Error
      expect(level2.name).toBe("RangeError")
      expect(level2.message).toBe("level 2")

      const level1 = (level2 as Error & { cause?: unknown }).cause as Error
      expect(level1.name).toBe("TypeError")
      expect(level1.message).toBe("level 1")
    })
  })
})
