/**
 * Cheap construction for the closure-built collections (issue #511).
 *
 * V8 builds an object literal quickly by copying a cached template, but only when the literal holds
 * no getters. One getter anywhere in a literal of ~60 closures makes V8 define every property one at
 * a time, which made `List(...)` cost about 35 times an `Option(...)`. So a type keeps its literal free
 * of getters: values that can't change after construction become plain properties, and the getters
 * that must stay lazy (`tail`, `init`, ...) come from a descriptor map shared by every instance and
 * are attached after the literal. A shared getter has no closure, so it reads the instance through
 * `this` and its public methods.
 *
 * The result is frozen. That keeps the derived properties read-only, as they were when they were
 * getters, and costs nothing measurable, unlike marking single properties read-only.
 */

/** A getter that reads the instance through `this`. */
type LazyGetter<T> = (this: T) => unknown

/**
 * Build shared descriptors for getters. They are enumerable, like getters written in a literal,
 * so `Object.keys` and spread see the same property names as before.
 */
export const lazyGetters = <T>(getters: Readonly<Record<string, LazyGetter<T>>>): PropertyDescriptorMap =>
  Object.fromEntries(Object.entries(getters).map(([key, get]) => [key, { get, enumerable: true, configurable: true }]))

/** Attach the shared getters to a freshly built literal, then freeze it. */
export const withLazyGetters = <R>(target: object, descriptors: PropertyDescriptorMap): R =>
  Object.freeze(Object.defineProperties(target, descriptors)) as R
