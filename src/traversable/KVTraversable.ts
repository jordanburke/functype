import type { Traversable } from "./Traversable"

/**
 * A traversable interface for key-value containers that excludes map, flatMap,
 * flatMapAsync, and ap operations.
 *
 * Key-value containers (Map, Obj) cannot satisfy Functor's unconstrained
 * `map<B extends Type>` because their type parameter is constrained
 * (e.g., to Record or Tuple pairs). These containers redefine map/flatMap
 * with their own tighter constraints.
 *
 * @typeParam A - The element type of the traversable
 */
export type KVTraversable<A> = Omit<Traversable<A>, "map" | "flatMap" | "flatMapAsync" | "ap">
