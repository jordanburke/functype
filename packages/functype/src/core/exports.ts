/**
 * `functype/core`: the names most code needs, as one short import. The root `functype` import exports
 * everything, over a hundred values; reach for it when you need more, such as Layer, Http, Match, Cond, Lazy,
 * branded types, validation or serialization.
 *
 * This is for discoverability, not bundle size: since 2.0 a root import tree-shakes to the same bundle
 * as a subpath import. Every name here is the same value as the root export of that name.
 */

// The four ways code goes wrong: a missing value, a typed failure, a thrown error, an effect.
export { Either, isLeft, isRight, Left, Right, tryCatch, tryCatchAsync } from "@/either/Either"
export { IO } from "@/io/IO"
export { Tag } from "@/io/Tag"
export { None, Option, Some } from "@/option/Option"
export { Try } from "@/try/Try"

// Immutable collections.
export { List } from "@/list/List"
export { Map } from "@/map/Map"
export { Set } from "@/set/Set"
export { Tuple } from "@/tuple/Tuple"
