import { bench, describe } from "vitest"

import { $, Do } from "@/do"
import { Right } from "@/either"
import { List } from "@/list"
import { Option } from "@/option"

// Simulate the OLD implementation pattern for comparison
function DoOld<T>(gen: () => Generator<unknown, T, unknown>): unknown {
  const iter = gen()
  let firstMonadType: string | null = null

  function detectMonadTypeOld(value: unknown): string {
    if (!value || typeof value !== "object" || !("_tag" in value)) {
      return "unknown"
    }
    switch (value._tag) {
      case "Some":
      case "None":
        return "Option"
      case "Left":
      case "Right":
        return "Either"
      case "List":
        return "List"
      case "Success":
      case "Failure":
        return "Try"
      default:
        return "unknown"
    }
  }

  const MonadConstructors: Record<string, any> = {
    Option: {
      of: <T>(value: T) => Option(value),
      empty: <T>() => Option.none<T>(),
    },
    Either: {
      of: <L, R>(value: R) => Right<L, R>(value),
      empty: <L, R>(error?: L) => ({ _tag: "Left", value: error }),
    },
    List: {
      of: <T>(value: T) => List([value]),
      empty: <T>() => List<T>([]),
    },
  }

  function step(value?: unknown): unknown {
    const result = iter.next(value)

    if (result.done) {
      // OLD: Always lookup in MonadConstructors
      if (firstMonadType && firstMonadType in MonadConstructors) {
        return MonadConstructors[firstMonadType]?.of(result.value)
      }
      return List([result.value])
    }

    const yielded = result.value

    // OLD: Separate checks for _tag and type detection
    if (!firstMonadType && yielded && typeof yielded === "object" && "_tag" in yielded) {
      firstMonadType = detectMonadTypeOld(yielded)

      if (firstMonadType === "List") {
        // Simplified list handling for benchmark
        return List([])
      }
    }

    // OLD: Repeated type checks without helper
    if (
      yielded &&
      typeof yielded === "object" &&
      "doUnwrap" in yielded &&
      typeof (yielded as any).doUnwrap === "function"
    ) {
      const doResult = (yielded as any).doUnwrap()

      if (!doResult.ok) {
        // OLD: Lookup constructor every time
        if (!firstMonadType || !(firstMonadType in MonadConstructors)) {
          return List([])
        }

        const constructor = MonadConstructors[firstMonadType]

        // OLD: Multiple property checks
        if ("empty" in doResult && !doResult.empty && "error" in doResult) {
          if (firstMonadType === "Either") {
            return constructor?.empty(doResult.error)
          }
        }

        return constructor?.empty()
      }

      return step(doResult.value)
    }

    throw new Error("Do-notation error")
  }

  return step()
}

describe("Do optimization before vs after", () => {
  describe("Simple comprehensions", () => {
    bench("OPTIMIZED - Option chain", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })

    bench("OLD - Option chain", () => {
      DoOld(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })
  })

  describe("Early termination", () => {
    bench("OPTIMIZED - early None", () => {
      Do(function* () {
        const x = yield* $(Option.none<number>())
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })

    bench("OLD - early None", () => {
      DoOld(function* () {
        const x = yield* $(Option.none<number>())
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })
  })

  describe("Multiple yields", () => {
    bench("OPTIMIZED - 10 yields", () => {
      Do(function* () {
        let sum = 0
        for (let i = 0; i < 10; i++) {
          sum += yield* $(Option(1))
        }
        return sum
      })
    })

    bench("OLD - 10 yields", () => {
      DoOld(function* () {
        let sum = 0
        for (let i = 0; i < 10; i++) {
          sum += yield* $(Option(1))
        }
        return sum
      })
    })
  })

  describe("Mixed types", () => {
    bench("OPTIMIZED - mixed Option/Either", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })

    bench("OLD - mixed Option/Either", () => {
      DoOld(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })
  })
})

// Summary comparison
describe("Overall performance gains", () => {
  const iterations = 100

  bench("OPTIMIZED - typical usage pattern", () => {
    for (let i = 0; i < iterations; i++) {
      Do(function* () {
        const x = yield* $(Option(Math.random()))
        if (x > 0.5) {
          const y = yield* $(Option(x * 2))
          return y
        }
        return x
      })
    }
  })

  bench("OLD - typical usage pattern", () => {
    for (let i = 0; i < iterations; i++) {
      DoOld(function* () {
        const x = yield* $(Option(Math.random()))
        if (x > 0.5) {
          const y = yield* $(Option(x * 2))
          return y
        }
        return x
      })
    }
  })
})
