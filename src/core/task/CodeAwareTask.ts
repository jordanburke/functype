import { Companion } from "@/companion/Companion"
import { Option } from "@/option"
import type { Type } from "@/types"

import type { CancellationToken, TaskParams } from "./Task"
import { Task } from "./Task"

/**
 * Code context for LLM-based self-healing and analysis
 */
export type CodeContext = {
  /** The source code being executed */
  source: string
  /** File path or identifier */
  filePath?: string
  /** Function/method name */
  functionName?: string
  /** Line number where error occurred */
  lineNumber?: number
  /** Input parameters that caused the issue */
  inputParams?: Record<string, unknown>
  /** Expected output type/shape */
  expectedOutput?: unknown
  /** Stack trace at time of error */
  stackTrace?: string
  /** Previous execution attempts */
  attempts?: Array<{
    timestamp: Date
    error: string
    modifications?: string
  }>
  /** Additional context for LLM */
  llmContext?: {
    /** Description of what the code should do */
    intent: string
    /** Known constraints or requirements */
    constraints?: string[]
    /** Related code/dependencies */
    dependencies?: string[]
    /** Business rules or domain knowledge */
    domain?: string
  }
}

/**
 * Fitness function result for code quality assessment
 */
export type FitnessResult = {
  /** Overall fitness score (0-100) */
  score: number
  /** Individual metric scores */
  metrics: {
    /** Correctness score (0-100) */
    correctness: number
    /** Performance score (0-100) */
    performance: number
    /** Maintainability score (0-100) */
    maintainability: number
    /** Security score (0-100) */
    security: number
    /** Type safety score (0-100) */
    typeSafety: number
  }
  /** Detailed feedback for improvement */
  feedback: string[]
  /** Suggestions for self-healing */
  suggestions: string[]
}

/**
 * Partial fitness result from individual functions
 */
export type PartialFitnessResult = {
  /** Partial metric scores */
  metrics?: Partial<FitnessResult["metrics"]>
  /** Detailed feedback for improvement */
  feedback?: string[]
  /** Suggestions for self-healing */
  suggestions?: string[]
}

/**
 * Configuration for self-healing behavior
 */
export type SelfHealingConfig = {
  /** Maximum number of self-healing attempts */
  maxAttempts: number
  /** Whether to use LLM for code generation */
  enableLLMHealing: boolean
  /** Minimum fitness score to accept */
  minFitnessScore: number
  /** Custom fitness functions */
  customFitnessFunctions?: Array<(context: CodeContext, result?: unknown) => Promise<PartialFitnessResult>>
  /** LLM provider configuration */
  llmConfig?: {
    provider: "openai" | "anthropic" | "custom"
    apiKey?: string
    model?: string
    temperature?: number
    customEndpoint?: string
  }
}

/**
 * Self-healing attempt result
 */
export type HealingAttempt = {
  /** Attempt number */
  attempt: number
  /** Timestamp of attempt */
  timestamp: Date
  /** Error that triggered healing */
  error: string
  /** Generated/modified code */
  healedCode?: string
  /** Fitness score of healed code */
  fitnessScore?: number
  /** Whether healing was successful */
  success: boolean
  /** Reasoning for the healing approach */
  reasoning?: string
}

/**
 * Code-aware task that can self-heal using LLM context
 */
export type CodeAwareTask<T extends Type> = {
  /** Execute with code context and self-healing */
  executeWithHealing: (
    codeContext: CodeContext,
    config: SelfHealingConfig,
    cancellationToken?: CancellationToken,
  ) => Promise<{
    result: Option<unknown>
    fitness: FitnessResult
    healingAttempts: HealingAttempt[]
    finalCode: string
  }>

  /** Evaluate fitness of code without execution */
  evaluateFitness: (
    codeContext: CodeContext,
    result?: unknown,
    customFunctions?: Array<(context: CodeContext, result?: unknown) => Promise<PartialFitnessResult>>,
  ) => Promise<FitnessResult>

  /** Generate healing suggestions using LLM */
  generateHealingSuggestions: (
    codeContext: CodeContext,
    error: string,
    config: SelfHealingConfig,
  ) => Promise<{
    suggestions: string[]
    healedCode?: string
    reasoning: string
  }>

  /** Validate healed code before execution */
  validateHealedCode: (
    original: CodeContext,
    healed: string,
    config: SelfHealingConfig,
  ) => Promise<{
    isValid: boolean
    issues: string[]
    riskLevel: "low" | "medium" | "high"
  }>
}

