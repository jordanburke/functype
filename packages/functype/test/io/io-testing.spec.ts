import { describe, expect, it } from "vitest"

import { IO, Tag, TestClock, TestContext } from "@/io"

describe("TestClock", () => {
  describe("basic time control", () => {
    it("should start at time 0", async () => {
      await TestClock.test(async (clock) => {
        expect(clock.currentTime).toBe(0)
      })
    })

    it("should advance time", async () => {
      await TestClock.test(async (clock) => {
        await clock.advance(100)
        expect(clock.currentTime).toBe(100)

        await clock.advance(50)
        expect(clock.currentTime).toBe(150)
      })
    })

    it("should set absolute time", async () => {
      await TestClock.test(async (clock) => {
        await clock.setTime(500)
        expect(clock.currentTime).toBe(500)
      })
    })
  })

  describe("scheduled tasks", () => {
    it("should track pending task count", async () => {
      await TestClock.test(async (clock) => {
        expect(clock.pendingCount).toBe(0)

        // Schedule some tasks but don't await
        const p1 = clock.sleep(100)
        const p2 = clock.sleep(200)
        expect(clock.pendingCount).toBe(2)

        // Advance to complete first task
        await clock.advance(100)
        expect(clock.pendingCount).toBe(1)

        // Complete all
        await clock.advance(100)
        expect(clock.pendingCount).toBe(0)

        // Await to avoid unhandled promise
        await Promise.all([p1, p2])
      })
    })

    it("should resolve sleep when time advances", async () => {
      await TestClock.test(async (clock) => {
        let resolved = false

        const sleepPromise = clock.sleep(100).then(() => {
          resolved = true
        })

        // Not resolved yet
        expect(resolved).toBe(false)

        // Advance time
        await clock.advance(100)

        // Wait for promise to resolve
        await sleepPromise
        expect(resolved).toBe(true)
      })
    })

    it("should run all pending tasks", async () => {
      await TestClock.test(async (clock) => {
        const results: number[] = []

        const p1 = clock.sleep(100).then(() => results.push(1))
        const p2 = clock.sleep(200).then(() => results.push(2))
        const p3 = clock.sleep(300).then(() => results.push(3))

        await clock.runAll()
        await Promise.all([p1, p2, p3])

        expect(results).toEqual([1, 2, 3])
        expect(clock.currentTime).toBe(300)
      })
    })

    it("should process tasks in order", async () => {
      await TestClock.test(async (clock) => {
        const results: string[] = []

        const p1 = clock.sleep(50).then(() => results.push("first"))
        const p2 = clock.sleep(100).then(() => results.push("second"))
        const p3 = clock.sleep(25).then(() => results.push("earliest"))

        // Advance time step by step to verify ordering
        await clock.advance(25)
        expect(results).toEqual(["earliest"])

        await clock.advance(25)
        expect(results).toEqual(["earliest", "first"])

        await clock.advance(50)
        expect(results).toEqual(["earliest", "first", "second"])

        await Promise.all([p1, p2, p3])
      })
    })
  })

  describe("make factory", () => {
    it("should create independent clocks", async () => {
      const clock1 = TestClock.make()
      const clock2 = TestClock.make()

      await clock1.advance(100)
      expect(clock1.currentTime).toBe(100)
      expect(clock2.currentTime).toBe(0)
    })
  })

  describe("context factory", () => {
    it("should create clock and context together", () => {
      const { clock, context } = TestClock.context()

      expect(clock).toBeDefined()
      expect(clock.currentTime).toBe(0)
      expect(context).toBeDefined()
    })
  })
})

describe("TestContext", () => {
  interface Logger {
    log(msg: string): string
  }

  interface Config {
    value: number
  }

  const Logger = Tag<Logger>("Logger")
  const Config = Tag<Config>("Config")

  describe("basic usage", () => {
    it("should create empty test context", () => {
      const ctx = TestContext.make()
      expect(ctx).toBeDefined()
      expect(ctx.clock).toBeDefined()
    })

    it("should add services with withService", async () => {
      const mockLogger: Logger = { log: (msg) => `logged: ${msg}` }

      const ctx = TestContext.make<Logger>().withService(Logger, mockLogger)

      const program = IO.service(Logger).flatMap((logger) => IO.sync(() => logger.log("test")))

      const result = await ctx.run(program)
      expect(result).toBe("logged: test")
    })

    it("should chain multiple services", async () => {
      const mockLogger: Logger = { log: (msg) => `logged: ${msg}` }
      const mockConfig: Config = { value: 42 }

      const ctx = TestContext.make<Logger & Config>().withService(Logger, mockLogger).withService(Config, mockConfig)

      const program = IO.Do.bind("logger", () => IO.service(Logger))
        .bind("config", () => IO.service(Config))
        .map(({ logger, config }) => logger.log(`value: ${config.value}`))

      const result = await ctx.run(program as unknown as IO<Logger & Config, never, string>)
      expect(result).toBe("logged: value: 42")
    })
  })

  describe("withClock", () => {
    it("should create context with TestClock service", () => {
      const ctx = TestContext.withClock()
      expect(ctx.clock).toBeDefined()
    })
  })
})

describe("IO with TestClock", () => {
  it("should allow accessing TestClock via service", async () => {
    const { clock, context } = TestClock.context()

    const program = IO.service(TestClock.tag).map((c) => c.currentTime)

    const result = await program.provideContext(context).runOrThrow()
    expect(result).toBe(0)

    await clock.advance(100)
    const result2 = await program.provideContext(context).runOrThrow()
    expect(result2).toBe(100)
  })
})
