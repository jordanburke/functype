/**
 * Every `fromJSON` and `fromBinary` reads what `serialize()` writes.
 *
 * 2.0 removed YAML (#276 §4, #514): it wasn't YAML a YAML parser could read, and JSON and binary
 * carry the same data. These cases are the ones the YAML round-trip spec pinned, run through the
 * two formats that remain.
 */
import { describe, expect, it } from "vitest"

import * as functype from "@/index"
import { Either, LazyList, Left, List, Map, None, Obj, Option, Right, Set, Some, Stack, Try, Tuple } from "@/index"

type Serialized = { serialize(): { toJSON(): string; toBinary(): string } }

const formats = [
  ["JSON", (value: Serialized): string => value.serialize().toJSON(), "fromJSON"],
  ["binary", (value: Serialized): string => value.serialize().toBinary(), "fromBinary"],
] as const

describe.each(formats)("%s round-trips", (_name, write, read) => {
  it("List, Set, Stack and Map", () => {
    expect(List[read]<number>(write(List([3, 1, 2]))).toArray()).toEqual([3, 1, 2])
    expect(List[read]<number>(write(List<number>([]))).toArray()).toEqual([])
    expect(Set[read]<number>(write(Set([3, 1, 2]))).toArray()).toEqual([3, 1, 2])
    expect(Stack[read]<number>(write(Stack([1, 2]))).toArray()).toEqual([1, 2])
    expect([...Map[read]<string, number>(write(Map([["a", 1]])))]).toEqual([["a", 1]])
  })

  it("keeps values with colons, nested values and nulls", () => {
    const values = ["a: b", "key: value: more", { nested: ["x: y"] }, null]
    expect(List[read]<unknown>(write(List(values))).toArray()).toEqual(values)
    expect(Option[read]<string>(write(Option("a: b"))).orUndefined()).toBe("a: b")
  })

  it("Option keeps Some and None", () => {
    const some = Option[read]<number>(write(Some(1)))
    expect([some._tag, some.orUndefined()]).toEqual(["Some", 1])
    expect(Option[read]<number>(write(None<number>()))._tag).toBe("None")
  })

  it("Either keeps Right and Left", () => {
    const right = Either[read]<string, number>(write(Right<string, number>(1)))
    expect([right._tag, right.value]).toEqual(["Right", 1])
    const left = Either[read]<string, number>(write(Left<string, number>("boom")))
    expect([left._tag, left.value]).toEqual(["Left", "boom"])
  })

  it("Try keeps a Success as a Success", () => {
    const success = Try[read]<number>(write(Try(() => 1)))
    expect([success._tag, success.orUndefined()]).toEqual(["Success", 1])
    expect(Try[read]<{ a: number }>(write(Try(() => ({ a: 1 })))).orUndefined()).toEqual({ a: 1 })
  })

  it("Try keeps a Failure's error, name and message", () => {
    const failure = Try[read]<number>(
      write(
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
})

describe("Try.fromJSON on a Failure with a null error", () => {
  it("gives a Failure with an empty message instead of throwing", () => {
    const failure = Try.fromJSON('{"_tag":"Failure","error":null}')
    expect(failure.fold((e) => e.message, String)).toBe("")
  })
})

describe("YAML is gone (#276 section 4)", () => {
  it("serialize() writes JSON and binary only", () => {
    const values: Serialized[] = [
      List([1]),
      Set([1]),
      Stack([1]),
      Map([["a", 1]]),
      LazyList([1]),
      Obj({ a: 1 }),
      Tuple([1, "a"]),
      Some(1),
      None<number>(),
      Right<string, number>(1),
      Left<string, number>("e"),
      Try(() => 1),
      Try<number>(() => {
        throw new Error("boom")
      }),
    ]
    for (const value of values) {
      expect(Object.keys(value.serialize()).sort()).toEqual(["toBinary", "toJSON"])
    }
  })

  it("no companion reads YAML, and the serializer helpers are gone", () => {
    for (const companion of [List, Set, Stack, Map, Option, Either, Try]) {
      expect("fromYAML" in companion).toBe(false)
    }
    expect("fromYAML" in functype).toBe(false)
    expect("createCustomSerializer" in functype).toBe(false)
    expect("fromYAML" in functype.createSerializationCompanion(() => 1)).toBe(false)
  })
})
