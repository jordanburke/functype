/**
 * A write through a cast can't change every empty collection (the follow-up to #544's review).
 *
 * `List.empty()` returns one shared value, so its backing array is frozen. A native Set or Map
 * can't be frozen, so `Set.empty()` and `Map.empty()` build a new value each call. Before, all
 * three were shared and `(List.empty() as any).value.push(9)` left every later `List.empty()` at
 * size 1 for the rest of the process.
 *
 * These tests live in their own file so that a failure can't leak a corrupted empty into other specs.
 */
import { describe, expect, it } from "vitest"

import { List, Map, Set } from "@/index"

describe("empty collections can't be corrupted through a cast", () => {
  it("List.empty()'s array is frozen, so a push throws and later empties stay empty", () => {
    const backing = (List.empty<number>() as unknown as { readonly value: number[] }).value
    expect(Object.isFrozen(backing)).toBe(true)
    expect(() => backing.push(9)).toThrow(TypeError)
    expect(List.empty<number>().size).toBe(0)
    expect(List.empty<number>().toArray()).toEqual([])
  })

  it("List.empty() is still one shared value", () => {
    expect(List.empty<number>()).toBe(List.empty<string>())
  })

  it("adding to one Set.empty()'s native Set leaves the next one empty", () => {
    const backing = (Set.empty<number>() as unknown as { readonly value: globalThis.Set<number> }).value
    backing.add(9)
    expect(Set.empty<number>().size).toBe(0)
    expect(Set.empty<number>().has(9)).toBe(false)
  })

  it("setting on one Map.empty()'s native Map leaves the next one empty", () => {
    const backing = (Map.empty<string, number>() as unknown as { readonly value: globalThis.Map<string, number> }).value
    backing.set("a", 9)
    expect(Map.empty<string, number>().size).toBe(0)
    expect(Map.empty<string, number>().has("a")).toBe(false)
  })
})
