import type { Collection } from "@/collections"
import { Companion } from "@/companion/Companion"
import type { FunctypeCollection } from "@/functype"
import { base64ToUtf8 } from "@/internal/base64"
import { type ConcurrencyOptions, traverseWithConcurrency } from "@/internal/concurrency"
import { type A, define, type Mutable } from "@/internal/define"
import { freezeInDevelopment } from "@/internal/freeze"
import { List } from "@/list/List"
import { Option } from "@/option/Option"
import { createSerializer, expectMarker, type ParsedEnvelope } from "@/serialization"
import { type Flattened, reduceRightWiden, reduceWiden, type Widen } from "@/typeclass"
import type { Type } from "@/types"

type NativeSet<T> = globalThis.Set<T>
const NativeSet = globalThis.Set

/**
 * Immutable Set. Covariant in A (`<out A>`) — while Scala's `Set[A]` is nominally invariant,
 * functype's Set follows the same pragmatic covariance pattern as List: element-query methods
 * (`contains`, `has`, `remove`) accept `unknown`, and additions widen via `<B>(B) => Set<A | B>`.
 * `reduce`/`reduceRight` follow Scala's `reduce[B >: A]` pattern with a default `B = A`.
 */
export interface Set<out A> extends FunctypeCollection<A, "Set">, Collection<A> {
  add<B>(value: B): Set<A | B>
  remove(value: unknown): Set<A>
  has(value: unknown): boolean
  /**
   * Elements in this set or `other`. `other` can be any iterable: an array, a native Set or a functype Set.
   * Like every Set method, it compares elements as `has` does: by SameValueZero, so objects by identity and
   * `NaN` equal to `NaN`.
   *
   * @example
   * ```typescript
   * Set([1, 2]).union([2, 3]) // Set([1, 2, 3])
   * ```
   */
  union<B>(other: Iterable<B>): Set<A | B>
  /** Elements in both this set and `other`, in this set's order (native `intersection` follows the smaller set's). */
  intersection(other: Iterable<unknown>): Set<A>
  /** Elements in this set and not in `other`. */
  difference(other: Iterable<unknown>): Set<A>
  /** Elements in exactly one of this set and `other`. */
  symmetricDifference<B>(other: Iterable<B>): Set<A | B>
  /** True if every element of this set is in `other`. True for an empty set. */
  isSubsetOf(other: Iterable<unknown>): boolean
  /** True if every element of `other` is in this set. */
  isSupersetOf(other: Iterable<unknown>): boolean
  /** True if this set and `other` share no element. */
  isDisjointFrom(other: Iterable<unknown>): boolean
  map<B>(f: (a: A) => B): Set<B>
  flatMap<B>(f: (a: A) => Iterable<B>): Set<B>
  /**
   * Async map: awaits `f` for each element and collects the results into a Set, so equal results
   * collapse into one. Runs one call at a time by default; pass `{ concurrency: n }` to allow up to
   * `n` at once, or `"unbounded"`. A rejection rejects the result, and no further calls start.
   */
  mapAsync<B>(f: (a: A) => PromiseLike<B>, options?: ConcurrencyOptions): Promise<Set<B>>
  filter(p: (a: A) => boolean): Set<A>
  filterNot(p: (a: A) => boolean): Set<A>
  // Positional methods follow insertion order. Override them to return Set instead of FunctypeCollection.
  /** Keep the first `n` elements. `n` of 0 or less keeps none. */
  take(n: number): Set<A>
  takeWhile(p: (a: A) => boolean): Set<A>
  /** Keep the last `n` elements. `n` of 0 or less keeps none. */
  takeRight(n: number): Set<A>
  /** Drop the first `n` elements. `n` of 0 or less drops nothing. */
  drop(n: number): Set<A>
  /** Drop the last `n` elements. `n` of 0 or less drops nothing. */
  dropRight(n: number): Set<A>
  dropWhile(p: (a: A) => boolean): Set<A>
  tail(): Set<A>
  init(): Set<A>
  /**
   * Spread each element that's an array or another non-string iterable into the result, one level deep,
   * keeping other elements, strings included, as they are.
   */
  flatten<B = Flattened<A>>(): Set<B>
  fold<B>(initial: B, fn: (acc: B, a: A) => B): B
  toList(): List<A>
  toSet(): Set<A>
  toArray<B = A>(): B[]
  toString(): string
}

/**
 * A Set's own data: its tag and the native Set it wraps. The native Set is never changed after the
 * Set is built, so `size` and `isEmpty` can't go stale. @internal
 */
interface SetOf<out A> extends Set<A> {
  readonly value: ReadonlySet<A>
}

/* eslint-disable functional/immutable-data -- methods build fresh native Sets, and wrap fills in the Set it just created */

