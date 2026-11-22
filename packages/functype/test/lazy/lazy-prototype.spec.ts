/**
 * Lazy shares its methods through one prototype (#276 §14, PR 4). Every Lazy used to carry 42 own
 * properties, three of them getter closures, and those getters gave each Lazy its own hidden class:
 * building one cost about 2 µs. These tests pin the shape, the evaluation semantics the change must
 * keep, the 2.0 breaks, and the cost.
 */
import { inspect } from "node:util"

import { describe, expect, it, vi } from "vitest"

import { Lazy, Some } from "@/index"

/** A Lazy's state, which the public type doesn't show. */
const stateOf = (lazy: Lazy<unknown>): Record<string, unknown> =>
  (lazy as unknown as { state: Record<string, unknown> }).state

describe("Lazy's shape", () => {
  it("keeps only its tag and its state as own properties", () => {
    const lazy = Lazy(() => 1)
    expect(Reflect.ownKeys(lazy)).toEqual(["_tag", "state"])
    const seen: string[] = []
    // eslint-disable-next-line functional/immutable-data -- collecting what for...in sees
    for (const key in lazy) seen.push(key)
    expect(seen).toEqual(["_tag", "state"])
  })

  it("shares one frozen prototype", () => {
    const proto = Object.getPrototypeOf(Lazy(() => 1)) as object
    expect(Object.getPrototypeOf(Lazy.fromValue("a"))).toBe(proto)
    expect(Object.getPrototypeOf(Lazy(() => 1).map((x) => x + 1))).toBe(proto)
    expect(Object.getPrototypeOf(Lazy.fail(new Error("e")))).toBe(proto)
    expect(Object.isFrozen(proto)).toBe(true)
    expect(Object.getPrototypeOf(proto)).toBe(Object.prototype)
  })

  it("stays unfrozen, as Option, Either and Try do, so it can memoize", () => {
    expect(Object.isFrozen(Lazy(() => 1))).toBe(false)
  })

  it("prints its state", () => {
    const lazy = Lazy(() => 1)
    const oneLine = { breakLength: Infinity }
    expect(inspect(lazy, oneLine)).toBe(
      "Lazy { _tag: 'Lazy', state: { _tag: 'Pending', thunk: [Function (anonymous)] } }",
    )
    lazy.orThrow()
    expect(inspect(lazy, oneLine)).toBe("Lazy { _tag: 'Lazy', state: { _tag: 'Evaluated', value: 1 } }")
    expect(Object.prototype.toString.call(lazy)).toBe("[object Lazy]")
  })

  it("drops its thunk once the thunk has run", () => {
    const ok = Lazy(() => 1)
    ok.orThrow()
    expect(stateOf(ok)).toEqual({ _tag: "Evaluated", value: 1 })
    const failed = Lazy.fail(new Error("boom"))
    failed.orNull()
    expect(Reflect.ownKeys(stateOf(failed))).toEqual(["_tag", "error"])
  })
})

