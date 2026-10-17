import type { JSONValue } from "@/serialization/Serialization"

/**
 * An `Encoder<A>` turns a typed value into the JSON that goes on the wire — the request-side
 * counterpart of {@link Decoder}. Any function with this shape is an encoder.
 *
 * Pass one as `encode` on an `Http` request when `flatten` can't express the wire shape you need:
 * custom date formats, snake_case keys, stripping fields.
 *
 * @example
 * ```typescript
 * const encodeUser: Encoder<User> = (u) => ({ user_name: u.name, created_at: u.createdAt.toISOString() })
 * Http.post("/users", { body: user, encode: encodeUser })
 * ```
 */
export type Encoder<A> = (value: A) => JSONValue
