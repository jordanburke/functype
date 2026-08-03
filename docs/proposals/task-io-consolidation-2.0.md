# Task → IO consolidation — Phase A gap analysis

**Status:** decision doc, awaiting Phase B design sign-off
**Workstream:** [`docs/ROADMAP.md`](../ROADMAP.md) §3
**Verified against:** `main` @ v1.8.0, 2026-08-03

## Why

Two overlapping effect types — Task ("async with Ok/Err") and IO ("lazy effects with typed
errors") — confuse newcomers and LLMs alike. That undercuts the library's own thesis. The goal is
one effect type: IO absorbs what Task uniquely offers, Task becomes a deprecated alias layer in
1.x, and `core/task` (1,062 LOC) is deleted in 2.0.

This doc inventories what actually has to move. The ROADMAP predicted three gaps. All three are
real. Five more turned up (G4–G8), and they are where the design risk sits.

## Gaps: confirmed as predicted

### G1 — Cancellation handle

`Task.cancellable(fn)` (`Task.ts:1006`) returns `{ task, cancel }`. IO has no equivalent: it has an
`Interrupt` node (`IO.ts:1672`) that an effect can *contain*, but no public "run this and hand me a
cancel function." Verified — no `runFork`, no `runCancellable`.

**The useful part:** `CancellationToken` (`Task.ts:382`) already carries `readonly signal:
AbortSignal`, built from a real `AbortController`. Task solved external cancellation the way
[#242](https://github.com/jordanburke/functype/issues/242) proposes IO should. The precedent is
in-repo, not hypothetical.

**This gap and #242 are the same work.** #242 ("no way to propagate external cancellation into a
running effect") and the ROADMAP's "cancellation handle" describe one missing capability. Closing
one closes the other, and #242 already carries the design analysis (thread an `AbortSignal` through
the interpreter; per-step granularity; a shallow `Promise.race` implementation would be a lie).

### G2 — Progress callbacks

`Task.withProgress(fn, onProgress)` (`Task.ts:1032`) returns `{ task, cancel, currentProgress }`.
The task body receives `(updateProgress, token)`. No IO equivalent exists.

Note that progress and cancellation are *coupled* in the current API — `withProgress` also returns
`cancel` and passes a token. Any IO design has to decide whether they stay coupled.

### G3 — Eager value vs lazy effect

`TaskOutcome<T>` is an eager Ok/Err value; IO is a lazy effect whose outcome is `Exit`. This is
structural, not a missing method. It is the reason a mechanical find-and-replace cannot work.

## Gaps not in the ROADMAP's list

These are the ones that make G3 harder than "add an interop helper."

### G4 — `TaskOutcome` carries metadata; `Exit` does not

`TaskOutcome` has `readonly _meta: TaskMetadata` where `TaskMetadata = { name: string;
description: string }` — **required**, not optional (`Task.ts:46`). `Exit` has no metadata channel
at all. Every `TaskOutcome → Exit` conversion drops `name` and `description`.

### G5 — Error channels are differently typed

`TaskOutcome.error` is `Throwable` — one fixed type. `IO<R, E, A>` has a caller-chosen `E`. So:

- `Exit<E, A> → TaskOutcome<A>` erases `E` into `Throwable`.
- `TaskOutcome<A> → Exit<E, A>` can only produce `E = Throwable`, which discards the typed error
  channel that is IO's main advantage.

There is no lossless round-trip. "Interop helpers so TaskOutcome-shaped code converts mechanically"
is achievable in one direction at a time, not as an isomorphism.

### G6 — `Exit` now has four states; `TaskOutcome` has two

Since v1.8.0, `Exit` is `Success | Failure | Die | Interrupted`. `TaskOutcome` is `Ok | Err`. A
`Exit → TaskOutcome` mapping collapses `Die` (a defect — not an `E`) and `Interrupted`
(cancellation, which is control flow) into `Err`, re-introducing exactly the conflation that
[#259](https://github.com/jordanburke/functype/issues/259) was fixed to remove.

Any interop helper that goes `Exit → TaskOutcome` is lossy in a way that undoes recent work. That
argues for making the interop one-directional (`TaskOutcome → Exit` only) and letting the deprecated
layer be the only thing that ever goes backwards.

### G7 — `Serialization.ts` depends on Task

`packages/functype/src/serialization/Serialization.ts:24` imports `Task`, with a `Task:` case in
the deserializer at `:92` reconstructing via `Task.ok` / `Task.err`. This is core-internal coupling
the consumer analysis missed.

It is also a **persisted-format** concern, not just a code one: payloads already serialized as
`{ _tag: "Ok", ... }` outlive the code that wrote them. Deleting Task means deciding whether that
tag stays readable.

## Consumer surface

| Consumer | Size | Notes |
|---|---|---|
| `functype-os` | **27 refs**, 3 files | `TaskResult<T>` is the **return type of the async public API** — `Fs`, `Process`, `ConfigResolver`. See G8. |
| `functype-react/src/async/` | **215 LOC**, 6 files | `useTask`, `useTaskPromise`, `useTaskValue`, `TaskBoundary`, `TaskState` |
| `functype/src/serialization/` | 1 import + 1 case | G7 — persisted format |
| `functype/src/index.ts`, `cli/data.ts`, `cli/full-interfaces.ts` | export/doc surface | mechanical |
| `functype-log` | 0 | no Task usage |

### G8 — `functype-os`'s public API returns `TaskResult`

`TaskResult<T> = Promise<TaskOutcome<T>>` (`Task.ts:374`), and it is the declared return type of
functype-os's async surface — e.g. `Fs.exists(p): TaskResult<boolean>` (`Fs.ts:77`). Neither
`TaskResult` nor `TaskOutcome` is re-exported from functype-os; consumers receive the type through
`functype` itself.

Deleting Task therefore changes functype-os's public signatures, not just its internals. That is a
second consumer migration, and it is the reason the ROADMAP's **L** sizing is right — an earlier
read of this repo put functype-os at zero usage because it greps clean for `Task\b`; it uses
`TaskResult`, never the bare `Task` constructor.

Phase C must cover functype-os as well as functype-react, and Phase B's interop helpers have to
serve a `Promise<TaskOutcome<T>>`-shaped API, not only React hooks.

## Decisions Phase B must make explicit

| # | Decision | Options |
|---|---|---|
| **D1** | Cancellation API shape | `io.runFork()` vs `io.runCancellable()`; returns `{ exit, interrupt }` or `{ exit, cancel }`. Must thread `AbortSignal` through the interpreter (#242 option A) — a `Promise.race` shim abandons work rather than cancelling it and should not ship under a cancellation name. |
| **D2** | Progress shape | `IO.withProgress` combinator vs an `onProgress` run-option. Keep it a callback, not a stream. Decide whether it stays coupled to cancellation as `withProgress` currently is. |
| **D3** | Interop direction | Recommend **one-directional** `TaskOutcome → Exit` only, per G6. If `Exit → TaskOutcome` is needed for the 1.x wrapper layer, document it as lossy and confine it to that layer. |
| **D4** | Metadata | Drop `TaskParams`/`TaskMetadata` entirely, or give IO a name/description channel? Dropping is the simpler surface; it is a real capability loss for anyone using it for telemetry. |
| **D5** | `TaskOutcome` name | ROADMAP open decision, leaning `Exit` everywhere. G6 supports that — `Exit` is the strictly more expressive type. |
| **D6** | Serialization tag | Keep `Ok`/`Err` readable for old payloads, or drop with a documented format break? Affects anything that persisted a TaskOutcome. |

## Recommended sequencing

- **Phase B** (1.x minor) — D1 + D2 in IO. Closes #242 in the same work.
- **Phase C** (1.x minor) — **two consumers, not one.** `useIO` / `useIOValue` / `IOBoundary` in
  functype-react, with the existing Task hooks reimplemented as thin wrappers. And an IO-returning
  surface for functype-os's `Fs` / `Process` / `ConfigResolver` alongside the current
  `TaskResult` one (G8). Both behavior-compatible, so consumers feel nothing during 1.x.
- **Phase D** (same minor) — `@deprecated` on the Task module; migration table in the CHANGELOG;
  full doc surface per the 12-step checklist in `packages/functype/CLAUDE.md`. Update the skill
  first — it stops LLMs generating Task code faster than the tag stops humans.
- **Phase E** (2.0) — delete `core/task` and the react wrappers. Rides the `ALLOW_MAJOR` gate.

## Open risk

The extraction-naming rename ([#215](https://github.com/jordanburke/functype/issues/215):
`orElse`→`getOrElse`, `or`→`orElse`) is also 2.0-gated and is the item with a live, silent
foot-gun. Sequencing it behind Phases B–D ships it months later than a focused 2.0 would. That is a
deliberate trade — batching two majors into one — and worth re-checking if Phase B slips.
