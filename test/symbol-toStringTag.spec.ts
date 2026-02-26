import { describe, expect, it } from "vitest"

import { Left, List, Lazy, Map, Option, Right, Set, Stack, Try, Tuple } from "../src"
import { Exit } from "../src/io/Exit"
import { IO } from "../src/io/IO"
import { Err, Ok } from "../src/core/task/Task"
import { LazyList } from "../src/list/LazyList"

/**
 * React Query's isPlainObject check (from @tanstack/query-core/src/utils.ts).
 * Inlined here to verify functype types are NOT treated as plain objects.
 */
function hasObjectPrototype(o: unknown): boolean {
  return Object.prototype.toString.call(o) === "[object Object]"
}

function isPlainObject(o: unknown): boolean {
  if (!hasObjectPrototype(o)) return false
  const ctor = (o as Record<string, unknown>).constructor
  if (ctor === undefined) return true
  const prot = ctor.prototype
  if (!hasObjectPrototype(prot)) return false
  if (!prot.hasOwnProperty("isPrototypeOf")) return false
  return true
}

describe("Symbol.toStringTag", () => {
  describe("Object.prototype.toString.call() returns correct tag", () => {
    it("List", () => {
      expect(Object.prototype.toString.call(List.of(1, 2, 3))).toBe("[object List]")
      expect(Object.prototype.toString.call(List.empty())).toBe("[object List]")
    })

    it("LazyList", () => {
      expect(Object.prototype.toString.call(LazyList([1, 2, 3]))).toBe("[object LazyList]")
      expect(Object.prototype.toString.call(LazyList.empty())).toBe("[object LazyList]")
    })

    it("Option (Some)", () => {
      expect(Object.prototype.toString.call(Option(42))).toBe("[object Option]")
    })

    it("Option (None)", () => {
      expect(Object.prototype.toString.call(Option.none())).toBe("[object Option]")
    })

    it("Either (Right)", () => {
      expect(Object.prototype.toString.call(Right("value"))).toBe("[object Either]")
    })

    it("Either (Left)", () => {
      expect(Object.prototype.toString.call(Left("error"))).toBe("[object Either]")
    })

    it("Try (Success)", () => {
      expect(Object.prototype.toString.call(Try(() => 42))).toBe("[object Try]")
    })

    it("Try (Failure)", () => {
      expect(
        Object.prototype.toString.call(
          Try(() => {
            throw new Error("fail")
          }),
        ),
      ).toBe("[object Try]")
    })

    it("Set", () => {
      expect(Object.prototype.toString.call(Set.of(1, 2, 3))).toBe("[object FunctypeSet]")
      expect(Object.prototype.toString.call(Set.empty())).toBe("[object FunctypeSet]")
    })

    it("Map", () => {
      expect(Object.prototype.toString.call(Map.of(["a", 1]))).toBe("[object FunctypeMap]")
      expect(Object.prototype.toString.call(Map.empty())).toBe("[object FunctypeMap]")
    })

    it("Tuple", () => {
      expect(Object.prototype.toString.call(Tuple([1, "hello"]))).toBe("[object Tuple]")
    })

    it("Stack", () => {
      expect(Object.prototype.toString.call(Stack([1, 2, 3]))).toBe("[object Stack]")
      expect(Object.prototype.toString.call(Stack.empty())).toBe("[object Stack]")
    })

    it("Lazy", () => {
      expect(Object.prototype.toString.call(Lazy(() => 42))).toBe("[object Lazy]")
    })

    it("TaskOutcome (Ok)", () => {
      expect(Object.prototype.toString.call(Ok(42))).toBe("[object TaskOutcome]")
    })

    it("TaskOutcome (Err)", () => {
      expect(Object.prototype.toString.call(Err(new Error("fail")))).toBe("[object TaskOutcome]")
    })

    it("IO", () => {
      expect(Object.prototype.toString.call(IO.succeed(42))).toBe("[object IO]")
      expect(Object.prototype.toString.call(IO.fail("error"))).toBe("[object IO]")
    })

    it("Exit (Success)", () => {
      expect(Object.prototype.toString.call(Exit.succeed(42))).toBe("[object Exit]")
    })

    it("Exit (Failure)", () => {
      expect(Object.prototype.toString.call(Exit.fail("error"))).toBe("[object Exit]")
    })

    it("Exit (Interrupted)", () => {
      expect(Object.prototype.toString.call(Exit.interrupt("fiber-1"))).toBe("[object Exit]")
    })
  })

  describe("React Query isPlainObject returns false for all functype types", () => {
    it("List is not a plain object", () => {
      expect(isPlainObject(List.of(1, 2, 3))).toBe(false)
    })

    it("LazyList is not a plain object", () => {
      expect(isPlainObject(LazyList([1, 2, 3]))).toBe(false)
    })

    it("Option (Some) is not a plain object", () => {
      expect(isPlainObject(Option(42))).toBe(false)
    })

    it("Option (None) is not a plain object", () => {
      expect(isPlainObject(Option.none())).toBe(false)
    })

    it("Either (Right) is not a plain object", () => {
      expect(isPlainObject(Right("value"))).toBe(false)
    })

    it("Either (Left) is not a plain object", () => {
      expect(isPlainObject(Left("error"))).toBe(false)
    })

    it("Try (Success) is not a plain object", () => {
      expect(isPlainObject(Try(() => 42))).toBe(false)
    })

    it("Try (Failure) is not a plain object", () => {
      expect(
        isPlainObject(
          Try(() => {
            throw new Error("fail")
          }),
        ),
      ).toBe(false)
    })

    it("Set is not a plain object", () => {
      expect(isPlainObject(Set.of(1, 2, 3))).toBe(false)
    })

    it("Map is not a plain object", () => {
      expect(isPlainObject(Map.of(["a", 1]))).toBe(false)
    })

    it("Tuple is not a plain object", () => {
      expect(isPlainObject(Tuple([1, "hello"]))).toBe(false)
    })

    it("Stack is not a plain object", () => {
      expect(isPlainObject(Stack([1, 2, 3]))).toBe(false)
    })

    it("Lazy is not a plain object", () => {
      expect(isPlainObject(Lazy(() => 42))).toBe(false)
    })

    it("TaskOutcome (Ok) is not a plain object", () => {
      expect(isPlainObject(Ok(42))).toBe(false)
    })

    it("TaskOutcome (Err) is not a plain object", () => {
      expect(isPlainObject(Err(new Error("fail")))).toBe(false)
    })

    it("IO is not a plain object", () => {
      expect(isPlainObject(IO.succeed(42))).toBe(false)
    })

    it("Exit is not a plain object", () => {
      expect(isPlainObject(Exit.succeed(42))).toBe(false)
      expect(isPlainObject(Exit.fail("error"))).toBe(false)
      expect(isPlainObject(Exit.interrupt("fiber-1"))).toBe(false)
    })
  })

  describe("plain objects ARE still detected as plain objects", () => {
    it("plain object is a plain object", () => {
      expect(isPlainObject({ a: 1 })).toBe(true)
    })

    it("Object.create(null) is considered a plain object by React Query", () => {
      // Object.create(null) has no constructor, so isPlainObject returns true (ctor === undefined)
      expect(isPlainObject(Object.create(null))).toBe(true)
    })
  })
})
