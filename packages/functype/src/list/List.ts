import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import { type Either, Left, Right } from "@/either"
import type { FunctypeCollection } from "@/functype"
import { base64ToUtf8 } from "@/internal/base64"
import { type ConcurrencyOptions, traverseWithConcurrency } from "@/internal/concurrency"
import { type A, define, type Mutable } from "@/internal/define"
import { safeStringify } from "@/internal/stringify"
import { None, Option } from "@/option/Option"
import type { Reshapeable } from "@/reshapeable"
import { createSerializer, expectMarker, type ParsedEnvelope } from "@/serialization"
import { Set } from "@/set/Set"
import { Try } from "@/try"
import type { Typeable } from "@/typeable/Typeable"
import { type ExtractTag, isTypeable } from "@/typeable/Typeable"
import { type Flattened, reduceRightWiden, reduceWiden, type Widen } from "@/typeclass"
import type { Type } from "@/types"

/** An array or another non-string iterable: what `flatten` spreads. */
const isSpreadable = <B>(item: unknown): item is Iterable<B> =>
  Array.isArray(item) || (typeof item === "object" && item !== null && Symbol.iterator in item)

/**
 * Immutable List. Covariant in A (`<out A>`) — mirrors Scala's `List[+A]`.
 *
 * Methods that would otherwise force A-invariance use TS equivalents of Scala's
 * co-variance patterns:
 *   - query/removal ops (`contains`, `indexOf`, `remove`) take `unknown`, matching
 *     Scala's `-(elem: Any)` / `contains(elem: Any)` — if the value can't possibly
 *     be in the list, it's a no-op, not a type error.
 *   - additive ops (`add`, `prepend`, `concat`) widen the element type, matching
 *     Scala's `::[B >: A]` / `++[B >: A]` — `List<A> + B` produces `List<A | B>`.
 *   - `reduce` / `reduceRight` accept a wider accumulator type, matching Scala's
 *     `reduce[B >: A]`.
 */
