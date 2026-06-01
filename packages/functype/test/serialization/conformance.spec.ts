/**
 * Parametrized round-trip conformance test for the 1.2.0 universal-deserialize
 * work. Verifies the keystone guarantee for every Serializable type:
 *
 *   For value `x: X`, `Serialization.deserialize(Serialization.serialize(x))`
 *   produces a value equal-in-data AND with methods intact (.isLeft, .fold,
 *   .map, etc.) — the round-trip law DBOS and every other persistence
 *   boundary depends on.
 *
 * Also covers:
 *  - Nested envelopes (Right(Some(List([1,2,3]))) rebuilds fully)
 *  - Plain JSON passthrough (non-functype data walks through unchanged)
 *  - Effect-collision sentinel ({_tag:"Some"} without @functype must NOT be
 *    claimed as functype data)
 *  - Malformed input → Failure
 *  - Lazy thunk-success and thunk-failure paths
 *  - Try with nested cause chain
 *  - Task with stack preserved
 */

import { describe, expect, it } from "vitest"

import { Either, Left, Right } from "@/either"
import { Lazy } from "@/lazy"
import { LazyList } from "@/list/LazyList"
import { List } from "@/list/List"
import { Map as FunctypeMap } from "@/map/Map"
import { Obj } from "@/obj/Obj"
import { None, Option, Some } from "@/option"
import * as Serialization from "@/serialization/Serialization"
// 1.2.x: JSONValue is reachable two ways — via the `Serialization` namespace
// (`Serialization.JSONValue`) AND via a direct named import from the
// serialization barrel. The line below is a compile-time assertion that the
// top-level path resolves; if the barrel re-export is dropped, this fails.
import type { JSONValue as TopLevelJSONValue } from "@/serialization"
import { Set as FunctypeSet } from "@/set/Set"
import { Stack } from "@/stack/Stack"
import { Task, type TaskOutcome } from "@/core/task/Task"
import type { Throwable } from "@/core/throwable/Throwable"
import { Try } from "@/try"
import { Tuple } from "@/tuple/Tuple"

