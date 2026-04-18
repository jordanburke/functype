# Variance Guide

A contributor reference for keeping functype's containers covariant.

## Why it matters

A TypeScript type declared `Either<SpecificError, number>` should assign without cast to `Either<UnionError, number>` when `SpecificError` is a subtype of `UnionError`. That's the whole point of tagged-union error handling — users write functions that return narrow tagged errors and compose them into wider error-set pipelines. If the container is _invariant_ in its type parameter (TypeScript's default for interfaces with methods that use the param in both positions), the assignment fails and every call site needs explicit widening.

functype went through three releases (0.57.2 → 0.59.1) learning what it takes to keep a whole family of containers covariant in the presence of TS's limits (no lower-bound generics, no built-in variance for structural types). This document is the recipe.

## Scala correspondence

functype mirrors Scala's collection variance model:

| Scala                         | functype                   | Variance                                          |
| ----------------------------- | -------------------------- | ------------------------------------------------- |
| `List[+A]`                    | `List<out A>`              | covariant                                         |
| `Set[A]`                      | `Set<out A>`               | covariant (functype goes further than Scala here) |
| `Map[K, +V]`                  | `Map<K, out V>`            | V covariant, K invariant                          |
| `Option[+A]`                  | `Option<out T>`            | covariant                                         |
| `Either[+L, +R]`              | `Either<out L, out R>`     | covariant in both                                 |
| `Try[+T]`                     | `Try<out T>`               | covariant                                         |
| `scala.util.Either` sum types | `FunctypeSum<A, Tag>` base | no collection ops, clean covariance               |
| `scala.concurrent.stm.Ref`    | `Ref<A>`                   | invariant by design                               |

## The four method-shape rules

All covariant containers follow these patterns. When adding a new method, pick the matching rule.

### 1. Element-query / removal — accept `unknown`

Methods that check "is this value present?" or "remove this value" take `unknown` instead of the element type.

```ts
contains(value: unknown): boolean
indexOf(value: unknown): number
remove(value: unknown): List<A>
has(value: unknown): boolean
```

**Scala correspondence:** `List[+A].-(elem: Any)`, `contains(elem: Any)`, `indexOf(elem: Any)`.

**Why it's safe:** At runtime, equality with an unrelated value just returns `false` / is a no-op. There's no type-level lie because the method doesn't promise anything about the element it was handed.

### 2. Additive — widen the element type

Methods that add an element to the container widen the result's type parameter.

```ts
add<B>(item: B): List<A | B>
prepend<B>(item: B): List<A | B>
concat<B>(other: List<B>): List<A | B>
push<B>(value: B): Stack<A | B>
set<V2>(key: K, value: V2): Map<K, V | V2>
```

**Scala correspondence:** `List[+A].::[B >: A](elem: B): List[B]`, `++[B >: A]`. Scala uses a lower-bound supertype constraint; TypeScript expresses the same semantic via a free generic and a union return.

**Why it's safe:** `List<A> + B` produces `List<A | B>` at the type level, which accurately reflects the runtime contents.

### 3. Aggregation — `Widen<A, B>` with default `B = A`

Reduce-shaped methods use `Widen<A, B>` to enforce that `B` is a supertype of `A`. The helper lives in `src/typeclass/variance.ts`.

```ts
import type { Widen } from "@/typeclass"

reduce<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B>
reduceRight<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B>
```

**Scala correspondence:** `def reduce[B >: A](op: (B, B) => B): B`.

**How `Widen<A, B>` works:** `type Widen<A, B> = A extends B ? B : never`. When `B = A` (default), resolves to `A`. When `B` is a supertype, resolves to `B`. When `B` is unrelated, resolves to `never` — which makes the callback uncallable, so the method call is rejected at compile time. This plugs the type-level gap that would otherwise let `list.reduce<string>(...)` on `List<number>` silently produce a number typed as a string.

**In implementations,** use the `reduceWiden` / `reduceRightWiden` helpers. They centralize the single `as unknown as` cast behind the `Widen<A, B>` public contract:

```ts
import { reduceWiden, reduceRightWiden, type Widen } from "@/typeclass"

reduce: <B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> =>
  reduceWiden<A, Widen<A, B>>(array, op),
```

### 4. Recovery / fallback — widen to `T | U`

Methods that "replace" the container's value with a fallback widen the result's type.

```ts
orElse<T2 extends Type>(defaultValue: T2): T | T2
or<T2 extends Type>(alternative: Extractable<T2>): Extractable<T | T2>
recover<U extends Type>(f: (error: Error) => U): Try<T | U>
recoverWith<U extends Type>(f: (error: Error) => Try<U>): Try<T | U>
```

