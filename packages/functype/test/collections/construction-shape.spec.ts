/**
 * Behaviour pinned for the construction-cost fix (issue #511).
 *
 * The fix changes how List, Set, Map, Stack, LazyList and Obj build their objects: values that
 * were getters become plain properties, and the getters that must stay lazy are attached after
 * the object literal. These tests were written against the code before that change and must pass
 * unchanged after it.
 */
import { describe, expect, it } from "vitest"

import { $, Do } from "@/do"
import { isTypeable, LazyList, List, Map, Obj, Set, Stack, Tuple } from "@/index"

type Sequence<A> = {
  readonly head: A | undefined
  readonly last: A | undefined
  readonly headOption: { orUndefined(): A | undefined }
  readonly lastOption: { orUndefined(): A | undefined }
  readonly tail: { toArray(): A[] }
  readonly init: { toArray(): A[] }
  toArray(): A[]
}

type Listish<A> = Sequence<A> & { readonly size: number; readonly isEmpty: boolean }

/** head, last, their Options, tail and init must agree with the elements. LazyList has no size. */
const expectSequence = <A>(actual: Sequence<A>, expected: readonly A[]): void => {
  expect(actual.toArray()).toEqual(expected)
  expect(actual.head).toBe(expected[0])
  expect(actual.last).toBe(expected[expected.length - 1])
  // Option(null) and Option(undefined) are None, so a null or undefined end gives None.
  expect(actual.headOption.orUndefined()).toBe(expected[0] ?? undefined)
  expect(actual.lastOption.orUndefined()).toBe(expected[expected.length - 1] ?? undefined)
  expect(actual.tail.toArray()).toEqual(expected.slice(1))
  expect(actual.init.toArray()).toEqual(expected.slice(0, -1))
}

/** Every derived property must agree with the elements. */
const expectMatches = <A>(actual: Listish<A>, expected: readonly A[]): void => {
  expectSequence(actual, expected)
  expect(actual.size).toBe(expected.length)
  expect(actual.isEmpty).toBe(expected.length === 0)
}

const expectList = <A>(list: List<A>, expected: readonly A[]): void => {
  expectMatches(list, expected)
  expect(list.length).toBe(expected.length)
}

function* generate<A>(values: readonly A[]): Generator<A> {
  for (const value of values) yield value
}

/** An iterable that counts how many elements have been pulled from it. */
const counting = (limit = Infinity) => {
  const pulls = { count: 0 }
  const iterable: Iterable<number> = {
    [Symbol.iterator]: () => {
      let i = 0
      return {
        next: () => {
          if (i >= limit) return { done: true, value: undefined }
          pulls.count++
          return { done: false, value: i++ }
        },
      }
    },
  }
  return { iterable, pulls }
}