describe("Serialization conformance — round-trip across all 12 Serializable types", () => {
  describe("Option", () => {
    it("Some round-trips with methods intact", () => {
      const original = Some(42)
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Option<number>
      expect(round.isEmpty).toBe(false)
      expect(round.orElse(0)).toBe(42)
      expect(round.map((x) => x * 2).orElse(0)).toBe(84)
    })

    it("None round-trips", () => {
      const original = None<number>()
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Option<number>
      expect(round.isEmpty).toBe(true)
      expect(round.orElse(99)).toBe(99)
    })
  })

  describe("Either", () => {
    it("Right round-trips with methods intact", () => {
      const original = Right<string, number>(7)
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Either<string, number>
      expect(round.isRight()).toBe(true)
      expect(
        round.fold(
          (l) => `L:${l}`,
          (r) => `R:${r}`,
        ),
      ).toBe("R:7")
      expect(
        round
          .map((x) => x + 1)
          .fold(
            (l) => `L:${l}`,
            (r) => `R:${r}`,
          ),
      ).toBe("R:8")
    })

    it("Left round-trips with methods intact", () => {
      const original = Left<string, number>("nope")
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Either<string, number>
      expect(round.isLeft()).toBe(true)
      expect(
        round.fold(
          (l) => `L:${l}`,
          (r) => `R:${r}`,
        ),
      ).toBe("L:nope")
    })
  })

  describe("Try", () => {
    it("Success round-trips with methods intact", () => {
      const original = Try.success(42)
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Try<number>
      expect(round.isSuccess()).toBe(true)
      expect(round.orThrow()).toBe(42)
      expect(round.map((x) => x * 2).orThrow()).toBe(84)
    })

    it("Failure round-trips with name + message + stack", () => {
      const original = Try.failure<number>(new TypeError("bad input"))
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Try<number>
      expect(round.isFailure()).toBe(true)
      expect(round.error?.name).toBe("TypeError")
      expect(round.error?.message).toBe("bad input")
      expect(round.error?.stack).toBe(original.error?.stack)
    })

    it("Failure round-trips a nested cause chain", () => {
      const inner = new RangeError("inner")
      const outer = new Error("outer", { cause: inner })
      const original = Try.failure<number>(outer)
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Try<number>
      const err = round.error as Error & { cause?: Error }
      expect(err.cause).toBeInstanceOf(Error)
      expect(err.cause?.name).toBe("RangeError")
      expect(err.cause?.message).toBe("inner")
    })
  })

  describe("List", () => {
    it("round-trips with methods intact", () => {
      const original = List([1, 2, 3])
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as List<number>
      expect(round.toArray()).toEqual([1, 2, 3])
      expect(round.map((x) => x * 2).toArray()).toEqual([2, 4, 6])
    })

    it("empty list round-trips", () => {
      const original = List<number>([])
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as List<number>
      expect(round.isEmpty).toBe(true)
    })
  })

  describe("Set", () => {
    it("round-trips with methods intact", () => {
      const original = FunctypeSet([1, 2, 3])
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as FunctypeSet<number>
      expect(round.has(2)).toBe(true)
      expect(round.has(99)).toBe(false)
      expect(round.toArray().sort()).toEqual([1, 2, 3])
    })
  })

  describe("Map", () => {
    it("round-trips with methods intact", () => {
      const original = FunctypeMap<string, number>([
        ["a", 1],
        ["b", 2],
      ])
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as FunctypeMap<
        string,
        number
      >
      expect(round.get("a").orElse(0)).toBe(1)
      expect(round.get("b").orElse(0)).toBe(2)
      expect(round.get("missing").isEmpty).toBe(true)
    })
  })

  describe("Obj", () => {
    it("round-trips with field access intact", () => {
      const original = Obj({ name: "alice", age: 30 })
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Obj<{
        name: string
        age: number
      }>
      const data = round.toValue().value
      expect(data.name).toBe("alice")
      expect(data.age).toBe(30)
    })
  })

  describe("Stack", () => {
    it("round-trips with LIFO semantics intact", () => {
      const original = Stack([1, 2, 3])
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Stack<number>
      expect(round.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("Tuple", () => {
    it("round-trips a heterogeneous tuple", () => {
      const original = Tuple([1, "hello", true] as [number, string, boolean])
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Tuple<
        [number, string, boolean]
      >
      expect(round.get(0)).toBe(1)
      expect(round.get(1)).toBe("hello")
      expect(round.get(2)).toBe(true)
    })
  })

  describe("LazyList", () => {
    it("round-trips a materialized lazy list", () => {
      const original = LazyList([1, 2, 3])
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as LazyList<number>
      expect(round.toArray()).toEqual([1, 2, 3])
    })

    it("materializes an infinite lazy list to a finite array on serialize", () => {
      const original = LazyList.iterate(1, (x) => x + 1).take(5)
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as LazyList<number>
      expect(round.toArray()).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe("Lazy", () => {
    it("forces on serialize and round-trips the materialized value", () => {
      const original = Lazy(() => 42)
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Lazy<number>
      expect(round.orThrow()).toBe(42)
    })

    it("captures a thunk failure as a SerializedError, rethrows on access", () => {
      const original = Lazy<number>(() => {
        throw new TypeError("compute failed")
      })
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Lazy<number>
      let caught: Error | undefined
      try {
        round.orThrow()
      } catch (e) {
        caught = e as Error
      }
      expect(caught?.name).toBe("TypeError")
      expect(caught?.message).toBe("compute failed")
    })
  })

  describe("Task", () => {
    it("Ok round-trips with methods intact", () => {
      const original = Task.ok(42)
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as TaskOutcome<number>
      expect(round.isOk()).toBe(true)
      expect(
        round.fold(
          (_e: Throwable) => -1,
          (v: number) => v,
        ),
      ).toBe(42)
    })

    it("Err round-trips with message + stack preserved", () => {
      const original = Task.err<number>(new TypeError("bad task"))
      const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as TaskOutcome<number>
      expect(round.isErr()).toBe(true)
      // Task wraps thrown values in `Throwable`, which sets `name` to the
      // task's name (default "Task"). The original Error subclass identity
      // (TypeError) is lost at wrap time, not at serialize time — same
      // behavior pre- and post-1.2.0. The message and stack DO survive.
      expect(round.error?.message).toBe("bad task")
      expect(round.error?.stack).toBeTruthy()
    })
  })
})

describe("Serialization — nested envelopes", () => {
  it("rebuilds Right(Some(List([1,2,3]))) end-to-end", () => {
    const original = Right<string, Option<List<number>>>(Some(List([1, 2, 3])))
    const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Either<
      string,
      Option<List<number>>
    >
    expect(round.isRight()).toBe(true)
    const option = round.fold(
      () => None<List<number>>(),
      (v: Option<List<number>>) => v,
    )
    expect(option.isEmpty).toBe(false)
    const list = option.orElse(List<number>([]))
    expect(list.toArray()).toEqual([1, 2, 3])
  })

  it("rebuilds an Option inside a Try inside an Either", () => {
    const original = Right<string, Try<Option<number>>>(Try.success(Some(7)))
    const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as Either<
      string,
      Try<Option<number>>
    >
    expect(round.isRight()).toBe(true)
    const tryValue = round.fold(
      () => Try.failure<Option<number>>(new Error("unreachable")),
      (v) => v,
    )
    expect(tryValue.isSuccess()).toBe(true)
    const opt = tryValue.orThrow()
    expect(opt.orElse(-1)).toBe(7)
  })

  it("rebuilds functype values embedded in a plain object", () => {
    const original = { user: "alice", score: Right<string, number>(42), tags: List(["a", "b"]) }
    const round = Serialization.deserialize(Serialization.serialize(original)).orThrow() as {
      user: string
      score: Either<string, number>
      tags: List<string>
    }
    expect(round.user).toBe("alice")
    expect(round.score.isRight()).toBe(true)
    expect(
      round.score.fold(
        (l) => l,
        (r) => `R${r}`,
      ),
    ).toBe("R42")
    expect(round.tags.toArray()).toEqual(["a", "b"])
  })

  it("rebuilds functype values embedded in a plain array", () => {
    const original = [Some(1), Some(2), None<number>()]
    const json = Serialization.serialize(original)
    const round = Serialization.deserialize(json).orThrow() as Option<number>[]
    expect(round[0]?.orElse(0)).toBe(1)
    expect(round[1]?.orElse(0)).toBe(2)
    expect(round[2]?.isEmpty).toBe(true)
  })
})

describe("Serialization — Effect/fp-ts collision sentinel", () => {
  it("does NOT claim a bare {_tag: 'Some'} envelope without @functype marker", () => {
    // Simulate an Effect Option<number> envelope: same `_tag`, no `@functype`.
    const foreign = '{"_tag":"Some","value":42}'
    const result = Serialization.deserialize(foreign).orThrow()
    // Plain JSON passthrough — result is the original object, NOT a functype Some.
    expect(result).toEqual({ _tag: "Some", value: 42 })
    expect((result as { isEmpty?: unknown }).isEmpty).toBeUndefined()
  })

  it("does NOT claim a bare {_tag: 'Right'} envelope without @functype marker", () => {
    const foreign = '{"_tag":"Right","value":5}'
    const result = Serialization.deserialize(foreign).orThrow()
    expect(result).toEqual({ _tag: "Right", value: 5 })
    expect((result as { isRight?: unknown }).isRight).toBeUndefined()
  })
})

describe("Serialization — passthrough + failure paths", () => {
  it("passes through plain primitives", () => {
    expect(Serialization.deserialize('"hello"').orThrow()).toBe("hello")
    expect(Serialization.deserialize("42").orThrow()).toBe(42)
    expect(Serialization.deserialize("true").orThrow()).toBe(true)
    expect(Serialization.deserialize("null").orThrow()).toBe(null)
  })

  it("passes through plain objects untouched", () => {
    const result = Serialization.deserialize('{"name":"alice","age":30}').orThrow()
    expect(result).toEqual({ name: "alice", age: 30 })
  })

  it("returns Failure on malformed JSON", () => {
    const result = Serialization.deserialize("{not valid json")
    expect(result.isFailure()).toBe(true)
  })

  it("returns Failure on unknown @functype marker", () => {
    const foreign = '{"@functype":"NotAFunctypeType","value":42}'
    const result = Serialization.deserialize(foreign)
    expect(result.isFailure()).toBe(true)
    expect(result.error?.message).toContain("unknown @functype marker")
  })
})

describe("Serialization — isFunctypeValue guard", () => {
  it("recognizes live functype values", () => {
    expect(Serialization.isFunctypeValue(Some(42))).toBe(true)
    expect(Serialization.isFunctypeValue(Right(7))).toBe(true)
    expect(Serialization.isFunctypeValue(List([1, 2, 3]))).toBe(true)
    expect(Serialization.isFunctypeValue(Try.success("x"))).toBe(true)
  })

  it("rejects plain objects, primitives, and Effect-shaped lookalikes", () => {
    expect(Serialization.isFunctypeValue({ _tag: "Some", value: 42 })).toBe(false)
    expect(Serialization.isFunctypeValue(null)).toBe(false)
    expect(Serialization.isFunctypeValue(undefined)).toBe(false)
    expect(Serialization.isFunctypeValue(42)).toBe(false)
    expect(Serialization.isFunctypeValue("string")).toBe(false)
    expect(Serialization.isFunctypeValue([1, 2, 3])).toBe(false)
  })
})

describe("Serialization — DBOS-style consumer pattern (no facade)", () => {
  // Demonstrates the ~8-line integration the proposal targets — kept in the
  // test suite (not the library) per the design decision to stay
  // serializer-agnostic. functype exposes primitives; consumers wire DBOS.
  const buildSerializerLike = () => ({
    name: () => "test/functype-json",
    stringify: (obj: unknown) => Serialization.serialize(obj),
    parse: (text: string | null | undefined): unknown => {
      if (text === null || text === undefined) return null
      return Serialization.deserialize(text).orThrow()
    },
  })

  it("a host-style serializer round-trips a step-return-shaped value", () => {
    const s = buildSerializerLike()
    const stepReturn = {
      userId: "u-42",
      score: Right<string, number>(99),
      tags: List(["a", "b"]),
      status: Try.success("ok"),
    }
    const text = s.stringify(stepReturn) as string
    const round = s.parse(text) as typeof stepReturn
    expect(round.userId).toBe("u-42")
    expect(round.score.isRight()).toBe(true)
    expect(
      round.score.fold(
        (l: string) => -1,
        (r: number) => r,
      ),
    ).toBe(99)
    expect(round.tags.toArray()).toEqual(["a", "b"])
    expect(round.status.isSuccess()).toBe(true)
    expect(round.status.orThrow()).toBe("ok")
  })

  it("handles null/undefined per the DBOS convention", () => {
    const s = buildSerializerLike()
    expect(s.parse(null)).toBe(null)
    expect(s.parse(undefined)).toBe(null)
    expect(s.stringify(undefined)).toBe("null")
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 1.2.1 additions — envelope helpers + strict deserialize
// ───────────────────────────────────────────────────────────────────────────

describe("Serialization — JSONValue is reachable from both import paths", () => {
  it("namespaced (Serialization.JSONValue) and top-level (import type { JSONValue }) resolve to the same type", () => {
    // Compile-time assertion via mutual assignability — runtime is a no-op.
    const a: Serialization.JSONValue = { foo: "bar", n: 1, nested: [true, null] }
    const b: TopLevelJSONValue = a
    const c: Serialization.JSONValue = b
    expect(c).toEqual(a)
  })
})

describe("Serialization — toEnvelope / fromEnvelope (structured-serializer nesting)", () => {
  it("toEnvelope returns a parsed JSON shape, not a string", () => {
    const env = Serialization.toEnvelope(Right<string, number>(5))
    expect(typeof env).toBe("object")
    expect(env).toEqual({ "@functype": "Either", _tag: "Right", value: 5 })
  })

  it("toEnvelope handles non-functype values transparently", () => {
    expect(Serialization.toEnvelope(42)).toBe(42)
    expect(Serialization.toEnvelope("hello")).toBe("hello")
    expect(Serialization.toEnvelope({ a: 1, b: [2, 3] })).toEqual({ a: 1, b: [2, 3] })
    expect(Serialization.toEnvelope(undefined)).toBe(null)
  })

  it("toEnvelope recursively materializes nested functype values to envelope shape", () => {
    const value = Right<string, Option<List<number>>>(Some(List([1, 2, 3])))
    const env = Serialization.toEnvelope(value) as Record<string, unknown>
    expect(env["@functype"]).toBe("Either")
    expect(env._tag).toBe("Right")
    const inner = env.value as Record<string, unknown>
    expect(inner["@functype"]).toBe("Option")
    expect(inner._tag).toBe("Some")
    const innermost = inner.value as Record<string, unknown>
    expect(innermost["@functype"]).toBe("List")
    expect(innermost.value).toEqual([1, 2, 3])
  })

  it("fromEnvelope reconstructs a single functype value with methods", () => {
    const env = { "@functype": "Option", _tag: "Some", value: 42 }
    const round = Serialization.fromEnvelope(env).orThrow() as Option<number>
    expect(round.isEmpty).toBe(false)
    expect(round.orElse(0)).toBe(42)
  })

  it("fromEnvelope rebuilds nested envelopes end-to-end", () => {
    const original = Right<string, Option<List<number>>>(Some(List([1, 2, 3])))
    const env = Serialization.toEnvelope(original)
    const round = Serialization.fromEnvelope(env).orThrow() as Either<string, Option<List<number>>>
    expect(round.isRight()).toBe(true)
    const opt = round.fold(
      () => None<List<number>>(),
      (v: Option<List<number>>) => v,
    )
    expect(opt.isEmpty).toBe(false)
    expect(opt.orElse(List<number>([])).toArray()).toEqual([1, 2, 3])
  })

  it("fromEnvelope passes through plain JSON values (matches deserialize)", () => {
    expect(Serialization.fromEnvelope({ name: "alice" }).orThrow()).toEqual({ name: "alice" })
    expect(Serialization.fromEnvelope(42).orThrow()).toBe(42)
    expect(Serialization.fromEnvelope(null).orThrow()).toBe(null)
  })

  it("fromEnvelope returns Failure on unknown @functype marker", () => {
    const result = Serialization.fromEnvelope({ "@functype": "Unknown", value: 1 })
    expect(result.isFailure()).toBe(true)
    expect(result.error?.message).toContain("unknown @functype marker")
  })

  it("forms an algebraic square: serialize ≡ JSON.stringify ∘ toEnvelope", () => {
    const value = Right<string, number>(99)
    const viaSerialize = Serialization.serialize(value)
    const viaEnvelope = JSON.stringify(Serialization.toEnvelope(value))
    expect(viaEnvelope).toBe(viaSerialize)
  })

  it("forms an algebraic square: deserialize ≡ fromEnvelope ∘ JSON.parse", () => {
    const json = Serialization.serialize(Right<string, number>(99))
    const viaDeserialize = Serialization.deserialize(json).orThrow()
    const viaEnvelope = Serialization.fromEnvelope(JSON.parse(json)).orThrow()
    // Both are live Either instances; compare via projection.
    const project = (e: unknown): string =>
      (e as Either<string, number>).fold(
        (l) => `L:${l}`,
        (r) => `R:${r}`,
      )
    expect(project(viaEnvelope)).toBe(project(viaDeserialize))
  })

  it("structured-serializer integration (simulates SuperJSON / DBOS custom transformer) — zero casts", () => {
    // SuperJSON / DBOS custom transformers expect their hook to return a JSON
    // VALUE, not a string. If you pass `serialize` (string) the host re-walks
    // the result and explodes the string character-by-character. Simulating
    // that contract: the transformer hook must accept and return plain JSON.
    //
    // 1.2.2 type-tightening: `toEnvelope: unknown → JSONValue` slots directly
    // into the transformer's `serialize` slot — no cast at the boundary.
    // `fromEnvelope` keeps its `unknown` input (Postel's law); `JSONValue` is
    // assignable to `unknown` so the deserialize wrapper composes cleanly.
    const transformer: {
      isApplicable: (v: unknown) => boolean
      serialize: (v: unknown) => Serialization.JSONValue
      deserialize: (o: Serialization.JSONValue) => unknown
    } = {
      isApplicable: Serialization.isFunctypeValue,
      serialize: Serialization.toEnvelope,
      deserialize: (o) => Serialization.fromEnvelope(o).orThrow(),
    }

    // Simulate the host: walks a structure, applies the transformer at each
    // value that matches `isApplicable`, then stringifies the WHOLE thing
    // (including the transformer's already-projected JSON output).
    const hostWalkAndSerialize = (v: unknown): string => {
      const walk = (x: unknown): unknown => {
        if (transformer.isApplicable(x)) return { __wrapped: transformer.serialize(x) }
        if (Array.isArray(x)) return x.map(walk)
        if (x !== null && typeof x === "object") {
          const out: Record<string, unknown> = {}
          for (const k of Object.keys(x)) out[k] = walk((x as Record<string, unknown>)[k])
          return out
        }
        return x
      }
      return JSON.stringify(walk(v))
    }

    const hostParseAndRehydrate = (text: string): unknown => {
      const walk = (x: unknown): unknown => {
        if (x !== null && typeof x === "object" && !Array.isArray(x) && "__wrapped" in x) {
          // The host knows it stored a JSONValue (it walked + stringified its
          // own structure), so it asserts that at the read boundary. The
          // transformer itself takes JSONValue — no cast inside the hook.
          return transformer.deserialize((x as { __wrapped: Serialization.JSONValue }).__wrapped)
        }
        if (Array.isArray(x)) return x.map(walk)
        if (x !== null && typeof x === "object") {
          const out: Record<string, unknown> = {}
          for (const k of Object.keys(x)) out[k] = walk((x as Record<string, unknown>)[k])
          return out
        }
        return x
      }
      return walk(JSON.parse(text))
    }

    const checkpoint = {
      userId: "u-42",
      score: Right<string, number>(99),
      tags: List(["a", "b"]),
      nested: { result: Some(7), retries: Right<string, number>(3) },
    }

    const text = hostWalkAndSerialize(checkpoint)
    const round = hostParseAndRehydrate(text) as typeof checkpoint

    expect(round.userId).toBe("u-42")
    expect(round.score.isRight()).toBe(true)
    expect(
      round.score.fold(
        (_l: string) => -1,
        (r: number) => r,
      ),
    ).toBe(99)
    expect(round.tags.toArray()).toEqual(["a", "b"])
    expect(round.nested.result.orElse(0)).toBe(7)
    expect(
      round.nested.retries.fold(
        (_l: string) => -1,
        (r: number) => r,
      ),
    ).toBe(3)
  })
})

describe("Serialization — deserializeStrict", () => {
  it("succeeds on a marked envelope", () => {
    const json = Serialization.serialize(Some(42))
    const round = Serialization.deserializeStrict(json).orThrow() as Option<number>
    expect(round.orElse(0)).toBe(42)
  })

  it("fails on a marker-less envelope (Effect/fp-ts collision shape)", () => {
    const foreign = '{"_tag":"Some","value":42}'
    const result = Serialization.deserializeStrict(foreign)
    expect(result.isFailure()).toBe(true)
    expect(result.error?.message).toContain("not a functype envelope")
  })

  it("fails on bare primitives", () => {
    expect(Serialization.deserializeStrict("42").isFailure()).toBe(true)
    expect(Serialization.deserializeStrict('"hello"').isFailure()).toBe(true)
    expect(Serialization.deserializeStrict("null").isFailure()).toBe(true)
    expect(Serialization.deserializeStrict("[1,2,3]").isFailure()).toBe(true)
  })

  it("fails on plain objects without the marker", () => {
    const result = Serialization.deserializeStrict('{"hello":"world"}')
    expect(result.isFailure()).toBe(true)
  })

  it("fails on malformed JSON (same as deserialize)", () => {
    expect(Serialization.deserializeStrict("{bad").isFailure()).toBe(true)
  })

  it("allows nested non-marked values inside a marked top-level (only checks top)", () => {
    // Right({plain: "object"}) — the top-level Either IS marked, even though
    // the value inside is a plain object. Strict only checks the outermost
    // envelope.
    const original = Right<string, { plain: string }>({ plain: "object" })
    const json = Serialization.serialize(original)
    const round = Serialization.deserializeStrict(json).orThrow() as Either<string, { plain: string }>
    expect(round.isRight()).toBe(true)
    expect(
      round.fold(
        (_l: string) => ({ plain: "?" }),
        (r: { plain: string }) => r,
      ),
    ).toEqual({ plain: "object" })
  })
})
