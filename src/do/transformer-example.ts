/**
 * Example of how a TypeScript transformer could work
 * This would be a compile-time plugin, not runtime code
 */

// ============================================================
// What the user writes:
// ============================================================
/*
import { Do, $ } from "functype/do"
import { Option, List } from "functype"

const result = Do(() => {
  const x = $(Option(5))        // Clean syntax!
  const y = $(List([1, 2, 3]))  // No visible yield
  return x + y
})
*/

// ============================================================
// What the transformer outputs:
// ============================================================
/*
import { Do } from "functype/do"
import { Option, List } from "functype"

const result = Do(function* () {
  const x = yield Option(5) as any as number
  const y = yield List([1, 2, 3]) as any as number
  return x + y
})
*/

// ============================================================
// The transformer plugin (simplified):
// ============================================================
import * as ts from "typescript"

export function doNotationTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      function visit(node: ts.Node): ts.Node {
        // Look for Do(() => { ... })
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Do") {
          // Transform the arrow function to a generator
          const arg = node.arguments[0]
          if (arg && ts.isArrowFunction(arg)) {
            // Convert to generator function
            // Note: In modern TypeScript API, generator functions use undefined modifiers
            // and the asterisk is indicated separately
            const genFunc = ts.factory.createFunctionExpression(
              undefined, // modifiers
              ts.factory.createToken(ts.SyntaxKind.AsteriskToken), // asterisk token
              undefined, // name
              undefined, // type params
              arg.parameters,
              arg.type,
              transformBody(arg.body as ts.Block),
            )

            return ts.factory.createCallExpression(node.expression, node.typeArguments, [genFunc])
          }
        }

        return ts.visitEachChild(node, visit, context)
      }

      function transformBody(body: ts.Block): ts.Block {
        // Transform $(expr) to yield expr
        function transformStatement(stmt: ts.Statement): ts.Statement {
          if (ts.isVariableStatement(stmt)) {
            // Look for const x = $(...)
            // Transform to const x = yield ...
            // This is simplified - real implementation would be more complex
          }
          return stmt
        }

        // Note: createBlock takes statements and optional multiline flag (boolean)
        return ts.factory.createBlock(body.statements.map(transformStatement), true)
      }

      return ts.visitNode(sourceFile, visit) as ts.SourceFile
    }
  }
}

// ============================================================
// Usage in tsconfig.json:
// ============================================================
/*
{
  "compilerOptions": {
    "plugins": [
      { "transform": "functype/do/transformer" }
    ]
  }
}
*/

// ============================================================
// Alternative: Babel Macro
// ============================================================

// With babel-plugin-macros, you could write:
/*
import { Do, $ } from "functype/do/macro"

const result = Do(() => {
  const x = $(Option(5))
  const y = $(List([1, 2]))
  return x + y
})
*/

// The macro would transform this at compile time
