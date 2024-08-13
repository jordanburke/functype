import { _Functor_, Type } from "../functor"
import { _Traversable_, _Try_ } from "../index"
import { _Iterable_ } from "../iterable"
import { Seq } from "../iterable/Seq"

export type _Option_<T extends Type> = {
  get(): T

  getOrElse(defaultValue: T): T

  orElse(alternative: _Option_<T>): _Option_<T>

  map<U extends Type>(f: (value: T) => U): _Option_<U>

  flatMap<U extends Type>(f: (value: T) => _Option_<U>): _Option_<U>

  toList(): _Iterable_<T>

  valueOf(): Object
} & _Traversable_<T> &
  _Functor_<T>

export class Some<A extends Type> implements _Option_<A> {
  constructor(private value: A) {}

  get isEmpty(): boolean {
    return false
  }

  get(): A {
    return this.value
  }

  getOrElse(defaultValue: A): A {
    return this.value
  }

  orElse(alternative: _Option_<A>): _Option_<A> {
    return this
  }

  map<U extends Type>(f: (value: A) => U): _Option_<U> {
    return new Some(f(this.value))
  }

  flatMap<U extends Type>(f: (value: A) => _Option_<U>): _Option_<U> {
    return f(this.value)
  }

  reduce<U>(f: (acc: U, value: A) => U): U {
    return f(undefined as any, this.value)
  }

  reduceRight<U>(f: (acc: U, value: A) => U): U {
    return f(undefined as any, this.value)
  }

  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B {
    return (f: (b: B, a: A) => B) => {
      return f(z, this.value)
    }
  }

  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B {
    return (f: (a: A, b: B) => B) => {
      return f(this.value, z)
    }
  }

  toList(): _Iterable_<A> {
    return new Seq<A>([this.value])
  }

  contains(value: A): boolean {
    return false
  }

  get size(): number {
    return 0
  }
}

export class None<A extends Type> implements _Option_<A> {
  get isEmpty(): boolean {
    return true
  }

  get(): A {
    throw new Error("Cannot call get() on a None")
  }

  getOrElse(defaultValue: A): A {
    return defaultValue
  }

  orElse(alternative: _Option_<A>): _Option_<A> {
    return alternative
  }

  map<U extends Type>(f: (value: A) => U): _Option_<U> {
    return new None<U>()
  }

  flatMap<U extends Type>(f: (value: A) => _Option_<U>): _Option_<U> {
    return new None<U>()
  }

  reduce(f: (acc: A, value: A) => A): A {
    return f(undefined as any, undefined as any)
  }

  reduceRight(f: (b: A, a: A) => A): A {
    return f(undefined as any, undefined as any)
  }

  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B {
    return (f: (b: B, a: A) => B) => {
      return z
    }
  }

  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B {
    return (f: (a: A, b: B) => B) => {
      return z
    }
  }

  toList(): _Iterable_<A> {
    return new Seq<A>()
  }

  contains(value: A): boolean {
    return false
  }

  get size(): number {
    return 0
  }
}
