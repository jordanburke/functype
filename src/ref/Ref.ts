import { Companion } from "@/companion/Companion"
import type { Type } from "@/types"

/**
 * A mutable reference container that holds a value of type A.
 * This provides controlled mutability in a functional context.
 *
 * @example
 * const counter = Ref(0)
 * counter.get() // 0
 * counter.set(5)
 * counter.get() // 5
 * counter.update(n => n + 1)
 * counter.get() // 6
 */
export interface Ref<A> {
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
 * Creates a new mutable reference containing the given value
 */
const RefConstructor = <A extends Type>(initial: A): Ref<A> => {
  let _value = initial

  const ref: Ref<A> = {
    get(): A {
      return _value
    },

    set(value: A): void {
      _value = value
    },

    update(f: (current: A) => A): void {
      _value = f(_value)
    },

    getAndSet(value: A): A {
      const old = _value
      _value = value
      return old
    },

    updateAndGet(f: (current: A) => A): A {
      _value = f(_value)
      return _value
    },

    getAndUpdate(f: (current: A) => A): A {
      const old = _value
      _value = f(_value)
      return old
    },

    compareAndSet(expected: A, newValue: A): boolean {
      if (_value === expected) {
        _value = newValue
        return true
      }
      return false
    },

    modify<B>(f: (current: A) => [A, B]): B {
      const [newValue, result] = f(_value)
      _value = newValue
      return result
    },
  }

  return ref
}

const RefCompanion = {
  /**
   * Creates a Ref. Alias for Ref constructor.
   * @param initial - The initial value
   * @returns Ref instance
   */
  of: <A extends Type>(initial: A) => RefConstructor(initial),
}

export const Ref = Companion(RefConstructor, RefCompanion)
