import type { Collection } from "@/collections"
import type { IterableType } from "@/iterable"
import { List } from "@/list/List"
import type { Serializable } from "@/serializable/Serializable"
import { Typeable } from "@/typeable/Typeable"
import { Valuable } from "@/valuable/Valuable"

import { ESSet, type IESSet } from "./shim"

export type Set<A> = {
  add: (value: A) => Set<A>
  remove: (value: A) => Set<A>
  contains: (value: A) => boolean
  has: (value: A) => boolean
  map: <B>(f: (a: A) => B) => Set<B>
  flatMap: <B>(f: (a: A) => IterableType<B>) => Set<B>
  toList: () => List<A>
  toSet: () => Set<A>
  toString: () => string
} & IterableType<A> &
  Collection<A> &
  Typeable<"Set"> &
  Valuable<"Set", A[]> &
  Serializable<A[]>

const createSet = <A>(iterable?: Iterable<A>): Set<A> => {
  const values: IESSet<A> = new ESSet<A>(iterable)

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

    toList: (): List<A> => List(values),

    toSet: (): Set<A> => set,

    toString: (): string => `Set(${Array.from(values).toString()})`,
    
    toValue: (): { _tag: "Set"; value: A[] } => ({ _tag: "Set", value: Array.from(values) }),
    
    serialize: {
      toJSON: () => JSON.stringify({ _tag: "Set", value: Array.from(values) }),
      toYAML: () => `_tag: Set\nvalue: ${JSON.stringify(Array.from(values))}`,
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "Set", value: Array.from(values) })).toString("base64"),
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
  }
}

export const Set = Object.assign(SetConstructor, SetCompanion)
