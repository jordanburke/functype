/**
 * Centralized mutation utilities using Ref for controlled impurity
 *
 * These utilities provide approved patterns for mutation in functype,
 * keeping impure operations explicit and contained.
 */

import { Ref } from "@/ref/Ref"
import type { Type } from "@/types"

/**
 * Counter utility for managing incrementing/decrementing numbers
 *
 * @example
 * const attempts = Counter(0)
 * attempts.increment() // returns 1
 * attempts.get() // 1
 * attempts.decrement() // returns 0
 */
export interface Counter {
  get(): number
  set(value: number): void
  increment(): number
  decrement(): number
  reset(): void
  compareAndSet(expected: number, newValue: number): boolean
}

export const Counter = (initial: number = 0): Counter => {
  const ref = Ref(initial)
  const initialValue = initial

  return {
    get: () => ref.get(),
    set: (value: number) => ref.set(value),
    increment: () => ref.updateAndGet((n) => n + 1),
    decrement: () => ref.updateAndGet((n) => n - 1),
    reset: () => ref.set(initialValue),
    compareAndSet: (expected: number, newValue: number) => ref.compareAndSet(expected, newValue),
  }
}

/**
 * Cache utility for managing optional cached values
 *
 * @example
 * const cache = Cache<string>()
 * if (!cache.has()) {
 *   cache.set(expensiveComputation())
 * }
 * return cache.get() // string | undefined
 */
export interface Cache<T extends Type> {
  get(): T | undefined
  set(value: T): void
  has(): boolean
  clear(): void
  getOrCompute(compute: () => T): T
}

export const Cache = <T extends Type>(initial?: T): Cache<T> => {
  const ref = Ref<T | undefined>(initial)

  return {
    get: () => ref.get(),
    set: (value: T) => ref.set(value),
    has: () => ref.get() !== undefined,
    clear: () => ref.set(undefined),
    getOrCompute: (compute: () => T): T => {
      const cached = ref.get()
      if (cached !== undefined) {
        return cached
      }
      const computed = compute()
      ref.set(computed)
      return computed
    },
  }
}

/**
 * Builder utility for incrementally constructing arrays
 *
 * @example
 * const builder = ArrayBuilder<string>()
 * builder.add("hello")
 * builder.add("world")
 * const result = builder.build() // ["hello", "world"]
 */
export interface ArrayBuilder<T extends Type> {
  add(item: T): void
  addAll(items: T[]): void
  build(): T[]
  clear(): void
  size(): number
}

export const ArrayBuilder = <T extends Type>(): ArrayBuilder<T> => {
  const ref = Ref<T[]>([])

  return {
    add: (item: T) => ref.update((arr) => [...arr, item]),
    addAll: (items: T[]) => ref.update((arr) => [...arr, ...items]),
    build: () => ref.get(),
    clear: () => ref.set([]),
    size: () => ref.get().length,
  }
}

/**
 * ObjectBuilder utility for incrementally constructing objects
 *
 * @example
 * const builder = ObjectBuilder<{name: string, age: number}>()
 * builder.set('name', 'John')
 * builder.set('age', 30)
 * const result = builder.build() // {name: 'John', age: 30}
 */
export interface ObjectBuilder<T extends Record<string, Type>> {
  set<K extends keyof T>(key: K, value: T[K]): void
  get<K extends keyof T>(key: K): T[K] | undefined
  has<K extends keyof T>(key: K): boolean
  build(): Partial<T>
  clear(): void
}

export const ObjectBuilder = <T extends Record<string, Type>>(): ObjectBuilder<T> => {
  const ref = Ref<Partial<T>>({})

  return {
    set: <K extends keyof T>(key: K, value: T[K]) => {
      ref.update((obj) => ({ ...obj, [key]: value }))
    },
    get: <K extends keyof T>(key: K): T[K] | undefined => {
      return ref.get()[key]
    },
    has: <K extends keyof T>(key: K): boolean => {
      return key in ref.get()
    },
    build: () => ref.get(),
    clear: () => ref.set({}),
  }
}
