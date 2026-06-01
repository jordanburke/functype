/**
 * The headline 1.2.0 public API for universal serialization.
 *
 * `Serialization.deserialize` parses a JSON string and walks the result,
 * reconstructing any object carrying a `@functype` marker via the per-type
 * companion's `fromJSON`. Plain JSON values pass through untouched.
 * `Serialization.serialize` is a thin convenience over `JSON.stringify` —
 * functype instances self-stringify via their instance `toJSON()` method
 * (which emits the `@functype`-marked envelope), so the standard
 * `JSON.stringify` protocol does the recursion for free.
 *
 * `Serialization.isFunctypeValue` is a runtime type guard for live values,
 * useful when wrapping this API in a host serializer (e.g. a DBOS
 * `stringify`/`parse` recipe — see docs/proposals/universal-deserialize.md).
 *
 * Strict unknown-marker policy: a JSON value carrying an `@functype` marker
 * that doesn't match any known type returns `Failure` from `deserialize`.
 * No silent pass-through. (Plain JSON values without the marker are NOT
 * "unknown" — they just aren't ours; those walk through unchanged.)
 *
 * See `docs/proposals/universal-deserialize.md` for the design rationale.
 */

import { Task } from "@/core/task/Task"
import { Left, Right } from "@/either/Either"
import { Lazy } from "@/lazy/Lazy"
import { LazyList } from "@/list/LazyList"
import { List } from "@/list/List"
import { Map as FunctypeMap } from "@/map/Map"
import { Obj } from "@/obj/Obj"
import { None, Some } from "@/option/Option"
import type { Serializable } from "@/serializable/Serializable"
import { Set as FunctypeSet } from "@/set/Set"
import { Stack } from "@/stack/Stack"
import { Try } from "@/try/Try"
import { Tuple } from "@/tuple/Tuple"

import { deserializeError, type SerializedError } from "./error-envelope"
import { FUNCTYPE_MARKER } from "./SerializationCompanion"

/**
 * The canonical JSON value type — anything `JSON.parse` can return and
 * anything `JSON.stringify` can accept as input. Used by `toEnvelope` /
 * `fromEnvelope` to express the contract precisely: the envelope is a
 * structured JSON shape, not opaque `unknown`. Lets consumers wiring this
 * API into another structured serializer (SuperJSON, DBOS custom
 * transformers) slot it in without a cast at the boundary.
 *
 * Added in 1.2.2 — `toEnvelope`/`fromEnvelope` previously typed input/output
 * as `unknown`, which forced a cast at the consumer side.
 */
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }

/**
 * A reconstructor takes an already-revived parsed envelope object (with any
 * nested functype values already materialized into instances) and produces the
 * outer functype value. Distinct from each type's public `fromJSON(string)` —
 * the string-form would re-stringify our already-revived inner instances
 * (via their `toJSON`), losing the reconstruction.
 */
type Reconstructor = (parsed: { _tag?: string; [key: string]: unknown }) => unknown

