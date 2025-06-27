# Pattern Examples

This directory contains tested TypeScript examples for functype pattern suggestions.

## Structure

Each pattern has two files:
- `{pattern-name}.before.ts` - Traditional JavaScript/TypeScript code
- `{pattern-name}.after.ts` - Functype equivalent

## Metadata

Each file pair includes metadata comments:
```typescript
/**
 * @pattern null-check
 * @description Use Option instead of null/undefined checks
 * @confidence 0.9
 * @tags null, undefined, optional, ?., !==, !=, == null
 */
```

All examples are compile-tested to ensure correctness.