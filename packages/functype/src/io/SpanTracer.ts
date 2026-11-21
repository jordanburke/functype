import type { Exit } from "./Exit"
import { Tag } from "./Tag"

/**
 * SpanTracer module - the contract `IO.withSpan` opens spans through.
 * @module SpanTracer
 * @category IO
 *
 * Core defines only the contract. An OpenTelemetry bridge, or any other tracer, lives in the
 * consuming code, so functype stays free of runtime dependencies.
 */

/**
 * The attributes given to {@link IO.withSpan}. Each value matches OpenTelemetry's
 * `AttributeValue`, so a bridge passes them through unchanged. The arrays are mutable for that
 * reason: a readonly array doesn't fit OpenTelemetry's `Array`.
 */
export type SpanAttributes = Readonly<
  Record<
    string,
    | string
    | number
    | boolean
    | Array<string | null | undefined>
    | Array<number | null | undefined>
    | Array<boolean | null | undefined>
  >
>

/**
 * What `IO.withSpan` needs from a tracer. Provide one with `io.provideService(SpanTracer, tracer)`,
 * outside the spans. With no tracer provided, `withSpan` does nothing. `provideLayer` can't carry
 * it, because a layer may only provide services in the IO's requirements, and `withSpan` doesn't
 * add one.
 *
 * This is not the `Tracer` that `TracedOption` writes to. That one records steps through
 * `emit(event)` and has no spans.
 *
 * For each `withSpan`, the interpreter calls `start`, then `run`, then `end` exactly once.
 *
 * @typeParam S - The tracer's own span type. Core never looks inside it.
 *
 * @example
 * ```typescript
 * // A sketch of an OpenTelemetry bridge. functype ships no such package.
 * import { context, type Span, SpanStatusCode, trace } from "@opentelemetry/api"
 *
 * const otel = trace.getTracer("my-app")
 * const tracer: SpanTracer<Span> = {
 *   start: (name, attributes, parent) =>
 *     otel.startSpan(name, { attributes }, parent ? trace.setSpan(context.active(), parent) : context.active()),
 *   run: (span, fn) => context.with(trace.setSpan(context.active(), span), fn),
 *   end: (span, exit) => {
 *     if (exit._tag === "Failure" || exit._tag === "Die") span.setStatus({ code: SpanStatusCode.ERROR })
 *     span.end()
 *   },
 * }
 *
 * await program.withSpan("checkout", { cart: id }).provideService(SpanTracer, tracer).run()
 * ```
 */
export type SpanTracer<S = unknown> = {
  /**
   * Opens a span.
   * @param name - The name given to `withSpan`
   * @param attributes - The attributes given to `withSpan`, or `{}`
   * @param parent - The span of the enclosing `withSpan` in this run, or `undefined` at the top.
   *   Fall back to the tracer's ambient context when it's `undefined`, so a run started inside
   *   another span, such as a request handler's, nests under it.
   */
  start(name: string, attributes: SpanAttributes, parent: S | undefined): S

  /**
   * Runs `fn` with `span` active, and returns what `fn` returns. The interpreter runs the whole
   * body of `withSpan` inside it, so code there, including a log sink, sees the span through
   * the tracer's own API. An OpenTelemetry bridge implements it with `context.with`.
   *
   * `fn` returns a promise under `run()` and a plain value under `runSync()`. Return it as is.
   */
  run<T>(span: S, fn: () => T): T

  /**
   * Closes a span with the body's outcome. A failure that arrives after the run was cancelled,
   * such as an aborted `fetch` in a `race` loser, is reported as `Interrupted`.
   */
  end(span: S, exit: Exit<unknown, unknown>): void
}

/**
 * The service `withSpan` looks up. It needs no entry in an IO's requirements, because with no
 * tracer provided `withSpan` does nothing.
 */
export const SpanTracer: Tag<SpanTracer> = Tag<SpanTracer>("functype/SpanTracer")
