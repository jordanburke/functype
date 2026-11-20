/**
 * Shared prototypes for values (#276 §14). A value keeps only its data as own properties; its
 * methods live once on a prototype per variant, so building a value doesn't copy ~40 closures.
 *
 * This module imports no concrete type, because Option, Either, Try, Exit, IO and List import each
 * other and a prototype is built when its module loads.
 */

declare const holeA: unique symbol
declare const holeB: unique symbol
declare const holeC: unique symbol

/**
 * Stands in for "any T" while a prototype is checked. It's opaque, so a method can't build or pick
 * apart a T, which catches most mistakes. It isn't a full proof that the prototype works for every
 * T: `A` is an object type, so `this.value.toString()` or `"x" in this.value` compile here and would
 * throw for `null` or a primitive. And `Object.create` returns `any`, so a constructor that uses the
 * wrong prototype or skips a field also compiles. The prototype tests guard those.
 */
export type A = { readonly [holeA]: true }
/** A second, distinct hole, for variants with two type parameters such as `Either<L, R>`. */
export type B = { readonly [holeB]: true }
/** A third hole, for `IO<R, E, A>`. */
export type C = { readonly [holeC]: true }

/** The usual own data fields. Everything else on a variant's interface belongs on its prototype. */
export type DataKeys = "_tag" | "value" | "error"

/**
 * Every non-data member of `Self`, typed from the interface, with `this` typed as `Self`. `Data`
 * names the own data fields; by default, whichever of {@link DataKeys} `Self` has.
 */
export type Methods<Self, Data extends keyof Self = Extract<keyof Self, DataKeys>> = {
  [K in Exclude<keyof Self, Data>]: Self[K]
} & ThisType<Self>

/** `Self` with its data fields writable, for the constructor that fills them in. */
export type Mutable<Self> = { -readonly [K in keyof Self]: Self[K] }

/**
 * Checks a prototype against a variant's interface, then builds it: hung on a function named
 * `name` so the console shows `Some { … }`, members non-enumerable so `for…in` sees only data,
 * and frozen once.
 *
 * `Data` names the fields each value holds itself, when they aren't the usual `_tag`, `value` and
 * `error`: `define<DieExitOf<B, A>, "_tag" | "defect">()`. It must be keys of `Self`, so a typo fails.
 */
/* eslint-disable functional/immutable-data -- define() builds the one object it returns, then freezes it */
export const define =
  <Self, Data extends keyof Self = Extract<keyof Self, DataKeys>>() =>
  (name: string, members: Methods<Self, Data>): Methods<Self, Data> => {
    // A function expression, because method shorthand has no `prototype`. Its name is what the
    // console prints before the value's data.
    const owner = function (): void {}
    Object.defineProperty(owner, "name", { value: name })
    const proto = owner.prototype as Record<PropertyKey, unknown>
    Reflect.ownKeys(members).forEach((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(members, key)
      if (descriptor) Object.defineProperty(proto, key, { ...descriptor, enumerable: false })
    })
    return Object.freeze(proto) as Methods<Self, Data>
  }
/* eslint-enable functional/immutable-data */
