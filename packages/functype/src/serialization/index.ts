export * from "./error-envelope"
export * from "./SerializationCompanion"
// NOTE: Serialization.ts is NOT re-exported here. It imports every Serializable
// type's companion (to build the dispatch table), so re-exporting from this
// index would create a cycle: per-type module → @/serialization → Serialization
// → per-type module (undefined at evaluation time).
//
// Public access goes through the root `src/index.ts` instead, where it appears
// AFTER all per-type modules have loaded.
