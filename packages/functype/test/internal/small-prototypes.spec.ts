/**
 * Identity, Tag, Context and Ref share their methods (#276 §14). The cross-type rules are in
 * shared-prototypes.spec.ts; this file pins what each of the four does differently.
 */
import { describe, expect, it } from "vitest"

import { Context, Identity, Ref, SpanTracer, Tag } from "@/index"

describe("Ref", () => {
  it("reads and writes its value through its methods", () => {
    const ref = Ref(1)
    expect(ref.get()).toBe(1)
    ref.set(2)
    expect(ref.get()).toBe(2)
    ref.update((n) => n + 1)
    expect(ref.get()).toBe(3)
    expect(ref.getAndSet(10)).toBe(3)
    expect(ref.updateAndGet((n) => n * 2)).toBe(20)
    expect(ref.getAndUpdate((n) => n + 1)).toBe(20)
    expect(ref.get()).toBe(21)
    expect(ref.compareAndSet(0, 5)).toBe(false)
    expect(ref.compareAndSet(21, 5)).toBe(true)
    expect(ref.modify((n) => [n + 1, `was ${n}`])).toBe("was 5")
    expect(ref.get()).toBe(6)
    expect(Ref.of("a").get()).toBe("a")
  })

  it("keeps each Ref's value apart", () => {
    const a = Ref(1)
    const b = Ref(1)
    a.set(2)
    expect(b.get()).toBe(1)
  })

  it("compares by its current value in test matchers", () => {
    const ref = Ref(1)
    expect(ref).toEqual(Ref(1))
    ref.set(2)
    expect(ref).not.toEqual(Ref(1))
  })

  it("isn't frozen, since it changes in place", () => {
    expect(Object.isFrozen(Ref(1))).toBe(false)
  })

  it("throws on a detached call", () => {
    const { get } = Ref(1)
    expect(() => get()).toThrow(TypeError)
  })
})

describe("Tag", () => {
  it("is frozen, and prints its id", () => {
    const tag = Tag<number>("Port")
    expect(Object.isFrozen(tag)).toBe(true)
    expect(tag.toString()).toBe("Tag(Port)")
    expect(Object.keys(tag)).toEqual(["_tag", "id"])
  })

  it("makes SpanTracer a Tag like any other", () => {
    expect(Object.getPrototypeOf(SpanTracer)).toBe(Object.getPrototypeOf(Tag("x")))
    expect(SpanTracer.toString()).toBe("Tag(functype/SpanTracer)")
  })
})

describe("Context", () => {
  const Port = Tag<number>("Port")
  const Host = Tag<string>("Host")

  it("is frozen, and keeps only its tag and services", () => {
    const ctx = Context.make(Port, 80)
    expect(Object.isFrozen(ctx)).toBe(true)
    expect(Object.keys(ctx)).toEqual(["_tag", "services"])
  })

  it("adds and merges into new contexts, leaving the old one alone", () => {
    const one = Context.make(Port, 80)
    const two = one.add(Host, "localhost")
    expect(one.size).toBe(1)
    expect(two.size).toBe(2)
    expect(two.get(Host).orThrow()).toBe("localhost")
    expect(one.has(Host)).toBe(false)

    const merged = Context.empty().merge(two)
    expect(merged.unsafeGet(Port)).toBe(80)
    expect(merged.toString()).toBe("Context(Port, Host)")
    expect(() => Context.empty().unsafeGet(Port)).toThrow("Service not found: Port")
    expect(Context.empty().get(Port).isNone()).toBe(true)
  })

  it("is recognized by isContext", () => {
    expect(Context.isContext(Context.empty())).toBe(true)
    expect(Context.isContext({})).toBe(false)
  })
})

describe("Identity", () => {
  it("compares its value with ===", () => {
    expect(Identity(1).isSame(Identity(1))).toBe(true)
    expect(Identity({}).isSame(Identity({}))).toBe(false)
    expect(Identity.of(2).id).toBe(2)
    expect(Identity.pure(2)._tag).toBe("Identity")
  })
})
