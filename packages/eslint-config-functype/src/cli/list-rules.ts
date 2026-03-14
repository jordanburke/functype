import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { validatePeerDependencies, type ValidationResult } from "../utils/dependency-validator"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Types for better type safety
type RuleSeverity = "off" | "warn" | "error" | 0 | 1 | 2
type RuleConfig = RuleSeverity | [RuleSeverity, ...unknown[]]

interface RuleData {
  severity: RuleSeverity
  options: unknown[]
  source: string
}

interface Config {
  rules?: Record<string, RuleConfig>
  extends?: string[]
  plugins?: string[]
}

interface LoadedConfig {
  name: string
  rules: Map<string, RuleData>
}

interface RuleDiff {
  name: string
  status: "added" | "removed" | "different" | "same"
  localSeverity?: RuleSeverity
  functypeSeverity?: RuleSeverity
  localOptions?: unknown[]
  functypeOptions?: unknown[]
}

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const

function colorize(text: string, color: keyof typeof colors): string {
  return colors[color] + text + colors.reset
}

async function loadConfig(configPath: string): Promise<Config | null> {
  try {
    const resolvedPath = path.resolve(configPath)
    const configModule = await import(pathToFileURL(resolvedPath).href)
    return configModule.default || configModule
  } catch (error) {
    console.error(colorize(`Error loading config from ${configPath}:`, "red"), (error as Error).message)
    return null
  }
}

function extractRules(config: Config): Map<string, RuleData> {
  const rules = new Map<string, RuleData>()

  if (config.rules) {
    Object.entries(config.rules).forEach(([ruleName, ruleConfig]) => {
      const severity = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig
      const options = Array.isArray(ruleConfig) ? ruleConfig.slice(1) : []

      rules.set(ruleName, {
        severity,
        options,
        source: getRuleSource(ruleName),
      })
    })
  }

  return rules
}

function getRuleSource(ruleName: string): string {
  if (ruleName.startsWith("functional/")) return "eslint-plugin-functional"
  if (ruleName.startsWith("@typescript-eslint/")) return "@typescript-eslint/eslint-plugin"
  return "eslint (core)"
}

function getSeverityColor(severity: RuleSeverity): keyof typeof colors {
  switch (severity) {
    case "error":
    case 2:
      return "red"
    case "warn":
    case 1:
      return "yellow"
    case "off":
    case 0:
      return "cyan"
    default:
      return "reset"
  }
}

function formatSeverity(severity: RuleSeverity): string {
  const severityMap: Record<string, string> = {
    "0": "off",
    "1": "warn",
    "2": "error",
    off: "off",
    warn: "warn",
    error: "error",
  }
  return severityMap[String(severity)] || String(severity)
}

