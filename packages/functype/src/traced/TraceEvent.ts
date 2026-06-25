/**
 * Identifies which combinator emitted this event.
 * String union is open so callers can extend with custom ops.
 */
export type TraceOp = "construct" | "map" | "flatMap" | "filter" | "fold" | "orElse" | (string & {})

/**
 * One observation emitted by a TracedOption combinator.
 *
 * @field spanId  - Groups all events from one chain together. Stable across re-wraps.
 * @field seq     - Monotonic 0-based position within the span.
 * @field op      - Which combinator fired.
 * @field tag     - The container type name (e.g. "Option") from Symbol.toStringTag.
 * @field inTag   - Variant entering the op ("Some" | "None" for Option).
 * @field outTag  - Variant leaving the op; absent for terminal ops.
 * @field label   - Optional caller-supplied code-path name.
 * @field meta    - Op-specific detail (e.g. { kept: boolean } for filter).
 */
export type TraceEvent = {
  readonly spanId: string
  readonly seq: number
  readonly op: TraceOp
  readonly tag: string
  readonly inTag: string
  readonly outTag?: string
  readonly label?: string
  readonly meta?: Record<string, unknown>
}

/** The closed-chain outcome emitted by a terminal op (fold / orElse). */
export type SpanOutcome = {
  readonly tag: string
  readonly terminal: TraceOp
  readonly usedDefault?: boolean
}

/** Full span — useful for collecting + scoring an entire chain. */
export type TraceSpan = {
  readonly spanId: string
  readonly events: readonly TraceEvent[]
  readonly outcome?: SpanOutcome
}
