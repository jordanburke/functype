import { describe, it, expect, vi } from "vitest"
import { IO } from "@/io"
import { Tracer } from "../../src/traced/Tracer.js"
import { TracerLive } from "../../src/traced/TracerLive.js"
import type { TraceEvent } from "../../src/traced/TraceEvent.js"

const sampleEvent: TraceEvent = {
  spanId: "span-1",
  seq: 0,
  op: "map",
  tag: "Option",
  inTag: "Some",
  outTag: "Some",
  label: "test",
}

describe("TracerLive", () => {
  describe("noop()", () => {
    it("silently discards events without throwing", async () => {
      await expect(
        IO.service(Tracer)
          .map((t) => t.emit(sampleEvent))
          .provideLayer(TracerLive.noop())
          .runOrThrow(),
      ).resolves.not.toThrow()
    })
  })

  describe("collecting(target)", () => {
    it("appends emitted events into the provided array", async () => {
      const captured: TraceEvent[] = []
      await IO.service(Tracer)
        .map((t) => t.emit(sampleEvent))
        .provideLayer(TracerLive.collecting(captured))
        .runOrThrow()

      expect(captured).toHaveLength(1)
      expect(captured[0]).toEqual(sampleEvent)
    })

    it("appends multiple events in order", async () => {
      const captured: TraceEvent[] = []
      await IO.service(Tracer)
        .map((t) => {
          t.emit({ ...sampleEvent, seq: 0 })
          t.emit({ ...sampleEvent, seq: 1 })
          t.emit({ ...sampleEvent, seq: 2 })
        })
        .provideLayer(TracerLive.collecting(captured))
        .runOrThrow()

      expect(captured.map((e) => e.seq)).toEqual([0, 1, 2])
    })
  })

  describe("console(prefix?)", () => {
    it("calls console.log once per emitted event", async () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => undefined)
      await IO.service(Tracer)
        .map((t) => t.emit(sampleEvent))
        .provideLayer(TracerLive.console("[test]"))
        .runOrThrow()

      expect(spy).toHaveBeenCalledOnce()
      expect(spy.mock.calls[0]?.[0]).toContain("[test]")
      spy.mockRestore()
    })
  })
})
