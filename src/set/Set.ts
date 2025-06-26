import type { Collection } from "@/collections"
import { Companion } from "@/companion/Companion"
import type { FunctypeCollection } from "@/functype"
import type { IterableType } from "@/iterable"
import { List } from "@/list/List"
import type { Type } from "@/types"

import { ESSet, type ESSetType } from "./shim"

export interface Set<A> extends FunctypeCollection<A, "Set">, Collection<A> {
  add: (value: A) => Set<A>
  remove: (value: A) => Set<A>
  contains: (value: A) => boolean
  has: (value: A) => boolean
  map: <B>(f: (a: A) => B) => Set<B>
  flatMap: <B>(f: (a: A) => IterableType<B>) => Set<B>
  fold: <U extends Type>(onEmpty: () => U, onValue: (value: A) => U) => U
  toList: () => List<A>
  toSet: () => Set<A>
  toArray: () => A[]
  toString: () => string
}

const createSet = <A>(iterable?: Iterable<A>): Set<A> => {
  const values: ESSetType<A> = new ESSet<A>(iterable)

  const seqMethods = List(values)

  const set: Set<A> = {
    ...seqMethods,
    _tag: "Set",

    add: (value: A): Set<A> => createSet([...values, value]),

    remove: (value: A): Set<A> => {
      const newSet = new ESSet(values)
      newSet.delete(value)
      return createSet(newSet)
    },

    contains: (value: A): boolean => values.has(value),

    has: (value: A): boolean => values.has(value),

    map: <B>(f: (a: A) => B): Set<B> => createSet(seqMethods.map(f)),

    flatMap: <B>(f: (a: A) => IterableType<B>): Set<B> => createSet(seqMethods.flatMap(f)),

    fold: <U extends Type>(onEmpty: () => U, onValue: (value: A) => U): U => {
      if (values.size === 0) return onEmpty()

      // For Set, we'll always return the first entry as the value for fold
      // This is consistent with how Option and other single-value types work
      const entries = Array.from(values)
      if (entries.length === 0) {
        return onEmpty()
      }

      const firstEntry = entries[0]
      // Make sure we handle potential undefined values
      if (firstEntry === undefined) {
        return onEmpty()
      }

      return onValue(firstEntry)
    },

    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: A) => B) =>
        seqMethods.foldLeft(z)(op),

    foldRight:
      <B>(z: B) =>
      (op: (a: A, b: B) => B) =>
        seqMethods.foldRight(z)(op),

    toList: (): List<A> => List(values),

    toSet: (): Set<A> => set,

    toArray: (): A[] => Array.from(values),

    toString: (): string => `Set(${Array.from(values).toString()})`,

    toValue: (): { _tag: "Set"; value: A[] } => ({ _tag: "Set", value: Array.from(values) }),

    pipe: <U>(f: (value: A[]) => U) => f(Array.from(values)),

    serialize: () => {
      return {
        toJSON: () => JSON.stringify({ _tag: "Set", value: Array.from(values) }),
        toYAML: () => `_tag: Set\nvalue: ${JSON.stringify(Array.from(values))}`,
        toBinary: () => Buffer.from(JSON.stringify({ _tag: "Set", value: Array.from(values) })).toString("base64"),
      }
    },
  }

  return set
}

const SetConstructor = <A>(iterable?: Iterable<A> | IterableType<A>): Set<A> => createSet(iterable)

const SetCompanion = {
  /**
   * Creates a Set from JSON string
   * @param json - The JSON string
   * @returns Set instance
   */
  fromJSON: <A>(json: string): Set<A> => {
    const parsed = JSON.parse(json)
    return Set<A>(parsed.value)
  },

  /**
   * Creates a Set from YAML string
   * @param yaml - The YAML string
   * @returns Set instance
   */
  fromYAML: <A>(yaml: string): Set<A> => {
    const lines = yaml.split("\n")
    const valueStr = lines[1]?.split(": ")[1]
    if (!valueStr) {
      return Set<A>([])
    }
    const value = JSON.parse(valueStr)
    return Set<A>(value)
  },

  /**
   * Creates a Set from binary string
   * @param binary - The binary string
   * @returns Set instance
   */
  fromBinary: <A>(binary: string): Set<A> => {
    const json = Buffer.from(binary, "base64").toString()
    return SetCompanion.fromJSON<A>(json)
  },
}

export const Set = Companion(SetConstructor, SetCompanion)
