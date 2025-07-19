# Functype AI Tools

This document describes the AI agent tools created for helping with functype library usage.

## Overview

We've created three categories of tools to help AI agents work with functype:

1. **Pattern Suggestion Tools** - Suggest functype patterns for traditional JavaScript/TypeScript code
2. **Functype Lookup Tools** - Look up functype types, methods, and source files
3. **Example Tools** - Provide usage examples and code snippets

## Tool 1: Pattern Suggester

**File**: `src/tools/pattern-suggester.ts`

Analyzes JavaScript/TypeScript code and suggests functype alternatives.

### Features

- **Compile-tested examples**: All pattern examples are loaded from actual TypeScript files
- **Confidence scoring**: Each pattern has a confidence level (0-1)
- **Tag-based matching**: Smart pattern detection using keywords
- **Multiple suggestions**: Can return ranked list of matching patterns

### AI Tool Definition

```typescript
{
  name: "suggest_functype_pattern",
  description: "Analyzes JavaScript/TypeScript code and suggests functype patterns",
  parameters: {
    code: "Code snippet to analyze",
    limit: "Max suggestions to return (default: 3)"
  }
}
```

### Example Usage

```typescript
const suggestions = suggestPatterns(`
  if (user !== null && user !== undefined) {
    return user.name.toUpperCase()
  }
  return "Anonymous"
`)
// Returns: [{ pattern: "null-check", confidence: 0.9, ... }]
```

## Tool 2: Functype Lookup

**File**: `src/tools/functype-lookup.ts`

Looks up functype data structure information, source files, and available methods.

### Features

- **Complete type registry**: All 14 functype data structures
- **Source file paths**: Direct links to implementation files
- **Interface information**: Which interfaces each type implements
- **Method lists**: Key methods available on each type
- **Related types**: Similar or complementary types

### AI Tool Definition

```typescript
{
  name: "functype_lookup",
  description: "Look up functype data structure information and source files",
  parameters: {
    typeName: "Name of functype data structure (e.g., 'Option', 'List')"
  }
}
```

### Example Usage

```typescript
const info = functypeLookup("Option")
// Returns:
{
  name: "Option",
  description: "Represents a value that may or may not exist...",
  sourcePath: "src/option/Option.ts",
  interfaces: ["Functor", "Monad", "Foldable", ...],
  keyMethods: ["map", "flatMap", "fold", "getOrElse", ...],
  commonUseCases: ["Handling nullable values", ...]
}
```

## Tool 3: Functype Examples

**File**: `src/tools/functype-lookup.ts`

Provides usage examples and code snippets for functype data structures.

### Features

- **Difficulty levels**: Basic, intermediate, and advanced examples
- **Real code examples**: Working TypeScript code snippets
- **Multiple examples per type**: Various use cases covered
- **Import statements included**: Copy-paste ready examples

### AI Tool Definition

```typescript
{
  name: "functype_examples",
  description: "Get usage examples and code snippets for functype data structures",
  parameters: {
    typeName: "Name of functype data structure",
    category: "Complexity level: 'basic', 'intermediate', 'advanced', or 'all'"
  }
}
```

### Example Usage

```typescript
const examples =
  functypeExamples("List")[
    // Returns:
    {
      title: "Basic List Operations",
      description: "Creating and transforming Lists",
      code: `import { List } from "@/list"
const numbers = List([1, 2, 3, 4, 5])
const doubled = numbers.filter(n => n > 2).map(n => n * 2).toArray()`,
      category: "basic",
    }
  ]
```

## Tool 4: Search Functypes

**File**: `src/tools/functype-lookup.ts`

Search functype data structures by keyword, use case, or method name.

### AI Tool Definition

```typescript
{
  name: "search_functypes",
  description: "Search functype data structures by keyword or use case",
  parameters: {
    query: "Search term (e.g., 'async', 'collection', 'error handling')"
  }
}
```

### Example Usage

```typescript
const results = searchFunctypes("error handling")
// Returns types like Either, Try, Option that handle errors
```

