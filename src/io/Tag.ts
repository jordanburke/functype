import type { Type } from "@/types"

/**
 * Tag module - service identifiers for dependency injection.
 * @module Tag
 * @category IO
 *
 * Tags are used to identify services in a type-safe way.
 * Each Tag has a unique identifier and carries the type of the service.
 */

/**
 * A Tag identifies a service type and provides a unique identifier.
 * Used for dependency injection with IO effects.
 *
 * @typeParam S - The service type this tag identifies
 *
 * @example
 * ```typescript
 * // Define service interfaces
 * interface UserService {
 *   getUser(id: string): IO<never, Error, User>
 * }
 *
 * // Create a tag for the service
 * const UserService = Tag<UserService>("UserService")
 *
 * // Use in effects
 * const getUser = (id: string) =>
 *   IO.service(UserService).flatMap(svc => svc.getUser(id))
 * ```
 */
export interface Tag<S extends Type> {
  /**
   * Unique identifier for this tag
   */
  readonly id: string

  /**
   * Phantom type to carry the service type
   * @internal
   */
  readonly _S?: S

  /**
   * Type brand to distinguish tags
   * @internal
   */
  readonly _tag: "Tag"

  /**
   * String representation
   */
  toString(): string
}

/**
 * Creates a Tag for identifying a service type.
 *
 * @param id - Unique identifier for this tag (usually the service name)
 * @returns A Tag that can be used to request the service
 *
 * @example
 * ```typescript
 * interface Logger {
 *   log(message: string): void
 * }
 *
 * const Logger = Tag<Logger>("Logger")
 *
 * // Now Logger can be used to request the Logger service
 * const program = IO.service(Logger).flatMap(logger =>
 *   IO.sync(() => logger.log("Hello!"))
 * )
 * ```
 */
export const Tag = <S extends Type>(id: string): Tag<S> => ({
  id,
  _tag: "Tag",
  toString() {
    return `Tag(${id})`
  },
})

/**
 * Type helper to extract the service type from a Tag
 */
export type TagService<T> = T extends Tag<infer S> ? S : never
