import type { Foldable } from "@/foldable/Foldable"
import type { Serializable } from "@/serializable/Serializable"
import type { Typeable } from "@/typeable"
import type { AsyncMonad } from "@/typeclass"
import type { Type } from "@/types"

/**
 * Base interface for sum-type containers (Either, Try, etc.) that are NOT iterables.
 *
 * Unlike `FunctypeBase`, this base deliberately excludes `Traversable` — which bundles
 * `reduce` / `reduceRight` / `size` / `isEmpty`. Those methods force A-invariance on their
 * containers (signature `(f: (A, A) => A) => A` puts A in both contravariant and covariant
 * positions) and have no semantic meaning for disjoint-union types where the "success"
 * branch is 0-or-1, not a collection.
 *
 * Sum types that extend `FunctypeSum` can be declared covariant in their type parameter
 * (`interface Foo<out A>`) without structural check failures. This mirrors Scala's model:
 * `Either[+L, +R]` and `Try[+T]` do not extend `Iterable`; only `Option[+A]` extends the
 * lighter `IterableOnce[+A]`.
 *
 * Only the covariance-safe subset of `ContainerOps` is included inline: `contains`,
 * `exists`, and `forEach` all place A only in contravariant (callback input) position.
 * `find` (returns `Option<A>`) and `count` are intentionally omitted — if a sum type
 * needs them it can declare them directly.
 *
 * @typeParam A - the type of the "success" branch value
 * @typeParam Tag - the discriminant tag (e.g., `"Left" | "Right"`, `"Success" | "Failure"`)
 */
export interface FunctypeSum<A extends Type, Tag extends string = string>
  extends AsyncMonad<A>, Foldable<A>, Serializable<A>, Typeable<Tag> {
  readonly _tag: Tag
  readonly [Symbol.toStringTag]: string
  contains(value: A): boolean
  exists(p: (a: A) => boolean): boolean
  forEach(f: (a: A) => void): void
}
