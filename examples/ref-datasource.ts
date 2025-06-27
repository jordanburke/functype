import { Ref } from "@/ref"
import { Either, Option, List, Map as FMap, Left, Right } from "@/index"

// Example: Using Ref to manage state without let

// 1. Simple counter without let
function createCounter() {
  const count = Ref(0)

  return {
    increment: () => count.update((n) => n + 1),
    decrement: () => count.update((n) => n - 1),
    get: () => count.get(),
    reset: () => count.set(0),
  }
}

// 2. Connection pool with Ref
interface Connection {
  id: string
  inUse: boolean
}

interface PoolState {
  connections: List<Connection>
  activeCount: number
}

interface ConnectionPool {
  addConnection(conn: Connection): void
  acquire(): Option<Connection>
  release(connId: string): void
  getStats(): { total: number; active: number; available: number }
}

function ConnectionPool(): ConnectionPool {
  const state = Ref<PoolState>({
    connections: List<Connection>([]),
    activeCount: 0,
  })

  return {
    addConnection: (conn: Connection) => {
      state.update((s) => ({
        connections: List([...s.connections, conn]),
        activeCount: s.activeCount,
      }))
    },

    acquire: () => {
      return state.modify((s) => {
        const available = s.connections.find((c) => !c.inUse)

        return available.fold(
          () => [s, Option.none()],
          (conn) => {
            const updated = { ...conn, inUse: true }
            const newConnections = s.connections.map((c) => (c.id === conn.id ? updated : c))
            const newState = {
              connections: newConnections,
              activeCount: s.activeCount + 1,
            }
            return [newState, Option(updated)]
          },
        )
      })
    },

    release: (connId: string) => {
      state.update((s) => ({
        connections: s.connections.map((c) => (c.id === connId ? { ...c, inUse: false } : c)),
        activeCount: Math.max(0, s.activeCount - 1),
      }))
    },

    getStats: () => {
      const s = state.get()
      return {
        total: s.connections.size,
        active: s.activeCount,
        available: s.connections.count((c) => !c.inUse),
      }
    },
  }
}

// 3. Cache with Ref
interface SimpleCache<K, V> {
  get(key: K): Option<V>
  set(key: K, value: V): void
  getOrCompute(key: K, compute: () => V): V
  clear(): void
  getStats(): { size: number; hits: number; misses: number; hitRate: number }
}

function SimpleCache<K, V>(): SimpleCache<K, V> {
  const cache = Ref(FMap<K, V>())
  const hits = Ref(0)
  const misses = Ref(0)

  return {
    get: (key: K) => {
      const value = cache.get().get(key)

      if (!value.isEmpty) {
        hits.update((n) => n + 1)
      } else {
        misses.update((n) => n + 1)
      }

      return value
    },

    set: (key: K, value: V) => {
      cache.update((map) => FMap([...map, [key, value]]))
    },

    getOrCompute: (key: K, compute: () => V) => {
      const existing = cache.get().get(key)
      if (!existing.isEmpty) {
        hits.update((n) => n + 1)
        return existing.get()
      }

      misses.update((n) => n + 1)
      const value = compute()
      cache.update((map) => FMap([...map, [key, value]]))
      return value
    },

    clear: () => {
      cache.set(FMap<K, V>())
    },

    getStats: () => {
      const h = hits.get()
      const m = misses.get()
      return {
        size: cache.get().size,
        hits: h,
        misses: m,
        hitRate: h / (h + m) || 0,
      }
    },
  }
}

// 4. Request rate limiter with Ref
interface RateLimiter {
  tryAcquire(tokensRequested?: number): boolean
  getAvailableTokens(): number
}

