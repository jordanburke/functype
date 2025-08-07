# Required Changes to functype Library

## Summary
Remove `PromiseLike<R>` from `Either<L, R>` interface and fix `FPromise.toEither()` return type to create a cleaner, more predictable functional programming API.

## Changes Required

### 1. Remove PromiseLike from Either Interface

**File**: `Either-i_F6B_IB.d.ts` (or equivalent source file)
**Line**: ~582

**Current**:
```typescript
interface Either<L extends Type, R extends Type> extends FunctypeBase<R, "Left" | "Right">, PromiseLike<R> {
  // ... rest of interface
}
```

**Change to**:
```typescript
interface Either<L extends Type, R extends Type> extends FunctypeBase<R, "Left" | "Right"> {
  // ... rest of interface (no changes to methods)
  // Remove: , PromiseLike<R>
}
```

### 2. Fix FPromise.toEither Return Type

**File**: `fpromise/index.d.ts` (or equivalent source file)  
**Line**: ~205

**Current**:
```typescript
type FPromise<T extends Type, E extends Type = unknown> = PromiseLike<T> & {
  // ...
  toEither: () => Promise<T>;  // ← This is wrong!
  // ...
};
```

**Change to**:
```typescript
type FPromise<T extends Type, E extends Type = unknown> = PromiseLike<T> & {
  // ...
  toEither: () => Promise<Either<E, T>>;  // ← Correct return type
  // ...
};
```

### 3. Update Implementation (if needed)

If there's implementation code (not just type definitions), ensure:

1. **Either implementation**: Remove any Promise/thenable behavior
2. **FPromise.toEither implementation**: Actually return `Either<E, T>` wrapped in Promise

Example implementation for FPromise.toEither:
```typescript
toEither: async (): Promise<Either<E, T>> => {
  try {
    const value = await this.toPromise()
    return Right<E, T>(value)
  } catch (error) {
    return Left<E, T>(error as E)
  }
}
```

## Impact Analysis

### Breaking Changes
- ✅ **Expected**: Code using `await either` will break (this is desired)
- ✅ **Expected**: Code relying on Either auto-unwrapping will break

### Non-Breaking  
- ✅ **Safe**: All existing Either methods (`isLeft`, `isRight`, `get`, `fold`, etc.) remain unchanged
- ✅ **Safe**: FPromise behavior remains the same (still implements PromiseLike)
- ✅ **Safe**: Option and List interfaces unchanged

## Validation

After making these changes, the following should be true:

### TypeScript Compilation
```typescript
// This should compile (Either stays Either)
const either: Either<string, number> = Right(42)
const stillEither = either.map(x => x * 2) // Either<string, number>

// This should NOT compile (no auto-unwrapping)
const result = await either // ← TypeScript error (good!)

// This should compile (explicit methods still work)  
const value = either.get() // number
const folded = either.fold(err => 0, val => val) // number
```

### FPromise Integration
```typescript
// This should work (FPromise still awaitable)
const fpromise: FPromise<string, Error> = FPromise.resolve("hello")
const result = await fpromise // string

// This should work (explicit Either extraction)
const either = await fpromise.toEither() // Either<Error, string>
```

## Version Impact

This is a **major breaking change** and should increment the major version number of functype:
- Current: `0.9.4` → Proposed: `1.0.0`
- Or if already 1.x: `1.x.y` → `2.0.0`

## Testing

Recommended tests to add/update:

```typescript
describe('Either without PromiseLike', () => {
  it('should not be awaitable', async () => {
    const either = Right<string, number>(42)
    
    // This should be a TypeScript error
    // const result = await either
    
    // This should work
    const result = either.get()
    expect(result).toBe(42)
  })
  
  it('should still support all Either methods', () => {
    const either = Right<string, number>(42)
    
    expect(either.isRight()).toBe(true)
    expect(either.isLeft()).toBe(false) 
    expect(either.get()).toBe(42)
    
    const mapped = either.map(x => x * 2)
    expect(mapped.get()).toBe(84)
    
    const folded = either.fold(err => 0, val => val)
    expect(folded).toBe(42)
  })
})

describe('FPromise.toEither', () => {
  it('should return Promise<Either<E, T>>', async () => {
    const fpromise = FPromise.resolve(42)
    const either = await fpromise.toEither()
    
    expect(either.isRight()).toBe(true)
    expect(either.get()).toBe(42)
  })
  
  it('should handle errors properly', async () => {
    const fpromise = FPromise.reject<number, string>("error")
    const either = await fpromise.toEither()
    
    expect(either.isLeft()).toBe(true)
    expect(either.get()).toBe("error")
  })
})
```

## Implementation Priority

1. **High Priority**: Remove PromiseLike from Either (core change)
2. **Medium Priority**: Fix FPromise.toEither return type (nice to have)
3. **Low Priority**: Add additional convenience methods if desired

The first change is the most critical for resolving the API confusion issues.