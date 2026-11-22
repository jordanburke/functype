/**
 * The interpreters call a step's callbacks without a receiver. Before, they called them as methods
 * of the step, so a detached method passed in read and wrote the step's own fields: `IO.sync(ref.get)`
 * succeeded with `undefined`, and `.map(ref.set)` changed nothing and succeeded. Now a detached
 * method throws, as it does anywhere else.
 *
 * Each case below passes a `function` that records its `this` straight in as the step's own
 * callback, so a call site that goes back to `step.f(x)` fails its case.
 */
import { describe, expect, it } from "vitest"

import { Context, IO, Layer, Tag } from "@/io"
import { Some } from "@/option"
import { Ref } from "@/ref/Ref"

/** The receivers the callbacks saw, in call order. */
const recorder = (): { readonly seen: unknown[]; readonly note: (self: unknown) => void } => {
  const seen: unknown[] = []
  return { seen, note: (self) => void seen.push(self) }
}

describe("IO steps call their callbacks without a receiver", () => {
  it("IO.sync", async () => {
    const { seen, note } = recorder()
    const make = () =>
      IO.sync(function (this: unknown) {
        note(this)
        return 1
      })
    make().runSync()
    await make().runExit()
    expect(seen).toEqual([undefined, undefined])
  })

  it("the IO(...) constructor", async () => {
    const { seen, note } = recorder()
    const make = () =>
      IO(function (this: unknown) {
        note(this)
        return 1
      })
    make().runSync()
    await make().runExit()
    expect(seen).toEqual([undefined, undefined])
  })

  it("map", async () => {
    const { seen, note } = recorder()
    const make = () =>
      IO.succeed(1).map(function (this: unknown, n: number) {
        note(this)
        return n
      })
    make().runSync()
    await make().runExit()
    expect(seen).toEqual([undefined, undefined])
  })

  it("flatMap", async () => {
    const { seen, note } = recorder()
    const make = () =>
      IO.succeed(1).flatMap(function (this: unknown, n: number) {
        note(this)
        return IO.succeed(n)
      })
    make().runSync()
    await make().runExit()
    expect(seen).toEqual([undefined, undefined])
  })

  it("mapError", async () => {
    const { seen, note } = recorder()
    const make = () =>
      IO.fail("e").mapError(function (this: unknown, e: string) {
        note(this)
        return e
      })
    make().runSync()
    await make().runExit()
    expect(seen).toEqual([undefined, undefined])
  })

  it("recoverWith and catchAll", async () => {
    const { seen, note } = recorder()
    const handler = function (this: unknown) {
      note(this)
      return IO.succeed(0)
    }
    IO.fail("e").recoverWith(handler).runSync()
    await IO.fail("e").recoverWith(handler).runExit()
    IO.fail("e").catchAll(handler).runSync()
    await IO.fail("e").catchAll(handler).runExit()
    expect(seen).toEqual([undefined, undefined, undefined, undefined])
  })

  it("fold's onFailure and onSuccess, and match", async () => {
    const { seen, note } = recorder()
    const onFailure = function (this: unknown) {
      note(this)
      return 0
    }
    const onSuccess = function (this: unknown) {
      note(this)
      return 1
    }
    IO.fail("e").fold(onFailure, onSuccess).runSync()
    await IO.fail("e").fold(onFailure, onSuccess).runExit()
    IO.succeed(1).fold(onFailure, onSuccess).runSync()
    await IO.succeed(1).fold(onFailure, onSuccess).runExit()
    IO.succeed(1).match({ failure: onFailure, success: onSuccess }).runSync()
    await IO.succeed(1).match({ failure: onFailure, success: onSuccess }).runExit()
    expect(seen).toEqual([undefined, undefined, undefined, undefined, undefined, undefined])
  })

  it("bracket's and acquireRelease's use and release", async () => {
    const { seen, note } = recorder()
    const use = function (this: unknown) {
      note(this)
      return IO.succeed(1)
    }
    const release = function (this: unknown) {
      note(this)
      return IO.unit
    }
    IO.bracket(IO.succeed(1), use, release).runSync()
    await IO.bracket(IO.succeed(1), use, release).runExit()
    await IO.acquireRelease(IO.succeed(1), use, release).runExit()
    expect(seen).toEqual([undefined, undefined, undefined, undefined, undefined, undefined])
  })

  it("bracketExit's use and release", async () => {
    const { seen, note } = recorder()
    const use = function (this: unknown) {
      note(this)
      return IO.succeed(1)
    }
    const release = function (this: unknown) {
      note(this)
      return IO.unit
    }
    IO.bracketExit(IO.succeed(1), use, release).runSync()
    await IO.bracketExit(IO.succeed(1), use, release).runExit()
    expect(seen).toEqual([undefined, undefined, undefined, undefined])
  })

  it("IO.gen's generator", async () => {
    const { seen, note } = recorder()
    const make = () =>
      IO.gen(function* (this: unknown) {
        note(this)
        return yield* IO.succeed(1)
      })
    make().runSync()
    await make().runExit()
    expect(seen).toEqual([undefined, undefined])
  })
})

describe("so a detached method fails the run", () => {
  it("IO.sync(ref.get) and .map(ref.set) die", async () => {
    const ref = Ref(7)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
    const read = IO.sync(ref.get)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
    const write = IO.succeed(5).map(ref.set)
    expect((await read.runExit())._tag).toBe("Die")
    expect(() => read.runSync()).toThrow(TypeError)
    expect((await write.runExit())._tag).toBe("Die")
    expect(ref.get()).toBe(7)
  })

  it("a method of a functype value dies", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
    expect((await IO.sync(Some(1).orThrow).runExit())._tag).toBe("Die")
  })

  it("through IO(...) it is a typed failure, because IO(...) declares E = unknown", async () => {
    const ref = Ref(7)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
    const exit = await IO(ref.get).runExit()
    expect(exit._tag).toBe("Failure")
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
})

describe("Layer factories are called without a receiver", () => {
  const Port = Tag<number>("Port")
  const Host = Tag<string>("Host")

  it("sync, effect, fromService, fromServiceEffect and map", async () => {
    const { seen, note } = recorder()
    const host = Layer.succeed(Host, "localhost")
    await Layer.sync(Port, function (this: unknown) {
      note(this)
      return 1
    }).build(Context.empty())
    await Layer.effect(Port, function (this: unknown) {
      note(this)
      return Promise.resolve(1)
    }).build(Context.empty())
    await host
      .provideToAndMerge(
        Layer.fromService(Port, Host, function (this: unknown) {
          note(this)
          return 1
        }),
      )
      .build(Context.empty())
    await host
      .provideToAndMerge(
        Layer.fromServiceEffect(Port, Host, function (this: unknown) {
          note(this)
          return Promise.resolve(1)
        }),
      )
      .build(Context.empty())
    await host
      .map(function (this: unknown, ctx) {
        note(this)
        return ctx
      })
      .build(Context.empty())
    expect(seen).toEqual([undefined, undefined, undefined, undefined, undefined])
  })

  it("a detached method as a factory fails to build", async () => {
    const ref = Ref(7)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the detached call under test
    await expect(Layer.sync(Port, ref.get).build(Context.empty())).rejects.toThrow(TypeError)
  })
})
