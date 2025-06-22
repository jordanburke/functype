import { Companion } from "@/companion/Companion"
import { Option } from "@/option"
import type { Type } from "@/types"

import { List } from "./List"

/**
 * LazyList provides lazy evaluation for list operations.
 * Operations are deferred until the list is materialized.
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
 */
const LazyListConstructor = <A extends Type>(iterable: Iterable<A>): LazyList<A> => {
  return LazyListObject(iterable)
}

const LazyListCompanion = {
  /**
   * Create an empty LazyList
   */
  empty: <A extends Type>(): LazyList<A> => {
    return LazyListObject<A>([])
  },

  /**
   * Create a LazyList from a single value
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

export const LazyList = Companion(LazyListConstructor, LazyListCompanion)
