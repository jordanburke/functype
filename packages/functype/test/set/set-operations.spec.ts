import { describe, expect, expectTypeOf, it } from "vitest"

import { List } from "@/list/List"
import { Set } from "@/set/Set"

const a = Set([1, 2, 3])
const b = Set([3, 4, 5])

describe("Set operations", () => {
  it("union keeps every element of both, this set's first", () => {
    expect(a.union(b).toArray()).toEqual([1, 2, 3, 4, 5])
  })

  it("intersection keeps the shared elements in this set's order", () => {
    expect(Set([3, 2, 1]).intersection([1, 3]).toArray()).toEqual([3, 1])
  })

  it("difference keeps the elements not in other", () => {
    expect(a.difference(b).toArray()).toEqual([1, 2])
  })

  it("symmetricDifference keeps the elements in exactly one", () => {
    expect(a.symmetricDifference(b).toArray()).toEqual([1, 2, 4, 5])
  })

  it("subset, superset and disjoint", () => {
    expect(Set([1, 2]).isSubsetOf(a)).toBe(true)
    expect(a.isSubsetOf(Set([1, 2]))).toBe(false)
    expect(a.isSupersetOf([1, 2])).toBe(true)
    expect(Set([1, 2]).isSupersetOf(a)).toBe(false)
    expect(a.isDisjointFrom([7, 8])).toBe(true)
    expect(a.isDisjointFrom(b)).toBe(false)
  })

  it("handles empty sets the way native Set does", () => {
    const empty = Set<number>([])
    expect(empty.union(a).toArray()).toEqual([1, 2, 3])
    expect(empty.intersection(a).isEmpty).toBe(true)
    expect(a.difference(empty).toArray()).toEqual([1, 2, 3])
    expect(empty.isSubsetOf(a)).toBe(true)
    expect(empty.isSubsetOf(empty)).toBe(true)
    expect(a.isSupersetOf(empty)).toBe(true)
    expect(empty.isDisjointFrom(a)).toBe(true)
  })

  it("matches native Set results", () => {
    const na = new globalThis.Set([1, 2, 3])
    const nb = new globalThis.Set([3, 4, 5])
    expect(a.union(b).toArray()).toEqual([...na.union(nb)])
    expect(a.intersection(b).toArray()).toEqual([...na.intersection(nb)])
    expect(a.difference(b).toArray()).toEqual([...na.difference(nb)])
    expect(a.symmetricDifference(b).toArray()).toEqual([...na.symmetricDifference(nb)])
    expect(a.isSubsetOf(b)).toBe(na.isSubsetOf(nb))
    expect(a.isSupersetOf(b)).toBe(na.isSupersetOf(nb))
    expect(a.isDisjointFrom(b)).toBe(na.isDisjointFrom(nb))
  })

  it("accepts an array, a native Set, a functype Set, a List or a generator", () => {
    function* gen(): Generator<number> {
      yield 3
      yield 4
    }
    const others: ReadonlyArray<Iterable<number>> = [
      [3, 4],
      new globalThis.Set([3, 4]),
      Set([3, 4]),
      List([3, 4]),
      gen(),
    ]
    others.forEach((other) => expect(a.difference(other).toArray()).toEqual([1, 2]))
    expect(a.symmetricDifference(gen()).toArray()).toEqual([1, 2, 4])
    expect(a.isSupersetOf(gen())).toBe(false)
  })

  it("compares by SameValueZero: objects by identity, NaN equal to NaN", () => {
    const x = { id: 1 }
    const objects = Set([x])
    expect(objects.intersection([{ id: 1 }]).isEmpty).toBe(true)
    expect(objects.intersection([x]).toArray()).toEqual([x])
    expect(Set([Number.NaN]).isSubsetOf([Number.NaN])).toBe(true)
    expect(Set([0]).isSubsetOf([-0])).toBe(true)
  })

  it("does not change either input", () => {
    const left = Set([1, 2])
    const right = [2, 3]
    left.union(right)
    left.symmetricDifference(right)
    left.difference(right)
    expect(left.toArray()).toEqual([1, 2])
    expect(right).toEqual([2, 3])
  })

  it("union and symmetricDifference widen the element type", () => {
    expectTypeOf(Set([1]).union(["a"])).toEqualTypeOf<Set<number | string>>()
    expectTypeOf(Set([1]).symmetricDifference(["a"])).toEqualTypeOf<Set<number | string>>()
    expectTypeOf(Set([1]).intersection(["a"])).toEqualTypeOf<Set<number>>()
    expectTypeOf(Set([1]).difference(["a"])).toEqualTypeOf<Set<number>>()
  })
})

describe("every", () => {
  it("is true when all match, false at the first that doesn't", () => {
    expect(List([1, 2, 3]).every((x) => x > 0)).toBe(true)
    expect(List([1, -2, 3]).every((x) => x > 0)).toBe(false)
    expect(Set([1, 2, 3]).every((x) => x > 0)).toBe(true)
    expect(Set([1, -2, 3]).every((x) => x > 0)).toBe(false)
  })

  it("is true for an empty collection", () => {
    expect(List<number>([]).every(() => false)).toBe(true)
    expect(Set<number>([]).every(() => false)).toBe(true)
  })

  it("stops at the first failure", () => {
    const seen: number[] = []
    List([1, -2, 3]).every((x) => (seen.push(x), x > 0))
    expect(seen).toEqual([1, -2])
    const setSeen: number[] = []
    Set([1, -2, 3]).every((x) => (setSeen.push(x), x > 0))
    expect(setSeen).toEqual([1, -2])
  })
})
