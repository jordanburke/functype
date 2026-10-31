import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { isChainedMethodCall } from "../utils/functype-detection"
import { isExtractableByType } from "../utils/type-aware"

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

const CHAIN_METHODS: ReadonlySet<string> = new Set(["flatMap", "map", "filter", "fold"])

const FLAT_MAP: ReadonlySet<string> = new Set(["flatMap"])

/**
 * Methods that *compose* monadic operations (stay in the monad and feed the
 * next step). Distinct from terminal handlers (`fold`, `match`, `getOrElse`)
 * which *exit* the monad — those are conversions, not composition, and Do
 * notation doesn't apply to them.
 */
const COMPOSITION_METHODS: ReadonlySet<string> = new Set(["flatMap", "map", "filter"])

/**
 * Number of `.flatMap()/.map()/.filter()/.fold()` steps walking left from `node`. Only the steps
 * count: the receiver they start from, `o` or `Option(x)`, is not a level, so
 * `Option(x).flatMap(f).flatMap(g)` is 2 deep.
 */
function getChainDepth(node: ASTNode): number {
  if (node.type !== "CallExpression" || node.callee?.type !== "MemberExpression") return 0
  const method = node.callee.property
  const here = method.type === "Identifier" && CHAIN_METHODS.has(method.name) ? 1 : 0
  return here + getChainDepth(node.callee.object as ASTNode)
}

/**
 * Number of composition methods (`flatMap`/`map`/`filter`) stacked under
 * `node` via `.callee.object`. 0 if the callee isn't a member expression on
 * another call. Excludes terminal handlers by design.
 */
function compositionChainDepth(node: ASTNode): number {
  if (node.callee?.type !== "MemberExpression" || node.callee.object?.type !== "CallExpression") return 0
  const method = node.callee.property
  const next = node.callee.object as ASTNode
  const here = method.type === "Identifier" && COMPOSITION_METHODS.has(method.name) ? 1 : 0
  return here + compositionChainDepth(next)
}

/**
 * True when `node`'s outermost call is a composition method AND at least one
 * more composition method appears below it — i.e. this is a real
 * `.flatMap(...).flatMap(...)`-style chain, not a terminal exit like
 * `.fold(...)` or a bare receiver like `option.flatMap(...)`.
 */
function isCompositionChain(node: ASTNode): boolean {
  if (node.callee?.type !== "MemberExpression") return false
  const method = node.callee.property
  if (method.type !== "Identifier" || !COMPOSITION_METHODS.has(method.name)) return false
  return compositionChainDepth(node) >= 1
}

/** The operands of an `a && b && c` chain, left to right, through any nesting of `&&`. */
function andOperands(node: ASTNode): ReadonlyArray<ASTNode> {
  if (node.type !== "LogicalExpression" || node.operator !== "&&") return [node]
  return [...andOperands(node.left as ASTNode), ...andOperands(node.right as ASTNode)]
}

/** A plain property path a guard can start from: `a`, `this`, `a.b`. Optional chains are already the fix. */
const isPathStart = (node: ASTNode): boolean =>
  node.type === "Identifier" || node.type === "ThisExpression" || node.type === "MemberExpression"

const NONE: ReadonlySet<string> = new Set()

const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
])

/** `MONAD_TYPES` entries a type annotation names: `Option<number>` → Option. */
function monadOfAnnotation(annotation: ASTNode | undefined): ReadonlySet<string> {
  const type = annotation?.typeAnnotation as ASTNode | undefined
  if (type?.type !== "TSTypeReference" || type.typeName?.type !== "Identifier") return NONE
  return MONAD_TYPES.has(type.typeName.name) ? new Set([type.typeName.name]) : NONE
}

/**
 * Receiver names that say "this holds a monad", for code linted without type information: `option`,
 * `opt`, `either`, `result`, `maybe`, `task`, or a numbered one such as `option1`, in any case; or a
 * camelCase suffix such as `userOption` or `parseResult`, which must be capitalized, so `entry`,
 * `retry` and `registry` don't count.
 */
const MONAD_NAME = /^(option|opt|either|result|maybe|task)\d*$/i
const MONAD_SUFFIX = /[a-z0-9](Option|Either|Result|Maybe|Try|Task)\d*$/

/** Methods that turn one monad into another: `Try(f).toOption()` is an Option. */
const CONVERSIONS: ReadonlyMap<string, string> = new Map([
  ["toOption", "Option"],
  ["toEither", "Either"],
  ["toTry", "Try"],
])