export interface List<out A> extends FunctypeCollection<A, "List">, Doable<A>, Reshapeable<A> {
  readonly length: number
  [Symbol.iterator](): Iterator<A>
  // Override these to return List instead of FunctypeCollection
  map<B>(f: (a: A) => B): List<B>
  ap<B>(ff: List<(value: A) => B>): List<B>
  flatMap<B>(f: (a: A) => Iterable<B>): List<B>
  /** Async flatMap. Starts every call at once unless `options.concurrency` caps it; `{ concurrency: 1 }` runs them in order. */
  flatMapAsync<B>(f: (a: A) => PromiseLike<Iterable<B>>, options?: ConcurrencyOptions): PromiseLike<List<B>>
  /**
   * Async map: awaits `f` for each element and keeps the results in input order.
   *
   * Runs one call at a time by default, which is what replacing a loop that awaits needs. Pass
   * `{ concurrency: n }` to allow up to `n` calls at once, or `"unbounded"` to start them all together.
   * (`flatMapAsync` defaults to `"unbounded"`; it keeps that default so existing callers don't change.)
   * A rejection rejects the result, and no further calls start.
   *
   * @example
   * ```typescript
   * const users = await List(ids).mapAsync(fetchUser)                       // in order, one at a time
   * const pages = await List(urls).mapAsync(fetchPage, { concurrency: 4 })  // up to 4 at once
   * ```
   */
  mapAsync<B>(f: (a: A) => PromiseLike<B>, options?: ConcurrencyOptions): Promise<List<B>>
  // Override filter for type guard support
  filter<S extends A>(predicate: (a: A) => a is S): List<S>
  filter(predicate: (a: A) => unknown): List<A>
  filterNot(p: (a: A) => boolean): List<A>
  // List-specific methods
  /** @internal */
  filterType<T extends Typeable<string, unknown>>(tag: string): List<T & A>
  /** Remove a value. Accepts `unknown` so an unrelated-type arg is a safe no-op (Scala: `-(elem: Any)`). */
  remove(value: unknown): List<A>
  removeAt(index: number): List<A>
  /** Add a value, possibly widening the element type (Scala: `:+[B >: A]`). */
  add<B>(item: B): List<A | B>
  get(index: number): Option<A>
  /** Concatenate with another list, possibly widening (Scala: `++[B >: A]`). */
  concat<B>(other: List<B>): List<A | B>
  take(n: number): List<A>
  takeWhile(p: (a: A) => boolean): List<A>
  takeRight(n: number): List<A>
  /** Drop the first `n` elements. `n` of 0 or less drops nothing. */
  drop(n: number): List<A>
  /** Drop the last `n` elements. `n` of 0 or less drops nothing. */
  dropRight(n: number): List<A>
  /** Drop elements while `p` holds. Gives an empty List when every element matches. */
  dropWhile(p: (a: A) => boolean): List<A>
  /**
   * Spread each element that's an array or another non-string iterable (List, Set, ...) into the result,
   * one level deep, keeping other elements, strings included, as they are.
   * @example
   * ```typescript
   * List([[1, 2], [3]]).flatten() // List([1, 2, 3])
   * List([List([1]), List([2])]).flatten() // List([1, 2])
   * ```
   */
  flatten<B = Flattened<A>>(): List<B>
  last(): A | undefined
  lastOption(): Option<A>
  tail(): List<A>
  init(): List<A>
  reverse(): List<A>
  /** Find the index of a value. Accepts `unknown` (Scala: `indexOf(elem: Any)`). */
  indexOf(value: unknown): number
  /** Prepend a value, possibly widening (Scala: `+:[B >: A]`). */
  prepend<B>(item: B): List<A | B>
  distinct(): List<A>
  sorted(compareFn?: (a: A, b: A) => number): List<A>
  sortBy<B>(f: (a: A) => B, compareFn?: (a: B, b: B) => number): List<A>
  zip<B>(other: List<B>): List<[A, B]>
  zipWithIndex(): List<[A, number]>
  groupBy<K>(f: (a: A) => K): globalThis.Map<K, List<A>>
  partition(p: (a: A) => boolean): [List<A>, List<A>]
  span(p: (a: A) => boolean): [List<A>, List<A>]
  slice(start: number, end: number): List<A>
  /**
   * Pattern matches over the List, applying a handler function based on whether it's empty
   * @param patterns - Object with handler functions for Empty and NonEmpty variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Empty: () => R; NonEmpty: (values: A[]) => R }): R
}

/**
 * A List's own data: its tag and the array it wraps. The array is never changed after the List is
 * built, so `size`, `length` and `isEmpty` can't go stale. @internal
 */
interface ListOf<out A> extends List<A> {
  readonly value: readonly A[]
}

/* eslint-disable functional/immutable-data -- methods build fresh arrays, and wrap fills in the List it just created */

/** Every List shares these methods (#276 §14). `this.value` is the List's own array. */
const ListProto = define<ListOf<A>, "_tag" | "value">()("List", {
  [Symbol.toStringTag]: "List",

  get size() {
    return this.value.length
  },

  get length() {
    return this.value.length
  },

  get isEmpty() {
    return this.value.length === 0
  },

  [Symbol.iterator]() {
    return this.value[Symbol.iterator]()
  },

  head() {
    return this.value[0]
  },

  headOption() {
    return Option(this.value[0])
  },

  last() {
    return this.value[this.value.length - 1]
  },

  lastOption() {
    return Option(this.value[this.value.length - 1])
  },

  tail() {
    return wrap(this.value.slice(1))
  },

  init() {
    return wrap(this.value.slice(0, -1))
  },

  map(f) {
    return wrap(this.value.map(f))
  },

  ap(ff) {
    const fs = ff.toArray()
    return wrap(this.value.flatMap((a) => fs.map((f) => f(a))))
  },

  flatMap(f) {
    return wrap(this.value.flatMap((a) => Array.from(f(a))))
  },

  async flatMapAsync(f, options) {
    const results = await traverseWithConcurrency(this.value, f, options?.concurrency ?? "unbounded")
    return wrap(results.flatMap((iterable) => Array.from(iterable)))
  },

  async mapAsync(f, options) {
    return wrap(await traverseWithConcurrency(this.value, f, options?.concurrency ?? 1))
  },

  forEach(f) {
    this.value.forEach(f)
  },

  contains(value) {
    return (this.value as readonly unknown[]).includes(value)
  },

  count(p) {
    return this.value.filter(p).length
  },

  exists(p) {
    return this.value.some(p)
  },

  every(p) {
    return this.value.every(p)
  },

  // Written out: an overloaded member gives no contextual type to its implementation.
  filter<S extends A>(predicate: (a: A) => unknown): List<S> {
    return wrap(this.value.filter(predicate) as S[])
  },

  filterNot(p) {
    return wrap(this.value.filter((x) => !p(x)))
  },

  filterType<T extends Typeable<string, unknown>>(tag: string): List<T & A> {
    return wrap(this.value.filter((x): x is T & A => isTypeable(x, tag)))
  },

  find<T extends A = A>(predicate: (a: A) => boolean, tag?: ExtractTag<T>): Option<A> {
    const result = this.value.find((x) => predicate(x) && (tag ? isTypeable(x, tag) : true))
    return Option(result)
  },

  toArray<B = A>(): B[] {
    return [...this.value] as unknown as B[]
  },

  reduce<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    return reduceWiden<A, Widen<A, B>>(this.value, op)
  },

  reduceRight<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    return reduceRightWiden<A, Widen<A, B>>(this.value, op)
  },

