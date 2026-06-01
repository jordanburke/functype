import { Companion } from "@/companion/Companion"
import type { Foldable } from "@/foldable/Foldable"
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

  length: number

  [Symbol.iterator](): Iterator<T[number]>

  toString(): string

  toValue(): { _tag: "Tuple"; value: T }
}

const TupleObject = <T extends Type[]>(values: T): Tuple<T> => {
  const tuple: Tuple<T> = {
    [Symbol.toStringTag]: "Tuple",
    _tag: "Tuple",
    map: <U extends Type[]>(f: (value: T) => U): Tuple<U> => {
      const mapValue = f(values)
      return Tuple(mapValue)
    },

    flatMap: <U extends Type[]>(f: (value: T) => Tuple<U>): Tuple<U> => {
      return f(values)
    },

    get: <K extends number>(index: K): T[K] => {
      return values[index]
    },

    toArray: (): T => {
      return values
    },

    length: values.length,

    [Symbol.iterator](): Iterator<T[number]> {
      // eslint-disable-next-line functional/no-let
      let index = 0
      return {
        next: (): IteratorResult<T[number]> => {
          if (index < values.length) {
            return {
              value: values[index++],
              done: false,
            }
          } else {
            return {
              value: undefined,
              done: true,
            }
          }
        },
      }
    },

    // Foldable implementation
    fold: <B>(initial: B, fn: (acc: B, a: T[number]) => B): B => {
      return values.reduce(fn, initial)
    },

    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: T[number]) => B) => {
        return values.reduce(op, z)
      },

    foldRight:
      <B>(z: B) =>
      (op: (a: T[number], b: B) => B): B => {
        return values.reduceRight<B>((acc, value) => op(value, acc), z)
      },

    // Pipe implementation
    pipe: <U>(f: (value: Tuple<T>) => U): U => f(tuple),

    // Serializable implementation
    serialize: () => createSerializer("Tuple", values),
    toJSON: () => ({ "@functype": "Tuple" as const, _tag: "Tuple" as const, value: [...values] as T }),

    // Valuable implementation
    toValue: () => ({ _tag: "Tuple", value: values }),

    toString: () => `Tuple(${values.map((v) => String(v)).join(", ")})`,
  }

  return tuple
}

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
export const Tuple = Companion(TupleConstructor, TupleCompanion)
