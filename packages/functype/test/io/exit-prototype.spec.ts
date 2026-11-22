/**
 * Exit shares its methods through one prototype per variant (#276 §14). These tests pin the shape,
 * the 2.0 breaks, and the cost.
 */
import { inspect } from "node:util"

import { describe, expect, it } from "vitest"

import { Exit } from "@/index"

const variants = () => [Exit.succeed(1), Exit.fail("e"), Exit.die("d"), Exit.interrupt("f")] as const

describe("Exit's shape", () => {
  it("keeps only its data as own properties", () => {
    expect(variants().map((exit) => Object.keys(exit))).toEqual([
      ["_tag", "value"],
      ["_tag", "error"],
      ["_tag", "defect"],
      ["_tag", "fiberId"],
    ])
    expect(Reflect.ownKeys(Exit.succeed(1))).toEqual(["_tag", "value"])
  })

  it("shares one frozen prototype per variant", () => {
    const protos = variants().map((exit) => Object.getPrototypeOf(exit) as object)
    expect(new globalThis.Set(protos).size).toBe(4)
    expect(Object.getPrototypeOf(Exit.succeed(1))).toBe(Object.getPrototypeOf(Exit.succeed("a")))
    expect(Object.getPrototypeOf(Exit.fail(1))).toBe(Object.getPrototypeOf(Exit.fail("a")))
    expect(Object.getPrototypeOf(Exit.die(1))).toBe(Object.getPrototypeOf(Exit.die("a")))
    expect(Object.getPrototypeOf(Exit.interrupt("a"))).toBe(Object.getPrototypeOf(Exit.interrupted()))
    expect(protos.every((proto) => Object.isFrozen(proto))).toBe(true)
  })

  it("compares by data in test matchers, and tells the variants apart", () => {
    expect(Exit.succeed(1)).toEqual(Exit.succeed(1))
    expect(Exit.succeed(1)).not.toEqual(Exit.succeed(2))
    expect(Exit.fail("e")).toEqual(Exit.fail("e"))
    expect(Exit.fail("e")).not.toEqual(Exit.die("e"))
    expect(Exit.interrupt("f")).toEqual(Exit.interrupt("f"))
  })

  it("prints its variant and data", () => {
    expect(inspect(Exit.succeed(1))).toBe("Success [Exit] { _tag: 'Success', value: 1 }")
    expect(inspect(Exit.fail("e"))).toBe("Failure [Exit] { _tag: 'Failure', error: 'e' }")
    expect(inspect(Exit.die("d"))).toBe("Die [Exit] { _tag: 'Die', defect: 'd' }")
    expect(inspect(Exit.interrupt("f"))).toBe("Interrupted [Exit] { _tag: 'Interrupted', fiberId: 'f' }")
    expect(Object.prototype.toString.call(Exit.succeed(1))).toBe("[object Exit]")
  })

  it("keeps its methods' behaviour", () => {
    expect(Exit.succeed(1).map((x) => x + 1)).toEqual(Exit.succeed(2))
    expect(Exit.fail<string, number>("e").mapError((e) => e.length)).toEqual(Exit.fail(1))
    expect(Exit.die<string, number>("d").mapError((e) => e.length)).toEqual(Exit.die("d"))
    expect(Exit.die<string, number>("d").fold(String, String, String, (d) => `die ${String(d)}`)).toBe("die d")
    expect(() => Exit.interrupt("f").fold(String, String)).toThrow("Effect was interrupted: f")
    expect(JSON.stringify(Exit.fail("e"))).toBe('{"_tag":"Failure","error":"e"}')
    expect(Exit.succeed(1).toString()).toBe("Exit.Success(1)")
  })
})

describe("Exit's 2.0 breaks", () => {
  it("a detached method call throws", () => {
    const { getOrElse } = Exit.succeed<string, number>(1)
    expect(() => getOrElse(() => 0)).toThrow(TypeError)
    expect(() => [() => 0].map(Exit.succeed(2).getOrElse)).toThrow(TypeError)
  })

  it("a spread copies only the data", () => {
    expect({ ...Exit.die("d") }).toEqual({ _tag: "Die", defect: "d" })
  })

  it("assigning over a method throws, because the prototype is frozen", () => {
    expect(() => {
      // eslint-disable-next-line functional/immutable-data -- the write is what's under test
      ;(Exit.succeed(1) as unknown as Record<string, unknown>).map = () => 0
    }).toThrow(TypeError)
  })

  it("structuredClone copies the data, with no methods", () => {
    expect(structuredClone(Exit.succeed(1))).toEqual({ _tag: "Success", value: 1 })
  })
})

describe("Exit's construction cost", { retry: 2 }, () => {
  const RUNS = 9
  const N = 50_000
  const inc = (x: number): number => x + 1

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

  /** The smallest of interleaved runs of (build + map) / (build a plain object of the same data). */
  const ratioToPlain = (make: (i: number) => unknown): number => {
    const plain = (i: number) => ({ _tag: "Success", value: inc(i) })
    for (let i = 0; i < 5_000; i++) {
      make(i)
      plain(i)
    }
    const ratios = Array.from({ length: RUNS }, () => timePerCall(make) / timePerCall(plain)).sort((a, b) => a - b)
    return ratios[0]!
  }

  const { succeed } = Exit

  // Measured locally on Node 24.20.0 with this loop: 28x to 30x before the change, 1.1x to 1.2x after.
  // The bound sits far below the old cost, with room for a slow or instrumented runner.
  it("Exit.succeed(i).map costs at most 10 times a plain object", () => {
    const ratio = ratioToPlain((i) => succeed(i).map(inc))
    console.info(`Exit.succeed(i).map: ${ratio.toFixed(1)}x a plain object (bound 10x)`)
    expect(ratio).toBeLessThan(10)
  })
})
