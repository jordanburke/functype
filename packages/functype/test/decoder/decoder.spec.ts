import { describe, expect, it } from "vitest"

import { type DecoderError, Decoder, DecoderError as DE } from "@/decoder"
import { Left, Right } from "@/either/Either"
import { List } from "@/list/List"
import { None, Option, Some } from "@/option/Option"

describe("Decoder", () => {
  describe("primitives", () => {
    it("Decoder.string accepts strings, rejects non-strings", () => {
      expect(Decoder.string("hello").value).toBe("hello")
      const result = Decoder.string(42)
      expect(result.isLeft()).toBe(true)
      result.fold(
        (e) => {
          expect(e._tag).toBe("Leaf")
          if (e._tag === "Leaf") expect(e.message).toContain("string")
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("Decoder.number accepts numbers, rejects non-numbers", () => {
      expect(Decoder.number(42).value).toBe(42)
      expect(Decoder.number("nope").isLeft()).toBe(true)
    })

    it("Decoder.boolean accepts booleans", () => {
      expect(Decoder.boolean(true).value).toBe(true)
      expect(Decoder.boolean(false).value).toBe(false)
      expect(Decoder.boolean(0).isLeft()).toBe(true)
    })

    it("Decoder.unknown accepts anything", () => {
      expect(Decoder.unknown({ any: "thing" }).isRight()).toBe(true)
      expect(Decoder.unknown(null).isRight()).toBe(true)
      expect(Decoder.unknown(42).isRight()).toBe(true)
    })

    it("Decoder.nullable allows null/undefined", () => {
      const d = Decoder.nullable(Decoder.string)
      expect(d(null).value).toBe(null)
      expect(d(undefined).value).toBe(null)
      expect(d("hi").value).toBe("hi")
      expect(d(42).isLeft()).toBe(true)
    })
  })

  describe("Decoder.option (null-bias)", () => {
    it("null → Right(None)", () => {
      const d = Decoder.option(Decoder.number)
      const result = d(null)
      expect(result.isRight()).toBe(true)
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (opt) => expect(opt.isEmpty).toBe(true),
      )
    })

    it("value → Right(Some(value))", () => {
      const d = Decoder.option(Decoder.number)
      const result = d(42)
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (opt) => {
          expect(opt.isSome()).toBe(true)
          if (opt.isSome()) expect(opt.value).toBe(42)
        },
      )
    })

    it("propagates inner decoder failure", () => {
      const d = Decoder.option(Decoder.number)
      expect(d("not a number").isLeft()).toBe(true)
    })
  })

  describe("Decoder.list", () => {
    it("decodes a homogeneous array", () => {
      const d = Decoder.list(Decoder.number)
      const result = d([1, 2, 3])
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (list) => expect(list.toArray()).toEqual([1, 2, 3]),
      )
    })

    it("accumulates per-element failures with index paths", () => {
      const d = Decoder.list(Decoder.number)
      const result = d([1, "two", 3, "four"])
      expect(result.isLeft()).toBe(true)
      result.fold(
        (e) => {
          expect(e._tag).toBe("Composite")
          const flat = DE.flatten(e).toArray()
          expect(flat.length).toBe(2)
          expect(flat[0]!.path).toEqual(["[1]"])
          expect(flat[1]!.path).toEqual(["[3]"])
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("rejects non-arrays", () => {
      expect(Decoder.list(Decoder.string)("not an array").isLeft()).toBe(true)
    })
  })

  describe("Decoder.object (accumulating)", () => {
    it("decodes an object with the declared shape", () => {
      const d = Decoder.object({ name: Decoder.string, age: Decoder.number })
      const result = d({ name: "Alice", age: 30 })
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (obj) => expect(obj).toEqual({ name: "Alice", age: 30 }),
      )
    })

    it("accumulates field failures into a Composite (multi-field)", () => {
      const d = Decoder.object({ name: Decoder.string, age: Decoder.number })
      const result = d({ name: 99, age: "thirty" })
      expect(result.isLeft()).toBe(true)
      result.fold(
        (e) => {
          expect(e._tag).toBe("Composite")
          if (e._tag === "Composite") {
            const paths = e.children.toArray().map((c) => c.path)
            expect(paths).toEqual(expect.arrayContaining([["name"], ["age"]]))
          }
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("unwraps to a Leaf when only one field fails", () => {
      const d = Decoder.object({ name: Decoder.string, age: Decoder.number })
      const result = d({ name: "Alice", age: "bad" })
      result.fold(
        (e) => {
          expect(e._tag).toBe("Leaf")
          if (e._tag === "Leaf") expect(e.path).toEqual(["age"])
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("composes nested objects with full nested leaf paths", () => {
      const d = Decoder.object({
        user: Decoder.object({ name: Decoder.string, age: Decoder.number }),
      })
      const result = d({ user: { name: 99, age: "bad" } })
      result.fold(
        (e) => {
          const leaves = DE.flatten(e).toArray()
          expect(leaves.length).toBe(2)
          // Every leaf should carry its full absolute path: user.name, user.age
          leaves.forEach((leaf) => expect(leaf.path[0]).toBe("user"))
          const paths = leaves.map((l) => l.path)
          expect(paths).toEqual(
            expect.arrayContaining([
              ["user", "name"],
              ["user", "age"],
            ]),
          )
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })
  })

  describe("Decoder.either.envelope", () => {
    it("decodes {ok: T} as Right", () => {
      const d = Decoder.either.envelope({ ok: Decoder.number, err: Decoder.string })
      const result = d({ ok: 42 })
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (e) => {
          expect(e.isRight()).toBe(true)
          if (e.isRight()) expect(e.value).toBe(42)
        },
      )
    })

    it("decodes {err: E} as Left", () => {
      const d = Decoder.either.envelope({ ok: Decoder.number, err: Decoder.string })
      const result = d({ err: "bad" })
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (e) => {
          expect(e.isLeft()).toBe(true)
          if (e.isLeft()) expect(e.value).toBe("bad")
        },
      )
    })

    it("rejects envelopes missing both keys", () => {
      const d = Decoder.either.envelope({ ok: Decoder.number, err: Decoder.string })
      expect(d({}).isLeft()).toBe(true)
    })
  })

  describe("Decoder.tagged.* (functype-to-functype round-trip)", () => {
    it("tagged.option decodes {_tag: 'Some', value} to Some", () => {
      const d = Decoder.tagged.option(Decoder.number)
      const result = d({ _tag: "Some", value: 42 })
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (opt) => {
          expect(opt.isSome()).toBe(true)
          if (opt.isSome()) expect(opt.value).toBe(42)
        },
      )
    })

    it("tagged.option decodes {_tag: 'None'} to None", () => {
      const d = Decoder.tagged.option(Decoder.number)
      const result = d({ _tag: "None", value: null })
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (opt) => expect(opt.isEmpty).toBe(true),
      )
    })

    it("tagged.list decodes {_tag: 'List', value: [...]}", () => {
      const d = Decoder.tagged.list(Decoder.string)
      const result = d({ _tag: "List", value: ["a", "b", "c"] })
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (list) => expect(list.toArray()).toEqual(["a", "b", "c"]),
      )
    })

    it("tagged.either decodes {_tag: 'Right', value} to Right", () => {
      const d = Decoder.tagged.either(Decoder.string, Decoder.number)
      const result = d({ _tag: "Right", value: 42 })
      result.fold(
        () => {
          throw new Error("Expected Right")
        },
        (e) => {
          expect(e.isRight()).toBe(true)
          if (e.isRight()) expect(e.value).toBe(42)
        },
      )
    })
  })

  describe("DecoderError helpers", () => {
    it("flatten collects all leaves from a Composite tree", () => {
      const d = Decoder.object({ name: Decoder.string, age: Decoder.number, tags: Decoder.list(Decoder.string) })
      const result = d({ name: 99, age: "bad", tags: [1, "ok", 3] })
      result.fold(
        (e) => {
          const flat = DE.flatten(e).toArray()
          // name (1) + age (1) + tags.[0] (1) + tags.[2] (1) = 4
          expect(flat.length).toBe(4)
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("format renders a multi-line summary", () => {
      const d = Decoder.object({ name: Decoder.string, age: Decoder.number })
      const result = d({ name: 99, age: "bad" })
      result.fold(
        (e) => {
          const text = DE.format(e)
          expect(text).toContain("name")
          expect(text).toContain("age")
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })
  })

  describe("pluggability — third-party validators", () => {
    it("a hand-rolled (raw) => Either<DecoderError, T> IS a Decoder<T>", () => {
      // Demonstrates the "no plugin registration" property.
      const fakeEmailDecoder = (raw: unknown) =>
        typeof raw === "string" && raw.includes("@")
          ? Right<DecoderError, string>(raw)
          : Left<DecoderError, string>({ _tag: "Leaf", path: [], message: "not an email" })

      const result = fakeEmailDecoder("a@b.com")
      expect(result.isRight()).toBe(true)
      const bad = fakeEmailDecoder("nope")
      expect(bad.isLeft()).toBe(true)

      // Composes with built-in combinators
      const userDecoder = Decoder.object({ name: Decoder.string, email: fakeEmailDecoder })
      const ok = userDecoder({ name: "Alice", email: "alice@example.com" })
      ok.fold(
        () => {
          throw new Error("Expected Right")
        },
        (u) => expect(u.email).toBe("alice@example.com"),
      )
    })
  })

  // Some tests import Some/None to satisfy unused-import lint
  it("type-only sanity — Some/None constructors still produce Options", () => {
    expect(Some(1).isSome()).toBe(true)
    expect(None<number>().isEmpty).toBe(true)
    expect(Option(1).isSome()).toBe(true)
    expect(List([1, 2]).toArray()).toEqual([1, 2])
  })
})
