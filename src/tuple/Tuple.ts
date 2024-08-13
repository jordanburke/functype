import { ArrayType, _ArrayFunctor_ } from "../functor"

export type _Tuple_<T extends ArrayType> = _ArrayFunctor_<T> & {
  get(index: number): T[number]

  getAs<U>(index: number, f?: (item: T) => boolean): U

  map<U extends any[]>(f: (value: T) => U): _Tuple_<U>

  flatMap<U extends any[]>(f: (value: T) => _Tuple_<U>): _Tuple_<U>
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
  get(index: number): T[number] {
    return this.values[index]
  }

  getAs<U>(index: number, f?: (item: T) => boolean): U {
    const value = this.values[index]
    if (f) {
      if (f(this.values)) {
        return value as U
      } else {
        throw new Error("Cannot cast tuple value")
      }
    } else {
      return value as any as U
    }
  }

  toArray(): T {
    return this.values
  }
}