describe("List", () => {
  it.each([
    ["empty", []],
    ["one element", [1]],
    ["many elements", [3, 1, 2, 3]],
    ["undefined element", [undefined]],
    ["null element", [null]],
    ["null at both ends", [null, 1, null]],
  ] as const)("derived properties are right for %s", (_, values) => {
    expectList(List<unknown>(values), values)
  })

  it("derived properties are right for List() and List.empty()", () => {
    expectList(List(), [])
    expectList(List.empty(), [])
    expectList(List.of(1, 2), [1, 2])
  })

  it("derived properties are right for Lists built from iterables and generators", () => {
    expectList(List(new globalThis.Set([1, 2, 2, 3])), [1, 2, 3])
    expectList(List(generate([4, 5, 6])), [4, 5, 6])
    expectList(List("abc"), ["a", "b", "c"])
    expectList(List(new globalThis.Map([["k", 1]]).keys()), ["k"])
  })

  describe("derived properties after every operation that returns a new List", () => {
    const base = List([3, 1, 2, 3])
    const cases: ReadonlyArray<readonly [string, List<unknown>, readonly unknown[]]> = [
      ["map", base.map((x) => x * 2), [6, 2, 4, 6]],
      ["map to empty source", List<number>([]).map((x) => x * 2), []],
      ["ap", base.ap(List([(x: number) => x + 1])), [4, 2, 3, 4]],
      ["filter", base.filter((x) => x > 1), [3, 2, 3]],
      ["filter to empty", base.filter(() => false), []],
      ["filterNot", base.filterNot((x) => x > 1), [1]],
      ["flatMap", base.flatMap((x) => [x, x]), [3, 3, 1, 1, 2, 2, 3, 3]],
      ["flatMap to empty", base.flatMap(() => []), []],
      ["add", base.add(9), [3, 1, 2, 3, 9]],
      ["prepend", base.prepend(0), [0, 3, 1, 2, 3]],
      ["remove", base.remove(3), [1, 2]],
      ["removeAt", base.removeAt(1), [3, 2, 3]],
      ["removeAt out of range", base.removeAt(99), [3, 1, 2, 3]],
      ["concat", base.concat(List([7, 8])), [3, 1, 2, 3, 7, 8]],
      ["concat empty", base.concat(List<number>([])), [3, 1, 2, 3]],
      ["drop", base.drop(1), [1, 2, 3]],
      ["drop 0", base.drop(0), [3, 1, 2, 3]],
      ["drop negative", base.drop(-1), [3, 1, 2, 3]],
      ["drop all", base.drop(99), []],
      ["dropRight", base.dropRight(1), [3, 1, 2]],
      ["dropWhile", base.dropWhile((x) => x > 2), [1, 2, 3]],
      ["take", base.take(2), [3, 1]],
      ["take 0", base.take(0), []],
      ["takeWhile", base.takeWhile((x) => x > 2), [3]],
      ["takeRight", base.takeRight(2), [2, 3]],
      ["reverse", base.reverse(), [3, 2, 1, 3]],
      ["sorted", base.sorted((a, b) => a - b), [1, 2, 3, 3]],
      ["sortBy", base.sortBy((x) => -x), [3, 3, 2, 1]],
      ["distinct", base.distinct(), [3, 1, 2]],
      ["slice", base.slice(1, 3), [1, 2]],
      ["tail", base.tail, [1, 2, 3]],
      ["init", base.init, [3, 1, 2]],
      ["tail of tail", base.tail.tail, [2, 3]],
      ["tail of empty", List<number>([]).tail, []],
      ["init of empty", List<number>([]).init, []],
      ["partition (yes)", base.partition((x) => x > 1)[0], [3, 2, 3]],
      ["partition (no)", base.partition((x) => x > 1)[1], [1]],
      ["span (prefix)", base.span((x) => x > 2)[0], [3]],
      ["span (rest)", base.span((x) => x > 2)[1], [1, 2, 3]],
      ["groupBy group", base.groupBy((x) => x % 2).get(1)!, [3, 1, 3]],
      ["flatten", List([[1, 2], [3]]).flatten<number>(), [1, 2, 3]],
      ["toList", base.toList(), [3, 1, 2, 3]],
      ["Set.toList", Set([1, 2]).toList(), [1, 2]],
    ]
    it.each(cases)("%s", (_, list, expected) => {
      expectList(list, expected)
    })

    it("zip and zipWithIndex", () => {
      expect(base.zip(List(["a", "b"])).size).toBe(2)
      expect(base.zip(List(["a", "b"])).length).toBe(2)
      expect(base.zipWithIndex().size).toBe(4)
      expect(base.zipWithIndex().last).toEqual([3, 3])
    })

    it("leaves the source unchanged", () => {
      base.add(1)
      base.map((x) => x)
      expectList(base, [3, 1, 2, 3])
    })
  })

  it("iterates with for...of, spread, Array.from and destructuring, more than once", () => {
    const list = List([1, 2, 3])
    const seen: number[] = []
    for (const x of list) seen.push(x)
    expect(seen).toEqual([1, 2, 3])
    expect([...list]).toEqual([1, 2, 3])
    expect(Array.from(list)).toEqual([1, 2, 3])
    const [first, ...rest] = list
    expect(first).toBe(1)
    expect(rest).toEqual([2, 3])
    expect([...list]).toEqual([1, 2, 3])
    expect([...List()]).toEqual([])
  })

  it("keeps its tag", () => {
    const list = List([1])
    expect(Object.prototype.toString.call(list)).toBe("[object List]")
    expect(Object.prototype.toString.call(List())).toBe("[object List]")
    expect(list._tag).toBe("List")
    expect(isTypeable(list, "List")).toBe(true)
  })

  it("matches, unwraps and works in Do-notation", () => {
    expect(List([1, 2]).match({ Empty: () => "empty", NonEmpty: (xs) => xs.join(",") })).toBe("1,2")
    expect(List().match({ Empty: () => "empty", NonEmpty: () => "full" })).toBe("empty")
    expect(List([5, 6]).doUnwrap()).toEqual({ ok: true, value: 5 })
    expect(List().doUnwrap()).toEqual({ ok: false, empty: true })
    const result = Do(function* () {
      const a = yield* $(List([1, 2]))
      const b = yield* $(List([10]))
      return a + b
    })
    expect(result.toArray()).toEqual([11, 12])
  })
})

