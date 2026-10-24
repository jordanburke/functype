/* eslint-disable simple-import-sort/exports -- the value export must come before its type-only alias: TypeDoc names the pages after the first export it meets, so alias-first gives IO no page of its own. test/docs/site-links.spec.ts checks the order. */
export { Lazy } from "./Lazy"
export type { Lazy as LazyType } from "./Lazy"
