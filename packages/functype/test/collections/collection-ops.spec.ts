import { describe, expect, expectTypeOf, it } from "vitest"

import { Left, Right } from "@/either"
import type { FunctypeCollection } from "@/functype"
import { List } from "@/list"
import { Set } from "@/set"
import type { CollectionOps } from "@/typeclass"

/**
 * #480: `CollectionOps` methods that return the collection's own type must return `List` on List and
 * `Set` on Set, and the positional ones must handle `n` of 0, negative and past the end.
 */

/** Stands in for `Self`, so the methods that return it can be found by type alone. */
type SelfMarker = { readonly __selfMarker: true }
type Ops = CollectionOps<number, SelfMarker>
type Returns<T> = T extends (...args: never[]) => infer R ? R : T

/** Every `CollectionOps` member that returns `Self`. A new one shows up here without anyone listing it. */
type SelfReturning = { [K in keyof Ops]-?: Returns<Ops[K]> extends SelfMarker ? K : never }[keyof Ops]

/** `flatten` changes the element type, so it's checked on its own below. */
type SameElement = Exclude<SelfReturning, "flatten">

type ConcreteReturns<C> = { [K in SameElement]: Returns<C[K & keyof C]> }

describe("CollectionOps return types", () => {
  it("finds every Self-returning method, so the checks below can't pass by checking nothing", () => {
    expectTypeOf<SelfReturning>().toEqualTypeOf<
      "drop" | "dropRight" | "dropWhile" | "flatten" | "take" | "takeWhile" | "takeRight" | "tail" | "init"
    >()
  })

  it("returns List<A> from each of them on List", () => {
    expectTypeOf<ConcreteReturns<List<number>>>().toEqualTypeOf<{ [K in SameElement]: List<number> }>()
  })

  it("returns Set<A> from each of them on Set", () => {
    expectTypeOf<ConcreteReturns<Set<number>>>().toEqualTypeOf<{ [K in SameElement]: Set<number> }>()
  })

  it("keeps List-only methods reachable after drop", () => {
    expectTypeOf(List([1, 2, 3]).drop(1).get(0).orElse(0)).toEqualTypeOf<number>()
  })

  it("still lets a List or Set stand in for the base collection type", () => {
    const list: FunctypeCollection<number, "List"> = List([1, 2, 3])
    const set: FunctypeCollection<number, "Set"> = Set([1, 2, 3])
    expect(list.size + set.size).toBe(6)
  })
})

describe("flatten types", () => {
  it("gives the inner element type for arrays, Lists and Sets", () => {
    expectTypeOf(List([[1, 2], [3]]).flatten()).toEqualTypeOf<List<number>>()
    expectTypeOf(List([List([1]), List([2])]).flatten()).toEqualTypeOf<List<number>>()
    expectTypeOf(List([Set(["a"])]).flatten()).toEqualTypeOf<List<string>>()
    expectTypeOf(Set([[1], [2]]).flatten()).toEqualTypeOf<Set<number>>()
  })

  it("flattens a mix of values and iterables to the value type", () => {
    expectTypeOf(List<number | number[]>([1, [2, 3]]).flatten()).toEqualTypeOf<List<number>>()
  })

  it("keeps an explicit type argument working, as before", () => {
    expectTypeOf(List<number | number[]>([1, [2, 3]]).flatten<number>()).toEqualTypeOf<List<number>>()
  })

  it("types strings as kept whole, which is what the runtime does", () => {
    expectTypeOf(List(["ab", "cd"]).flatten()).toEqualTypeOf<List<string>>()
    expectTypeOf(List<string | string[]>(["a", ["b"]]).flatten()).toEqualTypeOf<List<string>>()
    expectTypeOf(Set(["ab"]).flatten()).toEqualTypeOf<Set<string>>()
    expect(List(["ab", "cd"]).flatten().toArray()).toEqual(["ab", "cd"])
  })

  it("keeps any as any", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- what JSON.parse gives
    const parsed: List<any> = List([1])
    expectTypeOf(parsed.flatten()).toEqualTypeOf<List<any>>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- what JSON.parse gives
    expectTypeOf(Set<any>([1]).flatten()).toEqualTypeOf<Set<any>>()
  })

  it("compiles inside generic helpers", () => {
    const anyElement = <T>(xs: List<T>) => xs.flatten()
    const numbers = <T extends number>(xs: List<T>) => xs.flatten()
    const arrays = <T>(xs: List<T[]>) => xs.flatten()
    const explicit = <T>(xs: List<T>) => xs.flatten<T>()
    const sets = <T>(xs: Set<T[]>) => xs.flatten()
    expect(anyElement(List([[1]])).toArray()).toEqual([1])
    expect(numbers(List([1])).toArray()).toEqual([1])
    expectTypeOf(arrays(List([[1], [2]]))).toEqualTypeOf<List<number>>()
    expect(explicit(List([1])).toArray()).toEqual([1])
    expect(sets(Set([[1]])).toArray()).toEqual([1])
  })
})

