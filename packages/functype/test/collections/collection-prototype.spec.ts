/**
 * List, Set, Map, Stack, LazyList and Obj share their methods through one prototype each (#276 §14,
 * PR 3), and head, last, tail, init and their Options are methods (#276 §13). Every collection used
 * to carry its own copy of 30 to 70 closures, and the 1.27 getters ran on a spread. These tests pin
 * the shape, how test matchers compare collections, and the 2.0 breaks. The cost guard is in
 * construction-cost.spec.ts.
 */
import { inspect } from "node:util"

import { describe, expect, it, vi } from "vitest"

import { LazyList, List, Map, Obj, Set, Some, Stack } from "@/index"

/** Two values of each type with different data, built from re-iterable sources. */
const pairs = [
  ["List", () => List([1, 2]), () => List([1, 3])],
  ["Set", () => Set([1, 2]), () => Set([1, 3])],
  ["Map", () => Map([["a", 1]]), () => Map([["a", 2]])],
  ["Stack", () => Stack([1, 2]), () => Stack([1, 3])],
  ["LazyList", () => LazyList([1, 2]), () => LazyList([1, 3])],
  ["Obj", () => Obj({ a: 1 }), () => Obj({ a: 2 })],
] as const

describe("each collection's shape", () => {
  it.each([
    ["List", List([1, 2]), ["_tag", "value"]],
    ["List()", List(), ["_tag", "value"]],
    ["Set", Set([1, 2]), ["_tag", "value"]],
    ["Map", Map([["a", 1]]), ["_tag", "value"]],
    ["Stack", Stack([1, 2]), ["_tag", "value"]],
    ["LazyList", LazyList([1, 2]), ["_tag", "source"]],
    ["Obj", Obj({ a: 1 }), ["_tag", "data"]],
  ] as const)("%s keeps only its data as own properties", (_, value, keys) => {
    expect(Reflect.ownKeys(value)).toEqual(keys)
    const seen: string[] = []
    // eslint-disable-next-line functional/immutable-data -- collecting what for...in sees
    for (const key in value) seen.push(key)
    expect(seen).toEqual(keys)
  })

  it("holds its data where a reader can find it", () => {
    expect((List([1, 2]) as unknown as { value: number[] }).value).toEqual([1, 2])
    expect((Set([1, 2]) as unknown as { value: globalThis.Set<number> }).value).toEqual(new globalThis.Set([1, 2]))
    expect((Map([["a", 1]]) as unknown as { value: globalThis.Map<string, number> }).value).toEqual(
      new globalThis.Map([["a", 1]]),
    )
    expect((Stack([1, 2]) as unknown as { value: number[] }).value).toEqual([1, 2])
    const source = [1, 2]
    expect((LazyList(source) as unknown as { source: number[] }).source).toBe(source)
    expect(Obj({ a: 1 }).data).toEqual({ a: 1 })
  })

  const families: ReadonlyArray<readonly [string, ReadonlyArray<() => object>]> = [
    ["List", [() => List([1]), () => List(["a", "b"]).map((x) => x.length), () => List.empty()]],
    ["Set", [() => Set([1]), () => Set(["a"]).filter(() => false), () => Set.empty()]],
    ["Map", [() => Map([["a", 1]]), () => Map.empty<string, number>().map((x) => x + 1), () => Map.empty()]],
    ["Stack", [() => Stack([1]), () => Stack([1]).push(2), () => Stack.empty()]],
    ["LazyList", [() => LazyList([1]), () => LazyList([1]).map((x) => x + 1), () => LazyList.empty()]],
    ["Obj", [() => Obj({ a: 1 }), () => Obj({ a: 1 }).set("a", 2), () => Obj.empty()]],
  ]
  // Since 2.2 a value isn't frozen: freezing was most of what building one cost, and
  // eslint-plugin-functype's no-container-mutation reports the writes it stopped. The prototype stays
  // frozen, and so does List.empty(), the one value every caller shares.
  it.each(families)("every %s shares one frozen prototype, and only a shared empty value is frozen", (_, makers) => {
    const values = makers.map((make) => make())
    const proto = Object.getPrototypeOf(values[0]) as object
    for (const value of values) {
      expect(Object.getPrototypeOf(value)).toBe(proto)
      expect(Object.isFrozen(value)).toBe(value === List.empty())
    }
    expect(Object.isFrozen(proto)).toBe(true)
    expect(Object.getPrototypeOf(proto)).toBe(Object.prototype)
  })

  it("each type has its own prototype", () => {
    const protos = pairs.map(([, make]) => Object.getPrototypeOf(make()) as object)
    expect(new globalThis.Set(protos).size).toBe(pairs.length)
  })

  it("prints its type and data", () => {
    expect(inspect(List([1, 2]))).toBe("List { _tag: 'List', value: [ 1, 2 ] }")
    expect(inspect(Set([1]))).toBe("Set [FunctypeSet] { _tag: 'Set', value: Set(1) { 1 } }")
    expect(inspect(Map([["a", 1]]))).toBe("Map [FunctypeMap] { _tag: 'Map', value: Map(1) { 'a' => 1 } }")
    expect(inspect(Stack([1]))).toBe("Stack { _tag: 'Stack', value: [ 1 ] }")
    expect(inspect(LazyList([1]))).toBe("LazyList { _tag: 'LazyList', source: [ 1 ] }")
    expect(inspect(Obj({ a: 1 }))).toBe("Obj { _tag: 'Obj', data: { a: 1 } }")
    expect(Object.prototype.toString.call(List([1]))).toBe("[object List]")
  })

  it("size, length and isEmpty are properties, read from the data", () => {
    const list = List([1, 2, 3])
    expect([list.size, list.length, list.isEmpty]).toEqual([3, 3, false])
    expect([Set([1, 1]).size, Map().isEmpty, Stack([1]).size, Obj({}).isEmpty]).toEqual([1, true, 1, true])
    expect(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(list) as object, "size")?.get).toBeTypeOf("function")
  })
})

