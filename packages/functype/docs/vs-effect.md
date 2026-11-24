# functype vs Effect

functype and Effect (Effect-TS on GitHub, often searched as effect-ts) both bring functional
programming to TypeScript and overlap on the surface — both have an effect type, typed errors, and dependency injection — but they
solve different problems. **functype is a small, dependency-free library of functional data
types you adopt incrementally. Effect is a comprehensive effect system and runtime you
build your application around.**

If you know the Scala world, the analogy is close: functype is to Effect roughly what
`cats-core` (or the Scala standard library) is to ZIO. functype draws its data types from
the Scala standard library and `cats`, and its `IO` from ZIO — but deliberately stops short
of becoming a runtime.

## The core difference

|                          | **functype**                                  | **Effect**                                                               |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| **Shape**                | A library of data types you import à la carte | An effect system + runtime you structure your app around                 |
| **Adoption cost**        | Use `Option` in one function; ignore the rest | The `Effect` type tends to propagate through your call graph             |
| **Runtime**              | None — values are plain immutable objects     | A fiber-based runtime (scheduling, interruption, structured concurrency) |
| **Dependencies**         | Zero runtime dependencies                     | A managed ecosystem (`@effect/*`)                                        |
| **Surface area**         | Small, Scala-standard-library-shaped          | Large and comprehensive (Stream, Schema, platform, …)                    |
| **Ecosystem & adoption** | Small and focused                             | Large, active, broad                                                     |
| **Mental model**         | "Scala's standard library for TypeScript"     | "ZIO/Cats Effect for TypeScript"                                         |

The practical test: **can you delete it from a single file without touching the rest of
your codebase?** With functype, yes — a `List` or an `Option` is just a value. With Effect,
the `Effect` type runs through your whole call graph by design — which is the point, and a
strength when you want it.

## What functype deliberately is **not**

functype has an `IO<R, E, A>` with typed errors, `Tag`/`Layer` dependency injection, and a
retry surface — recognizably ZIO-shaped. That overlap is intentional and useful, but the
line is drawn deliberately. functype does **not** ship, and does not intend to ship:

- **A fiber runtime** — no green threads, no scheduler.
- **Structured concurrency** — no supervised fiber trees, no `fork`/`join` semantics.
- **`Clock` / `Random`** — these are framework service abstractions. Effect ships
  them because Effect _is_ a framework; functype isn't. (The service interfaces functype
  does define are `Logger` and `Tracer` — both type-only, both naming an existing concept
  rather than introducing a new abstraction. `Logger` exists because every production app
  already has one; `Tracer` is a one-method sink consumed by `TracedOption`. Neither ships
  a runtime, a Tag, or a default implementation — those live in consumer packages.
  `SpanTracer`, the contract behind `IO.withSpan`, does ship as a Tag, because the
  interpreter looks it up. It still ships no implementation.)
- **Persistent (structurally-shared) data structures** — functype's `List`/`Set`/`Map` are
  immutable and array-backed (copy-on-write), not HAMT/finger-tree persistent collections.
  See [performance notes](#performance) below.

These aren't gaps to be filled later — they're the boundary that keeps functype small,
dependency-free, and adoptable one function at a time.

## Choose **Effect** when…

For any of these, Effect is the better tool:

- You need **structured concurrency**: supervised fibers, `fork`/`join`, and resource scoping
  across concurrent work. functype's `IO` has `race`, `timeout` and cancellation, but no fibers
  and no supervision.
- You're building around **streaming** (`Stream`) or want first-class **scheduling**.
- You want an **integrated ecosystem** — Schema, platform/runtime, HTTP, config —
  designed to compose as one system.
- You want **tracing that comes with its exporter**. Effect's spans reach OpenTelemetry
  through `@effect/opentelemetry`.
- Your team is prepared to **adopt the Effect programming model wholesale** and wants the
  ecosystem mass, the community, and the long-term investment behind it.

functype doesn't compete on any of these, and won't. Tracing is the partial exception:
`IO.withSpan` nests spans the way `Effect.withSpan` does, behind a type-only `SpanTracer`
contract shaped like Effect's `Tracer`. functype ships no tracer and no exporter, so you write
the short bridge to OpenTelemetry yourself (the IO docs have a sketch).

## Choose **functype** when…

- You want **Scala's standard-library ergonomics** — `Option`, `Either`, `Try`, `List`,
  `Set`, `Map`, do-notation — without taking on a runtime or a framework.
- You want to **adopt incrementally**: wrap one nullable return in `Option`, model one
  fallible boundary with `Either`/`Try`, and leave the rest of your code untouched.
- **Zero runtime dependencies** matters (libraries, constrained bundles, supply-chain
  surface).
- You want typed-error effects and lightweight DI (`IO`, `Tag`, `Layer`) **without** the
  obligation to restructure your whole application around them.

## The differentiator: functype is LLM-native

This is where functype is doing something no other TypeScript FP library is doing. Around
the library is a complete **enforce → measure → teach** loop for AI-assisted development:

- **Enforce** — [`eslint-plugin-functype`](https://www.npmjs.com/package/eslint-plugin-functype):
  a lint preset in which every rule is an error, and each message names the functype fix. It
  steers code, human- or model-written, toward functype idioms.
- **Measure** — [`functype-eval`](https://www.npmjs.com/package/functype-eval): scores a
  codebase's FP/functype adherence 0–100, and its `baseline`/`check` commands keep each file's
  count from rising. A planned phase benchmarks whether LLMs write better TypeScript with
  functype than without.
- **Teach** — a functype MCP server (`search_docs`, `get_type_api`, `validate_code`) and a
  Claude skill that put accurate, version-correct functype guidance directly in the model's
  context.

The thesis behind this: the type-level discipline of FP narrows the solution space, so for
both humans and LLMs, **"it compiles" correlates more strongly with "it's correct."** A
small, consistent, Scala-shaped vocabulary is easier for a model to learn and apply
correctly than a sprawling framework — and the tooling above lets functype _prove_ that
claim rather than just assert it.

## Performance

functype's collections are immutable and **array-backed (copy-on-write)** — simple,
predictable, zero-dependency — not structurally-shared persistent data structures. Their
methods live on a shared prototype, and values are frozen only in development. This is the
right trade for domain and service-layer code; in measured hot loops, drop to native arrays
(`list.toArray()` is the escape hatch).

The [performance page](https://functype.org/performance/) times everyday operations against
Effect on every change to functype. functype's `IO` builds and runs effects faster than
Effect's in most cases. On plain data types, `Either` is level with Effect's `Result`, while
`Option` and `List` trail Effect's by a few nanoseconds per operation. The page has the
current numbers and the code for each case.

## Summary

Reach for **functype** if you want the Scala standard library for TypeScript — small,
immutable, dependency-free, adoptable one function at a time, and unusually friendly to
AI-assisted development. Reach for **Effect** if you want a batteries-included effect
runtime to build your whole application on. They aren't really competitors; they solve
different problems.
