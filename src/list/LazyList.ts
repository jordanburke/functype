import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import type { Foldable } from "@/foldable/Foldable"
import { Option } from "@/option"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import type { Typeable } from "@/typeable/Typeable"
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
export interface LazyList<A extends Type>
  extends Foldable<A>,
    Pipe<LazyList<A>>,
    Serializable<LazyList<A>>,
    Typeable<"LazyList"> {
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

  // Additional methods for clarity
  toString(): string
}

const LazyListObject = <A extends Type>(iterable: Iterable<A>): LazyList<A> => {
  const lazyList: LazyList<A> = {
    _tag: "LazyList" as const,
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

    // Foldable implementation
    fold: <B extends Type>(onEmpty: () => B, onValue: (value: A) => B): B => {
      const iter = iterable[Symbol.iterator]()
      const next = iter.next()
      return next.done ? onEmpty() : onValue(next.value)
    },

    foldLeft:
      <B extends Type>(z: B) =>
      (op: (b: B, a: A) => B) => {
        let acc = z
        for (const item of iterable) {
          acc = op(acc, item)
        }
        return acc
      },

    foldRight:
      <B extends Type>(z: B) =>
      (op: (a: A, b: B) => B) => {
        // For lazy list, we need to materialize to fold right
        const arr = Array.from(iterable)
        return arr.reduceRight((acc, value) => op(value, acc), z)
      },

    // Pipe implementation
    pipe: <U extends Type>(f: (value: LazyList<A>) => U): U => f(lazyList),

    // Serializable implementation
    serialize: () => {
      // For serialization, we need to materialize the lazy list
      const array = Array.from(iterable)
      return {
        toJSON: () => JSON.stringify({ _tag: "LazyList", value: array }),
        toYAML: () => `_tag: LazyList\nvalue: ${stringify(array)}`,
        toBinary: () => Buffer.from(JSON.stringify({ _tag: "LazyList", value: array })).toString("base64"),
      }
    },

    // Override toString from Base to show elements (limited for infinite lists)
    toString: () => {
      const maxShow = 10
      const elements: A[] = []
      let count = 0
      let hasMore = false

      for (const item of iterable) {
        if (count < maxShow) {
          elements.push(item)
          count++
        } else {
          hasMore = true
          break
        }
      }

      const elemStr = elements.map((e) => String(e)).join(", ")
      return hasMore ? `LazyList(${elemStr}, ...)` : `LazyList(${elemStr})`
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
