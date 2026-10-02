import { describe, test } from "vitest"
import { List, LazyList } from "@/list"

describe("LazyList vs List Performance", () => {
  const sizes = [1000, 10000, 100000]

  sizes.forEach((size) => {
    describe(`with ${size} items`, () => {
      const data = Array.from({ length: size }, (_, i) => i)

      test("List - chained operations (full)", async ({ bench }) => {
        await bench("List - chained operations (full)", () => {
          List(data)
            .map((x) => x * 2)
            .filter((x) => x % 3 === 0)
            .map((x) => x + 1)
            .toArray()
            .slice(0, 10)
        }).run()
      })

      test("LazyList - chained operations with take", async ({ bench }) => {
        await bench("LazyList - chained operations with take", () => {
          LazyList(data)
            .map((x) => x * 2)
            .filter((x) => x % 3 === 0)
            .map((x) => x + 1)
            .take(10)
            .toArray()
        }).run()
      })

      test("List - find operation", async ({ bench }) => {
        await bench("List - find operation", () => {
          List(data)
            .map((x) => x * 2)
            .find((x) => x > size)
        }).run()
      })

      test("LazyList - find operation", async ({ bench }) => {
        await bench("LazyList - find operation", () => {
          LazyList(data)
            .map((x) => x * 2)
            .find((x) => x > size)
        }).run()
      })
    })
  })

  describe("infinite sequences", () => {
    test("LazyList - infinite range with take", async ({ bench }) => {
      await bench("LazyList - infinite range with take", () => {
        LazyList.iterate(1, (x) => x + 1)
          .map((x) => x * 2)
          .filter((x) => x % 3 === 0)
          .take(100)
          .toArray()
      }).run()
    })

    test("LazyList - generate with take", async ({ bench }) => {
      await bench("LazyList - generate with take", () => {
        let counter = 0
        LazyList.generate(() => counter++)
          .map((x) => x * 2)
          .filter((x) => x % 3 === 0)
          .take(100)
          .toArray()
      }).run()
    })
  })
})
