import type { Either } from "@/either/Either"

import type { DecoderError } from "./DecoderError"

/**
 * A `Decoder<A>` converts an `unknown` value into either a typed `A` or a
 * structural `DecoderError`. The shape `(raw) => Either<DecoderError, A>` is
 * the canonical FP decoder contract (cf. circe `Decoder`, fp-ts `Decoder`,
 * Effect-TS `Schema.decodeUnknownEither`, Elm `Json.Decode.Decoder`).
 *
 * Any function matching this signature IS a decoder — there is no plugin
 * registration. Zod / TypeBox / Valibot / AJV / hand-rolled adapters are
 * ~15 lines each. The bundled combinators in `DecoderCompanion` cover the
 * functype-aware cases (Option, Either, List, etc.) that a generic schema
 * library cannot express.
 */
export type Decoder<A> = (raw: unknown) => Either<DecoderError, A>
