import type { Type } from "@/types"

import { Context } from "./Context"
import type { IO } from "./IO"
import { IO as IOCompanion } from "./IO"
import { Tag } from "./Tag"

/**
 * TestClock provides controlled time for testing IO effects.
 *
 * Instead of waiting for real time to pass, you can advance the clock manually,
 * making tests for timeouts, delays, and scheduled operations fast and deterministic.
 *
 * @example
 * ```typescript
 * const test = TestClock.test(async (clock) => {
 *   // Start a delayed effect
 *   const fiber = IO.sleep(1000).map(() => "done").runExit()
 *
 *   // Advance time by 1 second
 *   await clock.advance(1000)
 *
 *   // Effect should complete
 *   const exit = await fiber
 *   expect(exit.isSuccess()).toBe(true)
 * })
 * ```
 */

/**
 * Scheduled task in the TestClock
 */
interface ScheduledTask {
  readonly time: number
  readonly resolve: () => void
}

/**
 * TestClock interface for controlling time in tests
 */
export interface TestClock {
  /**
   * Current virtual time in milliseconds
   */
  readonly currentTime: number

  /**
   * Advances the clock by the specified duration.
   * All scheduled tasks with a time <= new current time will be executed.
   * @param ms - Milliseconds to advance
   */
  advance(ms: number): Promise<void>

  /**
   * Sets the clock to a specific time.
   * @param ms - The absolute time to set
   */
  setTime(ms: number): Promise<void>

  /**
   * Runs all pending tasks immediately.
   */
  runAll(): Promise<void>

  /**
   * Gets the number of pending scheduled tasks.
   */
  readonly pendingCount: number

  /**
   * Sleeps for the specified duration using virtual time.
   * @param ms - Milliseconds to sleep
   */
  sleep(ms: number): Promise<void>
}

/**
 * Creates a new TestClock instance
 */
const createTestClock = (): TestClock => {
  let _currentTime = 0
  const _scheduled: ScheduledTask[] = []

  const processScheduled = async (): Promise<void> => {
    // Sort by time to process in order
    _scheduled.sort((a, b) => a.time - b.time)

    // Process all tasks that should have completed
    while (_scheduled.length > 0 && _scheduled[0] !== undefined && _scheduled[0].time <= _currentTime) {
      const task = _scheduled.shift()
      if (task) {
        task.resolve()
        // Allow microtasks to run
        await Promise.resolve()
      }
    }
  }

  return {
    get currentTime() {
      return _currentTime
    },

    async advance(ms: number): Promise<void> {
      _currentTime += ms
      await processScheduled()
    },

    async setTime(ms: number): Promise<void> {
      _currentTime = ms
      await processScheduled()
    },

    async runAll(): Promise<void> {
      // Set time to the max scheduled time and process all
      if (_scheduled.length > 0) {
        const lastTask = _scheduled[_scheduled.length - 1]
        if (lastTask) {
          _currentTime = lastTask.time
        }
      }
      await processScheduled()
    },

    get pendingCount() {
      return _scheduled.length
    },

    sleep(ms: number): Promise<void> {
      return new Promise((resolve) => {
        _scheduled.push({
          time: _currentTime + ms,
          resolve,
        })
      })
    },
  }
}

/**
 * Service tag for TestClock
 */
export const TestClockTag = Tag<TestClock>("TestClock")

/**
 * TestClock companion object with factory methods
 */
export const TestClock = {
  /**
   * Creates a new TestClock instance
   */
  make: createTestClock,

  /**
   * Tag for dependency injection
   */
  tag: TestClockTag,

  /**
   * Creates a test environment with a TestClock and runs the test function.
   *
   * @example
   * ```typescript
   * await TestClock.test(async (clock) => {
   *   const result = await IO.sleep(100).map(() => "done")
   *     .pipe(clock.runWithClock)
   *   expect(result).toBe("done")
   * })
   * ```
   */
  test: async <A>(f: (clock: TestClock) => Promise<A>): Promise<A> => {
    const clock = createTestClock()
    return f(clock)
  },

  /**
   * Creates an IO that accesses the TestClock from the environment.
   */
  get: IOCompanion.service(TestClockTag),

  /**
   * Creates an IO that advances the TestClock.
   */
  advance: (ms: number): IO<TestClock, never, void> =>
    IOCompanion.serviceWithIO(TestClockTag, (clock) => IOCompanion.async(() => clock.advance(ms))) as unknown as IO<
      TestClock,
      never,
      void
    >,

  /**
   * Creates an IO that sets the TestClock time.
   */
  setTime: (ms: number): IO<TestClock, never, void> =>
    IOCompanion.serviceWithIO(TestClockTag, (clock) => IOCompanion.async(() => clock.setTime(ms))) as unknown as IO<
      TestClock,
      never,
      void
    >,

  /**
   * Creates an IO that runs all pending tasks.
   */
  runAll: IOCompanion.serviceWithIO(TestClockTag, (clock) => IOCompanion.async(() => clock.runAll())),

  /**
   * Creates a context with a TestClock for testing.
   */
  context: (): { clock: TestClock; context: ReturnType<typeof Context.make<TestClock>> } => {
    const clock = createTestClock()
    const context = Context.make(TestClockTag, clock)
    return { clock, context }
  },
}

/**
 * TestContext provides a complete test environment with mocked services.
 */
export interface TestContext<R extends Type> {
  /**
   * The context containing test services
   */
  readonly context: ReturnType<typeof Context.empty<R>>

  /**
   * The TestClock for controlling time
   */
  readonly clock: TestClock

  /**
   * Adds a service to the test context
   */
  withService<S extends Type>(tag: Tag<S>, service: S): TestContext<R & S>

  /**
   * Provides the test context to an IO effect and runs it
   */
  run<E extends Type, A extends Type>(effect: IO<R, E, A>): Promise<A>
}

/**
 * Creates a TestContext for testing IO effects with mocked services.
 *
 * @example
 * ```typescript
 * const ctx = TestContext.make()
 *   .withService(Logger, mockLogger)
 *   .withService(Database, mockDb)
 *
 * const result = await ctx.run(myProgram)
 * ```
 */
export const TestContext = {
  /**
   * Creates a new empty TestContext
   */
  make: <R extends Type = never>(): TestContext<R> => {
    const clock = createTestClock()
    let ctx = Context.empty<R>()

    const testContext: TestContext<R> = {
      get context() {
        return ctx
      },

      get clock() {
        return clock
      },

      withService<S extends Type>(tag: Tag<S>, service: S): TestContext<R & S> {
        ctx = ctx.add(tag, service) as ReturnType<typeof Context.empty<R>>
        return testContext as unknown as TestContext<R & S>
      },

      async run<E extends Type, A extends Type>(effect: IO<R, E, A>): Promise<A> {
        return effect.provideContext(ctx).runOrThrow()
      },
    }

    return testContext
  },

  /**
   * Creates a TestContext with a TestClock already provided
   */
  withClock: (): TestContext<TestClock> => {
    const clock = createTestClock()
    return TestContext.make<TestClock>().withService(TestClockTag, clock)
  },
}
