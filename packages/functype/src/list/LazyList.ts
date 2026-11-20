import { Companion } from "@/companion/Companion"
import type { Foldable } from "@/foldable/Foldable"
import { type A, define, type Mutable } from "@/internal/define"
import { Counter } from "@/internal/mutation-utils"
import { Option } from "@/option"
import type { Pipe } from "@/pipe"
import { Ref } from "@/ref/Ref"
import type { Serializable } from "@/serializable/Serializable"
import { createSerializer } from "@/serialization"
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
export interface LazyList<out A extends Type>
  extends Foldable<A>, Pipe<LazyList<A>>, Serializable<LazyList<A>>, Typeable<"LazyList"> {
  readonly [Symbol.toStringTag]: string
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
  /** Concatenate with another lazy list, possibly widening (Scala: `++[B >: A]`). */
  concat<B extends Type>(other: LazyList<B>): LazyList<A | B>
  zip<B extends Type>(other: LazyList<B>): LazyList<[A, B]>

  takeRight(n: number): LazyList<A>
  reverse(): LazyList<A>
  distinct(): LazyList<A>
  zipWithIndex(): LazyList<[A, number]>

  // Element access. Methods, because last, lastOption and init read the whole source
  head(): A | undefined
  headOption(): Option<A>
  last(): A | undefined
  lastOption(): Option<A>
  tail(): LazyList<A>
  init(): LazyList<A>

  // Foldable
  fold<B>(initial: B, fn: (acc: B, a: A) => B): B

  // Terminal operations (force evaluation)
  toList(): List<A>
  toArray(): A[]
  forEach(f: (a: A) => void): void
  reduce<B extends Type>(f: (acc: B, a: A) => B, initial: B): B
  find(predicate: (a: A) => boolean): Option<A>
  some(predicate: (a: A) => boolean): boolean
  every(predicate: (a: A) => boolean): boolean
  count(): number

  // Additional methods for clarity
  toString(): string
}

/**
 * A LazyList's own data: its tag and the iterable it reads, which it never pulls from until asked.
 * @internal
 */
interface LazyListOf<out A extends Type> extends LazyList<A> {
  readonly source: Iterable<A>
}

/* eslint-disable functional/immutable-data -- wrap fills in the LazyList it just created */

/**
 * Every LazyList shares these methods (#276 §14). `this.source` is the iterable it reads. The lazy
 * operations read it inside a generator, which has its own `this`, so each takes `source` first.
 */
