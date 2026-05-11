# Branded Types

Branded types provide a way to create nominal typing in TypeScript, which is otherwise a structurally typed language. This allows you to create types that are structurally identical but treated as distinct by the type system.

## What are Branded Types?

In TypeScript, two types with the same structure are considered compatible, which is called "structural typing". This can sometimes be problematic when you want to distinguish between types that have the same structure but represent different concepts.

For example, without branded types:

```typescript
type UserId = string
type ProductId = string

function getUserById(id: UserId) {
  /* ... */
}

// This would be allowed even though semantically incorrect
const productId: ProductId = "product-123"
getUserById(productId) // TypeScript allows this!
```

Branded types solve this by adding a "brand" to the type using TypeScript's intersection types:

```typescript
type UserId = Brand<"UserId", string>
type ProductId = Brand<"ProductId", string>

function getUserById(id: UserId) {
  /* ... */
}

// Now this won't work:
const productId = Brand("ProductId", "product-123")
getUserById(productId) // TypeScript Error!
```

## Usage

### Basic Usage

```typescript
import { Brand } from "@/branded"

// Define your branded types
type UserId = Brand<"UserId", string>
type ProductId = Brand<"ProductId", string>
type Quantity = Brand<"Quantity", number>
type Price = Brand<"Price", number>

// Create branded values (they ARE the primitive values!)
const userId = Brand("UserId", "user-123") as UserId
const productId = Brand("ProductId", "product-456") as ProductId
const quantity = Brand("Quantity", 5) as Quantity
const price = Brand("Price", 99.99) as Price

// Branded values ARE primitives - use them directly!
console.log(userId) // "user-123"
console.log(typeof userId) // "string"
console.log(userId.toUpperCase()) // "USER-123" - string methods work!
console.log(price + 10) // 109.99 - numeric operations work!

// Function that only accepts UserId
function getUserById(id: UserId): string {
  return `User: ${id}` // id IS a string, use directly!
}

// This works
getUserById(userId)

// These would cause TypeScript errors
// getUserById(productId);
// getUserById("user-789");
```

### Using Branded Type Factories

```typescript
import { BrandedString, BrandedNumber, BrandedBoolean } from "@/branded"

// Create brand factories
const createUserId = BrandedString("UserId")
const createPrice = BrandedNumber("Price")
const createIsActive = BrandedBoolean("IsActive")

// Create branded values using the factories
const userId = createUserId("user-123")
const price = createPrice(99.99)
const isActive = createIsActive(true)

// Branded values ARE primitives - all operations work directly!
console.log(userId.toUpperCase()) // "USER-123"
console.log(price * 2) // 199.98
console.log(isActive && true) // true

// Standard toString() works as expected
console.log(userId.toString()) // "user-123"
console.log(price.toString()) // "99.99"
console.log(String(isActive)) // "true"
```

### Creating Custom Branders

```typescript
import { createBrander } from "@/branded"

type UserId = Brand<"UserId", string>

// Create a custom brander
const UserIdBrander = createBrander<"UserId", string>("UserId")

// Use the brander to create branded values
const userId = UserIdBrander("user-123")
```

### Working with Branded Values

```typescript
import { unbrand } from "@/branded"

type UserId = Brand<"UserId", string>
const userId = Brand("UserId", "user-123") as UserId

// Branded values ARE their primitive types!
console.log(userId) // "user-123"
console.log(typeof userId) // "string"

// Use directly in any context expecting a string
const uppercased = userId.toUpperCase() // "USER-123"
const interpolated = `ID: ${userId}` // "ID: user-123"
const length = userId.length // 8

// The unbrand utility function exists for compatibility
const rawId = unbrand(userId) // Type is string
// But it's rarely needed since userId IS already a string!
```

### Type Utilities

```typescript
import { Brand, Unbrand, ExtractBrand } from "@/branded"

type UserId = Brand<"UserId", string>

// Get the underlying type without the brand
type RawUserId = Unbrand<UserId> // string

// Get the brand identifier
type UserIdBrand = ExtractBrand<UserId> // "UserId"
```

## ValidatedBrand

For cases where you need **runtime validation** in addition to compile-time safety, use `ValidatedBrand`:

### Basic ValidatedBrand Usage

