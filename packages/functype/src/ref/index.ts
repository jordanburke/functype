/* eslint-disable simple-import-sort/exports -- the value export must come before its type-only alias: TypeDoc names the pages after the first export it meets, so alias-first gives Ref no page of its own. test/docs/site-links.spec.ts checks the order. */
export { Ref } from "./Ref"
export type { Ref as RefType } from "./Ref"
