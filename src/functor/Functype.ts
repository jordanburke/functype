import type { Extractable } from "@/extractable"
import type { Foldable } from "@/foldable/Foldable"
import type { Matchable } from "@/matchable"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import type { Traversable } from "@/traversable/Traversable"

import type { AsyncMonad } from "./Functor"

/**
 * Base interface for all functype data structures.
 * This provides a standard contract with core functional programming traits.
 *
 * @typeParam A - The type of value contained in the functor
 * @typeParam Tag - The type tag for pattern matching (e.g., "Some" | "None" for Option)
 *
 * @example
 * ```typescript
 * // Implementing FunctypeBase for a custom data structure
 * class MyContainer<T> implements FunctypeBase<T, "Empty" | "Full"> {
 *   // Implementation of all required methods...
 * }
 * ```
 */
export interface FunctypeBase<A, Tag extends string = string>
  extends AsyncMonad<A>,
    Traversable<A>,
    Serializable<A>,
    Foldable<A> {
  readonly _tag: Tag
}

/**
 * Interface for single-value containers like Option, Either, Try.
 * Extends FunctypeBase with extraction methods and Pipe.
 *
 * @typeParam A - The type of value contained
 * @typeParam Tag - The type tag for pattern matching
 */
export interface Functype<A, Tag extends string = string>
  extends FunctypeBase<A, Tag>,
    Extractable<A>,
    Pipe<A>,
    Matchable<A, Tag> {
  toValue(): { _tag: Tag; value: A }
}

/**
 * A minimal version of Functype for simpler data structures that don't need
 * the full monadic interface but still want core functional operations.
 *
 * @typeParam A - The type of value contained
 * @typeParam Tag - The type tag for pattern matching
 */
export interface FunctypeMinimal<A, Tag extends string = string>
  extends Serializable<A>,
    Pipe<A>,
    Foldable<A>,
    Matchable<A, Tag> {
  readonly _tag: Tag
  toValue(): { _tag: Tag; value: A }
}

/**
 * A version of Functype for collection types that need iteration support.
 * Extends FunctypeBase with Iterable protocol but without Extractable.
 *
 * @typeParam A - The element type of the collection
 * @typeParam Tag - The type tag for pattern matching
 */
export interface FunctypeCollection<A, Tag extends string = string>
  extends FunctypeBase<A, Tag>,
    Iterable<A>,
    Pipe<A[]> {
  toValue(): { _tag: Tag; value: A[] }
}
