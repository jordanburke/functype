import { Companion } from "@/companion/Companion"
import type { Foldable } from "@/foldable/Foldable"
import { type A, define, type Mutable } from "@/internal/define"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import { createSerializer } from "@/serialization"
import type { Typeable } from "@/typeable/Typeable"
import type { Type } from "@/types"

export interface Tuple<out T extends Type[]>
  extends Foldable<T[number]>, Pipe<Tuple<T>>, Serializable<Tuple<T>>, Typeable<"Tuple"> {
  readonly [Symbol.toStringTag]: string
  get<K extends number>(index: K): T[K]

  fold<B>(initial: B, fn: (acc: B, a: T[number]) => B): B

  map<U extends Type[]>(f: (value: T) => U): Tuple<U>

  flatMap<U extends Type[]>(f: (value: T) => Tuple<U>): Tuple<U>

  toArray(): T

  readonly length: number

  [Symbol.iterator](): Iterator<T[number]>

  toString(): string

  toValue(): { _tag: "Tuple"; value: T }
}

/** A Tuple's own data: its tag and the array it wraps. @internal */
interface TupleOf<out T extends Type[]> extends Tuple<T> {
  readonly value: T
}

/* eslint-disable functional/immutable-data -- the constructor fills in the object it just created */

/** Every Tuple shares these methods (#276 §14). `this.value` is the Tuple's own array. */
const TupleProto = define<TupleOf<A[]>, "_tag" | "value">()("Tuple", {
  [Symbol.toStringTag]: "Tuple",

  get length() {
    return this.value.length
  },

  get(index) {
    return this.value[index]
  },

  map(f) {
    return TupleObject(f(this.value))
  },

  flatMap(f) {
    return f(this.value)
  },

  toArray() {
    return this.value
  },

  [Symbol.iterator]() {
    return this.value[Symbol.iterator]()
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

  pipe(f) {
    return f(this)
  },

  serialize() {
    return createSerializer("Tuple", this.value)
  },

  toJSON() {
    return { "@functype": "Tuple" as const, _tag: "Tuple" as const, value: [...this.value] }
  },

  toValue() {
    return { _tag: "Tuple" as const, value: this.value }
  },

  toString() {
    return `Tuple(${this.value.map((v) => String(v)).join(", ")})`
  },
})

const TupleObject = <T extends Type[]>(values: T): Tuple<T> => {
  // The one cast: a prototype checked at the opaque A works for every T.
  const tuple = Object.create(TupleProto) as Mutable<TupleOf<T>>
  tuple._tag = "Tuple"
  tuple.value = values
  return tuple
}

/* eslint-enable functional/immutable-data */

const TupleConstructor = <T extends Type[]>(values: T): Tuple<T> => {
  return TupleObject(values)
}

const TupleCompanion = {
  /**
   * Create a Tuple from multiple arguments
   * @example
   * const t = Tuple.of(1, "hello", true)
   * // TypeScript infers: Tuple<[number, string, boolean]>
   */
  of: <T extends Type[]>(...values: T): Tuple<T> => {
    return TupleObject(values)
  },

  /**
   * Create a Tuple of size 2 (pair)
   * @example
   * const pair = Tuple.pair("key", 42)
   * // TypeScript infers: Tuple<[string, number]>
   */
  pair: <A extends Type, B extends Type>(first: A, second: B): Tuple<[A, B]> => {
    return TupleObject([first, second] as [A, B])
  },

  /**
   * Create a Tuple of size 3 (triple)
   * @example
   * const triple = Tuple.triple("x", 10, true)
   * // TypeScript infers: Tuple<[string, number, boolean]>
   */
  triple: <A extends Type, B extends Type, C extends Type>(first: A, second: B, third: C): Tuple<[A, B, C]> => {
    return TupleObject([first, second, third] as [A, B, C])
  },

  /**
   * Create an empty Tuple
   * @example
   * const empty = Tuple.empty()
   * // TypeScript infers: Tuple<[]>
   */
  empty: (): Tuple<[]> => {
    return TupleObject([] as [])
  },

  /**
   * Create a Tuple from an array (alias for constructor)
   * @example
   * const t = Tuple.from([1, 2, 3])
   */
  from: <T extends Type[]>(values: T): Tuple<T> => {
    return TupleObject(values)
  },

  /**
   * Reconstruct a Tuple from a JSON envelope emitted by `serialize().toJSON()`
   * or instance `toJSON()`. Verifies `@functype === "Tuple"` if the marker is
   * present (the marker became canonical in 1.2.0; older envelopes are
   * accepted by leniently treating missing-marker as opt-in legacy).
   */
  fromJSON: <T extends Type[]>(json: string): Tuple<T> => {
    const parsed = JSON.parse(json) as { "@functype"?: string; _tag?: string; value: T }
    if (parsed["@functype"] !== undefined && parsed["@functype"] !== "Tuple") {
      throw new Error(`Tuple.fromJSON: expected @functype="Tuple", got ${JSON.stringify(parsed["@functype"])}`)
    }
    return TupleObject(parsed.value)
  },
}

/**
 * Tuple provides a type-safe, fixed-length array with functional operations.
 *
 * @example
 * // Creating tuples
 * const t1 = Tuple([1, "hello", true])
 * const t2 = Tuple.of(1, "hello", true)
 * const pair = Tuple.pair("key", 42)
 *
 * @example
 * // Type-safe access
 * const triple = Tuple.triple("x", 10, true)
 * const first = triple.get(0)  // string
 * const second = triple.get(1) // number
 * const third = triple.get(2)  // boolean
 *
 * @example
 * // Functional operations
 * const doubled = Tuple([1, 2, 3])
 *   .map(arr => arr.map(x => x * 2))
 *   .toArray() // [2, 4, 6]
 */
export const Tuple: TupleCompanion = Companion(TupleConstructor, TupleCompanion)

/** The type of `Tuple`: its constructor and its statics, named so that errors and hovers print `TupleCompanion`. */
export interface TupleCompanion extends TupleConstructorType, TupleStaticsType {}
type TupleConstructorType = typeof TupleConstructor
type TupleStaticsType = typeof TupleCompanion
