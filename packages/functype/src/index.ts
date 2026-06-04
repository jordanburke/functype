// Export branded types (exclude 'unwrap' alias to avoid conflict with do/unwrap)
export {
  BoundedNumber,
  BoundedString,
  Brand,
  BrandedBoolean,
  type BrandedBoolean as BrandedBooleanType,
  BrandedNumber,
  type BrandedNumber as BrandedNumberType,
  BrandedString,
  type BrandedString as BrandedStringType,
  createBrander,
  EmailAddress,
  type ExtractBrand,
  hasBrand,
  IntegerNumber,
  ISO8601Date,
  NonEmptyString,
  NonNegativeNumber,
  PatternString,
  PositiveInteger,
  PositiveNumber,
  type Unwrap,
  unwrapBrand,
  UrlString,
  UUID,
  ValidatedBrand,
  type ValidatedBrandCompanion,
  type ValidatedBrand as ValidatedBrandType,
} from "@/branded"
export * from "@/collections"
export * from "@/companion/Companion"
export * from "@/companion/CompanionTypes"
export * from "@/conditional"
export * from "@/core/base/Base"
export * from "@/core/task/Task"
export * from "@/core/throwable/Throwable"
export * from "@/decoder"
export * from "@/do"
export * from "@/either/Either"
export * from "@/error"
export * from "@/extractable"
export * from "@/fetch"
export * from "@/foldable"
export * from "@/foldable/Foldable"
export * from "@/functype"
export * from "@/hkt"
export * from "@/identity/Identity"
export * from "@/io"
export * from "@/lazy"
export * from "@/list/LazyList"
export * from "@/list/List"
// TEMPORARY (1.3.x): Logger is NOT re-exported from the top barrel.
// Users access it via the `functype/logger` subpath only:
//   import type { Logger } from "functype/logger"
//
// Why: rolldown 1.1.0 (the bundler under tsdown) has a non-deterministic
// chunk-splitter bug — same source, same node, same lockfile, sometimes
// produces a graph where `Companion$N` is referenced but not defined in
// the main `src-*.js` chunks, breaking `import { IO } from "functype"`
// for downstream consumers. The bug triggers more reliably when more
// type-only re-exports are stitched through the heavily-interconnected
// Companion graph from this top barrel.
//
// Removing the Logger re-export here cuts that graph density slightly
// and stabilizes CI without affecting runtime behavior. Logger remains
// fully reachable via the `functype/logger` subpath (advertised in
// package.json `exports`, emitted as a separate tsdown entry).
//
// RESTORE when: rolldown ships a fix for chunk-splitter determinism.
// Track at https://github.com/rolldown/rolldown/issues — file one with
// a repro if no matching issue exists. Once fixed, restore parity with
// every other functype type (top barrel + subpath) for ergonomics.
export * from "@/map/Map"
export * from "@/map/shim"
export * from "@/matchable"
export * from "@/obj/Obj"
export * from "@/option/Option"
export * from "@/pipe"
export * from "@/ref"
export * from "@/serializable/Serializable"
export * from "@/serialization"
export * as Serialization from "@/serialization/Serialization"
export * from "@/set/Set"
export * from "@/stack/Stack"
export * from "@/traversable/KVTraversable"
export * from "@/traversable/Traversable"
export * from "@/try/Try"
export * from "@/tuple/Tuple"
export * from "@/typeable/Typeable"
export * from "@/typeclass"
export * from "@/types"
export * from "@/valuable/Valuable"