describe("Lazy keeps its evaluation semantics", () => {
  it("doesn't run the thunk until a value is read", () => {
    const thunk = vi.fn(() => 1)
    const lazy = Lazy(thunk)
    lazy.map((x) => x + 1)
    lazy.flatMap((x) => Lazy(() => x))
    lazy.filter(() => true)
    lazy.recover(() => 0)
    lazy.tap(() => undefined)
    expect(lazy.isEvaluated).toBe(false)
    expect(lazy.toString()).toBe("Lazy(<not evaluated>)")
    expect(thunk).not.toHaveBeenCalled()
  })

  it("a spread, Object.keys, inspect and a test matcher never run the thunk", () => {
    const thunk = vi.fn(() => 1)
    const lazy = Lazy(thunk)
    const copy = { ...lazy }
    expect(Object.keys(lazy)).toEqual(["_tag", "state"])
    inspect(lazy)
    expect(lazy).toEqual(lazy)
    expect(lazy).not.toEqual(Lazy(() => 1))
    expect(copy).toEqual({ _tag: "Lazy", state: { _tag: "Pending", thunk } })
    expect(thunk).not.toHaveBeenCalled()
  })

  it("runs the thunk at most once, and hands back the same value", () => {
    const thunk = vi.fn(() => ({ n: 1 }))
    const lazy = Lazy(thunk)
    const first = lazy.orThrow()
    expect(lazy.orThrow()).toBe(first)
    expect(lazy.getOrElse(() => ({ n: 0 }))).toBe(first)
    expect([lazy.size, lazy.isEmpty, lazy.contains(first)]).toEqual([1, false, true])
    expect(lazy.isEvaluated).toBe(true)
    expect(thunk).toHaveBeenCalledTimes(1)
  })

  it("runs a failing thunk once, and rethrows the same error", () => {
    const error = new Error("boom")
    const thunk = vi.fn(() => {
      throw error
    })
    const lazy = Lazy(thunk)
    expect(() => lazy.orThrow()).toThrow(error)
    expect(lazy.isEvaluated).toBe(true)
    expect(() => lazy.orThrow()).toThrow(error)
    expect(lazy.orNull()).toBeNull()
    expect(
      lazy.toEither().fold(
        (e) => e,
        () => undefined,
      ),
    ).toBe(error)
    expect([lazy.size, lazy.isEmpty]).toEqual([0, true])
    expect(lazy.toString()).toBe("Lazy(<error: boom>)")
    expect(thunk).toHaveBeenCalledTimes(1)
  })

  // A frozen Lazy can't memoize, but every read must still get the right outcome.
  describe("a frozen Lazy", () => {
    it("returns its value, running the thunk once per read", () => {
      const runs = { count: 0 }
      const lazy = Object.freeze(
        Lazy(() => {
          runs.count++
          return 42
        }),
      )
      expect([lazy.orThrow(), lazy.getOrElse(() => 0), lazy.orNull(), lazy.size]).toEqual([42, 42, 42, 1])
      expect(runs.count).toBe(4)
      expect(lazy.isEvaluated).toBe(false)
    })

    it("maps, and the mapped Lazy memoizes as usual", () => {
      const runs = { count: 0 }
      const lazy = Object.freeze(
        Lazy(() => {
          runs.count++
          return 1
        }),
      )
      const mapped = lazy.map((x) => x + 1)
      expect(mapped.getOrElse(() => 0)).toBe(2)
      expect(mapped.getOrElse(() => 0)).toBe(2)
      expect(runs.count).toBe(1)
    })

    it("still reports a failing thunk's own error", () => {
      const error = new Error("boom")
      const runs = { count: 0 }
      const lazy = Object.freeze(
        Lazy<number>(() => {
          runs.count++
          throw error
        }),
      )
      expect(() => lazy.orThrow()).toThrow(error)
      expect(
        lazy.toEither().fold(
          (e) => e,
          () => undefined,
        ),
      ).toBe(error)
      expect(lazy.getOrElse(() => 7)).toBe(7)
      expect(runs.count).toBe(3)
    })
  })

  it("a thunk that throws undefined has still failed", () => {
    const lazy = Lazy<number>(() => {
      throw undefined
    })
    expect(lazy.getOrElse(() => 0)).toBe(0)
    expect(lazy.isEvaluated).toBe(true)
    expect(lazy.toString()).toBe("Lazy(<error: undefined>)")
    expect(() => lazy.orThrow()).toThrow()
  })

  it("mapAsync and flatMapAsync reject, rather than throw, when the thunk fails", async () => {
    const lazy = Lazy.fail<number>(new Error("boom"))
    const mapped = lazy.mapAsync(async (x) => x)
    const flatMapped = lazy.flatMapAsync(async (x) => Lazy(() => x))
    await expect(mapped).rejects.toThrow("boom")
    await expect(flatMapped).rejects.toThrow("boom")
  })

  it("fromValue, evaluated and fromJSON stay unevaluated until read", () => {
    expect(Lazy.fromValue(1).isEvaluated).toBe(false)
    expect(Lazy.evaluated(1).isEvaluated).toBe(false)
    expect(Lazy.fromJSON<number>(JSON.stringify(Lazy(() => 1))).isEvaluated).toBe(false)
  })

  // These returned the None function itself, not a None, until 2.0: the old literal's cast hid it.
  it("filter, find and toOption return a real None", () => {
    expect(
      Lazy(() => 1)
        .filter(() => false)
        .orThrow()
        .isNone(),
    ).toBe(true)
    expect(
      Lazy(() => 1)
        .find(() => false)
        .isNone(),
    ).toBe(true)
    expect(Lazy.fail<number>(new Error("e")).find(() => true)._tag).toBe("None")
    expect(Lazy.fail<number>(new Error("e")).toOption()._tag).toBe("None")
  })
})

describe("Lazies compare by their state in test matchers", () => {
  const evaluated = <T>(value: T): Lazy<T> => {
    const lazy = Lazy(() => value)
    lazy.orThrow()
    return lazy
  }

  it("two evaluated Lazies with the same value are equal", () => {
    expect(evaluated(1)).toEqual(evaluated(1))
    expect(evaluated(1)).toStrictEqual(evaluated(1))
    expect(Some(evaluated(1))).toEqual(Some(evaluated(1)))
  })

  it("two evaluated Lazies with different values are unequal", () => {
    expect(evaluated(1)).not.toEqual(evaluated(2))
    expect([evaluated(1)]).not.toEqual([evaluated(2)])
    const spy = vi.fn()
    spy(evaluated(1))
    expect(spy).toHaveBeenCalledWith(evaluated(1))
    expect(spy).not.toHaveBeenCalledWith(evaluated(2))
  })

  it("pending Lazies are equal only when they hold the same thunk", () => {
    const thunk = () => 1
    expect(Lazy(thunk)).toEqual(Lazy(thunk))
    expect(Lazy(thunk)).not.toEqual(Lazy(() => 1))
  })

  it("a pending Lazy and an evaluated one are unequal, though they'd give the same value", () => {
    const thunk = () => 1
    const done = Lazy(thunk)
    done.orThrow()
    expect(Lazy(thunk)).not.toEqual(done)
  })
})

