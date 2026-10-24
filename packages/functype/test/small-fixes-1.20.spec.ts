import { describe, expect, expectTypeOf, it } from "vitest"

import { Decoder, DecoderError, Http, HttpError, LazyList, Left, Option, Right, Stack, Try } from "@/index"

describe("toString prints an Error by name and message", () => {
  it("Try", () => {
    expect(Try(() => 42).toString()).toBe("Success(42)")
    expect(
      Try(() => {
        throw new TypeError("bad input")
      }).toString(),
    ).toBe("Failure(TypeError: bad input)")
    expect(Try.failure("plain").toString()).toBe("Failure(Error: plain)")
  })

  it("Either and Option", () => {
    expect(Left(new Error("boom")).toString()).toBe("Left(Error: boom)")
    expect(Right(new RangeError("r")).toString()).toBe("Right(RangeError: r)")
    expect(Option(new Error("o")).toString()).toBe("Some(Error: o)")
  })

  it("leaves non-Error values as before", () => {
    expect(Left("error").toString()).toBe('Left("error")')
    expect(Right({ b: 2, a: 1 }).toString()).toBe('Right({"a":1,"b":2})')
    expect(Option(null).toString()).toBe("None")
  })

  it("leaves serialization unchanged: an Error still serializes as before", () => {
    expect(Left(new Error("boom")).serialize().toJSON()).toBe('{"@functype":"Either","_tag":"Left","value":{}}')
  })
})

describe("Stack.of and LazyList.of take any number of values", () => {
  it("Stack.of matches the Stack constructor", () => {
    expect(Stack.of(1, 2, 3).toArray()).toEqual(Stack([1, 2, 3]).toArray())
    expect(Stack.of(1, 2, 3).peek().orThrow()).toBe(3)
    expect(Stack.of(7).toArray()).toEqual([7])
    expect(Stack.of<number>().isEmpty).toBe(true)
    expectTypeOf(Stack.of(1, 2)).toEqualTypeOf<Stack<number>>()
  })

  it("LazyList.of matches LazyList.from", () => {
    expect(LazyList.of(1, 2, 3).toArray()).toEqual(LazyList.from(1, 2, 3).toArray())
    expect(
      LazyList.of(42)
        .map((x) => x * 2)
        .toArray(),
    ).toEqual([84])
    expectTypeOf(LazyList.of("a", "b")).toEqualTypeOf<LazyList<string>>()
  })
})

describe("companions carry the _tag their type declares", () => {
  it("Http, HttpError, Decoder and DecoderError", () => {
    expect(Http._tag).toBe("Http")
    expect(HttpError._tag).toBe("HttpError")
    expect(Decoder._tag).toBe("Decoder")
    expect(DecoderError._tag).toBe("DecoderError")
  })

  it("keeps the companion functions", () => {
    expect(HttpError.networkError("u", "GET", new Error("x"))._tag).toBe("NetworkError")
    expect(Decoder.string("s").orThrow()).toBe("s")
  })
})