/**
 * The monad an expression's value is, as far as the syntax shows: a constructor or companion call
 * (`Option(x)`, `Either.right(x)`), a conversion (`Try(f).toOption()` is an Option), a step that keeps
 * its receiver's monad (`Option(x).map(f)`), or either branch of `ok ? a : b`. Anything else is unknown.
 */
function monadOfValue(node: ASTNode): ReadonlySet<string> {
  if (node.type === "ConditionalExpression")
    return union(monadOfValue(node.consequent as ASTNode), monadOfValue(node.alternate as ASTNode))
  if (node.type !== "CallExpression") return NONE
  if (monadAt(node).size > 0) return monadAt(node)
  if (node.callee?.type !== "MemberExpression" || node.callee.property.type !== "Identifier") return NONE
  const converted = CONVERSIONS.get(node.callee.property.name)
  if (converted !== undefined) return new Set([converted])
  return COMPOSITION_METHODS.has(node.callee.property.name) ? monadOfValue(node.callee.object as ASTNode) : NONE
}

/**
 * The receiver a method chain starts from: `Option(x)` in `Option(x).map(f).flatMap(g)`, `o` in
 * `o.flatMap(f)`. Walks back only through steps that keep the monad (`flatMap`, `map`, `filter`), so
 * in `Option(xs).getOrElse([]).flatMap(f)` or after a `.fold(…)` the root is the unwrapped value, not
 * `Option(xs)`. A monad constructor or companion
 * call is a root of its own.
 */
