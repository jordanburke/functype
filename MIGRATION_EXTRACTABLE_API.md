# Extractable API Migration Guide

**Version:** 0.16.0+
**Breaking Change:** Renamed extraction methods to follow Rust-style conventions

## Quick Summary

We've simplified and standardized the API for extracting values from containers (Option, Either, Try, Lazy, TaskOutcome).

| Old Method | New Method | Purpose |
|------------|------------|---------|
| `getOrElse(value)` | `orElse(value)` | Extract with default value |
| `getOrThrow(error?)` | `orThrow(error?)` | Extract or throw error |
| `orElse(container)` | `or(container)` | Return this or alternative container |

**Note:** `orNull()` and `orUndefined()` remain unchanged.

## Affected Types

- `Option<T>` (Some/None)
- `Either<L,R>` (Left/Right)
- `Try<T>` (Success/Failure)
- `Lazy<T>`
- `TaskOutcome<T>` (Ok/Err)

## Migration Steps

### 1. Find & Replace

Use these patterns in your IDE or with sed:

```bash
# Extract with default value
.getOrElse(  →  .orElse(

# Extract or throw
.getOrThrow(  →  .orThrow(

# Container fallback (requires manual review)
# Look for patterns like: someOption.orElse(anotherOption)
# Change to: someOption.or(anotherOption)
```

### 2. Code Examples

#### Option

```typescript
// Before
const value = option.getOrElse(42)
const value = option.getOrThrow(new Error("Missing"))
const fallback = option.orElse(Option(42))

// After
const value = option.orElse(42)
const value = option.orThrow(new Error("Missing"))
const fallback = option.or(Option(42))
```

#### Either

```typescript
// Before
const value = either.getOrElse("default")
const value = either.getOrThrow()
const fallback = either.orElse(Right("default"))

// After
const value = either.orElse("default")
const value = either.orThrow()
const fallback = either.or(Right("default"))
```

#### Try

```typescript
// Before
const value = tryValue.getOrElse(0)
const value = tryValue.getOrThrow()
const fallback = tryValue.orElse(Try(() => 42))

// After
const value = tryValue.orElse(0)
const value = tryValue.orThrow()
const fallback = tryValue.or(Try(() => 42))
```

#### Lazy

```typescript
// Before
const value = lazy.getOrElse(0)
const value = lazy.getOrThrow()
const value = lazy.getOrNull()

// After
const value = lazy.orElse(0)
const value = lazy.orThrow()
const value = lazy.orNull()  // Unchanged!
```

#### TaskOutcome

```typescript
// Before
const value = outcome.getOrElse(0)
const value = outcome.getOrThrow()

// After
const value = outcome.orElse(0)
const value = outcome.orThrow()
```

### 3. Edge Cases

#### Container vs Value Disambiguation

The key distinction is now clearer:

```typescript
// Extracting a VALUE (use orElse)
const num: number = option.orElse(42)

// Returning a CONTAINER (use or)
const opt: Option<number> = option.or(Option(42))
```

#### Chaining

```typescript
// Before
option
  .map(x => x * 2)
  .orElse(fallbackOption)
  .getOrElse(0)

// After
option
  .map(x => x * 2)
  .or(fallbackOption)
  .orElse(0)
```

## Automated Migration Script

For large codebases, use this bash script:

```bash
#!/bin/bash
# migrate-extractable.sh

find src test -name "*.ts" -o -name "*.tsx" | while read file; do
  # Extract with default value
  sed -i 's/\.getOrElse(/.orElse(/g' "$file"

  # Extract or throw
  sed -i 's/\.getOrThrow(/.orThrow(/g' "$file"

  echo "Updated: $file"
done

echo "Migration complete. Please review container fallback cases manually."
```

**Important:** The script cannot automatically detect container fallback cases. After running, search for:
```typescript
// Pattern to manually review
\.orElse\(.*Option\(
\.orElse\(.*Either\(
\.orElse\(.*Try\(
\.orElse\(.*Lazy\(
```

And change these to use `.or()` instead.

## TypeScript Compilation Errors

After migration, TypeScript will catch type mismatches:

```typescript
// This will now fail to compile (good!)
const value: number = option.orElse(Option(42))  // Type error!

// Fix by using .or()
const value: Option<number> = option.or(Option(42))
```

## Testing Your Migration

1. **Compile**: `pnpm build` or `npm run build`
2. **Lint**: `pnpm lint`
3. **Test**: `pnpm test`
4. **Full validation**: `pnpm validate`

## Rationale

This change aligns functype with Rust's `Option` and `Result` APIs:

- **Consistency**: All `or*` methods extract values
- **Clarity**: `or()` clearly indicates container operations
- **Modern**: Follows conventions from Rust, which has proven successful in the FP space

## Questions?

- Check the [FUNCTYPE_FEATURE_MATRIX.md](./FUNCTYPE_FEATURE_MATRIX.md) for interface details
- See [docs/quick-reference.md](./docs/quick-reference.md) for updated examples
- Review the test suite for comprehensive usage patterns
