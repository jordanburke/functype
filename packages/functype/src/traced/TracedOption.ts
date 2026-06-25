import type { Option } from "@/option/Option"

import type { Tracer } from "./Tracer.js"
import type { TraceOp } from "./TraceEvent.js"

// ── internal helpers ──────────────────────────────────────────────────────────

function variantOf(v: Option<unknown>): string {
  return v._tag
}

function typeTagOf(v: Option<unknown>): string {
  return String(v[Symbol.toStringTag])
}

// ── public type ───────────────────────────────────────────────────────────────

/**
 * A transparent wrapper around `Option<A>` that emits a `TraceEvent` to the
 * injected `Tracer` on every combinator call.
 *
 * Structure-preserving ops return `TracedOption<B>`, carrying the same spanId
 * and incrementing seq. Terminal ops (`fold`, `orElse`) emit and return the
 * raw value, exiting the wrapper. `unwrap()` exits silently.
 *
 * @example
 * ```ts
 * const events: TraceEvent[] = []
 * const tracer = { emit: (e) => events.push(e) }
 *
 * TracedOption(Option.from(user), tracer)
 *   .map(u => u.name.trim(), "trim")
 *   .filter(n => n.length > 0, "non-empty")
 *   .orElse("anonymous", "fallback")
 * ```
 */
export type TracedOption<A> = {
  map<B>(f: (a: A) => B, label?: string): TracedOption<B>
  flatMap<B>(f: (a: A) => Option<B>, label?: string): TracedOption<B>
  filter(predicate: (a: A) => boolean, label?: string): TracedOption<A>
  fold<B>(onNone: () => B, onSome: (a: A) => B, label?: string): B
  orElse<B>(defaultValue: B, label?: string): A | B
  unwrap(): Option<A>
}

// ── constructor ───────────────────────────────────────────────────────────────

/**
 * Wraps `inner` with tracing. Each combinator emits one `TraceEvent` to `tracer`,
 * then delegates to the real Option implementation.
 *
 * @param inner    - The Option to wrap.
 * @param tracer   - Receives events. Typically obtained via IO.service(Tracer).
 * @param spanId   - Groups all events from one chain. Defaults to a fresh UUID.
 * @param seq      - Starting sequence number. Defaults to 0. Increments on each op.
 */
export function TracedOption<A>(
  inner: Option<A>,
  tracer: Tracer,
  spanId: string = crypto.randomUUID(),
  seq = 0,
): TracedOption<A> {
  function emit(
    op: TraceOp,
    outTag: string | undefined,
    label: string | undefined,
    meta?: Record<string, unknown>,
  ): number {
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

  return {
    map<B>(f: (a: A) => B, label?: string): TracedOption<B> {
      const out = inner.map(f)
      const next = emit("map", variantOf(out), label)
      return TracedOption(out, tracer, spanId, next)
    },

    flatMap<B>(f: (a: A) => Option<B>, label?: string): TracedOption<B> {
      const out = inner.flatMap(f)
      const next = emit("flatMap", variantOf(out), label)
      return TracedOption(out, tracer, spanId, next)
    },

    filter(predicate: (a: A) => boolean, label?: string): TracedOption<A> {
      const out = inner.filter(predicate)
      const kept = variantOf(out) !== "None"
      const next = emit("filter", variantOf(out), label, { kept })
      return TracedOption(out, tracer, spanId, next)
    },

    fold<B>(onNone: () => B, onSome: (a: A) => B, label?: string): B {
      emit("fold", undefined, label)
      return inner.fold(onNone, onSome)
    },

    orElse<B>(defaultValue: B, label?: string): A | B {
      const usedDefault = variantOf(inner) === "None"
      emit("orElse", undefined, label, { usedDefault })
      return inner.orElse(defaultValue)
    },

    unwrap(): Option<A> {
      return inner
    },
  }
}