const LazyListProto = define<LazyListOf<A>, "_tag" | "source">()("LazyList", {
  [Symbol.toStringTag]: "LazyList",

  [Symbol.iterator]() {
    return this.source[Symbol.iterator]()
  },

  head() {
    const next = this.source[Symbol.iterator]().next()
    return next.done ? undefined : next.value
  },

  headOption() {
    const next = this.source[Symbol.iterator]().next()
    return next.done ? Option.none<A>() : Option(next.value)
  },

  last() {
    let lastValue: A | undefined = undefined
    for (const item of this.source) {
      lastValue = item
    }
    return lastValue
  },

  lastOption() {
    const lastValue = Ref<A | undefined>(undefined)
    const hasValue = Ref(false)
    for (const item of this.source) {
      lastValue.set(item)
      hasValue.set(true)
    }
    return hasValue.get() ? Option(lastValue.get()) : Option.none<A>()
  },

  tail() {
    const { source } = this
    return wrap(
      (function* () {
        const iter = source[Symbol.iterator]()
        iter.next() // skip first
        let next = iter.next()
        while (!next.done) {
          yield next.value
          next = iter.next()
        }
      })(),
    )
  },

  init() {
    const arr = Array.from(this.source)
    return wrap(arr.length === 0 ? [] : arr.slice(0, -1))
  },

  map<B extends Type>(f: (a: A) => B): LazyList<B> {
    const { source } = this
    return wrap(
      (function* () {
        for (const item of source) {
          yield f(item)
        }
      })(),
    )
  },

  flatMap<B extends Type>(f: (a: A) => LazyList<B>): LazyList<B> {
    const { source } = this
    return wrap(
      (function* () {
        for (const item of source) {
          yield* f(item)
        }
      })(),
    )
  },

  filter(predicate) {
    const { source } = this
    return wrap(
      (function* () {
        for (const item of source) {
          if (predicate(item)) {
            yield item
          }
        }
      })(),
    )
  },

  take(n) {
    const { source } = this
    return wrap(
      (function* () {
        const counter = Counter(0)
        for (const item of source) {
          // `!(count < n)` stops at once for NaN, as List.take does.
          if (!(counter.get() < n)) break
          yield item
          counter.increment()
        }
      })(),
    )
  },

  drop(n) {
    const { source } = this
    return wrap(
      (function* () {
        const counter = Counter(0)
        for (const item of source) {
          if (counter.get() >= n) {
            yield item
          }
          counter.increment()
        }
      })(),
    )
  },

  takeWhile(predicate) {
    const { source } = this
    return wrap(
      (function* () {
        for (const item of source) {
          if (!predicate(item)) break
          yield item
        }
      })(),
    )
  },

  dropWhile(predicate) {
    const { source } = this
    return wrap(
      (function* () {
        const dropping = Ref(true)
        for (const item of source) {
          if (dropping.get() && predicate(item)) continue
          dropping.set(false)
          yield item
        }
      })(),
    )
  },

  concat<B extends Type>(other: LazyList<B>): LazyList<A | B> {
    const { source } = this
    return wrap<A | B>(
      (function* () {
        yield* source
        yield* other
      })(),
    )
  },

  zip<B extends Type>(other: LazyList<B>): LazyList<[A, B]> {
    const { source } = this
    return wrap(
      (function* () {
        const iter1 = source[Symbol.iterator]()
        const iter2 = other[Symbol.iterator]()

        while (true) {
          const next1 = iter1.next()
          const next2 = iter2.next()

          if (next1.done || next2.done) break
          yield [next1.value, next2.value] as [A, B]
        }
      })(),
    )
  },

  // Terminal operations
  toList() {
    return List(Array.from(this.source))
  },

  toArray() {
    return Array.from(this.source)
  },

  forEach(f) {
    for (const item of this.source) {
      f(item)
    }
  },

  reduce<B extends Type>(f: (acc: B, a: A) => B, initial: B): B {
    const acc = Ref(initial)
    for (const item of this.source) {
      acc.set(f(acc.get(), item))
    }
    return acc.get()
  },

  find(predicate) {
    for (const item of this.source) {
      if (predicate(item)) {
        return Option(item)
      }
    }
    return Option.none<A>()
  },

  some(predicate) {
    for (const item of this.source) {
      if (predicate(item)) return true
    }
    return false
  },

  every(predicate) {
    for (const item of this.source) {
      if (!predicate(item)) return false
    }
    return true
  },

  count() {
    const counter = Counter(0)

    for (const _ of this.source) {
      counter.increment()
    }
    return counter.get()
  },

  takeRight(n) {
    const arr = Array.from(this.source)
    // `!(n > 0)` also catches NaN, which `take` already treats as 0.
    return wrap(!(n > 0) ? [] : arr.slice(-n))
  },

  reverse() {
    return wrap(Array.from(this.source).reverse())
  },

  distinct() {
    const { source } = this
    return wrap(
      (function* () {
        const seen = new globalThis.Set<A>()
        for (const item of source) {
          if (!seen.has(item)) {
            seen.add(item)
            yield item
          }
        }
      })(),
    )
  },

  zipWithIndex() {
    const { source } = this
    return wrap(
      (function* () {
        const counter = Counter(0)
        for (const item of source) {
          yield [item, counter.get()] as [A, number]
          counter.increment()
        }
      })(),
    )
  },

  // Foldable implementation
  fold(initial, fn) {
    let acc = initial
    for (const item of this.source) {
      acc = fn(acc, item)
    }
    return acc
  },

  foldLeft(z) {
    return (op) => {
      const acc = Ref(z)
      for (const item of this.source) {
        acc.set(op(acc.get(), item))
      }
      return acc.get()
    }
  },

  foldRight(z) {
    // For lazy list, we need to materialize to fold right
    return (op) => Array.from(this.source).reduceRight((acc, value) => op(value, acc), z)
  },

  // Pipe implementation
  pipe(f) {
    return f(this)
  },

  // Serializable implementation. Materializes the lazy stream into an array before stringifying:
  // there's no other way to serialize a potentially-infinite iterable.
  serialize() {
    return createSerializer("LazyList", Array.from(this.source))
  },

  toJSON() {
    return { "@functype": "LazyList" as const, _tag: "LazyList" as const, value: Array.from(this.source) }
  },

  // Override toString from Base to show elements (limited for infinite lists)
  toString() {
    const maxShow = 10
    const elements: A[] = []
    const counter = Counter(0)
    const hasMore = Ref(false)

    for (const item of this.source) {
      if (counter.get() < maxShow) {
        elements.push(item)
        counter.increment()
      } else {
        hasMore.set(true)
        break
      }
    }

    const elemStr = elements.map((e) => String(e)).join(", ")
    return hasMore.get() ? `LazyList(${elemStr}, ...)` : `LazyList(${elemStr})`
  },
})