describe("Set", () => {
  it.each([
    ["empty", []],
    ["one element", [1]],
    ["many elements", [3, 1, 2]],
    ["undefined element", [undefined]],
  ] as const)("derived properties are right for %s", (_, values) => {
    expectMatches(Set<unknown>(values), values)
  })

  it("derived properties are right for Sets built from iterables, generators and duplicates", () => {
    expectMatches(Set(), [])
    expectMatches(Set([1, 1, 2]), [1, 2])
    expectMatches(Set(generate(["a", "b"])), ["a", "b"])
    expectMatches(Set(List([1, 2])), [1, 2])
  })

  describe("derived properties after every operation that returns a new Set", () => {
    const base = Set([3, 1, 2])
    const cases: ReadonlyArray<readonly [string, Set<unknown>, readonly unknown[]]> = [
      ["add", base.add(9), [3, 1, 2, 9]],
      ["add existing", base.add(1), [3, 1, 2]],
      ["remove", base.remove(1), [3, 2]],
      ["remove missing", base.remove(42), [3, 1, 2]],
      ["union", base.union(Set([4])), [3, 1, 2, 4]],
      ["intersection", base.intersection(Set([1, 3, 7])), [3, 1]],
      ["difference", base.difference(Set([1])), [3, 2]],
      ["symmetricDifference", base.symmetricDifference(Set([1, 7])), [3, 2, 7]],
      ["map", base.map((x) => x * 2), [6, 2, 4]],
      ["map collapsing", base.map(() => 0), [0]],
      ["flatMap", base.flatMap((x) => [x, x + 10]), [3, 13, 1, 11, 2, 12]],
      ["filter", base.filter((x) => x > 1), [3, 2]],
      ["filterNot", base.filterNot((x) => x > 1), [1]],
      ["take", base.take(2), [3, 1]],
      ["takeWhile", base.takeWhile((x) => x > 2), [3]],
      ["takeRight", base.takeRight(1), [2]],
      ["drop", base.drop(1), [1, 2]],
      ["dropRight", base.dropRight(1), [3, 1]],
      ["dropWhile", base.dropWhile((x) => x > 2), [1, 2]],
      ["tail", base.tail, [1, 2]],
      ["init", base.init, [3, 1]],
      ["tail of empty", Set<number>().tail, []],
      ["flatten", Set([[1, 2], [3]]).flatten<number>(), [1, 2, 3]],
      ["toSet", base.toSet(), [3, 1, 2]],
      ["List.toSet", List([1, 1, 2]).toSet(), [1, 2]],
    ]
    it.each(cases)("%s", (_, set, expected) => {
      expectMatches(set, expected)
    })
  })

  it("iterates more than once", () => {
    const set = Set([1, 2])
    expect([...set]).toEqual([1, 2])
    expect(Array.from(set)).toEqual([1, 2])
    const [first] = set
    expect(first).toBe(1)
    expect([...set]).toEqual([1, 2])
  })

  it("keeps its tag", () => {
    const set = Set([1])
    expect(Object.prototype.toString.call(set)).toBe("[object FunctypeSet]")
    expect(set._tag).toBe("Set")
    expect(isTypeable(set, "Set")).toBe(true)
  })
})