let reconstructorCache: Record<string, Reconstructor> | undefined
const getReconstructors = (): Record<string, Reconstructor> => {
  if (reconstructorCache !== undefined) return reconstructorCache
  reconstructorCache = {
    Option: (p) => (p._tag === "Some" ? Some(p.value) : None()),
    Either: (p) => (p._tag === "Right" ? Right(p.value) : Left(p.value)),
    Try: (p) => {
      if (p._tag === "Success") return Try.success(p.value)
      const err =
        p.error !== undefined && typeof p.error === "object"
          ? deserializeError(p.error as SerializedError)
          : new Error(typeof p.error === "string" ? p.error : "")
      return Try.failure(err)
    },
    List: (p) => List(p.value as unknown[]),
    Set: (p) => FunctypeSet(p.value as unknown[]),
    Map: (p) => FunctypeMap(p.value as Array<[unknown, unknown]>),
    Obj: (p) => Obj(p.value as Record<string, unknown>),
    Stack: (p) => Stack(p.value as unknown[]),
    Tuple: (p) => Tuple(p.value as unknown[]),
    LazyList: (p) => LazyList(p.value as unknown[]),
    Lazy: (p) => {
      if (p.error !== undefined) {
        const err =
          typeof p.error === "object" ? deserializeError(p.error as SerializedError) : new Error(p.error as string)
        return Lazy.fail(err)
      }
      return Lazy.evaluated(p.value)
    },
    Task: (p) => {
      if (p._tag === "Ok") return Task.ok(p.value)
      const err =
        p.error !== undefined && typeof p.error === "object"
          ? deserializeError(p.error as SerializedError)
          : new Error(typeof p.error === "string" ? p.error : "Unknown Task error")
      return Task.err(err)
    },
  }
  return reconstructorCache
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const hasMarker = (v: unknown): v is Record<string, unknown> & { [FUNCTYPE_MARKER]: string } =>
  isPlainObject(v) && typeof (v as Record<string, unknown>)[FUNCTYPE_MARKER] === "string"

/**
 * Walk a parsed JSON value, reconstructing any functype envelope found.
 * Plain values, arrays, and objects without `@functype` markers walk through
 * unchanged (with recursion into their children). Objects with a known
 * `@functype` marker are passed through the matching `companion.fromJSON`.
 * Unknown markers throw — caught by `deserialize` and turned into Failure.
 */
const revive = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(revive)
  }
  if (hasMarker(value)) {
    const marker = value[FUNCTYPE_MARKER]
    const reconstruct = getReconstructors()[marker]
    if (reconstruct === undefined) {
      throw new Error(`Serialization.deserialize: unknown @functype marker ${JSON.stringify(marker)}`)
    }
    // Depth-first: revive children BEFORE handing the envelope to the
    // reconstructor, so nested functype values inside `value`/`error`
    // materialize as instances first. The reconstructor receives the parsed
    // envelope object directly (NOT a JSON string) — going through
    // JSON.stringify here would invoke each revived child's `toJSON`,
    // re-emitting the envelope shape and losing the reconstruction.
    const revived: Record<string, unknown> = {}
    for (const key of Object.keys(value)) {
      revived[key] = revive(value[key])
    }
    return reconstruct(revived)
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value)) {
      out[key] = revive(value[key])
    }
    return out
  }
  return value
}

/**
 * Reconstruct any value from a JSON string. Lenient codec: walks the parsed
 * structure and rebuilds any value carrying an `@functype` marker via the
 * dispatch table; plain JSON without the marker walks through unchanged.
 * Returns `Try` so malformed JSON or unknown markers are expressible values
 * rather than thrown — matches the functype convention for expected-failure
 * paths.
 *
 * **Pass-through policy:** valid JSON without an `@functype` marker is
 * returned verbatim as `Success(value)`; only marker-carrying values are
 * reconstructed. Only malformed JSON (or an unknown marker) yields `Failure`.
 * For a strict variant that rejects unmarked input, see `deserializeStrict`.
 *
 * @example
 *   const result = Serialization.deserialize('{"@functype":"Either","_tag":"Right","value":5}')
 *   result.fold(e => console.error(e), v => console.log(v))  // → Right(5)
 *
 *   // Plain (non-functype) values pass through:
 *   Serialization.deserialize('{"name":"alice","age":30}')  // → Success({name, age})
 *
 *   // Embedding in another structured serializer (SuperJSON, DBOS)? See
 *   // `fromEnvelope` — taking a string here forces the consumer through a
 *   // JSON.stringify shim and SuperJSON re-walks strings character-by-character.
 */
export const deserialize = (json: string): Try<unknown> => Try(() => revive(JSON.parse(json)))

/**
 * Strict variant of `deserialize`: returns `Failure` when the parsed JSON
 * doesn't carry an `@functype` marker at the top level. Use this at API,
 * queue, or RPC boundaries where the wire format MUST be a functype value
 * and pass-through silence would be a bug.
 *
 * Implementation note: only the top-level value is checked for the marker.
 * Nested values inside it follow the same lenient pass-through rules as
 * `deserialize` — a `Right` containing a plain object still reconstructs
 * fine, you just can't START with a plain object.
 *
 * @example
 *   Serialization.deserializeStrict('{"@functype":"Option","_tag":"Some","value":1}')  // → Success(Some(1))
 *   Serialization.deserializeStrict('{"_tag":"Some","value":1}')                       // → Failure
 *   Serialization.deserializeStrict('42')                                              // → Failure
 */
