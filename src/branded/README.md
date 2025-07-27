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

// Create branded values (now with instance methods!)
const userId = Brand("UserId", "user-123") as UserId
const productId = Brand("ProductId", "product-456") as ProductId
const quantity = Brand("Quantity", 5) as Quantity
const price = Brand("Price", 99.99) as Price

// Access the original values using instance methods
console.log(userId.unbrand())        // "user-123"
console.log(userId.unwrap())         // "user-123" (alias)
console.log(userId.toString())       // "UserId(user-123)"

// Function that only accepts UserId
function getUserById(id: UserId): string {
  return `User: ${id.unbrand()}`  // Use unbrand() to get the string
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

// Access original values with instance methods
console.log(userId.unbrand().toUpperCase()) // "USER-123"
console.log(price.unbrand() * 2)            // 199.98
console.log(isActive.unbrand() && true)     // true

// Enhanced string representation
console.log(userId.toString())    // "UserId(user-123)"
console.log(price.toString())     // "Price(99.99)"
console.log(isActive.toString())  // "IsActive(true)"
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

// Three ways to remove the brand:

// 1. Instance method (recommended)
const rawId1 = userId.unbrand()  // Type is string
const rawId2 = userId.unwrap()   // Type is string (alias)

// 2. Utility function (backward compatibility)
const rawId3 = unbrand(userId)   // Type is string

console.log(rawId1, rawId2, rawId3) // All output: "user-123"
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
const email = Email.of("user@example.com")     // Some(Brand<"Email", string>)
const invalid = Email.of("not-an-email")       // None

// Safe creation with Either return type for error details
const result = Email.from("user@example.com")  // Right(Brand<"Email", string>)
const error = Email.from("invalid")            // Left("Invalid Email: validation failed")

// Unsafe creation (throws on invalid input)
const validEmail = Email.unsafeOf("user@example.com")  // Brand<"Email", string>
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
  PatternString 
} from "@/branded"

// Use pre-built validators
const age = PositiveNumber.of(25)                    // Some(Brand<"PositiveNumber", number>)
const name = NonEmptyString.of("John")               // Some(Brand<"NonEmptyString", string>)
const email = EmailAddress.of("user@example.com")   // Some(Brand<"EmailAddress", string>)
const id = UUID.of("123e4567-e89b-12d3-a456-426614174000")  // Some(Brand<"UUID", string>)

// Create custom bounded validators
const Percentage = BoundedNumber("Percentage", 0, 100)
const Username = BoundedString("Username", 3, 20)
const HexColor = PatternString("HexColor", /^#[0-9a-f]{6}$/i)

const percent = Percentage.of(75)     // Some(Brand<"Percentage", number>)
const user = Username.of("johndoe")   // Some(Brand<"Username", string>)
const color = HexColor.of("#ff0000")  // Some(Brand<"HexColor", string>)
```

### Refining Validators

```typescript
// Build more specific validators from existing ones
const SmallPositiveInteger = PositiveNumber.refine("SmallPositiveInteger", (n) => {
  const num = n.unbrand()  // Get the actual number
  return num < 100 && Number.isInteger(num)
})

const result = SmallPositiveInteger.of(PositiveNumber.unsafeOf(50))  // Some(refined brand)
```

### ValidatedBrand with Instance Methods

All ValidatedBrand instances create enhanced Brand objects with instance methods:

```typescript
const email = EmailAddress.of("user@example.com")
if (!email.isEmpty) {
  const branded = email.get()
  console.log(branded.unbrand())     // "user@example.com"
  console.log(branded.unwrap())      // "user@example.com"  
  console.log(branded.toString())    // "EmailAddress(user@example.com)"
}
```

## Implementation Details

### Brand Types (Enhanced)

Branded types now include **instance methods** while maintaining their phantom type nature:

- **Phantom Brand**: The `__brand` property exists only at compile-time for type safety
- **Instance Methods**: `unbrand()`, `unwrap()`, and `toString()` are added at runtime  
- **Object Structure**: Brand objects are enhanced primitive values with attached methods
- **Performance**: Minimal runtime overhead for significant developer experience improvement

### ValidatedBrand Types

ValidatedBrand provides **runtime validation** on top of Brand's compile-time safety:

- **Validation Function**: Custom predicate functions enforce constraints at runtime
- **Safe Creation**: Methods return `Option` or `Either` types for error handling
- **Type Guards**: Runtime type checking with `is()` method
- **Refinement**: Build more specific validators from existing ones

### Migration from Phantom Types

The enhanced Brand implementation maintains backward compatibility:

```typescript
// Old way (still works)
const rawValue = unbrand(brandedValue)

// New way (recommended)  
const rawValue = brandedValue.unbrand()
```

Both approaches work, but instance methods provide better IDE support and discoverability.