/** Every Set shares these methods (#276 §14). `this.value` is the Set's own native Set. */
const SetProto = define<SetOf<A>, "_tag" | "value">()("Set", {
  [Symbol.toStringTag]: "FunctypeSet",

  get size() {
    return this.value.size
  },

  get isEmpty() {
    return this.value.size === 0
  },

  [Symbol.iterator]() {
    return this.value[Symbol.iterator]()
  },

  head() {
    return this.value.values().next().value
  },

  headOption() {
    return Option(this.value.values().next().value)
  },

  last() {
    return Array.from(this.value).at(-1)
  },

  lastOption() {
    return Option(Array.from(this.value).at(-1))
  },

  tail() {
    return wrap(new NativeSet(Array.from(this.value).slice(1)))
  },

  init() {
    return wrap(new NativeSet(Array.from(this.value).slice(0, -1)))
  },

  add<B>(value: B): Set<A | B> {
    return wrap(new NativeSet<A | B>([...this.value, value]))
  },

  remove(value) {
    const newSet = new NativeSet<unknown>(this.value)
    newSet.delete(value)
    return wrap(newSet as NativeSet<A>)
  },

  contains(value) {
    return (this.value as ReadonlySet<unknown>).has(value)
  },

  has(value) {
    return (this.value as ReadonlySet<unknown>).has(value)
  },

  union<B>(other: Iterable<B>): Set<A | B> {
    return wrap(new NativeSet<A | B>([...this.value, ...other]))
  },

  intersection(other) {
    const others = new NativeSet<unknown>(other)
    return wrap(new NativeSet([...this.value].filter((a) => others.has(a))))
  },

  difference(other) {
    const others = new NativeSet<unknown>(other)
    return wrap(new NativeSet([...this.value].filter((a) => !others.has(a))))
  },

  symmetricDifference<B>(other: Iterable<B>): Set<A | B> {
    const values = this.value as ReadonlySet<unknown>
    const others = [...new NativeSet<B>(other)]
    const otherValues = new NativeSet<unknown>(others)
    return wrap(
      new NativeSet<A | B>([
        ...[...this.value].filter((a) => !otherValues.has(a)),
        ...others.filter((b) => !values.has(b)),
      ]),
    )
  },

  isSubsetOf(other) {
    const others = new NativeSet<unknown>(other)
    return [...this.value].every((a) => others.has(a))
  },

  isSupersetOf(other) {
    const values = this.value as ReadonlySet<unknown>
    for (const b of other) {
      if (!values.has(b)) return false
    }
    return true
  },

  isDisjointFrom(other) {
    const values = this.value as ReadonlySet<unknown>
    for (const b of other) {
      if (values.has(b)) return false
    }
    return true
  },

  map(f) {
    return wrap(new NativeSet(Array.from(this.value).map(f)))
  },

  ap<B>(ff: Set<(value: A) => B>): Set<B> {
    const results = new NativeSet<B>()
    for (const a of this.value) {
      for (const f of ff) {
        results.add(f(a))
      }
    }
    return wrap(results)
  },

  flatMap<B>(f: (a: A) => Iterable<B>): Set<B> {
    const results = new NativeSet<B>()
    for (const a of this.value) {
      for (const b of f(a)) {
        results.add(b)
      }
    }
    return wrap(results)
  },

  async mapAsync(f, options) {
    return wrap(new NativeSet(await traverseWithConcurrency(this.value, f, options?.concurrency ?? 1)))
  },

  async flatMapAsync(f, options) {
    const results = await traverseWithConcurrency(this.value, f, options?.concurrency ?? 1)
    return wrap(new NativeSet(results.flatMap((iterable) => Array.from(iterable))))
  },

  fold(initial, fn) {
    let acc = initial
    for (const a of this.value) {
      acc = fn(acc, a)
    }
    return acc
  },

  foldLeft(z) {
    return (op) => {
      let acc = z
      for (const a of this.value) {
        acc = op(acc, a)
      }
      return acc
    }
  },

  foldRight(z) {
    return (op) => Array.from(this.value).reduceRight((acc, value) => op(value, acc), z)
  },

  reduce<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    const arr = Array.from(this.value)
    if (arr.length === 0) throw new Error("Cannot reduce empty Set")
    return reduceWiden<A, Widen<A, B>>(arr, op)
  },

  reduceRight<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    const arr = Array.from(this.value)
    if (arr.length === 0) throw new Error("Cannot reduceRight empty Set")
    return reduceRightWiden<A, Widen<A, B>>(arr, op)
  },

  count(p) {
    let count = 0
    for (const a of this.value) {
      if (p(a)) count++
    }
    return count
  },

  find(p) {
    for (const a of this.value) {
      if (p(a)) return Option(a)
    }
    return Option<A>(null)
  },

  exists(p) {
    for (const a of this.value) {
      if (p(a)) return true
    }
    return false
  },

  every(p) {
    for (const a of this.value) {
      if (!p(a)) return false
    }
    return true
  },

  forEach(f) {
    this.value.forEach(f)
  },

  filter(p) {
    const results = new NativeSet<A>()
    for (const a of this.value) {
      if (p(a)) results.add(a)
    }
    return wrap(results)
  },

  filterNot(p) {
    const results = new NativeSet<A>()
    for (const a of this.value) {
      if (!p(a)) results.add(a)
    }
    return wrap(results)
  },

  drop(n) {
    return wrap(new NativeSet(Array.from(this.value).slice(Math.max(0, n))))
  },

  dropRight(n) {
    if (!(n > 0)) return this
    const arr = Array.from(this.value)
    return wrap(new NativeSet(arr.slice(0, Math.max(0, arr.length - Math.trunc(n)))))
  },

  dropWhile(p) {
    const arr = Array.from(this.value)
    const idx = arr.findIndex((x) => !p(x))
    return wrap(new NativeSet(idx === -1 ? [] : arr.slice(idx)))
  },

  flatten<B>(): Set<B> {
    const results = new NativeSet<B>()
    for (const item of this.value) {
      if (Array.isArray(item)) {
        for (const subItem of item) {
          results.add(subItem as B)
        }
      } else if (item && typeof item === "object" && Symbol.iterator in item) {
        for (const subItem of item as Iterable<B>) {
          results.add(subItem)
        }
      } else {
        results.add(item as unknown as B)
      }
    }
    return wrap(results)
  },

  take(n) {
    return wrap(new NativeSet(Array.from(this.value).slice(0, Math.max(0, n))))
  },

  takeWhile(p) {
    const result = new NativeSet<A>()
    for (const item of this.value) {
      if (!p(item)) break
      result.add(item)
    }
    return wrap(result)
  },

  takeRight(n) {
    // `!(n > 0)` also catches NaN, which `take` already treats as 0.
    return wrap(new NativeSet(!(n > 0) ? [] : Array.from(this.value).slice(-n)))
  },

  toList() {
    return List(this.value)
  },

  toSet() {
    return this
  },

  toArray<B = A>(): B[] {
    return Array.from(this.value) as unknown as B[]
  },

  toString() {
    return `Set(${Array.from(this.value).toString()})`
  },

  toValue() {
    return { _tag: "Set" as const, value: Array.from(this.value) }
  },

  toJSON() {
    return { "@functype": "Set" as const, _tag: "Set" as const, value: Array.from(this.value) }
  },

  pipe(f) {
    return f(Array.from(this.value))
  },

  serialize() {
    return createSerializer("Set", Array.from(this.value))
  },
})

