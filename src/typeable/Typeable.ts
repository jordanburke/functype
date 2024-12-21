// Core type for Typeable objects
export type Typeable<Tag extends string, T = object> = T & {
  readonly _tag: Tag
}

// Utility type to extract the Tag from a Typeable type
export type ExtractTag<T> = T extends Typeable<infer Tag, unknown> ? Tag : never

// Create a tagged object with type inference
export function Typeable<Tag extends string, T>(tag: Tag, data: T): Typeable<Tag, T> {
  return {
    ...data,
    _tag: tag,
  }
}

// Type guard with automatic type inference using the full type
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
