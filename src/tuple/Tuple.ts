import type { ArrayFunctor, ArrayType } from "@/functor"
import { Typeable } from "@/typeable/Typeable"
import { Valuable } from "@/valuable/Valuable"

export type Tuple<T extends ArrayType> = {
  get<K extends number>(index: K): T[K]

  map<U extends ArrayType>(f: (value: T) => U): Tuple<U>

  flatMap<U extends ArrayType>(f: (value: T) => Tuple<U>): Tuple<U>

  toArray(): T

  [Symbol.iterator](): Iterator<T[number]>
} & ArrayFunctor<T> &
  Typeable<"Tuple"> &
  Valuable<"Tuple", T>

export const Tuple = <T extends ArrayType>(values: T): Tuple<T> => {
  return {
    _tag: "Tuple",
    map: <U extends ArrayType>(f: (value: T) => U): Tuple<U> => {
      const mapValue = f(values)
      return Tuple(mapValue)
    },

    flatMap: <U extends ArrayType>(f: (value: T) => Tuple<U>): Tuple<U> => {
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