describe("positional methods at the edges", () => {
  const values = [1, 2, 3]

  it.each([
    ["drop(0)", (l: List<number>) => l.drop(0), [1, 2, 3]],
    ["drop(-1)", (l: List<number>) => l.drop(-1), [1, 2, 3]],
    ["drop(1)", (l: List<number>) => l.drop(1), [2, 3]],
    ["drop(9)", (l: List<number>) => l.drop(9), []],
    ["dropRight(0)", (l: List<number>) => l.dropRight(0), [1, 2, 3]],
    ["dropRight(-1)", (l: List<number>) => l.dropRight(-1), [1, 2, 3]],
    ["dropRight(1)", (l: List<number>) => l.dropRight(1), [1, 2]],
    ["dropRight(9)", (l: List<number>) => l.dropRight(9), []],
    ["dropRight(1.5)", (l: List<number>) => l.dropRight(1.5), [1, 2]],
    ["dropRight(NaN)", (l: List<number>) => l.dropRight(Number.NaN), [1, 2, 3]],
    ["drop(NaN)", (l: List<number>) => l.drop(Number.NaN), [1, 2, 3]],
    ["drop(1.5)", (l: List<number>) => l.drop(1.5), [2, 3]],
    ["dropWhile(all)", (l: List<number>) => l.dropWhile((x) => x < 10), []],
    ["dropWhile(none)", (l: List<number>) => l.dropWhile((x) => x > 10), [1, 2, 3]],
    ["dropWhile(<2)", (l: List<number>) => l.dropWhile((x) => x < 2), [2, 3]],
    ["take(0)", (l: List<number>) => l.take(0), []],
    ["take(-1)", (l: List<number>) => l.take(-1), []],
    ["take(9)", (l: List<number>) => l.take(9), [1, 2, 3]],
    ["takeRight(0)", (l: List<number>) => l.takeRight(0), []],
    ["takeRight(-1)", (l: List<number>) => l.takeRight(-1), []],
    ["takeRight(9)", (l: List<number>) => l.takeRight(9), [1, 2, 3]],
  ])("List %s", (_label, run, expected) => {
    expect(run(List(values)).toArray()).toEqual(expected)
  })

  it.each([
    ["drop(0)", (s: Set<number>) => s.drop(0), [1, 2, 3]],
    ["drop(-1)", (s: Set<number>) => s.drop(-1), [1, 2, 3]],
    ["drop(9)", (s: Set<number>) => s.drop(9), []],
    ["dropRight(0)", (s: Set<number>) => s.dropRight(0), [1, 2, 3]],
    ["dropRight(-1)", (s: Set<number>) => s.dropRight(-1), [1, 2, 3]],
    ["dropRight(1)", (s: Set<number>) => s.dropRight(1), [1, 2]],
    ["dropRight(9)", (s: Set<number>) => s.dropRight(9), []],
    ["dropRight(1.5)", (s: Set<number>) => s.dropRight(1.5), [1, 2]],
    ["dropRight(NaN)", (s: Set<number>) => s.dropRight(Number.NaN), [1, 2, 3]],
    ["dropWhile(all)", (s: Set<number>) => s.dropWhile((x) => x < 10), []],
    ["take(-1)", (s: Set<number>) => s.take(-1), []],
    ["takeRight(0)", (s: Set<number>) => s.takeRight(0), []],
    ["tail", (s: Set<number>) => s.tail, [2, 3]],
    ["init", (s: Set<number>) => s.init, [1, 2]],
  ])("Set %s", (_label, run, expected) => {
    expect(run(Set(values)).toArray()).toEqual(expected)
  })

  it("gives the same answer for an empty collection", () => {
    expect(List<number>([]).dropRight(1).toArray()).toEqual([])
    expect(
      List<number>([])
        .dropWhile(() => true)
        .toArray(),
    ).toEqual([])
    expect(Set<number>([]).dropRight(0).toArray()).toEqual([])
  })
})

describe("flatten at runtime", () => {
  it("spreads arrays, Lists and Sets on List, as it already did on Set", () => {
    expect(
      List([[1, 2], [3]])
        .flatten()
        .toArray(),
    ).toEqual([1, 2, 3])
    expect(
      List([List([1, 2]), List([3])])
        .flatten()
        .toArray(),
    ).toEqual([1, 2, 3])
    expect(
      List([Set([1, 2])])
        .flatten()
        .toArray(),
    ).toEqual([1, 2])
    expect(
      Set([List([1, 2]), List([2, 3])])
        .flatten()
        .toArray(),
    ).toEqual([1, 2, 3])
  })

  it("spreads an Either, so a Left contributes nothing", () => {
    expect(
      List([Right<string, number>(1), Left<string, number>("e"), Right<string, number>(2)])
        .flatten()
        .toArray(),
    ).toEqual([1, 2])
  })

  it("keeps values that aren't iterable, and strings, whole", () => {
    expect(
      List<number | number[]>([1, [2, 3]])
        .flatten()
        .toArray(),
    ).toEqual([1, 2, 3])
    const strings = List<unknown>(["ab", ["c"]])
    expect(strings.flatten().toArray()).toEqual(["ab", "c"])
    expect(List<unknown>([null, undefined, 1]).flatten().toArray()).toEqual([null, undefined, 1])
  })

  it("returns a real List", () => {
    const flat = List([[1], [2]]).flatten()
    expect(flat._tag).toBe("List")
    expect(flat.get(1).orElse(0)).toBe(2)
  })
})