function chainRoot(node: ASTNode): ASTNode {
  if (node.type !== "CallExpression" || monadAt(node).size > 0) return node
  if (node.callee?.type !== "MemberExpression" || node.callee.property.type !== "Identifier") return node
  if (!COMPOSITION_METHODS.has(node.callee.property.name)) return node
  return chainRoot(node.callee.object as ASTNode)
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer Do notation for complex monadic compositions and nested operations",
      recommended: true,
    },
    messages: {
      preferDoForNestedChecks:
        "This && chain guards each step of a property path. Use optional chaining (a?.b?.c), or Option(a).flatMap(…) when you want an Option",
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
    const text = (node: ASTNode): string => context.sourceCode.getText(node).replace(/\s+/g, "")

    /** The monad a chain root is declared as, through its variable's or parameter's annotation. */
    function declaredMonad(identifier: ASTNode): ReadonlySet<string> {
      const variable = context.sourceCode
        .getScope(identifier)
        .references.find((reference) => reference.identifier === identifier)?.resolved
      const declared = variable?.defs[0]?.name as ASTNode | undefined
      return monadOfAnnotation(declared?.typeAnnotation as ASTNode | undefined)
    }

    /**
     * Is `step` a step on a functype monad? With type information, the type of the value it's called on
     * decides, so a `string[]`, or an Option already unwrapped with `.getOrElse([])`, never counts, and
     * `service.getUser(1)` returning an Option does. Without it, the chain's root must be a monad
     * constructor, companion or conversion, an identifier annotated with a monad type, or one named
     * like a monad.
     */
    function onMonad(step: ASTNode): boolean {
      const byType = isExtractableByType(step.callee.object as ASTNode, context)
      if (byType !== undefined) return byType
      const root = chainRoot(step)
      if (monadOfValue(root).size > 0) return true
      if (root.type !== "Identifier") return false
      return declaredMonad(root).size > 0 || MONAD_NAME.test(root.name) || MONAD_SUFFIX.test(root.name)
    }

    /** The call that takes `node` as its receiver for a further `.flatMap/.map/.filter/.fold` step, if any. */
    function nextStep(node: ASTNode): ASTNode | undefined {
      const member = node.parent as ASTNode | undefined
      const call = member?.parent as ASTNode | undefined
      if (member?.type !== "MemberExpression" || member.object !== node) return undefined
      if (call?.type !== "CallExpression" || call.callee !== member) return undefined
      return member.property.type === "Identifier" && CHAIN_METHODS.has(member.property.name) ? call : undefined
    }

    /**
     * Is there a `methods` step further out on this chain? Then that step reports, once, for the whole
     * chain. A trailing `.fold(…)` or `.map(…)` isn't one, so it doesn't hide the flatMaps under it.
     */
    function hasStepAbove(node: ASTNode, methods: ReadonlySet<string>): boolean {
      const step = nextStep(node)
      if (step === undefined) return false
      const method = step.callee.property
      return (method.type === "Identifier" && methods.has(method.name)) || hasStepAbove(step, methods)
    }

    /**
     * `a && a.b && a.b.c`: at least three operands in a row, each a property of the one before it.
     * Matched on the AST, so `isAdmin && settings.theme && user.profile.name` is not a guard chain.
     */
    function checkNestedNullChecks(node: ASTNode): void {
      if (node.operator !== "&&") return
      const parent = node.parent as ASTNode | undefined
      if (parent?.type === "LogicalExpression" && parent.operator === "&&") return
      const operands = andOperands(node)
      const longestRun = operands.reduce<{ readonly run: number; readonly best: number }>(
        (acc, operand, i) => {
          const previous = operands[i - 1]
          const extends_ =
            previous !== undefined &&
            isPathStart(previous) &&
            operand.type === "MemberExpression" &&
            text(operand.object as ASTNode) === text(previous)
          const run = extends_ ? acc.run + 1 : 1
          return { run, best: Math.max(acc.best, run) }
        },
        { run: 0, best: 0 },
      ).best
      if (longestRun >= 3) context.report({ node, messageId: "preferDoForNestedChecks" })
    }

    /** A long `.flatMap(…)` chain on a monad, reported once at its outermost step. */
    function checkChainedMethods(node: ASTNode): void {
      if (!isChainedMethodCall(node, "flatMap") || hasStepAbove(node, FLAT_MAP)) return
      const chainDepth = getChainDepth(node)
      if (chainDepth < minChainDepth || !onMonad(node)) return
      context.report({
        node,
        messageId: "preferDoForChainedMethods",
        data: { count: chainDepth.toString() },
      })
    }

    /** What a step's callback returns: its expression body, or the arguments of its own `return`s. */
    function returnedBy(callback: ASTNode | undefined): ReadonlyArray<ASTNode> {
      if (callback?.type !== "ArrowFunctionExpression" && callback?.type !== "FunctionExpression") return []
      const body = callback.body as ASTNode
      if (body.type !== "BlockStatement") return [body]
      const returns = (node: ASTNode): ReadonlyArray<ASTNode> => {
        if (node.type === "ReturnStatement") return node.argument ? [node.argument as ASTNode] : []
        if (FUNCTION_TYPES.has(node.type)) return []
        return (astChildren(node) as ASTNode[]).flatMap(returns)
      }
      return returns(body)
    }

    /** The monads a composition chain moves through: its root, and what each step's callback returns. */
    function monadsAlongChain(node: ASTNode): ReadonlySet<string> {
      if (node.type === "Identifier") return declaredMonad(node)
      if (node.type !== "CallExpression" || node.callee?.type !== "MemberExpression") return monadAt(node)
      const method = node.callee.property
      const step =
        method.type === "Identifier" && COMPOSITION_METHODS.has(method.name)
          ? returnedBy(node.arguments[0] as ASTNode | undefined).reduce<ReadonlySet<string>>(
              (acc, returned) => union(acc, monadOfValue(returned)),
              NONE,
            )
          : NONE
      if (monadAt(node).size > 0) return union(step, monadAt(node))
      // From a conversion on, the chain is the converted monad: what it converted from doesn't count.
      const converted = method.type === "Identifier" ? CONVERSIONS.get(method.name) : undefined
      if (converted !== undefined) return union(step, new Set([converted]))
      return union(step, monadsAlongChain(node.callee.object as ASTNode))
    }

    /**
     * Mixed monads along one composition chain: `option.flatMap((x) => Either.right(x)).flatMap((y) => Try(…))`.
     * Only the chain's own steps count, not every monad written somewhere inside its callbacks, and
     * only a chain that starts from a monad: an array's `.map((x) => Option(x))` is not a mix.
     * Conversions such as `.toEither(…)` and terminal handlers such as `.fold(…)` are not steps (#205).
     */
    function checkMixedMonads(node: ASTNode): void {
      if (!detectMixedMonads || !isCompositionChain(node) || hasStepAbove(node, COMPOSITION_METHODS)) return
      if (!onMonad(node)) return
      if (monadsAlongChain(node).size >= 2) context.report({ node, messageId: "preferDoForMixedMonads" })
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
