import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-flatmap"

describe("prefer-flatmap", () => {
  ruleTester.run("prefer-flatmap", rule, {
    valid: [
      // Using flatMap
      {
        name: "Using flatMap is preferred",
        code: "const result = items.flatMap(item => item.tags)",
      },
      // Using map without flat
      {
        name: "Using map without flat is allowed",
        code: "const doubled = numbers.map(n => n * 2)",
      },
      // Using flat without preceding map
      {
        name: "Using flat alone is allowed",
        code: "const flattened = nestedArrays.flat()",
      },
      // Other functional methods
      {
        name: "Other functional methods are allowed",
        code: "const filtered = items.filter(item => item.active)",
      },
    ],
    invalid: [
      // map().flat() pattern
      {
        name: "map().flat() should use flatMap",
        code: "const result = items.map(item => item.children).flat()",
        errors: [
          {
            messageId: "preferFlatMapOverMapFlat",
          },
        ],
        output: "const result = items.flatMap(item => item.children)",
      },
      // map().flat() with more complex transformation
      {
        name: "Complex map().flat() should use flatMap",
        code: `
          const tags = posts
            .map(post => post.tags.filter(tag => tag.active))
            .flat()
        `,
        errors: [
          {
            messageId: "preferFlatMapOverMapFlat",
          },
        ],
        output: `
          const tags = posts
            .flatMap(post => post.tags.filter(tag => tag.active))
        `,
      },
      // Nested map returning arrays
      {
        name: "Map returning arrays should consider flatMap",
        code: `
          const result = items.map(item => {
            return item.values.map(v => v * 2)
          })
        `,
        errors: [
          {
            messageId: "preferFlatMapNested",
          },
        ],
      },
      // Map with array return in arrow function
      {
        name: "Map with array literal return should consider flatMap",
        code: "const pairs = items.map(item => [item.id, item.name])",
        errors: [
          {
            messageId: "preferFlatMapNested",
          },
        ],
      },
      // Chained maps where first returns arrays
      {
        name: "Chained maps with array-returning first map",
        code: `
          const result = data
            .map(item => item.split(','))
            .map(parts => parts.map(p => p.trim()))
        `,
        errors: [
          {
            messageId: "preferFlatMapChain",
          },
        ],
      },
      // Multiple map().flat() patterns
      {
        name: "Multiple map().flat() patterns should all be flagged",
        code: `
          const result1 = items.map(i => i.children).flat()
          const result2 = data.map(d => d.tags).flat()
        `,
        errors: [
          {
            messageId: "preferFlatMapOverMapFlat",
          },
          {
            messageId: "preferFlatMapOverMapFlat",
          },
        ],
        output: `
          const result1 = items.flatMap(i => i.children)
          const result2 = data.flatMap(d => d.tags)
        `,
      },
      // Map returning method calls that return arrays
      {
        name: "Map returning array-returning method calls",
        code: `
          const words = sentences.map(sentence => sentence.split(' '))
        `,
        errors: [
          {
            messageId: "preferFlatMapNested",
          },
        ],
      },
      // Complex nested transformation
      {
        name: "Complex nested array transformation",
        code: `
          const result = users.map(user => {
            return user.posts.map(post => ({
              userId: user.id,
              postTitle: post.title,
              tags: post.tags
            }))
          })
        `,
        errors: [
          {
            messageId: "preferFlatMapNested",
          },
        ],
      },
    ],
  })
})