export const deserializeStrict = (json: string): Try<unknown> =>
  Try(() => {
    const parsed: unknown = JSON.parse(json)
    if (!hasMarker(parsed)) {
      throw new Error(
        "Serialization.deserializeStrict: input is not a functype envelope (no @functype marker at the top level)",
      )
    }
    return revive(parsed)
  })

/**
 * Serialize any value to a JSON string. Lenient codec: thin convenience over
 * `JSON.stringify` — functype instances self-stringify via their instance
 * `toJSON()` method (which emits the `@functype`-marked envelope), and
 * non-functype values pass through as plain JSON. Nested functype values
 * embedded in plain objects/arrays serialize correctly via the standard
 * JSON.stringify protocol with no walker needed.
 *
 * `undefined` is converted to `null` (matching the convention DBOS and
 * SuperJSON use; `JSON.stringify(undefined)` returns the string `"undefined"`
 * which is not valid JSON).
 */
export const serialize = (value: unknown): string => JSON.stringify(value ?? null)

/**
 * Serialize a value to a parsed JSON envelope (object/array/primitive) rather
 * than a string. Use this when nesting functype values inside another
 * **structured** serializer (SuperJSON / DBOS custom transformers / similar)
 * whose custom-transformer hook expects JSON values, not strings — passing a
 * string to such a hook causes the host to re-walk it character-by-character,
 * destroying the round-trip.
 *
 * Equivalent to `JSON.parse(serialize(value))` but exposed as a named entry
 * point so consumers don't carry the parse/stringify shim.
 *
 * Returns `JSONValue` (tightened from `unknown` in 1.2.2) so consumers can
 * drop the result straight into a host serializer's `serialize` hook without
 * a boundary cast.
 *
 * @example
 *   // Inside a DBOS custom serialization recipe — zero casts:
 *   DBOS.registerSerialization({
 *     name: "functype",
 *     isApplicable: Serialization.isFunctypeValue,
 *     serialize:   Serialization.toEnvelope,
 *     deserialize: (o) => Serialization.fromEnvelope(o).orThrow(),
 *   })
 */
export const toEnvelope = (value: unknown): JSONValue => JSON.parse(JSON.stringify(value ?? null)) as JSONValue

/**
 * Inverse of `toEnvelope`: reconstruct any value from a parsed JSON envelope
 * (object/array/primitive). Equivalent to `deserialize(JSON.stringify(envelope))`
 * but skips the stringify/parse roundtrip — the same `revive` walker is
 * applied directly. Returns `Try` for the same reasons as `deserialize`.
 *
 * Pass-through policy matches `deserialize`: a parsed value without an
 * `@functype` marker is returned verbatim as `Success(value)`.
 *
 * Input is `unknown` (intentionally permissive — Postel's law). Host
 * serializers typically hand the deserialize callback a JSON-shaped value
 * that they parsed themselves, but their callback typing varies (some are
 * `JSONValue`, some are `unknown`, some are `any`). Accepting `unknown`
 * here means the function slots into any host shape without forcing a
 * cast at the consumer site.
 */
export const fromEnvelope = (envelope: unknown): Try<unknown> => Try(() => revive(envelope))

/**
 * Runtime guard: is this a live functype Serializable? Checks for the
 * `serialize()` method plus the `_tag` field that every Serializable instance
 * carries. Use this when wrapping `serialize`/`deserialize` in a host
 * serializer that needs to distinguish functype values from foreign data
 * (e.g. `isApplicable` in a DBOS recipe).
 */
export const isFunctypeValue = (v: unknown): v is Serializable<unknown> =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as { serialize?: unknown }).serialize === "function" &&
  typeof (v as { _tag?: unknown })._tag === "string"
