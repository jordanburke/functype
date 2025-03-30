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

// Create branded values
const userId = Brand("UserId", "user-123") as UserId
const productId = Brand("ProductId", "product-456") as ProductId
const quantity = Brand("Quantity", 5) as Quantity
const price = Brand("Price", 99.99) as Price

// Function that only accepts UserId
function getUserById(id: UserId): string {
  return `User: ${id}`
}

// This works
getUserById(userId)

// These would cause TypeScript errors
// getUserById(productId);
// getUserById("user-789");
```

### Using Branded Type Factories

```typescript
import { BrandedString, BrandedNumber } from "@/branded"

// Create brand factories
const createUserId = BrandedString("UserId")
const createPrice = BrandedNumber("Price")

// Create branded values using the factories
const userId = createUserId("user-123")
const price = createPrice(99.99)

// You can use the values just like their base types
console.log(userId.toUpperCase()) // "USER-123"
console.log(price * 2) // 199.98
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

### Removing Brands

```typescript
import { unbrand } from "@/branded"

type UserId = Brand<"UserId", string>
const userId = Brand("UserId", "user-123") as UserId

// Remove the brand when needed
const rawId = unbrand(userId) // Type is string
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

## Implementation Details

Branded types in TypeScript are "phantom types" - they only exist at compile time and have no runtime representation. The `__brand` property used in the type definition doesn't actually exist on the values. This means that while branded types provide excellent compile-time type safety, they don't offer runtime type checking.

The `hasBrand` function provided in this module can only check for the existence of a value (non-null and non-undefined) but cannot actually verify the brand at runtime.
