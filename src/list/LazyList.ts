import { Companion } from "@/companion/Companion"
import { Option } from "@/option"
import type { Type } from "@/types"

import { List } from "./List"

/**
 * LazyList provides lazy evaluation for list operations.
 * Operations are deferred until the list is materialized.
 *
 * @example
 * // Basic lazy evaluation
 * const result = LazyList([1, 2, 3, 4, 5])
 *   .map(x => x * 2)
 *   .filter(x => x > 5)
 *   .toArray() // [6, 8, 10]
 *
 * @example
 * // Infinite sequences with take
 * const fibonacci = LazyList.iterate([0, 1], ([a, b]) => [b, a + b])
 *   .map(([a]) => a)
 *   .take(10)
 *   .toArray() // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
 */
export type LazyList<A extends Type> = {
  // Iterator protocol
  [Symbol.iterator](): Iterator<A>

  // Lazy operations
  map<B extends Type>(f: (a: A) => B): LazyList<B>
  flatMap<B extends Type>(f: (a: A) => LazyList<B>): LazyList<B>
  filter(predicate: (a: A) => boolean): LazyList<A>
  take(n: number): LazyList<A>
  drop(n: number): LazyList<A>
  takeWhile(predicate: (a: A) => boolean): LazyList<A>
  dropWhile(predicate: (a: A) => boolean): LazyList<A>
  concat(other: LazyList<A>): LazyList<A>
  zip<B extends Type>(other: LazyList<B>): LazyList<[A, B]>

  // Terminal operations (force evaluation)
  toList(): List<A>
  toArray(): A[]
  forEach(f: (a: A) => void): void
  reduce<B extends Type>(f: (acc: B, a: A) => B, initial: B): B
  find(predicate: (a: A) => boolean): Option<A>
  some(predicate: (a: A) => boolean): boolean
  every(predicate: (a: A) => boolean): boolean
  count(): number
  first(): Option<A>
  last(): Option<A>
}

const LazyListObject = <A extends Type>(iterable: Iterable<A>): LazyList<A> => {
  const lazyList: LazyList<A> = {
    [Symbol.iterator]: () => iterable[Symbol.iterator](),

    map: <B extends Type>(f: (a: A) => B) =>
      LazyListObject(
        (function* () {
          for (const item of iterable) {
            yield f(item)
          }
        })(),
      ),

    flatMap: <B extends Type>(f: (a: A) => LazyList<B>) =>
      LazyListObject(
        (function* () {
          for (const item of iterable) {
            yield* f(item)
          }
        })(),
      ),

    filter: (predicate: (a: A) => boolean) =>
      LazyListObject(
        (function* () {
          for (const item of iterable) {
            if (predicate(item)) {
              yield item
            }
          }
        })(),
      ),

    take: (n: number) =>
      LazyListObject(
        (function* () {
          let count = 0
          for (const item of iterable) {
            if (count >= n) break
            yield item
            count++
          }
        })(),
      ),

    drop: (n: number) =>
      LazyListObject(
        (function* () {
          let count = 0
          for (const item of iterable) {
            if (count >= n) {
              yield item
            }
            count++
          }
        })(),
      ),

    takeWhile: (predicate: (a: A) => boolean) =>
      LazyListObject(
        (function* () {
          for (const item of iterable) {
            if (!predicate(item)) break
            yield item
          }
        })(),
      ),

    dropWhile: (predicate: (a: A) => boolean) =>
      LazyListObject(
        (function* () {
          let dropping = true
          for (const item of iterable) {
            if (dropping && predicate(item)) continue
            dropping = false
            yield item
          }
        })(),
      ),

    concat: (other: LazyList<A>) =>
      LazyListObject(
        (function* () {
          yield* iterable
          yield* other
        })(),
      ),

    zip: <B extends Type>(other: LazyList<B>) =>
      LazyListObject(
        (function* () {
          const iter1 = iterable[Symbol.iterator]()
          const iter2 = other[Symbol.iterator]()

          while (true) {
            const next1 = iter1.next()
            const next2 = iter2.next()

            if (next1.done || next2.done) break
            yield [next1.value, next2.value] as [A, B]
          }
        })(),
      ),

    // Terminal operations
    toList: () => List(Array.from(iterable)),

    toArray: () => Array.from(iterable),

    forEach: (f: (a: A) => void) => {
      for (const item of iterable) {
        f(item)
      }
    },

    reduce: <B extends Type>(f: (acc: B, a: A) => B, initial: B) => {
      let acc = initial
      for (const item of iterable) {
        acc = f(acc, item)
      }
      return acc
    },

    find: (predicate: (a: A) => boolean) => {
      for (const item of iterable) {
        if (predicate(item)) {
          return Option(item)
        }
      }
      return Option.none()
    },

    some: (predicate: (a: A) => boolean) => {
      for (const item of iterable) {
        if (predicate(item)) return true
      }
      return false
    },

    every: (predicate: (a: A) => boolean) => {
      for (const item of iterable) {
        if (!predicate(item)) return false
      }
      return true
    },

    count: () => {
      let count = 0
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of iterable) {
        count++
      }
      return count
    },

    first: () => {
      const iter = iterable[Symbol.iterator]()
      const next = iter.next()
      return next.done ? Option.none() : Option(next.value)
    },

    last: () => {
      let last: A | undefined
      let hasValue = false
      for (const item of iterable) {
        last = item
        hasValue = true
      }
      return hasValue ? Option(last as A) : Option.none()
    },
  }

  return lazyList
}

