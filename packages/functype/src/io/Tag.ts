import { type A, define, type Mutable } from "@/internal/define"
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

/** Every Tag shares this method (#276 §14); a tag keeps only `_tag` and `id`, and is frozen. */
const TagProto = define<Tag<A>, "_tag" | "id" | "_S">()("Tag", {
  toString() {
    return `Tag(${this.id})`
  },
})

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
export const Tag = <S extends Type>(id: string): Tag<S> => {
  // The one cast: a prototype checked at the opaque A works for every S.
  const tag = Object.create(TagProto) as Mutable<Tag<S>>
  /* eslint-disable functional/immutable-data -- filling in the tag just created, then freezing it */
  tag._tag = "Tag"
  tag.id = id
  /* eslint-enable functional/immutable-data */
  return Object.freeze(tag)
}

/**
 * Type helper to extract the service type from a Tag
 */
export type TagService<T> = T extends Tag<infer S> ? S : never
