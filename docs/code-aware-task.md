# CodeAwareTask: LLM-Driven Self-Healing Code Execution

CodeAwareTask extends the base Task functionality with autonomous code analysis, fitness evaluation, and LLM-powered self-healing capabilities. It provides a framework for building systems that can automatically improve code quality and recover from errors using AI assistance.

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Fitness Functions](#fitness-functions)
5. [Self-Healing Configuration](#self-healing-configuration)
6. [Real-World Examples](#real-world-examples)
7. [Advanced Usage](#advanced-usage)
8. [Best Practices](#best-practices)
9. [API Reference](#api-reference)

## Overview

CodeAwareTask combines functional programming patterns with AI-driven code analysis to create resilient, self-improving code execution environments. It evaluates code across multiple dimensions and can automatically generate improvements when issues are detected.

### Key Features

- **Multi-dimensional Fitness Evaluation**: Assess code across correctness, performance, maintainability, security, and type safety
- **LLM-Powered Self-Healing**: Automatically generate code improvements using language model analysis
- **Context-Aware Analysis**: Rich code context including intent, constraints, and domain knowledge
- **Safe Validation**: Comprehensive safety checks for AI-generated code modifications
- **Extensible Design**: Custom fitness functions for domain-specific requirements
- **Detailed Tracking**: Complete audit trail of healing attempts and improvements

## Core Concepts

### Code Context

Every CodeAwareTask operation begins with a `CodeContext` that provides comprehensive information about the code being analyzed:

```typescript
type CodeContext = {
  source: string                 // The source code
  filePath?: string             // File location
  functionName?: string         // Function identifier
  lineNumber?: number           // Error location
  inputParams?: Record<string, unknown>
  expectedOutput?: unknown
  stackTrace?: string
  attempts?: Array<{            // Previous healing attempts
    timestamp: Date
    error: string
    modifications?: string
  }>
  llmContext?: {
    intent: string              // What the code should do
    constraints?: string[]      // Requirements and limitations
    dependencies?: string[]     // External dependencies
    domain?: string            // Business context
  }
}
```

### Fitness Results

Code quality is evaluated across five core dimensions:

```typescript
type FitnessResult = {
  score: number                 // Overall score (0-100)
  metrics: {
    correctness: number         // Execution success and output accuracy
    performance: number         // Efficiency and optimization
    maintainability: number     // Code quality and readability
    security: number           // Security vulnerability assessment
    typeSafety: number         // TypeScript type usage and safety
  }
  feedback: string[]           // Human-readable feedback
  suggestions: string[]        // Improvement recommendations
}
```

### Self-Healing Process

1. **Execute Code**: Attempt to run the provided code
2. **Evaluate Fitness**: Assess code quality across all dimensions
3. **Check Thresholds**: Compare fitness scores against configured minimums
4. **Generate Healing**: Use LLM analysis to create improvements
5. **Validate Changes**: Ensure proposed changes are safe
6. **Retry Execution**: Test improved code
7. **Track Results**: Log all attempts and outcomes

## Getting Started

### Basic Usage

```typescript
import { CodeAwareTask } from "@/core/task/CodeAwareTask"

// Create a code-aware task
const task = CodeAwareTask<string>({ name: "MyTask" })

// Define code context
const context = CodeAwareTask.createCodeContext(
  `function greet(name: string): string {
    return "Hello, " + name + "!"
  }`,
  "Generate personalized greeting message",
  {
    functionName: "greet",
    expectedOutput: "Hello, John!",
    constraints: ["Must handle empty strings", "Must be type-safe"]
  }
)

// Evaluate fitness without execution
const fitness = await task.evaluateFitness(context)
console.log(`Code fitness: ${fitness.score}/100`)
```

### Self-Healing Execution

```typescript
// Configure self-healing behavior
const config = CodeAwareTask.defaultConfig()
config.minFitnessScore = 80
config.maxAttempts = 3

// Execute with automatic healing
const result = await task.executeWithHealing(context, config)

if (!result.result.isEmpty) {
  console.log("Execution successful!")
  console.log(`Final fitness: ${result.fitness.score}/100`)
} else {
  console.log(`Failed after ${result.healingAttempts.length} attempts`)
  result.healingAttempts.forEach(attempt => {
    console.log(`Attempt: ${attempt.error}`)
  })
}
```

## Fitness Functions

### Built-in Evaluations

CodeAwareTask includes comprehensive built-in fitness functions:

#### Correctness Assessment
- Execution success rate
- Output validation against expected results
- Error handling coverage

#### Performance Analysis
- Code complexity assessment
- Async/await pattern usage
- Potential optimization opportunities

#### Maintainability Scoring
- TypeScript usage and type annotations
- Code documentation and comments
- Function length and complexity
- Error handling patterns

#### Security Evaluation
- Dangerous pattern detection (eval, innerHTML, command injection)
- Input validation checks
- Security best practices

#### Type Safety Assessment
- TypeScript feature usage
- Type guard implementation
- Optional chaining and nullish coalescing
- `any` type avoidance

### Custom Fitness Functions

Create domain-specific evaluations:

```typescript
// API-specific fitness function
const apiFitness = CodeAwareTask.createCustomFitnessFunction(
  "apiQuality",
  async (context, result) => {
    let score = 60
    const feedback: string[] = []
    
    // Check for proper HTTP error handling
    if (context.source.includes("response.ok")) {
      score += 20
      feedback.push("Checks HTTP response status")
    }
    
    // Check for timeout handling
    if (context.source.includes("timeout") || context.source.includes("AbortController")) {
      score += 15
      feedback.push("Implements request timeout")
    }
    
    // Check for retry logic
    if (context.source.includes("retry") || context.source.includes("attempt")) {
      score += 15
      feedback.push("Includes retry mechanism")
    }
    
    return {
      score: Math.min(100, score),
      feedback,
      suggestions: score < 80 ? ["Add comprehensive error handling"] : []
    }
  }
)

// Use in evaluation
const fitness = await task.evaluateFitness(context, result, [apiFitness])
```

### Business Logic Fitness

```typescript
// E-commerce specific validation
const ecommerceFitness = CodeAwareTask.createCustomFitnessFunction(
  "ecommerce",
  async (context) => {
    let score = 50
    const feedback: string[] = []
    
    // Check for price validation
    if (context.source.includes("price") && context.source.includes(">=")) {
      score += 20
      feedback.push("Validates price constraints")
    }
    
    // Check for inventory checks
    if (context.source.includes("stock") || context.source.includes("inventory")) {
      score += 15
      feedback.push("Considers inventory levels")
    }
    
    // Check for discount logic
    if (context.source.includes("discount") && context.source.includes("Math")) {
      score += 15
      feedback.push("Implements proper discount calculations")
    }
    
    return { score: Math.min(100, score), feedback }
  }
)
```

## Self-Healing Configuration

### Configuration Options

```typescript
type SelfHealingConfig = {
  maxAttempts: number           // Maximum healing attempts (default: 3)
  enableLLMHealing: boolean     // Use AI for code generation (default: true)
  minFitnessScore: number       // Minimum acceptable score (default: 70)
  customFitnessFunctions?: Array<...>  // Domain-specific evaluations
  llmConfig?: {
    provider: "openai" | "anthropic" | "custom"
    apiKey?: string
    model?: string
    temperature?: number        // Creativity vs consistency
    customEndpoint?: string
  }
}
```

### Predefined Configurations

```typescript
// Standard configuration
const defaultConfig = CodeAwareTask.defaultConfig()

// High-quality focused (stricter requirements)
const strictConfig = CodeAwareTask.fitnessConfig(90)

// Performance optimized (lower temperature for consistency)
const perfConfig = {
  ...CodeAwareTask.defaultConfig(),
  llmConfig: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.0  // Maximum consistency
  }
}
```

## Real-World Examples

### Data Processing Pipeline

```typescript
const processingTask = CodeAwareTask<any>({ name: "DataProcessor" })

const pipelineContext: CodeContext = {
  source: `
    function processCustomerData(customers) {
      return customers
        .filter(c => c.isActive)
        .map(customer => ({
          id: customer.id,
          name: customer.name.trim().toUpperCase(),
          email: customer.email.toLowerCase(),
          lastPurchase: new Date(customer.lastPurchase),
          totalSpent: customer.orders.reduce((sum, order) => sum + order.total, 0)
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
    }
  `,
  functionName: "processCustomerData",
  llmContext: {
    intent: "Process customer data for analytics dashboard",
    constraints: [
      "Must handle null/undefined customers",
      "Must validate email formats",
      "Must handle missing order data",
      "Must sort by spending descending"
    ],
    domain: "Customer analytics"
  }
}

// Business-specific fitness
const customerDataFitness = CodeAwareTask.createCustomFitnessFunction(
  "customerData",
  async (context) => {
    let score = 40
    const feedback: string[] = []
    
    // Check for null safety
    if (context.source.includes("?.") || context.source.includes("&&")) {
      score += 25
      feedback.push("Includes null safety checks")
    }
    
    // Check for data validation
    if (context.source.includes("filter") && context.source.includes("isActive")) {
      score += 20
      feedback.push("Filters inactive customers")
    }
    
    // Check for proper sorting
    if (context.source.includes("sort") && context.source.includes("totalSpent")) {
      score += 15
      feedback.push("Sorts by customer value")
    }
    
    return { score: Math.min(100, score), feedback }
  }
)

const config: SelfHealingConfig = {
  maxAttempts: 4,
  enableLLMHealing: true,
  minFitnessScore: 85,
  customFitnessFunctions: [customerDataFitness]
}

const result = await processingTask.executeWithHealing(pipelineContext, config)
```

### API Error Handling

```typescript
const apiTask = CodeAwareTask<any>({ name: "APIHandler" })

const apiContext: CodeContext = {
  source: `
    async function fetchUserProfile(userId) {
      const response = await fetch(\`/api/users/\${userId}\`)
      const data = await response.json()
      return data
    }
  `,
  functionName: "fetchUserProfile",
  llmContext: {
    intent: "Fetch user profile with proper error handling",
    constraints: [
      "Must handle HTTP errors",
      "Must validate response data",
      "Must handle network timeouts",
      "Must retry on transient failures"
    ],
    domain: "User management API"
  }
}

// API-specific fitness evaluation
const apiFitness = CodeAwareTask.createCustomFitnessFunction(
  "apiResilience",
  async (context) => {
    let score = 30
    const feedback: string[] = []
    
    if (context.source.includes("response.ok")) {
      score += 25
      feedback.push("Checks HTTP response status")
    }
    
    if (context.source.includes("try") && context.source.includes("catch")) {
      score += 20
      feedback.push("Includes error handling")
    }
    
    if (context.source.includes("timeout")) {
      score += 15
      feedback.push("Handles timeouts")
    }
    
    if (context.source.includes("retry")) {
      score += 10
      feedback.push("Implements retry logic")
    }
    
    return { score: Math.min(100, score), feedback }
  }
)

const result = await apiTask.executeWithHealing(apiContext, {
  maxAttempts: 5,
  enableLLMHealing: true,
  minFitnessScore: 80,
  customFitnessFunctions: [apiFitness]
})
```

## Advanced Usage

### Healing Attempt Analysis

```typescript
// Detailed analysis of healing process
const result = await task.executeWithHealing(context, config)

console.log("Healing Journey Analysis:")
result.healingAttempts.forEach((attempt, index) => {
  console.log(`\nAttempt ${index + 1}:`)
  console.log(`  Trigger: ${attempt.error}`)
  console.log(`  Timestamp: ${attempt.timestamp}`)
  console.log(`  Fitness Score: ${attempt.fitnessScore || 'N/A'}`)
  console.log(`  Success: ${attempt.success}`)
  
  if (attempt.reasoning) {
    console.log(`  AI Reasoning: ${attempt.reasoning}`)
  }
  
  if (attempt.healedCode) {
    console.log(`  Code Changes: ${attempt.healedCode.length} characters`)
  }
})

// Analyze improvement trajectory
const scores = result.healingAttempts
  .map(a => a.fitnessScore)
  .filter(s => s !== undefined)

if (scores.length > 1) {
  const improvement = scores[scores.length - 1] - scores[0]
  console.log(`Total Improvement: +${improvement} points`)
}
```

### Code Validation Pipeline

```typescript
// Comprehensive validation before healing acceptance
const validation = await task.validateHealedCode(
  originalContext,
  healedCode,
  config
)

console.log("Validation Results:")
console.log(`  Safe to use: ${validation.isValid}`)
console.log(`  Risk level: ${validation.riskLevel}`)

if (validation.issues.length > 0) {
  console.log("  Issues found:")
  validation.issues.forEach(issue => {
    console.log(`    - ${issue}`)
  })
}

// Only proceed if validation passes
if (validation.isValid && validation.riskLevel !== "high") {
  // Accept healed code
  console.log("Healed code accepted")
} else {
  console.log("Healed code rejected - safety concerns")
}
```

### Fitness Trend Analysis

```typescript
// Track fitness improvements over time
class FitnessTracker {
  private history: Array<{
    timestamp: Date
    context: CodeContext
    fitness: FitnessResult
    healing: boolean
  }> = []
  
  async evaluateAndTrack(
    task: CodeAwareTask<any>,
    context: CodeContext,
    healing: boolean = false
  ): Promise<FitnessResult> {
    const fitness = await task.evaluateFitness(context)
    
    this.history.push({
      timestamp: new Date(),
      context,
      fitness,
      healing
    })
    
    return fitness
  }
  
  getTrends(): {
    averageScore: number
    improvement: number
    healingSuccessRate: number
  } {
    const scores = this.history.map(h => h.fitness.score)
    const healingAttempts = this.history.filter(h => h.healing)
    
    return {
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      improvement: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0,
      healingSuccessRate: healingAttempts.length > 0 
        ? healingAttempts.filter(h => h.fitness.score > 70).length / healingAttempts.length 
        : 0
    }
  }
}
```

## Best Practices

### 1. Context Enrichment

Always provide comprehensive context for better LLM analysis:

```typescript
const richContext = CodeAwareTask.createCodeContext(
  sourceCode,
  "Clear description of intent",
  {
    filePath: "/src/modules/user-service.ts",
    functionName: "authenticateUser", 
    expectedOutput: { success: true, token: "jwt-token" },
    constraints: [
      "Must validate password strength",
      "Must handle rate limiting", 
      "Must log security events"
    ],
    dependencies: ["bcrypt", "jsonwebtoken", "rate-limiter"]
  }
)

// Add business context
richContext.llmContext!.domain = "Authentication service"
richContext.llmContext!.constraints!.push(
  "Must comply with GDPR",
  "Must use secure random tokens",
  "Must implement proper session management"
)
```

### 2. Gradual Fitness Requirements

Start with lower thresholds and gradually increase:

```typescript
// Progressive improvement approach
const phases = [
  { minScore: 60, attempts: 2 },  // Basic functionality
  { minScore: 75, attempts: 3 },  // Good quality
  { minScore: 85, attempts: 4 },  // High quality
  { minScore: 95, attempts: 5 }   // Excellent quality
]

for (const phase of phases) {
  const config = {
    ...CodeAwareTask.defaultConfig(),
    minFitnessScore: phase.minScore,
    maxAttempts: phase.attempts
  }
  
  const result = await task.executeWithHealing(context, config)
  
  if (!result.result.isEmpty) {
    console.log(`Achieved ${phase.minScore}+ quality`)
    break
  }
}
```

### 3. Domain-Specific Fitness Suites

Create comprehensive fitness function suites for different domains:

```typescript
// Security-focused suite
const securitySuite = [
  CodeAwareTask.createCustomFitnessFunction("inputValidation", validateInputHandling),
  CodeAwareTask.createCustomFitnessFunction("authentication", validateAuthPatterns),
  CodeAwareTask.createCustomFitnessFunction("encryption", validateCryptoUsage),
  CodeAwareTask.createCustomFitnessFunction("sqlInjection", validateSqlSafety)
]

// Performance-focused suite  
const performanceSuite = [
  CodeAwareTask.createCustomFitnessFunction("asyncOptimization", validateAsyncPatterns),
  CodeAwareTask.createCustomFitnessFunction("memoryUsage", validateMemoryEfficiency),
  CodeAwareTask.createCustomFitnessFunction("algorithmComplexity", validateComplexity),
  CodeAwareTask.createCustomFitnessFunction("caching", validateCachingStrategy)
]

// Business logic suite
const businessSuite = [
  CodeAwareTask.createCustomFitnessFunction("dataValidation", validateBusinessRules),
  CodeAwareTask.createCustomFitnessFunction("errorRecovery", validateRecoveryLogic),
  CodeAwareTask.createCustomFitnessFunction("auditTrail", validateAuditLogging),
  CodeAwareTask.createCustomFitnessFunction("compliance", validateComplianceRules)
]
```

### 4. Error Recovery Strategies

Implement comprehensive error recovery:

```typescript
class ResilientCodeExecution {
  async executeWithFallback<T>(
    primaryCode: CodeContext,
    fallbackStrategies: CodeContext[]
  ): Promise<T> {
    const task = CodeAwareTask<T>({ name: "ResilientExecution" })
    
    // Try primary code with healing
    try {
      const result = await task.executeWithHealing(
        primaryCode, 
        CodeAwareTask.defaultConfig()
      )
      
      if (!result.result.isEmpty) {
        return result.result.get()
      }
    } catch (error) {
      console.log("Primary execution failed, trying fallbacks...")
    }
    
    // Try fallback strategies
    for (const fallback of fallbackStrategies) {
      try {
        const result = await task.executeWithHealing(
          fallback,
          { ...CodeAwareTask.defaultConfig(), maxAttempts: 2 }
        )
        
        if (!result.result.isEmpty) {
          console.log("Fallback strategy succeeded")
          return result.result.get()
        }
      } catch (error) {
        console.log("Fallback failed, trying next...")
      }
    }
    
    throw new Error("All execution strategies failed")
  }
}
```

### 5. Monitoring and Metrics

Track CodeAwareTask performance in production:

```typescript
class CodeAwareMetrics {
  private metrics = {
    totalExecutions: 0,
    successfulHealing: 0,
    averageFitnessImprovement: 0,
    averageHealingTime: 0,
    commonIssues: new Map<string, number>()
  }
  
  async executeWithMetrics<T>(
    task: CodeAwareTask<T>,
    context: CodeContext,
    config: SelfHealingConfig
  ): Promise<any> {
    const startTime = Date.now()
    this.metrics.totalExecutions++
    
    const result = await task.executeWithHealing(context, config)
    
    const endTime = Date.now()
    const healingTime = endTime - startTime
    
    // Track metrics
    if (result.healingAttempts.length > 0) {
      this.metrics.successfulHealing++
      this.metrics.averageHealingTime = 
        (this.metrics.averageHealingTime + healingTime) / 2
        
      // Track common issues
      result.healingAttempts.forEach(attempt => {
        const errorType = this.categorizeError(attempt.error)
        this.metrics.commonIssues.set(
          errorType,
          (this.metrics.commonIssues.get(errorType) || 0) + 1
        )
      })
    }
    
    return result
  }
  
  private categorizeError(error: string): string {
    if (error.includes("undefined")) return "null-reference"
    if (error.includes("timeout")) return "timeout"
    if (error.includes("permission")) return "security"
    if (error.includes("syntax")) return "syntax-error"
    return "other"
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      healingSuccessRate: this.metrics.successfulHealing / this.metrics.totalExecutions,
      topIssues: Array.from(this.metrics.commonIssues.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    }
  }
}
```

## API Reference

### CodeAwareTask

#### Constructor
```typescript
CodeAwareTask<T>(params?: TaskParams): CodeAwareTask<T>
```

#### Methods

**executeWithHealing**
```typescript
executeWithHealing(
  codeContext: CodeContext,
  config: SelfHealingConfig,
  cancellationToken?: CancellationToken
): Promise<{
  result: Option<unknown>
  fitness: FitnessResult
  healingAttempts: HealingAttempt[]
  finalCode: string
}>
```

**evaluateFitness**
```typescript
evaluateFitness(
  codeContext: CodeContext,
  result?: unknown,
  customFunctions?: Array<CustomFitnessFunction>
): Promise<FitnessResult>
```

**generateHealingSuggestions**
```typescript
generateHealingSuggestions(
  codeContext: CodeContext,
  error: string,
  config: SelfHealingConfig
): Promise<{
  suggestions: string[]
  healedCode?: string
  reasoning: string
}>
```

**validateHealedCode**
```typescript
validateHealedCode(
  original: CodeContext,
  healed: string,
  config: SelfHealingConfig
): Promise<{
  isValid: boolean
  issues: string[]
  riskLevel: "low" | "medium" | "high"
}>
```

#### Static Methods

**defaultConfig**
```typescript
CodeAwareTask.defaultConfig(): SelfHealingConfig
```

**fitnessConfig**
```typescript
CodeAwareTask.fitnessConfig(minScore: number): SelfHealingConfig
```

**createCustomFitnessFunction**
```typescript
CodeAwareTask.createCustomFitnessFunction(
  name: string,
  evaluator: (context: CodeContext, result?: unknown) => Promise<{
    score: number
    feedback: string[]
    suggestions?: string[]
  }>
): CustomFitnessFunction
```

**createCodeContext**
```typescript
CodeAwareTask.createCodeContext(
  source: string,
  intent: string,
  options?: {
    filePath?: string
    functionName?: string
    expectedOutput?: unknown
    constraints?: string[]
    dependencies?: string[]
  }
): CodeContext
```

### Types

**CodeContext**
```typescript
type CodeContext = {
  source: string
  filePath?: string
  functionName?: string
  lineNumber?: number
  inputParams?: Record<string, unknown>
  expectedOutput?: unknown
  stackTrace?: string
  attempts?: Array<{
    timestamp: Date
    error: string
    modifications?: string
  }>
  llmContext?: {
    intent: string
    constraints?: string[]
    dependencies?: string[]
    domain?: string
  }
}
```

**FitnessResult**
```typescript
type FitnessResult = {
  score: number
  metrics: {
    correctness: number
    performance: number
    maintainability: number
    security: number
    typeSafety: number
  }
  feedback: string[]
  suggestions: string[]
}
```

**SelfHealingConfig**
```typescript
type SelfHealingConfig = {
  maxAttempts: number
  enableLLMHealing: boolean
  minFitnessScore: number
  customFitnessFunctions?: Array<CustomFitnessFunction>
  llmConfig?: {
    provider: "openai" | "anthropic" | "custom"
    apiKey?: string
    model?: string
    temperature?: number
    customEndpoint?: string
  }
}
```

**HealingAttempt**
```typescript
type HealingAttempt = {
  attempt: number
  timestamp: Date
  error: string
  healedCode?: string
  fitnessScore?: number
  success: boolean
  reasoning?: string
}
```

## Conclusion

CodeAwareTask represents a significant advancement in automated code quality and resilience. By combining comprehensive fitness evaluation with LLM-powered self-healing, it enables the creation of systems that can autonomously improve code quality and recover from errors.

The framework's extensible design allows for domain-specific customization while maintaining safety and reliability through comprehensive validation mechanisms. Whether used for critical production systems or development workflows, CodeAwareTask provides the foundation for building more resilient and intelligent code execution environments.

For more examples and advanced usage patterns, see the `examples/code-aware-task-examples.ts` file in the repository.