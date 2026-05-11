# IO.gen Variance Fix — Design Document

**Date**: 2026-04-01
**Status**: Implemented (pragmatic fix), proper redesign deferred
**Affects**: `src/io/IO.ts`

## Problem

`IO.gen` required `Generator<IO<any, any, any>, A, any>` as its parameter type. TypeScript's structural type system deeply compares all properties and method signatures when checking assignability. This caused `IO<never, never, void>` to fail assignability to `IO<any, any, any>` because:

1. `_effect: IOEffect<R, E, A>` is a discriminated union containing nested IO references — deep variance cascaded through FlatMap, Map, Bracket, etc.
2. Method signatures like `flatten(this: IO<R, E, IO<R2, E2, B>>)` create contravariant `this` positions where `any` is not assignable to `never`.

**Impact**: External packages building on IO (like functype-log) couldn't use `IO.gen` without explicit `Generator<any, number, any>` annotations or `as unknown as` casts.

## Current Fix (v0.55.0)

Three changes to `src/io/IO.ts`:

### 1. Symbol-keyed effect property

```typescript
// Before
readonly _effect: IOEffect<R, E, A>

// After
export const IOEffectKey: unique symbol = Symbol.for("functype/IO/effect")
readonly [IOEffectKey]: IOEffect<R, E, A>
```

Symbol-keyed properties are opaque to structural comparison — TypeScript won't traverse `IOEffect`'s nested union when checking IO assignability. Internal `_fx()` helper extracts the effect cleanly:

```typescript
const _fx = <R, E, A>(io: IO<R, E, A>): IOEffect<R, E, A> => (io as any)[IOEffectKey]
```

**Assessment**: Permanent, good architecture. Effect-TS uses the same pattern.

### 2. IOYieldable marker interface

```typescript
export interface IOYieldable {
  readonly [Symbol.toStringTag]: string
}

gen: <A extends Type>(f: () => Generator<IOYieldable, A, any>): IO<never, any, A>
```

Replaces `IO<any, any, any>` with a minimal marker that any IO instance satisfies without triggering deep comparison.

**Assessment**: Pragmatic hack. `IOYieldable` is too loose — any object with `[Symbol.toStringTag]` matches. Works because `IO.gen` already uses `unsafeCoerce` internally. Replaceable with no downstream impact (only used in one signature).

### 3. Iterator TNext = unknown

```typescript
// Before
[Symbol.iterator](): Generator<IO<R, E, A>, A, A>

// After
[Symbol.iterator](): Generator<IO<R, E, A>, A, unknown>
```

When `A = never` (e.g. `IO.fail`), the old `TNext = A` became `never`, making `yield*` impossible since generators send `any` which isn't assignable to `never`.

**Assessment**: Permanent, correct fix. `unknown` is the right type for generator input — the runtime always sends the resolved value, but TypeScript doesn't need to track this.

## Future Proper Redesign

When needed, replace `IOYieldable` with proper variance annotations:

### Option A: TypeScript variance annotations (4.7+)

```typescript
// Variance annotations on the IO interface type parameters
export interface IO<out R extends Type, out E extends Type, out A extends Type> {
  // ...
}
```

The `out` annotation tells TypeScript these parameters are covariant without checking every method signature. This is the simplest proper fix but requires careful verification that R, E, A are truly used covariantly in all positions (they're not — `mapError` uses E contravariantly, `flatten` uses R/E contravariantly via `this`).

### Option B: Branded phantom type (Effect-TS approach)

```typescript
declare const IOVariance: unique symbol

export interface IO<R extends Type, E extends Type, A extends Type> {
  readonly [IOVariance]: {
    readonly _R: (_: never) => R // covariant
    readonly _E: (_: never) => E // covariant
    readonly _A: (_: never) => A // covariant
  }
  // ... methods
}
```

Function return types are covariant, so `(_: never) => R` makes R covariant without analyzing every method. This is how Effect-TS achieves `Effect<never, never, void>` assignable to `Effect<any, any, any>`.

### Option C: Separate public interface from internal

Split IO into a minimal `IOBase` (just the brand + iterator) and `IO` (full methods):

```typescript
interface IOBase<R, E, A> {
  readonly [IOBrand]: { R: R; E: E; A: A }
  [Symbol.iterator](): Generator<IOBase<R, E, A>, A, unknown>
}

interface IO<R, E, A> extends IOBase<R, E, A> {
  map<B>(f: (a: A) => B): IO<R, E, B>
  // ... all methods
}

// IO.gen only requires IOBase
gen: <A>(f: () => Generator<IOBase<any, any, any>, A, any>): IO<never, any, A>
```

### Recommendation

**Option B** is the most robust and proven approach. It's what Effect-TS uses in production with millions of downloads. The key insight: carrying variance through phantom function types is a well-established TypeScript pattern that doesn't require `out` annotations (which can't express mixed variance).

### Migration Impact

Replacing `IOYieldable` with any of these options:

- Changes 1 type in `IO.gen` signature
- Changes 1 interface field in `IO`
- No runtime changes
- No public API changes
- No downstream impact (IOYieldable is not exported for use)

## Test Coverage

The fix includes a test that proves `IO.gen` works without workarounds:

```typescript
it("should work with IO<never, never, void> without explicit generator annotation", async () => {
  interface Logger {
    info: (msg: string) => IO<never, never, void>
  }
  const LoggerTag = Tag<Logger>("Logger")

  const program = IO.gen(function* () {
    const log = yield* IO.service(LoggerTag)
    yield* log.info("hello")
    const x = yield* IO.succeed(42)
    return x
  })
  // ... asserts program runs correctly with provided service
})
```

Existing `IO.gen` tests were cleaned up to remove `Generator<any, number, any>` workarounds.
