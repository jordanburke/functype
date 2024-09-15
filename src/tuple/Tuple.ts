import { _ArrayFunctor_, ArrayType } from "../functor"

export type _Tuple_<T extends ArrayType> = _ArrayFunctor_<T> & {
  get<K extends number>(index: K): T[K]

  map<U extends ArrayType>(f: (value: T) => U): _Tuple_<U>

  flatMap<U extends ArrayType>(f: (value: T) => _Tuple_<U>): _Tuple_<U>

  toArray(): T
}

export class Tuple<T extends ArrayType> implements _Tuple_<T> {
  constructor(private readonly values: T) {}

  map<U extends ArrayType>(f: (value: T) => U): Tuple<U> {
    const mapValue = f(this.values)
    return new Tuple(mapValue)
  }

  flatMap<U extends ArrayType>(f: (value: T) => Tuple<U>): Tuple<U> {
    return f(this.values)
  }

  // Additional Tuple methods
  get<K extends number>(index: K): T[K] {
    return this.values[index]
  }

  toArray(): T {
    return this.values
  }
}
