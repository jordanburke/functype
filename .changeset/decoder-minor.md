---
"functype": minor
---

`Decoder<T>` API for HTTP responses + request-side ADT flatten bugfix.

**New (additive):**

- `functype/decoder` module: `Decoder<A> = (raw: unknown) => Either<DecoderError, A>` with recursive `DecoderError` (Leaf | Composite) that mirrors input structure on multi-field failures. Effect-TS Schema-style design — accumulation lives in the error data, not in the wrapper.
- Primitives: `Decoder.string`, `Decoder.number`, `Decoder.boolean`, `Decoder.unknown`, `Decoder.nullable`.
- ADT decoders (null-bias by default): `Decoder.option`, `Decoder.either.envelope`, `Decoder.either.discriminated`, `Decoder.list`, `Decoder.array`, `Decoder.map`, `Decoder.object`.
- Tagged round-trip variants: `Decoder.tagged.option/either/try/list/map/obj` — wraps existing `fromJSON` companions for functype-to-functype services that round-trip the `{_tag, value}` shape.
- `HttpRequestOptions.decode?: Decoder<T>` — Either-returning decoder. Maps `Left(DecoderError)` to `HttpError.DecodeError(cause: DecoderError)` preserving structural failure info.
- `HttpRequestOptions.flatten?: boolean` (default `true`) — opt out to emit each ADT's canonical `{_tag, value}` shape via `toValue()` instead of flattening to primitives.

**Bug fix (request-side default behavior):**

Request bodies containing functype ADTs now flatten to primitives by default — `Option` → nullable, `List` → array, `Either` → right-value (Left throws as programmer error), `Try` → success-value (Failure throws), `Map` (string-keyed) → record. The previous behavior was producing messy `JSON.stringify`-of-property-bag output (e.g. `{age: Option(30)}` would serialize as `{"age":{"_tag":"Some","value":30,"isEmpty":false,"size":1}}` since only `Either` had a `toJSON()` method) — broken for the 95%-case of external REST APIs.

If you were intentionally relying on the prior tagged-emission behavior for functype-to-functype services, pass `flatten: false` per request to opt into the canonical `{_tag, value}` shape (now produced explicitly via each ADT's `toValue()`, not via `JSON.stringify` accident) and use `Decoder.tagged.*` on the response side for round-trips.

**Deprecated (still works):**

- `HttpRequestOptions.validate` is now `@deprecated`. Prefer `decode: Decoder<T>` for the Either-returning path; for throw-pattern adapters like Zod's `.parse`, use an adapter package (`functype-zod`'s `Decoder.fromZod(schema)` — separate release) or wrap the throwing function in a small custom decoder. `validate` is kept for full back-compat and will be removed in a future major release.

**Pluggability:** `Decoder<T>` is a plain function type. Anything matching `(raw: unknown) => Either<DecoderError, T>` IS a decoder — no plugin registration, no factory. Zod/TypeBox/Valibot/AJV/hand-rolled adapters are ~15 lines each. A first-party `functype-zod` adapter package will follow in a separate release.

**Naming note:** the recursive structural error type is called `DecoderError` (not `DecodeError`) to avoid collision with the existing `HttpError.DecodeError` variant — these are at different layers. `HttpError.DecodeError` is the HTTP-level wrapper; its `cause` field carries a `DecoderError` when the decode-path failed. The type alias `HttpError.ResponseDecodeError` is exported as a more descriptive synonym for the same variant.
