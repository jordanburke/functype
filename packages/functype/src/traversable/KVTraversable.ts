import type { Type } from "@/types"

import type { Reducible } from "./Traversable"

/**
 * A traversable interface for key-value containers: Traversable without map, flatMap,
 * flatMapAsync and ap, which is `Reducible`.
 *
 * Key-value containers (Map, Obj) cannot satisfy Functor's unconstrained
 * `map<B extends Type>` because their type parameter is constrained
 * (e.g., to Record or Tuple pairs). These containers redefine map/flatMap
 * with their own tighter constraints.
 *
 * @typeParam A - The element type of the traversable
 */
export type KVTraversable<A extends Type> = Reducible<A>
