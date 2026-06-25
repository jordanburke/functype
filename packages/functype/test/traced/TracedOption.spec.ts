import { describe, it, expect, beforeEach } from "vitest"
import { None, Some } from "../../src/option/Option.js"
import { TracedOption } from "../../src/traced/TracedOption.js"
import type { TraceEvent } from "../../src/traced/TraceEvent.js"
import type { Tracer } from "../../src/traced/Tracer.js"

describe("TracedOption", () => {
  let events: TraceEvent[]
  let tracer: Tracer

  beforeEach(() => {
    events = []
    tracer = { emit: (e) => events.push(e) }
  })

  // ── construction ───────────────────────────────────────────────────────────

  it("accepts a fixed spanId so tests can assert span identity", () => {
    TracedOption(Some(1), tracer, "fixed-span").map((n) => n + 1)
    expect(events[0]?.spanId).toBe("fixed-span")
  })

  it("wraps a None without emitting on construction", () => {
    TracedOption(None<number>(), tracer, "s")
    expect(events).toHaveLength(0)
  })

  // ── map ────────────────────────────────────────────────────────────────────

  it("emits map event with inTag=Some outTag=Some", () => {
    TracedOption(Some(1), tracer, "s").map((n) => n + 1, "increment")
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      op: "map",
      tag: "Option",
      inTag: "Some",
      outTag: "Some",
      label: "increment",
      seq: 0,
    })
  })

  it("emits map event on None — inTag=None outTag=None", () => {
    TracedOption(None<number>(), tracer, "s").map((n) => n + 1)
    expect(events[0]).toMatchObject({ op: "map", inTag: "None", outTag: "None" })
  })

  // ── flatMap ────────────────────────────────────────────────────────────────

  it("emits flatMap event capturing collapse from Some to None", () => {
    TracedOption(Some(5), tracer, "s").flatMap((n) => (n > 10 ? Some(n) : None()), "gt10")
    expect(events[0]).toMatchObject({
      op: "flatMap",
      inTag: "Some",
      outTag: "None",
      label: "gt10",
    })
  })

  it("emits flatMap event — Some stays Some when fn matches", () => {
    TracedOption(Some(20), tracer, "s").flatMap((n) => (n > 10 ? Some(n * 2) : None()))
    expect(events[0]).toMatchObject({ op: "flatMap", inTag: "Some", outTag: "Some" })
  })

  // ── filter ─────────────────────────────────────────────────────────────────

  it("emits filter event with kept=true when predicate passes", () => {
    TracedOption(Some(5), tracer, "s").filter((n) => n > 3, "gt3")
    expect(events[0]).toMatchObject({
      op: "filter",
      inTag: "Some",
      outTag: "Some",
      meta: { kept: true },
      label: "gt3",
    })
  })

  it("emits filter event with kept=false when predicate fails", () => {
    TracedOption(Some(2), tracer, "s").filter((n) => n > 3)
    expect(events[0]).toMatchObject({ op: "filter", inTag: "Some", outTag: "None", meta: { kept: false } })
  })

  it("emits filter on None with kept=false regardless of predicate", () => {
    TracedOption(None<number>(), tracer, "s").filter((n) => n > 0)
    expect(events[0]).toMatchObject({ op: "filter", inTag: "None", outTag: "None", meta: { kept: false } })
  })

  // ── seq threading ──────────────────────────────────────────────────────────

  it("increments seq across chained ops in the same span", () => {
    TracedOption(Some(1), tracer, "span-x")
      .map((n) => n + 1)
      .filter((n) => n > 0)
      .flatMap((n) => Some(n * 10))

    expect(events).toHaveLength(3)
    expect(events.map((e) => e.seq)).toEqual([0, 1, 2])
    expect(new Set(events.map((e) => e.spanId)).size).toBe(1)
  })

  // ── terminal: fold ─────────────────────────────────────────────────────────

  it("fold on Some calls onSome and emits event without outTag", () => {
    const result = TracedOption(Some(7), tracer, "s").fold(
      () => -1,
      (n) => n * 2,
      "double",
    )
    expect(result).toBe(14)
    expect(events[0]).toMatchObject({ op: "fold", inTag: "Some", label: "double" })
    expect(events[0]).not.toHaveProperty("outTag")
  })

  it("fold on None calls onNone and emits event", () => {
    const result = TracedOption(None<number>(), tracer, "s").fold(
      () => -1,
      (n) => n * 2,
    )
    expect(result).toBe(-1)
    expect(events[0]).toMatchObject({ op: "fold", inTag: "None" })
  })

  // ── terminal: orElse ───────────────────────────────────────────────────────

  it("orElse on Some returns the contained value with usedDefault=false", () => {
    const result = TracedOption(Some(42), tracer, "s").orElse(0, "fallback")
    expect(result).toBe(42)
    expect(events[0]).toMatchObject({ op: "orElse", inTag: "Some", meta: { usedDefault: false }, label: "fallback" })
    expect(events[0]).not.toHaveProperty("outTag")
  })

  it("orElse on None returns the default with usedDefault=true", () => {
    const result = TracedOption(None<number>(), tracer, "s").orElse(99, "fallback")
    expect(result).toBe(99)
    expect(events[0]).toMatchObject({ op: "orElse", inTag: "None", meta: { usedDefault: true } })
  })

  // ── unwrap ─────────────────────────────────────────────────────────────────

  it("unwrap returns the inner Option without emitting", () => {
    const inner = Some(7)
    const result = TracedOption(inner, tracer, "s").unwrap()
    expect(result).toBe(inner)
    expect(events).toHaveLength(0)
  })

  // ── full chain ─────────────────────────────────────────────────────────────

  it("full chain emits all events in order with correct ops and variants", () => {
    TracedOption(Some(3), tracer, "full")
      .map((n) => n * 2, "double")      // Some(3) → Some(6)
      .filter((n) => n < 5, "lt5")      // Some(6) → None  (6 < 5 is false)
      .orElse(0, "default")             // None → 0

    expect(events).toHaveLength(3)
    expect(events.map((e) => e.op)).toEqual(["map", "filter", "orElse"])
    expect(events.map((e) => e.inTag)).toEqual(["Some", "Some", "None"])
    expect(events[0]?.outTag).toBe("Some")
    expect(events[1]?.outTag).toBe("None")
    expect(events[2]).not.toHaveProperty("outTag")
    expect(events.map((e) => e.seq)).toEqual([0, 1, 2])
  })
})
