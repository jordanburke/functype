# functype feedback

Based on actual verification from the dokploy-mcp-server migration (13 tools, IO+Match, tagged-union `ApiError`).

## Keep doing

- **`<out E>` / `<out A>` variance in 0.60.2** — textbook execution. Two `IOEffect` union branches widened to `unknown` inputs (matching the existing `Map`/`FlatMap`/`MapError` trick), plus variance annotations. Eliminated `apiSucceed` shims and `.exhaustive()` casts across 13 files. Biggest single ergonomic win of the release cycle.
- **`catchTag` signature** — `Extract<E, {_tag: K}>` narrows the handler param, `Exclude<E, {_tag: K}>` removes the handled tag from the outer error channel. Textbook tag-aware recovery. Rewrote two `recoverWith` sites to `catchTag` in dokploy; code reads measurably cleaner.
- **`IO.tryPromise({try, catch})`** — right shape for boundary-lifting Promise-based APIs (we used it for `getOrganizationId`).
- **`Match.case(...).exhaustive()` exhaustiveness** — caught at least one enum typo during migration.
- **IO declaration merging (type + value)** — `import { IO, Match } from "functype"` covers both signature position and `.succeed`/`.fail` calls. Same idiom as TS `class` and Scala companion objects. Works correctly as-is.

## Gaps worth fixing — ranked

### 1. `Option.orElse` is eager; Scala's is lazy via by-name

Current:

```ts
orElse<T2 extends Type>(defaultValue: T2): T | T2
```

Scala:

```scala
def getOrElse[B >: A](default: => B): B   // `: => B` is by-name — lazy
```

Scala's by-name sugar hides a thunk. TypeScript has no equivalent, so `defaultValue: T2` is eager — `opt.orElse(expensive())` always runs `expensive()`, even when `opt.isSome()`. A lot of functype's audience is coming from Scala and will assume laziness.

Fix options:

- **Add `orElseGet<T2>(supplier: () => T2): T | T2`** (Java `Optional` naming) — non-breaking.
- **Rename current to `orElseValue`, add lazy `orElse(() => T2)`** — breaking, but semantics match Scala precisely.

I'd ship the first; recommend the second in a major version.

### 2. `.catchTag` is undocumented in the skill

Star of IO's recovery API, zero mentions in `SKILL.md` or any of the three reference files. First-time users write manual `err._tag === "X" ? ... : IO.fail(err)` inside `recoverWith` — which is what the skill shows — when `.catchTag("X", handler)` does the same thing with compile-time narrowing and tag removal from the return type. Skill gap, not library gap.

### 3. No cookbook for the Match + IO tool-dispatch pattern

Each primitive is documented in isolation; the composition (action enum → Match → IO-returning handlers → tagged-error recovery → boundary throw) is absent. This is the canonical MCP / tool-server pattern and it repeated 13 times verbatim in dokploy. A `references/tool-dispatch.md` with the full recipe would short-circuit the deduction for every future consumer.

### 4. `.run()` vs `.runExit()` needs one-line guidance

`.runExit()` appears in `SKILL.md` once without a pick-this-over-that note. The distinction:

- `.run()` → `Either<E, A>` (two-state)
- `.runExit()` → `Exit<E, A>` (Success / Failure / Interrupted, three-state)

Consumers who don't care about interruption should use `.run()`; one sentence in docs would prevent the footgun confusion (which I initially mis-diagnosed as a library bug — it isn't).

### 5. Typed-errors discipline scattered across docs

The "tagged union as error channel → `.catchTag` to narrow and recover → boundary throw for non-FP consumers" pattern is the point of `E` in `IO<R, E, A>`. Currently the components are documented separately. Worth a `references/typed-errors.md` pulling it together with a concrete example.

## Minor / nice-to-have

### 6. `Match.exhaustive()` return-type doesn't propagate through outer arrows

Every `buildXProgram(...): IO<never, ApiError, string>` must declare the return type explicitly — Match's chain doesn't unify up through an outer arrow. Low priority; may not be fixable without Match's type-machinery changes.

### 7. Say explicitly that `import { IO, Match } from "functype"` is the recommended import

Declaration merging handles both type and value positions. New users (especially coming from libs that keep them separate) default to `import type { IO }` + separate value import + alias, which is cargo. One line in the IO docs — "the value-space import covers both positions; no alias needed" — would prevent this.

## Retractions (for the record — don't chase)

- **`.runExit()` is not a footgun.** `Exit` is a proper three-state sum with guarded accessors (`.value` / `.error` / `.fiberId`). My earlier claim was wrong; it's just a different shape than `Either`.
- **IO type/value import ambiguity.** Declaration merging works cleanly. My "alias dance" complaint was self-inflicted cargo.

## Priority ranking for issues to file

1. **`Option.orElseGet` (lazy variant)** — real API gap, biggest ergonomic win remaining after variance.
2. **Skill: add `.catchTag` to IO recovery section + new `references/tool-dispatch.md`** — highest-leverage doc work.
3. **Skill: new `references/typed-errors.md`** — consolidates the discipline.
4. **Skill: one-line `.run()` vs `.runExit()` guidance.**
5. **Skill: "recommended import" note on IO page.**

Everything above line 1 is polish. Library is in good shape — `<out E>` was the hard fix and it landed.