  fold(initial, fn) {
    return this.value.reduce(fn, initial)
  },

  foldLeft(z) {
    return (op) => this.value.reduce(op, z)
  },

  foldRight(z) {
    return (op) => this.value.reduceRight((acc, value) => op(value, acc), z)
  },

  match(patterns) {
    return this.value.length === 0 ? patterns.Empty() : patterns.NonEmpty([...this.value])
  },

  remove(value) {
    return wrap(this.value.filter((x) => x !== value))
  },

  removeAt(index) {
    return index < 0 || index >= this.value.length
      ? this
      : wrap([...this.value.slice(0, index), ...this.value.slice(index + 1)])
  },

  add<B>(item: B): List<A | B> {
    return wrap<A | B>([...this.value, item])
  },

  get(index) {
    return Option(this.value[index])
  },

  concat<B>(other: List<B>): List<A | B> {
    return wrap<A | B>([...this.value, ...other.toArray()])
  },

  take(n) {
    return wrap(this.value.slice(0, Math.max(0, n)))
  },

  takeWhile(p) {
    const result: A[] = []
    for (const item of this.value) {
      if (!p(item)) break
      result.push(item)
    }
    return wrap(result)
  },

  // `!(n > 0)` also catches NaN, which `take` already treats as 0.
  takeRight(n) {
    return wrap(!(n > 0) ? [] : this.value.slice(-n))
  },

  reverse() {
    return wrap([...this.value].reverse())
  },

  indexOf(value) {
    return (this.value as readonly unknown[]).indexOf(value)
  },

  prepend<B>(item: B): List<A | B> {
    return wrap<A | B>([item, ...this.value])
  },

  distinct() {
    const seen = new globalThis.Set<A>()
    const result: A[] = []
    for (const item of this.value) {
      if (!seen.has(item)) {
        seen.add(item)
        result.push(item)
      }
    }
    return wrap(result)
  },

  sorted(compareFn) {
    return wrap([...this.value].sort(compareFn))
  },

  sortBy(f, compareFn) {
    return wrap(
      [...this.value].sort((x, y) => {
        const fx = f(x)
        const fy = f(y)
        if (compareFn) return compareFn(fx, fy)
        return fx < fy ? -1 : fx > fy ? 1 : 0
      }),
    )
  },

  zip<B>(other: List<B>): List<[A, B]> {
    const otherArr = other.toArray()
    const len = Math.min(this.value.length, otherArr.length)
    const result: [A, B][] = []
    for (let i = 0; i < len; i++) {
      result.push([this.value[i]!, otherArr[i]!])
    }
    return wrap(result)
  },

  zipWithIndex() {
    return wrap(this.value.map((a, i): [A, number] => [a, i]))
  },

  groupBy<K>(f: (a: A) => K): globalThis.Map<K, List<A>> {
    const groups = new globalThis.Map<K, A[]>()
    for (const item of this.value) {
      const key = f(item)
      const group = groups.get(key) ?? []
      group.push(item)
      groups.set(key, group)
    }
    const result = new globalThis.Map<K, List<A>>()
    for (const [key, items] of groups) {
      result.set(key, wrap(items))
    }
    return result
  },

