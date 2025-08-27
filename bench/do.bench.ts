import { bench, describe } from "vitest"

import { $, Do, DoAsync } from "@/do"
import { Left, List, None, Option, Right, Try } from "@/index"

describe("Do-notation Performance", () => {
  describe("Do vs traditional flatMap chains", () => {
    bench("traditional nested flatMap - 3 levels", () => {
      const result = Option(5).flatMap((x) => Option(10).flatMap((y) => Option(15).flatMap((z) => Option(x + y + z))))
      return result.get()
    })

    bench("Do-notation - 3 levels", () => {
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })
      return result.get()
    })

    bench("traditional nested flatMap - 5 levels", () => {
      const result = Option(1).flatMap((a) =>
        Option(2).flatMap((b) =>
          Option(3).flatMap((c) => Option(4).flatMap((d) => Option(5).flatMap((e) => Option(a + b + c + d + e)))),
        ),
      )
      return result.get()
    })

    bench("Do-notation - 5 levels", () => {
      const result = Do(function* () {
        const a = yield* $(Option(1))
        const b = yield* $(Option(2))
        const c = yield* $(Option(3))
        const d = yield* $(Option(4))
        const e = yield* $(Option(5))
        return a + b + c + d + e
      })
      return result.get()
    })
  })

  describe("Short-circuiting performance", () => {
    bench("traditional - early None", () => {
      const result = Option(5).flatMap((x) =>
        None<number>().flatMap((y) => Option(10).flatMap((z) => Option(x + y + z))),
      )
      return result.isNone()
    })

    bench("Do-notation - early None", () => {
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(None<number>())
        const z = yield* $(Option(10))
        return x + y + z
      })
      return result.isNone()
    })

    bench("traditional - early Left", () => {
      const result = Right<string, number>(5).flatMap((x) =>
        Left<string, number>("error").flatMap((y) =>
          Right<string, number>(10).flatMap((z) => Right<string, number>(x + y + z)),
        ),
      )
      return result.isLeft()
    })

    bench("Do-notation - early Left", () => {
      const result = Do(function* () {
        const x = yield* $(Right<string, number>(5))
        const y = yield* $(Left<string, number>("error"))
        const z = yield* $(Right<string, number>(10))
        return x + y + z
      })
      return result.isLeft()
    })
  })

  describe("List comprehensions", () => {
    const list10 = List(Array.from({ length: 10 }, (_, i) => i))
    const list100 = List(Array.from({ length: 100 }, (_, i) => i))

    bench("traditional - cartesian product 10x10", () => {
      const result = list10.flatMap((x) => list10.flatMap((y) => List([x + y])))
      return result.size
    })

    bench("Do-notation - cartesian product 10x10", () => {
      const result = Do(function* () {
        const x = yield* $(list10)
        const y = yield* $(list10)
        return x + y
      })
      return result.size
    })

    bench("traditional - cartesian product 10x10x10", () => {
      const result = list10.flatMap((x) => list10.flatMap((y) => list10.flatMap((z) => List([x + y + z]))))
      return result.size
    })

    bench("Do-notation - cartesian product 10x10x10", () => {
      const result = Do(function* () {
        const x = yield* $(list10)
        const y = yield* $(list10)
        const z = yield* $(list10)
        return x + y + z
      })
      return result.size
    })

    bench("traditional - filtered cartesian product", () => {
      const result = list10.flatMap((x) => list10.flatMap((y) => (x < y ? List([{ x, y }]) : List([]))))
      return result.size
    })

    bench("Do-notation - filtered cartesian product", () => {
      const result = Do(function* () {
        const x = yield* $(list10)
        const y = yield* $(list10)
        return x < y ? Option({ x, y }) : None<{ x: number; y: number }>()
      })
        .filter((opt) => opt.isSome())
        .map((opt) => opt.get())
      return result.size
    })
  })

  describe("Mixed monad types with Reshapeable", () => {
    bench("traditional - mixed types with conversions", () => {
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
      return result.get()
    })

    bench("Do-notation - mixed types with Reshapeable", () => {
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(List([15]))
        const w = yield* $(Try(() => 20))
        return x + y + z + w
      }).toOption()
      return result.get()
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

    bench("traditional - user registration flow", () => {
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
      return result.isSome()
    })

    bench("Do-notation - user registration flow", () => {
      const result = Do(function* () {
        const email = yield* $(validateEmail("user@example.com"))
        const availEmail = yield* $(checkAvailable(email))
        const hashedPw = yield* $(hashPassword("password123"))
        return {
          email: availEmail,
          password: hashedPw,
          created: Date.now(),
        }
      }).toOption()
      return result.isSome()
    })
  })

  describe("Async operations", () => {
    const fetchUser = async (id: number) => Promise.resolve(Option({ id, name: `User${id}` }))

    const fetchScore = async (userId: number) => Promise.resolve(Right<string, number>(userId * 10))

    const fetchBonus = async (score: number) => Promise.resolve(Try(() => (score > 50 ? 10 : 5)))

    bench("traditional async - chained promises", async () => {
      const result = await fetchUser(5).then((userOpt) =>
        userOpt.isNone()
          ? Promise.resolve(None<number>())
          : fetchScore(userOpt.get().id).then((scoreEither) =>
              scoreEither.isLeft()
                ? Promise.resolve(None<number>())
                : fetchBonus(scoreEither.value).then((bonusTry) =>
                    bonusTry.isFailure() ? None<number>() : Option(scoreEither.value + bonusTry.get()),
                  ),
            ),
      )
      return result.orElse(Option(0)).get()
    })

    bench("DoAsync - async comprehension", async () => {
      const result = await DoAsync(async function* () {
        const user = yield* $(await fetchUser(5))
        const score = yield* $(await fetchScore(user.id))
        const bonus = yield* $(await fetchBonus(score))
        return score + bonus
      })
      return result.toOption().orElse(Option(0)).get()
    })
  })

  describe("Memory allocation patterns", () => {
    bench("traditional - many intermediate objects", () => {
      let result = Option(0)
      for (let i = 0; i < 100; i++) {
        result = result.flatMap((x) => Option(x + 1))
      }
      return result.get()
    })

    bench("Do-notation - generator with state", () => {
      const result = Do(function* () {
        let sum = 0
        for (let i = 0; i < 100; i++) {
          const value = yield* $(Option(1))
          sum += value
        }
        return sum
      })
      return result.get()
    })
  })

  describe("Error handling performance", () => {
    const riskyOperation = (n: number) =>
      Try(() => {
        if (n < 0) throw new Error("Negative")
        if (n > 100) throw new Error("Too large")
        return n * 2
      })

    bench("traditional - multiple Try operations", () => {
      const result = riskyOperation(10)
        .flatMap((x) => riskyOperation(x))
        .flatMap((x) => riskyOperation(x))
        .flatMap((x) => riskyOperation(x))
      return result.getOrElse(0)
    })

    bench("Do-notation - multiple Try operations", () => {
      const result = Do(function* () {
        const a = yield* $(riskyOperation(10))
        const b = yield* $(riskyOperation(a))
        const c = yield* $(riskyOperation(b))
        const d = yield* $(riskyOperation(c))
        return d
      })
      return result.toOption().getOrElse(0)
    })
  })

  describe("Conditional logic performance", () => {
    bench("traditional - conditional flatMaps", () => {
      const result = Option(50)
        .flatMap((x) => (x > 25 ? Option(x * 2) : Option(x)))
        .flatMap((x) => (x > 75 ? Option(x + 10) : Option(x - 10)))
        .flatMap((x) => (x > 100 ? Option(x / 2) : Option(x * 3)))
      return result.get()
    })

    bench("Do-notation - conditional logic", () => {
      const result = Do(function* () {
        let x = yield* $(Option(50))
        x = x > 25 ? x * 2 : x
        const y = yield* $(Option(x > 75 ? x + 10 : x - 10))
        return y > 100 ? y / 2 : y * 3
      })
      return result.get()
    })
  })
})
