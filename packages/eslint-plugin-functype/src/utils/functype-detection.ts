import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

/**
 * Utility functions for detecting functype library usage in ESLint rules
 */

/**
 * Check if functype library is imported in the current file
 */
export function hasFunctypeImport(context: Rule.RuleContext): boolean {
  const sourceCode = context.sourceCode
  const program = sourceCode.ast

  // Look for import statements that import from 'functype'
  for (const node of program.body) {
    if (node.type === "ImportDeclaration" && node.source.type === "Literal" && node.source.value === "functype") {
      return true
    }
  }

  return false
}

/**
 * Enhanced functype imports tracking
 */
export interface FunctypeImports {
  types: Set<string> // Option, Either, List, etc.
  functions: Set<string> // Do, DoAsync, $, etc.
  all: Set<string> // Combined for compatibility
}

/**
 * Get imported functype symbols from the current file
 */
export function getFunctypeImports(context: Rule.RuleContext): FunctypeImports {
  const types = new Set<string>()
  const functions = new Set<string>()
  const all = new Set<string>()

  const sourceCode = context.sourceCode
  const program = sourceCode.ast

  for (const node of program.body) {
    if (node.type === "ImportDeclaration" && node.source.type === "Literal" && node.source.value === "functype") {
      // Handle named imports: import { Option, Either, Do, $ } from 'functype'
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier" && spec.imported.type === "Identifier") {
            const name = spec.imported.name
            all.add(name)

            // Categorize imports
            if (["Option", "Either", "List", "LazyList", "Task", "Try", "Map", "Set", "Stack"].includes(name)) {
              types.add(name)
            } else if (["Do", "DoAsync", "$"].includes(name)) {
              functions.add(name)
            } else {
              // Other imports (constructors, utilities, etc.)
              functions.add(name)
            }
          } else if (spec.type === "ImportDefaultSpecifier") {
            all.add("default")
            functions.add("default")
          } else if (spec.type === "ImportNamespaceSpecifier") {
            all.add("*")
            types.add("*")
            functions.add("*")
          }
        }
      }
    }
  }

  return { types, functions, all }
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

/**
 * Check if current context is already using functype patterns appropriately
 */
export function isAlreadyUsingFunctype(node: ASTNode, functypeImports: Set<string>): boolean {
  let parent = node.parent

  // Walk up the AST to find functype usage
  while (parent) {
    if (isFunctypeCall(parent as ASTNode, functypeImports) || isFunctypeType(parent as ASTNode, functypeImports)) {
      return true
    }
    parent = parent.parent
  }

  return false
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
  let current = node.parent

  while (current) {
    if (current.type === "CallExpression" && isDoNotationCall(current as ASTNode, functypeImports)) {
      return true
    }
    current = current.parent
  }

  return false
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
  if (isChainedMethodCall(node, "flatMap")) {
    // Count chain depth
    let depth = 0
    let current = node

    while (current && current.type === "CallExpression" && isChainedMethodCall(current, "flatMap")) {
      depth++
      if (current.callee.type === "MemberExpression") {
        current = current.callee.object as ASTNode
      } else {
        break
      }
    }

    if (depth >= 3) {
      return { shouldUse: true, reason: "chained-flatmaps" }
    }
  }

  return { shouldUse: false, reason: null }
}
