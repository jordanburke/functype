import baseConfig from "ts-builds/eslint"

export default [
  ...baseConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]
