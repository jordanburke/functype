/**
 * Pattern registry - all patterns are defined here with compile-tested examples
 */

import type { PatternMatch } from "../pattern-suggester"
import * as arrayOpsAfter from "./array-operations.after"
import * as arrayOpsBefore from "./array-operations.before"
import * as nullCheckAfter from "./null-check.after"
// Import the actual implementations to ensure they compile
import * as nullCheckBefore from "./null-check.before"
import * as tryCatchAfter from "./try-catch.after"
import * as tryCatchBefore from "./try-catch.before"

// Verify imports exist (compile-time check)
void [nullCheckBefore, tryCatchBefore, arrayOpsBefore]
void [nullCheckAfter, tryCatchAfter, arrayOpsAfter]

export const compiledPatterns: PatternMatch[] = [
  {
    pattern: "null-check",
    description: "Use Option instead of null/undefined checks",
    example: {
      before: `if (value !== null && value !== undefined) {
  return value.toUpperCase()
}
return ""`,
      after: `Option(value)
  .map(v => v.toUpperCase())
  .orElse("")`,
    },
    confidence: 0.9,
    tags: ["null", "undefined", "optional", "?.", "!==", "!=", "== null"],
  },
  {
    pattern: "try-catch",
    description: "Use Try or Either for error handling",
    example: {
      before: `try {
  return JSON.parse(str)
} catch (e) {
  return null
}`,
      after: `Try(() => JSON.parse(str))
  .fold(
    () => null,
    result => result
  )`,
    },
    confidence: 0.9,
    tags: ["try", "catch", "error", "exception", "throw"],
  },
  {
    pattern: "array-map-filter",
    description: "Use List for immutable array operations",
    example: {
      before: `array
  .filter(x => x > 0)
  .map(x => x * 2)`,
      after: `List(array)
  .filter(x => x > 0)
  .map(x => x * 2)
  .toArray()`,
    },
    confidence: 0.75,
    tags: ["array", "map", "filter", "reduce", ".map(", ".filter(", ".forEach("],
  },
  {
    pattern: "optional-chaining",
    description: "Replace optional chaining with Option chain",
    example: {
      before: `user?.profile?.name`,
      after: `Option(user)
  .flatMap(u => Option(u.profile))
  .map(p => p.name)`,
    },
    confidence: 0.85,
    tags: ["?.", "optional", "chaining"],
  },
  {
    pattern: "promise-then-catch",
    description: "Use FPromise for better async error handling",
    example: {
      before: `fetch(url)
  .then(r => r.json())
  .catch(e => console.error(e))`,
      after: `FPromise.from(fetch(url))
  .map(r => r.json())
  .mapError(e => console.error(e))`,
    },
    confidence: 0.8,
    tags: ["promise", "then", "catch", "async", "await", ".then(", ".catch("],
  },
  {
    pattern: "if-else-chain",
    description: "Use Cond for complex conditionals",
    example: {
      before: `if (x > 10) {
  return 'big'
} else if (x > 5) {
  return 'medium'
} else {
  return 'small'
}`,
      after: `Cond.start<string>()
  .case(x > 10, 'big')
  .case(x > 5, 'medium')
  .otherwise('small')`,
    },
    confidence: 0.7,
    tags: ["if", "else if", "else", "conditional", "nested if"],
  },
  {
    pattern: "switch-case",
    description: "Use Match for pattern matching",
    example: {
      before: `switch(status) {
  case 'success': return data
  case 'error': return null
  default: return undefined
}`,
      after: `Match(status)
  .case('success', () => data)
  .case('error', () => null)
  .default(() => undefined)`,
    },
    confidence: 0.85,
    tags: ["switch", "case", "default", "break"],
  },
  {
    pattern: "early-return",
    description: "Use Option or Either to avoid early returns",
    example: {
      before: `if (!user) return null
if (!user.isActive) return null
return user.data`,
      after: `Option(user)
  .filter(u => u.isActive)
  .map(u => u.data)
  .orElse(null)`,
    },
    confidence: 0.7,
    tags: ["return", "early return", "guard clause", "if return"],
  },
  {
    pattern: "callback-hell",
    description: "Use FPromise or Task for async composition",
    example: {
      before: `getData(id, (err, data) => {
  if (err) return
  process(data, (err2, result) => {
    // nested callback
  })
})`,
      after: `FPromise.from(getData(id))
  .flatMap(data => FPromise.from(process(data)))`,
    },
    confidence: 0.8,
    tags: ["callback", "nested", "async", "err,"],
  },
  {
    pattern: "array-push",
    description: "Use List.append for immutable array operations",
    example: {
      before: `array.push(newItem)
return array`,
      after: `List(array)
  .append(newItem)
  .toArray()`,
    },
    confidence: 0.85,
    tags: ["push", "pop", "shift", "unshift", "splice", "mutate", "mutation"],
  },
]
