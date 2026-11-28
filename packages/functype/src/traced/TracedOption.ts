import { type A as Hole, define, type Mutable } from "@/internal/define"
import { unify } from "@/internal/unify"
import type { Option } from "@/option/Option"
import type { Unify } from "@/types"

import type { TraceOp } from "./TraceEvent.js"
import type { Tracer } from "./Tracer.js"

// ── internal helpers ──────────────────────────────────────────────────────────

function variantOf(v: Option<unknown>): string {
  return v._tag
}

function typeTagOf(v: Option<unknown>): string {
  return String(v[Symbol.toStringTag])
}

// ── public type ───────────────────────────────────────────────────────────────

/**
 * A wrapper around `Option<A>` that emits a `TraceEvent` to the
 * injected `Tracer` on every combinator call.
 *
 * Structure-preserving ops return `TracedOption<B>`, carrying the same spanId
 * and incrementing seq. Terminal ops (`fold`, `getOrElse`) emit and return the
 * raw value, exiting the wrapper. `unwrap()` emits a terminal event too, so a
 * span never ends without one.
 *
 * Its methods are shared, so call them on the value: `const { map } = traced` loses `this`.
 *
 * @example
 * ```ts
 * declare const user: Option<{ name: string }>
 * const events: TraceEvent[] = []
 * const tracer = { emit: (e: TraceEvent) => void events.push(e) }
 *
 * TracedOption(user, tracer, "span-1")
 *   .map(u => u.name.trim(), "trim")
 *   .filter(n => n.length > 0, "non-empty")
 *   .getOrElse(() => "anonymous", "fallback")
 * ```
 */
export type TracedOption<A> = {
  readonly _tag: "TracedOption"
  map<B>(f: (a: A) => B, label?: string): TracedOption<B>
  flatMap<B>(f: (a: A) => Option<B>, label?: string): TracedOption<B>
  filter(predicate: (a: A) => boolean, label?: string): TracedOption<A>
  fold<B, C = B>(onNone: () => B, onSome: (a: A) => C, label?: string): Unify<B, C>
  getOrElse<B = never>(defaultValue: () => A | B, label?: string): A | B
  unwrap(): Option<A>
}

// ── shared methods ────────────────────────────────────────────────────────────

/**
 * A TracedOption's own data: the Option it wraps, where its events go, and the span and sequence
 * number of its next event. None of these is on {@link TracedOption}. @internal
 */
type TracedOptionOf<A> = TracedOption<A> & {
  readonly inner: Option<A>
  readonly tracer: Tracer
  readonly spanId: string
  readonly seq: number
}

/** Sends one event for an op on `self`, and returns the next sequence number. */
function emit(
  self: TracedOptionOf<unknown>,
  op: TraceOp,
  outTag: string | undefined,
  label: string | undefined,
  meta?: Record<string, unknown>,
): number {
  const { inner, tracer, spanId, seq } = self
  tracer.emit({
    spanId,
    seq,
    op,
    tag: typeTagOf(inner),
    inTag: variantOf(inner),
    ...(outTag !== undefined && { outTag }),
    ...(label !== undefined && { label }),
    ...(meta !== undefined && { meta }),
  })
  return seq + 1
}

/**
 * Every TracedOption shares these methods (#276 §14). They used to be six closures built per value,
 * and per step of a traced chain.
 */
const TracedOptionProto = define<TracedOptionOf<Hole>, "_tag" | "inner" | "tracer" | "spanId" | "seq">()(
  "TracedOption",
  {
    map(f, label) {
      const out = this.inner.map(f)
      return TracedOption(out, this.tracer, this.spanId, emit(this, "map", variantOf(out), label))
    },

    flatMap(f, label) {
      const out = this.inner.flatMap(f)
      return TracedOption(out, this.tracer, this.spanId, emit(this, "flatMap", variantOf(out), label))
    },

    filter(predicate, label) {
      const out = this.inner.filter(predicate)
      const kept = variantOf(out) !== "None"
      return TracedOption(out, this.tracer, this.spanId, emit(this, "filter", variantOf(out), label, { kept }))
    },

    fold<B, C>(onNone: () => B, onSome: (a: Hole) => C, label?: string): Unify<B, C> {
      emit(this, "fold", undefined, label)
      return unify(this.inner.fold(onNone, onSome))
    },

    getOrElse(defaultValue, label) {
      const usedDefault = variantOf(this.inner) === "None"
      emit(this, "getOrElse", undefined, label, { usedDefault })
      return this.inner.getOrElse(defaultValue)
    },

    unwrap() {
      emit(this, "unwrap", undefined, undefined)
      return this.inner
    },
  },
)

// ── constructor ───────────────────────────────────────────────────────────────

/**
 * Wraps `inner` with tracing. Each combinator emits one `TraceEvent` to `tracer`,
 * then delegates to the real Option implementation.
 *
 * @param inner    - The Option to wrap.
 * @param tracer   - Receives events. Typically obtained via IO.service(Tracer).
 * @param spanId   - Groups all events from one chain. Required: core does not
 *                   generate ids, so tracing stays deterministic and free of a
 *                   global `crypto` dependency.
 * @param seq      - Starting sequence number. Defaults to 0. Increments on each op.
 */
export function TracedOption<A>(inner: Option<A>, tracer: Tracer, spanId: string, seq = 0): TracedOption<A> {
  // The one cast: a prototype checked at the opaque Hole works for every A.
  const traced = Object.create(TracedOptionProto) as Mutable<TracedOptionOf<A>>
  /* eslint-disable functional/immutable-data -- filling in the value just created */
  traced._tag = "TracedOption"
  traced.inner = inner
  traced.tracer = tracer
  traced.spanId = spanId
  traced.seq = seq
  /* eslint-enable functional/immutable-data */
  return traced
}
