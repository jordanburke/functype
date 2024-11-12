import stringify from "safe-stable-stringify"

import { Functor, Type } from "../functor"
import { Either, Left, List, Right, Traversable } from "../index"
import { Typeable } from "../typeable/Typeable"
import { Valuable } from "../valuable/Valuable"

export type Option<T extends Type> = {
  readonly _tag: "Some" | "None"
  readonly value: T | undefined
  isEmpty: boolean
  get(): T
  getOrElse(defaultValue: T): T
  getOrThrow(error: Error): T
  orElse(alternative: Option<T>): Option<T>
  orNull(): T | null
  map<U extends Type>(f: (value: T) => U): Option<U>
  filter(predicate: (value: T) => boolean): Option<T>
  flatMap<U extends Type>(f: (value: T) => Option<U>): Option<U>
  reduce<U>(f: (acc: U, value: T) => U): U
  reduceRight<U>(f: (acc: U, value: T) => U): U
  fold<U>(onNone: () => U, onSome: (value: T) => U): U
  foldLeft<B>(z: B): (op: (b: B, a: T) => B) => B
  foldRight<B>(z: B): (op: (a: T, b: B) => B) => B
  toList(): List<T>
  contains(value: T): boolean
  size: number
  toEither<E>(left: E): Either<E, T>
  toString(): string
  toValue(): { _tag: "Some" | "None"; value: T }
} & (Traversable<T> & Functor<T> & Typeable<"Some" | "None"> & Valuable<T>)

export const Some = <T extends Type>(value: T): Option<T> => ({
  _tag: "Some",
  value,
  isEmpty: false,
  get: () => value,
  getOrElse: () => value,
  getOrThrow: () => value,
  orElse: () => Some(value),
  orNull: () => value,
  map: <U extends Type>(f: (value: T) => U) => Some(f(value)),
  filter(predicate: (value: T) => boolean) {
    if (predicate(value)) {
      return Some<T>(value) // type narrowing
    } else {
      return NONE as unknown as Option<T>
    }
  },
  fold: <U extends Type>(_onNone: () => U, onSome: (value: T) => U) => {
    return onSome(value)
  },
  flatMap: <U extends Type>(f: (value: T) => Option<U>) => f(value),
  reduce: <U>(f: (acc: U, value: T) => U) => f(undefined as never, value),
  reduceRight: <U>(f: (acc: U, value: T) => U) => f(undefined as never, value),
  foldLeft:
    <B>(z: B) =>
    (op: (b: B, a: T) => B) =>
      op(z, value),
  foldRight:
    <B>(z: B) =>
    (op: (a: T, b: B) => B) =>
      op(value, z),
  toList: () => List<T>([value]),
  contains: (val: T) => val === value,
  size: 1,
  toEither: <E>(_left: E) => Right<E, T>(value),
  toString: () => `Some(${stringify(value)})`,
  toValue: () => ({ _tag: "Some", value }),
})

const NONE: Option<never> = {
  _tag: "None",
  value: undefined as never,
  isEmpty: true,
  get: () => {
    throw new Error("Cannot call get() on None")
  },
  getOrElse: <T>(defaultValue: T) => defaultValue,
  getOrThrow<T>(error: Error): T {
    throw error
  },
  orElse: <T>(alternative: Option<T>) => alternative,
  orNull: () => null,
  map: <U extends Type>(f: (value: never) => U) => NONE as unknown as Option<U>,
  filter(_predicate: (value: never) => boolean): Option<never> {
    return NONE
  },
  flatMap: <U extends Type>(f: (value: never) => Option<U>) => NONE as unknown as Option<U>,
  reduce: () => undefined as never,
  reduceRight: () => undefined as never,
  fold: <U extends Type>(onNone: () => U, _onSome: (value: never) => U) => {
    return onNone()
  },
  foldLeft:
    <B>(z: B) =>
    () =>
      z,
  foldRight:
    <B>(z: B) =>
    () =>
      z,
  toList: () => List([]),
  contains: () => false,
  size: 0,
  toEither: <E>(left: E) => Left<E, never>(left),
  toString: () => "None",
  toValue: () => ({ _tag: "None", value: undefined as never }),
}

export const None = <T extends Type>(): Option<T> => NONE as unknown as Option<T>

export const Option = <T extends Type>(value: T | null | undefined): Option<T> =>
  value !== null && value !== undefined ? Some<T>(value) : None<T>()

Option.from = <T>(value: T) => Option(value)
Option.none = <T>() => None<T>()
