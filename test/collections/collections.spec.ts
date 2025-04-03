import { describe, expect, it } from "vitest"

import type { Collection } from "@/collections"
import { List } from "@/list/List"
import { Set } from "@/set/Set"

describe("Collection Type", () => {
  it("should define required converter methods", () => {
    // Create a mock implementation of Collection
    const createCollection = <T>(items: T[]): Collection<T> => {
      return {
        toList: () => List(items),
        toSet: () => Set(items),
        toString: () => `Collection(${JSON.stringify(items)})`,
      }
    }

    const collection = createCollection([1, 2, 3])

    // Test toList
    const list = collection.toList()
    expect(list.toArray()).toEqual([1, 2, 3])

    // Test toSet
    const set = collection.toSet()
    expect(set.toArray()).toEqual([1, 2, 3])

    // Test toString
    expect(collection.toString()).toBe("Collection([1,2,3])")
  })

  it("should work with different collection types", () => {
    // Example custom collection that implements Collection interface
    class CustomCollection<T> implements Collection<T> {
      private readonly items: T[]

      constructor(items: T[]) {
        this.items = [...items]
      }

      toList(): List<T> {
        return List(this.items)
      }

      toSet(): Set<T> {
        return Set(this.items)
      }

      toString(): string {
        return `CustomCollection(${JSON.stringify(this.items)})`
      }

      // Custom methods
      getItems(): T[] {
        return [...this.items]
      }

      add(item: T): CustomCollection<T> {
        return new CustomCollection([...this.items, item])
      }
    }

    const custom = new CustomCollection(["a", "b", "c"])

    // Test conversion to other collection types
    expect(custom.toList().toArray()).toEqual(["a", "b", "c"])
    expect(custom.toSet().toArray()).toEqual(["a", "b", "c"])

    // Test custom methods
    expect(custom.getItems()).toEqual(["a", "b", "c"])
    expect(custom.add("d").getItems()).toEqual(["a", "b", "c", "d"])

    // Test string representation
    expect(custom.toString()).toBe('CustomCollection(["a","b","c"])')
  })
})