describe("collections compare by their data in test matchers", () => {
  it.each(pairs)("two %s values with the same data are equal", (_, make) => {
    expect(make()).toEqual(make())
    expect(make()).toStrictEqual(make())
    expect({ value: make() }).toEqual({ value: make() })
    expect([make()]).toEqual([make()])
    expect(Some(make())).toEqual(Some(make()))
  })

  it.each(pairs)("two %s values with different data are unequal", (_, make, other) => {
    expect(make()).not.toEqual(other())
    expect(make()).not.toStrictEqual(other())
    expect(make()).not.toMatchObject(other())
    expect({ value: make() }).not.toEqual({ value: other() })
    expect([make()]).not.toEqual([other()])
    expect(Some(make())).not.toEqual(Some(other()))
  })

  it.each(pairs)("toHaveBeenCalledWith tells the right %s from the wrong one", (_, make, other) => {
    const spy = vi.fn()
    spy(make())
    expect(spy).toHaveBeenCalledWith(make())
    expect(spy).not.toHaveBeenCalledWith(other())
  })

  it("a List and a Set holding the same elements are unequal", () => {
    expect(List([1, 2])).not.toEqual(Set([1, 2]))
    expect(List([1, 2])).not.toEqual(Stack([1, 2]))
  })

  it("a longer List is unequal to its prefix", () => {
    expect(List([1, 2])).not.toEqual(List([1, 2, 3]))
    expect(List([1, 2, 3])).not.toEqual(List([1, 2]))
  })
})

describe("head, last, tail, init and their Options are methods (§13)", () => {
  it.each([
    ["List", List([1, 2, 3])],
    ["Set", Set([1, 2, 3])],
    ["LazyList", LazyList([1, 2, 3])],
  ] as const)("on %s", (_, value) => {
    expect([value.head(), value.last()]).toEqual([1, 3])
    expect([value.headOption().orUndefined(), value.lastOption().orUndefined()]).toEqual([1, 3])
    expect([value.tail().toArray(), value.init().toArray()]).toEqual([
      [2, 3],
      [1, 2],
    ])
    for (const name of ["head", "headOption", "last", "lastOption", "tail", "init"] as const) {
      expect(value[name], name).toBeTypeOf("function")
    }
  })

  it("a read without the call is the method itself, which no type error catches in a check or a string", () => {
    const empty = List<number>()
    // These compile on 2.0 and are the silent cases the upgrade tool rewrites.
    expect(Boolean(empty.head)).toBe(true)
    expect(empty.head ?? 0).toBe(empty.head)
    expect(`${String(empty.last)}`).toContain("last()")
    expect(empty.head()).toBeUndefined()
  })

  it("walking a List with tail() stops, one element at a time", () => {
    let list = List(Array.from({ length: 100 }, (_, i) => i))
    let steps = 0
    while (!list.isEmpty) {
      list = list.tail()
      steps++
    }
    expect(steps).toBe(100)
  })
})

