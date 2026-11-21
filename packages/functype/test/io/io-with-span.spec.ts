/**
 * `IO.withSpan` (#276 §11, additive in 2.0). A span opened inside another nests under it without
 * being passed a parent, the span is active for the whole body, and every outcome closes it once.
 *
 * The tracer here is a fake backed by `AsyncLocalStorage`, as OpenTelemetry's context manager is on
 * Node. It records each span's name, attributes, parent and outcome.
 */
import { AsyncLocalStorage } from "node:async_hooks"

import { describe, expect, it, vi } from "vitest"

import type { ExitType, SpanAttributes } from "@/io"
import { IO, SpanTracer, TimeoutError } from "@/io"

type FakeSpan = {
  readonly name: string
  readonly attributes: SpanAttributes
  readonly parent: FakeSpan | undefined
  readonly ends: ExitType<unknown, unknown>["_tag"][]
}

const fakeTracer = () => {
  const storage = new AsyncLocalStorage<FakeSpan>()
  const spans: FakeSpan[] = []
  const tracer: SpanTracer<FakeSpan> = {
    start(name, attributes, parent) {
      const span: FakeSpan = { name, attributes, parent, ends: [] }
      spans.push(span)
      return span
    },
    run: (span, fn) => storage.run(span, fn),
    end(span, exit) {
      span.ends.push(exit._tag)
    },
  }
  const named = (name: string): FakeSpan => {
    const span = spans.find((s) => s.name === name)
    if (!span) throw new Error(`no span named ${name}`)
    return span
  }
  return { tracer, spans, named, active: (): string | undefined => storage.getStore()?.name }
}

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** An `IO.async` that, like `fetch`, waits a long time and rejects when its signal aborts. */
const abortable = IO.async<number>(
  (signal) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(1), 60_000)
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer)
          reject(new Error("aborted"))
        },
        { once: true },
      )
    }),
)

describe("withSpan: the span is active", () => {
  it("directly inside the body", async () => {
    const { tracer, active } = fakeTracer()
    const program = IO.sync(active).withSpan("a").provideService(SpanTracer, tracer)
    expect(await program.runOrThrow()).toBe("a")
  })

  it("after an await in an IO.async and an IO.tryPromise thunk", async () => {
    const { tracer, active } = fakeTracer()
    const viaAsync = IO.async(async () => {
      await tick(1)
      return active()
    }).withSpan("async")
    const viaTryPromise = IO.tryPromise({
      try: async () => {
        await tick(1)
        return active()
      },
      catch: (e) => e,
    }).withSpan("tryPromise")
    expect(await viaAsync.provideService(SpanTracer, tracer).runOrThrow()).toBe("async")
    expect(await viaTryPromise.provideService(SpanTracer, tracer).runOrThrow()).toBe("tryPromise")
  })

  it("in a log sink called from inside the body", async () => {
    const { tracer, active } = fakeTracer()
    const lines: string[] = []
    const sink = (message: string): void => {
      lines.push(`${active() ?? "-"} ${message}`)
    }
    const program = IO.sync(() => sink("before"))
      .flatMap(() => IO.async(() => tick(1)))
      .flatMap(() => IO.sync(() => sink("after")))
      .withSpan("request")
    await program.provideService(SpanTracer, tracer).runOrThrow()
    sink("outside")
    expect(lines).toEqual(["request before", "request after", "- outside"])
  })

  it("gets the attributes, or {} when none are given", async () => {
    const { tracer, named } = fakeTracer()
    await IO.succeed(1)
      .withSpan("with", { "user.id": "u1", retries: 2, tags: ["a", "b"] })
      .withSpan("without")
      .provideService(SpanTracer, tracer)
      .runOrThrow()
    expect(named("with").attributes).toEqual({ "user.id": "u1", retries: 2, tags: ["a", "b"] })
    expect(named("without").attributes).toEqual({})
  })
})

