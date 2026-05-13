/**
 * `functype-react` — React bindings for the functype FP library.
 *
 * The main entry re-exports Tier 1 (stable hooks + ADT hooks) and Tier 2
 * (Match family components) — the surface most apps will touch. Tier 3
 * (`./async`) and Tier 4 (`./forms`) stay subpath-only so that consumers
 * who don't need Suspense/Task or applicative forms tree-shake them out.
 */
export * from "./hooks"
export * from "./match"