**Scala correspondence:** `getOrElse[B >: A](default: => B): B`, `recover[U >: T]`.

**Why it's safe:** The return type `T | U` accurately represents what the runtime produces. If the container holds T, the T branch is taken; if the fallback is used, U is returned. No type lie.

## Declaring `<out>` variance

Once every method fits the patterns above, annotate the interface:

```ts
export interface List<out A extends Type> ...
export interface Option<out T extends Type> ...
export interface Either<out L extends Type, out R extends Type> ...
```

**When TS will reject `<out>`:** if any method uses the type parameter in a contravariant position that can't be reconciled (e.g., a callback input combined with an output return type that also mentions the same parameter). The error message will name the offending method — fix it using one of the four rules, then re-add the annotation.

**When to stay invariant:**

- **Mutable cells** (e.g., `Ref<A>`): `set(A)` genuinely writes A, so widening is unsound. Stay invariant and document why.
- **Equality-sensitive keys** (e.g., `Map<K, out V>`): `K` stays invariant because equality is order-sensitive to the exact type. Scala does the same thing.
- **Record types with `keyof`** (e.g., `Obj<T>`): `keyof T` is contravariant, so widening T would lose key-type fidelity. Document it.

**When `<out>` can't be annotated even though runtime is covariant:**

- **Intersection type aliases** (e.g., `Stack<A> = { ... } & Traversable<A> & ...`): TS doesn't support variance annotations on intersections. The methods are still covariance-compatible; subtyping works via structural checks. Leave a comment explaining.

## Contravariant type parameters (`<in T>`)

Useful for "requirements" channels — types representing dependencies/inputs where widening the requirement means accepting **more** contexts.

**Example (planned):** `IO<in R, out E, out A>` — R is the environment a computation needs. Widening R means the computation runs in more environments, so R is contravariant.

Not widely used in functype; only IO currently warrants it.

## Writing the regression test

For any container with declared variance, add `test/<path>/<type>-variance.spec.ts`. Reference templates:

- `test/either/either-variance.spec.ts` — full L+R covariance including swap-through widening (provided by envpkt downstream, comprehensive)
- `test/list/list-variance.spec.ts` — element widening, unknown parameters, reduce with Widen
- `test/typeclass/variance.spec.ts` — the `Widen<A, B>` helper itself

Standard structure:

```ts
import { describe, expect, expectTypeOf, it } from "vitest"
import { YourType } from "@/path/YourType"

describe("YourType covariance", () => {
  it("assigns Narrow to Wide via subtyping", () => {
    const narrow: YourType<Narrow> = ...
    const wide: YourType<Wide> = narrow  // must compile without cast
    expectTypeOf(wide).toEqualTypeOf<YourType<Wide>>()
  })

  it("widens via additive operation", () => {
    const xs: YourType<number> = ...
    const mixed = xs.add("hello")
    expectTypeOf(mixed).toEqualTypeOf<YourType<number | string>>()
  })

  it("rejects Wide-to-Narrow (@ts-expect-error)", () => {
    const wide: YourType<Wide> = ...
    // @ts-expect-error — Wide is not assignable to Narrow
    const narrow: YourType<Narrow> = wide
    void narrow
  })
})
```

Type-only assertions compile as runtime no-ops; they execute in milliseconds and catch regressions invisibly introduced by method-signature changes.

## Historical regressions to watch for

The variance story was painful to get right. Past mistakes worth remembering:

- **0.57.0**: `LeftOf`/`RightOf` split made Either invariant in L via `or`, `ap`, `flatMap`, `flatMapAsync`, `traverse`. Fixed with method-level widening.
- **0.57.3**: L-widening worked for direct cases but `swap()` propagates L into R, so R also had to become covariant. Fixed in 0.58.0 via sum-type hierarchy split + method widening.
- **0.58.0**: `toList()` on sum types poisoned covariance because `List` was still invariant (via `List.remove(A)`). Fixed in 0.58.1 by making List/Set covariant via the patterns above.
- **Pre-0.59**: `reduce<B>` was unconstrained — `list.reduce<string>(...)` on `List<number>` compiled silently. Fixed with `Widen<A, B>`.

## Cheat sheet

```
new method takes an A?         → accept `unknown` if it's a query, or widen via `<B>(B): C<A | B>` if it's additive
new method returns A?          → already fine (covariant output)
new method does both?          → it's a reduce shape — use `Widen<A, B>`
new method has a fallback?     → widen the fallback via `<T2>(...): T | T2`
container won't accept `<out>`? → TS will tell you which method — fix it with one of the rules above
```