function RateLimiter(maxTokens: number, refillRate: number): RateLimiter {
  const tokens = Ref(maxTokens)
  const lastRefill = Ref(Date.now())

  return {
    tryAcquire: (tokensRequested = 1) => {
      return tokens.modify((currentTokens) => {
        const now = Date.now()
        const lastRefillTime = lastRefill.getAndSet(now)
        const timePassed = (now - lastRefillTime) / 1000

        const tokensToAdd = Math.min(timePassed * refillRate, maxTokens - currentTokens)

        const availableTokens = currentTokens + tokensToAdd

        if (availableTokens >= tokensRequested) {
          return [availableTokens - tokensRequested, true]
        } else {
          return [availableTokens, false]
        }
      })
    },

    getAvailableTokens: () => {
      tokens.modify((currentTokens) => {
        const now = Date.now()
        const lastRefillTime = lastRefill.getAndSet(now)
        const timePassed = (now - lastRefillTime) / 1000

        const tokensToAdd = Math.min(timePassed * refillRate, maxTokens - currentTokens)

        const availableTokens = currentTokens + tokensToAdd
        return [availableTokens, availableTokens]
      })
      return tokens.get()
    },
  }
}

// 5. Async task queue with Ref
interface TaskQueue<T> {
  enqueue(task: () => Promise<T>): void
  getResults(): List<Either<Error, T>>
  clearResults(): void
}

function TaskQueue<T>(): TaskQueue<T> {
  const queue = Ref(List<() => Promise<T>>([]))
  const running = Ref(false)
  const results = Ref(List<Either<Error, T>>([]))

  const processNext = async (): Promise<void> => {
    const canProcess = running.compareAndSet(false, true)
    if (!canProcess) return

    while (true) {
      const task = queue.modify((q) => {
        if (q.isEmpty) {
          return [q, Option.none<() => Promise<T>>()]
        }
        const arr = [...q]
        const head = arr[0]
        return [List(arr.slice(1)), Option(head)]
      })

      if (task.isEmpty) {
        running.set(false)
        break
      }

      try {
        const result = await task.get()()
        results.update((r) => List([...r, Right(result) as Either<Error, T>]))
      } catch (error) {
        results.update((r) =>
          List([...r, Left(error instanceof Error ? error : new Error(String(error))) as Either<Error, T>]),
        )
      }
    }
  }

  return {
    enqueue: (task: () => Promise<T>) => {
      queue.update((q) => List([...q, task]))
      processNext()
    },

    getResults: () => results.get(),

    clearResults: () => {
      results.set(List<Either<Error, T>>([]))
    },
  }
}

// Example usage
export async function exampleRefUsage() {
  // 1. Counter
  const counter = createCounter()
  counter.increment()
  counter.increment()
  console.log("Counter:", counter.get()) // 2

  // 2. Connection pool
  const pool = ConnectionPool()
  pool.addConnection({ id: "conn1", inUse: false })
  pool.addConnection({ id: "conn2", inUse: false })

  const conn1 = pool.acquire()
  console.log("Acquired:", conn1.map((c) => c.id).getOrElse("none"))
  console.log("Pool stats:", pool.getStats())

  if (!conn1.isEmpty) {
    pool.release(conn1.get().id)
  }
  console.log("After release:", pool.getStats())

  // 3. Cache
  const cache = SimpleCache<string, number>()
  console.log("Cache miss:", cache.get("key1").getOrElse(-1))

  const value = cache.getOrCompute("key1", () => {
    console.log("Computing value...")
    return 42
  })
  console.log("Computed:", value)
  console.log("Cache hit:", cache.get("key1").getOrElse(-1))
  console.log("Cache stats:", cache.getStats())

  // 4. Rate limiter
  const limiter = RateLimiter(5, 1) // 5 tokens, 1 per second

  for (let i = 0; i < 7; i++) {
    const allowed = limiter.tryAcquire()
    console.log(`Request ${i + 1}: ${allowed ? "allowed" : "rate limited"}`)
  }

  // Wait and try again
  await new Promise((resolve) => setTimeout(resolve, 2000))
  console.log("After 2 seconds, available tokens:", limiter.getAvailableTokens())

  // 5. Task queue
  const queue = TaskQueue<number>()

  // Enqueue some tasks
  for (let i = 0; i < 5; i++) {
    queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return i * 2
    })
  }

  // Wait for completion
  await new Promise((resolve) => setTimeout(resolve, 600))

  const results = queue.getResults()
  console.log(
    "Task results:",
    results
      .map((r) =>
        r.fold(
          () => -1,
          (value) => value,
        ),
      )
      .toArray(),
  )
}
