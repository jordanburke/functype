import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import type { Type } from "@/types"

import type { Tag } from "./Tag"

/**
 * Context module - service container for dependency injection.
 * @module Context
 * @category IO
 *
 * Context is an immutable container that holds service implementations
 * identified by their Tags.
 */

/**
 * Context holds service implementations for dependency injection.
 * It's an immutable container that maps Tags to their implementations.
 *
 * @typeParam R - The services contained in this context (intersection type)
 *
 * @example
 * ```typescript
 * const ctx = Context.empty()
 *   .add(Logger, consoleLogger)
 *   .add(Database, pgDatabase)
 *
 * // Access a service
 * const logger = ctx.get(Logger) // Option<Logger>
 * const loggerUnsafe = ctx.unsafeGet(Logger) // Logger (throws if missing)
 * ```
 */
export interface Context<R extends Type> {
  /**
   * Type brand
   * @internal
   */
  readonly _tag: "Context"

  /**
   * Phantom type for requirements
   * @internal
   */
  readonly _R?: R

  /**
   * Internal service map
   * @internal
   */
  readonly services: ReadonlyMap<string, Type>

  /**
   * Gets a service from the context.
   * @param tag - The tag identifying the service
   * @returns Some(service) if found, None otherwise
   */
  get<S extends Type>(tag: Tag<S>): Option<S>

  /**
   * Gets a service from the context, throwing if not found.
   * @param tag - The tag identifying the service
   * @returns The service
   * @throws Error if service not found
   */
  unsafeGet<S extends Type>(tag: Tag<S>): S

  /**
   * Checks if a service exists in the context.
   * @param tag - The tag to check
   * @returns true if the service exists
   */
  has<S extends Type>(tag: Tag<S>): boolean

  /**
   * Adds a service to the context, returning a new context.
   * @param tag - The tag for the service
   * @param service - The service implementation
   * @returns A new context with the service added
   */
  add<S extends Type>(tag: Tag<S>, service: S): Context<R & S>

  /**
   * Merges another context into this one.
   * @param other - The context to merge
   * @returns A new context with all services from both
   */
  merge<R2 extends Type>(other: Context<R2>): Context<R & R2>

  /**
   * Returns the number of services in this context.
   */
  readonly size: number

  /**
   * String representation
   */
  toString(): string
}

/**
 * Creates a Context from a services map
 */
const createContext = <R extends Type>(services: ReadonlyMap<string, Type>): Context<R> => ({
  _tag: "Context",
  services,

  get<S extends Type>(tag: Tag<S>): Option<S> {
    const service = services.get(tag.id)
    return service !== undefined ? Some(service as S) : None()
  },

  unsafeGet<S extends Type>(tag: Tag<S>): S {
    const service = services.get(tag.id)
    if (service === undefined) {
      throw new Error(`Service not found: ${tag.id}`)
    }
    return service as S
  },

  has<S extends Type>(tag: Tag<S>): boolean {
    return services.has(tag.id)
  },

  add<S extends Type>(tag: Tag<S>, service: S): Context<R & S> {
    const newServices = new Map(services)
    newServices.set(tag.id, service)
    return createContext(newServices)
  },

  merge<R2 extends Type>(other: Context<R2>): Context<R & R2> {
    const newServices = new Map(services)
    for (const [key, value] of other.services) {
      newServices.set(key, value)
    }
    return createContext(newServices)
  },

  get size() {
    return services.size
  },

  toString() {
    const keys = Array.from(services.keys()).join(", ")
    return `Context(${keys})`
  },
})

/**
 * Context companion object with utility methods
 */
export const Context = {
  /**
   * Creates an empty context with no services.
   */
  empty: <R extends Type = never>(): Context<R> => createContext(new Map()),

  /**
   * Creates a context with a single service.
   * @param tag - The tag for the service
   * @param service - The service implementation
   */
  make: <S extends Type>(tag: Tag<S>, service: S): Context<S> => {
    const services = new Map<string, Type>()
    services.set(tag.id, service)
    return createContext(services)
  },

  /**
   * Checks if a value is a Context.
   */
  isContext: <R extends Type>(value: unknown): value is Context<R> =>
    typeof value === "object" && value !== null && (value as Context<R>)._tag === "Context",
}

/**
 * Type helper to extract requirements from a Context
 */
export type ContextServices<C> = C extends Context<infer R> ? R : never

/**
 * Type helper to check if a context provides a service
 */
export type HasService<C, S> = S extends ContextServices<C> ? true : false
