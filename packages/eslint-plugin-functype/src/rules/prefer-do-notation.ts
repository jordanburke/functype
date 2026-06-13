import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImports, isChainedMethodCall } from "../utils/functype-detection"

const MONAD_TYPES: ReadonlySet<string> = new Set(["Option", "Either", "Try", "Task"])

/** AST keys that don't represent syntax children — back-edges and source metadata. */
const NON_CHILD_KEYS: ReadonlySet<string> = new Set(["parent", "loc", "range"])

const union = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): ReadonlySet<T> => new Set([...a, ...b])

/**
 * Set of monad names that *this single AST node* names as a constructor call.
 * Does not look at children. Returns empty set for any non-monad-constructor node.
 */
function monadAt(node: ASTNode): ReadonlySet<string> {
  if (node.type !== "CallExpression") return new Set()
  const callee = node.callee
  // Bare constructor: Option(...), Try(...), Either(...), Task(...)
  if (callee?.type === "Identifier" && MONAD_TYPES.has(callee.name)) {
    return new Set([callee.name])
  }
  // Companion call: Option.none(), Either.right(x), Try.success(v)
  if (
    callee?.type === "MemberExpression" &&
    callee.object?.type === "Identifier" &&
    MONAD_TYPES.has(callee.object.name)
  ) {
    return new Set([callee.object.name])
  }
  return new Set()
}

/**
 * AST children of `node` worth recursing into. Drops back-edges and source
 * metadata; flattens array-valued keys (e.g. `arguments`); filters non-object
 * leaves (literals, raw strings, numbers).
 */
function astChildren(node: ASTNode): readonly unknown[] {
  return Object.entries(node)
    .filter(([k]) => !NON_CHILD_KEYS.has(k))
    .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
    .filter((v) => v !== null && typeof v === "object")
}

/**
 * Pure recursion: the set of all monad names reachable from `node` (including
 * `node` itself if it is a monad constructor call). No mutation, no
 * accumulator parameter — just a fold over the children's results.
 */
function monadsIn(node: unknown): ReadonlySet<string> {
  if (!node || typeof node !== "object") return new Set()
  const ast = node as ASTNode
  return astChildren(ast).reduce<ReadonlySet<string>>((acc, child) => union(acc, monadsIn(child)), monadAt(ast))
}

const CHAIN_METHODS: ReadonlySet<string> = new Set(["flatMap", "map", "filter", "fold"])

/**
 * Length of the chain of `.flatMap()/.map()/.filter()/.fold()` calls walking
 * left from `node`. Returns 1 for a single call, N for N stacked calls. Pure
 * tail recursion — no mutable counter, no `while` loop.
 */
function getChainDepth(node: ASTNode): number {
  if (node.callee.type !== "MemberExpression" || node.callee.object.type !== "CallExpression") return 1
  const method = node.callee.property
  const next = node.callee.object as ASTNode
  const here = method.type === "Identifier" && CHAIN_METHODS.has(method.name) ? 1 : 0
  return here + getChainDepth(next)
}

/**
 * Depth of a logical-AND chain (`a && b && c && ...`) where each right-hand
 * side is either a MemberExpression or another && chain — the shape that
 * indicates nested property-access guarding rather than arbitrary booleans.
 */
