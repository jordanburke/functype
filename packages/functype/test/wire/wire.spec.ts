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
})
