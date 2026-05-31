import { Companion } from "@/companion/Companion"
import { List } from "@/list/List"

/**
 * Recursive decoder error.
 *
 * `Leaf` represents a single decode failure at some `path` in the input.
 * `Composite` aggregates child failures (one per failed field of an object,
 * one per failed element of a list, etc.) and mirrors the structural shape
 * of the input — making it possible to render `user.name: expected string`
 * alongside `user.age: expected number` from a single response.
 *
 * Accumulation lives in the data, not in the wrapper. Combinators in
 * `DecoderCompanion` (object/list/map) produce `Composite` when more than
 * one child decoder fails, unwrapping single-child composites back to a
 * `Leaf` for cleaner error messages. The plain `Either<DecoderError, A>`
 * return type of `Decoder<A>` keeps composition with the rest of the
 * library uniform.
 *
 * Named `DecoderError` (not `DecodeError`) to avoid collision with the
 * existing `HttpError.DecodeError` variant — these are at different layers:
 * the HTTP variant is the outer wrapper, this is the structural inner cause.
 */
export type DecoderError = DecoderErrorLeaf | DecoderErrorComposite

export type DecoderErrorLeaf = {
  readonly _tag: "Leaf"
  readonly path: ReadonlyArray<string>
  readonly message: string
  readonly cause?: unknown
}

export type DecoderErrorComposite = {
  readonly _tag: "Composite"
  readonly path: ReadonlyArray<string>
  readonly children: List<DecoderError>
}

const leaf = (path: ReadonlyArray<string>, message: string, cause?: unknown): DecoderErrorLeaf => ({
  _tag: "Leaf",
  path,
  message,
  cause,
})

const composite = (path: ReadonlyArray<string>, children: List<DecoderError>): DecoderErrorComposite => ({
  _tag: "Composite",
  path,
  children,
})

const isLeaf = (e: DecoderError): e is DecoderErrorLeaf => e._tag === "Leaf"
const isComposite = (e: DecoderError): e is DecoderErrorComposite => e._tag === "Composite"

const match = <T>(
  e: DecoderError,
  patterns: { readonly Leaf: (e: DecoderErrorLeaf) => T; readonly Composite: (e: DecoderErrorComposite) => T },
): T => (e._tag === "Leaf" ? patterns.Leaf(e) : patterns.Composite(e))

/**
 * Prepend a path segment to an error. Used by `Decoder.object` and
 * `Decoder.list` to attribute a child decoder's failures to the field /
 * index they were decoded under. Recurses into Composite children so every
 * Leaf in the tree carries its full absolute path.
 */
const prepend = (segment: string, e: DecoderError): DecoderError => {
  if (e._tag === "Leaf") {
    return { ...e, path: [segment, ...e.path] }
  }
  return {
    ...e,
    children: List(e.children.toArray().map((c) => prepend(segment, c))),
  }
}

/**
 * Walk the error tree and collect every leaf failure as a flat list of
 * `{path, message}` records. Useful when surfacing errors to a UI that
 * wants one line per problem.
 */
const flatten = (e: DecoderError): List<{ readonly path: ReadonlyArray<string>; readonly message: string }> => {
  if (e._tag === "Leaf") return List([{ path: e.path, message: e.message }])
  return List(e.children.toArray().flatMap((c) => flatten(c).toArray()))
}

/**
 * Render the error tree as a human-readable multi-line string. Paths are
 * dotted (`user.address.city`); indices are bracketed (`tags[0]`).
 */
const format = (e: DecoderError): string =>
  flatten(e)
    .toArray()
    .map(({ path, message }) => `${formatPath(path)}: ${message}`)
    .join("\n")

const formatPath = (path: ReadonlyArray<string>): string => {
  if (path.length === 0) return "(root)"
  return path.reduce<string>((acc, seg) => {
    if (seg.startsWith("[") && seg.endsWith("]")) return `${acc}${seg}`
    return acc === "" ? seg : `${acc}.${seg}`
  }, "")
}

const DecoderErrorCompanion = {
  leaf,
  composite,
  isLeaf,
  isComposite,
  match,
  prepend,
  flatten,
  format,
}

export const DecoderError = Companion({} as { readonly _tag: "DecoderError" }, DecoderErrorCompanion)
