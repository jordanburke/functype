import { Tag } from "@/io/Tag"

import type { TraceEvent } from "./TraceEvent.js"

/**
 * A Tracer receives structured trace events from TracedOption chains.
 * Inject via Tag/Layer; swap implementations without touching pipeline code.
 */
export interface Tracer {
  emit(event: TraceEvent): void
}

/** Service identifier for the Tracer. Use with IO.service(Tracer) and Layer.succeed(Tracer, impl). */
export const Tracer = Tag<Tracer>("functype/Tracer")
