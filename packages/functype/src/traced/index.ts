export type { TraceEvent, TraceOp, TraceSpan, SpanOutcome } from "./TraceEvent.js"
// Tracer Tag + interface intentionally NOT re-exported from the main barrel.
// It is an implementation detail of TracedOption. Advanced IO.service(Tracer)
// usage can import directly from the internal path packages/functype/src/traced/Tracer.ts.
export { TracerLive } from "./TracerLive.js"
export { TracedOption } from "./TracedOption.js"
