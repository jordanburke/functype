import { bench, describe } from "vitest"
import { List } from "@/list"

describe("List Performance", () => {
  // Create test data
  const sizes = [100, 1000, 10000]

  sizes.forEach((size) => {
    describe(`with ${size} items`, () => {
      const data = Array.from({ length: size }, (_, i) => i)
      const list = List(data)

      bench("creation from array", () => {
        List(data)
      })

      bench("map operation", () => {
        list.map((x) => x * 2)
      })

      bench("filter operation", () => {
        list.filter((x) => x % 2 === 0)
      })

      bench("chained map + filter", () => {
        list.map((x) => x * 2).filter((x) => x % 3 === 0)
      })

      bench("flatMap operation", () => {
        list.flatMap((x) => List([x, x * 2]))
      })

      bench("reduce sum", () => {
        list.reduce((acc, x) => acc + x)
      })

      bench("drop operation", () => {
        list.drop(Math.floor(size / 2))
      })

      bench("toArray conversion", () => {
        list.toArray()
      })
    })
  })

  describe("comparison with native Array", () => {
    const size = 1000
    const data = Array.from({ length: size }, (_, i) => i)
    const list = List(data)

    bench("List map vs Array map", () => {
      list.map((x) => x * 2)
    })

    bench("Array map (baseline)", () => {
      data.map((x) => x * 2)
    })

    bench("List chained operations", () => {
      list
        .map((x) => x * 2)
        .filter((x) => x % 3 === 0)
        .map((x) => x + 1)
    })

    bench("Array chained operations (baseline)", () => {
      data
        .map((x) => x * 2)
        .filter((x) => x % 3 === 0)
        .map((x) => x + 1)
    })
  })
})
