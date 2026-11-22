import { type A, type B, type C, define, type Mutable } from "@/internal/define"
import type { Type } from "@/types"

import type { Context } from "./Context"
import { Context as ContextCompanion } from "./Context"
import type { Tag } from "./Tag"

/**
 * Layer module - service construction recipes.
 * @module Layer
 * @category IO
 *
 * Layers describe how to construct services, including their dependencies.
 * They can be composed to build complex service graphs.
 */

/**
 * A Layer describes how to build a service or set of services.
 *
 * @typeParam RIn - Required services (dependencies)
 * @typeParam E - Possible errors during construction
 * @typeParam ROut - Services provided by this layer
 *
 * @example
 * ```typescript
 * // A layer that provides a Logger service
 * const LoggerLive = Layer.succeed(Logger, consoleLogger)
 *
 * // A layer that requires Config and provides Database
 * const DatabaseLive = Layer.fromFunction(Database, (config: Config) =>
 *   createDatabase(config.connectionString)
 * )
 * ```
 */
export interface Layer<RIn extends Type, E extends Type, ROut extends Type> {
  /**
   * Type brand
   * @internal
   */
  readonly _tag: "Layer"

  /**
   * Phantom types
   * @internal
   */
  readonly _RIn?: RIn
  readonly _E?: E
  readonly _ROut?: ROut

  /**
   * Builds the services, given the ones this layer needs.
   * @internal
   */
  build(input: Context<RIn>): Promise<Context<ROut>>

  /**
   * Composes this layer with another, running them in sequence.
   * The output of this layer becomes available to the next layer.
   * @param that - Layer to compose with
   */
  provideToAndMerge<RIn2 extends Type, E2 extends Type, ROut2 extends Type>(
    that: Layer<RIn2 | ROut, E2, ROut2>,
  ): Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut | ROut2>

  /**
   * Merges two independent layers.
   * @param that - Layer to merge with
   */
  merge<RIn2 extends Type, E2 extends Type, ROut2 extends Type>(
    that: Layer<RIn2, E2, ROut2>,
  ): Layer<RIn | RIn2, E | E2, ROut | ROut2>

  /**
   * Maps the output of this layer.
   * @param f - Function to transform the output
   */
  map<ROut2 extends Type>(f: (ctx: Context<ROut>) => Context<ROut2>): Layer<RIn, E, ROut2>

  /**
   * String representation
   */
  toString(): string
}

/**
 * How a layer builds its services: plain data, which the shared `build` method runs. Keeping the
 * recipe as data, as an IO keeps its effect, lets test matchers compare two layers built from the
 * same parts.
 */
type LayerRecipe =
  | { readonly _tag: "Succeed"; readonly tag: Tag<Type>; readonly service: Type }
  | { readonly _tag: "Sync"; readonly tag: Tag<Type>; readonly make: () => Type }
  | { readonly _tag: "Effect"; readonly tag: Tag<Type>; readonly make: () => Promise<Type> }
  | {
      readonly _tag: "FromService"
      readonly tag: Tag<Type>
      readonly dep: Tag<Type>
      readonly make: (dep: Type) => Type
    }
  | {
      readonly _tag: "FromServiceEffect"
      readonly tag: Tag<Type>
      readonly dep: Tag<Type>
      readonly make: (dep: Type) => Promise<Type>
    }
  | { readonly _tag: "FromContext"; readonly context: Context<Type> }
  | { readonly _tag: "Empty" }
  | { readonly _tag: "Merge"; readonly layers: readonly AnyLayer[] }
  | { readonly _tag: "ProvideToAndMerge"; readonly first: AnyLayer; readonly second: AnyLayer }
  | { readonly _tag: "Map"; readonly layer: AnyLayer; readonly f: (ctx: Context<Type>) => Context<Type> }

type AnyLayer = Layer<Type, Type, Type>

/** A Layer's own data: its tag and its recipe, which isn't on {@link Layer}. @internal */
interface LayerOf<RIn extends Type, E extends Type, ROut extends Type> extends Layer<RIn, E, ROut> {
  readonly recipe: LayerRecipe
}

/** Runs a recipe. Every layer's `build` comes here, so a layer's services are built only on demand. */
const buildRecipe = async (recipe: LayerRecipe, input: Context<Type>): Promise<Context<Type>> => {
  switch (recipe._tag) {
    case "Succeed":
      return ContextCompanion.make(recipe.tag, recipe.service)
    case "Sync":
      return ContextCompanion.make(recipe.tag, recipe.make())
    case "Effect":
      return ContextCompanion.make(recipe.tag, await recipe.make())
    case "FromService":
      return ContextCompanion.make(recipe.tag, recipe.make(input.unsafeGet(recipe.dep)))
    case "FromServiceEffect":
      return ContextCompanion.make(recipe.tag, await recipe.make(input.unsafeGet(recipe.dep)))
    case "FromContext":
      return recipe.context
    case "Empty":
      return ContextCompanion.empty()
    case "Merge": {
      const outputs = await Promise.all(recipe.layers.map((layer) => layer.build(input)))
      return outputs.reduce<Context<Type>>((acc, ctx) => acc.merge(ctx), ContextCompanion.empty())
    }
    case "ProvideToAndMerge": {
      const firstOutput = await recipe.first.build(input)
      const secondOutput = await recipe.second.build(input.merge(firstOutput))
      return firstOutput.merge(secondOutput)
    }
    case "Map":
      return recipe.f(await recipe.layer.build(input))
  }
}

