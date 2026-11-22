/**
 * The interpreter calls a step's callbacks without a receiver. Before, it called them as methods
 * of the step, so a detached method passed in read and wrote the step's own fields: `IO.sync(ref.get)`
 * succeeded with `undefined`, and `.map(ref.set)` changed nothing and succeeded. Now a detached
 * method throws, as it does anywhere else, and the run ends in a `Die`.
 */
import { describe, expect, it } from "vitest"

import { Context, IO, Layer, Tag } from "@/io"
import { Some } from "@/option"
import { Ref } from "@/ref/Ref"

/** A value whose method reads `this`, detached. */
const detachedGet = (): (() => number) => {
  const ref = Ref(7)
  // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
  return ref.get
}

describe("a detached method passed to an IO step dies", () => {
  it("IO.sync", async () => {
    const io = IO.sync(detachedGet())
    expect(() => io.runSync()).toThrow(TypeError)
    expect((await io.runExit())._tag).toBe("Die")
  })

  it("map", async () => {
    const ref = Ref(0)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
    const io = IO.succeed(5).map(ref.set)
    expect((await io.runExit())._tag).toBe("Die")
    expect(() => io.runSync()).toThrow(TypeError)
    expect(ref.get()).toBe(0)
  })

  it("flatMap", async () => {
    const io = IO.succeed(1).flatMap(() => IO.sync(detachedGet()))
    expect((await io.runExit())._tag).toBe("Die")
  })

  it("mapError and fold", async () => {
    const get = detachedGet()
    expect(
      (
        await IO.fail("e")
          .mapError(() => get())
          .runExit()
      )._tag,
    ).toBe("Die")
    expect(
      (
        await IO.succeed(1)
          .fold(() => 0, get)
          .runExit()
      )._tag,
    ).toBe("Die")
  })

  it("a method of a functype value", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
    const io = IO.sync(Some(1).orThrow)
    expect((await io.runExit())._tag).toBe("Die")
  })

  it("bracket's use and release", async () => {
    const get = detachedGet()
    const useDetached = IO.bracket(
      IO.succeed(1),
      () => IO.sync(get),
      () => IO.unit,
    )
    expect((await useDetached.runExit())._tag).toBe("Die")
  })
})

describe("plain callbacks still run", () => {
  it("keeps every step working", async () => {
    const ref = Ref(0)
    const io = IO.succeed(2)
      .map((n) => n + 1)
      .flatMap((n) => IO.sync(() => ref.set(n)))
      .map(() => ref.get())
    expect(await io.runOrThrow()).toBe(3)
    expect(io.runSyncOrThrow()).toBe(3)
  })

  it("IO.gen", () => {
    const program = IO.gen(function* () {
      const a = yield* IO.succeed(1)
      return a + 1
    })
    expect(program.runSyncOrThrow()).toBe(2)
  })
})

describe("a Layer whose factory is a detached method", () => {
  it("fails to build", async () => {
    const Port = Tag<number>("Port")
    const layer = Layer.sync(Port, detachedGet())
    await expect(layer.build(Context.empty())).rejects.toThrow(TypeError)
  })
})