describe("withSpan: nesting", () => {
  it("an inner span parents to the outer one without being passed it", async () => {
    const { tracer, named, active } = fakeTracer()
    const inner = IO.async(async () => {
      await tick(1)
      return active()
    }).withSpan("inner")
    const program = IO.sync(active)
      .flatMap((before) => inner.map((during) => [before, during]))
      .withSpan("outer")
    expect(await program.provideService(SpanTracer, tracer).runOrThrow()).toEqual(["outer", "inner"])
    expect(named("inner").parent).toBe(named("outer"))
    expect(named("outer").parent).toBeUndefined()
  })

  it("a finished span doesn't leak into the next step", async () => {
    const { tracer, named, active } = fakeTracer()
    const program = IO.sync(() => 1)
      .withSpan("first")
      .flatMap(() => IO.sync(active))
      .flatMap((inParent) =>
        IO.sync(() => 2)
          .withSpan("second")
          .map(() => inParent),
      )
      .withSpan("parent")
    expect(await program.provideService(SpanTracer, tracer).runOrThrow()).toBe("parent")
    expect(named("second").parent).toBe(named("parent"))

    const top = fakeTracer()
    const after = IO.sync(() => 1)
      .withSpan("only")
      .flatMap(() => IO.sync(top.active))
    expect(await after.provideService(SpanTracer, top.tracer).runOrThrow()).toBeUndefined()
  })

  it("parallel IO.all children each see their own span, with no sibling leak", async () => {
    const { tracer, named, active } = fakeTracer()
    const child = (name: string, wait: number) =>
      IO.async(async () => {
        const before = active()
        await tick(wait)
        return [before, active()]
      }).withSpan(name)
    const program = IO.all([child("a", 15), child("b", 1), child("c", 8)]).withSpan("all")
    expect(await program.provideService(SpanTracer, tracer).runOrThrow()).toEqual([
      ["a", "a"],
      ["b", "b"],
      ["c", "c"],
    ])
    ;["a", "b", "c"].forEach((name) => expect(named(name).parent).toBe(named("all")))
  })

  it("two concurrent runs of one program don't see each other's span", async () => {
    const { tracer, spans, active } = fakeTracer()
    const program = (name: string, wait: number) =>
      IO.async(async () => {
        await tick(wait)
        return active()
      })
        .withSpan(`${name}.inner`)
        .withSpan(name)
        .provideService(SpanTracer, tracer)
    const [a, b] = await Promise.all([program("a", 10).runOrThrow(), program("b", 1).runOrThrow()])
    expect([a, b]).toEqual(["a.inner", "b.inner"])
    const parents = Object.fromEntries(spans.map((s) => [s.name, s.parent?.name]))
    expect(parents).toEqual({ a: undefined, "a.inner": "a", b: undefined, "b.inner": "b" })
  })
})

describe("withSpan: every outcome closes the span exactly once", () => {
  const outcome = async (body: IO<never, unknown, unknown>, signal?: AbortSignal) => {
    const { tracer, named } = fakeTracer()
    const exit = await body.withSpan("s").provideService(SpanTracer, tracer).runExit({ signal })
    return { exit: exit._tag, ends: named("s").ends }
  }

  it("success", async () => {
    expect(await outcome(IO.succeed(1))).toEqual({ exit: "Success", ends: ["Success"] })
  })

  it("typed failure", async () => {
    expect(await outcome(IO.fail("e"))).toEqual({ exit: "Failure", ends: ["Failure"] })
  })

  it("Die, from IO.die and from a throwing callback", async () => {
    expect(await outcome(IO.die(new Error("bug")))).toEqual({ exit: "Die", ends: ["Die"] })
    const throwing = IO.succeed(1).map(() => {
      throw new Error("bug")
    })
    expect(await outcome(throwing)).toEqual({ exit: "Die", ends: ["Die"] })
  })

  it("interruption, from IO.interrupt and from an aborted run", async () => {
    expect(await outcome(IO.interrupt())).toEqual({ exit: "Interrupted", ends: ["Interrupted"] })
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5)
    expect(await outcome(IO.sleep(60_000), controller.signal)).toEqual({
      exit: "Interrupted",
      ends: ["Interrupted"],
    })
  })

  it("a failure after the run aborted closes the span as interrupted", async () => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5)
    expect(await outcome(abortable, controller.signal)).toEqual({ exit: "Interrupted", ends: ["Interrupted"] })
  })

  it("a span outside interruptOn sees the typed InterruptedError as a failure", async () => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5)
    expect(await outcome(IO.sleep(60_000).interruptOn(controller.signal))).toEqual({
      exit: "Failure",
      ends: ["Failure"],
    })
  })

  it("a throwing tracer run still ends the span once, and the run reports a Die", async () => {
    const { tracer, named } = fakeTracer()
    const broken: SpanTracer<FakeSpan> = {
      ...tracer,
      run: () => {
        throw new Error("tracer bug")
      },
    }
    const exit = await IO.succeed(1).withSpan("s").provideService(SpanTracer, broken).runExit()
    expect(exit._tag).toBe("Die")
    expect(named("s").ends).toEqual(["Die"])
  })
})

