import { describe, test } from "vitest"
import { List } from "@/list"

describe("List Performance", () => {
  // Create test data
  const sizes = [100, 1000, 10000]

  sizes.forEach((size) => {
    describe(`with ${size} items`, () => {
      const data = Array.from({ length: size }, (_, i) => i)
      const list = List(data)

      test("creation from array", async ({ bench }) => {
        await bench("creation from array", () => {
          List(data)
        }).run()
      })

      test("map operation", async ({ bench }) => {
        await bench("map operation", () => {
          list.map((x) => x * 2)
        }).run()
      })

      test("filter operation", async ({ bench }) => {
        await bench("filter operation", () => {
          list.filter((x) => x % 2 === 0)
        }).run()
      })

      test("chained map + filter", async ({ bench }) => {
        await bench("chained map + filter", () => {
          list.map((x) => x * 2).filter((x) => x % 3 === 0)
        }).run()
      })

      test("flatMap operation", async ({ bench }) => {
        await bench("flatMap operation", () => {
          list.flatMap((x) => List([x, x * 2]))
        }).run()
      })

      test("reduce sum", async ({ bench }) => {
        await bench("reduce sum", () => {
          list.reduce((acc, x) => acc + x)
        }).run()
      })

      test("drop operation", async ({ bench }) => {
        await bench("drop operation", () => {
          list.drop(Math.floor(size / 2))
        }).run()
      })

      test("toArray conversion", async ({ bench }) => {
        await bench("toArray conversion", () => {
          list.toArray()
        }).run()
      })
    })
  })

  describe("comparison with native Array", () => {
    const size = 1000
    const data = Array.from({ length: size }, (_, i) => i)
    const list = List(data)

    test("List map vs Array map", async ({ bench }) => {
      await bench("List map vs Array map", () => {
        list.map((x) => x * 2)
      }).run()
    })

    test("Array map (baseline)", async ({ bench }) => {
      await bench("Array map (baseline)", () => {
        data.map((x) => x * 2)
      }).run()
    })

    test("List chained operations", async ({ bench }) => {
      await bench("List chained operations", () => {
        list
          .map((x) => x * 2)
          .filter((x) => x % 3 === 0)
          .map((x) => x + 1)
      }).run()
    })

    test("Array chained operations (baseline)", async ({ bench }) => {
      await bench("Array chained operations (baseline)", () => {
        data
          .map((x) => x * 2)
          .filter((x) => x % 3 === 0)
          .map((x) => x + 1)
      }).run()
    })
  })
})