function andChainDepth(node: ASTNode): number {
  if (node.type !== "LogicalExpression" || node.operator !== "&&") return 0
  const rhs = node.right
  const here =
    rhs.type === "MemberExpression" || (rhs.type === "LogicalExpression" && rhs.operator === "&&") ? 1 : 0
  return here + andChainDepth(node.left as ASTNode)
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer Do notation for complex monadic compositions and nested operations",
      recommended: true,
    },
    fixable: "code",
    messages: {
      preferDoForNestedChecks: "Prefer Do notation for nested null/undefined checks instead of logical AND chains",
      preferDoForChainedMethods: "Prefer Do notation for complex flatMap chains ({{count}} levels deep)",
      preferDoForMixedMonads: "Consider Do notation when mixing Option, Either, and Try operations",
      preferDoAsyncForChainedTasks: "Prefer DoAsync notation for chained async operations",
    },
    schema: [
      {
        type: "object",
        properties: {
          minChainDepth: {
            type: "integer",
            minimum: 2,
            default: 3,
          },
          detectMixedMonads: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {}
    const minChainDepth = options.minChainDepth || 3
    const detectMixedMonads = options.detectMixedMonads !== false

    const functypeImports = getFunctypeImports(context)

    // Track if Do notation is already imported
    const hasDoImport = functypeImports.functions.has("Do") || functypeImports.functions.has("DoAsync")

    /**
     * Detect nested null/undefined checks like: a && a.b && a.b.c
     */
    function checkNestedNullChecks(node: ASTNode): void {
      if (node.operator !== "&&") return

      // Check if this looks like nested property access guarding
      if (andChainDepth(node) >= 2 && hasNestedPropertyAccess(node)) {
        context.report({
          node,
          messageId: "preferDoForNestedChecks",
          fix: hasDoImport ? (fixer) => fixNestedChecks(fixer, node) : undefined,
        })
      }
    }

    /**
     * Check if logical expression contains nested property access patterns
     */
    function hasNestedPropertyAccess(node: ASTNode): boolean {
      // Look for patterns like: obj && obj.prop && obj.prop.nested
      const matches = context.sourceCode.getText(node).match(/\w+(\.\w+){2,}/g)
      return matches !== null && matches.length > 0
    }

    /**
     * Detect long flatMap chains
     */
    function checkChainedMethods(node: ASTNode): void {
      if (!isChainedMethodCall(node, "flatMap")) return

      const chainDepth = getChainDepth(node)

      if (chainDepth >= minChainDepth) {
        context.report({
          node,
          messageId: "preferDoForChainedMethods",
          data: { count: chainDepth.toString() },
          fix: hasDoImport ? (fixer) => fixChainedMethods(fixer, node) : undefined,
        })
      }
    }

    /**
     * Auto-fix for nested null checks
     */
    function fixNestedChecks(fixer: Rule.RuleFixer, node: ASTNode): Rule.Fix {
      const text = context.sourceCode.getText(node)

      // Simple transformation for common patterns
      // a && a.b && a.b.c -> Do(function* () { const x = yield* $(Option(a)); const y = yield* $(Option(x.b)); return Option(y.c) })
      const match = text.match(/(\w+)(\.\w+)+/)
      if (match) {
        const baseVar = match[1]
        const chain = match[0]

        const doNotation = `Do(function* () {
  const obj = yield* $(Option(${baseVar}))
  return yield* $(Option(obj${chain.substring(baseVar.length)}))
})`

        return fixer.replaceText(node, doNotation)
      }

      return fixer.replaceText(node, `/* TODO: Convert to Do notation */ ${text}`)
    }

    /**
     * Auto-fix for chained methods (basic)
     */
    function fixChainedMethods(fixer: Rule.RuleFixer, node: ASTNode): Rule.Fix {
      const text = context.sourceCode.getText(node)

      // For now, just add a comment suggesting Do notation
      return fixer.replaceText(node, `/* TODO: Consider Do notation for complex chains */ ${text}`)
    }

    /**
     * Detect mixed monad usage by walking the AST under `node` and counting
     * *distinct* monad constructor calls — not substring matches.
     *
     * A "monad constructor call" is a CallExpression whose callee is either:
     * - a bare identifier matching a known monad type (`Option(...)`, `Try(...)`),
     *   or
     * - a member expression whose object is a known monad type
     *   (`Option.none()`, `Either.right(...)`, `Try.success(...)`).
     *
     * Method calls like `.toEither(...)`, `.toOption()`, `.toTry()` are NOT
     * constructor calls — they're the idiomatic *conversion* API for crossing
     * monad boundaries. The old substring-based check fired on these because
     * `.toEither` contains "Either" as a substring; the AST check correctly
     * sees them as method calls, not new monad constructions.
     *
     * Implementation is pure recursion over the AST: `monadAt` reports what
     * a single node names; `monadsIn` returns the union of `monadAt(self)`
     * with the results from each child. No mutable accumulator, no for-loops
     * driving state changes.
     */
    function checkMixedMonads(node: ASTNode): void {
      if (!detectMixedMonads) return
      if (monadsIn(node).size >= 2) {
        context.report({ node, messageId: "preferDoForMixedMonads" })
      }
    }

    return {
      LogicalExpression(node) {
        checkNestedNullChecks(node)
      },

      CallExpression(node) {
        checkChainedMethods(node)
        checkMixedMonads(node)
      },
    }
  },
}

export default rule
