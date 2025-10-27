#!/usr/bin/env tsx

/**
 * Script to validate documentation examples
 *
 * This script:
 * 1. Runs the documentation test suite to ensure all examples compile and work
 * 2. Generates TypeDoc documentation to verify @includeCode references work
 * 3. Reports on the validation status
 */

import { execSync, spawn } from "child_process"

interface ValidationResult {
  step: string
  success: boolean
  output?: string
  error?: string
}

class DocumentationValidator {
  private results: ValidationResult[] = []

  async runCommand(command: string, args: string[], step: string): Promise<ValidationResult> {
    try {
      console.log(`\n🔍 ${step}...`)

      const child = spawn(command, args, {
        stdio: ["inherit", "pipe", "pipe"],
        shell: true,
      })

      let stdout = ""
      let stderr = ""

      child.stdout?.on("data", (data) => {
        stdout += data.toString()
        process.stdout.write(data)
      })

      child.stderr?.on("data", (data) => {
        stderr += data.toString()
        process.stderr.write(data)
      })

      const exitCode = await new Promise<number>((resolve) => {
        child.on("close", resolve)
      })

      const result: ValidationResult = {
        step,
        success: exitCode === 0,
        output: stdout,
        error: stderr,
      }

      if (result.success) {
        console.log(`✅ ${step} passed`)
      } else {
        console.log(`❌ ${step} failed (exit code: ${exitCode})`)
      }

      return result
    } catch (error) {
      const result: ValidationResult = {
        step,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }

      console.log(`❌ ${step} failed: ${result.error}`)
      return result
    }
  }

  async validateDocumentationExamples(): Promise<ValidationResult> {
    return this.runCommand(
      "pnpm",
      ["vitest", "run", "test/docs/documentation-examples.spec.ts"],
      "Running documentation example tests",
    )
  }

  async validateTypeDocGeneration(): Promise<ValidationResult> {
    // Disable npm browser opening in CI environments
    try {
      execSync("npm config set browser false", { stdio: "inherit" })
    } catch (error) {
      console.warn("⚠️  Could not set npm browser config:", error)
    }

    return this.runCommand("pnpm", ["docs"], "Generating TypeDoc documentation with @includeCode references")
  }

  async validateAllTests(): Promise<ValidationResult> {
    return this.runCommand(
      "pnpm",
      ["test"],
      "Running full test suite to ensure examples don't break existing functionality",
    )
  }

  async validateBuild(): Promise<ValidationResult> {
    return this.runCommand("pnpm", ["build"], "Building project to ensure all examples compile correctly")
  }

  generateReport(): void {
    console.log("\n" + "=".repeat(60))
    console.log("📊 DOCUMENTATION VALIDATION REPORT")
    console.log("=".repeat(60))

    const totalSteps = this.results.length
    const passedSteps = this.results.filter((r) => r.success).length
    const failedSteps = totalSteps - passedSteps

    console.log(`\nTotal steps: ${totalSteps}`)
    console.log(`Passed: ${passedSteps} ✅`)
    console.log(`Failed: ${failedSteps} ❌`)

    if (failedSteps > 0) {
      console.log("\n🚨 FAILED STEPS:")
      this.results
        .filter((r) => !r.success)
        .forEach((result) => {
          console.log(`  • ${result.step}`)
          if (result.error) {
            console.log(`    Error: ${result.error}`)
          }
        })
    }

    console.log("\n" + "=".repeat(60))

    if (failedSteps === 0) {
      console.log("🎉 All documentation examples are valid and tested!")
      console.log("✨ Your documentation is now backed by compile-time validation.")
    } else {
      console.log("⚠️  Some validation steps failed. Please fix the issues above.")
      process.exit(1)
    }
  }

  async validateAll(): Promise<void> {
    console.log("🚀 Starting documentation validation...")

    // Step 1: Validate documentation examples compile and run
    const examplesResult = await this.validateDocumentationExamples()
    this.results.push(examplesResult)

    if (!examplesResult.success) {
      console.log("⚠️  Documentation examples failed - skipping other validations")
      this.generateReport()
      return
    }

    // Step 2: Validate TypeDoc generation with @includeCode
    const typeDocResult = await this.validateTypeDocGeneration()
    this.results.push(typeDocResult)

    // Step 3: Validate full test suite still passes
    const testsResult = await this.validateAllTests()
    this.results.push(testsResult)

    // Step 4: Validate project builds correctly
    const buildResult = await this.validateBuild()
    this.results.push(buildResult)

    this.generateReport()
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new DocumentationValidator()
  validator.validateAll().catch((error) => {
    console.error("💥 Validation failed:", error)
    process.exit(1)
  })
}

export { DocumentationValidator }
