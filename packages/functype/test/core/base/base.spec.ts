/**
 * `Base(type, body).doUnwrap()` reads a List-like body through its `head()` method. Since 2.0 a
 * List's and a Set's `head` is a method (#276 §13), so the old fallback that read `head` as a
 * property is gone; these tests pin what a List or Set body still yields.
 *
 * An empty List or Set used to yield `undefined` as a success: the check called `isEmpty()`, but
 * `isEmpty` is a getter, so it never matched. It now reads the getter.
 */
import { describe, expect, it } from "vitest"

import { Base, List, Set } from "@/index"

const unwrap = (body: Record<string, unknown>): unknown => Base("Test", body).doUnwrap()
const asBody = (value: object): Record<string, unknown> => value as unknown as Record<string, unknown>

describe("Base doUnwrap over a collection body", () => {
  it("a non-empty Set yields its first element", () => {
    expect(unwrap(asBody(Set([3, 1, 2])))).toEqual({ ok: true, value: 3 })
  })

  it("an empty Set is empty", () => {
    expect(unwrap(asBody(Set.empty<number>()))).toEqual({ ok: false, empty: true })
  })

  it("a non-empty List yields its head, and an empty one is empty", () => {
    expect(unwrap(asBody(List([7, 8])))).toEqual({ ok: true, value: 7 })
    expect(unwrap(asBody(List.empty<number>()))).toEqual({ ok: false, empty: true })
  })

  it("a body whose head isn't a method passes through as itself", () => {
    const body = { isEmpty: (): boolean => false, head: 5 }
    expect(unwrap(body)).toEqual({ ok: true, value: body })
  })
})
