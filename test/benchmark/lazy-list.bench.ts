import { bench, describe } from "vitest"
import { List, LazyList } from "@/list"

describe("LazyList vs List Performance", () => {
  const sizes = [1000, 10000, 100000]

  sizes.forEach((size) => {
    describe(`with ${size} items`, () => {
      const data = Array.from({ length: size }, (_, i) => i)

      bench("List - chained operations (full)", () => {
        List(data)
          .map((x) => x * 2)
          .filter((x) => x % 3 === 0)
          .map((x) => x + 1)
          .toArray()
          .slice(0, 10)
      })

      bench("LazyList - chained operations with take", () => {
        LazyList(data)
          .map((x) => x * 2)
          .filter((x) => x % 3 === 0)
          .map((x) => x + 1)
          .take(10)
          .toArray()
      })

      bench("List - find operation", () => {
        List(data)
          .map((x) => x * 2)
          .find((x) => x > size)
      })

      bench("LazyList - find operation", () => {
        LazyList(data)
          .map((x) => x * 2)
          .find((x) => x > size)
      })
    })
  })

  describe("infinite sequences", () => {
    bench("LazyList - infinite range with take", () => {
      LazyList.iterate(1, (x) => x + 1)
        .map((x) => x * 2)
        .filter((x) => x % 3 === 0)
        .take(100)
        .toArray()
    })

    bench("LazyList - generate with take", () => {
      let counter = 0
      LazyList.generate(() => counter++)
        .map((x) => x * 2)
        .filter((x) => x % 3 === 0)
        .take(100)
        .toArray()
    })
  })
})
