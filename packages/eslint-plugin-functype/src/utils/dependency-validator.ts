// Utility to validate peer dependencies and provide helpful error messages

interface PeerDependency {
  name: string
  packageName: string
  description: string
  required: boolean
}

const PEER_DEPENDENCIES: PeerDependency[] = [
  {
    name: "@typescript-eslint/eslint-plugin",
    packageName: "@typescript-eslint/eslint-plugin",
    description: "TypeScript-aware ESLint rules",
    required: true,
  },
  {
    name: "@typescript-eslint/parser",
    packageName: "@typescript-eslint/parser",
    description: "TypeScript parser for ESLint",
    required: true,
  },
  {
    name: "eslint-plugin-functional",
    packageName: "eslint-plugin-functional",
    description: "Functional programming ESLint rules",
    required: true,
  },
  {
    name: "eslint-plugin-prettier",
    packageName: "eslint-plugin-prettier",
    description: "Code formatting rules",
    required: false,
  },
  {
    name: "eslint-plugin-simple-import-sort",
    packageName: "eslint-plugin-simple-import-sort",
    description: "Import sorting rules",
    required: false,
  },
  {
    name: "prettier",
    packageName: "prettier",
    description: "Code formatter",
    required: false,
  },
]

export interface ValidationResult {
  isValid: boolean
  missing: PeerDependency[]
  available: PeerDependency[]
  installCommand: string
  warnings: string[]
}

function tryRequire(packageName: string): boolean {
  try {
    require.resolve(packageName)
    return true
  } catch {
    return false
  }
}

export function validatePeerDependencies(): ValidationResult {
  const missing: PeerDependency[] = []
  const available: PeerDependency[] = []
  const warnings: string[] = []

  for (const dep of PEER_DEPENDENCIES) {
    if (tryRequire(dep.packageName)) {
      available.push(dep)
    } else {
      missing.push(dep)
      if (dep.required) {
        // Required dependency is missing - this will cause errors
      } else {
        // Optional dependency is missing - add warning
        warnings.push(`Optional plugin '${dep.name}' not found. Some rules will be skipped.`)
      }
    }
  }

  const requiredMissing = missing.filter((dep) => dep.required)
  const isValid = requiredMissing.length === 0

  // Generate install command for missing dependencies
  const missingPackageNames = missing.map((dep) => dep.packageName)
  const installCommand = missingPackageNames.length > 0 ? `pnpm add -D ${missingPackageNames.join(" ")}` : ""

  return {
    isValid,
    missing,
    available,
    installCommand,
    warnings,
  }
}

export function createValidationError(result: ValidationResult): Error {
  const requiredMissing = result.missing.filter((dep) => dep.required)

  if (requiredMissing.length === 0) {
    return new Error("No validation errors")
  }

  const missingList = requiredMissing.map((dep) => `  • ${dep.name} - ${dep.description}`).join("\n")

  const message = [
    "❌ Missing required peer dependencies for eslint-plugin-functype:",
    "",
    missingList,
    "",
    "📦 Install missing dependencies:",
    `   ${result.installCommand}`,
    "",
    "📖 See installation guide: https://github.com/jordanburke/eslint-plugin-functype#installation",
  ].join("\n")

  return new Error(message)
}

export function shouldValidateDependencies(): boolean {
  // Skip validation in test environments or when explicitly disabled
  return process.env.NODE_ENV !== "test" && process.env.FUNCTYPE_SKIP_VALIDATION !== "true"
}
