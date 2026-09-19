import type { TraceEvent } from "./TraceEvent.js"

/**
 * A sink for structured trace events emitted by `TracedOption` chains.
 *
 * Type-only — no runtime, no opinion on output format, no `console`-global
 * dependency. Same rationale as `Logger`: core names the contract, consumers
 * own the implementation. The whole surface is one method, so the common
 * implementations are literals at the call site:
 *
 * ```ts
 * const noop: Tracer = { emit: () => undefined }
 * const collecting = (target: TraceEvent[]): Tracer => ({ emit: (e) => void target.push(e) })
 * const viaLogger = (logger: Logger): Tracer => ({ emit: (e) => logger.debug("trace", e) })
 * ```
 *
 * For dependency injection, declare your own Tag — `Tag` and `Layer` are
 * public from `functype/io`, and core deliberately does not reserve an id:
 *
 * ```ts
 * const Tracer = Tag<Tracer>("app/Tracer")
 * program.provideLayer(Layer.succeed(Tracer, { emit }))
 * ```
 */
export interface Tracer {
  emit(event: TraceEvent): void
}
