# AI Pattern Suggestion Tool for Functype

## Overview

This document describes the pattern suggestion tool designed to help AI agents recommend functype patterns when reviewing JavaScript/TypeScript code. The tool analyzes code snippets and suggests functional programming alternatives using the functype library.

## Current Implementation

### Architecture

The tool uses a **hybrid pattern matching approach** that combines:

1. **Tag-based matching**: Keywords and syntax patterns (e.g., "null", "try", "switch")
2. **Scoring algorithm**: Weights matches by relevance and confidence
3. **Pattern registry**: Extensible database of patterns with examples
4. **Confidence scoring**: Each pattern has a confidence level (0-1)

### Core Components

```typescript
// Main API
suggestPattern(code: string): Option<PatternMatch>          // Best match
suggestPatterns(code: string, limit?: number): List<PatternMatch>  // Top N matches
searchPatterns(query: string): List<PatternMatch>           // Keyword search
getPattern(name: string): Option<PatternMatch>              // Direct lookup

// Pattern structure
interface PatternMatch {
  pattern: string        // Unique identifier
  description: string    // What to use instead
  example: {
    before: string      // Traditional JS/TS code
    after: string       // Functype alternative
  }
  confidence: number     // 0-1 confidence score
  tags: string[]        // Keywords that trigger this pattern
}
```

### Scoring Algorithm

The scoring system calculates relevance through:

1. **Tag presence** (0.3 points per matching tag)
2. **Exact word boundary matches** (0.2 point bonus)
3. **Confidence multiplier** (final score × pattern confidence)

### Confidence Score Rationale

**High Confidence (0.85-0.9)**

- `null-check` (0.9): Specific keywords (`!== null`, `!== undefined`)
- `try-catch` (0.9): Unique syntax, clear error handling intent
- `switch-case` (0.85): Distinctive keywords
- `array-push` (0.85): Unambiguous mutation methods

**Medium Confidence (0.75-0.8)**

- `promise-then-catch` (0.8): `.then()` might be non-promise
- `optional-chaining` (0.85): `?.` operator is distinctive
- `callback-hell` (0.8): `(err, data)` pattern common in Node.js
- `array-map-filter` (0.75): Methods could be on other objects

**Lower Confidence (0.7)**

- `if-else-chain` (0.7): Generic keywords, harder to detect complexity
- `early-return` (0.7): Less precise pattern detection

## AI Agent Integration

### Tool Definition

```typescript
const functypeSuggester = {
  name: "suggest_functype_pattern",
  description: "Suggests functype patterns for JavaScript/TypeScript code",
  parameters: {
    code: {
      type: "string",
      description: "Code snippet to analyze",
    },
    limit: {
      type: "number",
      description: "Max suggestions to return",
      default: 3,
    },
  },
  execute: async ({ code, limit }) => {
    const suggestions = suggestPatterns(code, limit)
    return suggestions
      .map((p) => ({
        pattern: p.pattern,
        description: p.description,
        example: p.example,
        confidence: p.confidence,
      }))
      .toArray()
  },
}
```

### Usage Example

````typescript
// AI agent reviewing code
const userCode = `
  if (user != null && user.isActive) {
    try {
      const data = JSON.parse(user.data)
      return data.items.filter(x => x.enabled).map(x => x.value)
    } catch (e) {
      console.error('Failed to parse', e)
      return []
    }
  }
  return null
`

// Get suggestions
const suggestions = await functypeSuggester.execute({
  code: userCode,
  limit: 3
})

// AI agent response
"I notice several patterns that could benefit from functype:

1. **Null checking** → Use Option for null-safe operations
2. **Try-catch blocks** → Use Try or Either for error handling
3. **Array operations** → Use List for immutable transformations

Here's how to refactor using functype:

```typescript
Option(user)
  .filter(u => u.isActive)
  .flatMap(u =>
    Try(() => JSON.parse(u.data))
      .map(data => List.from(data.items)
        .filter(x => x.enabled)
        .map(x => x.value)
        .toArray()
      )
      .recover(e => {
        console.error('Failed to parse', e)
        return []
      })
  )
  .getOrElse(null)
```"
````

## Alternative Approaches

### 1. AST-Based Pattern Detection

**Description**: Parse code into TypeScript AST for structural analysis

**Advantages**:

- More accurate pattern detection
- Can analyze code structure, not just text
- Handles edge cases better
- Can detect patterns regardless of formatting

**Disadvantages**:

- Significantly slower (parsing overhead)
- More complex implementation
- Requires TypeScript compiler API
- Larger bundle size

**Implementation sketch**:

```typescript
import * as ts from "typescript"

function analyzeAST(code: string): PatternMatch[] {
  const sourceFile = ts.createSourceFile("temp.ts", code, ts.ScriptTarget.Latest)

  const patterns: PatternMatch[] = []

  ts.forEachChild(sourceFile, visit)

  function visit(node: ts.Node) {
    // Check for if statements with null checks
    if (ts.isIfStatement(node)) {
      const condition = node.expression
      if (isNullCheck(condition)) {
        patterns.push(NULL_CHECK_PATTERN)
      }
    }

    // Check for try-catch blocks
    if (ts.isTryStatement(node)) {
      patterns.push(TRY_CATCH_PATTERN)
    }

    ts.forEachChild(node, visit)
  }

  return patterns
}
```

### 2. Machine Learning Embeddings

**Description**: Use sentence embeddings to find semantically similar patterns

**Advantages**:

- Can identify conceptually similar code
- Handles variations in coding style
- Could learn from user feedback
- Language-agnostic potential

**Disadvantages**:

- Requires embedding model
- Higher latency
- Needs training data
- More resource intensive

**Implementation sketch**:

```typescript
import { pipeline } from "@xenova/transformers"

class EmbeddingMatcher {
  private embedder
  private patternEmbeddings: Map<string, Float32Array>

  async initialize() {
    this.embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")

    // Pre-compute pattern embeddings
    for (const pattern of patterns) {
      const embedding = await this.embed(pattern.example.before)
      this.patternEmbeddings.set(pattern.pattern, embedding)
    }
  }

  async findSimilar(code: string): Promise<PatternMatch[]> {
    const codeEmbedding = await this.embed(code)

    // Calculate cosine similarity with all patterns
    const similarities = patterns.map((pattern) => ({
      pattern,
      similarity: cosineSimilarity(codeEmbedding, this.patternEmbeddings.get(pattern.pattern)),
    }))

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map((s) => s.pattern)
  }
}
```

### 3. Rule Engine Approach

**Description**: Define complex rules with predicates and conditions

**Advantages**:

- Highly customizable rules
- Can encode complex logic
- Easy to add domain-specific patterns
- Explainable decisions

**Disadvantages**:

- Verbose rule definitions
- Harder to maintain
- May miss edge cases
- Performance depends on rule complexity

**Implementation sketch**:

```typescript
interface Rule {
  name: string
  conditions: Predicate[]
  pattern: PatternMatch
  priority: number
}

type Predicate = (code: string, ast?: any) => boolean

const rules: Rule[] = [
  {
    name: "complex-null-check",
    conditions: [
      (code) => /if\s*\(/.test(code),
      (code) => /!==\s*null|!=\s*null/.test(code),
      (code) => /!==\s*undefined|!=\s*undefined/.test(code),
      (code) => countOccurrences(code, "return") >= 2,
    ],
    pattern: NULL_CHECK_PATTERN,
    priority: 10,
  },
  {
    name: "promise-chain",
    conditions: [
      (code) => /\.then\s*\(/.test(code),
      (code) => /\.catch\s*\(/.test(code),
      (code) => countOccurrences(code, ".then") >= 2,
    ],
    pattern: PROMISE_PATTERN,
    priority: 8,
  },
]

function evaluateRules(code: string): PatternMatch[] {
  return rules
    .filter((rule) => rule.conditions.every((cond) => cond(code)))
    .sort((a, b) => b.priority - a.priority)
    .map((rule) => rule.pattern)
}
```

### 4. Fuzzy String Matching

**Description**: Use string similarity algorithms for flexible matching

**Advantages**:

- Handles typos and variations
- Simple implementation
- Fast execution
- Good for similar code structures

**Disadvantages**:

- Less semantic understanding
- May produce false positives
- Requires threshold tuning
- Surface-level matching only

**Implementation sketch**:

```typescript
import { distance } from "fastest-levenshtein"

function fuzzyMatch(code: string): PatternMatch[] {
  const candidates = patterns.map((pattern) => {
    // Normalize code for comparison
    const normalizedCode = normalizeCode(code)
    const normalizedExample = normalizeCode(pattern.example.before)

    // Calculate similarity metrics
    const levenshtein = distance(normalizedCode, normalizedExample)
    const jaccard = jaccardSimilarity(tokenize(normalizedCode), tokenize(normalizedExample))

    return {
      pattern,
      score: jaccard * 0.7 + (1 - levenshtein / 100) * 0.3,
    }
  })

  return candidates
    .filter((c) => c.score > 0.6)
    .sort((a, b) => b.score - a.score)
    .map((c) => c.pattern)
}

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, " ").replace(/['"]/g, "").toLowerCase().trim()
}
```

## Comparison Matrix

| Approach            | Speed          | Accuracy     | Complexity       | Bundle Size       | Flexibility  |
| ------------------- | -------------- | ------------ | ---------------- | ----------------- | ------------ |
| Current (Tag-based) | ⚡ Fast        | ✓ Good       | 📊 Low           | 📦 Small          | ✓ Good       |
| AST-based           | 🐌 Slow        | ✓✓ Excellent | 📊📊 High        | 📦📦 Large        | ✓✓ Excellent |
| ML Embeddings       | 🐌 Slow        | ✓✓ Excellent | 📊📊📊 Very High | 📦📦📦 Very Large | ✓ Good       |
| Rule Engine         | ⚡ Fast        | ✓ Good       | 📊📊 High        | 📦 Small          | ✓✓ Excellent |
| Fuzzy Matching      | ⚡⚡ Very Fast | ✓ Good       | 📊 Low           | 📦 Small          | ✓ Good       |

## Recommendations

1. **Start with current implementation**: It's simple, fast, and covers common cases
2. **Add AST-based detection later**: For specific complex patterns that need structural analysis
3. **Consider hybrid approach**: Use tag-based for speed, fall back to AST for accuracy
4. **Track metrics**: Log which patterns get suggested vs. accepted to improve confidence scores
5. **Extensibility**: Keep the pattern registry external/configurable for easy updates

## Future Enhancements

1. **Context awareness**: Check imports and surrounding code
2. **Multi-pattern detection**: Suggest refactoring entire functions
3. **Incremental suggestions**: Build up transformations step by step
4. **Learning system**: Adjust confidence based on acceptance rates
5. **IDE integration**: Real-time suggestions as developers type
6. **Pattern composition**: Combine multiple patterns for complex refactors
