import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

/**
 * Utility functions for detecting functype library usage in ESLint rules.
 *
 * Implementation style: pure helpers operating over native immutable
 * primitives (Array.prototype methods + ReadonlySet). No mutable
 * accumulators, no `for-of` driving state changes. The plugin's domain
 * (AST traversal) is naturally tree-shaped; the helpers compose as
 * folds/filters/maps over those trees.
 */

const TYPE_NAMES: ReadonlySet<string> = new Set([
  "Option",
  "Either",
  "List",
  "LazyList",
  "Task",
  "Try",
  "Map",
  "Set",
  "Stack",
])

/** `import ... from "functype"` — including `functype/<subpath>` */
const isFunctypeImport = (node: ASTNode): boolean =>
  node.type === "ImportDeclaration" && node.source.type === "Literal" && node.source.value === "functype"

/**
 * Check if functype library is imported in the current file
 */
export function hasFunctypeImport(context: Rule.RuleContext): boolean {
  return context.sourceCode.ast.body.some(isFunctypeImport)
}

/**
 * Enhanced functype imports tracking
 */
export interface FunctypeImports {
  types: Set<string> // Option, Either, List, etc.
  functions: Set<string> // Do, DoAsync, $, etc.
  all: Set<string> // Combined for compatibility
}

type SpecifierBuckets = { readonly type: string | null; readonly fn: string | null; readonly all: string }

/** Sort a single import specifier into the three buckets (or none). */
function categorizeSpecifier(spec: ASTNode): SpecifierBuckets | null {
  if (spec.type === "ImportSpecifier" && spec.imported.type === "Identifier") {
    const name = spec.imported.name
    // Named imports split by whether they're a functype TYPE or anything else.
    // (Do/DoAsync/$ + any other named import bucket as `functions`, matching
    // the original behavior — the explicit Do/DoAsync/$ branch was redundant.)
    return TYPE_NAMES.has(name) ? { type: name, fn: null, all: name } : { type: null, fn: name, all: name }
  }
  if (spec.type === "ImportDefaultSpecifier") return { type: null, fn: "default", all: "default" }
  if (spec.type === "ImportNamespaceSpecifier") return { type: "*", fn: "*", all: "*" }
  return null
}

const pickPresent = <K extends keyof SpecifierBuckets>(buckets: readonly SpecifierBuckets[], key: K): string[] =>
  buckets.flatMap((b) => {
    const v = b[key]
    return v === null ? [] : [v as string]
  })

/**
 * Get imported functype symbols from the current file
 */
export function getFunctypeImports(context: Rule.RuleContext): FunctypeImports {
  const buckets = context.sourceCode.ast.body
    .filter(isFunctypeImport)
    .flatMap((node: ASTNode) => (node.specifiers ?? []) as ASTNode[])
    .map(categorizeSpecifier)
    .filter((b): b is SpecifierBuckets => b !== null)

  return {
    types: new Set(pickPresent(buckets, "type")),
    functions: new Set(pickPresent(buckets, "fn")),
    all: new Set(buckets.map((b) => b.all)),
  }
}

/**
 * Legacy compatibility - returns the 'all' set
 */
export function getFunctypeImportsLegacy(context: Rule.RuleContext): Set<string> {
  return getFunctypeImports(context).all
}

/**
 * Check if a type reference is using functype types
 */
export function isFunctypeType(node: ASTNode, functypeImports: FunctypeImports | Set<string>): boolean {
  if (!node) return false

  // Handle both new and legacy API
  const types = functypeImports instanceof Set ? functypeImports : functypeImports.types || functypeImports.all

  // Check direct type names
  if (node.type === "TSTypeReference" && node.typeName?.type === "Identifier") {
    const typeName = node.typeName.name
    return (
      types.has(typeName) ||
      ["Option", "Either", "List", "LazyList", "Task", "Try", "Map", "Set", "Stack"].includes(typeName)
    )
  }

  return false
}

/**
 * Check if a call expression is using functype methods
 */