describe("the collections' 2.0 breaks", () => {
  it.each([
    ["List", () => List([1, 2])],
    ["Set", () => Set([1, 2])],
    ["Map", () => Map([["a", 1]])],
    ["Stack", () => Stack([1, 2])],
    ["LazyList", () => LazyList([1, 2])],
    ["Obj", () => Obj({ a: 1 })],
  ] as const)("a detached %s method throws, because `this` is undefined", (_, make) => {
    const { toString, toJSON } = make()
    expect(() => toString()).toThrow(TypeError)
    expect(() => toJSON()).toThrow(TypeError)
  })

  it("a detached LazyList pipe hands its function undefined, since it only passes `this` on", () => {
    const { pipe } = LazyList([1])
    expect(pipe((x) => x)).toBeUndefined()
  })

  it("a detached method passed as a callback throws", () => {
    const set = Set([1, 2])
    expect(() => [1, 3].filter(set.has)).toThrow(TypeError)
    const { tail, head } = List([1, 2])
    expect(() => tail()).toThrow(TypeError)
    expect(() => head()).toThrow(TypeError)
    expect(() => [List([1])].map(List([2]).concat)).toThrow(TypeError)
  })

  it("a spread copies only the data, and has no methods", () => {
    expect({ ...List([1, 2]) }).toEqual({ _tag: "List", value: [1, 2] })
    expect({ ...Stack([1]) }).toEqual({ _tag: "Stack", value: [1] })
    expect({ ...Obj({ a: 1 }) }).toEqual({ _tag: "Obj", data: { a: 1 } })
    expect("map" in { ...List([1]) }).toBe(false)
    expect(Object.keys(Map([["a", 1]]))).toEqual(["_tag", "value"])
  })

  it("a spread of a LazyList reads nothing from its source", () => {
    const pulls = { count: 0 }
    const source: Iterable<number> = {
      [Symbol.iterator]: () => {
        let i = 0
        return {
          next: () => {
            if (i >= 1_000_000) return { done: true, value: undefined }
            pulls.count++
            return { done: false, value: i++ }
          },
        }
      },
    }
    const lazy = LazyList(source)
    const copy = { ...lazy }
    expect(Object.keys(copy)).toEqual(["_tag", "source"])
    expect(Object.keys(lazy)).toEqual(["_tag", "source"])
    expect(pulls.count).toBe(0)
  })

  it("a spread of an infinite LazyList returns", () => {
    const naturals = LazyList.iterate(0, (n) => n + 1)
    expect(Object.keys({ ...naturals })).toEqual(["_tag", "source"])
  })

  it("structuredClone copies the data, with no methods", () => {
    expect(structuredClone(List([1, 2]))).toEqual({ _tag: "List", value: [1, 2] })
    expect(structuredClone(Map([["a", 1]]))).toEqual({ _tag: "Map", value: new globalThis.Map([["a", 1]]) })
  })

  it("assigning over a method throws, because the prototype is frozen; a field or a new property is no longer stopped", () => {
    for (const value of [List([1]), Set([1]), Map([["a", 1]]), Stack([1]), LazyList([1]), Obj({ a: 1 })]) {
      const record = value as unknown as Record<string, unknown>
      expect(() => {
        // eslint-disable-next-line functional/immutable-data -- the write is what's under test
        record.map = () => 0
      }).toThrow(TypeError)
      // Since 2.2 values aren't frozen, so these writes succeed at run time. The types forbid them, and
      // eslint-plugin-functype's no-container-mutation reports them through a cast.
      expect(() => {
        // eslint-disable-next-line functional/immutable-data -- the write is what's under test
        record.extra = 1
      }).not.toThrow()
      expect(record.extra).toBe(1)
    }
  })

  it("a method on a value can be spied on, now that the value isn't frozen", () => {
    const list = List([1, 2])
    const spy = vi.spyOn(list, "map")
    list.map((x) => x + 1)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("some methods return the value itself when the result would hold the same data", () => {
    const list = List([1, 2])
    expect(list.dropRight(0)).toBe(list)
    expect(list.span(() => true)[0]).toBe(list)
    const set = Set([1, 2])
    expect(set.dropRight(0)).toBe(set)
    const map = Map([["a", 1]])
    expect(map.remove("missing")).toBe(map)
    const empty = Stack<number>()
    expect(empty.pop()[0]).toBe(empty)
  })

  it("callbacks still get the index and array, as the native methods pass them", () => {
    expect(List(["1", "2", "3"]).map(parseInt).toArray()).toEqual([1, NaN, NaN])
    expect(Stack(["1", "2", "3"]).map(parseInt).toArray()).toEqual([1, NaN, NaN])
  })

  it("a plain-object check is false, because a value's prototype is its type's", () => {
    expect(Object.getPrototypeOf(List([1]))).not.toBe(Object.prototype)
  })
})
