import { Base } from "@/core/base/Base"
import { Either } from "@/either/Either"
import type { Type } from "@/functor"
import { List } from "@/list/List"
import { Option } from "@/option/Option"
import { Try } from "@/try/Try"

/**
 * Type function for representing higher-kinded types
 */
export type Kind<F, A> = F extends (arg: infer T) => infer R ? R : never

/**
 * Type constructors for common Functype data types
 */
export type OptionKind = <A>(a: A) => Option<A>
export type ListKind = <A>(a: A) => List<A>
export type EitherKind<E> = <A>(a: A) => Either<E, A>
export type TryKind = <A>(a: A) => Try<A>

/**
 * Type guard to check if a value is an Option
 */
const isOption = <T extends Type>(value: unknown): value is Option<T> => {
  return (
    value !== null && typeof value === "object" && ((value as any)._tag === "Some" || (value as any)._tag === "None")
  )
}

/**
 * Type guard to check if a value is a List
 */
const isList = <T extends Type>(value: unknown): value is List<T> => {
  return value !== null && typeof value === "object" && (value as any)._tag === "List"
}

/**
 * Type guard to check if a value is an Either
 */
const isEither = <E extends Type, A extends Type>(value: unknown): value is Either<E, A> => {
  return (
    value !== null && typeof value === "object" && ((value as any)._tag === "Left" || (value as any)._tag === "Right")
  )
}

/**
 * Type guard to check if a value is a Try
 */
const isTry = <T extends Type>(value: unknown): value is Try<T> => {
  return (
    value !== null &&
    typeof value === "object" &&
    ((value as any)._tag === "Success" || (value as any)._tag === "Failure")
  )
}

/**
 * HKT provides utilities for working with higher-kinded types
 * This allows writing generic code that works across different
 * container types like Option, List, Either, etc.
 */
