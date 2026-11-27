import type { IOType } from "functype"
import { IO, Option } from "functype"
import type { Kysely, KyselyPlugin } from "kysely"

/**
 * One transaction or savepoint: the connection-level state that IO's own types can't carry.
 *
 * - `lock` serializes everything that runs on the scope: its queries, its nested savepoints and its
 *   commit or rollback. One transaction is one connection, so statements on it run one at a time
 *   anyway; the lock also keeps a savepoint's whole life (open, body, release or rollback) from
 *   interleaving with a sibling's, and makes a commit wait for a nested scope still running after a
 *   `timeout` or `race` gave up on it.
 * - `failed` holds why the scope can't commit, once something on it went wrong: a query that
 *   started and didn't succeed (it failed, or a timeout or cancel gave up on it), or a nested
 *   savepoint whose rollback failed. Postgres aborts a transaction on any failed statement, and its
 *   COMMIT then rolls back without an error; a write given up on may still land. So such a scope
 *   refuses to commit. A nested `Db.transaction` is how a program recovers from a failed query.
 */
export type Scope = {
  readonly lock: Lock
  readonly failed: { value: Option<string> }
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
  const scope: Scope = { lock: createLock(), failed: { value: Option.none() } }
  scopes.set(trx, scope)
  return scope
}

const acquire = (scope: Scope): IOType<never, never, () => void> =>
  IO.async(() => scope.lock.acquire()).recoverWith((e) => IO.die(e))

/** Runs `io` while holding `scope`'s lock, and unlocks on every outcome. */
export const withLock = <R, E, A>(scope: Scope, io: IOType<R, E, A>): IOType<R, E, A> =>
  IO.bracket(
    acquire(scope) as unknown as IOType<R, E, () => void>,
    () => io,
    (unlock) => IO.sync(unlock) as unknown as IOType<R, never, void>,
  )

/** Records why the scope can't commit. The first reason stands. */
export const markFailed = (scope: Scope, reason: string): void => {
  if (scope.failed.value.isNone()) scope.failed.value = Option(reason)
}

export const QUERY_FAILED =
  "A query in this transaction failed, or a timeout or cancel gave up on it, and the program carried on, so the transaction can't commit: Postgres may already have aborted it, and a write given up on may still have landed. Run a query you may need to recover from in a nested Db.transaction."

export const SAVEPOINT_ROLLBACK_FAILED =
  "A nested Db.transaction in this transaction failed to roll back to its savepoint, so the transaction can't commit."

/**
 * Runs one query on a transaction's scope, holding its lock. A query that started and didn't
 * succeed marks the scope, whether it failed, or a timeout or cancel gave up on it, even if it then
 * succeeded. The mark is set in the bracket's release, which runs even in a cancelled region, where
 * error handlers don't.
 */
export const lockedQuery = <E, A>(
  scope: Scope,
  run: (signal?: AbortSignal) => Promise<A>,
  mapError: (error: unknown) => E,
): IOType<never, E, A> =>
  IO.sync((): { started: boolean; signal: Option<AbortSignal> } => ({ started: false, signal: Option.none() })).flatMap(
    (call) =>
      IO.bracketExit(
        acquire(scope) as unknown as IOType<never, E, () => void>,
        () =>
          IO.tryAsync((signal) => {
            call.started = true
            call.signal = Option(signal)
            return run(signal)
          }, mapError),
        (unlock, exit) =>
          IO.sync(() => {
            const mark = (): void => {
              if (call.started) markFailed(scope, QUERY_FAILED)
            }
            // A query that settles after its region was cancelled still succeeds here, though the
            // program has moved on without it.
            const markIfGivenUp = (): void => {
              if (call.signal.exists((signal) => signal.aborted)) mark()
            }
            exit.fold(mark, markIfGivenUp, mark, mark)
            unlock()
          }),
      ),
  )

const NO_OP: KyselyPlugin = {
  transformQuery: ({ node }) => node,
  transformResult: ({ result }) => Promise.resolve(result),
}

/**
 * A second handle on the same transaction and connection, with the same plugins, so a savepoint
 * gets a scope of its own.
 */
export const childHandle = <DB>(trx: Kysely<DB>): Kysely<DB> => trx.withPlugin(NO_OP)