describe("Map", () => {
  const sizeOf = (map: Map<unknown, unknown>) => ({ size: map.size, isEmpty: map.isEmpty, entries: [...map].length })

  it("size and isEmpty are right for empty, one-entry and many-entry Maps", () => {
    expect(sizeOf(Map())).toEqual({ size: 0, isEmpty: true, entries: 0 })
    expect(sizeOf(Map([["a", 1]]))).toEqual({ size: 1, isEmpty: false, entries: 1 })
    expect(
      sizeOf(
        Map([
          ["a", 1],
          ["b", 2],
          ["a", 3],
        ]),
      ),
    ).toEqual({ size: 2, isEmpty: false, entries: 2 })
    expect(sizeOf(Map(new globalThis.Map([["k", 1]]).entries()))).toEqual({ size: 1, isEmpty: false, entries: 1 })
  })

  it("size and isEmpty are right after every operation that returns a new Map", () => {
    const base = Map([
      ["a", 1],
      ["b", 2],
    ])
    expect(sizeOf(base.add(Tuple(["c", 3])))).toEqual({ size: 3, isEmpty: false, entries: 3 })
    expect(sizeOf(base.add(Tuple(["a", 9])))).toEqual({ size: 2, isEmpty: false, entries: 2 })
    expect(sizeOf(base.remove("a"))).toEqual({ size: 1, isEmpty: false, entries: 1 })
    expect(sizeOf(base.remove("a").remove("b"))).toEqual({ size: 0, isEmpty: true, entries: 0 })
    expect(sizeOf(base.remove("zz"))).toEqual({ size: 2, isEmpty: false, entries: 2 })
    expect(sizeOf(base.map((v) => v * 2))).toEqual({ size: 2, isEmpty: false, entries: 2 })
    expect(
      sizeOf(base.flatMap(([k, v]) => [[`${k}1`, v] as [string, number], [`${k}2`, v] as [string, number]])),
    ).toEqual({ size: 4, isEmpty: false, entries: 4 })
    expect(sizeOf(base)).toEqual({ size: 2, isEmpty: false, entries: 2 })
  })

  it("iterates more than once", () => {
    const map = Map([["a", 1]])
    expect([...map]).toEqual([["a", 1]])
    expect(Array.from(map)).toEqual([["a", 1]])
    expect([...map]).toEqual([["a", 1]])
  })

  it("keeps its tag", () => {
    const map = Map([["a", 1]])
    expect(Object.prototype.toString.call(map)).toBe("[object FunctypeMap]")
    expect(map._tag).toBe("Map")
    expect(isTypeable(map, "Map")).toBe(true)
  })
})

describe("Stack", () => {
  const sizeOf = (stack: Stack<number>) => ({ size: stack.size, isEmpty: stack.isEmpty, items: stack.toArray() })

  it("size and isEmpty are right for empty, one-item and many-item Stacks, and after each operation", () => {
    expect(sizeOf(Stack())).toEqual({ size: 0, isEmpty: true, items: [] })
    expect(sizeOf(Stack([1]))).toEqual({ size: 1, isEmpty: false, items: [1] })
    const base = Stack([1, 2, 3])
    expect(sizeOf(base)).toEqual({ size: 3, isEmpty: false, items: [1, 2, 3] })
    expect(sizeOf(base.push(4))).toEqual({ size: 4, isEmpty: false, items: [1, 2, 3, 4] })
    expect(sizeOf(base.pop()[0])).toEqual({ size: 2, isEmpty: false, items: [1, 2] })
    expect(sizeOf(Stack([1]).pop()[0])).toEqual({ size: 0, isEmpty: true, items: [] })
    expect(sizeOf(Stack<number>().pop()[0])).toEqual({ size: 0, isEmpty: true, items: [] })
    expect(sizeOf(base.map((x) => x * 2))).toEqual({ size: 3, isEmpty: false, items: [2, 4, 6] })
    expect(sizeOf(base.flatMap((x) => Stack([x, x])))).toEqual({ size: 6, isEmpty: false, items: [1, 1, 2, 2, 3, 3] })
    expect(sizeOf(base)).toEqual({ size: 3, isEmpty: false, items: [1, 2, 3] })
  })

  it("keeps its tag", () => {
    const stack = Stack([1])
    expect(Object.prototype.toString.call(stack)).toBe("[object Stack]")
    expect(stack._tag).toBe("Stack")
    expect(isTypeable(stack, "Stack")).toBe(true)
  })
})

