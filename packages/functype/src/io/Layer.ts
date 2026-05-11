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
   * The build function that creates the context
   * @internal
   */
  readonly build: (input: Context<RIn>) => Promise<Context<ROut>>

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
 * Creates a Layer from a build function
 */
const createLayer = <RIn extends Type, E extends Type, ROut extends Type>(
  build: (input: Context<RIn>) => Promise<Context<ROut>>,
  name?: string,
): Layer<RIn, E, ROut> => ({
  _tag: "Layer",
  build,

  provideToAndMerge<RIn2 extends Type, E2 extends Type, ROut2 extends Type>(
    that: Layer<RIn2 | ROut, E2, ROut2>,
  ): Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut | ROut2> {
    return createLayer(async (input: Context<RIn | Exclude<RIn2, ROut>>) => {
      const thisOutput = await build(input as Context<RIn>)
      const mergedInput = (input as Context<Exclude<RIn2, ROut>>).merge(thisOutput)
      const thatOutput = await that.build(mergedInput as unknown as Context<RIn2 | ROut>)
      return thisOutput.merge(thatOutput) as Context<ROut | ROut2>
    })
  },

  merge<RIn2 extends Type, E2 extends Type, ROut2 extends Type>(
    that: Layer<RIn2, E2, ROut2>,
  ): Layer<RIn | RIn2, E | E2, ROut | ROut2> {
    return createLayer(async (input: Context<RIn | RIn2>) => {
      const [thisOutput, thatOutput] = await Promise.all([
        build(input as Context<RIn>),
        that.build(input as Context<RIn2>),
      ])
      return thisOutput.merge(thatOutput) as Context<ROut | ROut2>
    })
  },

  map<ROut2 extends Type>(f: (ctx: Context<ROut>) => Context<ROut2>): Layer<RIn, E, ROut2> {
    return createLayer(async (input: Context<RIn>) => {
      const output = await build(input)
      return f(output)
    })
  },

  toString() {
    return `Layer(${name ?? "anonymous"})`
  },
})

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
    createLayer(() => Promise.resolve(ContextCompanion.make(tag, service)), tag.id),

  /**
   * Creates a layer from an async function.
   * @param tag - The service tag
   * @param f - Async function to create the service
   */
  effect: <S extends Type, E extends Type>(tag: Tag<S>, f: () => Promise<S>): Layer<never, E, S> =>
    createLayer(async () => {
      const service = await f()
      return ContextCompanion.make(tag, service)
    }, tag.id),

  /**
   * Creates a layer from a sync function.
   * @param tag - The service tag
   * @param f - Function to create the service
   */
  sync: <S extends Type>(tag: Tag<S>, f: () => S): Layer<never, never, S> =>
    createLayer(() => Promise.resolve(ContextCompanion.make(tag, f())), tag.id),

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
    createLayer((input: Context<Dep>) => {
      const dep = input.unsafeGet(depTag)
      return Promise.resolve(ContextCompanion.make(tag, f(dep)))
    }, tag.id),

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
    createLayer(async (input: Context<Dep>) => {
      const dep = input.unsafeGet(depTag)
      const service = await f(dep)
      return ContextCompanion.make(tag, service)
    }, tag.id),

  /**
   * Creates a layer from a context.
   * @param context - The context to use
   */
  fromContext: <R extends Type>(context: Context<R>): Layer<never, never, R> =>
    createLayer(() => Promise.resolve(context)),

  /**
   * Creates an empty layer that provides nothing.
   */
  empty: (): Layer<never, never, never> => createLayer(() => Promise.resolve(ContextCompanion.empty()), "empty"),

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
  > =>
    createLayer(async (input) => {
      const outputs = await Promise.all(layers.map((l) => l.build(input as Context<Type>)))
      return outputs.reduce((acc, ctx) => acc.merge(ctx), ContextCompanion.empty()) as Context<Type>
    }) as Layer<
      Layers[number] extends Layer<infer RIn, Type, Type> ? RIn : never,
      Layers[number] extends Layer<Type, infer E, Type> ? E : never,
      Layers[number] extends Layer<Type, Type, infer ROut> ? ROut : never
    >,
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
