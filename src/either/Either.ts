import { none, _Option_, some } from "../option"
import { List } from "../list"
import { _Functor_ } from "../functor"

export type Either<L, R> = {
  value: L | R

  isLeft(): boolean

  isRight(): boolean

  map<U>(f: (value: R) => U): Either<L, U>

  flatMap<U>(f: (value: R) => Either<L, U>): Either<L, U>

  toOption(): _Option_<R>

  toList(): List<R>
} & _Functor_<R>

export class Right<L, R> implements Either<L, R> {
  constructor(public value: R) {}

  isLeft(): this is Left<L, R> {
    return false
  }

  isRight(): this is Right<L, R> {
    return true
  }

  map<U>(f: (value: R) => U): Either<L, U> {
    return new Right<L, U>(f(this.value))
  }

  flatMap<U>(f: (value: R) => Either<L, U>): Either<L, U> {
    return f(this.value)
  }

  toOption(): _Option_<R> {
    return some<R>(this.value)
  }

  toList(): List<R> {
    return new List<R>([this.value])
  }
}

export class Left<L, R> implements Either<L, R> {
  constructor(public value: L) {}

  isLeft(): this is Left<L, R> {
    return true
  }

  isRight(): this is Right<L, R> {
    return false
  }

  map<U>(_f: (value: R) => U): Either<L, U> {
    return new Left<L, U>(this.value)
  }

  flatMap<U>(_f: (value: R) => Either<L, U>): Either<L, U> {
    return new Left<L, U>(this.value)
  }

  toOption(): _Option_<R> {
    return none<R>()
  }

  toList(): List<R> {
    return new List()
  }
}
