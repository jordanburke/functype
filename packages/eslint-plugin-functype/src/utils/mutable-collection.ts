import type { Scope, SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"
import { descendants } from "./ast-walk"

/**
 * Detects a native Set/Map that the code mutates on purpose — a cache, a registry, an in-place
 * accumulator, a React copy-then-add. functype's collections are immutable, so they cannot express
 * these, and a rule that suggests them there is noise (#324).
 *
 * Mutation means a call of one of `mutators` on the collection itself:
 * - directly on a `new` expression that copies something (`new Set(prev).add(id)`) — an empty
 *   `new Map().set(a, 1).set(b, 2)` is a builder, a `Map.of` candidate, and is NOT exempt;
 * - through the variable, parameter or later-assigned `let` it is bound to;
 * - through `this.<field>` in the owning class (field initializer, constructor assignment, or
 *   constructor parameter property).
 *
 * Not followed: aliases (`const t = s; t.add(x)`), `useRef(new Set()).current.add(x)`, a mutator
 * passed as a callback (`xs.forEach(seen.add, seen)`), and a collection passed into another function.
 */

export const SET_MUTATORS: ReadonlyArray<string> = ["add", "delete", "clear"]
export const MAP_MUTATORS: ReadonlyArray<string> = ["set", "delete", "clear"]

/** `expr.add(...)` / `expr!.add(...)` — `expr` is the object of a called mutator member. */
const isMutatorCallOn = (expr: ASTNode, mutators: ReadonlyArray<string>): boolean => {
  const parent = expr.parent
  if (parent?.type === "TSNonNullExpression" && parent.expression === expr) return isMutatorCallOn(parent, mutators)
  return (
    parent?.type === "MemberExpression" &&
    parent.object === expr &&
    !parent.computed &&
    parent.property.type === "Identifier" &&
    mutators.includes(parent.property.name) &&
    parent.parent?.type === "CallExpression" &&
    parent.parent.callee === parent
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

/** Lexical lookup of `name` from the scope that contains `node`. */
const resolveVariable = (node: ASTNode, name: string, sourceCode: SourceCode): Scope.Variable | null => {
  const lookup = (scope: Scope.Scope | null): Scope.Variable | null =>
    scope === null ? null : (scope.set.get(name) ?? lookup(scope.upper))
  return lookup(sourceCode.getScope(node))
}

/** Is any reference to the variable named by `identifier` the object of a mutator call? */
const isNameMutated = (identifier: ASTNode, mutators: ReadonlyArray<string>, sourceCode: SourceCode): boolean =>
  resolveVariable(identifier, identifier.name, sourceCode)?.references.some((ref) =>
    isMutatorCallOn(ref.identifier, mutators),
  ) ?? false

/**
 * Is the binding identified by `identifier` mutated? A constructor parameter property is a class
 * field; any other identifier is a variable or parameter.
 */
const isIdentifierBindingMutated = (
  identifier: ASTNode,
  mutators: ReadonlyArray<string>,
  sourceCode: SourceCode,
): boolean => {
  const owner = identifier.parent?.type === "AssignmentPattern" ? identifier.parent.parent : identifier.parent
  return owner?.type === "TSParameterProperty"
    ? isFieldMutated(owner, identifier.name, mutators)
    : isNameMutated(identifier, mutators, sourceCode)
}

/** Is the binding that `value` initializes or is assigned to mutated? */
const isBindingMutated = (
  binding: ASTNode,
  value: ASTNode,
  mutators: ReadonlyArray<string>,
  sourceCode: SourceCode,
): boolean => {
  // `const s = new Set()` / `s = new Set()` / `(s = new Set()) =>` / `constructor(private s = new Set())`
  const target =
    binding?.type === "VariableDeclarator"
      ? binding.id
      : binding?.type === "AssignmentExpression" || binding?.type === "AssignmentPattern"
        ? binding.right === value
          ? binding.left
          : null
        : null
  if (target?.type === "Identifier") return isIdentifierBindingMutated(target, mutators, sourceCode)
  if (target?.type === "MemberExpression" && target.object.type === "ThisExpression") {
    const name = fieldName(target.property)
    return name !== null && isFieldMutated(binding, name, mutators)
  }
  if (binding?.type === "PropertyDefinition" && binding.value === value) {
    const name = fieldName(binding.key)
    return name !== null && isFieldMutated(binding, name, mutators)
  }
  return false
}

/** `new Set(...)` / `new Map(...)` that is mutated, directly or through what it is bound to. */
export const isMutatedCollection = (
  newExpr: ASTNode,
  mutators: ReadonlyArray<string>,
  sourceCode: SourceCode,
): boolean =>
  (newExpr.arguments.length > 0 && isMutatorCallOn(newExpr, mutators)) ||
  isBindingMutated(newExpr.parent, newExpr, mutators, sourceCode)

/**
 * A `Set<T>` / `Map<K, V>` type reference annotating a binding that is mutated — a variable
 * (`let s: Set<T>`), a parameter (`(s: Set<T>) =>`), a class field (`private s: Set<T>`), or a
 * constructor parameter property (`constructor(private s: Set<T>)`).
 */
export const annotatesMutatedBinding = (
  typeRef: ASTNode,
  mutators: ReadonlyArray<string>,
  sourceCode: SourceCode,
): boolean => {
  const annotation = typeRef.parent
  if (annotation?.type !== "TSTypeAnnotation" || annotation.typeAnnotation !== typeRef) return false
  const owner = annotation.parent
  if (owner?.type === "Identifier") return isIdentifierBindingMutated(owner, mutators, sourceCode)
  if (owner?.type === "PropertyDefinition") {
    const name = fieldName(owner.key)
    return name !== null && isFieldMutated(owner, name, mutators)
  }
  return false
}
