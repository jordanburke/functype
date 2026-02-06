import { describe, it, expect } from "vitest"
import { LazyList } from "@/list"

describe("LazyList", () => {
  describe("creation", () => {
    it("should create from array", () => {
      const lazy = LazyList([1, 2, 3])
      expect(lazy.toArray()).toEqual([1, 2, 3])
    })

    it("should create empty list", () => {
      const lazy = LazyList.empty<number>()
      expect(lazy.toArray()).toEqual([])
    })

    it("should create from single value", () => {
      const lazy = LazyList.of(42)
      expect(lazy.toArray()).toEqual([42])
    })

    it("should create from multiple values", () => {
      const lazy = LazyList.from(1, 2, 3)
      expect(lazy.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("lazy operations", () => {
    it("should defer map operations", () => {
      let mapCount = 0
      const lazy = LazyList([1, 2, 3, 4, 5])
        .map((x) => {
          mapCount++
          return x * 2
        })
        .take(2)

      expect(mapCount).toBe(0) // Not evaluated yet

      const result = lazy.toArray()
      expect(result).toEqual([2, 4])
      expect(mapCount).toBeLessThanOrEqual(3) // Should only evaluate first 2-3 items
    })

    it("should chain multiple operations lazily", () => {
      let processCount = 0
      const lazy = LazyList.range(1, 100)
        .map((x) => {
          processCount++
          return x * 2
        })
        .filter((x) => x % 3 === 0)
        .take(5)

      expect(processCount).toBe(0)

      const result = lazy.toArray()
      expect(result).toEqual([6, 12, 18, 24, 30])
      expect(processCount).toBeLessThan(20) // Should process far fewer than 100 items
    })
  })

  describe("map", () => {
    it("should transform elements", () => {
      const result = LazyList([1, 2, 3])
        .map((x) => x * 2)
        .toArray()
      expect(result).toEqual([2, 4, 6])
    })
  })

  describe("filter", () => {
    it("should filter elements", () => {
      const result = LazyList([1, 2, 3, 4, 5])
        .filter((x) => x % 2 === 0)
        .toArray()
      expect(result).toEqual([2, 4])
    })
  })

  describe("flatMap", () => {
    it("should flat map elements", () => {
      const result = LazyList([1, 2, 3])
        .flatMap((x) => LazyList([x, x * 2]))
        .toArray()
      expect(result).toEqual([1, 2, 2, 4, 3, 6])
    })
  })

  describe("take/drop", () => {
    it("should take first n elements", () => {
      const result = LazyList([1, 2, 3, 4, 5]).take(3).toArray()
      expect(result).toEqual([1, 2, 3])
    })

    it("should drop first n elements", () => {
      const result = LazyList([1, 2, 3, 4, 5]).drop(3).toArray()
      expect(result).toEqual([4, 5])
    })
  })

  describe("takeWhile/dropWhile", () => {
    it("should take while predicate is true", () => {
      const result = LazyList([1, 2, 3, 4, 1, 2])
        .takeWhile((x) => x < 4)
        .toArray()
      expect(result).toEqual([1, 2, 3])
    })

    it("should drop while predicate is true", () => {
      const result = LazyList([1, 2, 3, 4, 1, 2])
        .dropWhile((x) => x < 4)
        .toArray()
      expect(result).toEqual([4, 1, 2])
    })
  })

  describe("concat", () => {
    it("should concatenate two lazy lists", () => {
      const list1 = LazyList([1, 2])
      const list2 = LazyList([3, 4])
      const result = list1.concat(list2).toArray()
      expect(result).toEqual([1, 2, 3, 4])
    })
  })

  describe("zip", () => {
    it("should zip two lazy lists", () => {
      const list1 = LazyList(["a", "b", "c"])
      const list2 = LazyList([1, 2, 3])
      const result = list1.zip(list2).toArray()
      expect(result).toEqual([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ])
    })

    it("should stop at shorter list", () => {
      const list1 = LazyList(["a", "b"])
      const list2 = LazyList([1, 2, 3, 4])
      const result = list1.zip(list2).toArray()
      expect(result).toEqual([
        ["a", 1],
        ["b", 2],
      ])
    })
  })

  describe("terminal operations", () => {
    it("should reduce values", () => {
      const result = LazyList([1, 2, 3, 4]).reduce((acc, x) => acc + x, 0)
      expect(result).toBe(10)
    })

    it("should find first matching element", () => {
      const result = LazyList([1, 2, 3, 4]).find((x) => x > 2)
      expect(result.isEmpty).toBe(false)
      expect(result.value).toBe(3)
    })

    it("should return none when find has no match", () => {
      const result = LazyList([1, 2, 3]).find((x) => x > 10)
      expect(result.isEmpty).toBe(true)
    })

    it("should check if some elements match", () => {
      expect(LazyList([1, 2, 3]).some((x) => x > 2)).toBe(true)
      expect(LazyList([1, 2, 3]).some((x) => x > 10)).toBe(false)
    })

    it("should check if every element matches", () => {
      expect(LazyList([2, 4, 6]).every((x) => x % 2 === 0)).toBe(true)
      expect(LazyList([2, 3, 6]).every((x) => x % 2 === 0)).toBe(false)
    })

    it("should count elements", () => {
      expect(LazyList([1, 2, 3, 4, 5]).count()).toBe(5)
      expect(LazyList.empty().count()).toBe(0)
    })

    it("should get first element via headOption", () => {
      const result1 = LazyList([1, 2, 3]).headOption
      expect(result1.isEmpty).toBe(false)
      expect(result1.value).toBe(1)

      const result2 = LazyList.empty<number>().headOption
      expect(result2.isEmpty).toBe(true)
    })

    it("should get last element via lastOption", () => {
      const result1 = LazyList([1, 2, 3]).lastOption
      expect(result1.isEmpty).toBe(false)
      expect(result1.value).toBe(3)

      const result2 = LazyList.empty<number>().lastOption
      expect(result2.isEmpty).toBe(true)
    })
  })

  describe("infinite sequences", () => {
    it("should create infinite sequence with iterate", () => {
      const result = LazyList.iterate(1, (x) => x * 2)
        .take(5)
        .toArray()
      expect(result).toEqual([1, 2, 4, 8, 16])
    })

    it("should create infinite sequence with generate", () => {
      let counter = 0
      const result = LazyList.generate(() => counter++)
        .take(5)
        .toArray()
      expect(result).toEqual([0, 1, 2, 3, 4])
    })

    it("should repeat value infinitely", () => {
      const result = LazyList.repeat("a").take(3).toArray()
      expect(result).toEqual(["a", "a", "a"])
    })

    it("should repeat value n times", () => {
      const result = LazyList.repeat("x", 4).toArray()
      expect(result).toEqual(["x", "x", "x", "x"])
    })

    it("should cycle through values infinitely", () => {
      const result = LazyList.cycle([1, 2, 3]).take(7).toArray()
      expect(result).toEqual([1, 2, 3, 1, 2, 3, 1])
    })
  })

  describe("range", () => {
    it("should create range of numbers", () => {
      expect(LazyList.range(1, 5).toArray()).toEqual([1, 2, 3, 4])
    })

    it("should create range with step", () => {
      expect(LazyList.range(0, 10, 2).toArray()).toEqual([0, 2, 4, 6, 8])
    })

    it("should create descending range", () => {
      expect(LazyList.range(5, 1, -1).toArray()).toEqual([5, 4, 3, 2])
    })
  })

  describe("performance characteristics", () => {
    it("should handle large sequences efficiently", () => {
      const result = LazyList.range(1, 1000000)
        .filter((x) => x % 2 === 0)
        .map((x) => x * 2)
        .take(5)
        .toArray()

      expect(result).toEqual([4, 8, 12, 16, 20])
      // This should complete quickly without processing all million numbers
    })

    it("should short-circuit on find", () => {
      let processed = 0
      const result = LazyList.range(1, 1000000)
        .map((x) => {
          processed++
          return x * 2
        })
        .find((x) => x > 100)

      expect(result.isEmpty).toBe(false)
      expect(processed).toBeLessThan(100) // Should process far fewer than a million
    })
  })

  describe("Foldable interface", () => {
    it("should implement fold", () => {
      const list = LazyList([1, 2, 3])
      const result = list.fold(
        () => "empty",
        (value) => `has value: ${value}`,
      )
      expect(result).toBe("has value: 1")
    })

    it("should fold empty list", () => {
      const list = LazyList.empty<number>()
      const result = list.fold(
        () => "empty",
        (value) => `has value: ${value}`,
      )
      expect(result).toBe("empty")
    })

    it("should implement foldLeft", () => {
      const list = LazyList([1, 2, 3, 4])
      const result = list.foldLeft(0)((acc, x) => acc + x)
      expect(result).toBe(10)
    })

    it("should implement foldRight", () => {
      const list = LazyList(["a", "b", "c"])
      const result = list.foldRight("")((x, acc) => x + acc)
      expect(result).toBe("abc")
    })
  })

  describe("Pipe interface", () => {
    it("should pipe through functions", () => {
      const list = LazyList([1, 2, 3])
      const result = list
        .pipe((lazy) => lazy.map((x) => x * 2))
        .pipe((lazy) => lazy.filter((x) => x > 3))
        .pipe((lazy) => lazy.toArray())
      expect(result).toEqual([4, 6])
    })
  })

  describe("Serializable interface", () => {
    it("should serialize to JSON", () => {
      const list = LazyList([1, 2, 3])
      const json = list.serialize().toJSON()
      expect(json).toBe('{"_tag":"LazyList","value":[1,2,3]}')
    })

    it("should serialize to YAML", () => {
      const list = LazyList(["a", "b", "c"])
      const yaml = list.serialize().toYAML()
      expect(yaml).toBe('_tag: LazyList\nvalue: ["a","b","c"]')
    })

    it("should serialize to binary", () => {
      const list = LazyList([1, 2])
      const binary = list.serialize().toBinary()
      // Should be base64 encoded
      expect(binary).toMatch(/^[A-Za-z0-9+/=]+$/)
    })

    it("should serialize infinite list by materializing", () => {
      const list = LazyList.iterate(1, (x) => x + 1).take(3)
      const json = list.serialize().toJSON()
      expect(json).toBe('{"_tag":"LazyList","value":[1,2,3]}')
    })
  })

  describe("Typeable interface", () => {
    it("should have _tag property", () => {
      const list = LazyList([1, 2, 3])
      expect(list._tag).toBe("LazyList")
    })
  })

  describe("element access properties", () => {
    it("head returns first element", () => {
      expect(LazyList([1, 2, 3]).head).toBe(1)
    })

    it("head returns undefined on empty", () => {
      expect(LazyList.empty<number>().head).toBeUndefined()
    })

    it("headOption returns Some for non-empty", () => {
      const opt = LazyList([10, 20]).headOption
      expect(opt.isEmpty).toBe(false)
      expect(opt.value).toBe(10)
    })

    it("headOption returns None for empty", () => {
      expect(LazyList.empty<number>().headOption.isEmpty).toBe(true)
    })

    it("last returns last element", () => {
      expect(LazyList([1, 2, 3]).last).toBe(3)
    })

    it("last returns undefined on empty", () => {
      expect(LazyList.empty<number>().last).toBeUndefined()
    })

    it("lastOption returns Some for non-empty", () => {
      const opt = LazyList([10, 20, 30]).lastOption
      expect(opt.isEmpty).toBe(false)
      expect(opt.value).toBe(30)
    })

    it("lastOption returns None for empty", () => {
      expect(LazyList.empty<number>().lastOption.isEmpty).toBe(true)
    })
  })

  describe("tail and init", () => {
    it("tail returns lazy list without first", () => {
      expect(LazyList([1, 2, 3]).tail.toArray()).toEqual([2, 3])
    })

    it("tail returns empty for empty list", () => {
      expect(LazyList.empty<number>().tail.toArray()).toEqual([])
    })

    it("tail returns empty for single element", () => {
      expect(LazyList([42]).tail.toArray()).toEqual([])
    })

    it("init returns lazy list without last", () => {
      expect(LazyList([1, 2, 3]).init.toArray()).toEqual([1, 2])
    })

    it("init returns empty for empty list", () => {
      expect(LazyList.empty<number>().init.toArray()).toEqual([])
    })

    it("init returns empty for single element", () => {
      expect(LazyList([42]).init.toArray()).toEqual([])
    })
  })

  describe("takeRight", () => {
    it("returns last n elements", () => {
      expect(LazyList([1, 2, 3, 4, 5]).takeRight(3).toArray()).toEqual([3, 4, 5])
    })

    it("handles n > length", () => {
      expect(LazyList([1, 2]).takeRight(5).toArray()).toEqual([1, 2])
    })

    it("handles n <= 0", () => {
      expect(LazyList([1, 2, 3]).takeRight(0).toArray()).toEqual([])
      expect(LazyList([1, 2, 3]).takeRight(-1).toArray()).toEqual([])
    })
  })

  describe("reverse", () => {
    it("reverses order", () => {
      expect(LazyList([1, 2, 3]).reverse().toArray()).toEqual([3, 2, 1])
    })

    it("returns empty for empty", () => {
      expect(LazyList.empty<number>().reverse().toArray()).toEqual([])
    })
  })

  describe("distinct", () => {
    it("removes duplicates", () => {
      expect(LazyList([1, 2, 2, 3, 1, 3]).distinct().toArray()).toEqual([1, 2, 3])
    })

    it("preserves order of first occurrence", () => {
      expect(LazyList([3, 1, 2, 1, 3]).distinct().toArray()).toEqual([3, 1, 2])
    })

    it("returns empty for empty", () => {
      expect(LazyList.empty<number>().distinct().toArray()).toEqual([])
    })
  })

  describe("zipWithIndex", () => {
    it("pairs with indices", () => {
      expect(LazyList(["a", "b", "c"]).zipWithIndex().toArray()).toEqual([
        ["a", 0],
        ["b", 1],
        ["c", 2],
      ])
    })

    it("returns empty for empty", () => {
      expect(LazyList.empty<string>().zipWithIndex().toArray()).toEqual([])
    })
  })

  describe("toString", () => {
    it("should show elements for finite list", () => {
      const list = LazyList([1, 2, 3])
      expect(list.toString()).toBe("LazyList(1, 2, 3)")
    })

    it("should truncate large lists", () => {
      const list = LazyList.range(1, 20)
      expect(list.toString()).toBe("LazyList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...)")
    })

    it("should handle empty list", () => {
      const list = LazyList.empty()
      expect(list.toString()).toBe("LazyList()")
    })

    it("should handle infinite lists", () => {
      const list = LazyList.iterate(1, (x) => x + 1)
      expect(list.toString()).toBe("LazyList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...)")
    })
  })
})
