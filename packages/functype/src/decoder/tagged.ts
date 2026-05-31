import { type Either, Left, Right } from "@/either/Either"
import { List } from "@/list/List"
import { Map as FMap } from "@/map/Map"
import { None, type Option, Some } from "@/option/Option"
import type { Try as TryType } from "@/try/Try"
import { Try } from "@/try/Try"

import type { Decoder } from "./Decoder"
import { DecoderError } from "./DecoderError"

/**
 * Decoders for the *tagged* wire format that functype ADTs emit via their
 * built-in `.toJSON()` methods (e.g. `Option(30).toJSON()` → `{_tag: "Some", value: 30}`).
 *
 * Use these on the response side of a **functype-to-functype** service where you
 * also pass `flatten: false` on the request so the wire round-trips the same
 * shape. For external APIs, prefer the null-bias decoders in `DecoderCompanion`
 * (`Decoder.option`, `Decoder.either.envelope`, etc.).
 */

const nestUnder = (segment: string, e: DecoderError): DecoderError => DecoderError.prepend(segment, e)

const indexUnder = (segment: string, index: number, e: DecoderError): DecoderError =>
  DecoderError.prepend(segment, DecoderError.prepend(`[${index}]`, e))

const taggedOption =
  <A>(inner: Decoder<A>): Decoder<Option<A>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], "expected tagged Option object", { received: raw }))
    }
    const obj = raw as { _tag?: unknown; value?: unknown }
    if (obj._tag === "None") return Right(None<A>())
    if (obj._tag === "Some") {
      return inner(obj.value).fold<Either<DecoderError, Option<A>>>(
        (e) => Left(nestUnder("value", e)),
        (a) => Right(Some(a)),
      )
    }
    return Left(DecoderError.leaf(["_tag"], "expected 'Some' or 'None'", { received: obj._tag }))
  }

const taggedEither =
  <L, R>(left: Decoder<L>, right: Decoder<R>): Decoder<Either<L, R>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], "expected tagged Either object", { received: raw }))
    }
    const obj = raw as { _tag?: unknown; value?: unknown }
    if (obj._tag === "Right") {
      return right(obj.value).fold<Either<DecoderError, Either<L, R>>>(
        (e) => Left(nestUnder("value", e)),
        (r) => Right(Right<L, R>(r)),
      )
    }
    if (obj._tag === "Left") {
      return left(obj.value).fold<Either<DecoderError, Either<L, R>>>(
        (e) => Left(nestUnder("value", e)),
        (l) => Right(Left<L, R>(l)),
      )
    }
    return Left(DecoderError.leaf(["_tag"], "expected 'Left' or 'Right'", { received: obj._tag }))
  }

const taggedTry =
  <A>(inner: Decoder<A>): Decoder<TryType<A>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], "expected tagged Try object", { received: raw }))
    }
    const obj = raw as { _tag?: unknown; value?: unknown; error?: unknown; stack?: unknown }
    if (obj._tag === "Success") {
      return inner(obj.value).fold<Either<DecoderError, TryType<A>>>(
        (e) => Left(nestUnder("value", e)),
        (a) => Right(Try.success(a)),
      )
    }
    if (obj._tag === "Failure") {
      const message = typeof obj.error === "string" ? obj.error : "unknown error"
      const err = new Error(message)
      if (typeof obj.stack === "string") err.stack = obj.stack
      return Right(Try.failure<A>(err))
    }
    return Left(DecoderError.leaf(["_tag"], "expected 'Success' or 'Failure'", { received: obj._tag }))
  }

const taggedList =
  <A>(inner: Decoder<A>): Decoder<List<A>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], "expected tagged List object", { received: raw }))
    }
    const obj = raw as { _tag?: unknown; value?: unknown }
    if (obj._tag !== "List") {
      return Left(DecoderError.leaf(["_tag"], "expected 'List'", { received: obj._tag }))
    }
    if (!Array.isArray(obj.value)) {
      return Left(DecoderError.leaf(["value"], "expected array", { received: obj.value }))
    }
    const errors: DecoderError[] = []
    const out: A[] = []
    obj.value.forEach((item, i) => {
      inner(item).fold(
        (e) => {
          errors.push(indexUnder("value", i, e))
        },
        (v) => {
          out.push(v)
        },
      )
    })
    if (errors.length === 0) return Right(List(out))
    if (errors.length === 1) return Left(errors[0]!)
    return Left(DecoderError.composite([], List(errors)))
  }

const taggedMap =
  <V>(inner: Decoder<V>): Decoder<FMap<string, V>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], "expected tagged Map object", { received: raw }))
    }
    const obj = raw as { _tag?: unknown; value?: unknown }
    if (obj._tag !== "Map") {
      return Left(DecoderError.leaf(["_tag"], "expected 'Map'", { received: obj._tag }))
    }
    if (!Array.isArray(obj.value)) {
      return Left(DecoderError.leaf(["value"], "expected entries array", { received: obj.value }))
    }
    const errors: DecoderError[] = []
    const entries: Array<[string, V]> = []
    obj.value.forEach((pair, i) => {
      if (!Array.isArray(pair) || pair.length !== 2) {
        errors.push(DecoderError.leaf(["value", `[${i}]`], "expected [key, value] tuple", { received: pair }))
        return
      }
      const [k, v] = pair
      if (typeof k !== "string") {
        errors.push(DecoderError.leaf(["value", `[${i}]`, "[0]"], "expected string key", { received: k }))
        return
      }
      inner(v).fold(
        (e) => {
          errors.push(DecoderError.prepend("value", DecoderError.prepend(`[${i}]`, DecoderError.prepend("[1]", e))))
        },
        (decoded) => {
          entries.push([k, decoded])
        },
      )
    })
    if (errors.length === 0) return Right(FMap<string, V>(entries))
    if (errors.length === 1) return Left(errors[0]!)
    return Left(DecoderError.composite([], List(errors)))
  }

const taggedObj =
  <T extends Record<string, unknown>>(shape: { [K in keyof T]: Decoder<T[K]> }): Decoder<T> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], "expected tagged Obj object", { received: raw }))
    }
    const obj = raw as { _tag?: unknown; value?: unknown }
    if (obj._tag !== "Obj") {
      return Left(DecoderError.leaf(["_tag"], "expected 'Obj'", { received: obj._tag }))
    }
    if (typeof obj.value !== "object" || obj.value === null) {
      return Left(DecoderError.leaf(["value"], "expected object", { received: obj.value }))
    }
    const inner = obj.value as Record<string, unknown>
    const errors: DecoderError[] = []
    const out: Partial<T> = {}
    for (const key in shape) {
      shape[key](inner[key]).fold(
        (e) => {
          errors.push(DecoderError.prepend("value", DecoderError.prepend(key, e)))
        },
        (v) => {
          out[key] = v
        },
      )
    }
    if (errors.length === 0) return Right(out as T)
    if (errors.length === 1) return Left(errors[0]!)
    return Left(DecoderError.composite([], List(errors)))
  }

export const tagged = {
  option: taggedOption,
  either: taggedEither,
  try: taggedTry,
  list: taggedList,
  map: taggedMap,
  obj: taggedObj,
}
