/* eslint-disable functional/immutable-data -- a constructor fills in the object it just created */
// SPIKE (#276 §14): define() with two type holes. L is the hole B, R is the hole A.
import { type DoResult } from "@/do/protocol"
import { type A, type B, define, type Mutable } from "@/internal/define"
import { showValue } from "@/internal/stringify"
import { List } from "@/list/List"
import { Some } from "@/option/Option"
import { createSerializer } from "@/serialization"
import { Try } from "@/try"
import type { Type } from "@/types"

import { type Either, Left, type LeftOf, type RightOf } from "./Either"

const pair = <X, Y>(x: X, y: Y): [X, Y] => [x, y]

const RightProto = define<RightOf<B, A>>()("Right", {
  [Symbol.toStringTag]: "Either",
  isLeft(): this is LeftOf<B, A> {
    return false
  },
  isRight(): this is RightOf<B, A> {
    return true
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
    return RightSpike(f(this.value))
  },
  ap(ff) {
    return ff._tag === "Right" ? RightSpike(ff.value(this.value)) : Left(ff.value)
  },
  async mapAsync(f) {
    return RightSpike(await f(this.value))
  },
  merge(other) {
    return other.isLeft() ? Left(other.value) : RightSpike(pair(this.value, other.value))
  },
  flatMap(f) {
    return f(this.value)
  },
  async flatMapAsync(f) {
    return f(this.value)
  },
  toOption() {
    return Some(this.value)
  },
  toList() {
    return List([this.value])
  },
  toEither() {
    return RightSpike(this.value)
  },
  toTry() {
    return Try(() => this.value)
  },
  toJSON() {
    return { "@functype": "Either", _tag: "Right", value: this.value }
  },
  toString() {
    return `Right(${showValue(this.value)})`
  },
  *[Symbol.iterator]() {
    yield this.value
  },
  *yield() {
    yield this.value
  },
  traverse(f) {
    const result = f(this.value)
    return result.isLeft() ? Left(result.value) : RightSpike([result.value])
  },
  tap(f) {
    f(this.value)
    return this
  },
  tapLeft() {
    return this
  },
  mapLeft() {
    return RightSpike(this.value)
  },
  filterOrElse(predicate, onUnsatisfied) {
    return predicate(this.value) ? this : Left(onUnsatisfied(this.value))
  },
  bimap(_fl, fr) {
    return RightSpike(fr(this.value))
  },
  fold(_onLeft, onRight) {
    return onRight(this.value)
  },
  async foldAsync(_onLeft, onRight) {
    return onRight(this.value)
  },
  foldLeft(z) {
    return (op) => op(z, this.value)
  },
  foldRight(z) {
    return (op) => op(this.value, z)
  },
  match(patterns) {
    return patterns.Right(this.value)
  },
  swap() {
    return Left(this.value)
  },
  toPromise() {
    return Promise.resolve(this.value)
  },
  toValue() {
    return { _tag: "Right", value: this.value }
  },
  pipeEither(_onLeft, onRight) {
    return onRight(this.value)
  },
  pipe(f) {
    return f(this.value)
  },
  serialize() {
    return createSerializer("Either", "Right", this.value)
  },
  contains(v) {
    return this.value === v
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
  doUnwrap(): DoResult<A> {
    return { ok: true, value: this.value }
  },
})

export const RightSpike = <L extends Type, R extends Type>(value: R): RightOf<L, R> => {
  const o = Object.create(RightProto) as Mutable<RightOf<L, R>>
  o._tag = "Right"
  o.value = value
  return o
}

export const check: Either<string, number> = RightSpike<string, number>(1).map((x) => x + 1)
