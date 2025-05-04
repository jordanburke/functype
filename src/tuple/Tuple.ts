import type { ArrayFunctor } from "@/functor/Functor"
import { Typeable } from "@/typeable/Typeable"
import type { Type } from "@/types"
import { Valuable } from "@/valuable/Valuable"

export type Tuple<T extends Type[]> = {
  get<K extends number>(index: K): T[K]

  map<U extends Type[]>(f: (value: T) => U): Tuple<U>

  flatMap<U extends Type[]>(f: (value: T) => Tuple<U>): Tuple<U>

  toArray(): T

  [Symbol.iterator](): Iterator<T[number]>
} & ArrayFunctor<T> &
  Typeable<"Tuple"> &
  Valuable<"Tuple", T>

export const Tuple = <T extends Type[]>(values: T): Tuple<T> => {
  return {
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
    toValue: () => ({ _tag: "Tuple", value: values }),
  }
}
