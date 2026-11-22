/**
 * A `bracket` or `bracketExit` whose release fails reports the failure under `run()`, as it already
 * did under `runSync()`. Before, `run()` dropped the release's outcome and reported the use step's.
 */
import { describe, expect, it } from "vitest"

import { IO } from "@/io"

const releaseFails = (): IO<never, never, void> => IO.die(new Error("release-failed"))

describe("a failed bracket release", () => {
  it("replaces a successful use step under run, as under runSync", async () => {
    const make = () =>
      IO.bracket(
        IO.succeed("resource"),
        () => IO.succeed("used"),
        () => releaseFails(),
      )
    expect(() => make().runSyncOrThrow()).toThrow("release-failed")
    await expect(make().runOrThrow()).rejects.toThrow("release-failed")
    expect((await make().runExit())._tag).toBe("Die")
  })

  it("replaces a failed use step", async () => {
    const exit = await IO.bracket(
      IO.succeed("resource"),
      () => IO.fail("use-failed"),
      () => releaseFails(),
    ).runExit()
    expect(exit._tag).toBe("Die")
  })

  it("replaces the outcome in bracketExit too", async () => {
    const exit = await IO.bracketExit(
      IO.succeed("resource"),
      () => IO.succeed("used"),
      () => releaseFails(),
    ).runExit()
    expect(exit._tag).toBe("Die")
  })

  it("leaves a successful release alone", async () => {
    const released: string[] = []
    const value = await IO.bracket(
      IO.succeed("resource"),
      (r) => IO.succeed(`used ${r}`),
      (r) => IO.sync(() => void released.push(r)),
    ).runOrThrow()
    expect(value).toBe("used resource")
    expect(released).toEqual(["resource"])
  })

  it("keeps a use failure when the release succeeds", async () => {
    const result = await IO.bracket(
      IO.succeed("resource"),
      () => IO.fail("use-failed"),
      () => IO.succeed(undefined),
    ).run()
    expect(result.isLeft()).toBe(true)
  })
})

describe("bracketExit whose use callback throws", () => {
  it("still runs its release, which sees the defect", async () => {
    const seen: string[] = []
    const exit = await IO.bracketExit(
      IO.succeed("resource"),
      (): IO<never, never, string> => {
        throw new Error("use threw")
      },
      (_r, useExit) => IO.sync(() => void seen.push(useExit._tag)),
    ).runExit()
    expect(exit._tag).toBe("Die")
    expect(seen).toEqual(["Die"])
  })
})

describe("a failed release in a cancelled region", () => {
  it("reports the release's defect, not the cancellation", async () => {
    // The region is cancelled while the use step runs; the release still runs, masked, and dies.
    const controller = new AbortController()
    const exit = await IO.bracket(
      IO.succeed("resource"),
      () => IO.sync(() => controller.abort()).map(() => "used"),
      () => releaseFails(),
    )
      .interruptOn(controller.signal)
      .runExit()
    expect(exit._tag).toBe("Die")
  })
})

describe("the release runs exactly once", () => {
  it.each([
    ["use succeeds", () => IO.succeed("used")],
    ["use fails", () => IO.fail("use-failed")],
    [
      "use throws",
      (): IO<never, string, string> => {
        throw new Error("use threw")
      },
    ],
  ] as const)("when %s", async (_, use) => {
    const runs: string[] = []
    await IO.bracket(IO.succeed("resource"), use, () => IO.sync(() => void runs.push("release"))).runExit()
    expect(runs).toEqual(["release"])
  })
})
