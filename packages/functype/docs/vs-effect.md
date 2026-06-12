# functype vs Effect

functype and Effect both bring functional programming to TypeScript and overlap on the
surface — both have an effect type, typed errors, and dependency injection — but they
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
- **`Clock` / `Random` / `Tracer`** — these are framework service abstractions. Effect ships
  them because Effect _is_ a framework; functype isn't. (The one service interface functype
  does define is `Logger`, and only because every production app already has one — it names
  an existing concept rather than introducing a new abstraction.)
- **Persistent (structurally-shared) data structures** — functype's `List`/`Set`/`Map` are
  immutable and array-backed (copy-on-write), not HAMT/finger-tree persistent collections.
  See [performance notes](#performance) below.

These aren't gaps to be filled later — they're the boundary that keeps functype small,
dependency-free, and adoptable one function at a time.

## Choose **Effect** when…

For any of these, Effect is the better tool:

- You need **structured concurrency**: racing, supervised fibers, safe interruption,
  resource scoping across concurrent work.
- You're building around **streaming** (`Stream`) or want first-class **scheduling**.
- You want an **integrated ecosystem** — Schema, platform/runtime, HTTP, config, tracing —
  designed to compose as one system.
- Your team is prepared to **adopt the Effect programming model wholesale** and wants the
  ecosystem mass, the community, and the long-term investment behind it.

functype doesn't compete on any of these, and won't.

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
  12 lint rules that steer code (human- or model-written) toward functype idioms.
- **Measure** — [`functype-eval`](https://www.npmjs.com/package/functype-eval): scores a
  codebase's FP/functype adherence 0–100, and (Phase 2) benchmarks whether LLMs write
  better TypeScript with functype than without.
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
predictable, zero-dependency — not structurally-shared persistent data structures. Each
container is built by a constructor function, so methods are per-instance rather than
shared on a prototype. This is the right trade for domain and service-layer code; in
measured hot loops, drop to native arrays (`list.toArray()` is the escape hatch). Effect's
collections make different trade-offs suited to its runtime. See the (forthcoming)
performance guide for benchmarks and guidance.

## Summary

Reach for **functype** if you want the Scala standard library for TypeScript — small,
immutable, dependency-free, adoptable one function at a time, and unusually friendly to
AI-assisted development. Reach for **Effect** if you want a batteries-included effect
runtime to build your whole application on. They aren't really competitors; they solve
different problems.
