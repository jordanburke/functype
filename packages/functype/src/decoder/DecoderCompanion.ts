import { type Either, Left, Right } from "@/either/Either"
import { List } from "@/list/List"
import { Map as FMap } from "@/map/Map"
import { None, type Option, Some } from "@/option/Option"

import type { Decoder } from "./Decoder"
import { DecoderError } from "./DecoderError"

// --- primitive leaf decoders -------------------------------------------------

const string: Decoder<string> = (raw) =>
  typeof raw === "string" ? Right(raw) : Left(DecoderError.leaf([], "expected string", { received: raw }))

const number: Decoder<number> = (raw) =>
  typeof raw === "number" ? Right(raw) : Left(DecoderError.leaf([], "expected number", { received: raw }))

const boolean: Decoder<boolean> = (raw) =>
  typeof raw === "boolean" ? Right(raw) : Left(DecoderError.leaf([], "expected boolean", { received: raw }))

const unknownDecoder: Decoder<unknown> = (raw) => Right(raw)

const nullable =
  <A>(inner: Decoder<A>): Decoder<A | null> =>
  (raw) =>
    raw === null || raw === undefined ? Right(null) : inner(raw)

// --- ADT decoders (null-bias by default) ------------------------------------

const option =
  <A>(inner: Decoder<A>): Decoder<Option<A>> =>
  (raw) => {
    if (raw === null || raw === undefined) return Right(None<A>())
    return inner(raw).fold<Either<DecoderError, Option<A>>>(
      (e) => Left(e),
      (a) => Right(Some(a)),
    )
  }

/**
 * Envelope-shaped Either decoder: expects `{ok: R}` for Right or `{err: L}` for Left.
 * Most APIs use HTTP status for errors rather than encoding Either in the body;
 * use this only when the response body genuinely contains a discriminated success/failure
 * envelope.
 */
const eitherEnvelope =
  <L, R>(shape: { ok: Decoder<R>; err: Decoder<L> }): Decoder<Either<L, R>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], "expected envelope object {ok|err}", { received: raw }))
    }
    const obj = raw as Record<string, unknown>
    if ("ok" in obj) {
      return shape.ok(obj.ok).fold<Either<DecoderError, Either<L, R>>>(
        (e) => Left(DecoderError.prepend("ok", e)),
        (r) => Right(Right<L, R>(r)),
      )
    }
    if ("err" in obj) {
      return shape.err(obj.err).fold<Either<DecoderError, Either<L, R>>>(
        (e) => Left(DecoderError.prepend("err", e)),
        (l) => Right(Left<L, R>(l)),
      )
    }
    return Left(DecoderError.leaf([], "expected envelope to have 'ok' or 'err' key", { received: raw }))
  }

/**
 * Discriminated-union Either decoder: looks at a tag field to choose left vs right.
 * Example: `Decoder.either.discriminated({tag: "type", leftTag: "failure", rightTag: "success"}, ...)`.
 */
const eitherDiscriminated =
  <L, R>(
    config: { tag: string; leftTag: string; rightTag: string },
    left: Decoder<L>,
    right: Decoder<R>,
  ): Decoder<Either<L, R>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return Left(DecoderError.leaf([], `expected object with '${config.tag}' tag`, { received: raw }))
    }
    const obj = raw as Record<string, unknown>
    const tag = obj[config.tag]
    if (tag === config.rightTag) {
      return right(raw).fold<Either<DecoderError, Either<L, R>>>(
        (e) => Left(e),
        (r) => Right(Right<L, R>(r)),
      )
    }
    if (tag === config.leftTag) {
      return left(raw).fold<Either<DecoderError, Either<L, R>>>(
        (e) => Left(e),
        (l) => Right(Left<L, R>(l)),
      )
    }
    return Left(
      DecoderError.leaf([], `expected '${config.tag}' to be '${config.rightTag}' or '${config.leftTag}'`, {
        received: tag,
      }),
    )
  }

const either = {
  envelope: eitherEnvelope,
  discriminated: eitherDiscriminated,
}

const list =
  <A>(inner: Decoder<A>): Decoder<List<A>> =>
  (raw) => {
    if (!Array.isArray(raw)) return Left(DecoderError.leaf([], "expected array", { received: raw }))
    const errors: DecoderError[] = []
    const out: A[] = []
    raw.forEach((item, i) => {
      inner(item).fold(
        (e) => {
          errors.push(DecoderError.prepend(`[${i}]`, e))
        },
        (v) => {
          out.push(v)
        },
      )
    })
    return collect(errors, () => List(out))
  }

const array =
  <A>(inner: Decoder<A>): Decoder<A[]> =>
  (raw) => {
    if (!Array.isArray(raw)) return Left(DecoderError.leaf([], "expected array", { received: raw }))
    const errors: DecoderError[] = []
    const out: A[] = []
    raw.forEach((item, i) => {
      inner(item).fold(
        (e) => {
          errors.push(DecoderError.prepend(`[${i}]`, e))
        },
        (v) => {
          out.push(v)
        },
      )
    })
    return collect(errors, () => out)
  }

const mapDecoder =
  <V>(inner: Decoder<V>): Decoder<FMap<string, V>> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return Left(DecoderError.leaf([], "expected object (for Map)", { received: raw }))
    }
    const obj = raw as Record<string, unknown>
    const errors: DecoderError[] = []
    const entries: Array<[string, V]> = []
    for (const key of Object.keys(obj)) {
      inner(obj[key]).fold(
        (e) => {
          errors.push(DecoderError.prepend(key, e))
        },
        (v) => {
          entries.push([key, v])
        },
      )
    }
    return collect(errors, () => FMap<string, V>(entries))
  }

const object =
  <T extends Record<string, unknown>>(shape: { [K in keyof T]: Decoder<T[K]> }): Decoder<T> =>
  (raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return Left(DecoderError.leaf([], "expected object", { received: raw }))
    }
    const obj = raw as Record<string, unknown>
    const errors: DecoderError[] = []
    const out: Partial<T> = {}
    for (const key in shape) {
      shape[key](obj[key]).fold(
        (e) => {
          errors.push(DecoderError.prepend(key, e))
        },
        (v) => {
          out[key] = v
        },
      )
    }
    return collect(errors, () => out as T)
  }

// --- internal helpers --------------------------------------------------------

/**
 * Either-construct from a list of accumulated errors. If empty, returns `Right(buildValue())`.
 * If one error, unwraps to that single Leaf/Composite (cleaner error message). If many,
 * wraps in a Composite with no root path (the children carry their own paths).
 */
const collect = <A>(errors: DecoderError[], buildValue: () => A): Either<DecoderError, A> => {
  if (errors.length === 0) return Right(buildValue())
  if (errors.length === 1) return Left(errors[0]!)
  return Left(DecoderError.composite([], List(errors)))
}

// --- public companion --------------------------------------------------------

export const DecoderCompanion = {
  string,
  number,
  boolean,
  unknown: unknownDecoder,
  nullable,
  option,
  either,
  list,
  array,
  map: mapDecoder,
  object,
}
