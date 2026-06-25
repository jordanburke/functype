export type { TraceEvent, TraceOp, TraceSpan, SpanOutcome } from "./TraceEvent.js"
// Tracer Tag + interface intentionally NOT re-exported from the main barrel.
// It is an implementation detail of TracedOption. Advanced IO.service(Tracer)
// usage can import directly from "functype/traced" (subpath) or the internal path.
export { TracerLive } from "./TracerLive.js"
export type { TracedOption } from "./TracedOption.js"
export { TracedOption } from "./TracedOption.js"
