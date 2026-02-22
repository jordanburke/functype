/**
 * Public API for functype CLI data.
 * Re-exports curated type/interface metadata for use by tooling (MCP servers, editors, etc.)
 */

export type { InterfaceData, TypeData } from "./data"
export { CATEGORIES, INTERFACES, TYPES, VERSION } from "./data"
export { FULL_INTERFACES } from "./full-interfaces"
