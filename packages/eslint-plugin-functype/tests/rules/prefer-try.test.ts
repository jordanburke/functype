import { describe } from "vitest"

import rule from "../../src/rules/prefer-try"
import { ruleTester } from "../utils/rule-tester"

describe("prefer-try", () => {
  ruleTester.run("prefer-try", rule, {
    valid: [
      {
        name: "Using Try is allowed",
        code: `function safeParse(json: string) { return Try(() => JSON.parse(json)) }`,
      },
      {
        name: "No try/catch is allowed",
        code: `function add(a: number, b: number): number { return a + b }`,
      },
      {
        name: "Rethrowing in catch blocks is allowed",
        code: `
          function handleError() {
            try {
              riskyOperation()
            } catch (error) {
              console.error('Error occurred:', error)
              throw error
            }
          }
        `,
      },
      {
        name: "Rethrowing after logging and cleanup is allowed",
        code: `
          function handleWithCleanup() {
            try {
              riskyOperation()
            } catch (error) {
              cleanup()
              logError(error)
              notifyAdmin(error)
              throw error
            }
          }
        `,
      },
      // #206: try/finally without catch is resource cleanup, not error handling
      {
        name: "try/finally without catch is not Try territory",
        code: `
          function boot() {
            const dispose = createTempKey()
            try {
              return unsealSecrets(env).fold(onErr, onOk)
            } finally {
              dispose()
            }
          }
        `,
      },
      // #206: try/catch/finally is not safely liftable — autofix would drop the finally
      {
        name: "try/catch/finally is not safely liftable to Try",
        code: `
          function f() {
            try {
              return parse(input)
            } catch (e) {
              return fallback(e)
            } finally {
              cleanup()
            }
          }
        `,
      },
    ],
    invalid: [
      // Multi-stmt catch — no suggestion offered
      {
        name: "Try/catch should use Try",
        code: `function parseJson(json: string) { try { return JSON.parse(json) } catch (error) { console.error(error); return null } }`,
        errors: [{ messageId: "preferTryOverTryCatch" }],
      },
      {
        name: "Multiple try/catch blocks should use Try",
        code: `
          function complexOperation() {
            try {
              firstOperation()
            } catch (e1) {
              console.error(e1)
            }

            try {
              secondOperation()
            } catch (e2) {
              console.error(e2)
            }
          }
        `,
        errors: [{ messageId: "preferTryOverTryCatch" }, { messageId: "preferTryOverTryCatch" }],
      },
      // Empty catch + simple return body → suggest Try()
      {
        name: "Empty catch block should use Try",
        code: `
          function silentParse(json: string) {
            try {
              return JSON.parse(json)
            } catch (e) {
            }
          }
        `,
        errors: [
          {
            messageId: "preferTryOverTryCatch",
            suggestions: [
              {
                messageId: "suggestTry",
                output: `
          function silentParse(json: string) {
            return Try(() => JSON.parse(json))
          }
        `,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Try" },
                output: `
          import { Try } from "functype"
function silentParse(json: string) {
            try {
              return JSON.parse(json)
            } catch (e) {
            }
          }
        `,
              },
            ],
          },
        ],
      },
      {
        name: "Nested try/catch should use Try",
        code: `
          function nestedOps() {
            try {
              try {
                riskyOperation()
              } catch (inner) {
                fallback()
              }
            } catch (outer) {
              console.error(outer)
            }
          }
        `,
        errors: [{ messageId: "preferTryOverTryCatch" }, { messageId: "preferTryOverTryCatch" }],
      },
      {
        name: "Simple try/catch with empty catch should suggest Try()",
        code: `function parse(json: string) {
  try {
    return JSON.parse(json)
  } catch (e) {}
}`,
        errors: [
          {
            messageId: "preferTryOverTryCatch",
            suggestions: [
              {
                messageId: "suggestTry",
                output: `function parse(json: string) {
  return Try(() => JSON.parse(json))
}`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Try" },
                output: `import { Try } from "functype"
function parse(json: string) {
  try {
    return JSON.parse(json)
  } catch (e) {}
}`,
              },
            ],
          },
        ],
      },
      // Async return await -> suggest Try.fromPromise()
      {
        name: "Async try/catch with await should suggest Try.fromPromise()",
        code: `async function fetchJson(url: string) {
  try {
    return await fetch(url)
  } catch (e) {}
}`,
        errors: [
          {
            messageId: "preferTryOverTryCatch",
            suggestions: [
              {
                messageId: "suggestTryFromPromise",
                output: `async function fetchJson(url: string) {
  return Try.fromPromise(fetch(url))
}`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Try" },
                output: `import { Try } from "functype"
async function fetchJson(url: string) {
  try {
    return await fetch(url)
  } catch (e) {}
}`,
              },
            ],
          },
        ],
      },
      // Multi-statement try body — no suggestion
      {
        name: "Multi-statement try body should have no suggestion",
        code: `function f() { try { const a = 1; return a } catch (e) { return null } }`,
        errors: [{ messageId: "preferTryOverTryCatch" }],
      },
    ],
  })
})
