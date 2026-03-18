import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/no-imperative-loops"

describe("no-imperative-loops", () => {
  ruleTester.run("no-imperative-loops", rule, {
    valid: [
      // Using functional methods
      {
        name: "Using forEach is preferred",
        code: "items.forEach(item => console.log(item))",
      },
      {
        name: "Using map is preferred",
        code: "const doubled = numbers.map(n => n * 2)",
      },
      {
        name: "Using filter is preferred",
        code: "const evens = numbers.filter(n => n % 2 === 0)",
      },
      {
        name: "Using reduce is preferred",
        code: "const sum = numbers.reduce((acc, n) => acc + n, 0)",
      },
      // Non-loop statements
      {
        name: "Non-loop statements are allowed",
        code: `
          function processData(data: string) {
            return data.toUpperCase()
          }
        `,
      },
    ],
    invalid: [
      // Basic for loop
      {
        name: "For loop should use functional methods",
        code: `
          for (let i = 0; i < items.length; i++) {
            console.log(items[i])
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
        ],
      },
      // For...in loop
      {
        name: "For...in loop should use functional methods",
        code: `
          for (const key in obj) {
            console.log(obj[key])
          }
        `,
        errors: [
          {
            messageId: "noForInLoop",
            suggestions: [
              {
                messageId: "suggestObjectKeys",
                data: { object: "obj" },
                output: `
          Object.keys(obj).forEach((key) => {
  console.log(obj[key])
})
        `,
              },
            ],
          },
        ],
      },
      // For...of loop
      {
        name: "For...of loop should use functional methods",
        code: `
          for (const item of items) {
            console.log(item)
          }
        `,
        errors: [
          {
            messageId: "noForOfLoop",
            suggestions: [
              {
                messageId: "suggestForEach",
                data: { iterable: "items" },
                output: `
          items.forEach((item) => {
  console.log(item)
})
        `,
              },
            ],
          },
        ],
      },
      // While loop
      {
        name: "While loop should use functional methods",
        code: `
          let i = 0
          while (i < items.length) {
            console.log(items[i])
            i++
          }
        `,
        errors: [
          {
            messageId: "noWhileLoop",
          },
        ],
      },
      // Do...while loop
      {
        name: "Do...while loop should use functional methods",
        code: `
          let i = 0
          do {
            console.log(items[i])
            i++
          } while (i < items.length)
        `,
        errors: [
          {
            messageId: "noDoWhileLoop",
          },
        ],
      },
      // For loop with array.push (transformation pattern)
      {
        name: "For loop with push should use map",
        code: `
          const results = []
          for (let i = 0; i < items.length; i++) {
            results.push(items[i].toUpperCase())
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
        ],
      },
      // Multiple loops
      {
        name: "Multiple loops should all be flagged",
        code: `
          for (let i = 0; i < items.length; i++) {
            console.log(items[i])
          }

          for (const item of otherItems) {
            process(item)
          }

          while (condition) {
            doSomething()
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
          {
            messageId: "noForOfLoop",
            suggestions: [
              {
                messageId: "suggestForEach",
                data: { iterable: "otherItems" },
                output: `
          for (let i = 0; i < items.length; i++) {
            console.log(items[i])
          }

          otherItems.forEach((item) => {
  process(item)
})

          while (condition) {
            doSomething()
          }
        `,
              },
            ],
          },
          {
            messageId: "noWhileLoop",
          },
        ],
      },
      // Nested loops
      {
        name: "Nested loops should be flagged",
        code: `
          for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
              console.log(matrix[i][j])
            }
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
          {
            messageId: "noForLoop",
          },
        ],
      },
      // Suggestion: simple for..of -> forEach
      {
        name: "Simple for..of should suggest forEach",
        code: `for (const item of items) {
  console.log(item)
}`,
        errors: [
          {
            messageId: "noForOfLoop",
            suggestions: [
              {
                messageId: "suggestForEach",
                data: { iterable: "items" },
                output: `items.forEach((item) => {
  console.log(item)
})`,
              },
            ],
          },
        ],
      },
      // Suggestion: for..in -> Object.keys().forEach()
      {
        name: "for..in should suggest Object.keys().forEach()",
        code: `for (const key in obj) {
  console.log(key)
}`,
        errors: [
          {
            messageId: "noForInLoop",
            suggestions: [
              {
                messageId: "suggestObjectKeys",
                data: { object: "obj" },
                output: `Object.keys(obj).forEach((key) => {
  console.log(key)
})`,
              },
            ],
          },
        ],
      },
      // No suggestion: for..of with push
      {
        name: "for..of with push should have no suggestion",
        code: `for (const item of items) {\n  results.push(item)\n}`,
        errors: [{ messageId: "noForOfLoop" }],
      },
      // No suggestion: for..of with destructuring
      {
        name: "for..of with destructuring should have no suggestion",
        code: `for (const { x, y } of points) {\n  console.log(x, y)\n}`,
        errors: [{ messageId: "noForOfLoop" }],
      },
      // No suggestion: for..of with multi-statement body
      {
        name: "Complex for..of body should have no suggestion",
        code: `for (const item of items) {\n  if (item > 0) console.log(item)\n  doMore()\n}`,
        errors: [{ messageId: "noForOfLoop" }],
      },
    ],
  })
})
