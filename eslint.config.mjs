import path from "node:path"
import { fileURLToPath } from "node:url"

import { FlatCompat } from "@eslint/eslintrc"
import js from "@eslint/js"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import functionalEslint from "eslint-plugin-functional"
import functypeConfig from "eslint-config-functype"
import prettier from "eslint-plugin-prettier"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import globals from "globals"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  {
    ignores: [
      "**/.gitignore",
      "**/.eslintignore",
      "**/node_modules",
      "**/.DS_Store",
      "**/dist",
      "**/dist-ssr",
      "**/*.local",
      "**/lib",
      "**/tsconfig.json",
    ],
  },
  ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"),
  // 🚀 The functype plugin now includes ALL the rules!
  functypeConfig.configs.recommended,
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "simple-import-sort": simpleImportSort,
      functional: functionalEslint,
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.amd,
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",

      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    settings: {
      "import/resolver": {
        node: {
          paths: ["'src'"],
          extensions: [".js", ".ts"],
        },
      },
    },

    rules: {
      "functional/prefer-immutable-types": "off",
      "functional/no-throw-statements": "off",
      // Project-specific overrides to functype defaults
      "functional/no-let": "warn", // More lenient than functype's default "error"
      "functional/immutable-data": [
        "warn",
        {
          ignoreAccessorPattern: ["*.push", "*.pop", "*.shift", "*.unshift"],
        },
      ],

      // Disable prefer-immutable-types for functional library development
      // This rule is valuable for applications but counterproductive for foundational libraries because:
      // 1. Library vs Application: Infrastructure code has different immutability needs than app code
      // 2. Design Philosophy: Functype provides immutability through design (immutable data structures,
      //    pure functions) rather than TypeScript readonly annotations on every parameter
      // 3. Interoperability: Forcing Readonly<T> breaks compatibility with standard library functions
      //    and third-party code that expects regular T parameters
      // 4. Developer Experience: Callback signatures like map((x) => x + 1) don't benefit from
      //    readonly annotations - they add noise without meaningful safety improvements
      // 5. False Security: readonly only prevents property assignment, not deep mutations, so the
      //    safety benefit is limited while the compatibility cost is high
      //
      // Applications using functype may choose to enable this rule for their own code if they want
      // stricter immutability enforcement, but the library itself provides immutability guarantees
      // through architectural design rather than type-level constraints.
      "functional/prefer-immutable-types": "off",
    },
  },
]
