export * from "./error-envelope"
export * from "./SerializationCompanion"
// NOTE: Serialization.ts is NOT re-exported here. It imports every Serializable
// type's companion (to build the dispatch table), so re-exporting from this
// index would create a cycle: per-type module → @/serialization → Serialization
// → per-type module (undefined at evaluation time).
//
// Public access to the namespace goes through the root `src/index.ts` instead,
// where it appears AFTER all per-type modules have loaded.
//
// Type-only re-exports are safe here — TS erases them at compile time, so they
// can't cause a runtime cycle. This lets consumers do
// `import type { JSONValue } from "functype"` in addition to the namespaced
// `Serialization.JSONValue` form.
export type { JSONValue } from "./Serialization"
