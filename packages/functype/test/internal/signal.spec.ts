import { getEventListeners } from "node:events"

import { describe, expect, it } from "vitest"

import { anySignal } from "@/internal/signal"

describe("anySignal", () => {
  it("never aborts when given no signals", () => {
    const both = anySignal([undefined, undefined])
    expect(both.signal.aborted).toBe(false)
  })

  it("returns a lone signal as is, with nothing to detach", () => {
    const parent = new AbortController()
    const both = anySignal([undefined, parent.signal])
    expect(both.signal).toBe(parent.signal)
    expect(getEventListeners(parent.signal, "abort")).toHaveLength(0)
  })

  it("starts aborted, with that parent's reason, when a parent already aborted", () => {
    const live = new AbortController()
    const done = new AbortController()
    done.abort("gone")
    const both = anySignal([live.signal, done.signal])
    expect(both.signal.aborted).toBe(true)
    expect(both.signal.reason).toBe("gone")
    expect(getEventListeners(live.signal, "abort")).toHaveLength(0)
  })

  it("aborts with the reason of whichever parent aborts", () => {
    const a = new AbortController()
    const b = new AbortController()
    const both = anySignal([a.signal, b.signal])
    expect(both.signal.aborted).toBe(false)
    b.abort("from b")
    expect(both.signal.aborted).toBe(true)
    expect(both.signal.reason).toBe("from b")
  })

  it("dispose detaches from every parent, so a later abort doesn't reach it", () => {
    const a = new AbortController()
    const b = new AbortController()
    const both = anySignal([a.signal, b.signal])
    expect(getEventListeners(a.signal, "abort")).toHaveLength(1)
    both.dispose()
    expect(getEventListeners(a.signal, "abort")).toHaveLength(0)
    expect(getEventListeners(b.signal, "abort")).toHaveLength(0)
    a.abort()
    expect(both.signal.aborted).toBe(false)
  })
})
