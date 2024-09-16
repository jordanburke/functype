import { ArrayFunctor, ArrayType } from "../functor"

export type Tuple<T extends ArrayType> = {
  get<K extends number>(index: K): T[K]

  map<U extends ArrayType>(f: (value: T) => U): Tuple<U>

  flatMap<U extends ArrayType>(f: (value: T) => Tuple<U>): Tuple<U>

  toArray(): T
} & ArrayFunctor<T>

export const Tuple = <T extends ArrayType>(values: T): Tuple<T> => {
  return {
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
  }
}