describe("Lazy's 2.0 breaks", () => {
  it("a detached method call throws, because `this` is undefined", () => {
    const { orThrow, getOrElse, orNull, toOption, contains, toString } = Lazy(() => 1)
    expect(() => orThrow()).toThrow(TypeError)
    // These catch a failed thunk, but a detached call never reaches the thunk, so it isn't caught.
    expect(() => getOrElse(() => 0)).toThrow(TypeError)
    expect(() => orNull()).toThrow(TypeError)
    expect(() => toOption()).toThrow(TypeError)
    expect(() => contains(1)).toThrow(TypeError)
    expect(() => toString()).toThrow(TypeError)
    expect(() => [(x: number) => x].map(Lazy(() => 2).fold)).toThrow(TypeError)
  })

  it("a detached map, flatMap or other builder fails when its result is read, as IO's do", () => {
    // The builders only store the Lazy they were called on, so the TypeError waits for a read.
    const { map } = Lazy(() => 1)
    const mapped = map((x) => x + 1)
    expect(mapped.isEvaluated).toBe(false)
    expect(() => mapped.orThrow()).toThrow(TypeError)
  })

  it("a detached orElse, recover, recoverWith or tapError doesn't take the TypeError for a failed thunk", () => {
    const { orElse, recover, recoverWith, tapError } = Lazy(() => 1)
    expect(() => orElse(() => Lazy(() => 0)).orThrow()).toThrow(TypeError)
    expect(() => recover(() => 0).orThrow()).toThrow(TypeError)
    expect(() => recoverWith(() => Lazy(() => 0)).orThrow()).toThrow(TypeError)
    const seen: unknown[] = []
    expect(() => tapError((e) => seen.push(e)).orThrow()).toThrow(TypeError)
    expect(seen).toEqual([])
  })

  it("orElse, recover, recoverWith and tapError still handle a failed thunk", () => {
    const error = new Error("boom")
    const failed = Lazy.fail<number>(error)
    expect(failed.orElse(() => Lazy(() => 2)).orThrow()).toBe(2)
    expect(failed.recover((e) => (e === error ? 3 : 0)).orThrow()).toBe(3)
    expect(failed.recoverWith(() => Lazy(() => 4)).orThrow()).toBe(4)
    const seen: unknown[] = []
    expect(() => failed.tapError((e) => seen.push(e)).orThrow()).toThrow(error)
    expect(seen).toEqual([error])
    expect(
      Lazy(() => 5)
        .recover(() => 0)
        .orThrow(),
    ).toBe(5)
  })

  it("a spread copies only the data, and has no methods", () => {
    const copy = { ...Lazy(() => 1) }
    expect(Reflect.ownKeys(copy)).toEqual(["_tag", "state"])
    expect("map" in copy).toBe(false)
  })

  it("assigning over a method throws, because the prototype is frozen", () => {
    expect(() => {
      // eslint-disable-next-line functional/immutable-data -- the write is what's under test
      ;(Lazy(() => 1) as unknown as Record<string, unknown>).map = () => 0
    }).toThrow(TypeError)
  })

  it("structuredClone copies an evaluated Lazy's data, and still refuses a pending one's thunk", () => {
    const lazy = Lazy(() => 1)
    expect(() => structuredClone(lazy)).toThrow()
    lazy.orThrow()
    expect(structuredClone(lazy)).toEqual({ _tag: "Lazy", state: { _tag: "Evaluated", value: 1 } })
  })

  it("has no typeable field, which was never on its type", () => {
    expect("typeable" in Lazy(() => 1)).toBe(false)
  })
})

describe("Lazy's construction cost", { retry: 2 }, () => {
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

  /** The fastest ((build) / (build a plain object of the same shape)) over the fastest plain-object build, across interleaved runs. */
  const ratioToPlain = (make: (i: number) => unknown): number => {
    const plain = (i: number) => ({ _tag: "Lazy", state: { _tag: "Pending", thunk: () => i } })
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

  const lazy = Lazy

  // Measured locally on Node 24.20.0 with this loop: 280x before the change, 1.1x after.
  // The bound sits far below the old cost, with room for a slow or instrumented runner.
  it("Lazy(() => i) costs at most 15 times a plain object", () => {
    const ratio = ratioToPlain((i) => lazy(() => i))
    console.info(`Lazy(() => i): ${ratio.toFixed(1)}x a plain object (bound 15x)`)
    expect(ratio).toBeLessThan(15)
  })
})