/**
 * Create a LazyList from an iterable
 * @example
 * const lazy = LazyList([1, 2, 3, 4, 5])
 *   .map(x => x * x)
 *   .filter(x => x % 2 === 1)
 *   .toArray() // [1, 9, 25]
 *
 * @example
 * // From generator function
 * function* naturals() {
 *   let n = 1
 *   while (true) yield n++
 * }
 * const firstTenSquares = LazyList(naturals())
 *   .map(x => x * x)
 *   .take(10)
 *   .toArray() // [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
 */
const LazyListConstructor = <A extends Type>(iterable: Iterable<A>): LazyList<A> => {
  return LazyListObject(iterable)
}

const LazyListCompanion = {
  /**
   * Create an empty LazyList
   * @example
   * const empty = LazyList.empty<number>()
   * empty.toArray() // []
   */
  empty: <A extends Type>(): LazyList<A> => {
    return LazyListObject<A>([])
  },

  /**
   * Create a LazyList from a single value
   * @example
   * const single = LazyList.of(42)
   *   .map(x => x * 2)
   *   .toArray() // [84]
   */
  of: <A extends Type>(value: A): LazyList<A> => {
    return LazyListObject([value])
  },

  /**
   * Create a LazyList from multiple values
   */
  from: <A extends Type>(...values: A[]): LazyList<A> => {
    return LazyListObject(values)
  },

  /**
   * Create an infinite LazyList by repeatedly applying a function
   * @example
   * // Powers of 2
   * const powers = LazyList.iterate(1, x => x * 2)
   *   .take(10)
   *   .toArray() // [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]
   *
   * @example
   * // Fibonacci sequence
   * const fib = LazyList.iterate([0, 1], ([a, b]) => [b, a + b])
   *   .map(([a]) => a)
   *   .take(8)
   *   .toArray() // [0, 1, 1, 2, 3, 5, 8, 13]
   */
  iterate: <A extends Type>(initial: A, f: (a: A) => A): LazyList<A> => {
    return LazyListObject(
      (function* () {
        let current = initial
        while (true) {
          yield current
          current = f(current)
        }
      })(),
    )
  },

  /**
   * Create an infinite LazyList by repeatedly calling a function
   */
  generate: <A extends Type>(f: () => A): LazyList<A> => {
    return LazyListObject(
      (function* () {
        while (true) {
          yield f()
        }
      })(),
    )
  },

  /**
   * Create a LazyList of numbers from start to end (exclusive)
   * @example
   * LazyList.range(1, 6).toArray() // [1, 2, 3, 4, 5]
   * LazyList.range(0, 10, 2).toArray() // [0, 2, 4, 6, 8]
   * LazyList.range(10, 0, -1).toArray() // [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
   *
   * @example
   * // Sum of squares from 1 to 100
   * const sum = LazyList.range(1, 101)
   *   .map(x => x * x)
   *   .reduce((a, b) => a + b, 0) // 338350
   */
  range: (start: number, end: number, step = 1): LazyList<number> => {
    return LazyListObject(
      (function* () {
        if (step === 0) throw new Error("Step cannot be zero")

        if (step > 0) {
          for (let i = start; i < end; i += step) {
            yield i
          }
        } else {
          for (let i = start; i > end; i += step) {
            yield i
          }
        }
      })(),
    )
  },

  /**
   * Create a LazyList that repeats a value n times (or infinitely if n is not provided)
   */
  repeat: <A extends Type>(value: A, n?: number): LazyList<A> => {
    return LazyListObject(
      (function* () {
        if (n === undefined) {
          while (true) yield value
        } else {
          for (let i = 0; i < n; i++) {
            yield value
          }
        }
      })(),
    )
  },

  /**
   * Create a LazyList that cycles through an iterable infinitely
   */
  cycle: <A extends Type>(iterable: Iterable<A>): LazyList<A> => {
    return LazyListObject(
      (function* () {
        const items = Array.from(iterable)
        if (items.length === 0) return

        while (true) {
          yield* items
        }
      })(),
    )
  },
}

/**
 * Lazy list implementation for efficient deferred computation
 * @example
 * // Process large datasets efficiently
 * const result = LazyList.range(1, 1000000)
 *   .filter(x => x % 2 === 0)
 *   .map(x => x * x)
 *   .take(5)
 *   .toArray() // [4, 16, 36, 64, 100]
 *
 * @example
 * // Infinite sequences
 * const primes = LazyList.iterate(2, n => n + 1)
 *   .filter(isPrime)
 *   .take(10)
 *   .toArray() // First 10 prime numbers
 *
 * @example
 * // Combining operations
 * const evens = LazyList.range(0, 100, 2)
 * const odds = LazyList.range(1, 100, 2)
 * const combined = evens.zip(odds)
 *   .map(([e, o]) => e + o)
 *   .take(5)
 *   .toArray() // [1, 5, 9, 13, 17]
 */
export const LazyList = Companion(LazyListConstructor, LazyListCompanion)