describe("withSpan: race and timeout", () => {
  it("a race loser's span closes as interrupted", async () => {
    const { tracer, named } = fakeTracer()
    const program = IO.race([
      IO.sleep(1)
        .map(() => "fast")
        .withSpan("fast"),
      IO.sleep(60_000)
        .map(() => "slow")
        .withSpan("slow"),
      abortable.map(() => "fetch").withSpan("fetch"),
    ]).withSpan("race")
    expect(await program.provideService(SpanTracer, tracer).runOrThrow()).toBe("fast")
    await vi.waitFor(() => expect(named("fetch").ends).toHaveLength(1))
    expect(named("fast").ends).toEqual(["Success"])
    expect(named("slow").ends).toEqual(["Interrupted"])
    expect(named("fetch").ends).toEqual(["Interrupted"])
    ;["fast", "slow", "fetch"].forEach((name) => expect(named(name).parent).toBe(named("race")))
  })

  it("a timed-out effect's span closes as interrupted", async () => {
    const { tracer, named } = fakeTracer()
    const program = IO.sleep(60_000).withSpan("slow").timeout(5).withSpan("deadline")
    const exit = await program.provideService(SpanTracer, tracer).runExit()
    expect(exit.isFailure() && exit.error instanceof TimeoutError).toBe(true)
    await vi.waitFor(() => expect(named("slow").ends).toHaveLength(1))
    expect(named("slow").ends).toEqual(["Interrupted"])
    expect(named("deadline").ends).toEqual(["Failure"])
    expect(named("slow").parent).toBe(named("deadline"))
  })
})

/** What `runSync` returns, or what it throws. */
const syncOutcome = (io: IO<never, unknown, unknown>): unknown => {
  try {
    return io.runSync()
  } catch (e) {
    return { threw: e }
  }
}

describe("withSpan without a tracer", () => {
  it("returns the same results and records nothing", async () => {
    const { spans } = fakeTracer()
    const programs: ReadonlyArray<IO<never, unknown, unknown>> = [
      IO.succeed(1),
      IO.fail("e"),
      IO.die("bug"),
      IO.interrupt(),
      IO.all([IO.succeed(1), IO.async(() => Promise.resolve(2))]),
    ]
    const traced = programs.map((p) => p.withSpan("x", { a: 1 }).withSpan("y"))
    const plain = await Promise.all(programs.map((p) => p.runExit()))
    const untraced = await Promise.all(traced.map((p) => p.runExit()))
    expect(untraced).toEqual(plain)
    expect(traced.map(syncOutcome)).toEqual(programs.map(syncOutcome))
    expect(spans).toHaveLength(0)
  })

  it("a span outside the provideService sees no tracer", async () => {
    const { tracer, spans, active } = fakeTracer()
    const program = IO.sync(active).withSpan("inside").provideService(SpanTracer, tracer).withSpan("outside")
    expect(await program.runOrThrow()).toBe("inside")
    expect(spans.map((s) => s.name)).toEqual(["inside"])
  })
})

