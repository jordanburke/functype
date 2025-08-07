# Bug Report: `@typescript-eslint/no-unused-vars` incorrectly flags interface method generic type parameters

## Bug Description

The `@typescript-eslint/no-unused-vars` rule incorrectly flags generic type parameters in interface method declarations as unused variables, even though they are legitimate type contract definitions.

## Expected Behavior

Interface method generic type parameters should not be flagged as unused, as they define the type contract for implementations and are conceptually different from runtime variables.

## Actual Behavior

ESLint reports the generic type parameter as an unused variable:

```
'B' is defined but never used. Allowed unused vars must match /^_/u
```

## Reproduction

### Minimal Code Example

```typescript
interface ContainerOps<A, Self> {
  /**
   * Flattens a collection of collections into a single collection.
   * B represents the inner type when flattening Container<Container<B>> -> Container<B>
   */
  flatten<B>(): Self
}
```

### ESLint Configuration

```javascript
"@typescript-eslint/no-unused-vars": [
  "error",
  {
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_",
    "caughtErrors": "all",
    "caughtErrorsIgnorePattern": "^_",
    "destructuredArrayIgnorePattern": "^_",
    "ignoreRestSiblings": true,
    "args": "after-used"
  }
]
```

### Error Output

```
/src/typeclass/ContainerOps.ts
  66:11  error  'B' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
```

## Why This Is a Bug

1. **Type Contract Definition**: The generic `B` defines what type the flattening operation works with, even if not explicitly used in the return type signature
2. **Implementation Dependency**: Concrete implementations need this type parameter for correct type inference
3. **Compile-time Only**: Interface generics are compile-time constructs, not runtime variables that can be "dead code"

### Example Implementation Using the Generic

```typescript
class List<A> implements ContainerOps<A, List<A>> {
  flatten<B>(): List<A> {
    // B is implicitly used by TypeScript's type system when flattening List<List<B>>
    return this.flatMap((x) => x) // TypeScript infers the correct types via B
  }
}
```

## Current Workaround

We have to allow single uppercase letters in `varsIgnorePattern`:

```javascript
"varsIgnorePattern": "^(_|[A-Z]$)" // Allow single uppercase letters for interface generics
```

But this is overly permissive and could hide legitimate unused variables.

## Suggested Fix

The rule should distinguish between:

- **Interface/type generic parameters** (should not be flagged)
- **Function generic parameters** (could potentially be flagged if truly unused)
- **Runtime variables** (should be flagged when unused)

Ideally, add configuration options like:

- `ignoreInterfaceTypeParameters: true`
- `ignoreTypeDeclarationParameters: true`

## Environment

- **typescript-eslint version**: 8.39.0
- **ESLint version**: 9.32.0
- **TypeScript version**: 5.8.3
- **Node version**: 22.17.0

## Additional Context

This issue commonly affects functional programming libraries that define generic interface contracts. The pattern `flatten<B>()`, `map<U>()`, etc., is standard in type-safe functional programming where generic type parameters define the transformation contract.

Related issues: #2803, #6720, #9811 (but none specifically address interface method generics)
