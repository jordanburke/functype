/**
 * Layer shares its methods (#276 §14): a layer keeps `_tag` and a recipe, plain data that the
 * shared `build` runs. The cross-type rules are in test/internal/shared-prototypes.spec.ts.
 */
import { describe, expect, it } from "vitest"

import { Context, IO, Layer, Tag } from "@/io"

type Config = { readonly url: string }
type Db = { readonly query: () => string }
const Config = Tag<Config>("Config")
const Db = Tag<Db>("Db")

const config: Config = { url: "pg://local" }
const dbFrom = (c: Config): Db => ({ query: () => `query ${c.url}` })

describe("Layer", () => {
  it("is frozen, and keeps only its tag and recipe", () => {
    const layer = Layer.succeed(Config, config)
    expect(Object.isFrozen(layer)).toBe(true)
    expect(Object.keys(layer)).toEqual(["_tag", "recipe"])
    expect(Object.getPrototypeOf(layer)).toBe(Object.getPrototypeOf(Layer.empty()))
  })

  it("compares by its recipe in test matchers", () => {
    expect(Layer.succeed(Config, config)).toEqual(Layer.succeed(Config, config))
    expect(Layer.succeed(Config, config)).not.toEqual(Layer.succeed(Config, { url: "other" }))
  })

  it("names itself after its service", () => {
    expect(Layer.succeed(Config, config).toString()).toBe("Layer(Config)")
    expect(Layer.sync(Config, () => config).toString()).toBe("Layer(Config)")
    expect(Layer.empty().toString()).toBe("Layer(empty)")
    expect(Layer.succeed(Config, config).merge(Layer.empty()).toString()).toBe("Layer(anonymous)")
  })

  it("builds each kind of recipe", async () => {
    const empty = Context.empty()
    const withConfig = Context.make(Config, config)
    expect((await Layer.succeed(Config, config).build(empty)).unsafeGet(Config)).toBe(config)
    expect((await Layer.sync(Config, () => config).build(empty)).unsafeGet(Config)).toBe(config)
    expect((await Layer.effect(Config, () => Promise.resolve(config)).build(empty)).unsafeGet(Config)).toBe(config)
    expect((await Layer.fromService(Db, Config, dbFrom).build(withConfig)).unsafeGet(Db).query()).toBe(
      "query pg://local",
    )
    expect(
      (await Layer.fromServiceEffect(Db, Config, (c) => Promise.resolve(dbFrom(c))).build(withConfig))
        .unsafeGet(Db)
        .query(),
    ).toBe("query pg://local")
    expect((await Layer.fromContext(withConfig).build(empty)).unsafeGet(Config)).toBe(config)
    expect((await Layer.empty().build(empty)).size).toBe(0)
    expect((await Layer.mergeAll().build(empty)).size).toBe(0)
  })

  it("composes: provideToAndMerge feeds the first layer's output to the second", async () => {
    const live = Layer.succeed(Config, config).provideToAndMerge(Layer.fromService(Db, Config, dbFrom))
    const ctx = await live.build(Context.empty())
    expect(ctx.unsafeGet(Config)).toBe(config)
    expect(ctx.unsafeGet(Db).query()).toBe("query pg://local")

    const program = IO.gen(function* () {
      const db = yield* IO.service(Db)
      return db.query()
    }).provideLayer(live)
    expect(await program.runOrThrow()).toBe("query pg://local")
  })

  it("maps and merges", async () => {
    const mapped = Layer.succeed(Config, config).map((ctx) => ctx.add(Db, dbFrom(ctx.unsafeGet(Config))))
    expect((await mapped.build(Context.empty())).unsafeGet(Db).query()).toBe("query pg://local")
    const merged = Layer.mergeAll(Layer.succeed(Config, config), Layer.succeed(Db, dbFrom(config)))
    expect((await merged.build(Context.empty())).size).toBe(2)
  })

  it("rejects when a sync factory throws, so provideLayer fails the run", async () => {
    const boom = Layer.sync(Config, (): Config => {
      throw new Error("no config")
    })
    await expect(boom.build(Context.empty())).rejects.toThrow("no config")
    const exit = await IO.service(Config).provideLayer(boom).runExit()
    expect(exit.isSuccess()).toBe(false)
  })

  it("fails on a detached call", async () => {
    const { toString, build, merge } = Layer.empty()
    expect(() => toString()).toThrow(TypeError)
    expect(() => build(Context.empty())).toThrow(TypeError)
    // A detached composer builds a layer that fails when it is built.
    await expect(merge(Layer.empty()).build(Context.empty())).rejects.toThrow(TypeError)
  })
})