## Pattern Examples System

**Directory**: `src/tools/patterns/`

### Structure

- `{pattern-name}.before.ts` - Traditional JavaScript/TypeScript code
- `{pattern-name}.after.ts` - Functype equivalent
- `index.ts` - Registry that imports all patterns

### Benefits

1. **Compile-time safety**: All examples are TypeScript-checked
2. **API correctness**: Functype usage is guaranteed to work
3. **Easy maintenance**: Add new patterns by creating new file pairs
4. **No typos**: Examples can't have syntax or API errors

### Metadata Format

```typescript
/**
 * @pattern null-check
 * @description Use Option instead of null/undefined checks
 * @confidence 0.9
 * @tags null, undefined, optional, ?., !==, !=, == null
 */
```

## AI Agent Integration Examples

### Example 1: Code Review Assistant

```typescript
// User provides code
const userCode = `
function getUser(id) {
  if (id == null) return null
  try {
    return database.findUser(id)
  } catch (e) {
    console.error(e)
    return null
  }
}
`

// AI agent uses pattern suggester
const patterns = suggestPatterns(userCode)
// Suggests: null-check, try-catch patterns

// AI agent uses lookup for details
const optionInfo = functypeLookup("Option")
const tryInfo = functypeLookup("Try")

// AI agent provides comprehensive response with:
// - Pattern suggestions
// - Type information
// - Code examples
// - Source file references
```

### Example 2: Learning Assistant

```typescript
// User asks: "How do I handle arrays in functype?"

// AI agent searches for collection types
const collections = searchFunctypes("collection")

// Gets examples for List
const listExamples = functypeExamples("List", "basic")

// Provides structured learning response with examples
```

### Example 3: API Explorer

```typescript
// User asks: "What methods does Option have?"

const optionInfo = functypeLookup("Option")
// Shows: keyMethods, interfaces, source path

// User can then explore source file or get examples
const examples = functypeExamples("Option", "intermediate")
```

## Registry Coverage

The system covers all 14 functype data structures:

**Core Types**: Option, Either, Try, Lazy
**Collections**: List, Set, Map, LazyList, Stack, Tuple  
**Async**: FPromise, Task
**Utilities**: Cond, Match, ValidatedBrand

Each type includes:

- Source file path
- Test file path (where available)
- Implemented interfaces
- Key methods
- Common use cases
- Related types

## Benefits for AI Agents

1. **Accurate Information**: All data is compile-checked and sourced from actual code
2. **Comprehensive Coverage**: Every functype type is documented
3. **Multiple Access Patterns**: Lookup by name, search by keyword, browse examples
4. **Source Integration**: Direct links to implementation files
5. **Learning Progression**: Examples from basic to advanced
6. **Pattern Recognition**: Smart suggestions based on code analysis

## File Structure

```
src/tools/
├── pattern-suggester.ts           # Main pattern suggestion logic
├── pattern-suggester.spec.ts      # Pattern suggester tests
├── patterns/                      # Compile-tested pattern examples
│   ├── index.ts                   # Pattern registry
│   ├── null-check.before.ts       # Traditional null checks
│   ├── null-check.after.ts        # Option-based approach
│   ├── try-catch.before.ts        # Traditional try-catch
│   ├── try-catch.after.ts         # Try-based approach
│   └── array-operations.*         # Array vs List patterns
├── functype-registry.ts           # Complete type registry
├── functype-lookup.ts             # Lookup and example tools
├── functype-lookup.spec.ts        # Lookup tool tests
├── functype-lookup-demo.ts        # Usage demonstration
├── ai-integration-example.ts      # Pattern suggester integration
└── compiled-patterns-example.ts   # Compiled patterns demo

docs/
├── AI_PATTERN_SUGGESTION_TOOL.md  # Pattern tool documentation
└── FUNCTYPE_AI_TOOLS.md          # This file
```

This system provides AI agents with comprehensive, accurate, and up-to-date information about functype, enabling them to provide better assistance to developers learning and using functional programming patterns.
