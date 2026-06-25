# Traced Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `TracedOption` wrapper that records every combinator call as a structured `TraceEvent`, enabling code-path introspection and feedback-loop instrumentation without touching any existing data structure constructors.

**Architecture:** A `TracedOption<A>` function-object wraps an `Option<A>` and delegates every combinator to it while emitting `TraceEvent` records to an injected `Tracer` sink. State (span ID + monotonic sequence number) threads forward immutably by re-wrapping the result of each structure-preserving op; terminal ops (fold, orElse) emit and exit the wrapper. The `Tracer` service is a `Tag`/`Layer`-backed service that plugs into the existing `IO<R,E,A>` DI machinery — swapping `TracerLive.noop()` for `TracerLive.collecting(events)` silences or captures traces without touching pipeline code.

**Tech Stack:** TypeScript strict, functype `Option`/`IO`/`Tag`/`Layer`, Vitest for tests, `pnpm -F functype test` to run the suite.

## Global Constraints

- `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`, `noImplicitReturns: true` — enforced by `tsconfig.base.json`
- No `any`. Use `unknown` and narrow.
- No runtime dependencies added beyond what `packages/functype` already has.
- All new files live under `packages/functype/src/traced/` and `packages/functype/test/traced/`.
- Do not modify any existing DS constructors (Option, Either, Try, List, Set, Map).
- Scope: `Option` only for this plan. The wrapper pattern extends to other types by repeating the same shape — that is a follow-on.
- `verbatimModuleSyntax` requires `.js` extensions on all local imports (compiled output is ESM).
- Run `pnpm -F functype test` after every task. Run `pnpm turbo run validate` as final check.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/functype/src/traced/TraceEvent.ts` | Event schema — `TraceEvent`, `TraceSpan`, `SpanOutcome` types |
| Create | `packages/functype/src/traced/Tracer.ts` | `Tracer` interface + `Tag<Tracer>` service identifier |
| Create | `packages/functype/src/traced/TracerLive.ts` | `TracerLive` — `noop()`, `collecting()`, `console()` `Layer` implementations |
| Create | `packages/functype/src/traced/TracedOption.ts` | `TracedOption<A>` type + constructor function |
| Create | `packages/functype/src/traced/index.ts` | Barrel — re-exports from this directory |
| Modify | `packages/functype/src/index.ts` | Add `export * from "@/traced"` |
| Create | `packages/functype/test/traced/TracedOption.spec.ts` | Unit tests for the wrapper |
| Create | `packages/functype/test/traced/TracerLive.spec.ts` | Tests for Layer wiring via IO |

---

### Task 1: `TraceEvent` types

**Files:**
- Create: `packages/functype/src/traced/TraceEvent.ts`

**Interfaces:**
- Produces: `TraceEvent`, `TraceSpan`, `SpanOutcome` — consumed by Tasks 2, 3, 4, and tests.

- [ ] **Step 1: Write the file**

```typescript
// packages/functype/src/traced/TraceEvent.ts

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
```

- [ ] **Step 2: Verify no TS errors**

```bash
pnpm -F functype typecheck
```
Expected: no errors for `traced/TraceEvent.ts` (it has no imports yet, so it compiles trivially).

- [ ] **Step 3: Commit**

```bash
git add packages/functype/src/traced/TraceEvent.ts
git commit -m "feat(traced): add TraceEvent schema types"
```

---

### Task 2: `Tracer` interface + Tag

**Files:**
- Create: `packages/functype/src/traced/Tracer.ts`

**Interfaces:**
- Consumes: `TraceEvent` from Task 1 (`packages/functype/src/traced/TraceEvent.ts`)
- Produces: `Tracer` interface, `Tracer` Tag — consumed by Tasks 3, 4, and tests.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/functype/test/traced/TracerLive.spec.ts  (partial — full file written in Task 3)
// For now, write just enough to confirm Tag import compiles.
import { describe, it, expect } from "vitest"
import { Tracer } from "../../src/traced/Tracer.js"

describe("Tracer Tag", () => {
  it("has a stable string id", () => {
    expect(Tracer.id).toBe("functype/Tracer")
  })
})
```

