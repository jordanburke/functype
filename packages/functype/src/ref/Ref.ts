import { Companion } from "@/companion/Companion"
import { type A as Hole, define, type Mutable } from "@/internal/define"
import type { Type } from "@/types"

/**
 * A mutable reference container that holds a value of type A.
 * This provides controlled mutability in a functional context.
 *
 * **Variance: invariant in A by design.** Ref is a mutable cell — `set(A)`
 * writes A (contravariant) and `get(): A` reads A (covariant), so A is
 * genuinely invariant. Unlike the other containers in functype, Ref has no
 * `<out A>` annotation and cannot be widened via subtyping. This mirrors
 * Scala's `scala.concurrent.stm.Ref` and reflects the fundamental nature of
 * mutable state: you can't safely treat a `Ref[Narrow]` as a `Ref[Wide]`
 * because someone could `set` a Wide value that isn't a Narrow.
 *
 * @example
 * const counter = Ref(0)
 * counter.get() // 0
 * counter.set(5)
 * counter.get() // 5
 * counter.update(n => n + 1)
 * counter.get() // 6
 *
 * Its methods are shared, so call them on the Ref: `const { get } = ref` loses `this`, and the
 * detached call throws a `TypeError`. Pass `() => ref.get()` instead.
 */
export interface Ref<A> {
  readonly _tag: "Ref"

  /**
   * Get the current value
   */
  get(): A

  /**
   * Set a new value
   */
  set(value: A): void

  /**
   * Update the value using a function
   */
  update(f: (current: A) => A): void

  /**
   * Update and return the old value
   */
  getAndSet(value: A): A

  /**
   * Update and return the new value
   */
  updateAndGet(f: (current: A) => A): A

  /**
   * Update and return the old value
   */
  getAndUpdate(f: (current: A) => A): A

  /**
   * Compare and swap - only updates if current value equals expected
   */
  compareAndSet(expected: A, newValue: A): boolean

  /**
   * Modify the value and return a result
   */
  modify<B>(f: (current: A) => [A, B]): B
}

/**
 * A Ref's own data: its tag and its current value, which `set` and the updates replace. The Ref
 * isn't frozen, since it changes in place. `value` isn't on {@link Ref}, so code outside reads it
 * through `get`. @internal
 */
interface RefOf<A> extends Ref<A> {
  value: A
}

/* eslint-disable functional/immutable-data -- a Ref is a mutable cell; its methods write its value */

/**
 * Every Ref shares these methods (#276 §14). They used to be closures over a `let`, so each Ref
 * built eight functions, and test matchers saw any two Refs as equal.
 */
const RefProto = define<RefOf<Hole>, "_tag" | "value">()("Ref", {
  get() {
    return this.value
  },

  set(value) {
    this.value = value
  },

  update(f) {
    this.value = f(this.value)
  },

  getAndSet(value) {
    const old = this.value
    this.value = value
    return old
  },

  updateAndGet(f) {
    this.value = f(this.value)
    return this.value
  },

  getAndUpdate(f) {
    const old = this.value
    this.value = f(this.value)
    return old
  },

  compareAndSet(expected, newValue) {
    if (this.value === expected) {
      this.value = newValue
      return true
    }
    return false
  },

  modify(f) {
    const [newValue, result] = f(this.value)
    this.value = newValue
    return result
  },
})

/**
 * Creates a new mutable reference containing the given value
 */
const RefConstructor = <A extends Type>(initial: A): Ref<A> => {
  // The one cast: a prototype checked at the opaque Hole works for every A.
  const ref = Object.create(RefProto) as Mutable<RefOf<A>>
  ref._tag = "Ref"
  ref.value = initial
  return ref
}

/* eslint-enable functional/immutable-data */

const RefCompanion = {
  /**
   * Creates a Ref. Alias for Ref constructor.
   * @param initial - The initial value
   * @returns Ref instance
   */
  of: <A extends Type>(initial: A) => RefConstructor(initial),
}

export const Ref = Companion(RefConstructor, RefCompanion)