function printRules(configName: string, rules: Map<string, RuleData>): void {
  console.log(colorize(`\n📋 ${configName} Configuration Rules:`, "bright"))
  console.log(colorize("=".repeat(50), "blue"))

  // Group rules by source
  const rulesBySource = new Map<string, Map<string, RuleData>>()
  rules.forEach((ruleData, ruleName) => {
    const source = ruleData.source
    if (!rulesBySource.has(source)) {
      rulesBySource.set(source, new Map())
    }
    rulesBySource.get(source)!.set(ruleName, ruleData)
  })

  // Print rules grouped by source
  rulesBySource.forEach((sourceRules, source) => {
    console.log(colorize(`\n📦 ${source}:`, "magenta"))

    sourceRules.forEach((ruleData, ruleName) => {
      const shortName = ruleName.replace(/^.*\//, "")
      const severity = formatSeverity(ruleData.severity)
      const severityColored = colorize(`[${severity.toUpperCase()}]`, getSeverityColor(ruleData.severity))
      const hasOptions = ruleData.options && ruleData.options.length > 0
      const optionsText = hasOptions ? colorize(" (with options)", "cyan") : ""

      console.log(`  ${severityColored} ${colorize(shortName, "green")}${optionsText}`)

      if (hasOptions && process.argv.includes("--verbose")) {
        console.log(`    ${colorize("Options:", "cyan")} ${JSON.stringify(ruleData.options)}`)
      }
    })
  })
}

function printSummary(configs: LoadedConfig[]): void {
  console.log(colorize("\n📊 Summary:", "bright"))
  console.log(colorize("=".repeat(30), "blue"))

  configs.forEach(({ name, rules }) => {
    const totalRules = rules.size
    const errorRules = Array.from(rules.values()).filter((r) => r.severity === "error" || r.severity === 2).length
    const warnRules = Array.from(rules.values()).filter((r) => r.severity === "warn" || r.severity === 1).length
    const offRules = Array.from(rules.values()).filter((r) => r.severity === "off" || r.severity === 0).length

    console.log(`\n${colorize(name, "bright")}: ${totalRules} total rules`)
    console.log(`  ${colorize("●", "red")} ${errorRules} errors`)
    console.log(`  ${colorize("●", "yellow")} ${warnRules} warnings`)
    console.log(`  ${colorize("●", "cyan")} ${offRules} disabled`)
  })
}

function printUsageInfo(): void {
  console.log(colorize("\n💡 Usage Information:", "bright"))
  console.log(colorize("=".repeat(30), "blue"))
  console.log("\n📖 How to use these configurations:")
  console.log("\n" + colorize("ESLint 8 (.eslintrc):", "green"))
  console.log('  extends: ["plugin:functype/recommended"]')
  console.log("\n" + colorize("ESLint 9+ (flat config):", "green"))
  console.log("  Copy the rules from our documentation into your eslint.config.js")
  console.log("\n" + colorize("Individual rules:", "green"))
  console.log("  You can enable any rule individually in your rules section")
}

function printDependencyStatus(result: ValidationResult): void {
  console.log(colorize("\n🔍 Dependency Status Check:", "bright"))
  console.log(colorize("=".repeat(40), "blue"))

  // Show available dependencies
  if (result.available.length > 0) {
    console.log(colorize("\n✅ Available:", "green"))
    result.available.forEach((dep) => {
      const icon = dep.required ? "🔧" : "🔌"
      console.log(`  ${icon} ${colorize(dep.name, "green")} - ${dep.description}`)
    })
  }

  // Show missing dependencies
  if (result.missing.length > 0) {
    console.log(colorize("\n❌ Missing:", "red"))
    result.missing.forEach((dep) => {
      const icon = dep.required ? "⚠️ " : "💡"
      const color = dep.required ? "red" : "yellow"
      console.log(`  ${icon} ${colorize(dep.name, color)} - ${dep.description}`)
    })

    if (result.installCommand) {
      console.log(colorize("\n📦 Install missing dependencies:", "bright"))
      console.log(`   ${colorize(result.installCommand, "cyan")}`)
    }
  }

  // Show warnings
  if (result.warnings.length > 0) {
    console.log(colorize("\n⚠️  Warnings:", "yellow"))
    result.warnings.forEach((warning) => console.log(`   ${warning}`))
  }

  // Overall status
  const status = result.isValid ? "✅ Ready to use" : "❌ Configuration will fail"
  const statusColor = result.isValid ? "green" : "red"
  console.log(colorize(`\n${status}`, statusColor))
}

async function loadLocalESLintConfig(configPath: string): Promise<Config | null> {
  try {
    // Try common ESLint config file names if no path provided
    const possibleConfigs = [
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.ts",
      ".eslintrc.js",
      ".eslintrc.json",
    ]

    let actualPath = configPath
    if (!configPath) {
      // Search for config file in current directory
      for (const filename of possibleConfigs) {
        if (fs.existsSync(filename)) {
          actualPath = filename
          break
        }
      }
      if (!actualPath) {
        console.log(colorize("❌ No ESLint config file found. Searched for:", "red"))
        possibleConfigs.forEach((f) => console.log(`  • ${f}`))
        return null
      }
    }

    console.log(colorize(`📖 Loading local config: ${actualPath}`, "cyan"))

    // Handle flat config (eslint.config.js)
    if (actualPath.includes("eslint.config")) {
      const configModule = await import(path.resolve(actualPath))
      const config = configModule.default || configModule

      // Flat config is array of config objects, merge rules
      if (Array.isArray(config)) {
        const mergedRules: Record<string, RuleConfig> = {}
        config.forEach((cfg: unknown) => {
          if (cfg && typeof cfg === "object" && "rules" in cfg) {
            const configObj = cfg as Config
            if (configObj.rules) {
              Object.assign(mergedRules, configObj.rules)
            }
          }
        })
        return { rules: mergedRules }
      }
      return config
    }

    // Handle legacy config (.eslintrc.*)
    return await loadConfig(actualPath)
  } catch (error) {
    console.error(colorize(`Error loading local config:`, "red"), (error as Error).message)
    return null
  }
}

function compareRules(localRules: Map<string, RuleData>, functypeRules: Map<string, RuleData>): RuleDiff[] {
  const allRules = new Set([...localRules.keys(), ...functypeRules.keys()])
  const diffs: RuleDiff[] = []

  allRules.forEach((ruleName) => {
    const localRule = localRules.get(ruleName)
    const functypeRule = functypeRules.get(ruleName)

    if (!localRule && functypeRule) {
      // Rule added by functype
      diffs.push({
        name: ruleName,
        status: "added",
        functypeSeverity: functypeRule.severity,
        functypeOptions: functypeRule.options,
      })
    } else if (localRule && !functypeRule) {
      // Rule exists locally but not in functype
      diffs.push({
        name: ruleName,
        status: "removed",
        localSeverity: localRule.severity,
        localOptions: localRule.options,
      })
    } else if (localRule && functypeRule) {
      // Compare configurations
      const severityDifferent = localRule.severity !== functypeRule.severity
      const optionsDifferent = JSON.stringify(localRule.options) !== JSON.stringify(functypeRule.options)

      if (severityDifferent || optionsDifferent) {
        diffs.push({
          name: ruleName,
          status: "different",
          localSeverity: localRule.severity,
          functypeSeverity: functypeRule.severity,
          localOptions: localRule.options,
          functypeOptions: functypeRule.options,
        })
      } else {
        diffs.push({
          name: ruleName,
          status: "same",
          localSeverity: localRule.severity,
          functypeSeverity: functypeRule.severity,
        })
      }
    }
  })

  return diffs.sort((a, b) => a.name.localeCompare(b.name))
}

function printDiff(diffs: RuleDiff[], functypeConfigName: string): void {
  console.log(colorize(`\n🔄 Config Comparison vs ${functypeConfigName}:`, "bright"))
  console.log(colorize("=".repeat(60), "blue"))

  const categories = {
    removed: diffs.filter((d) => d.status === "removed"),
    added: diffs.filter((d) => d.status === "added"),
    different: diffs.filter((d) => d.status === "different"),
    same: diffs.filter((d) => d.status === "same"),
  }

  // Rules you can remove (covered by functype)
  if (categories.same.length > 0) {
    console.log(colorize("\n✅ Rules you can remove (covered by functype):", "green"))
    categories.same.forEach((diff) => {
      const severity = formatSeverity(diff.functypeSeverity!)
      console.log(`  • ${diff.name} (${severity})`)
    })
  }

  // New rules functype adds
  if (categories.added.length > 0) {
    console.log(colorize("\n➕ New rules functype adds:", "blue"))
    categories.added.forEach((diff) => {
      const severity = formatSeverity(diff.functypeSeverity!)
      const severityColored = colorize(`[${severity.toUpperCase()}]`, getSeverityColor(diff.functypeSeverity!))
      console.log(`  • ${diff.name} ${severityColored}`)
    })
  }

  // Rules with conflicts
  if (categories.different.length > 0) {
    console.log(colorize("\n🔀 Conflicting rules (will override functype):", "yellow"))
    categories.different.forEach((diff) => {
      const localSeverity = formatSeverity(diff.localSeverity!)
      const functypeSeverity = formatSeverity(diff.functypeSeverity!)
      console.log(`  • ${diff.name}`)
      console.log(`    Local:    ${localSeverity}`)
      console.log(`    Functype: ${functypeSeverity}`)
    })
  }

  // Rules you have that functype doesn't
  if (categories.removed.length > 0) {
    console.log(colorize("\n➖ Your additional rules (not in functype):", "magenta"))
    categories.removed.forEach((diff) => {
      const severity = formatSeverity(diff.localSeverity!)
      console.log(`  • ${diff.name} (${severity})`)
    })
  }

  // Summary stats
  console.log(colorize("\n📊 Migration Summary:", "bright"))
  console.log(`  ${categories.same.length} rules can be removed`)
  console.log(`  ${categories.added.length} new rules will be added`)
  console.log(`  ${categories.different.length} rules have conflicts`)
  console.log(`  ${categories.removed.length} additional rules you keep`)

  // Migration suggestions
  if (categories.same.length > 0 || categories.different.length > 0) {
    console.log(colorize("\n💡 Suggested migration steps:", "bright"))
    if (categories.same.length > 0) {
      console.log("1. Remove duplicate rules from your config (they match functype)")
    }
    if (categories.different.length > 0) {
      console.log("2. Review conflicting rules - decide if you want local overrides")
    }
    console.log('3. Add functype config: extends: ["plugin:functype/recommended"]')
  }
}

async function runDiffMode(configPath: string): Promise<void> {
  console.log(colorize("🔄 ESLint Config Diff Mode", "bright"))

  // Load local config
  const localConfig = await loadLocalESLintConfig(configPath)
  if (!localConfig) {
    console.error(colorize("❌ Could not load local ESLint config", "red"))
    process.exit(1)
  }

  const localRules = extractRules(localConfig)
  console.log(colorize(`Found ${localRules.size} rules in local config`, "cyan"))

  // Load functype configs
  const distPath = path.join(__dirname, "..", "..", "dist")
  const configs = [
    { name: "Recommended", path: path.join(distPath, "configs", "recommended.js") },
    { name: "Strict", path: path.join(distPath, "configs", "strict.js") },
  ]

  for (const { name, path: configPath } of configs) {
    const functypeConfig = await loadConfig(configPath)
    if (functypeConfig) {
      const functypeRules = extractRules(functypeConfig)
      const diffs = compareRules(localRules, functypeRules)
      printDiff(diffs, name)
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const showHelp = args.includes("--help") || args.includes("-h")
  const showUsage = args.includes("--usage") || args.includes("-u")
  const checkDeps = args.includes("--check-deps") || args.includes("--check")
  const diffMode = args.includes("--diff")
  const diffConfigIndex = args.findIndex((arg) => arg === "--diff")
  const diffConfigPath = diffConfigIndex !== -1 && args[diffConfigIndex + 1] ? args[diffConfigIndex + 1] : ""

  if (showHelp) {
    console.log(colorize("📋 ESLint Plugin Functype - Rule Lister", "bright"))
    console.log("\nUsage: pnpm run list-rules [options]")
    console.log("\nOptions:")
    console.log("  --verbose, -v      Show rule options")
    console.log("  --usage, -u        Show usage examples")
    console.log("  --check-deps       Check peer dependency status")
    console.log("  --diff [config]    Compare local ESLint config with functype")
    console.log("  --help, -h         Show this help message")
    console.log("\nThis command lists all rules configured in the functype plugin configurations.")
    console.log("\nDiff mode:")
    console.log("  --diff             Auto-detect local ESLint config file")
    console.log("  --diff <path>      Compare specific config file with functype")
    return
  }

  // Handle diff mode
  if (diffMode) {
    await runDiffMode(diffConfigPath)
    return
  }

  // Handle dependency check
  if (checkDeps) {
    console.log(colorize("🔧 ESLint Plugin Functype - Dependency Check", "bright"))
    const result = validatePeerDependencies()
    printDependencyStatus(result)

    if (!result.isValid) {
      process.exit(1)
    }
    return
  }

  console.log(colorize("🔧 ESLint Plugin Functype - Supported Rules", "bright"))

  const distPath = path.join(__dirname, "..", "..", "dist")

  if (!fs.existsSync(distPath)) {
    console.error(colorize("❌ Build directory not found. Run `pnpm run build` first.", "red"))
    process.exit(1)
  }

  const configs = [
    {
      name: "Recommended",
      path: path.join(distPath, "configs", "recommended.js"),
    },
    {
      name: "Strict",
      path: path.join(distPath, "configs", "strict.js"),
    },
  ]

  const loadedConfigs: LoadedConfig[] = []

  for (const { name, path: configPath } of configs) {
    const config = await loadConfig(configPath)
    if (config) {
      const rules = extractRules(config)
      loadedConfigs.push({ name, rules })
      printRules(name, rules)
    }
  }

  if (loadedConfigs.length > 0) {
    printSummary(loadedConfigs)

    if (showUsage) {
      printUsageInfo()
    }

    console.log(colorize("\n💡 Tips:", "bright"))
    console.log("• Use --verbose to see rule options")
    console.log("• Use --usage to see configuration examples")
    console.log("• Red rules will cause build failures")
    console.log("• Yellow rules are warnings only")
    console.log("• Blue rules are disabled by default")

    console.log(colorize("\n🔗 Links:", "bright"))
    console.log("• Documentation: https://github.com/jordanburke/eslint-config-functype")
    console.log("• eslint-plugin-functional: https://github.com/eslint-functional/eslint-plugin-functional")
    console.log("• @typescript-eslint: https://typescript-eslint.io/")
  }
}

// Run the CLI
main().catch((error) => {
  console.error(colorize("❌ Unexpected error:", "red"), error)
  process.exit(1)
})
