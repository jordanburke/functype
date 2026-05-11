import { bench, describe } from "vitest"

import { $, Do } from "@/do"
import { List } from "@/list"
import { Option } from "@/option"

describe("Do-notation optimization targets", () => {
  describe("Overhead analysis", () => {
    const simpleGen = function* () {
      const x = yield* $(Option(5))
      return x * 2
    }

    bench("Baseline: Option.map", () => {
      Option(5).map((x) => x * 2)
    })

    bench("Do - current implementation", () => {
      Do(simpleGen)
    })

    bench("Do - without type caching (simulated old)", () => {
      const gen = simpleGen
      const iter = gen()
      let firstMonadType: string | null = null

      function step(value?: number): unknown {
        const result = iter.next(value!)

        if (result.done) {
          // Always lookup constructor
          const MonadConstructors: any = {
            Option: { of: (v: any) => Option(v) },
          }
          if (firstMonadType && firstMonadType in MonadConstructors) {
            return MonadConstructors[firstMonadType].of(result.value)
          }
          return Option(result.value)
        }

        const yielded = result.value

        // Type detection
        if (!firstMonadType && yielded && typeof yielded === "object" && "_tag" in yielded) {
          const tag = yielded._tag
          firstMonadType = tag === "Some" || tag === "None" ? "Option" : "unknown"
        }

        // doUnwrap check (repeated)
        if (
          yielded &&
          typeof yielded === "object" &&
          "doUnwrap" in yielded &&
          typeof (yielded as any).doUnwrap === "function"
        ) {
          const doResult = (yielded as any).doUnwrap()
          if (!doResult.ok) return Option.none()
          return step(doResult.value)
        }

        throw new Error("Not a monad")
      }

      step()
    })

    bench("Minimal Do implementation", () => {
      const gen = simpleGen
      const iter = gen()

      // Super minimal - assume we know it's Option
      const result = iter.next()
      if (!result.done) {
        const opt = result.value as Option<number>
        if (opt.isSome()) {
          const final = iter.next(opt.orThrow())
          if (final.done) {
            Option(final.value)
            return
          }
        }
        return
      }
    })
  })

  describe("Type detection optimization potential", () => {
    bench("Current detectMonadType", () => {
      const value = Option(5)
      const tag = value._tag
      let type: string
      switch (tag) {
        case "Some":
        case "None":
          type = "Option"
          break
        default:
          type = "unknown"
      }
      void type
    })

    bench("Direct tag check", () => {
      const value = Option(5)
      const tag = value._tag
      void (tag === "Some" || tag === "None" ? "Option" : "unknown")
    })

    bench("Cached type on first detection", () => {
      // Simulate caching the type on the monad itself
      const value = Option(5) as any
      if (value.__doType) return
      const tag = value._tag
      const type = tag === "Some" || tag === "None" ? "Option" : "unknown"
      value.__doType = type
    })
  })

  describe("doUnwrap optimization", () => {
    const opt = Option(42)

    bench("Current isDoable check", () => {
      const value: unknown = opt
      void (
        value !== null &&
        typeof value === "object" &&
        "doUnwrap" in value &&
        typeof (value as { doUnwrap?: unknown }).doUnwrap === "function"
      )
    })

    bench("Simple property check", () => {
      const value: unknown = opt
      void (value && typeof value === "object" && "doUnwrap" in value)
    })

    bench("Direct method call (no check)", () => {
      // Assuming we know it's doable
      ;(opt as any).doUnwrap()
    })

    bench("Traditional isSome + get", () => {
      if (opt.isSome()) {
        void { ok: true, value: opt.orThrow() }
      } else {
        void { ok: false, empty: true }
      }
    })
  })

  describe("Generator vs imperative", () => {
    bench("Generator - 3 yields", () => {
      Do(function* () {
        const a = yield* $(Option(1))
        const b = yield* $(Option(2))
        const c = yield* $(Option(3))
        return a + b + c
      })
    })

    bench("Imperative state machine", () => {
      // What if Do was implemented as a state machine?
      const values: any[] = [Option(1), Option(2), Option(3)]
      const results: number[] = []

      for (const opt of values) {
        if (opt.isNone()) return
        results.push(opt.orThrow())
      }

      Option(results[0]! + results[1]! + results[2]!)
    })

    bench("Async/await style (theoretical)", () => {
      // This doesn't work but shows the overhead comparison
      try {
        const a = Option(1)
        if (a.isNone()) return
        const aVal = a.orThrow()

        const b = Option(2)
        if (b.isNone()) return
        const bVal = b.orThrow()

        const c = Option(3)
        if (c.isNone()) return
        const cVal = c.orThrow()

        Option(aVal + bVal + cVal)
      } catch {
        // noop
      }
    })
  })

  describe("List comprehension optimization", () => {
    const list3 = List([1, 2, 3])

    bench("Do - current List implementation", () => {
      Do(function* () {
        const x = yield* $(list3)
        const y = yield* $(list3)
        return x * y
      })
    })

    bench("Direct nested loop", () => {
      const results: number[] = []
      const arr1 = list3.toArray()
      const arr2 = list3.toArray()

      for (const x of arr1) {
        for (const y of arr2) {
          results.push(x * y)
        }
      }

      List(results)
    })

    bench("flatMap equivalent", () => {
      list3.flatMap((x) => list3.map((y) => x * y))
    })
  })
})
