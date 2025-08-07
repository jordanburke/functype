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
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_", // Only underscore-prefixed parameters
          "varsIgnorePattern": "^(_|[A-Z]$)", // Allow underscore-prefixed vars and single uppercase letters (interface generics)
          "caughtErrors": "all", // Require using catch block errors or prefix with _
          "caughtErrorsIgnorePattern": "^_", // Allow _error, _e, etc. in catch blocks
          "destructuredArrayIgnorePattern": "^_",
          "ignoreRestSiblings": true,
          "args": "after-used"
        }
      ],
      "functional/no-let": "warn", // More lenient than functype's default "error"
      "functional/immutable-data": [
        "warn",
        {
          ignoreAccessorPattern: ["*.push", "*.pop", "*.shift", "*.unshift"],
        },
      ],
    },
  },
  
  // HKT-specific overrides for Higher-Kinded Type implementations
  {
    files: ["**/hkt/**/*.ts", "**/*HKT*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "varsIgnorePattern": "^(_|[A-Z])$", // Allow single-letter generics in HKT files
          "argsIgnorePattern": "^_", // Only underscore-prefixed parameters
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]
    }
  }
]
