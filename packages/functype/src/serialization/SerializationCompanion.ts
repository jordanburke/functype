import { base64ToUtf8, utf8ToBase64 } from "@/internal/base64"

/**
 * Serialization result containing methods for different formats
 */
export interface SerializationResult {
  /** Serializes to JSON string */
  toJSON: () => string
  /** Serializes to base64-encoded binary string */
  toBinary: () => string
}

/**
 * The namespaced marker stamped on every functype envelope. Defends against
 * `_tag` collisions with Effect/fp-ts (which use identical strings like
 * `"Some"`, `"Left"`, `"Success"`). A value WITHOUT this marker is treated
 * as "not ours" by `Serialization.deserialize`.
 *
 * See `docs/archive/proposals/universal-deserialize-changes.md` Change 0 for the
 * full rationale.
 */
export const FUNCTYPE_MARKER = "@functype" as const

/**
 * Shape of every functype JSON envelope. The marker identifies the type,
 * `_tag` (when present) discriminates variants within that type, and the
 * remaining payload fields are type-specific (`value` for canonical cases,
 * `error` for failure branches, etc.).
 */
export type FunctypeEnvelope = {
  readonly [FUNCTYPE_MARKER]: string
  readonly _tag?: string
  readonly [key: string]: unknown
}

/**
 * Build the canonical `{@functype, _tag, value}` envelope OBJECT used by both
 * the instance `toJSON()` (which returns it directly so native JSON.stringify
 * can recurse) and the `serialize().toJSON()` method (which stringifies it).
 *
 * `_tag` is always emitted — variant-less types pass the same string for
 * marker and tag (default behavior when tag is omitted). Keeping `_tag`
 * across the board preserves back-compat for readers that did
 * `if (parsed._tag === "List")` against 1.1.0 envelopes.
 *
 * @param marker - The `@functype` type marker, e.g. `"Either"`, `"Option"`.
 * @param tag - The variant discriminator, e.g. `"Right"`, `"Some"`. Defaults
 *              to `marker` for types without variants (List, Map, etc.).
 * @param value - The payload.
 */
export const envelope = (marker: string, tag: string | undefined, value: unknown): FunctypeEnvelope => ({
  [FUNCTYPE_MARKER]: marker,
  _tag: tag ?? marker,
  value,
})

/**
 * Build a non-canonical envelope where the payload doesn't fit the standard
 * `{value}` shape — e.g. `Try.Failure` carries `{error: SerializedError}`,
 * `Lazy`-with-thrown-thunk carries the same.
 *
 * @param marker - The `@functype` type marker.
 * @param tag - The variant discriminator (may be the same as marker for
 *              variant-less types).
 * @param fields - Additional payload fields merged into the envelope.
 */
export const taggedEnvelope = (marker: string, tag: string, fields: Record<string, unknown>): FunctypeEnvelope => ({
  [FUNCTYPE_MARKER]: marker,
  _tag: tag,
  ...fields,
})

/**
 * Creates a serializer for the canonical envelope shape, with the `@functype`
 * marker stamped at the top level (Change 0 of the 1.2.0 universal-deserialize
 * work). Two forms:
 *
 *   createSerializer(marker, value)          // variant-less types (List, Map, …)
 *   createSerializer(marker, tag, value)     // variants (Either, Option, …)
 *
 * Variant-less envelopes are `{"@functype": marker, value}`. Variant envelopes
 * are `{"@functype": marker, _tag: tag, value}`.
 */
export function createSerializer(marker: string, value: unknown): SerializationResult
export function createSerializer(marker: string, tag: string, value: unknown): SerializationResult
export function createSerializer(marker: string, tagOrValue: unknown, maybeValue?: unknown): SerializationResult {
  const isVariantForm = arguments.length === 3
  const tag = isVariantForm ? (tagOrValue as string) : marker
  const value = isVariantForm ? maybeValue : tagOrValue
  const env = envelope(marker, tag, value)
  return {
    toJSON: () => JSON.stringify(env),
    toBinary: () => utf8ToBase64(JSON.stringify(env)),
  }
}

/**
 * Creates a serializer for non-canonical envelopes whose payload doesn't
 * fit the `{value}` shape — e.g. failure branches that carry a structured
 * `SerializedError`. The envelope still carries the `@functype` marker
 * and `_tag` discriminator.
 *
 * @param marker - The `@functype` type marker.
 * @param tag - The variant discriminator.
 * @param fields - The payload fields (merged after marker + tag).
 */
export const createTaggedSerializer = (
  marker: string,
  tag: string,
  fields: Record<string, unknown>,
): SerializationResult => {
  const env = taggedEnvelope(marker, tag, fields)
  return {
    toJSON: () => JSON.stringify(env),
    toBinary: () => utf8ToBase64(JSON.stringify(env)),
  }
}

/** A parsed envelope, from JSON or binary, before a companion rebuilds its type from it. */
export type ParsedEnvelope = { _tag?: string; [key: string]: unknown }

/**
 * Throws when an envelope carries another type's `@functype` marker. An envelope without a marker
 * passes, because envelopes written before 1.2.0 have none.
 * @param parsed - The parsed envelope
 * @param marker - The marker this companion reads, such as `"List"`
 * @param method - The calling method, named in the error, such as `"fromJSON"`
 */
export const expectMarker = (parsed: ParsedEnvelope, marker: string, method: string): void => {
  const found = parsed[FUNCTYPE_MARKER]
  if (found !== undefined && found !== marker) {
    throw new Error(`${marker}.${method}: expected @functype="${marker}", got ${JSON.stringify(found)}`)
  }
}

/**
 * Generic deserializer from JSON. The `reconstructor` receives the full
 * parsed envelope including any `@functype` marker; per-type companions
 * verify the marker matches their expected value.
 */
export const fromJSON = <T>(
  json: string,
  reconstructor: (parsed: { _tag?: string; [key: string]: unknown }) => T,
): T => {
  const parsed = JSON.parse(json) as { _tag?: string; [key: string]: unknown }
  return reconstructor(parsed)
}

/**
 * Generic deserializer from binary (base64-encoded JSON)
 * @param binary - The base64-encoded binary string
 * @param reconstructor - Function to reconstruct the type from parsed data
 * @returns Reconstructed instance
 */
export const fromBinary = <T>(
  binary: string,
  reconstructor: (parsed: { _tag?: string; [key: string]: unknown }) => T,
): T => {
  const json = base64ToUtf8(binary)
  return fromJSON(json, reconstructor)
}

/**
 * Creates companion serialization methods for a type
 * @param reconstructor - Function to reconstruct the type from parsed data
 * @returns Companion methods object with fromJSON and fromBinary
 */
export const createSerializationCompanion = <T>(
  reconstructor: (parsed: { _tag?: string; [key: string]: unknown }) => T,
) => ({
  fromJSON: (json: string) => fromJSON(json, reconstructor),
  fromBinary: (binary: string) => fromBinary(binary, reconstructor),
})
