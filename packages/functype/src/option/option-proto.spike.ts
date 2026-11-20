/* eslint-disable functional/immutable-data -- a constructor fills in the object it just created */
// SPIKE (#276 §14): can define() type the full Some surface with no per-method annotations?
import { type DoResult } from "@/do/protocol"
import { type A, define, type Mutable } from "@/internal/define"
import { showValue } from "@/internal/stringify"
import { createSerializer } from "@/serialization"
import type { Widen } from "@/typeclass"
import type { Type } from "@/types"

import { List, type Option, Right, Try } from "../index"

export type SomeOf<T extends Type> = Option<T> & { readonly _tag: "Some"; readonly value: T; readonly isEmpty: false }

const NONE = undefined as unknown as Option<never> // spike stand-in

const SomeProto = define<SomeOf<A>>()("Some", {
  [Symbol.toStringTag]: "Option",
  isEmpty: false,
  size: 1,
  isSome(): this is Option<A> & { value: A; isEmpty: false } {
    return true
  },
  isNone(): this is Option<A> & { value: undefined; isEmpty: true } {
    return false
  },
  orElse() {
    return this.value
  },
  orThrow() {
    return this.value
  },
  expect() {
    return this.value
  },
  or() {
    return this
  },
  orNull() {
    return this.value
  },
  orUndefined() {
    return this.value
  },
  map(f) {
    return SomeSpike(f(this.value))
  },
  ap(ff) {
    return ff._tag === "Some" && ff.value ? SomeSpike(ff.value(this.value)) : NONE
  },
  filter(predicate) {
    return predicate(this.value) ? this : NONE
  },
  count(p) {
    return p(this.value) ? 1 : 0
  },
  find(p) {
    return p(this.value) ? this : NONE
  },
  exists(p) {
    return p(this.value)
  },
  every(p) {
    return p(this.value)
  },
  forEach(f) {
    f(this.value)
  },
  fold(_onNone, onSome) {
    return onSome(this.value)
  },
  async foldAsync(_onNone, onSome) {
    return onSome(this.value)
  },
  match(patterns) {
    return patterns.Some(this.value)
  },
  flatMap(f) {
    return f(this.value)
  },
  async flatMapAsync(f) {
    return f(this.value)
  },
  reduce<B>() {
    return this.value as unknown as Widen<A, B>
  },
  reduceRight<B>() {
    return this.value as unknown as Widen<A, B>
  },
  foldLeft(z) {
    return (op) => op(z, this.value)
  },
  foldRight(z) {
    return (op) => op(this.value, z)
  },
  contains(val) {
    return val === this.value
  },
  toList() {
    return List([this.value])
  },
  toArray() {
    return [this.value]
  },
  toOption() {
    return this
  },
  toEither() {
    return Right(this.value)
  },
  toTry() {
    return Try(() => this.value)
  },
  toPromise() {
    return Promise.resolve(this.value)
  },
  toString() {
    return `Some(${showValue(this.value)})`
  },
  toValue() {
    return { _tag: "Some", value: this.value }
  },
  toJSON() {
    return { "@functype": "Option", _tag: "Some", value: this.value }
  },
  pipe(f) {
    return f(this.value)
  },
  serialize() {
    return createSerializer("Option", "Some", this.value)
  },
  doUnwrap(): DoResult<A> {
    return { ok: true, value: this.value }
  },
})

export const SomeSpike = <T extends Type>(value: T): SomeOf<T> => {
  const o = Object.create(SomeProto) as Mutable<SomeOf<T>>
  o._tag = "Some"
  o.value = value
  return o
}