/** The name `toString` shows: the service's tag for a single-service layer. */
const recipeName = (recipe: LayerRecipe): string => {
  switch (recipe._tag) {
    case "Succeed":
    case "Sync":
    case "Effect":
    case "FromService":
    case "FromServiceEffect":
      return recipe.tag.id
    case "Empty":
      return "empty"
    default:
      return "anonymous"
  }
}

/**
 * Every Layer shares these methods (#276 §14). A layer keeps only `_tag` and its recipe, and is
 * frozen, as Tag and Context are.
 */
const LayerProto = define<LayerOf<A, B, C>, "_tag" | "recipe" | "_RIn" | "_E" | "_ROut">()("Layer", {
  build(input) {
    return unsafeCoerce(buildRecipe(this.recipe, unsafeCoerce(input)))
  },

  provideToAndMerge(that) {
    return createLayer({ _tag: "ProvideToAndMerge", first: unsafeCoerce(this), second: unsafeCoerce(that) })
  },

  merge(that) {
    return createLayer({ _tag: "Merge", layers: [unsafeCoerce(this), unsafeCoerce(that)] })
  },

  map(f) {
    return createLayer({ _tag: "Map", layer: unsafeCoerce(this), f: unsafeCoerce(f) })
  },

  toString() {
    return `Layer(${recipeName(this.recipe)})`
  },
})

/** The casts the recipes need: a recipe stores its parts at `Type`, whatever the layer's types. */
const unsafeCoerce = <T>(value: unknown): T => value as T

/** Creates a Layer from its recipe. */
const createLayer = <RIn extends Type, E extends Type, ROut extends Type>(recipe: LayerRecipe): Layer<RIn, E, ROut> => {
  // The one cast: a prototype checked at the opaque A, B and C works for every RIn, E and ROut.
  const layer = Object.create(LayerProto) as Mutable<LayerOf<RIn, E, ROut>>
  /* eslint-disable functional/immutable-data -- filling in the layer just created, then freezing it */
  layer._tag = "Layer"
  layer.recipe = recipe
  /* eslint-enable functional/immutable-data */
  return Object.freeze(layer)
}

/**
 * Layer companion object with construction methods
 */
export const Layer = {
  /**
   * Creates a layer that provides a service with a constant value.
   * @param tag - The service tag
   * @param service - The service implementation
   */
  succeed: <S extends Type>(tag: Tag<S>, service: S): Layer<never, never, S> =>
    createLayer({ _tag: "Succeed", tag: unsafeCoerce(tag), service }),

  /**
   * Creates a layer from an async function.
   * @param tag - The service tag
   * @param f - Async function to create the service
   */
  effect: <S extends Type, E extends Type>(tag: Tag<S>, f: () => Promise<S>): Layer<never, E, S> =>
    createLayer({ _tag: "Effect", tag: unsafeCoerce(tag), make: f }),

  /**
   * Creates a layer from a sync function.
   * @param tag - The service tag
   * @param f - Function to create the service
   */
  sync: <S extends Type>(tag: Tag<S>, f: () => S): Layer<never, never, S> =>
    createLayer({ _tag: "Sync", tag: unsafeCoerce(tag), make: f }),

  /**
   * Creates a layer that depends on another service.
   * @param tag - The service tag to provide
   * @param depTag - The dependency tag
   * @param f - Function to create the service from the dependency
   */
  fromService: <Dep extends Type, S extends Type>(
    tag: Tag<S>,
    depTag: Tag<Dep>,
    f: (dep: Dep) => S,
  ): Layer<Dep, never, S> =>
    createLayer({ _tag: "FromService", tag: unsafeCoerce(tag), dep: unsafeCoerce(depTag), make: unsafeCoerce(f) }),

  /**
   * Creates a layer that depends on another service (async).
   * @param tag - The service tag to provide
   * @param depTag - The dependency tag
   * @param f - Async function to create the service from the dependency
   */
  fromServiceEffect: <Dep extends Type, E extends Type, S extends Type>(
    tag: Tag<S>,
    depTag: Tag<Dep>,
    f: (dep: Dep) => Promise<S>,
  ): Layer<Dep, E, S> =>
    createLayer({
      _tag: "FromServiceEffect",
      tag: unsafeCoerce(tag),
      dep: unsafeCoerce(depTag),
      make: unsafeCoerce(f),
    }),

  /**
   * Creates a layer from a context.
   * @param context - The context to use
   */
  fromContext: <R extends Type>(context: Context<R>): Layer<never, never, R> =>
    createLayer({ _tag: "FromContext", context: unsafeCoerce(context) }),

  /**
   * Creates an empty layer that provides nothing.
   */
  empty: (): Layer<never, never, never> => createLayer({ _tag: "Empty" }),

  /**
   * Merges multiple layers into one.
   * @param layers - Layers to merge
   */
  mergeAll: <Layers extends Layer<Type, Type, Type>[]>(
    ...layers: Layers
  ): Layer<
    Layers[number] extends Layer<infer RIn, Type, Type> ? RIn : never,
    Layers[number] extends Layer<Type, infer E, Type> ? E : never,
    Layers[number] extends Layer<Type, Type, infer ROut> ? ROut : never
  > => createLayer({ _tag: "Merge", layers }),
}

/**
 * Type helper to extract input requirements from a Layer
 */
export type LayerInput<L> = L extends Layer<infer RIn, Type, Type> ? RIn : never

/**
 * Type helper to extract error type from a Layer
 */
export type LayerError<L> = L extends Layer<Type, infer E, Type> ? E : never

/**
 * Type helper to extract output services from a Layer
 */
export type LayerOutput<L> = L extends Layer<Type, Type, infer ROut> ? ROut : never
