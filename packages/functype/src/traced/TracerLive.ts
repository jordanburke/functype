import { Layer } from "@/io/Layer"

import { Tracer } from "./Tracer.js"
import type { TraceEvent } from "./TraceEvent.js"

/**
 * Built-in Tracer Layer implementations.
 *
 * Usage:
 *   program.provideLayer(TracerLive.collecting(events)).runSyncOrThrow()
 *   program.provideLayer(TracerLive.noop()).runOrThrow()
 */
export const TracerLive = {
  /** Silently discards all events. Zero overhead. Use in production when tracing is off. */
  noop(): Layer<never, never, Tracer> {
    return Layer.succeed(Tracer, { emit: () => undefined })
  },

  /** Appends every event into `target`. Use in tests and eval harnesses. */
  collecting(target: TraceEvent[]): Layer<never, never, Tracer> {
    return Layer.succeed(Tracer, { emit: (e) => target.push(e) })
  },

  /** Logs a one-line summary per event via console.log. Use for local dev debugging. */
  console(prefix = "[trace]"): Layer<never, never, Tracer> {
    return Layer.succeed(Tracer, {
      emit: (e) => {
        // eslint-disable-next-line no-console
        console.log(
          `${prefix} seq=${e.seq} op=${e.op} tag=${e.tag} inTag=${e.inTag}${e.outTag !== undefined ? ` outTag=${e.outTag}` : ""}${e.label !== undefined ? ` label=${e.label}` : ""}`,
        )
      },
    })
  },
} as const
