import type { ASTNode } from "../types/ast"

/**
 * Does this expression flow straight into a declared native read-only contract (#350)?
 *
 * `prefer-functype-map` / `-set` never report a `ReadonlyMap` / `ReadonlySet` annotation, so they must not
 * report the constructor that annotation requires: when a function is declared to return
 * `ReadonlyMap<K, V>` — typically because a callee's interface takes one — the native `new Map(...)` it
 * returns is the contract, not an oversight. Recognized positions:
 *
 * - `return` in the nearest enclosing function whose declared return type is `R` or `Promise<R>`
 *   (a callback nested inside such a function does not inherit its signature);
 * - the expression body of an arrow function with that return type;
 * - the initializer of a variable, class field, or parameter default annotated `R`;
 * - an `as R` / `satisfies R` assertion;
 * and through ternary branches and `??` / `||` / `&&` operands on the way there.
 */

const FUNCTIONS: ReadonlySet<string> = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"])

const isNamed = (type: ASTNode | undefined, name: string): boolean =>
  type?.type === "TSTypeReference" && type.typeName?.type === "Identifier" && type.typeName.name === name

const typeArgs = (type: ASTNode): ReadonlyArray<ASTNode> =>
  (type.typeArguments?.params ?? type.typeParameters?.params ?? []) as ReadonlyArray<ASTNode>

/** `R<…>` or `Promise<R<…>>`. */
const isReadonlyContract = (type: ASTNode | undefined, readonlyName: string): boolean =>
  isNamed(type, readonlyName) || (isNamed(type, "Promise") && isReadonlyContract(typeArgs(type!)[0], readonlyName))

const annotationOf = (node: ASTNode | undefined): ASTNode | undefined => node?.typeAnnotation?.typeAnnotation

const nearestFunction = (node: ASTNode | undefined): ASTNode | undefined =>
  node === undefined || node === null ? undefined : FUNCTIONS.has(node.type) ? node : nearestFunction(node.parent)

export const flowsIntoReadonlyContract = (node: ASTNode, readonlyName: string): boolean => {
  const parent = node.parent
  if (!parent) return false
  switch (parent.type) {
    case "ConditionalExpression":
      return parent.test !== node && flowsIntoReadonlyContract(parent, readonlyName)
    case "LogicalExpression":
      return flowsIntoReadonlyContract(parent, readonlyName)
    case "TSAsExpression":
    case "TSSatisfiesExpression":
      return isReadonlyContract(parent.typeAnnotation, readonlyName) || flowsIntoReadonlyContract(parent, readonlyName)
    case "ReturnStatement":
      return isReadonlyContract(nearestFunction(parent)?.returnType?.typeAnnotation, readonlyName)
    case "ArrowFunctionExpression":
      return parent.body === node && isReadonlyContract(parent.returnType?.typeAnnotation, readonlyName)
    case "VariableDeclarator":
      return parent.init === node && isReadonlyContract(annotationOf(parent.id), readonlyName)
    case "PropertyDefinition":
      return parent.value === node && isReadonlyContract(annotationOf(parent), readonlyName)
    case "AssignmentPattern":
      return parent.right === node && isReadonlyContract(annotationOf(parent.left), readonlyName)
    default:
      return false
  }
}