/**
 * Builds a Set around a native Set it now owns: nothing may change the native Set afterwards.
 * Frozen only in development (`NODE_ENV=development` or `FUNCTYPE_FREEZE=1`; see `internal/freeze.ts`): in production the types mark its fields read-only, eslint-plugin-functype's no-container-mutation reports a write through a cast, and freezing was most of what building one cost.
 */
const wrap = <A>(values: ReadonlySet<A>): Set<A> => {
  // The one cast: a prototype checked at the opaque A works for every A.
  const set = Object.create(SetProto) as Mutable<SetOf<A>>
  set._tag = "Set"
  set.value = values
  return freezeInDevelopment(set)
}

/* eslint-enable functional/immutable-data */

const SetConstructor = <A>(iterable?: Iterable<A>): Set<A> => wrap(new NativeSet<A>(iterable))

/** Rebuilds a Set from a parsed envelope. */
const setFromEnvelope = <A>(parsed: ParsedEnvelope, method: string): Set<A> => {
  expectMarker(parsed, "Set", method)
  return Set<A>((parsed.value ?? []) as A[])
}

const SetCompanion = {
  /**
   * Creates an empty Set
   * Builds a new one each call: a native Set can't be frozen, so a shared empty Set could be
   * changed for every caller through a cast. It costs about 20 ns more than a shared one.
   * @returns An empty Set instance
   */
  empty: <A extends Type>(): Set<A> => wrap(new NativeSet<A>()),

  /**
   * Creates a Set from variadic arguments
   * @param values - Values to create set from
   * @returns A Set containing the unique values
   */
  of: <A extends Type>(...values: A[]): Set<A> => wrap(new NativeSet<A>(values)),

  /**
   * Creates a Set from JSON string
   * @param json - The JSON string
   * @returns Set instance
   */
  fromJSON: <A>(json: string): Set<A> => setFromEnvelope<A>(JSON.parse(json) as ParsedEnvelope, "fromJSON"),

  /**
   * Creates a Set from binary string
   * @param binary - The binary string
   * @returns Set instance
   */
  fromBinary: <A>(binary: string): Set<A> => {
    const json = base64ToUtf8(binary)
    return SetCompanion.fromJSON<A>(json)
  },
}

// The statics under a second name: the .d.ts then declares no value called SetCompanion beside the interface
const SetStatics = SetCompanion

export const Set: SetCompanion = Companion(SetConstructor, SetStatics)

/** The type of `Set`: its constructor and its statics, named so that errors and hovers print `SetCompanion`. */
export interface SetCompanion extends SetConstructorType, SetStaticsType {}
type SetConstructorType = typeof SetConstructor
type SetStaticsType = typeof SetStatics