  partition(p) {
    const yes: A[] = []
    const no: A[] = []
    for (const item of this.value) {
      if (p(item)) yes.push(item)
      else no.push(item)
    }
    return [wrap(yes), wrap(no)]
  },

  span(p) {
    const idx = this.value.findIndex((x) => !p(x))
    if (idx === -1) return [this, wrap<A>([])]
    return [wrap(this.value.slice(0, idx)), wrap(this.value.slice(idx))]
  },

  slice(start, end) {
    return wrap(this.value.slice(start, end))
  },

  drop(n) {
    return wrap(this.value.slice(Math.max(0, n)))
  },

  dropRight(n) {
    return n > 0 ? wrap(this.value.slice(0, Math.max(0, this.value.length - Math.trunc(n)))) : this
  },

  dropWhile(p) {
    const first = this.value.findIndex((x) => !p(x))
    return wrap(first === -1 ? [] : this.value.slice(first))
  },

  flatten<B>(): List<B> {
    return wrap<B>(this.value.flatMap((item) => (isSpreadable<B>(item) ? [...item] : [item as unknown as B])))
  },

  toList() {
    return this
  },

  toSet() {
    return Set(this.value)
  },

  toOption() {
    return this.value.length > 0 ? Option(this.value[0]) : None<A>()
  },

  toEither<E extends Type>(leftValue: E): Either<E, A> {
    return this.value.length > 0 ? Right<E, A>(this.value[0]!) : Left<E, A>(leftValue)
  },

  toTry() {
    const array = this.value
    return array.length > 0
      ? Try<A>(() => array[0]!)
      : Try<A>(() => {
          throw new Error("Empty list")
        })
  },

  toString() {
    return `List(${safeStringify(this.value)})`
  },

  toValue() {
    return { _tag: "List" as const, value: [...this.value] }
  },

  toJSON() {
    return { "@functype": "List" as const, _tag: "List" as const, value: [...this.value] }
  },

  pipe(f) {
    return f([...this.value])
  },

  serialize() {
    return createSerializer("List", this.value)
  },

  // Implement Doable interface for Do-notation
  doUnwrap(): DoResult<A> {
    if (this.value.length === 0) {
      return { ok: false, empty: true }
    }
    return { ok: true, value: this.value[0]! }
  },
})

/**
 * Builds a List around an array it now owns: nothing may change the array afterwards. Frozen, as
 * collections have been since 1.27.0 (#276 §14 Rules).
 */
const wrap = <A>(array: readonly A[]): List<A> => {
  // The one cast: a prototype checked at the opaque A works for every A.
  const list = Object.create(ListProto) as Mutable<ListOf<A>>
  list._tag = "List"
  list.value = array
  return Object.freeze(list)
}

/* eslint-enable functional/immutable-data */

const ListConstructor = <A>(values?: Iterable<A>): List<A> => wrap(Array.from(values ?? []))

// Singleton empty list - uses 'never' which is subtype of all types
const EMPTY_LIST: List<never> = wrap<never>([])

/** Rebuilds a List from a parsed envelope. */
const listFromEnvelope = <A>(parsed: ParsedEnvelope, method: string): List<A> => {
  expectMarker(parsed, "List", method)
  return List<A>((parsed.value ?? []) as A[])
}

const ListCompanion = {
  /**
   * Creates an empty List
   * Returns a singleton instance for efficiency
   * @returns An empty List instance
   */
  empty: <A extends Type>(): List<A> => EMPTY_LIST as unknown as List<A>,

  /**
   * Creates a List from variadic arguments
   * @param values - Values to create list from
   * @returns A List containing the values
   */
  of: <A extends Type>(...values: A[]): List<A> => wrap<A>(values),

  /**
   * Creates a List from JSON string
   * @param json - The JSON string
   * @returns List instance
   */
  fromJSON: <A>(json: string): List<A> => listFromEnvelope<A>(JSON.parse(json) as ParsedEnvelope, "fromJSON"),

  /**
   * Creates a List from binary string
   * @param binary - The binary string
   * @returns List instance
   */
  fromBinary: <A>(binary: string): List<A> => {
    const json = base64ToUtf8(binary)
    return ListCompanion.fromJSON<A>(json)
  },
}

export const List = Companion(ListConstructor, ListCompanion)
