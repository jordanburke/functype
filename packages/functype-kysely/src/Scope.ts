import type { IOType } from "functype"
import { IO } from "functype"
import type { Kysely, KyselyPlugin } from "kysely"

/**
 * One transaction or savepoint: the connection-level state that IO's own types can't carry.
 *
 * - `lock` serializes everything that runs on the scope: its queries, its nested savepoints and its
 *   commit or rollback. One transaction is one connection, so statements on it run one at a time
 *   anyway; the lock also keeps a savepoint's whole life (open, body, release or rollback) from
 *   interleaving with a sibling's, and makes a commit wait for a nested scope still running after a
 *   `timeout` or `race` gave up on it.
 * - `failed` records that a query on this scope threw. Postgres aborts a transaction on any error,
 *   and its COMMIT then rolls back without an error, so a scope with a failed query must not report
 *   a commit. A nested `Db.transaction` is how a program recovers from a failed query.
 */
export type Scope = {
  readonly lock: Lock
  readonly failed: { value: boolean }
}

type Lock = {
  /** Resolves with the unlock function once every earlier holder has unlocked. */
  readonly acquire: () => Promise<() => void>
}

const createLock = (): Lock => {
  // eslint-disable-next-line functype/no-let -- the queue's tail, replaced on each acquire
  let tail: Promise<void> = Promise.resolve()
  return {
    acquire: () => {
      // eslint-disable-next-line functype/no-let -- set by the executor below, before anyone reads it
      let unlock: () => void = () => undefined
      const held = new Promise<void>((resolve) => {
        unlock = resolve
      })
      const ready = tail.then(() => unlock)
      tail = tail.then(() => held)
      return ready
    },
  }
}

const scopes = new WeakMap<object, Scope>()

/** The scope of a transaction object, made on first use. */
export const scopeOf = (trx: object): Scope => {
  const existing = scopes.get(trx)
  if (existing !== undefined) return existing
  const scope: Scope = { lock: createLock(), failed: { value: false } }
  scopes.set(trx, scope)
  return scope
}

/** Runs `io` while holding `scope`'s lock, and unlocks on every outcome. */
export const withLock = <R, E, A>(scope: Scope, io: IOType<R, E, A>): IOType<R, E, A> =>
  IO.bracket(
    IO.async(() => scope.lock.acquire()).recoverWith((e) => IO.die(e)) as unknown as IOType<R, E, () => void>,
    () => io,
    (unlock) => IO.sync(unlock) as unknown as IOType<R, never, void>,
  )

/** Marks the scope as having had a failed query. */
export const markFailed = (scope: Scope): void => {
  scope.failed.value = true
}

const NO_OP: KyselyPlugin = {
  transformQuery: ({ node }) => node,
  transformResult: ({ result }) => Promise.resolve(result),
}

/**
 * A second handle on the same transaction and connection, with the same plugins, so a savepoint
 * gets a scope of its own.
 */
export const childHandle = <DB>(trx: Kysely<DB>): Kysely<DB> => trx.withPlugin(NO_OP)