```typescript
import { ValidatedBrand } from "@/branded"

// Create a validated brand with runtime constraints
const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))
const PositiveNumber = ValidatedBrand("PositiveNumber", (n: number) => n > 0)

// Safe creation with Option return type
const email = Email.of("user@example.com") // Some(Brand<"Email", string>)
const invalid = Email.of("not-an-email") // None

// Safe creation with Either return type for error details
const result = Email.from("user@example.com") // Right(Brand<"Email", string>)
const error = Email.from("invalid") // Left("Invalid Email: validation failed")

// Unsafe creation (throws on invalid input)
const validEmail = Email.unsafeOf("user@example.com") // Brand<"Email", string>
// Email.unsafeOf("invalid")  // throws Error

// Type guard
if (Email.is(someValue)) {
  // someValue is Brand<"Email", string>
}
```

### Pre-built Validators

```typescript
import {
  PositiveNumber,
  NonEmptyString,
  EmailAddress,
  UUID,
  BoundedNumber,
  BoundedString,
  PatternString,
} from "@/branded"

// Use pre-built validators
const age = PositiveNumber.of(25) // Some(Brand<"PositiveNumber", number>)
const name = NonEmptyString.of("John") // Some(Brand<"NonEmptyString", string>)
const email = EmailAddress.of("user@example.com") // Some(Brand<"EmailAddress", string>)
const id = UUID.of("123e4567-e89b-12d3-a456-426614174000") // Some(Brand<"UUID", string>)

// Create custom bounded validators
const Percentage = BoundedNumber("Percentage", 0, 100)
const Username = BoundedString("Username", 3, 20)
const HexColor = PatternString("HexColor", /^#[0-9a-f]{6}$/i)

const percent = Percentage.of(75) // Some(Brand<"Percentage", number>)
const user = Username.of("johndoe") // Some(Brand<"Username", string>)
const color = HexColor.of("#ff0000") // Some(Brand<"HexColor", string>)
```

### Refining Validators

```typescript
// Build more specific validators from existing ones
const SmallPositiveInteger = PositiveNumber.refine("SmallPositiveInteger", (n) => {
  // n IS already a number (phantom type)
  return n < 100 && Number.isInteger(n)
})

const result = SmallPositiveInteger.of(PositiveNumber.unsafeOf(50)) // Some(refined brand)
```

### Working with ValidatedBrand Values

ValidatedBrand creates phantom-typed primitives:

```typescript
const email = EmailAddress.of("user@example.com")
if (!email.isEmpty) {
  const branded = email.get()
  console.log(branded) // "user@example.com" - it IS a string
  console.log(typeof branded) // "string"
  console.log(branded.includes("@")) // true - string methods work!

  // Use the ValidatedBrand.unwrap method if needed
  const plain = EmailAddress.unwrap(branded) // "user@example.com"
}
```

## Implementation Details

### Brand Types (True Phantom Types)

Branded types are now **true phantom types** - they exist only at compile-time:

- **Zero Runtime Overhead**: Branded values ARE their primitive types
- **Phantom Brand**: The `__brand` property exists only in TypeScript's type system
- **Direct Usage**: No unwrapping needed - use branded values anywhere primitives are expected
- **Type Safety**: Full compile-time type checking prevents mixing different brands

### Why Phantom Types?

```typescript
const userId = Brand("UserId", "user-123")

// At compile time: userId has type Brand<"UserId", string>
// At runtime: userId IS the string "user-123"

console.log(typeof userId) // "string"
console.log(userId === "user-123") // true
```

This approach provides:

- **Better Performance**: No object allocation or wrapper overhead
- **Seamless Integration**: Works with all JavaScript APIs expecting primitives
- **Natural Behavior**: String interpolation, JSON serialization, equality checks all "just work"

### ValidatedBrand Types

ValidatedBrand provides **runtime validation** with phantom types:

- **Validation Function**: Custom predicate functions enforce constraints at runtime
- **Safe Creation**: Methods return `Option` or `Either` types for error handling
- **Type Guards**: Runtime type checking with `is()` method
- **Refinement**: Build more specific validators from existing ones
- **Phantom Results**: Validated values are still primitives, not objects

### Working with External APIs

Since branded values ARE primitives, they work seamlessly with external code:

```typescript
const tenantId = TenantId.unsafeOf("tenant-123")
const projectId = ProjectId.unsafeOf("proj-456")

// Direct usage with external APIs
await api.request({
  tenantId, // No unwrap needed!
  projectId, // It's already a string!
})

// JSON serialization works naturally
JSON.stringify({ tenantId, projectId })
// {"tenantId":"tenant-123","projectId":"proj-456"}
```
