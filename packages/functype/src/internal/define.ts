/**
 * Shared prototypes for values (#276 §14). A value keeps only its data as own properties; its
 * methods live once on a prototype per variant, so building a value doesn't copy ~40 closures.
 *
 * This module imports no concrete type, because Option, Either, Try and List import each other
 * and a prototype is built when its module loads.
 */

declare const holeA: unique symbol
declare const holeB: unique symbol

/**
 * Stands in for "any T" while a prototype is checked. It's opaque, so a method can't depend on
 * what T is: a prototype that checks at `A` works for every `T`.
 */
export type A = { readonly [holeA]: true }
/** A second, distinct hole, for variants with two type parameters such as `Either<L, R>`. */
export type B = { readonly [holeB]: true }

/** Own data fields. Everything else on a variant's interface belongs on its prototype. */
export type DataKeys = "_tag" | "value" | "error"

/** Every non-data member of `Self`, typed from the interface, with `this` typed as `Self`. */
export type Methods<Self> = { [K in Exclude<keyof Self, DataKeys>]: Self[K] } & ThisType<Self>

/** `Self` with its data fields writable, for the constructor that fills them in. */
export type Mutable<Self> = { -readonly [K in keyof Self]: Self[K] }

/**
 * Checks a prototype against a variant's interface, then builds it: hung on a function named
 * `name` so the console shows `Some { … }`, members non-enumerable so `for…in` sees only data,
 * and frozen once.
 */
/* eslint-disable functional/immutable-data -- define() builds the one object it returns, then freezes it */
export const define =
  <Self>() =>
  (name: string, members: Methods<Self>): Methods<Self> => {
    // A function expression, because method shorthand has no `prototype`. Its name is what the
    // console prints before the value's data.
    const owner = function (): void {}
    Object.defineProperty(owner, "name", { value: name })
    const proto = owner.prototype as Record<PropertyKey, unknown>
    Reflect.ownKeys(members).forEach((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(members, key)
      if (descriptor) Object.defineProperty(proto, key, { ...descriptor, enumerable: false })
    })
    return Object.freeze(proto) as Methods<Self>
  }
/* eslint-enable functional/immutable-data */
