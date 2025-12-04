import { bench, describe } from "vitest"

import { $, Do, DoAsync } from "@/do"
import { Left, Right } from "@/either"
import { List } from "@/list"
import { Option } from "@/option"
import { Try } from "@/try"

// Test scenarios with different patterns
describe("Do-notation performance optimization", () => {
  describe("Simple Option comprehension", () => {
    bench("Option - all Some", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })

    bench("Option - early None", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option.none<number>())
        const z = yield* $(Option(15))
        return x + y + z
      })
    })

    bench("Option - late None", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option.none<number>())
        return x + y + z
      })
    })
  })

  describe("Either comprehension", () => {
    bench("Either - all Right", () => {
      Do(function* () {
        const x = yield* $(Right<string, number>(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(Right<string, number>(15))
        return x + y + z
      })
    })

    bench("Either - early Left", () => {
      Do(function* () {
        const x = yield* $(Right<string, number>(5))
        const y = yield* $(Left<string, number>("error"))
        const z = yield* $(Right<string, number>(15))
        return x + y + z
      })
    })
  })

  describe("List comprehension (cartesian product)", () => {
    bench("List - small cartesian", () => {
      Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List([10, 20]))
        return x + y
      })
    })

    bench("List - medium cartesian", () => {
      Do(function* () {
        const x = yield* $(List([1, 2, 3]))
        const y = yield* $(List([10, 20, 30]))
        const z = yield* $(List([100, 200]))
        return x + y + z
      })
    })

    bench("List - with early empty", () => {
      Do(function* () {
        const x = yield* $(List([1, 2, 3]))
        const y = yield* $(List<number>([]))
        const z = yield* $(List([100, 200]))
        return x + y + z
      })
    })
  })

  describe("Try comprehension", () => {
    bench("Try - all Success", () => {
      Do(function* () {
        const x = yield* $(Try(() => 5))
        const y = yield* $(Try(() => 10))
        const z = yield* $(Try(() => 15))
        return x + y + z
      })
    })

    bench("Try - with Failure", () => {
      Do(function* () {
        const x = yield* $(Try(() => 5))
        const y = yield* $(
          Try<number>(() => {
            throw new Error("fail")
          }),
        )
        const z = yield* $(Try(() => 15))
        return x + y + z
      })
    })
  })

  describe("Mixed monad types", () => {
    bench("Mixed - Option to Either", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })

    bench("Mixed - with List", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(List([1, 2]))
        const z = yield* $(Right<string, number>(10))
        return x + y + z
      })
    })
  })

  describe("Deep nesting", () => {
    bench("Deep - 10 yields", () => {
      Do(function* () {
        const a = yield* $(Option(1))
        const b = yield* $(Option(2))
        const c = yield* $(Option(3))
        const d = yield* $(Option(4))
        const e = yield* $(Option(5))
        const f = yield* $(Option(6))
        const g = yield* $(Option(7))
        const h = yield* $(Option(8))
        const i = yield* $(Option(9))
        const j = yield* $(Option(10))
        return a + b + c + d + e + f + g + h + i + j
      })
    })

    bench("Deep - 5 yields with computation", () => {
      Do(function* () {
        const a = yield* $(Option(1))
        const b = yield* $(Option(a * 2))
        const c = yield* $(Option(b * 3))
        const d = yield* $(Option(c * 4))
        const e = yield* $(Option(d * 5))
        return e
      })
    })
  })

  describe("Async Do comprehension", () => {
    bench("DoAsync - with promises", async () => {
      await DoAsync(async function* () {
        const x = yield* $(await Promise.resolve(Option(5)))
        const y = yield* $(await Promise.resolve(Option(10)))
        return x + y
      })
    })

    bench("DoAsync - mixed sync/async", async () => {
      await DoAsync(async function* () {
        const x = yield* $(Option(5))
        const y = yield* $(await Promise.resolve(Right<string, number>(10)))
        return x + y
      })
    })
  })
})

// Micro-benchmarks for specific optimizations
describe("Do-notation micro optimizations", () => {
  const testOption = Option(42)
  const testEither = Right<string, number>(42)
  const testList = List([1, 2, 3])
  void Try(() => 42) // testTry - unused for now

  describe("Type detection performance", () => {
    bench("First yield - Option", () => {
      Do(function* () {
        const x = yield* $(testOption)
        return x
      })
    })

    bench("First yield - Either", () => {
      Do(function* () {
        const x = yield* $(testEither)
        return x
      })
    })

    bench("First yield - List", () => {
      Do(function* () {
        const x = yield* $(testList)
        return x
      })
    })
  })

  describe("Short-circuit performance", () => {
    bench("Immediate None", () => {
      Do(function* () {
        const x = yield* $(Option.none<number>())
        const y = yield* $(Option(10))
        return x + y
      })
    })

    bench("Immediate Left", () => {
      Do(function* () {
        const x = yield* $(Left<string, number>("error"))
        const y = yield* $(Right<string, number>(10))
        return x + y
      })
    })

    bench("Immediate empty List", () => {
      Do(function* () {
        const x = yield* $(List<number>([]))
        const y = yield* $(List([1, 2, 3]))
        return x + y
      })
    })
  })

  describe("Constructor caching impact", () => {
    bench("Many yields - same type", () => {
      Do(function* () {
        let sum = 0
        for (let i = 0; i < 20; i++) {
          sum += yield* $(Option(1))
        }
        return sum
      })
    })
  })
})
