import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import type { Foldable } from "@/foldable/Foldable"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import type { Typeable } from "@/typeable/Typeable"
import type { Type } from "@/types"

export interface Tuple<T extends Type[]>
  extends Foldable<T[number]>, Pipe<Tuple<T>>, Serializable<Tuple<T>>, Typeable<"Tuple"> {
  get<K extends number>(index: K): T[K]

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
    fold: <B>(onEmpty: () => B, onValue: (value: T[number]) => B): B => {
      return values.length === 0 ? onEmpty() : onValue(values[0]!)
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
    serialize: () => {
      return {
        toJSON: () => JSON.stringify({ _tag: "Tuple", value: values }),
        toYAML: () => `_tag: Tuple\nvalue: ${stringify(values)}`,
        toBinary: () => Buffer.from(JSON.stringify({ _tag: "Tuple", value: values })).toString("base64"),
      }
    },

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
