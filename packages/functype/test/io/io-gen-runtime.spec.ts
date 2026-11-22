/**
 * `IO.gen` is its own step: the interpreter loops drive the generator, one `next` per yielded IO,
 * instead of building a `flatMap` and a closure per yield. These pin what that step must keep.
 */
import { describe, expect, it } from "vitest"

import { IO } from "@/io"
import { Some } from "@/option"

describe("IO.gen at run time", () => {
  it("starts a fresh generator on every run", async () => {
    // eslint-disable-next-line functional/no-let -- counts the body's runs
    let starts = 0
    const program = IO.gen(function* () {
      starts += 1
      const a = yield* IO.succeed(1)
      return a + 1
    })
    expect(program.runSyncOrThrow()).toBe(2)
    expect(await program.runOrThrow()).toBe(2)
    expect(starts).toBe(2)
  })

  it("stops at a failure without resuming the generator", async () => {
    const after: string[] = []
    const program = IO.gen(function* () {
      yield* IO.fail("stop")
      after.push("resumed")
      return 1
    })
    expect(program.runSync().isLeft()).toBe(true)
    expect((await program.run()).isLeft()).toBe(true)
    expect(after).toEqual([])
  })

  it("lets a recover outside the body catch a failure inside it", () => {
    const program = IO.gen(function* () {
      return yield* IO.fail("boom")
    }).recover("recovered")
    expect(program.runSyncOrThrow()).toBe("recovered")
  })

  it("makes a throw in the body a defect", async () => {
    const program = IO.gen(function* () {
      yield* IO.succeed(1)
      throw new Error("bug")
    })
    expect((await program.runExit())._tag).toBe("Die")
    expect(() => program.runSyncOrThrow()).toThrow("bug")
  })

  it("makes a throw before the first yield a defect", async () => {
    const program = IO.gen(function* (): Generator<never, number, unknown> {
      throw new Error("early")
    })
    expect((await program.runExit())._tag).toBe("Die")
  })

  it("runs each yielded IO in the body's context", () => {
    const program = IO.gen(function* () {
      const a = yield* IO.succeed(2)
      const b = yield* IO.sync(() => a * 10)
      return b
    })
    expect(program.map((n) => n + 1).runSyncOrThrow()).toBe(21)
  })

  it("stops before resuming the generator when its region is cancelled", async () => {
    const controller = new AbortController()
    const after: string[] = []
    const program = IO.gen(function* () {
      yield* IO.sync(() => controller.abort())
      after.push("resumed")
      return 1
    }).interruptOn(controller.signal)
    const exit = await program.runExit()
    expect(exit._tag).toBe("Failure")
    expect(after).toEqual([])
  })
})

describe("an IO's iterator", () => {
  it("yields the IO once, then returns the value it is resumed with", () => {
    const io = IO.succeed(1)
    const iterator = io[Symbol.iterator]()
    expect(iterator.next()).toEqual({ done: false, value: io })
    expect(iterator.next(5)).toEqual({ done: true, value: 5 })
  })

  it("gives each yield* its own iterator, so one IO can be yielded twice", () => {
    const one = IO.succeed(1)
    const program = IO.gen(function* () {
      const a = yield* one
      const b = yield* one
      return a + b
    })
    expect(program.runSyncOrThrow()).toBe(2)
  })
})

describe("IO.gen and a region cancelled inside the body", () => {
  it("ends interrupted when the body aborts after its last yield", async () => {
    const controller = new AbortController()
    const program = IO.gen(function* () {
      const a = yield* IO.succeed(1)
      controller.abort()
      return a
    }).interruptOn(controller.signal)
    const exit = await program.runExit()
    expect(exit._tag).toBe("Failure")
  })

  it("ends interrupted when a body with no yield aborts", async () => {
    const controller = new AbortController()
    const program = IO.gen(function* (): Generator<never, number, unknown> {
      controller.abort()
      return 1
    }).interruptOn(controller.signal)
    expect((await program.runExit())._tag).toBe("Failure")
  })

  it("ends interrupted when the run's own signal aborts after the last yield", async () => {
    const controller = new AbortController()
    const program = IO.gen(function* () {
      const a = yield* IO.async(() => Promise.resolve(1))
      controller.abort()
      return a
    })
    expect((await program.runExit({ signal: controller.signal }))._tag).toBe("Interrupted")
  })
})

describe("IO.gen yielded a value that isn't an IO", () => {
  it("dies with a message that names IO.gen and the fix", async () => {
    const program = IO.gen(function* () {
      // The types reject this; only a cast gets an Option here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = (yield Some(1) as any) as number
      return a
    })
    const exit = await program.runExit()
    expect(exit._tag).toBe("Die")
    expect(String(exit._tag === "Die" ? exit.defect : "")).toContain("IO.gen was yielded a value that isn't an IO")
  })
})
