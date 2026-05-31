import { Companion } from "@/companion/Companion"
import type { Either } from "@/either/Either"

import { DecoderCompanion } from "./DecoderCompanion"
import type { DecoderError } from "./DecoderError"
import { tagged } from "./tagged"

export type { DecoderErrorComposite, DecoderErrorLeaf } from "./DecoderError"
export { DecoderError } from "./DecoderError"

/**
 * A `Decoder<A>` converts an `unknown` value into either a typed `A` or a
 * structural `DecoderError`. The shape `(raw) => Either<DecoderError, A>` is
 * the canonical FP decoder contract (cf. circe `Decoder`, fp-ts `Decoder`,
 * Effect-TS `Schema.decodeUnknownEither`, Elm `Json.Decode.Decoder`).
 *
 * Any function matching this signature IS a decoder — there is no plugin
 * registration. Zod / TypeBox / Valibot / AJV / hand-rolled adapters are
 * ~15 lines each. The bundled combinators in the `Decoder` value namespace
 * cover the functype-aware cases (Option, Either, List, etc.) that a
 * generic schema library cannot express.
 */
export type Decoder<A> = (raw: unknown) => Either<DecoderError, A>

/**
 * Decoder namespace: combinators for converting `unknown` into typed values.
 *
 * - `Decoder.string` / `.number` / `.boolean` / `.unknown` / `.nullable(inner)` — leaf primitives
 * - `Decoder.option(inner)` — null-bias Option (null → None, else inner → Some)
 * - `Decoder.either.envelope({ok, err})` / `.discriminated({...}, l, r)` — Either variants
 * - `Decoder.list(inner)` / `.array(inner)` / `.map(inner)` / `.object(shape)` — composites; accumulate child failures
 * - `Decoder.tagged.option/either/try/list/map/obj(inner?)` — round-trip the `{_tag, value}` shape
 *   used by functype's built-in `.toJSON()` (for functype-to-functype services)
 */
export const Decoder = Companion({} as { readonly _tag: "Decoder" }, {
  ...DecoderCompanion,
  tagged,
})