- [ ] **Step 2: Run the test — expect compile failure (file doesn't exist yet)**

```bash
pnpm -F functype test test/traced/TracerLive.spec.ts
```
Expected: error — `Cannot find module '../../src/traced/Tracer.js'`

- [ ] **Step 3: Write the implementation**

```typescript
// packages/functype/src/traced/Tracer.ts
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
```

- [ ] **Step 4: Run the test — expect pass**

```bash
pnpm -F functype test test/traced/TracerLive.spec.ts
```
Expected: `Tracer Tag > has a stable string id` — PASS

- [ ] **Step 5: Commit**

```bash
git add packages/functype/src/traced/Tracer.ts packages/functype/test/traced/TracerLive.spec.ts
git commit -m "feat(traced): add Tracer interface and Tag"
```

---

### Task 3: `TracerLive` Layer implementations

**Files:**
- Create: `packages/functype/src/traced/TracerLive.ts`
- Modify: `packages/functype/test/traced/TracerLive.spec.ts` (replace the stub with full tests)

**Interfaces:**
- Consumes: `Tracer` Tag (Task 2), `Layer` from `@/io/Layer`, `IO` from `@/io/IO`, `TraceEvent` (Task 1)
- Produces: `TracerLive` object with `.noop()`, `.collecting(target)`, `.console(prefix?)` — consumed by Task 4 integration test and callers.

- [ ] **Step 1: Write the full test (replace stub from Task 2)**

```typescript
// packages/functype/test/traced/TracerLive.spec.ts
import { describe, it, expect, vi } from "vitest"
import { IO } from "../../src/io/IO.js"
import { Tracer } from "../../src/traced/Tracer.js"
import { TracerLive } from "../../src/traced/TracerLive.js"
import type { TraceEvent } from "../../src/traced/TraceEvent.js"

const sampleEvent: TraceEvent = {
  spanId: "span-1",
  seq: 0,
  op: "map",
  tag: "Option",
  inTag: "Some",
  outTag: "Some",
  label: "test",
}

describe("TracerLive", () => {
  describe("noop()", () => {
    it("silently discards events without throwing", () => {
      expect(() =>
        IO.service(Tracer)
          .map((t) => t.emit(sampleEvent))
          .provideLayer(TracerLive.noop())
          .runSyncOrThrow(),
      ).not.toThrow()
    })
  })

  describe("collecting(target)", () => {
    it("appends emitted events into the provided array", () => {
      const captured: TraceEvent[] = []
      IO.service(Tracer)
        .map((t) => t.emit(sampleEvent))
        .provideLayer(TracerLive.collecting(captured))
        .runSyncOrThrow()

      expect(captured).toHaveLength(1)
      expect(captured[0]).toEqual(sampleEvent)
    })

    it("appends multiple events in order", () => {
      const captured: TraceEvent[] = []
      IO.service(Tracer)
        .map((t) => {
          t.emit({ ...sampleEvent, seq: 0 })
          t.emit({ ...sampleEvent, seq: 1 })
          t.emit({ ...sampleEvent, seq: 2 })
        })
        .provideLayer(TracerLive.collecting(captured))
        .runSyncOrThrow()

      expect(captured.map((e) => e.seq)).toEqual([0, 1, 2])
    })
  })

  describe("console(prefix?)", () => {
    it("calls console.log once per emitted event", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => undefined)
      IO.service(Tracer)
        .map((t) => t.emit(sampleEvent))
        .provideLayer(TracerLive.console("[test]"))
        .runSyncOrThrow()

      expect(spy).toHaveBeenCalledOnce()
      expect(spy.mock.calls[0]?.[0]).toContain("[test]")
      spy.mockRestore()
    })
  })
})
```

- [ ] **Step 2: Run the test — expect failure (TracerLive not implemented)**

```bash
pnpm -F functype test test/traced/TracerLive.spec.ts
```
Expected: error — `Cannot find module '../../src/traced/TracerLive.js'`

- [ ] **Step 3: Write the implementation**

```typescript
// packages/functype/src/traced/TracerLive.ts
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
```

- [ ] **Step 4: Run the tests — expect all pass**

```bash
pnpm -F functype test test/traced/TracerLive.spec.ts
```
Expected: `TracerLive > noop() > ...`, `TracerLive > collecting() > ...`, `TracerLive > console() > ...` — all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/functype/src/traced/TracerLive.ts packages/functype/test/traced/TracerLive.spec.ts
git commit -m "feat(traced): add TracerLive Layer implementations (noop, collecting, console)"
```

---

### Task 4: `TracedOption` wrapper

**Files:**
- Create: `packages/functype/src/traced/TracedOption.ts`
- Create: `packages/functype/test/traced/TracedOption.spec.ts`

**Interfaces:**
- Consumes: `Option`, `Some`, `None` from `@/option/Option`; `Tracer` (Task 2); `TraceEvent`, `TraceOp` (Task 1)
- Produces: `TracedOption<A>` type + `TracedOption(inner, tracer, spanId?, seq?)` constructor function — consumed by Task 5 barrel and callers.

**Key invariants:**
- Structure-preserving ops (`map`, `flatMap`, `filter`) return `TracedOption<B>` with `seq + 1` and the same `spanId`.
- Terminal ops (`fold`, `orElse`) emit, then return the raw value (exit the wrapper).
- `unwrap()` returns the inner `Option<A>` without emitting anything.
- `inTag` = `_tag` on `inner` before the op. `outTag` = `_tag` on the result after the op.
- Default `spanId` is `crypto.randomUUID()` — available globally in Node 18+.

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/functype/test/traced/TracedOption.spec.ts
import { describe, it, expect, beforeEach } from "vitest"
import { None, Some } from "../../src/option/Option.js"
import { TracedOption } from "../../src/traced/TracedOption.js"
import type { TraceEvent } from "../../src/traced/TraceEvent.js"
import type { Tracer } from "../../src/traced/Tracer.js"

describe("TracedOption", () => {
  let events: TraceEvent[]
  let tracer: Tracer

  beforeEach(() => {
    events = []
    tracer = { emit: (e) => events.push(e) }
  })

  // ── construction ───────────────────────────────────────────────────────────

  it("accepts a fixed spanId so tests can assert span identity", () => {
    TracedOption(Some(1), tracer, "fixed-span").map((n) => n + 1)
    expect(events[0]?.spanId).toBe("fixed-span")
  })

  it("wraps a None without emitting on construction", () => {
    TracedOption(None<number>(), tracer, "s")
    expect(events).toHaveLength(0)
  })

  // ── map ────────────────────────────────────────────────────────────────────

  it("emits map event with inTag=Some outTag=Some", () => {
    TracedOption(Some(1), tracer, "s").map((n) => n + 1, "increment")
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      op: "map",
      tag: "Option",
      inTag: "Some",
      outTag: "Some",
      label: "increment",
      seq: 0,
    })
  })

  it("emits map event on None — inTag=None outTag=None", () => {
    TracedOption(None<number>(), tracer, "s").map((n) => n + 1)
    expect(events[0]).toMatchObject({ op: "map", inTag: "None", outTag: "None" })
  })

  // ── flatMap ────────────────────────────────────────────────────────────────

  it("emits flatMap event capturing collapse from Some to None", () => {
    TracedOption(Some(5), tracer, "s").flatMap((n) => (n > 10 ? Some(n) : None()), "gt10")
    expect(events[0]).toMatchObject({
      op: "flatMap",
      inTag: "Some",
      outTag: "None",
      label: "gt10",
    })
  })

  it("emits flatMap event — Some stays Some when fn matches", () => {
    TracedOption(Some(20), tracer, "s").flatMap((n) => (n > 10 ? Some(n * 2) : None()))
    expect(events[0]).toMatchObject({ op: "flatMap", inTag: "Some", outTag: "Some" })
  })

  // ── filter ─────────────────────────────────────────────────────────────────

  it("emits filter event with kept=true when predicate passes", () => {
    TracedOption(Some(5), tracer, "s").filter((n) => n > 3, "gt3")
    expect(events[0]).toMatchObject({
      op: "filter",
      inTag: "Some",
      outTag: "Some",
      meta: { kept: true },
      label: "gt3",
    })
  })

  it("emits filter event with kept=false when predicate fails", () => {
    TracedOption(Some(2), tracer, "s").filter((n) => n > 3)
    expect(events[0]).toMatchObject({ op: "filter", inTag: "Some", outTag: "None", meta: { kept: false } })
  })

  it("emits filter on None with kept=false regardless of predicate", () => {
    TracedOption(None<number>(), tracer, "s").filter((n) => n > 0)
    expect(events[0]).toMatchObject({ op: "filter", inTag: "None", outTag: "None", meta: { kept: false } })
  })

  // ── seq threading ──────────────────────────────────────────────────────────

  it("increments seq across chained ops in the same span", () => {
    TracedOption(Some(1), tracer, "span-x")
      .map((n) => n + 1)
      .filter((n) => n > 0)
      .flatMap((n) => Some(n * 10))

    expect(events).toHaveLength(3)
    expect(events.map((e) => e.seq)).toEqual([0, 1, 2])
    expect(new Set(events.map((e) => e.spanId)).size).toBe(1)
  })

  // ── terminal: fold ─────────────────────────────────────────────────────────

  it("fold on Some calls onSome and emits event without outTag", () => {
    const result = TracedOption(Some(7), tracer, "s").fold(
      () => -1,
      (n) => n * 2,
      "double",
    )
    expect(result).toBe(14)
    expect(events[0]).toMatchObject({ op: "fold", inTag: "Some", label: "double" })
    expect(events[0]).not.toHaveProperty("outTag")
  })

  it("fold on None calls onNone and emits event", () => {
    const result = TracedOption(None<number>(), tracer, "s").fold(
      () => -1,
      (n) => n * 2,
    )
    expect(result).toBe(-1)
    expect(events[0]).toMatchObject({ op: "fold", inTag: "None" })
  })

  // ── terminal: orElse ───────────────────────────────────────────────────────

  it("orElse on Some returns the contained value with usedDefault=false", () => {
    const result = TracedOption(Some(42), tracer, "s").orElse(0, "fallback")
    expect(result).toBe(42)
    expect(events[0]).toMatchObject({ op: "orElse", inTag: "Some", meta: { usedDefault: false }, label: "fallback" })
    expect(events[0]).not.toHaveProperty("outTag")
  })

  it("orElse on None returns the default with usedDefault=true", () => {
    const result = TracedOption(None<number>(), tracer, "s").orElse(99, "fallback")
    expect(result).toBe(99)
    expect(events[0]).toMatchObject({ op: "orElse", inTag: "None", meta: { usedDefault: true } })
  })

  // ── unwrap ─────────────────────────────────────────────────────────────────

  it("unwrap returns the inner Option without emitting", () => {
    const inner = Some(7)
    const result = TracedOption(inner, tracer, "s").unwrap()
    expect(result).toBe(inner)
    expect(events).toHaveLength(0)
  })

  // ── full chain ─────────────────────────────────────────────────────────────

  it("full chain emits all events in order with correct ops and variants", () => {
    TracedOption(Some(3), tracer, "full")
      .map((n) => n * 2, "double")      // Some(3) → Some(6)
      .filter((n) => n < 5, "lt5")      // Some(6) → None  (6 < 5 is false)
      .orElse(0, "default")             // None → 0

    expect(events).toHaveLength(3)
    expect(events.map((e) => e.op)).toEqual(["map", "filter", "orElse"])
    expect(events.map((e) => e.inTag)).toEqual(["Some", "Some", "None"])
    expect(events[0]?.outTag).toBe("Some")
    expect(events[1]?.outTag).toBe("None")
    expect(events[2]).not.toHaveProperty("outTag")
    expect(events.map((e) => e.seq)).toEqual([0, 1, 2])
  })
})
```

- [ ] **Step 2: Run the tests — expect failure**

```bash
pnpm -F functype test test/traced/TracedOption.spec.ts
```
Expected: error — `Cannot find module '../../src/traced/TracedOption.js'`

- [ ] **Step 3: Write the implementation**

```typescript
// packages/functype/src/traced/TracedOption.ts
import type { Option } from "@/option/Option"

import type { Tracer } from "./Tracer.js"
import type { TraceOp } from "./TraceEvent.js"

// ── internal helpers ──────────────────────────────────────────────────────────

function variantOf(v: Option<unknown>): string {
  return v._tag
}

function typeTagOf(v: Option<unknown>): string {
  return String(v[Symbol.toStringTag])
}

// ── public type ───────────────────────────────────────────────────────────────

/**
 * A transparent wrapper around `Option<A>` that emits a `TraceEvent` to the
 * injected `Tracer` on every combinator call.
 *
 * Structure-preserving ops return `TracedOption<B>`, carrying the same spanId
 * and incrementing seq. Terminal ops (`fold`, `orElse`) emit and return the
 * raw value, exiting the wrapper. `unwrap()` exits silently.
 *
 * @example
 * ```ts
 * const events: TraceEvent[] = []
 * const tracer = { emit: (e) => events.push(e) }
 *
 * TracedOption(Option.from(user), tracer)
 *   .map(u => u.name.trim(), "trim")
 *   .filter(n => n.length > 0, "non-empty")
 *   .orElse("anonymous", "fallback")
 * ```
 */
export type TracedOption<A> = {
  map<B>(f: (a: A) => B, label?: string): TracedOption<B>
  flatMap<B>(f: (a: A) => Option<B>, label?: string): TracedOption<B>
  filter(predicate: (a: A) => boolean, label?: string): TracedOption<A>
  fold<B>(onNone: () => B, onSome: (a: A) => B, label?: string): B
  orElse<B>(defaultValue: B, label?: string): A | B
  unwrap(): Option<A>
}

// ── constructor ───────────────────────────────────────────────────────────────

/**
 * Wraps `inner` with tracing. Each combinator emits one `TraceEvent` to `tracer`,
 * then delegates to the real Option implementation.
 *
 * @param inner    - The Option to wrap.
 * @param tracer   - Receives events. Typically obtained via IO.service(Tracer).
 * @param spanId   - Groups all events from one chain. Defaults to a fresh UUID.
 * @param seq      - Starting sequence number. Defaults to 0. Increments on each op.
 */
export function TracedOption<A>(
  inner: Option<A>,
  tracer: Tracer,
  spanId: string = crypto.randomUUID(),
  seq = 0,
): TracedOption<A> {
  function emit(op: TraceOp, outTag: string | undefined, label: string | undefined, meta?: Record<string, unknown>): number {
    tracer.emit({
      spanId,
      seq,
      op,
      tag: typeTagOf(inner),
      inTag: variantOf(inner),
      outTag,
      label,
      meta,
    })
    return seq + 1
  }

  return {
    map<B>(f: (a: A) => B, label?: string): TracedOption<B> {
      const out = inner.map(f)
      const next = emit("map", variantOf(out), label)
      return TracedOption(out, tracer, spanId, next)
    },

    flatMap<B>(f: (a: A) => Option<B>, label?: string): TracedOption<B> {
      const out = inner.flatMap(f)
      const next = emit("flatMap", variantOf(out), label)
      return TracedOption(out, tracer, spanId, next)
    },

    filter(predicate: (a: A) => boolean, label?: string): TracedOption<A> {
      const out = inner.filter(predicate)
      const kept = variantOf(out) !== "None"
      const next = emit("filter", variantOf(out), label, { kept })
      return TracedOption(out, tracer, spanId, next)
    },

    fold<B>(onNone: () => B, onSome: (a: A) => B, label?: string): B {
      emit("fold", undefined, label)
      return inner.fold(onNone, onSome)
    },

    orElse<B>(defaultValue: B, label?: string): A | B {
      const usedDefault = variantOf(inner) === "None"
      emit("orElse", undefined, label, { usedDefault })
      return inner.orElse(defaultValue)
    },

    unwrap(): Option<A> {
      return inner
    },
  }
}
```

- [ ] **Step 4: Run the tests — expect all pass**

```bash
pnpm -F functype test test/traced/TracedOption.spec.ts
```
Expected: all 18 tests — PASS

- [ ] **Step 5: Commit**

```bash
git add packages/functype/src/traced/TracedOption.ts packages/functype/test/traced/TracedOption.spec.ts
git commit -m "feat(traced): add TracedOption wrapper with full combinator coverage"
```

---

### Task 5: Barrel and package export

**Files:**
- Create: `packages/functype/src/traced/index.ts`
- Modify: `packages/functype/src/index.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4
- Produces: public surface of `functype` package gains all traced exports

- [ ] **Step 1: Write the barrel**

```typescript
// packages/functype/src/traced/index.ts
export type { TraceEvent, TraceOp, TraceSpan, SpanOutcome } from "./TraceEvent.js"
export type { Tracer } from "./Tracer.js"
export { Tracer } from "./Tracer.js"
export { TracerLive } from "./TracerLive.js"
export type { TracedOption } from "./TracedOption.js"
export { TracedOption } from "./TracedOption.js"
```

- [ ] **Step 2: Add the barrel to the package index**

In `packages/functype/src/index.ts`, add after the last `export * from` line (currently `export * from "@/valuable/Valuable"`):

```typescript
export * from "@/traced"
```

- [ ] **Step 3: Run the full test suite and typecheck**

```bash
pnpm -F functype test
pnpm -F functype typecheck
```
Expected: all existing tests still pass, no type errors.

- [ ] **Step 4: Verify the public exports exist**

```bash
node -e "const f = require('./packages/functype/dist/index.cjs'); console.log(typeof f.TracedOption, typeof f.TracerLive, typeof f.Tracer)"
```
If dist doesn't exist yet, build first:
```bash
pnpm -F functype build
node -e "const f = require('./packages/functype/dist/index.cjs'); console.log(typeof f.TracedOption, typeof f.TracerLive, typeof f.Tracer)"
```
Expected: `function object object`

- [ ] **Step 5: Commit**

```bash
git add packages/functype/src/traced/index.ts packages/functype/src/index.ts
git commit -m "feat(traced): export TracedOption, TracerLive, Tracer from functype package"
```

---

### Task 6: IO integration test (end-to-end DI wiring)

**Files:**
- Create: `packages/functype/test/traced/TracedOptionIO.spec.ts`

This task verifies the full feedback-loop wiring: `IO.service(Tracer)` → build a traced pipeline → `provideLayer(TracerLive.collecting(...))` → `runSyncOrThrow()` → assert the span.

- [ ] **Step 1: Write the test**

```typescript
// packages/functype/test/traced/TracedOptionIO.spec.ts
import { describe, it, expect } from "vitest"
import { IO } from "../../src/io/IO.js"
import { None, Option, Some } from "../../src/option/Option.js"
import { Tracer } from "../../src/traced/Tracer.js"
import { TracedOption } from "../../src/traced/TracedOption.js"
import { TracerLive } from "../../src/traced/TracerLive.js"
import type { TraceEvent } from "../../src/traced/TraceEvent.js"

describe("TracedOption + IO DI wiring", () => {
  it("collects events from a traced pipeline via Layer injection", () => {
    const captured: TraceEvent[] = []

    const program = IO.service(Tracer).map((tracer) =>
      TracedOption(Some(3), tracer, "io-span")
        .map((n) => n * 2, "double")
        .filter((n) => n < 5, "lt5")
        .orElse(0, "default"),
    )

    const result = program.provideLayer(TracerLive.collecting(captured)).runSyncOrThrow()

    expect(result).toBe(0)
    expect(captured).toHaveLength(3)
    expect(captured.map((e) => e.op)).toEqual(["map", "filter", "orElse"])
    expect(captured.every((e) => e.spanId === "io-span")).toBe(true)
  })

  it("noop layer produces the same result with zero events captured", () => {
    const captured: TraceEvent[] = []

    const program = IO.service(Tracer).map((tracer) =>
      TracedOption(Option.from<number>(null), tracer).orElse(42),
    )

    const result = program.provideLayer(TracerLive.noop()).runSyncOrThrow()

    expect(result).toBe(42)
    expect(captured).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test — expect pass (no new code needed)**

```bash
pnpm -F functype test test/traced/TracedOptionIO.spec.ts
```
Expected: both IO wiring tests — PASS

- [ ] **Step 3: Run the full validate pipeline**

```bash
pnpm turbo run validate
```
Expected: format ✓, lint ✓, typecheck ✓, test ✓, build ✓ across all packages.

- [ ] **Step 4: Commit**

```bash
git add packages/functype/test/traced/TracedOptionIO.spec.ts
git commit -m "test(traced): add IO integration test for TracedOption + TracerLive DI wiring"
```

---

## Verification checklist

End-to-end pass criteria before marking this feature complete:

- [ ] `pnpm -F functype test` — all tests pass, no regressions in existing suite
- [ ] `pnpm -F functype typecheck` — zero errors
- [ ] `pnpm turbo run validate` — full monorepo green
- [ ] Consuming `TracedOption(Some(1), tracer).map(n => n + 1).orElse(0)` from a top-level script returns `2` and `events` has 2 entries with `seq` 0 and 1
- [ ] Swapping `TracerLive.collecting(events)` for `TracerLive.noop()` produces identical values with zero events captured

---

## Follow-on scope (NOT in this plan)

- `TracedEither<L, R>` — same pattern, terminal ops are `fold`/`orElse`/`getOrElse`
- `TracedList<A>` — same pattern, adds `tapEach`-style `mapEach` trace support
- `TraceSpan` collector helper that groups events by `spanId` into a `TraceSpan` with an `outcome`
- `functype-eval` integration: `TraceSpan` → fitness scorer
