/**
 * IO shares its methods through one prototype (#276 §14). Each `.map` or `.flatMap` builds a new
 * IO, so a long chain used to copy every method once per step. These tests pin the shape, the 2.0
 * breaks, and the cost.
 */
import { inspect } from "node:util"

import { describe, expect, it, vi } from "vitest"

import { Some } from "@/index"
import { IO } from "@/io/IO"

const inc = (x: number): number => x + 1

describe("IO's shape", () => {
  it("keeps only its effect as an own property", () => {
    expect(Reflect.ownKeys(IO.succeed(1))).toEqual(["effect"])
    expect(Reflect.ownKeys(IO.succeed(1).map(inc))).toEqual(["effect"])
    expect(IO.succeed(1).effect).toEqual({ _tag: "Succeed", value: 1 })
  })

  it("shares one frozen prototype", () => {
    const proto = Object.getPrototypeOf(IO.succeed(1)) as object
    expect(Object.getPrototypeOf(IO.fail("e"))).toBe(proto)
    expect(Object.getPrototypeOf(IO.sync(() => 1).map(inc))).toBe(proto)
    expect(Object.getPrototypeOf(IO(() => 1))).toBe(proto)
    expect(Object.isFrozen(proto)).toBe(true)
  })

  it("prints its effect", () => {
    expect(inspect(IO.succeed(1))).toBe("IO { effect: { _tag: 'Succeed', value: 1 } }")
    expect(Object.prototype.toString.call(IO.succeed(1))).toBe("[object IO]")
    expect(IO.succeed(1).map(inc).toString()).toBe('IO("Map")')
    expect(JSON.stringify(IO.fail("e"))).toBe('{"_tag":"IO","effect":"Fail"}')
  })

  it("still runs, retries, and works in IO.gen", async () => {
    expect(
      IO.succeed(1)
        .map(inc)
        .tap(() => undefined)
        .runSync()
        .orThrow(),
    ).toBe(2)
    const attempts = { n: 0 }
    const flaky = IO.sync(() => ++attempts.n).flatMap((n) => (n < 3 ? IO.fail("again") : IO.succeed(n)))
    expect((await flaky.retry(5).run()).orThrow()).toBe(3)
    const program = IO.gen(function* () {
      const a = yield* IO.succeed(1)
      const b = yield* IO.succeed(2).delay(1)
      return a + b
    })
    expect(await program.runOrThrow()).toBe(3)
  })
})

describe("IO's 2.0 breaks", () => {
  it("a detached call throws once it reads the IO", () => {
    // A method that calls another method on the IO throws at once.
    const { tap, match } = IO.succeed(1)
    expect(() => tap(() => undefined)).toThrow(TypeError)
    expect(() => match({ failure: () => 0, success: inc })).toThrow(TypeError)
    // The runners declare `this: IO<never, E, A>`, so TypeScript rejects a direct detached call. It
    // doesn't catch one passed as a callback, such as `[1].map(io.runSync)`.
    const { runSync } = IO.succeed(1)
    // @ts-expect-error -- the detached call is what's under test
    expect(() => runSync()).toThrow(TypeError)
    // map, flatMap, mapError and the other builders only store the IO they were called on, so a
    // detached call builds an IO around `undefined`, which fails when run.
    const { map } = IO.succeed(1)
    const mapped = map(inc)
    expect(() => mapped.runSync()).toThrow(TypeError)
  })

  it("a spread copies only the effect", () => {
    const copy = { ...IO.succeed(1) }
    expect(Reflect.ownKeys(copy)).toEqual(["effect"])
    expect("map" in copy).toBe(false)
  })

  it("assigning over a method throws, because the prototype is frozen", () => {
    expect(() => {
      // eslint-disable-next-line functional/immutable-data -- the write is what's under test
      ;(IO.succeed(1) as unknown as Record<string, unknown>).map = () => 0
    }).toThrow(TypeError)
  })
})

