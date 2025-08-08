/**
 * Base interface for objects with a type tag
 * @internal
 */
interface TypeableBase<Tag extends string> {
  readonly _tag: Tag
}

export type Typeable<Tag extends string, T = object> = T & TypeableBase<Tag>

/**
 * Parameters for creating a Typeable instance
 * @internal
 */
export type TypeableParams<Tag extends string, T> = { _tag: Tag; impl: T }

/**
 * Utility type to extract the Tag from a Typeable type
 * @typeParam T - The Typeable type to extract the tag from
 * @internal
 */
export type ExtractTag<T> = T extends Typeable<infer Tag, unknown> ? Tag : never

/**
 * Core utility for creating nominal typing in TypeScript by adding a type tag to any object.
 * This allows for creating distinct types that are structurally identical but considered different by TypeScript's type system.
 *
 * @param params - The parameters containing the tag and implementation
 * @returns A Typeable object with the specified tag
 * @typeParam Tag - The string literal type used as the discriminator
 * @typeParam T - The base type to extend with the tag
 */
export function Typeable<Tag extends string, T>({ _tag, impl }: TypeableParams<Tag, T>): Typeable<Tag, T> {
  return {
    ...impl,
    _tag,
  }
}

/**
 * Type guard with automatic type inference using the full type
 * @param value - The value to check
 * @param tag - The tag to check for
 * @returns Whether the value is a Typeable with the specified tag
 */
export function isTypeable<T>(value: unknown, tag: string): value is T {
  if (!value || typeof value !== "object" || !("_tag" in value)) {
    return false
  }

  return tag ? value._tag === tag : true
}

// // Usage
// type User = Typeable<
//   "User",
//   {
//     id: string
//     name: string
//     email: string
//   }
// >
//
// const user = Typeable("User", {
//   id: "123",
//   name: "John",
//   email: "john@example.com",
// })
//
// const maybeUser: unknown = user
//
// // Now we only need to specify User type
// if (isTypeable<User>(maybeUser, "User")) {
//   console.log(maybeUser.name) // typed
//   console.log(maybeUser.email) // typed
//   console.log(maybeUser._tag) // typed as "User"
// }
//
// // Can still check just for Typeable without specific tag
// if (isTypeable<User>(maybeUser)) {
//   console.log(maybeUser.name) // typed
//   console.log(maybeUser.email) // typed
//   console.log(maybeUser._tag) // typed as "User"
// }