export function isFunctypeCall(node: ASTNode, functypeImports: Set<string>): boolean {
  if (!node || node.type !== "CallExpression") return false

  const callee = node.callee

  // Check for static method calls like Option.some(), Either.left(), List.of()
  if (callee.type === "MemberExpression" && callee.object.type === "Identifier") {
    const objectName = callee.object.name
    const methodName = callee.property?.name

    // Check if calling methods on imported functype types
    if (functypeImports.has(objectName)) return true

    // Check for common functype patterns
    if (
      (objectName === "Option" && ["some", "none", "of"].includes(methodName)) ||
      (objectName === "Either" && ["left", "right", "of"].includes(methodName)) ||
      (objectName === "List" && ["of", "from", "empty"].includes(methodName)) ||
      (objectName === "Map" && ["of", "empty"].includes(methodName)) ||
      (objectName === "Set" && ["of", "empty"].includes(methodName))
    ) {
      return true
    }
  }

  // Check for method calls on functype instances like someOption.map()
  if (callee.type === "MemberExpression") {
    const methodName = callee.property?.name

    // Common functype methods
    if (
      [
        "map",
        "flatMap",
        "filter",
        "fold",
        "foldLeft",
        "foldRight",
        "getOrElse",
        "orElse",
        "isEmpty",
        "nonEmpty",
        "isDefined",
        "isSome",
        "isNone",
        "isLeft",
        "isRight",
        "toArray",
      ].includes(methodName)
    ) {
      return true
    }
  }

  return false
}

/** True iff any ancestor of `node` satisfies `pred`. Pure tail recursion. */
function ancestorSatisfies(node: ASTNode | null | undefined, pred: (n: ASTNode) => boolean): boolean {
  const parent = node?.parent as ASTNode | undefined
  if (!parent) return false
  return pred(parent) || ancestorSatisfies(parent, pred)
}

/**
 * Check if current context is already using functype patterns appropriately
 */
export function isAlreadyUsingFunctype(node: ASTNode, functypeImports: Set<string>): boolean {
  return ancestorSatisfies(
    node,
    (parent) => isFunctypeCall(parent, functypeImports) || isFunctypeType(parent, functypeImports),
  )
}

/**
 * Check if a variable or parameter is typed with functype types
 */
export function hasFunctypeTypeAnnotation(node: ASTNode, functypeImports: FunctypeImports | Set<string>): boolean {
  // Check for type annotation
  if (node.typeAnnotation?.typeAnnotation) {
    return isFunctypeType(node.typeAnnotation.typeAnnotation, functypeImports)
  }

  return false
}

/**
 * Check if a call expression is a Do notation call
 */
export function isDoNotationCall(node: ASTNode, functypeImports: FunctypeImports): boolean {
  if (!node || node.type !== "CallExpression") return false

  const callee = node.callee

  // Check for Do() or DoAsync() calls
  if (callee.type === "Identifier") {
    const name = callee.name
    return functypeImports.functions.has(name) && ["Do", "DoAsync"].includes(name)
  }

  return false
}

/**
 * Check if a call expression uses the $ helper function
 */
export function isDollarHelper(node: ASTNode, functypeImports: FunctypeImports): boolean {
  if (!node || node.type !== "CallExpression") return false

  const callee = node.callee

  // Check for $() calls
  if (callee.type === "Identifier" && callee.name === "$") {
    return functypeImports.functions.has("$")
  }

  return false
}

/**
 * Check if current expression is inside a Do notation block
 */
export function isInsideDoNotation(node: ASTNode, functypeImports: FunctypeImports): boolean {
  return ancestorSatisfies(node, (n) => n.type === "CallExpression" && isDoNotationCall(n, functypeImports))
}

/**
 * Check if a method call is a chained method call on functype types
 */
export function isChainedMethodCall(node: ASTNode, methodName: string): boolean {
  if (!node || node.type !== "CallExpression") return false

  const callee = node.callee

  if (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    callee.property.name === methodName
  ) {
    return true
  }

  return false
}

/**
 * Detect if code could benefit from Do notation
 */
export function shouldUseDoNotation(
  node: ASTNode,
  functypeImports: FunctypeImports,
): {
  shouldUse: boolean
  reason: "nested-checks" | "chained-flatmaps" | "mixed-monads" | "async-chains" | null
} {
  // Already using Do notation
  if (isInsideDoNotation(node, functypeImports)) {
    return { shouldUse: false, reason: null }
  }

  // Check for nested null checks (a && a.b && a.b.c pattern)
  if (node.type === "LogicalExpression" && node.operator === "&&") {
    const text = node.toString ? node.toString() : ""
    if (text.includes("&&") && text.match(/\w+(\.\w+){2,}/)) {
      return { shouldUse: true, reason: "nested-checks" }
    }
  }

  // Check for chained flatMap calls
  if (isChainedMethodCall(node, "flatMap") && flatMapChainDepth(node) >= 3) {
    return { shouldUse: true, reason: "chained-flatmaps" }
  }

  return { shouldUse: false, reason: null }
}

/** Length of an unbroken `.flatMap().flatMap()...` chain starting at `node`. */
function flatMapChainDepth(node: ASTNode): number {
  if (!node || node.type !== "CallExpression" || !isChainedMethodCall(node, "flatMap")) return 0
  if (node.callee.type !== "MemberExpression") return 1
  return 1 + flatMapChainDepth(node.callee.object as ASTNode)
}