/** Builds a LazyList that reads `source`. Frozen, as collections have been since 1.27.0 (#276 §14 Rules). */
const wrap = <A extends Type>(source: Iterable<A>): LazyList<A> => {
  // The one cast: a prototype checked at the opaque A works for every A.
  const lazyList = Object.create(LazyListProto) as Mutable<LazyListOf<A>>
  lazyList._tag = "LazyList"
  lazyList.source = source
  return Object.freeze(lazyList)
}

/* eslint-enable functional/immutable-data */

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
  return wrap(iterable)
}

const LazyListCompanion = {
  /**
   * Create an empty LazyList
   * @example
   * const empty = LazyList.empty<number>()
   * empty.toArray() // []
   */
  empty: <A extends Type>(): LazyList<A> => {
    return wrap<A>([])
  },

  /**
   * Create a LazyList from values (one or more)
   * @example
   * const single = LazyList.of(42)
   *   .map(x => x * 2)
   *   .toArray() // [84]
   * LazyList.of(1, 2, 3).toArray() // [1, 2, 3], same as LazyList.from(1, 2, 3)
   */
  of: <A extends Type>(...values: A[]): LazyList<A> => {
    return wrap(values)
  },

  /**
   * Create a LazyList from multiple values
   */
  from: <A extends Type>(...values: A[]): LazyList<A> => {
    return wrap(values)
  },

  /**
   * Reconstruct a LazyList from a JSON envelope emitted by `serialize().toJSON()`
   * or instance `toJSON()`. Verifies `@functype === "LazyList"` when the marker
   * is present (canonical from 1.2.0). The materialized array becomes the new
   * LazyList's backing — laziness can't survive JSON serialization.
   */
  fromJSON: <A extends Type>(json: string): LazyList<A> => {
    const parsed = JSON.parse(json) as { "@functype"?: string; _tag?: string; value: A[] }
    if (parsed["@functype"] !== undefined && parsed["@functype"] !== "LazyList") {
      throw new Error(`LazyList.fromJSON: expected @functype="LazyList", got ${JSON.stringify(parsed["@functype"])}`)
    }
    return wrap(parsed.value)
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
    return wrap(
      (function* () {
        const current = Ref(initial)
        while (true) {
          yield current.get()
          current.set(f(current.get()))
        }
      })(),
    )
  },

  /**
   * Create an infinite LazyList by repeatedly calling a function
   */
  generate: <A extends Type>(f: () => A): LazyList<A> => {
    return wrap(
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
    return wrap(
      (function* () {
        if (step === 0) throw new Error("Step cannot be zero")

        const current = Ref(start)
        if (step > 0) {
          while (current.get() < end) {
            yield current.get()
            current.set(current.get() + step)
          }
        } else {
          while (current.get() > end) {
            yield current.get()
            current.set(current.get() + step)
          }
        }
      })(),
    )
  },

  /**
   * Create a LazyList that repeats a value n times (or infinitely if n is not provided)
   */
  repeat: <A extends Type>(value: A, n?: number): LazyList<A> => {
    return wrap(
      (function* () {
        if (n === undefined) {
          while (true) yield value
        } else {
          const counter = Counter(0)
          while (counter.get() < n) {
            yield value
            counter.increment()
          }
        }
      })(),
    )
  },

  /**
   * Create a LazyList that cycles through an iterable infinitely
   */
  cycle: <A extends Type>(iterable: Iterable<A>): LazyList<A> => {
    return wrap(
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
