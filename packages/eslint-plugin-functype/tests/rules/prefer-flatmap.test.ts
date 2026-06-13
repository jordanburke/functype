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
      // Tuple-shaped literal (Object.fromEntries pattern) — not a flatten candidate
      {
        name: "Tuple literal [k, v] is not a flatten candidate",
        code: "const pairs = items.map(item => [item.id, item.name])",
      },
      // Append/identity with spread — not a flatten candidate
      {
        name: "Spread + appended element is not a flatten candidate",
        code: "const acc = items.reduce((out, item) => [...out, item], [])",
      },
      // Spread-only — not a flatten candidate
      {
        name: "Spread-only array literal is not a flatten candidate",
        code: "const copy = items.map(arr => [...arr])",
      },
      // Either-flatMap accumulator pattern (Either<E, U[]>)
      {
        name: "Either-flatMap accumulator with [...out, u] is not a flatten candidate",
        code: `
          const result = items.reduce(
            (acc, item, i) => acc.flatMap(out => f(item, i).map(u => [...out, u])),
            Right([])
          )
        `,
      },
      // Non-collection monad receiver: Try(...).map(cb returning array)
      // .flatMap on Try expects Try<T>, not an array — don't suggest it.
      {
        name: "Try(...).map returning array is not a flatten candidate",
        code: `
          const filtered = Try(() => fs.readdirSync(p))
            .map(entries => entries.filter(name => isReal(name)))
        `,
      },
      // Same shape with Option(...)
      {
        name: "Option(...).map returning array is not a flatten candidate",
        code: `
          const items = Option(maybeList).map(list => list.filter(p))
        `,
      },
      // Companion call receiver: Either.right(...).map returning array
      {
        name: "Either.right(...).map returning array is not a flatten candidate",
        code: `
          const result = Either.right(seed).map(arr => arr.filter(p))
        `,
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
      // Map returning a literal containing nested array literal — true flatten candidate
      {
        name: "Map returning literal with nested array element should consider flatMap",
        code: "const grouped = items.map(item => [[item.id, item.value], [item.id, item.label]])",
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