describe("withSpan under runSync", () => {
  it("works: the span is active, nests, and closes once", () => {
    const { tracer, named, active } = fakeTracer()
    const program = IO.sync(active).withSpan("inner").withSpan("outer").provideService(SpanTracer, tracer)
    expect(program.runSyncOrThrow()).toBe("inner")
    expect(named("inner").parent).toBe(named("outer"))
    expect(named("inner").ends).toEqual(["Success"])
    expect(named("outer").ends).toEqual(["Success"])
  })

  it("closes the span with the Die when the body can't run synchronously", () => {
    const { tracer, named } = fakeTracer()
    const program = IO.async(() => Promise.resolve(1))
      .withSpan("s")
      .provideService(SpanTracer, tracer)
    expect(() => program.runSync()).toThrow("Cannot run async effect synchronously")
    expect(named("s").ends).toEqual(["Die"])
  })
})

describe("an OpenTelemetry-shaped bridge", () => {
  // A structural stand-in for the parts of @opentelemetry/api the docs' bridge uses. No OpenTelemetry
  // package is installed: this checks that the sketch compiles against SpanTracer without a cast.
  type OtelContext = { readonly span?: OtelSpan }
  // OpenTelemetry's Attributes, copied: mutable arrays, so a readonly array wouldn't fit.
  type OtelAttributes = {
    [key: string]:
      | string
      | number
      | boolean
      | Array<null | undefined | string>
      | Array<null | undefined | number>
      | Array<null | undefined | boolean>
      | undefined
  }
  type OtelSpan = {
    readonly name: string
    readonly parentName: string | undefined
    readonly status: { code: number }[]
    ended: boolean
    setStatus(status: { code: number }): void
    end(): void
  }
  const storage = new AsyncLocalStorage<OtelContext>()
  const context = {
    active: (): OtelContext => storage.getStore() ?? {},
    with: <T>(ctx: OtelContext, fn: () => T): T => storage.run(ctx, fn),
  }
  const trace = {
    setSpan: (ctx: OtelContext, span: OtelSpan): OtelContext => ({ ...ctx, span }),
    getActiveSpan: (): OtelSpan | undefined => context.active().span,
  }
  const otel = {
    startSpan: (name: string, _options: { attributes?: OtelAttributes }, ctx: OtelContext): OtelSpan => ({
      name,
      parentName: ctx.span?.name,
      status: [],
      ended: false,
      setStatus(status) {
        this.status.push(status)
      },
      end() {
        this.ended = true
      },
    }),
  }

  const bridge: SpanTracer<OtelSpan> = {
    start: (name, attributes, parent) =>
      otel.startSpan(name, { attributes }, parent ? trace.setSpan(context.active(), parent) : context.active()),
    run: (span, fn) => context.with(trace.setSpan(context.active(), span), fn),
    end: (span, exit) => {
      if (exit._tag === "Failure" || exit._tag === "Die") span.setStatus({ code: 2 })
      span.end()
    },
  }

  it("makes the span active, nests under an ambient span, and ends it", async () => {
    const seen: OtelSpan[] = []
    const program = IO.async(async () => {
      await tick(1)
      const span = trace.getActiveSpan()
      if (span) seen.push(span)
    })
      .flatMap(() => IO.fail("e"))
      .withSpan("child")
      .provideService(SpanTracer, bridge)
    const ambient = otel.startSpan("ambient", { attributes: {} }, {})
    const exit = await context.with(trace.setSpan({}, ambient), () => program.runExit())
    expect(exit._tag).toBe("Failure")
    expect(seen.map((s) => [s.name, s.parentName, s.ended, s.status])).toEqual([
      ["child", "ambient", true, [{ code: 2 }]],
    ])
  })
})