describe("IOs compare by their effect in test matchers", () => {
  it("two IOs built the same way, with the same functions, are equal", () => {
    expect(IO.succeed(1)).toEqual(IO.succeed(1))
    expect(IO.succeed(1).map(inc)).toEqual(IO.succeed(1).map(inc))
    expect(IO.succeed(1)).toStrictEqual(IO.succeed(1))
    expect({ io: IO.fail("e") }).toEqual({ io: IO.fail("e") })
  })

  it("two IOs with different effects are unequal", () => {
    expect(IO.succeed(1)).not.toEqual(IO.fail(2))
    expect(IO.succeed(1)).not.toEqual(IO.succeed(2))
    expect(IO.succeed(1)).not.toStrictEqual(IO.fail(2))
    expect(IO.succeed(1)).not.toMatchObject(IO.fail(2))
    expect(IO.succeed(1).map(inc)).not.toEqual(IO.succeed(1).map((x) => x * 2))
  })

  it("nested in an object, an array or a Some", () => {
    expect({ io: IO.succeed(1) }).not.toEqual({ io: IO.fail(2) })
    expect([IO.succeed(1)]).not.toEqual([IO.fail(2)])
    expect(Some(IO.succeed(1))).not.toEqual(Some(IO.fail(2)))
  })

  it("toHaveBeenCalledWith tells the right IO from the wrong one", () => {
    const spy = vi.fn()
    spy(IO.succeed(1))
    expect(spy).toHaveBeenCalledWith(IO.succeed(1))
    expect(spy).not.toHaveBeenCalledWith(IO.fail(2))
  })
})

describe("IO's construction cost", () => {
  const RUNS = 9
  const N = 50_000

  const timePerCall = (make: (i: number) => unknown): number => {
    let kept = 0
    const start = performance.now()
    for (let i = 0; i < N; i++) {
      if (make(i) !== undefined) kept++
    }
    const elapsed = performance.now() - start
    expect(kept).toBe(N)
    return elapsed / N
  }

  /** The fastest build over the fastest plain-object build, across interleaved runs. */
  const ratioToPlain = (make: (i: number) => unknown): number => {
    const plain = (i: number) => ({ effect: { _tag: "Map", effect: { _tag: "Succeed", value: i }, f: inc } })
    for (let i = 0; i < 5_000; i++) {
      make(i)
      plain(i)
    }
    // The fastest run of each, interleaved: load only adds time to a run, so each minimum is that
    // side's least-disturbed run. A ratio of one run's pair would drop whenever its plain half was
    // the slow one, and let a regression through.
    const makes: number[] = []
    const plains: number[] = []
    Array.from({ length: RUNS }).forEach(() => {
      makes.push(timePerCall(make))
      plains.push(timePerCall(plain))
    })
    return Math.min(...makes) / Math.min(...plains)
  }

  const { succeed } = IO

  // Measured locally on Node 24.20.0 with this loop: 79x to 82x before the change, 1.2x to 1.5x after.
  // The bound sits far below the old cost, with room for a slow or instrumented runner. A timing test
  // retries, so a burst of load has to repeat to fail it.
  it("IO.succeed(i).map costs at most 15 times a plain object", { retry: 2 }, () => {
    const ratio = ratioToPlain((i) => succeed(i).map(inc))
    console.info(`IO.succeed(i).map: ${ratio.toFixed(1)}x a plain object (bound 15x)`)
    expect(ratio).toBeLessThan(15)
  })

  // Measured with a median before #542 (IO and Exit share their methods): 136x to 137x, and 4.6x to
  // 4.7x after; per-value closures and a new empty Context per run made the old cost. With the
  // loop interpreter (#562) it measures about 6x quiet, up to about 16x under coverage.
  it("building and running a one-step IO costs at most 25 times a plain object", { retry: 2 }, () => {
    const ratio = ratioToPlain((i) => succeed(i).map(inc).runSyncOrThrow())
    console.info(`IO.succeed(i).map(inc).runSyncOrThrow(): ${ratio.toFixed(1)}x a plain object (bound 25x)`)
    expect(ratio).toBeLessThan(25)
  })
})