export const HKT = () => {
  /**
   * Maps over a value inside a container, using the container's own map function
   */
  const map = <F extends (a: A) => any, A extends Type, B extends Type>(fa: Kind<F, A>, f: (a: A) => B): Kind<F, B> => {
    if (isOption<A>(fa)) {
      return fa.map(f) as Kind<F, B>
    }
    if (isList<A>(fa)) {
      return fa.map(f) as Kind<F, B>
    }
    if (isEither<any, A>(fa)) {
      return fa.map(f) as Kind<F, B>
    }
    if (isTry<A>(fa)) {
      return fa.map(f) as Kind<F, B>
    }
    throw new Error(`Unsupported functor type: ${JSON.stringify(fa)}`)
  }

  /**
   * Flattens a nested container (container of container) into a single container
   */
  const flatten = <F extends (a: any) => any, A extends Type>(ffa: Kind<F, Kind<F, A>>): Kind<F, A> => {
    if (isOption<Kind<F, A>>(ffa)) {
      return ffa.flatMap((inner: Kind<F, A>) => inner) as Kind<F, A>
    }
    if (isList<Kind<F, A>>(ffa)) {
      return ffa.flatMap((inner: Kind<F, A>) => inner) as Kind<F, A>
    }
    if (isEither<any, Kind<F, A>>(ffa)) {
      return ffa.flatMap((inner: Kind<F, A>) => inner) as Kind<F, A>
    }
    if (isTry<Kind<F, A>>(ffa)) {
      return ffa.flatMap((inner: Kind<F, A>) => inner) as Kind<F, A>
    }
    throw new Error(`Unsupported functor type for flatten: ${JSON.stringify(ffa)}`)
  }

  /**
   * First applies the function to the value inside the container, then flattens the result
   */
  const flatMap = <F extends (a: A) => any, A extends Type, B extends Type>(
    fa: Kind<F, A>,
    f: (a: A) => Kind<F, B>,
  ): Kind<F, B> => {
    return flatten(map(fa, f))
  }

  /**
   * Applies a function inside a container to a value inside another container
   */
  const ap = <F extends (a: A) => any, A extends Type, B extends Type>(
    ff: Kind<F, (a: A) => B>,
    fa: Kind<F, A>,
  ): Kind<F, B> => {
    if (isOption<(a: A) => B>(ff) && isOption<A>(fa)) {
      return ff.flatMap((f: (a: A) => B) => fa.map(f)) as Kind<F, B>
    }
    if (isList<(a: A) => B>(ff) && isList<A>(fa)) {
      return ff.flatMap((f: (a: A) => B) => fa.map(f)) as Kind<F, B>
    }
    if (isEither<any, (a: A) => B>(ff) && isEither<any, A>(fa)) {
      return ff.flatMap((f: (a: A) => B) => fa.map(f)) as Kind<F, B>
    }
    if (isTry<(a: A) => B>(ff) && isTry<A>(fa)) {
      return ff.flatMap((f: (a: A) => B) => fa.map(f)) as Kind<F, B>
    }
    throw new Error(`Unsupported functor type for ap: ${JSON.stringify(ff)}`)
  }

  /**
   * Sequences a container of containers into a container of container
   * (e.g., Option<List<A>> to List<Option<A>>)
   */
  const sequence = <F extends (a: any) => any, G extends (a: any) => any, A extends Type>(
    fga: Kind<F, Kind<G, A>>,
  ): Kind<G, Kind<F, A>> => {
    // Handle option of container
    if (isOption<Kind<G, A>>(fga)) {
      const optionValue = fga as unknown as Option<Kind<G, A>>

      // If None, return container with None
      if (optionValue.isEmpty) {
        // Testing with list
        return List([Option.none()]) as unknown as Kind<G, Kind<F, A>>
      }

      // Option is Some
      const inner = optionValue.get()
      if (isList<A>(inner)) {
        const result = inner.map((a: A) => Option(a))
        return result as unknown as Kind<G, Kind<F, A>>
      }

      throw new Error(`Unsupported inner container type for sequence`)
    }

    // Handle list of containers
    if (isList<Kind<G, A>>(fga)) {
      const listValue = fga as unknown as List<Kind<G, A>>
      const items = listValue.toArray()

      // Empty list case
      if (items.length === 0) {
        return Option.none() as unknown as Kind<G, Kind<F, A>>
      }

      const first = items[0]
      if (isOption<A>(first)) {
        // List of Options
        // Check if any option is None
        for (const item of items) {
          const opt = item as unknown as Option<A>
          if (opt.isEmpty) {
            return Option.none() as unknown as Kind<G, Kind<F, A>>
          }
        }

        // All options are Some, transform to Option of List
        const values = items.map((item) => {
          const opt = item as unknown as Option<A>
          return opt.get()
        })

        return Option(List(values)) as unknown as Kind<G, Kind<F, A>>
      }

      throw new Error(`Unsupported inner container type for sequence`)
    }

    throw new Error(`Unsupported outer container type for sequence: ${JSON.stringify(fga)}`)
  }

  /**
   * Transforms each element in a container and then sequences the results
   */
  const traverse = <F extends (a: any) => any, G extends (a: any) => any, A extends Type, B extends Type>(
    fa: Kind<F, A>,
    f: (a: A) => Kind<G, B>,
  ): Kind<G, Kind<F, B>> => {
    return sequence(map(fa, f))
  }

  return {
    ...Base("HKT", {
      map,
      flatten,
      flatMap,
      ap,
      sequence,
      traverse,
    }),
    _type: "HKT",
  }
}

/**
 * Static methods for HKT operations
 */
HKT.map = <F extends (a: A) => any, A extends Type, B extends Type>(fa: Kind<F, A>, f: (a: A) => B): Kind<F, B> =>
  HKT().map(fa, f)

HKT.flatten = <F extends (a: any) => any, A extends Type>(ffa: Kind<F, Kind<F, A>>): Kind<F, A> => HKT().flatten(ffa)

HKT.flatMap = <F extends (a: A) => any, A extends Type, B extends Type>(
  fa: Kind<F, A>,
  f: (a: A) => Kind<F, B>,
): Kind<F, B> => HKT().flatMap(fa, f)

HKT.ap = <F extends (a: A) => any, A extends Type, B extends Type>(
  ff: Kind<F, (a: A) => B>,
  fa: Kind<F, A>,
): Kind<F, B> => HKT().ap(ff, fa)

HKT.sequence = <F extends (a: any) => any, G extends (a: any) => any, A extends Type>(
  fga: Kind<F, Kind<G, A>>,
): Kind<G, Kind<F, A>> => HKT().sequence(fga)

HKT.traverse = <F extends (a: any) => any, G extends (a: any) => any, A extends Type, B extends Type>(
  fa: Kind<F, A>,
  f: (a: A) => Kind<G, B>,
): Kind<G, Kind<F, B>> => HKT().traverse(fa, f)

// Export type guards
HKT.isOption = isOption
HKT.isList = isList
HKT.isEither = isEither
HKT.isTry = isTry
