import type { SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"
import { descendants } from "./ast-walk"

/**
 * Detects a native Set/Map that the code mutates on purpose — a cache, a registry, an in-place
 * accumulator, a React copy-then-add. functype's collections are immutable, so they cannot express
 * these, and a rule that suggests them there is noise (#324).
 *
 * Mutation means a call of one of `mutators` on the collection itself: directly on the `new`
 * expression, through the variable it is bound to, or through `this.<field>` in the owning class.
 */

export const SET_MUTATORS: ReadonlyArray<string> = ["add", "delete", "clear"]
export const MAP_MUTATORS: ReadonlyArray<string> = ["set", "delete", "clear"]

/** `expr.add(...)` / `expr.set(...)` — `expr` is the object of a called mutator member. */
const isMutatorCallOn = (expr: ASTNode, mutators: ReadonlyArray<string>): boolean => {
  const member = expr.parent
  return (
    member?.type === "MemberExpression" &&
    member.object === expr &&
    !member.computed &&
    member.property.type === "Identifier" &&
    mutators.includes(member.property.name) &&
    member.parent?.type === "CallExpression" &&
    member.parent.callee === member
  )
}

/** The field name for `foo` / `#foo` keys, matching how `this.foo` / `this.#foo` spell it. */
const fieldName = (key: ASTNode): string | null =>
  key?.type === "Identifier" ? key.name : key?.type === "PrivateIdentifier" ? `#${key.name}` : null

const enclosingClassBody = (node: ASTNode): ASTNode | null =>
  node === null || node === undefined ? null : node.type === "ClassBody" ? node : enclosingClassBody(node.parent)

/** Is `this.<name>` mutated anywhere in the class that contains `node`? */
const isFieldMutated = (node: ASTNode, name: string, mutators: ReadonlyArray<string>): boolean => {
  const body = enclosingClassBody(node)
  if (body === null) return false
  return descendants(body).some(
    (n) =>
      n.type === "MemberExpression" &&
      n.object.type === "ThisExpression" &&
      !n.computed &&
      fieldName(n.property) === name &&
      isMutatorCallOn(n, mutators),
  )
}

/** Is any reference to the variable declared by `declarator` the object of a mutator call? */
const isVariableMutated = (declarator: ASTNode, mutators: ReadonlyArray<string>, sourceCode: SourceCode): boolean =>
  sourceCode
    .getDeclaredVariables(declarator)
    .some((variable) => variable.references.some((ref) => isMutatorCallOn(ref.identifier, mutators)))

/** Is the binding that this node initializes (variable, class field, `this.x = …`) mutated? */
const isBindingMutated = (
  binding: ASTNode,
  value: ASTNode,
  mutators: ReadonlyArray<string>,
  sourceCode: SourceCode,
): boolean => {
  if (binding?.type === "VariableDeclarator" && binding.id.type === "Identifier") {
    return isVariableMutated(binding, mutators, sourceCode)
  }
  if (binding?.type === "PropertyDefinition" && binding.value === value) {
    const name = fieldName(binding.key)
    return name !== null && isFieldMutated(binding, name, mutators)
  }
  if (
    binding?.type === "AssignmentExpression" &&
    binding.right === value &&
    binding.left.type === "MemberExpression" &&
    binding.left.object.type === "ThisExpression"
  ) {
    const name = fieldName(binding.left.property)
    return name !== null && isFieldMutated(binding, name, mutators)
  }
  return false
}

/** `new Set(...)` / `new Map(...)` that is mutated, directly or through what it is bound to. */
export const isMutatedCollection = (
  newExpr: ASTNode,
  mutators: ReadonlyArray<string>,
  sourceCode: SourceCode,
): boolean => isMutatorCallOn(newExpr, mutators) || isBindingMutated(newExpr.parent, newExpr, mutators, sourceCode)

/**
 * A `Set<T>` / `Map<K, V>` type reference annotating a binding that is mutated — the annotation of a
 * variable (`const s: Set<T> = …`) or a class field (`private s: Set<T>`).
 */
export const annotatesMutatedBinding = (
  typeRef: ASTNode,
  mutators: ReadonlyArray<string>,
  sourceCode: SourceCode,
): boolean => {
  const annotation = typeRef.parent
  if (annotation?.type !== "TSTypeAnnotation" || annotation.typeAnnotation !== typeRef) return false
  const owner = annotation.parent
  if (owner?.type === "Identifier" && owner.parent?.type === "VariableDeclarator" && owner.parent.id === owner) {
    return isVariableMutated(owner.parent, mutators, sourceCode)
  }
  if (owner?.type === "PropertyDefinition") {
    const name = fieldName(owner.key)
    return name !== null && isFieldMutated(owner, name, mutators)
  }
  return false
}
