import { Functor, Type } from "../functor"
import { Traversable } from "../index"
import { _Iterable_, Seq } from "../iterable"
import { Typeable } from "../typeable/Typeable"

export type Option<T extends Type> = {
  readonly _tag: "Some" | "None"
  readonly value: T | undefined
  isEmpty: boolean
  get(): T
  getOrElse(defaultValue: T): T
  orElse(alternative: Option<T>): Option<T>
  map<U extends Type>(f: (value: T) => U): Option<U>
  flatMap<U extends Type>(f: (value: T) => Option<U>): Option<U>
  reduce<U>(f: (acc: U, value: T) => U): U
  reduceRight<U>(f: (acc: U, value: T) => U): U
  foldLeft<B>(z: B): (op: (b: B, a: T) => B) => B
  foldRight<B>(z: B): (op: (a: T, b: B) => B) => B
  toList(): _Iterable_<T>
  contains(value: T): boolean
  size: number
  valueOf(): { _tag: "Some" | "None"; value?: T }
  toString(): string
} & Traversable<T> &
  Functor<T> &
  Typeable<"Some" | "None">

export const Some = <T extends Type>(value: T): Option<T> => ({
  _tag: "Some",
  value,
  isEmpty: false,
  get: () => value,
  getOrElse: () => value,
  orElse: () => Some(value),
  map: <U extends Type>(f: (value: T) => U) => Some(f(value)),
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
  toList: () => Seq<T>([value]),
  contains: (val: T) => val === value,
  size: 1,
  valueOf: () => ({ _tag: "Some", value }),
  toString: () => `Some(${JSON.stringify(value)})`,
})

const NONE: Option<never> = {
  _tag: "None",
  value: undefined,
  isEmpty: true,
  get: () => {
    throw new Error("Cannot call get() on None")
  },
  getOrElse: <T>(defaultValue: T) => defaultValue,
  orElse: <T>(alternative: Option<T>) => alternative,
  map: () => NONE,
  flatMap: () => NONE,
  reduce: () => undefined as never,
  reduceRight: () => undefined as never,
  foldLeft:
    <B>(z: B) =>
    () =>
      z,
  foldRight:
    <B>(z: B) =>
    () =>
      z,
  toList: () => Seq([]),
  contains: () => false,
  size: 0,
  valueOf: () => ({ _tag: "None" }),
  toString: () => "None",
}

export const None = <T extends Type>(): Option<T> => NONE as Option<T>

export const Option = <T extends Type>(value: T | null | undefined): Option<T> =>
  value !== null && value !== undefined ? Some(value) : None()

export const match = <T extends Type, U>(option: Option<T>, patterns: { Some: (value: T) => U; None: () => U }): U =>
  option._tag === "Some" ? patterns.Some(option.value as T) : patterns.None()