describe("LazyList", () => {
  it("derived properties are right for finite LazyLists", () => {
    expectSequence(LazyList<number>([]), [])
    expectSequence(LazyList([1]), [1])
    expectSequence(LazyList([3, 1, 2]), [3, 1, 2])
  })

  // A LazyList built by map, filter, drop or take wraps a one-shot generator, so each check reads
  // a fresh one.
  it.each([
    ["map", () => LazyList([3, 1, 2]).map((x) => x * 2), [6, 2, 4]],
    ["filter", () => LazyList([3, 1, 2]).filter((x) => x > 1), [3, 2]],
    ["drop", () => LazyList([3, 1, 2]).drop(1), [1, 2]],
    ["take", () => LazyList([3, 1, 2]).take(2), [3, 1]],
  ] as const)("derived properties are right after %s", (_, make, expected) => {
    expect(make().toArray()).toEqual(expected)
    expect(make().head).toBe(expected[0])
    expect(make().last).toBe(expected[expected.length - 1])
    expect(make().headOption.orUndefined()).toBe(expected[0])
    expect(make().lastOption.orUndefined()).toBe(expected[expected.length - 1])
    expect(make().tail.toArray()).toEqual(expected.slice(1))
    expect(make().init.toArray()).toEqual(expected.slice(0, -1))
  })

  it("building one pulls nothing, and head pulls only the first element", () => {
    const { iterable, pulls } = counting()
    const lazy = LazyList(iterable)
    expect(pulls.count).toBe(0)
    expect(lazy.head).toBe(0)
    expect(pulls.count).toBe(1)
    expect(lazy.headOption.orUndefined()).toBe(0)
    expect(pulls.count).toBe(2)
  })

  it("tail of an infinite LazyList is lazy", () => {
    const { iterable, pulls } = counting()
    const tail = LazyList(iterable).tail
    expect(pulls.count).toBe(0)
    expect(tail.take(2).toArray()).toEqual([1, 2])
    // take reads one element past what it keeps, so three kept elements cost four pulls.
    expect(pulls.count).toBe(4)
  })

  it("map and filter on an infinite LazyList pull nothing until read", () => {
    const { iterable, pulls } = counting()
    const mapped = LazyList(iterable)
      .map((x) => x * 10)
      .filter((x) => x > 0)
    expect(pulls.count).toBe(0)
    expect(mapped.head).toBe(10)
    expect(pulls.count).toBe(2)
  })

  it("last, lastOption and init read the whole finite source", () => {
    const { iterable, pulls } = counting(3)
    const lazy = LazyList(iterable)
    expect(lazy.last).toBe(2)
    expect(pulls.count).toBe(3)
    expect(lazy.lastOption.orUndefined()).toBe(2)
    expect(lazy.init.toArray()).toEqual([0, 1])
  })

  it("iterates more than once over a re-iterable source", () => {
    const lazy = LazyList([1, 2])
    expect([...lazy]).toEqual([1, 2])
    expect([...lazy]).toEqual([1, 2])
  })

  it("keeps its tag", () => {
    const lazy = LazyList([1])
    expect(Object.prototype.toString.call(lazy)).toBe("[object LazyList]")
    expect(lazy._tag).toBe("LazyList")
    expect(isTypeable(lazy, "LazyList")).toBe(true)
  })
})

describe("Obj", () => {
  it("size and isEmpty are right for empty and non-empty Objs, and after each operation", () => {
    expect([Obj({}).size, Obj({}).isEmpty]).toEqual([0, true])
    const base = Obj<Record<string, number>>({ a: 1, b: 2 })
    expect([base.size, base.isEmpty]).toEqual([2, false])
    expect(base.set("c", 3).size).toBe(3)
    expect(base.assign({ a: 9, d: 4 }).size).toBe(3)
    expect(base.omit("a").size).toBe(1)
    expect(base.pick("a").size).toBe(1)
    expect([base.omit("a", "b").size, base.omit("a", "b").isEmpty]).toEqual([0, true])
    expect(base.size).toBe(2)
  })

  it("keeps its tag", () => {
    const obj = Obj({ a: 1 })
    expect(Object.prototype.toString.call(obj)).toBe("[object Obj]")
    expect(obj._tag).toBe("Obj")
    expect(isTypeable(obj, "Obj")).toBe(true)
  })
})

