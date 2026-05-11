# Brand Type Migration Guide

This guide helps you migrate from the old object-based Brand implementation to the new phantom type implementation.

## What Changed?

### Old Implementation (Object Wrappers)

- Branded values were **objects** with methods
- Required `.unbrand()` or `.unwrap()` to access the primitive value
- `typeof brandedString === "object"`
- Object overhead and indexed properties

### New Implementation (Phantom Types)

- Branded values **ARE** the primitive values
- No unwrapping needed - use directly
- `typeof brandedString === "string"`
- Zero runtime overhead

## Migration Steps

### 1. Remove `.unbrand()` and `.unwrap()` calls

**Before:**

```typescript
const userId = Brand("UserId", "user-123")
const id = userId.unbrand() // Had to unwrap
console.log(`User: ${userId.unbrand()}`)
```

**After:**

```typescript
const userId = Brand("UserId", "user-123")
const id = userId // It IS the string!
console.log(`User: ${userId}`)
```

### 2. Remove `.toString()` for custom formatting

**Before:**

```typescript
const userId = Brand("UserId", "user-123")
console.log(userId.toString()) // "UserId(user-123)"
```

**After:**

```typescript
const userId = Brand("UserId", "user-123")
console.log(userId.toString()) // "user-123" - standard string method
console.log(userId) // "user-123"
```

### 3. Update ValidatedBrand usage

**Before:**

```typescript
const email = EmailAddress.of("user@example.com")
if (!email.isEmpty) {
  const branded = email.get()
  sendEmail(branded.unbrand()) // Had to unwrap
}
```

**After:**

```typescript
const email = EmailAddress.of("user@example.com")
if (!email.isEmpty) {
  const branded = email.get()
  sendEmail(branded) // It IS a string!
}
```

### 4. Update refine validators

**Before:**

```typescript
const SmallPositive = PositiveNumber.refine("SmallPositive", (n) => {
  return n.unbrand() < 100 // Had to unwrap
})
```

**After:**

```typescript
const SmallPositive = PositiveNumber.refine("SmallPositive", (n) => {
  return n < 100 // n IS a number!
})
```

### 5. Remove type assertions for external APIs

**Before:**

```typescript
const config = {
  userId: userId.unbrand(),
  port: port.unbrand(),
}
await api.request(config)
```

**After:**

```typescript
const config = {
  userId, // Already a string!
  port, // Already a number!
}
await api.request(config)
```

## Common Patterns

### Working with Option/Either

When extracting branded values from Option or Either, you may need to adjust default values:

**Before:**

```typescript
const email = EmailAddress.of(input)
const value = email.map((e) => e.unbrand()).orElse("")
```

**After (Option 1 - Keep branded type):**

```typescript
const email = EmailAddress.of(input)
const value = email.orElse("" as Brand<"EmailAddress", string>)
```

**After (Option 2 - Use fold for clean extraction):**

```typescript
const email = EmailAddress.of(input)
const value = email.fold(
  () => "", // Default value
  (e) => e, // e IS already a string!
)
```

### Type-safe functions

Function signatures don't change, but implementation is cleaner:

**Before:**

```typescript
function processUser(userId: Brand<"UserId", string>) {
  const id = userId.unbrand()
  return db.query(`SELECT * FROM users WHERE id = '${id}'`)
}
```

**After:**

```typescript
function processUser(userId: Brand<"UserId", string>) {
  return db.query(`SELECT * FROM users WHERE id = '${userId}'`)
}
```

## Benefits After Migration

1. **Better Performance**: No object allocation overhead
2. **Cleaner Code**: No more `.unbrand()` calls everywhere
3. **Natural JavaScript**: String interpolation, JSON serialization work directly
4. **Smaller Bundles**: Less code to ship
5. **Better Debugging**: Values show as primitives in debugger

## Compatibility

### If you need the old behavior

The `unbrand` utility function still exists for compatibility:

```typescript
import { unbrand } from "@/branded"

const userId = Brand("UserId", "user-123")
const plain = unbrand(userId) // Works but unnecessary
```

ValidatedBrand also provides an `unwrap` method:

```typescript
const email = EmailAddress.unsafeOf("user@example.com")
const plain = EmailAddress.unwrap(email) // Works but unnecessary
```

## Quick Reference

| Old Code                             | New Code                    |
| ------------------------------------ | --------------------------- |
| `value.unbrand()`                    | `value`                     |
| `value.unwrap()`                     | `value`                     |
| `value.toString()`                   | `value` or `String(value)`  |
| `typeof value === "object"`          | `typeof value === "string"` |
| `${value.unbrand()}`                 | `${value}`                  |
| `JSON.stringify({id: id.unbrand()})` | `JSON.stringify({id})`      |

## Testing

Update your tests to expect primitives:

**Before:**

```typescript
expect(typeof userId).toBe("object")
expect(userId.unbrand()).toBe("user-123")
```

**After:**

```typescript
expect(typeof userId).toBe("string")
expect(userId).toBe("user-123")
```

## Summary

The migration is mostly about **removing code**. Branded values now work exactly like their underlying primitive types, making the code cleaner and more performant. The type safety remains unchanged - you still get full compile-time protection against mixing different branded types.
