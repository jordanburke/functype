import { describe, test } from "vitest"

import { $, Do, DoAsync } from "@/do"
import { Left, List, None, Option, Right, Try } from "@/index"

describe("Do-notation Performance", () => {
  describe("Do vs traditional flatMap chains", () => {
    test("traditional nested flatMap - 3 levels", async ({ bench }) => {
      await bench("traditional nested flatMap - 3 levels", () => {
        const result = Option(5).flatMap((x) => Option(10).flatMap((y) => Option(15).flatMap((z) => Option(x + y + z))))
        result.orThrow()
      }).run()
    })

    test("Do-notation - 3 levels", async ({ bench }) => {
      await bench("Do-notation - 3 levels", () => {
        const result = Do(function* () {
          const x = yield* $(Option(5))
          const y = yield* $(Option(10))
          const z = yield* $(Option(15))
          return x + y + z
        }) as Option<number>
        result.orThrow()
      }).run()
    })

    test("traditional nested flatMap - 5 levels", async ({ bench }) => {
      await bench("traditional nested flatMap - 5 levels", () => {
        const result = Option(1).flatMap((a) =>
          Option(2).flatMap((b) =>
            Option(3).flatMap((c) => Option(4).flatMap((d) => Option(5).flatMap((e) => Option(a + b + c + d + e)))),
          ),
        )
        result.orThrow()
      }).run()
    })

    test("Do-notation - 5 levels", async ({ bench }) => {
      await bench("Do-notation - 5 levels", () => {
        const result = Do(function* () {
          const a = yield* $(Option(1))
          const b = yield* $(Option(2))
          const c = yield* $(Option(3))
          const d = yield* $(Option(4))
          const e = yield* $(Option(5))
          return a + b + c + d + e
        }) as Option<number>
        result.orThrow()
      }).run()
    })
  })

  describe("Short-circuiting performance", () => {
    test("traditional - early None", async ({ bench }) => {
      await bench("traditional - early None", () => {
        const result = Option(5).flatMap((x) =>
          None<number>().flatMap((y) => Option(10).flatMap((z) => Option(x + y + z))),
        )
        result.isNone()
      }).run()
    })

    test("Do-notation - early None", async ({ bench }) => {
      await bench("Do-notation - early None", () => {
        const result = Do(function* () {
          const x = yield* $(Option(5))
          const y = yield* $(None<number>())
          const z = yield* $(Option(10))
          return x + y + z
        }) as Option<number>
        result.isNone()
      }).run()
    })

    test("traditional - early Left", async ({ bench }) => {
      await bench("traditional - early Left", () => {
        const result = Right<string, number>(5).flatMap((x) =>
          Left<string, number>("error").flatMap((y) =>
            Right<string, number>(10).flatMap((z) => Right<string, number>(x + y + z)),
          ),
        )
        result.isLeft()
      }).run()
    })

    test("Do-notation - early Left", async ({ bench }) => {
      await bench("Do-notation - early Left", () => {
        const result = Do(function* () {
          const x = yield* $(Right<string, number>(5))
          const y = yield* $(Left<string, number>("error"))
          const z = yield* $(Right<string, number>(10))
          return x + y + z
        }) as unknown as Option<number>
        result.isNone()
      }).run()
    })
  })

  describe("List comprehensions", () => {
    const list10 = List(Array.from({ length: 10 }, (_, i) => i))

    test("traditional - cartesian product 10x10", async ({ bench }) => {
      await bench("traditional - cartesian product 10x10", () => {
        const result = list10.flatMap((x) => list10.flatMap((y) => List([x + y])))
        void result.size
      }).run()
    })

    test("Do-notation - cartesian product 10x10", async ({ bench }) => {
      await bench("Do-notation - cartesian product 10x10", () => {
        const result = Do(function* () {
          const x = yield* $(list10)
          const y = yield* $(list10)
          return x + y
        }) as List<number>
        void result.size
      }).run()
    })

    test("traditional - cartesian product 10x10x10", async ({ bench }) => {
      await bench("traditional - cartesian product 10x10x10", () => {
        const result = list10.flatMap((x) => list10.flatMap((y) => list10.flatMap((z) => List([x + y + z]))))
        void result.size
      }).run()
    })

    test("Do-notation - cartesian product 10x10x10", async ({ bench }) => {
      await bench("Do-notation - cartesian product 10x10x10", () => {
        const result = Do(function* () {
          const x = yield* $(list10)
          const y = yield* $(list10)
          const z = yield* $(list10)
          return x + y + z
        }) as List<number>
        void result.size
      }).run()
    })

    test("traditional - filtered cartesian product", async ({ bench }) => {
      await bench("traditional - filtered cartesian product", () => {
        const result = list10.flatMap((x) => list10.flatMap((y) => (x < y ? List([{ x, y }]) : List([]))))
        void result.size
      }).run()
    })

    test("Do-notation - filtered cartesian product", async ({ bench }) => {
      await bench("Do-notation - filtered cartesian product", () => {
        const result = (
          Do(function* () {
            const x = yield* $(list10)
            const y = yield* $(list10)
            return x < y ? Option({ x, y }) : None<{ x: number; y: number }>()
          }) as List<Option<{ x: number; y: number }>>
        )
          .filter((opt) => opt.isSome())
          .map((opt) => opt.orThrow())
        void result.size
      }).run()
    })
  })

  describe("Mixed monad types with Reshapeable", () => {
    test("traditional - mixed types with conversions", async ({ bench }) => {
      await bench("traditional - mixed types with conversions", () => {
        const result = Option(5).flatMap((x) =>
          Right<string, number>(10)
            .toOption()
            .flatMap((y) =>
              List([15])
                .toOption()
                .flatMap((z) =>
                  Try(() => 20)
                    .toOption()
                    .flatMap((w) => Option(x + y + z + w)),
                ),
            ),
        )
        result.orThrow()
      }).run()
    })

    test("Do-notation - mixed types with Reshapeable", async ({ bench }) => {
      await bench("Do-notation - mixed types with Reshapeable", () => {
        const result = (
          Do(function* () {
            const x = yield* $(Option(5))
            const y = yield* $(Right<string, number>(10))
            const z = yield* $(List([15]))
            const w = yield* $(Try(() => 20))
            return x + y + z + w
          }) as Option<number>
        ).toOption()
        result.orThrow()
      }).run()
    })
  })

  describe("Complex business logic", () => {
    const validateEmail = (email: string) => (email.includes("@") ? Option(email) : None<string>())

    const checkAvailable = (email: string) =>
      email !== "taken@example.com" ? Right<string, string>(email) : Left<string, string>("Email taken")

    const hashPassword = (password: string) =>
      Try(() => {
        if (password.length < 8) throw new Error("Too short")
        return `hashed_${password}`
      })

    test("traditional - user registration flow", async ({ bench }) => {
      await bench("traditional - user registration flow", () => {
        const result = validateEmail("user@example.com").flatMap((email) =>
          checkAvailable(email)
            .toOption()
            .flatMap((availEmail) =>
              hashPassword("password123")
                .toOption()
                .flatMap((hashedPw) =>
                  Option({
                    email: availEmail,
                    password: hashedPw,
                    created: Date.now(),
                  }),
                ),
            ),
        )
        result.isSome()
      }).run()
    })

    test("Do-notation - user registration flow", async ({ bench }) => {
      await bench("Do-notation - user registration flow", () => {
        const result = (
          Do(function* () {
            const email = yield* $(validateEmail("user@example.com"))
            const availEmail = yield* $(checkAvailable(email))
            const hashedPw = yield* $(hashPassword("password123"))
            return {
              email: availEmail,
              password: hashedPw,
              created: Date.now(),
            }
          }) as Option<{ email: string; password: string; created: number }>
        ).toOption()
        result.isSome()
      }).run()
    })
  })

  describe("Async operations", () => {
    const fetchUser = async (id: number) => Promise.resolve(Option({ id, name: `User${id}` }))

    const fetchScore = async (userId: number) => Promise.resolve(Right<string, number>(userId * 10))

    const fetchBonus = async (score: number) => Promise.resolve(Try(() => (score > 50 ? 10 : 5)))

    test("traditional async - chained promises", async ({ bench }) => {
      await bench("traditional async - chained promises", async () => {
        const result = await fetchUser(5).then((userOpt) =>
          userOpt.isNone()
            ? Promise.resolve(None<number>())
            : fetchScore(userOpt.orThrow().id).then((scoreEither) => {
                if (scoreEither.isLeft()) return Promise.resolve(None<number>())
                const score = scoreEither.value as number
                return fetchBonus(score).then((bonusTry) =>
                  bonusTry.isFailure() ? None<number>() : Option(score + bonusTry.orThrow()),
                )
              }),
        )
        result.orElse(0)
      }).run()
    })

    test("DoAsync - async comprehension", async ({ bench }) => {
      await bench("DoAsync - async comprehension", async () => {
        const result = (await DoAsync(async function* () {
          const user = yield* $(await fetchUser(5))
          const score = yield* $(await fetchScore(user.id))
          const bonus = yield* $(await fetchBonus(score))
          return score + bonus
        })) as Option<number>
        result.toOption().orElse(0)
      }).run()
    })
  })

  describe("Memory allocation patterns", () => {
    test("traditional - many intermediate objects", async ({ bench }) => {
      await bench("traditional - many intermediate objects", () => {
        let result = Option(0)
        for (let i = 0; i < 100; i++) {
          result = result.flatMap((x) => Option(x + 1))
        }
        result.orThrow()
      }).run()
    })

    test("Do-notation - generator with state", async ({ bench }) => {
      await bench("Do-notation - generator with state", () => {
        const result = Do(function* () {
          let sum = 0
          for (let i = 0; i < 100; i++) {
            const value = yield* $(Option(1))
            sum += value
          }
          return sum
        }) as Option<number>
        result.orThrow()
      }).run()
    })
  })

  describe("Error handling performance", () => {
    const riskyOperation = (n: number) =>
      Try(() => {
        if (n < 0) throw new Error("Negative")
        if (n > 100) throw new Error("Too large")
        return n * 2
      })

    test("traditional - multiple Try operations", async ({ bench }) => {
      await bench("traditional - multiple Try operations", () => {
        const result = riskyOperation(10)
          .flatMap((x) => riskyOperation(x))
          .flatMap((x) => riskyOperation(x))
          .flatMap((x) => riskyOperation(x))
        result.orElse(0)
      }).run()
    })

    test("Do-notation - multiple Try operations", async ({ bench }) => {
      await bench("Do-notation - multiple Try operations", () => {
        const result = (
          Do(function* () {
            const a = yield* $(riskyOperation(10))
            const b = yield* $(riskyOperation(a))
            const c = yield* $(riskyOperation(b))
            const d = yield* $(riskyOperation(c))
            return d
          }) as Try<number>
        ).toOption()
        result.orElse(0)
      }).run()
    })
  })

  describe("Conditional logic performance", () => {
    test("traditional - conditional flatMaps", async ({ bench }) => {
      await bench("traditional - conditional flatMaps", () => {
        const result = Option(50)
          .flatMap((x) => (x > 25 ? Option(x * 2) : Option(x)))
          .flatMap((x) => (x > 75 ? Option(x + 10) : Option(x - 10)))
          .flatMap((x) => (x > 100 ? Option(x / 2) : Option(x * 3)))
        result.orThrow()
      }).run()
    })

    test("Do-notation - conditional logic", async ({ bench }) => {
      await bench("Do-notation - conditional logic", () => {
        const result = Do(function* () {
          let x = yield* $(Option(50))
          x = x > 25 ? x * 2 : x
          const y = yield* $(Option(x > 75 ? x + 10 : x - 10))
          return y > 100 ? y / 2 : y * 3
        }) as Option<number>
        result.orThrow()
      }).run()
    })
  })
})
