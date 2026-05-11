import { bench, describe } from "vitest"

import { $, Do } from "@/do"
import { List } from "@/list"
import { Option } from "@/option"

describe("Accurate Do-notation vs Traditional Comparison", () => {
  describe("Basic flatMap chains (no short-circuit)", () => {
    // These should be more comparable since both execute all operations
    bench("Traditional - 3 Option flatMaps (all Some)", () => {
      Option(5)
        .flatMap((x) => Option(10).map((y) => x + y))
        .flatMap((sum) => Option(15).map((z) => sum + z))
    })

    bench("Do-notation - 3 Option yields (all Some)", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
    })

    bench("Traditional - nested structure", () => {
      Option(5).flatMap((x) => Option(10).flatMap((y) => Option(15).map((z) => x + y + z)))
    })

    bench("Traditional - with intermediate variables", () => {
      const opt1 = Option(5)
      opt1.flatMap((x) => {
        const opt2 = Option(10)
        return opt2.flatMap((y) => {
          const opt3 = Option(15)
          return opt3.map((z) => x + y + z)
        })
      })
    })
  })

  describe("Short-circuit comparison (fair)", () => {
    // For fair comparison, we need to ensure both approaches
    // actually check the values before proceeding

    bench("Traditional - with None check (proper)", () => {
      const opt1 = Option(5)
      if (opt1.isNone()) return

      const opt2 = Option.none<number>()
      if (opt2.isNone()) return

      const opt3 = Option(15)
      opt1.flatMap((x) => opt2.flatMap((y) => opt3.map((z) => x + y + z)))
    })

    bench("Traditional - flatMap chain (auto short-circuit)", () => {
      Option(5)
        .flatMap((_x) => Option.none<number>())
        .flatMap((y) => Option(15).map((z) => y + z))
    })

    bench("Do-notation - early None", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option.none<number>())
        const z = yield* $(Option(15))
        return x + y + z
      })
    })
  })

  describe("Generator overhead measurement", () => {
    // Measure the overhead of generator machinery vs direct calls

    bench("Direct Option operations", () => {
      const a = Option(1)
      const b = Option(2)
      const c = Option(3)

      if (a.isSome() && b.isSome() && c.isSome()) {
        Option(a.orThrow() + b.orThrow() + c.orThrow())
      }
    })

    bench("Manual state machine (simulating Do)", () => {
      let step = 0
      let x = 0,
        y = 0,
        z = 0

      while (step <= 3) {
        switch (step) {
          case 0: {
            const opt = Option(1)
            if (opt.isNone()) return
            x = opt.orThrow()
            step++
            break
          }
          case 1: {
            const opt = Option(2)
            if (opt.isNone()) return
            y = opt.orThrow()
            step++
            break
          }
          case 2: {
            const opt = Option(3)
            if (opt.isNone()) return
            z = opt.orThrow()
            step++
            break
          }
          case 3:
            Option(x + y + z)
            return
        }
      }
    })

    bench("Generator with Do", () => {
      Do(function* () {
        const x = yield* $(Option(1))
        const y = yield* $(Option(2))
        const z = yield* $(Option(3))
        return x + y + z
      })
    })

    bench("Raw generator (no Do wrapper)", () => {
      const gen = function* (): Generator<Option<number>, number, number> {
        const x = yield Option(1)
        const y = yield Option(2)
        const z = yield Option(3)
        return x + y + z
      }

      const iter = gen()
      const r1 = iter.next()
      if (!r1.done) {
        const opt1 = r1.value as Option<number>
        if (opt1.isNone()) return

        const r2 = iter.next(opt1.orThrow())
        if (!r2.done) {
          const opt2 = r2.value as Option<number>
          if (opt2.isNone()) return

          const r3 = iter.next(opt2.orThrow())
          if (!r3.done) {
            const opt3 = r3.value as Option<number>
            if (opt3.isNone()) return

            const final = iter.next(opt3.orThrow())
            if (final.done) {
              Option(final.value)
            }
          }
        }
      }
    })
  })

  describe("List comprehensions (equivalent comparison)", () => {
    const list5 = List([1, 2, 3, 4, 5])

    bench("Traditional - nested flatMap", () => {
      list5.flatMap((x) => list5.flatMap((y) => List([x * y])))
    })

    bench("Traditional - with map at end", () => {
      list5.flatMap((x) => list5.map((y) => x * y))
    })

    bench("Do-notation - cartesian product", () => {
      Do(function* () {
        const x = yield* $(list5)
        const y = yield* $(list5)
        return x * y
      })
    })

    bench("Traditional - with filter", () => {
      list5.flatMap((x) => list5.flatMap((y) => (x < y ? List([{ x, y }]) : List([]))))
    })

    bench("Do-notation - with filter (inline)", () => {
      Do(function* () {
        const x = yield* $(list5)
        const y = yield* $(list5)
        if (x < y) {
          return { x, y }
        }
        return yield* $(List<{ x: number; y: number }>([]))
      })
    })
  })
})

describe("Performance bottleneck analysis", () => {
  describe("Do function overhead breakdown", () => {
    bench("Creating generator only", () => {
      void function* () {
        const x = yield* $(Option(5))
        return x
      }
    })

    bench("Creating and calling generator", () => {
      const gen = function* () {
        const x = yield* $(Option(5))
        return x
      }
      void gen() // Create the iterator
    })

    bench("Do with single yield", () => {
      Do(function* () {
        const x = yield* $(Option(5))
        return x
      })
    })

    bench("Do with type detection only", () => {
      const opt = Option(5)
      const tag = opt._tag
      void (tag === "Some" || tag === "None" ? "Option" : "unknown")
    })

    bench("Traditional single flatMap", () => {
      Option(5).flatMap((x) => Option(x))
    })

    bench("Traditional single map", () => {
      Option(5).map((x) => x)
    })
  })
})
