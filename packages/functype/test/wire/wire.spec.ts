import { describe, expect, expectTypeOf, it } from "vitest"

import { List } from "@/list/List"
import type { Wire } from "@/wire"

/**
 * Wire<T> marks a value in its serialization-safe shape — a DB row, an HTTP body, a JSONB payload,
 * a workflow input (#325 B). It wraps ANY boundary shape: a collection, a nullable field, or a whole
 * row/DTO type. It must stay bidirectionally assignable with the plain type (no casts at call sites)
 * and keep `null`, which is the shape that survives JSON.stringify.
 */

type Row = { readonly id: string; readonly email: string | null }

describe("Wire<T>", () => {
  it("keeps null in a nullable field — an intersection brand would collapse it to never", () => {
    const email: Wire<string | null> = null
    const plain: string | null = email
    const back: Wire<string | null> = plain
    expect(back).toBeNull()
    expectTypeOf<null>().toMatchTypeOf<Wire<string | null>>()
  })

  it("wraps a collection and stays assignable both ways with ReadonlyArray", () => {
    const rows: Wire<ReadonlyArray<Row>> = [{ id: "1", email: null }]
    const plain: ReadonlyArray<Row> = rows
    const back: Wire<ReadonlyArray<Row>> = plain
    expect(
      List(back)
        .map((r) => r.id)
        .toArray(),
    ).toEqual(["1"])
  })

  it("wraps a whole row type, covering every nullable field inside it", () => {
    const row: Wire<Row> = { id: "1", email: null }
    const plain: Row = row
    const back: Wire<Row> = plain
    expect(JSON.parse(JSON.stringify(back))).toEqual({ id: "1", email: null })
  })

  it("keeps undefined through the conditional (optional fields round-trip in TS terms)", () => {
    const maybe: Wire<string | undefined> = undefined
    expect(maybe).toBeUndefined()
  })

  it("no longer means 'array of T' — Wire<Row> is one row (compile-loud migration)", () => {
    const one: Wire<Row> = { id: "1", email: null }
    // @ts-expect-error — `Wire<Row>` used to be `ReadonlyArray<Row>`; the new form is `Wire<ReadonlyArray<Row>>`.
    const asArray: ReadonlyArray<Row> = one
    expect(asArray).toBeDefined()
  })

  it("accepts any value under Wire<unknown> (an intersection brand would make it a weak type)", () => {
    const a: Wire<unknown> = "x"
    const b: Wire<unknown> = null
    const c: Wire<unknown> = { a: 1 }
    expect([a, b, c]).toHaveLength(3)
  })

  it("works in generic nullable plumbing — the common findOne-style DB helper", async () => {
    const one = <R>(x: R | null): Wire<R | null> => x
    const findOne = async <R>(x: R | null): Promise<Wire<R | null>> => x
    expect(one<Row>(null)).toBeNull()
    expect(await findOne<Row>({ id: "1", email: null })).toEqual({ id: "1", email: null })
  })

  it("still type-checks object literals for excess properties", () => {
    // @ts-expect-error — `extra` is not a field of Row; Wire must not weaken literal checks.
    const row: Wire<Row> = { id: "1", email: null, extra: true }
    expect(row).toBeDefined()
  })

  it("documents the two 1.9 usages that stay silent: Wire<object> and Wire<any> still accept an array", () => {
    // These compile under both definitions, so the 1.9 → 1.10 change cannot be caught by the compiler
    // here. Neither was a sensible 1.9 usage (Wire<object> meant ReadonlyArray<object>), so the CHANGELOG
    // names them rather than the type trying to reject them.
    const rows: ReadonlyArray<Row> = []
    const asObject: Wire<object> = rows
    const asAny: Wire<any> = rows // eslint-disable-line @typescript-eslint/no-explicit-any -- documenting the silent path
    expect([asObject, asAny]).toHaveLength(2)
  })
})
