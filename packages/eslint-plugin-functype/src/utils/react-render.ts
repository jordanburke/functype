import type { ASTNode } from "../types/ast"
import { descendants } from "./ast-walk"

/**
 * Finds the function a node renders in: a React function component or a hook. Syntactic, by the
 * conventions React's own tooling uses (`eslint-plugin-react-hooks`):
 *
 * - a **component** is a function named in PascalCase whose body contains JSX — declared
 *   (`function Card() {}`), assigned (`const Card = () => …`) or wrapped (`memo(…)`, `forwardRef(…)`);
 * - a **hook** is a function named `use` + an uppercase letter or digit (`useThing`, `use2D`).
 *
 * Only the function's own body is its render path. A function nested inside it (an event handler, a
 * `useEffect` callback, a `.map` callback) is a separate function: the rules that use this ask for the
 * *nearest* enclosing function, so code in a nested callback is never attributed to the render.
 */

const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
])

/** `memo(fn)`, `forwardRef(fn)`, `React.memo(fn)`: the wrapped function keeps the variable's name. */
const WRAPPERS: ReadonlySet<string> = new Set(["memo", "forwardRef"])

const isWrapperCall = (node: ASTNode, fn: ASTNode): boolean => {
  if (node?.type !== "CallExpression" || node.arguments[0] !== fn) return false
  const callee = node.callee as ASTNode
  const name =
    callee.type === "Identifier"
      ? callee.name
      : callee.type === "MemberExpression" && callee.property.type === "Identifier"
        ? callee.property.name
        : null
  return name !== null && WRAPPERS.has(name)
}

/** The nearest function enclosing `node`, or null at the top level. */
export const enclosingFunction = (node: ASTNode): ASTNode | null => {
  const parent = node.parent as ASTNode | undefined
  if (!parent) return null
  return FUNCTION_TYPES.has(parent.type) ? parent : enclosingFunction(parent)
}

/** The name a function is known by: its own id, or the variable it (or its `memo` wrapper) is assigned to. */
const functionName = (fn: ASTNode): string | null => {
  if (fn.id?.type === "Identifier") return fn.id.name
  const parent = fn.parent as ASTNode | undefined
  const holder = isWrapperCall(parent, fn) ? (parent?.parent as ASTNode | undefined) : parent
  return holder?.type === "VariableDeclarator" && holder.id.type === "Identifier" ? holder.id.name : null
}

export const isJSX = (node: ASTNode): boolean => node?.type === "JSXElement" || node?.type === "JSXFragment"

/** JSX, or a conditional / logical expression with JSX in a branch: `<A />`, `ok ? <A /> : null`, `ok && <A />`. */
export const producesJSX = (node: ASTNode): boolean => {
  if (isJSX(node)) return true
  if (node?.type === "ConditionalExpression") return producesJSX(node.consequent) || producesJSX(node.alternate)
  if (node?.type === "LogicalExpression") return producesJSX(node.right)
  return false
}

export type RenderKind = "component" | "hook"

const HOOK_NAME = /^use[A-Z0-9]/
const COMPONENT_NAME = /^[A-Z]/

/**
 * Is `fn` a component or a hook, and which? Null for any other function. Rules call this only for a
 * candidate node (an unwrap, a predicate call), so the JSX scan over the body stays rare.
 */
export const renderKind = (fn: ASTNode): RenderKind | null => {
  const name = functionName(fn)
  if (name === null) return null
  if (HOOK_NAME.test(name)) return "hook"
  return COMPONENT_NAME.test(name) && descendants(fn.body).some(isJSX) ? "component" : null
}