describe("every changed type", () => {
  const instances = {
    "List(many)": List([3, 1, 2]),
    "List(empty)": List(),
    "Set(many)": Set([3, 1, 2]),
    "Set(empty)": Set(),
    "Map(many)": Map([
      ["a", 1],
      ["b", 2],
    ]),
    "Map(empty)": Map(),
    "Stack(many)": Stack([1, 2, 3]),
    "Stack(empty)": Stack(),
    "LazyList(many)": LazyList([3, 1, 2]),
    "Obj(many)": Obj({ a: 1, b: [2, 3] }),
  } as const

  it.each(Object.entries(instances))("%s keeps the same own enumerable properties", (_, value) => {
    expect(Object.keys(value).sort()).toMatchSnapshot()
  })

  it.each(Object.entries(instances))("%s serializes the same way", (_, value) => {
    const serialized = value.serialize()
    expect({
      toJSON: value.toJSON(),
      stringify: JSON.stringify(value),
      toString: value.toString(),
      toValue: "toValue" in value ? value.toValue() : "(none)",
      serializeJSON: serialized.toJSON(),
      serializeYAML: serialized.toYAML(),
      serializeBinary: serialized.toBinary(),
    }).toMatchSnapshot()
  })

  // the _tag since the @functype marker was added, so it can't read what toYAML writes.
  it("round-trips through fromJSON and fromBinary", () => {
    const list = List([3, 1, 2])
    expectList(List.fromJSON<number>(list.serialize().toJSON()), [3, 1, 2])
    expectList(List.fromBinary<number>(list.serialize().toBinary()), [3, 1, 2])
    const set = Set([3, 1, 2])
    expectMatches(Set.fromJSON<number>(set.serialize().toJSON()), [3, 1, 2])
    expectMatches(Set.fromBinary<number>(set.serialize().toBinary()), [3, 1, 2])
    const map = Map([["a", 1]])
    expect([...Map.fromJSON<string, number>(map.serialize().toJSON())]).toEqual([["a", 1]])
    expect([...Map.fromBinary<string, number>(map.serialize().toBinary())]).toEqual([["a", 1]])
    expect(Map.fromJSON<string, number>(map.serialize().toJSON()).size).toBe(1)
    const stack = Stack([1, 2])
    expect(Stack.fromJSON<number>(stack.serialize().toJSON()).toArray()).toEqual([1, 2])
    expect(Stack.fromBinary<number>(stack.serialize().toBinary()).size).toBe(2)
    expectSequence(LazyList.fromJSON<number>(LazyList([3, 1, 2]).serialize().toJSON()), [3, 1, 2])
    expect(Obj.fromJSON<{ a: number }>(Obj({ a: 1 }).serialize().toJSON()).size).toBe(1)
  })

  // Test files are ES modules, so this runs in strict mode, where a failed write throws.
  it.each([
    ["List", List([1, 2]), ["size", "length", "isEmpty", "head", "last", "headOption", "lastOption", "tail", "init"]],
    ["Set", Set([1, 2]), ["size", "isEmpty", "head", "last", "headOption", "lastOption", "tail", "init"]],
    ["Map", Map([["a", 1]]), ["size", "isEmpty"]],
    ["Stack", Stack([1]), ["size", "isEmpty"]],
    ["LazyList", LazyList([1, 2]), ["head", "last", "headOption", "lastOption", "tail", "init"]],
    ["Obj", Obj({ a: 1 }), ["size", "isEmpty"]],
  ] as const)("%s rejects writes to its derived properties", (_, value, keys) => {
    for (const key of keys) {
      const before: unknown = (value as unknown as Record<string, unknown>)[key]
      expect(() => {
        ;(value as unknown as Record<string, unknown>)[key] = 5
      }).toThrow(TypeError)
      const after: unknown = (value as unknown as Record<string, unknown>)[key]
      if (typeof before === "object" && before !== null && "toArray" in before) {
        expect((after as { toArray(): unknown }).toArray()).toEqual((before as { toArray(): unknown }).toArray())
      } else if (typeof before === "object" && before !== null && "orUndefined" in before) {
        expect((after as { orUndefined(): unknown }).orUndefined()).toEqual(
          (before as { orUndefined(): unknown }).orUndefined(),
        )
      } else {
        expect(after).toEqual(before)
      }
    }
  })
})
