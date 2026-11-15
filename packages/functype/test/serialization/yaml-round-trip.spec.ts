/**
 * Every `fromYAML` reads what `serialize().toYAML()` writes.
 *
 * Since 1.2.0, `toYAML` writes a `@functype` line first:
 *
 *   @functype: List
 *   _tag: List
 *   value: [1,2]
 *
 * The readers read fixed line numbers from the two-line format before it (`_tag`, then `value`),
 * so List, Set, Stack, Map, Option and Either threw, and Try read a Success back as a Failure.
 * They now read each field by its key, so both formats work.
 */
import { describe, expect, it } from "vitest"

import { Either, Left, List, Map, None, Option, Right, Set, Some, Stack, Try } from "@/index"

const yamlOf = (value: { serialize(): { toYAML(): string } }): string => value.serialize().toYAML()

describe("fromYAML reads what toYAML writes", () => {
  it("List, Set, Stack and Map", () => {
    expect(List.fromYAML<number>(yamlOf(List([3, 1, 2]))).toArray()).toEqual([3, 1, 2])
    expect(List.fromYAML<number>(yamlOf(List<number>([]))).toArray()).toEqual([])
    expect(Set.fromYAML<number>(yamlOf(Set([3, 1, 2]))).toArray()).toEqual([3, 1, 2])
    expect(Stack.fromYAML<number>(yamlOf(Stack([1, 2]))).toArray()).toEqual([1, 2])
    expect([...Map.fromYAML<string, number>(yamlOf(Map([["a", 1]])))]).toEqual([["a", 1]])
  })

  it("keeps values that contain the YAML separator, nested values and nulls", () => {
    const values = ["a: b", "key: value: more", { nested: ["x: y"] }, null]
    expect(List.fromYAML<unknown>(yamlOf(List(values))).toArray()).toEqual(values)
    expect(Option.fromYAML<string>(yamlOf(Option("a: b"))).orUndefined()).toBe("a: b")
  })

  it("Option keeps Some and None", () => {
    const some = Option.fromYAML<number>(yamlOf(Some(1)))
    expect([some._tag, some.orUndefined()]).toEqual(["Some", 1])
    expect(Option.fromYAML<number>(yamlOf(None<number>()))._tag).toBe("None")
  })

  it("Either keeps Right and Left", () => {
    const right = Either.fromYAML<string, number>(yamlOf(Right<string, number>(1)))
    expect([right._tag, right.value]).toEqual(["Right", 1])
    const left = Either.fromYAML<string, number>(yamlOf(Left<string, number>("boom")))
    expect([left._tag, left.value]).toEqual(["Left", "boom"])
  })

  it("Try keeps a Success as a Success", () => {
    const success = Try.fromYAML<number>(yamlOf(Try(() => 1)))
    expect([success._tag, success.orUndefined()]).toEqual(["Success", 1])
    expect(Try.fromYAML<{ a: number }>(yamlOf(Try(() => ({ a: 1 })))).orUndefined()).toEqual({ a: 1 })
  })

  it("Try keeps a Failure's error, name and message", () => {
    const failure = Try.fromYAML<number>(
      yamlOf(
        Try<number>(() => {
          throw new TypeError("bad input: 3")
        }),
      ),
    )
    expect(failure._tag).toBe("Failure")
    const error = failure.fold(
      (e) => e,
      () => undefined,
    )
    expect(error?.name).toBe("TypeError")
    expect(error?.message).toBe("bad input: 3")
  })

  it("an undefined value reads back as undefined", () => {
    const success = Try.fromYAML<undefined>(yamlOf(Try(() => undefined)))
    expect(success._tag).toBe("Success")
    expect(success.orUndefined()).toBeUndefined()
  })
})

describe("fromYAML still reads the two-line format from before 1.2.0", () => {
  it("reads _tag then value", () => {
    expect(List.fromYAML<number>("_tag: List\nvalue: [1,2]").toArray()).toEqual([1, 2])
    expect(Set.fromYAML<number>("_tag: Set\nvalue: [1,2]").toArray()).toEqual([1, 2])
    expect(Stack.fromYAML<number>("_tag: Stack\nvalue: [1,2]").toArray()).toEqual([1, 2])
    expect([...Map.fromYAML<string, number>('_tag: Map\nvalue: [["a",1]]')]).toEqual([["a", 1]])
    expect(Option.fromYAML<number>("_tag: Some\nvalue: 1").orUndefined()).toBe(1)
    expect(Option.fromYAML<number>("_tag: None\nvalue: null")._tag).toBe("None")
    expect(Either.fromYAML<string, number>("_tag: Right\nvalue: 1").value).toBe(1)
    expect(Either.fromYAML<string, number>('_tag: Left\nvalue: "e"').value).toBe("e")
    expect(Try.fromYAML<number>("_tag: Success\nvalue: 1").orUndefined()).toBe(1)
  })

  it("reads the 1.1.0 flat Failure shape", () => {
    const failure = Try.fromYAML<number>('_tag: Failure\nerror: "boom"\nstack: "Error: boom"')
    const error = failure.fold(
      (e) => e,
      () => undefined,
    )
    expect(error?.message).toBe("boom")
    expect(error?.stack).toBe("Error: boom")
  })
})

describe("fromYAML on input it can't read", () => {
  it("keeps each type's result for a missing value or tag", () => {
    expect(List.fromYAML<number>("@functype: List").toArray()).toEqual([])
    expect(Set.fromYAML<number>("").toArray()).toEqual([])
    expect(Stack.fromYAML<number>("@functype: Stack\nvalue: ").toArray()).toEqual([])
    expect(Map.fromYAML<string, number>("").size).toBe(0)
    expect(Option.fromYAML<number>("")._tag).toBe("None")
    expect(() => Either.fromYAML("@functype: Either\nvalue: 1")).toThrow("Invalid YAML format for Either")
    expect(() => Either.fromYAML("_tag: Right")).toThrow("Invalid YAML format for Either")
    expect(Try.fromYAML("").fold((e) => e.message, String)).toBe("Invalid YAML format for Try")
    expect(Try.fromYAML("_tag: Success").fold((e) => e.message, String)).toBe("Invalid YAML format for Try Success")
    expect(Try.fromYAML("_tag: Failure").fold((e) => e.message, String)).toBe("Invalid YAML format for Try Failure")
  })

  it("rejects another type's YAML, as fromJSON does", () => {
    expect(() => List.fromYAML(yamlOf(Set([1])))).toThrow('List.fromYAML: expected @functype="List", got "Set"')
    expect(() => Option.fromYAML(yamlOf(List([1])))).toThrow('Option.fromYAML: expected @functype="Option"')
    expect(() => Try.fromYAML(yamlOf(Right(1)))).toThrow('Try.fromYAML: expected @functype="Try"')
    expect(() => List.fromJSON(Set([1]).serialize().toJSON())).toThrow(
      'List.fromJSON: expected @functype="List", got "Set"',
    )
  })
})