/**
 * Default fitness functions for code evaluation
 */
const defaultFitnessFunctions = {
  /** Evaluate correctness based on execution success and expected output */
  correctness: async (context: CodeContext, result?: unknown): Promise<PartialFitnessResult> => {
    let score = 50 // Base score
    const feedback: string[] = []

    // Check if execution succeeded
    if (result !== undefined) {
      score += 25
      feedback.push("Code executed successfully")
    } else {
      feedback.push("Code failed to execute")
    }

    // Check if result matches expected output (if provided)
    if (context.expectedOutput && result) {
      const matches = JSON.stringify(result) === JSON.stringify(context.expectedOutput)
      if (matches) {
        score += 25
        feedback.push("Output matches expected result")
      } else {
        feedback.push("Output doesn't match expected result")
      }
    }

    return {
      metrics: { correctness: Math.min(100, score) },
      feedback,
    }
  },

  /** Evaluate performance characteristics */
  performance: async (context: CodeContext): Promise<PartialFitnessResult> => {
    let score = 70 // Base score
    const feedback: string[] = []

    // Basic heuristics for performance
    const codeLength = context.source.length
    const hasLoops = /for\s*\(|while\s*\(|\.forEach|\.map|\.filter/.test(context.source)
    const hasAsyncAwait = /async|await/.test(context.source)

    // Penalize very long functions
    if (codeLength > 1000) {
      score -= 10
      feedback.push("Function is quite long, consider breaking it down")
    }

    // Bonus for async handling
    if (hasAsyncAwait) {
      score += 10
      feedback.push("Uses modern async/await syntax")
    }

    // Check for potential performance issues
    if (hasLoops && context.source.includes("await")) {
      score -= 15
      feedback.push("Consider using Promise.all() for concurrent async operations")
    }

    return {
      metrics: { performance: Math.min(100, Math.max(0, score)) },
      feedback,
    }
  },

  /** Evaluate maintainability */
  maintainability: async (context: CodeContext): Promise<PartialFitnessResult> => {
    let score = 60 // Base score
    const feedback: string[] = []

    // Check for TypeScript usage
    const hasTypeAnnotations = /:\s*(string|number|boolean|object|Array|Promise)/.test(context.source)
    if (hasTypeAnnotations) {
      score += 15
      feedback.push("Uses TypeScript type annotations")
    }

    // Check for comments
    const hasComments = /\/\/|\/\*/.test(context.source)
    if (hasComments) {
      score += 10
      feedback.push("Includes code comments")
    }

    // Check function length
    const lines = context.source.split("\n").length
    if (lines > 50) {
      score -= 15
      feedback.push("Function is quite long, consider breaking it down")
    } else if (lines <= 20) {
      score += 10
      feedback.push("Function is appropriately sized")
    }

    // Check for error handling
    const hasErrorHandling = /try\s*{|catch\s*\(|throw\s+/.test(context.source)
    if (hasErrorHandling) {
      score += 15
      feedback.push("Includes error handling")
    } else {
      feedback.push("Consider adding error handling")
    }

    return {
      metrics: { maintainability: Math.min(100, Math.max(0, score)) },
      feedback,
    }
  },

  /** Evaluate security aspects */
  security: async (context: CodeContext): Promise<PartialFitnessResult> => {
    let score = 80 // Base score (assume secure by default)
    const feedback: string[] = []

    // Check for potential security issues
    const hasEval = /eval\s*\(/i.test(context.source)
    if (hasEval) {
      score -= 30
      feedback.push("Uses eval() which can be dangerous")
    }

    const hasInnerHTML = /innerHTML\s*=/i.test(context.source)
    if (hasInnerHTML) {
      score -= 20
      feedback.push("Uses innerHTML which can be vulnerable to XSS")
    }

    const hasFileSystem = /fs\.|readFile|writeFile|unlinkSync/i.test(context.source)
    if (hasFileSystem) {
      score -= 10
      feedback.push("Accesses file system - ensure proper validation")
    }

    const hasExec = /exec\s*\(|spawn\s*\(/i.test(context.source)
    if (hasExec) {
      score -= 25
      feedback.push("Executes system commands - high security risk")
    }

    return {
      metrics: { security: Math.min(100, Math.max(0, score)) },
      feedback,
    }
  },

  /** Evaluate type safety */
  typeSafety: async (context: CodeContext): Promise<PartialFitnessResult> => {
    let score = 50 // Base score
    const feedback: string[] = []

    // Check for TypeScript features
    const hasTypeAnnotations = /:\s*(string|number|boolean|object|Array|Promise|Type)/.test(context.source)
    if (hasTypeAnnotations) {
      score += 20
      feedback.push("Uses type annotations")
    }

    // Check for any usage
    const hasAny = /:\s*any\b/.test(context.source)
    if (hasAny) {
      score -= 20
      feedback.push("Uses 'any' type - consider more specific types")
    }

    // Check for type guards
    const hasTypeGuards = /typeof\s+\w+\s*===|instanceof/.test(context.source)
    if (hasTypeGuards) {
      score += 15
      feedback.push("Uses type guards for runtime safety")
    }

    // Check for optional chaining
    const hasOptionalChaining = /\?\./g.test(context.source)
    if (hasOptionalChaining) {
      score += 10
      feedback.push("Uses optional chaining for null safety")
    }

    // Check for nullish coalescing
    const hasNullishCoalescing = /\?\?/g.test(context.source)
    if (hasNullishCoalescing) {
      score += 5
      feedback.push("Uses nullish coalescing")
    }

    return {
      metrics: { typeSafety: Math.min(100, Math.max(0, score)) },
      feedback,
    }
  },
}

/**
 * Mock LLM healing service (replace with actual LLM integration)
 */
const mockLLMHealing = {
  async generateHealingSuggestions(
    context: CodeContext,
    error: string,
    config: SelfHealingConfig,
  ): Promise<{ suggestions: string[]; healedCode?: string; reasoning: string }> {
    // This would integrate with actual LLM service
    const suggestions = [
      "Add null checks for input parameters",
      "Wrap async operations in try-catch",
      "Use type guards for runtime validation",
      "Add error handling for edge cases",
    ]

    const reasoning = `
      Based on the error "${error}" and code context:
      - Function: ${context.functionName || "unknown"}
      - Intent: ${context.llmContext?.intent || "not specified"}
      - The code appears to need better error handling and type safety
    `

    // Simple healing attempt (would be much more sophisticated with real LLM)
    const healedCode = context.source.includes("try")
      ? context.source
      : `try {\n${context.source}\n} catch (error) {\n  throw new Error(\`Operation failed: \${error}\`)\n}`

    return { suggestions, healedCode, reasoning }
  },
}

const CodeAwareTaskObject = <T extends Type>(baseTask: ReturnType<typeof Task>): CodeAwareTask<T> => {
  const codeAwareTask: CodeAwareTask<T> = {
    async executeWithHealing(
      codeContext: CodeContext,
      config: SelfHealingConfig,
      cancellationToken?: CancellationToken,
    ) {
      const healingAttempts: HealingAttempt[] = []
      let currentCode = codeContext.source
      let lastError: string | undefined

      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          // Execute the code (simplified - would need actual code execution)
          const result = await baseTask.Async<unknown>(
            () => {
              // This would actually execute the code string
              // For now, simulate execution
              if (currentCode.includes("throw")) {
                throw new Error("Simulated execution error")
              }
              return "simulated result"
            },
            (error) => error,
            () => {},
            cancellationToken,
          )

          // Evaluate fitness
          const fitness = await codeAwareTask.evaluateFitness(
            { ...codeContext, source: currentCode },
            result,
            config.customFitnessFunctions,
          )

          // Check if fitness meets threshold
          if (fitness.score >= config.minFitnessScore) {
            return {
              result: Option(result),
              fitness,
              healingAttempts,
              finalCode: currentCode,
            }
          }

          // If not, attempt healing
          if (config.enableLLMHealing && attempt < config.maxAttempts) {
            const healingResult = await codeAwareTask.generateHealingSuggestions(
              { ...codeContext, source: currentCode },
              `Fitness score ${fitness.score} below threshold ${config.minFitnessScore}`,
              config,
            )

            if (healingResult.healedCode) {
              currentCode = healingResult.healedCode
              healingAttempts.push({
                attempt,
                timestamp: new Date(),
                error: `Low fitness score: ${fitness.score}`,
                healedCode: currentCode,
                fitnessScore: fitness.score,
                success: false,
                reasoning: healingResult.reasoning,
              })
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error)

          if (config.enableLLMHealing && attempt < config.maxAttempts) {
            const healingResult = await codeAwareTask.generateHealingSuggestions(
              { ...codeContext, source: currentCode },
              lastError,
              config,
            )

            if (healingResult.healedCode) {
              currentCode = healingResult.healedCode
              healingAttempts.push({
                attempt,
                timestamp: new Date(),
                error: lastError,
                healedCode: currentCode,
                success: false,
                reasoning: healingResult.reasoning,
              })
            }
          } else {
            healingAttempts.push({
              attempt,
              timestamp: new Date(),
              error: lastError,
              success: false,
            })
          }
        }
      }

      // Final fitness evaluation
      const finalFitness = await codeAwareTask.evaluateFitness(
        { ...codeContext, source: currentCode },
        undefined,
        config.customFitnessFunctions,
      )

      return {
        result: Option.none<unknown>(),
        fitness: finalFitness,
        healingAttempts,
        finalCode: currentCode,
      }
    },

    async evaluateFitness(
      codeContext: CodeContext,
      result?: unknown,
      customFunctions?: Array<(context: CodeContext, result?: unknown) => Promise<PartialFitnessResult>>,
    ): Promise<FitnessResult> {
      const functions = [...Object.values(defaultFitnessFunctions), ...(customFunctions || [])]

      const results = await Promise.all(functions.map((fn) => fn(codeContext, result)))

      // Aggregate results
      const metrics = {
        correctness: 0,
        performance: 0,
        maintainability: 0,
        security: 0,
        typeSafety: 0,
      }

      const metricCounts = {
        correctness: 0,
        performance: 0,
        maintainability: 0,
        security: 0,
        typeSafety: 0,
      }

      const feedback: string[] = []
      const suggestions: string[] = []

      results.forEach((result) => {
        if (result.metrics) {
          Object.entries(result.metrics).forEach(([key, value]) => {
            if (key in metrics && typeof value === "number") {
              metrics[key as keyof typeof metrics] += value
              metricCounts[key as keyof typeof metricCounts]++
            }
          })
        }
        if (result.feedback) feedback.push(...result.feedback)
        if (result.suggestions) suggestions.push(...result.suggestions)
      })

      // Average the metrics
      Object.keys(metrics).forEach((key) => {
        const count = metricCounts[key as keyof typeof metricCounts]
        if (count > 0) {
          metrics[key as keyof typeof metrics] = Math.round(metrics[key as keyof typeof metrics] / count)
        } else {
          metrics[key as keyof typeof metrics] = 0
        }
      })

      // Calculate overall score
      const score = Math.round(Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length)

      return {
        score,
        metrics,
        feedback,
        suggestions,
      }
    },

    async generateHealingSuggestions(codeContext: CodeContext, error: string, config: SelfHealingConfig) {
      // Use mock LLM service (replace with actual integration)
      return mockLLMHealing.generateHealingSuggestions(codeContext, error, config)
    },

    async validateHealedCode(original: CodeContext, healed: string, config: SelfHealingConfig) {
      const issues: string[] = []
      let riskLevel: "low" | "medium" | "high" = "low"

      // Basic validation checks
      if (healed.length > original.source.length * 2) {
        issues.push("Healed code is significantly longer than original")
        riskLevel = "medium"
      }

      if (healed.includes("eval(") || healed.includes("Function(")) {
        issues.push("Healed code contains potentially dangerous eval() or Function()")
        riskLevel = "high"
      }

      if (original.functionName && !healed.includes(original.functionName)) {
        issues.push("Healed code appears to have changed the function name")
        riskLevel = "medium"
      }

      return {
        isValid: riskLevel !== "high",
        issues,
        riskLevel,
      }
    },
  }

  return codeAwareTask
}

/**
 * Create a new CodeAwareTask
 */
const CodeAwareTaskConstructor = <T extends Type>(params?: TaskParams): CodeAwareTask<T> => {
  const baseTask = Task(params)
  return CodeAwareTaskObject<T>(baseTask)
}

const CodeAwareTaskCompanion = {
  /**
   * Create a default self-healing configuration
   */
  defaultConfig: (): SelfHealingConfig => ({
    maxAttempts: 3,
    enableLLMHealing: true,
    minFitnessScore: 70,
    llmConfig: {
      provider: "openai",
      model: "gpt-4",
      temperature: 0.1,
    },
  }),

  /**
   * Create a fitness-focused configuration
   */
  fitnessConfig: (minScore: number): SelfHealingConfig => ({
    maxAttempts: 5,
    enableLLMHealing: true,
    minFitnessScore: minScore,
    llmConfig: {
      provider: "openai",
      model: "gpt-4",
      temperature: 0.0, // Lower temperature for more consistent code
    },
  }),

  /**
   * Create a custom fitness function for domain-specific evaluation
   */
  createCustomFitnessFunction: (
    name: string,
    evaluator: (
      context: CodeContext,
      result?: unknown,
    ) => Promise<{
      score: number
      feedback: string[]
      suggestions?: string[]
    }>,
  ) => {
    return async (context: CodeContext, result?: unknown): Promise<PartialFitnessResult> => {
      const evaluation = await evaluator(context, result)
      return {
        metrics: { [name]: evaluation.score } as Partial<FitnessResult["metrics"]>,
        feedback: evaluation.feedback,
        suggestions: evaluation.suggestions || [],
      }
    }
  },

  /**
   * Utility to create code context from function
   */
  createCodeContext: (
    source: string,
    intent: string,
    options?: {
      filePath?: string
      functionName?: string
      expectedOutput?: unknown
      constraints?: string[]
      dependencies?: string[]
    },
  ): CodeContext => ({
    source,
    filePath: options?.filePath,
    functionName: options?.functionName,
    expectedOutput: options?.expectedOutput,
    llmContext: {
      intent,
      constraints: options?.constraints,
      dependencies: options?.dependencies,
    },
  }),
}

/**
 * Code-aware task that provides LLM context for self-healing and fitness evaluation
 * @example
 * // Basic usage with self-healing
 * const codeTask = CodeAwareTask<string>({ name: "DataProcessor" })
 * const context = CodeAwareTask.createCodeContext(
 *   "function processData(data) { return data.map(x => x.value) }",
 *   "Process array of objects to extract values"
 * )
 *
 * const result = await codeTask.executeWithHealing(
 *   context,
 *   CodeAwareTask.defaultConfig()
 * )
 *
 * @example
 * // Custom fitness evaluation
 * const customFitness = CodeAwareTask.createCustomFitnessFunction(
 *   "businessLogic",
 *   async (context, result) => ({
 *     score: 85,
 *     feedback: ["Follows business rules correctly"],
 *     suggestions: ["Consider adding validation"]
 *   })
 * )
 *
 * const fitness = await codeTask.evaluateFitness(context, result, [customFitness])
 *
 * @example
 * // High-fitness configuration
 * const strictConfig = CodeAwareTask.fitnessConfig(90)
 * const result = await codeTask.executeWithHealing(context, strictConfig)
 */
export const CodeAwareTask = Companion(CodeAwareTaskConstructor, CodeAwareTaskCompanion)
