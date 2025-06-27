import { Option } from "@/option"
import { List } from "@/list"

export interface PatternMatch {
  pattern: string
  description: string
  example: {
    before: string
    after: string
  }
  confidence: number
  tags: string[]
}

// Pattern registry with various matching strategies
const patterns: PatternMatch[] = [
  // Null/undefined checks
  {
    pattern: "null-check",
    description: "Use Option instead of null/undefined checks",
    example: {
      before: "if (value !== null && value !== undefined) { return value.toUpperCase() }",
      after: "Option(value).map(v => v.toUpperCase()).getOrElse('')",
    },
    confidence: 0.9,
    tags: ["null", "undefined", "optional", "?.", "!==", "!=", "== null"],
  },
  {
    pattern: "optional-chaining",
    description: "Replace optional chaining with Option chain",
    example: {
      before: "user?.profile?.name",
      after: "Option(user).flatMap(u => Option(u.profile)).map(p => p.name)",
    },
    confidence: 0.85,
    tags: ["?.", "optional", "chaining"],
  },
  // Try-catch patterns
  {
    pattern: "try-catch",
    description: "Use Try or Either for error handling",
    example: {
      before: "try { return JSON.parse(str) } catch (e) { return null }",
      after: "Try(() => JSON.parse(str)).toOption().getOrElse(null)",
    },
    confidence: 0.9,
    tags: ["try", "catch", "error", "exception", "throw"],
  },
  // Promise patterns
  {
    pattern: "promise-then-catch",
    description: "Use FPromise for better async error handling",
    example: {
      before: "fetch(url).then(r => r.json()).catch(e => console.error(e))",
      after: "FPromise.from(fetch(url)).map(r => r.json()).mapError(e => console.error(e))",
    },
    confidence: 0.8,
    tags: ["promise", "then", "catch", "async", "await", ".then(", ".catch("],
  },
  // Array operations
  {
    pattern: "array-map-filter",
    description: "Use List for immutable array operations",
    example: {
      before: "array.filter(x => x > 0).map(x => x * 2)",
      after: "List.from(array).filter(x => x > 0).map(x => x * 2)",
    },
    confidence: 0.75,
    tags: ["array", "map", "filter", "reduce", ".map(", ".filter(", ".forEach("],
  },
  // If-else chains
  {
    pattern: "if-else-chain",
    description: "Use Cond for complex conditionals",
    example: {
      before: "if (x > 10) { return 'big' } else if (x > 5) { return 'medium' } else { return 'small' }",
      after: "Cond.start<string>().case(x > 10, 'big').case(x > 5, 'medium').otherwise('small')",
    },
    confidence: 0.7,
    tags: ["if", "else if", "else", "conditional", "nested if"],
  },
  // Switch statements
  {
    pattern: "switch-case",
    description: "Use Match for pattern matching",
    example: {
      before: "switch(status) { case 'success': return data; case 'error': return null; }",
      after: "Match(status).case('success', () => data).case('error', () => null).done()",
    },
    confidence: 0.85,
    tags: ["switch", "case", "default", "break"],
  },
  // Early returns
  {
    pattern: "early-return",
    description: "Use Option or Either to avoid early returns",
    example: {
      before: "if (!user) return null; if (!user.isActive) return null; return user.data;",
      after: "Option(user).filter(u => u.isActive).map(u => u.data).getOrElse(null)",
    },
    confidence: 0.7,
    tags: ["return", "early return", "guard clause", "if return"],
  },
  // Nested callbacks
  {
    pattern: "callback-hell",
    description: "Use FPromise or Task for async composition",
    example: {
      before: "getData(id, (err, data) => { if (err) return; process(data, (err2, result) => {...}) })",
      after: "FPromise.from(getData(id)).flatMap(data => FPromise.from(process(data)))",
    },
    confidence: 0.8,
    tags: ["callback", "nested", "async", "err,"],
  },
  // Mutation patterns
  {
    pattern: "array-push",
    description: "Use List.append for immutable array operations",
    example: {
      before: "array.push(newItem); return array;",
      after: "List.from(array).append(newItem).toArray()",
    },
    confidence: 0.85,
    tags: ["push", "pop", "shift", "unshift", "splice", "mutate", "mutation"],
  },
]

interface ScoredPattern {
  pattern: PatternMatch
  score: number
}

/**
 * Analyzes code and suggests functype patterns
 */
export function suggestPattern(code: string): Option<PatternMatch> {
  const codeLower = code.toLowerCase()
  const scoredPatterns: ScoredPattern[] = patterns
    .map((pattern) => ({
      pattern,
      score: calculateMatchScore(codeLower, pattern),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  const topMatch = scoredPatterns[0]
  return topMatch ? Option(topMatch.pattern) : Option.none()
}

/**
 * Get all patterns matching the code
 */
export function suggestPatterns(code: string, limit = 3): List<PatternMatch> {
  const codeLower = code.toLowerCase()
  const scoredPatterns: ScoredPattern[] = patterns
    .map((pattern) => ({
      pattern,
      score: calculateMatchScore(codeLower, pattern),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return List(scoredPatterns.map(({ pattern }) => pattern))
}

/**
 * Search patterns by tag or keyword
 */
export function searchPatterns(query: string): List<PatternMatch> {
  const queryLower = query.toLowerCase()
  return List(patterns).filter(
    (pattern) =>
      pattern.tags.some((tag) => tag.includes(queryLower)) ||
      pattern.description.toLowerCase().includes(queryLower) ||
      pattern.pattern.includes(queryLower),
  )
}

/**
 * Get pattern by exact name
 */
export function getPattern(name: string): Option<PatternMatch> {
  const found = patterns.find((p) => p.pattern === name)
  return found ? Option(found) : Option.none()
}

/**
 * Calculate match score based on tags and code content
 */
function calculateMatchScore(codeLower: string, pattern: PatternMatch): number {
  let score = 0

  // Check for tag matches
  pattern.tags.forEach((tag) => {
    if (codeLower.includes(tag)) {
      score += 0.3
    }
  })

  // Boost score for exact pattern matches
  if (
    pattern.tags.some((tag) => {
      // Skip regex for tags with special characters
      if (/[.*+?^${}()|[\]\\]/.test(tag)) {
        return codeLower.includes(tag)
      }
      try {
        const regex = new RegExp(`\\b${tag}\\b`)
        return regex.test(codeLower)
      } catch {
        return codeLower.includes(tag)
      }
    })
  ) {
    score += 0.2
  }

  // Apply confidence multiplier
  return score * pattern.confidence
}

/**
 * Format pattern suggestion for display
 */
export function formatSuggestion(pattern: PatternMatch): string {
  return `
### ${pattern.description}

**Before:**
\`\`\`typescript
${pattern.example.before}
\`\`\`

**After:**
\`\`\`typescript
${pattern.example.after}
\`\`\`

*Confidence: ${(pattern.confidence * 100).toFixed(0)}%*
`.trim()
}

// Export pattern registry for extension
export const patternRegistry = {
  add(pattern: PatternMatch): void {
    patterns.push(pattern)
  },

  remove(patternName: string): boolean {
    const index = patterns.findIndex((p) => p.pattern === patternName)
    if (index >= 0) {
      patterns.splice(index, 1)
      return true
    }
    return false
  },

  getAll(): PatternMatch[] {
    return [...patterns]
  },
}
