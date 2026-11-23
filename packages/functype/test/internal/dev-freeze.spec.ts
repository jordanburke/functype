import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * Collections freeze each value only in development (`NODE_ENV=development`) or when `FUNCTYPE_FREEZE=1`
 * asks for it; production is the default. The switch is read once when functype loads, so each case
 * reloads the modules under its own environment.
 */
const load = async (env: Readonly<Record<string, string | undefined>>) => {
  vi.resetModules()
  Object.entries(env).forEach(([name, value]) => vi.stubEnv(name, value))
  const freeze = await import("@/internal/freeze")
  const { List, Set, Map, Stack, LazyList, Obj } = await import("@/index")
  return {
    freeze,
    values: [List([1]), Set([1]), Map([["a", 1]]), Stack([1]), LazyList([1]), Obj({ a: 1 })] as ReadonlyArray<object>,
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("collections freeze each value only in development", () => {
  it.each([
    ["production by default (test runs included)", { NODE_ENV: "test", FUNCTYPE_FREEZE: undefined }, false],
    ["production", { NODE_ENV: "production", FUNCTYPE_FREEZE: undefined }, false],
    ["no NODE_ENV at all", { NODE_ENV: undefined, FUNCTYPE_FREEZE: undefined }, false],
    ["NODE_ENV=development", { NODE_ENV: "development", FUNCTYPE_FREEZE: undefined }, true],
    ["FUNCTYPE_FREEZE=1 in a test run", { NODE_ENV: "test", FUNCTYPE_FREEZE: "1" }, true],
    ["FUNCTYPE_FREEZE=true in production", { NODE_ENV: "production", FUNCTYPE_FREEZE: "true" }, true],
    ["FUNCTYPE_FREEZE=0 in development", { NODE_ENV: "development", FUNCTYPE_FREEZE: "0" }, false],
    ["FUNCTYPE_FREEZE=false in development", { NODE_ENV: "development", FUNCTYPE_FREEZE: "false" }, false],
    [
      "an unrecognised FUNCTYPE_FREEZE falls back to NODE_ENV",
      { NODE_ENV: "development", FUNCTYPE_FREEZE: "maybe" },
      true,
    ],
  ])("%s", async (_, env, frozen) => {
    const { freeze, values } = await load(env)
    expect(freeze.FREEZE_VALUES).toBe(frozen)
    values.forEach((value) => expect(Object.isFrozen(value)).toBe(frozen))
  })

  it("a write from untyped code throws in development", async () => {
    const { values } = await load({ NODE_ENV: "development", FUNCTYPE_FREEZE: undefined })
    values.forEach((value) => {
      const record = value as Record<string, unknown>
      expect(() => {
        // eslint-disable-next-line functional/immutable-data -- the write is what's under test
        record.extra = 1
      }).toThrow(TypeError)
    })
  })

  it("collections still work when frozen", async () => {
    const { List } = (await load({ NODE_ENV: "development", FUNCTYPE_FREEZE: undefined }), await import("@/index"))
    expect(
      List([1, 2, 3])
        .map((x) => x * 2)
        .filter((x) => x > 2)
        .toArray(),
    ).toEqual([4, 6])
  })
})
