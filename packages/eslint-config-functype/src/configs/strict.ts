import recommended from "./recommended"

// ESLint 9.x Flat Config Format - Strict rules overlay
// Note: Peer dependency validation is inherited from recommended config
export default {
  ...recommended,
  name: "functype/strict",
  rules: {
    ...recommended.rules,

    // Enable stricter functional rules
    "functional/no-loop-statements": "error",
    "functional/immutable-data": "error",
    "functional/prefer-immutable-types": "warn",
    "functional/functional-parameters": "warn",

    // Stricter TypeScript rules (non-type-aware)
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/strict-boolean-expressions": "error", // Default strict
  },
}
