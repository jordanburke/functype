import { describe } from "vitest"

import rule from "../../src/rules/prefer-fold"
import { ruleTester } from "../utils/rule-tester"

/**
 * `checkGuards`: an early-exit guard followed by unwrapping (`if (e.isLeft()) return …; use(e.value)`)
 * is imperative branching. `orElse(default)` and `fold` are both proper ways to leave the container and
 * are never flagged. CivalaOS: 7 of 15 type-aware no-get-unsafe hits were `.orThrow()` right after a guard.
 */
const options = [{ checkGuards: true }]

const guard = (code: string, receiver: string, advice: string) => ({
  code,
  options,
  errors: [{ messageId: "preferFoldGuard" as const, data: { receiver, advice } }],
})

describe("prefer-fold checkGuards", () => {
  ruleTester.run("prefer-fold", rule, {
    valid: [
      {
        name: "Off by default",
        code: "function f(e) { if (e.isLeft()) return e; return e.value + 1 }",
      },
      {
        name: "orElse after the guard is a proper exit, not flagged",
        code: "function f(o) { if (o.isNone()) return 0; return o.orElse(0) }",
        options,
      },
      {
        name: "fold is never flagged",
        code: "function f(e) { return e.fold((l) => 0, (r) => r + 1) }",
        options,
      },
      {
        name: "A guard with no unwrap after it is plain validation",
        code: "function f(e) { if (e.isLeft()) return e; log('ok'); return e }",
        options,
      },
      {
        name: "A guard whose continuation only maps is already functional",
        code: "function f(e) { if (e.isLeft()) return e; return e.map((r) => r + 1) }",
        options,
      },
      {
        name: "An if/else is prefer-fold's existing check, not a guard",
        code: "function f(e) { if (e.isLeft()) { return 0 } else { return 1 } }",
        options: [{ checkGuards: true, minComplexity: 3 }],
      },
      {
        name: "@interop with a reason exempts the guard",
        code: `
          /**
           * @interop the step runner needs a throw.
           */
          function step(e) { if (e.isLeft()) throw new Error("x"); return e.value }
        `,
        options,
      },
      {
        name: "orThrow with a builder after the guard is not an unwrap the rule tracks",
        code: "function f(e) { if (e.isLeft()) return e; return e.orElse(1) }",
        options,
      },
    ],
    invalid: [
      guard(
        "function f(e) { if (e.isLeft()) return e; return e.value + 1 }",
        "e",
        "Keep it in the chain: e.flatMap(…) or e.map(…); the failure passes through on its own.",
      ),
      guard(
        "function f(e) { if (e.isLeft()) return Left(e.value); const n = e.orThrow(); return Right(n * 2) }",
        "e",
        "Keep it in the chain: e.flatMap(…) or e.map(…); the failure passes through on its own.",
      ),
      guard(
        "function f(o) { if (o.isNone()) return None(); return Some(o.orThrow().id) }",
        "o",
        "Keep it in the chain: o.flatMap(…) or o.map(…); the failure passes through on its own.",
      ),
      guard(
        "function f(e) { if (e.isLeft()) return Either.left({ kind: e.value.kind }); return e.value.id }",
        "e",
        "Keep it in the chain: e.mapLeft(…).flatMap(…) builds the new failure and continues on success.",
      ),
      guard(
        "async function f(e) { if (e.isLeft()) return Left(new Error(e.value.message)); return await embed(e.value) }",
        "e",
        "Keep it in the chain: e.mapLeft(…).flatMapAsync(…) builds the new failure and continues on success.",
      ),
      guard(
        "function f(o) { if (o.isNone()) return 0; return o.value * 2 }",
        "o",
        "Use o.map(…).orElse(fallback), or o.fold(() => fallback, (value) => …).",
      ),
      guard(
        'function f(e) { if (e.isLeft()) throw new Error("bad"); return e.value }',
        "e",
        "If a host needs the throw, use e.orThrow((e) => new YourError(e)); otherwise keep it in the chain with .flatMap or .fold.",
      ),
      guard(
        "function f(t) { if (t.isFailure()) { log(t.error); return } use(t.get()) }",
        "t",
        "Use t.fold(onFailure, onSuccess).",
      ),
      guard(
        "async function f(e) { if (e.isLeft()) return e; const saved = await save(e.value); return saved }",
        "e",
        "Keep it in the chain: e.flatMapAsync(…), or lift the steps into IO.",
      ),
      guard(
        "async function f(t) { if (t.isFailure()) { log(t.error); return } await use(t.get()) }",
        "t",
        "Use t.foldAsync(onFailure, onSuccess).",
      ),
    ],
  })
})
