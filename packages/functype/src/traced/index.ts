export type { SpanOutcome, TraceEvent, TraceOp, TraceSpan } from "./TraceEvent.js"
// Tracer Tag + interface intentionally NOT re-exported from the main barrel.
// It is an implementation detail of TracedOption. Advanced IO.service(Tracer)
// usage can import directly from the internal path packages/functype/src/traced/Tracer.ts.
export { TracedOption } from "./TracedOption.js"
export { TracerLive } from "./TracerLive.js"
