# Companion Pattern in Functype

The Companion pattern is a core architectural pattern in functype, inspired by Scala's companion objects. It provides a clean way to combine constructor functions with static utility methods, creating a unified API that feels both functional and object-oriented.

## Why Companion Over Classes?

Functype uses the Companion pattern instead of classes for several reasons:

1. **Functional Programming Alignment**: Constructor functions are just functions, making them easier to compose and pass around
2. **Immutability by Default**: Objects created by constructors don't inherit mutable prototype chains
3. **Tree-Shaking**: Better tree-shaking in modern bundlers since everything is explicit
4. **Type Safety**: TypeScript can better infer types without class complexity
5. **Smaller Bundle Size**: No class overhead or prototype chains

## The Pattern

### Basic Structure

Every Companion-based type follows this pattern:

```typescript
// 1. Define the type interface
interface MyType<T> {
  value: T
  map: <U>(f: (v: T) => U) => MyType<U>
  toString: () => string
}

// 2. Create constructor function
const MyTypeConstructor = <T>(value: T): MyType<T> => ({
  value,
  map: <U>(f: (v: T) => U) => MyTypeConstructor(f(value)),
  toString: () => `MyType(${value})`,
})

// 3. Create companion object with static methods
const MyTypeCompanion = {
  of: <T>(value: T) => MyTypeConstructor(value),
  empty: <T>() => MyTypeConstructor(null as T),
  fromArray: <T>(arr: T[]) => MyTypeConstructor(arr[0]),
}

// 4. Combine using Companion utility
export const MyType = Companion(MyTypeConstructor, MyTypeCompanion)
```

### Usage

The combined `MyType` can be used in two ways:

```typescript
import { MyType } from "functype"

// As a constructor function
const instance1 = MyType(42)

// Using companion methods
const instance2 = MyType.of(42)
const empty = MyType.empty<number>()
const fromArr = MyType.fromArray([1, 2, 3])

// Instance methods
instance1.map((x) => x * 2) // MyType(84)
instance1.toString() // "MyType(42)"
```

## Real-World Examples

### Option

```typescript
// Constructor: wraps nullable values
const someValue = Option(42) // Some(42)
const noneValue = Option(null) // None

// Companion methods
const explicit = Option.from(42) // Same as Option(42)
const none = Option.none<number>() // Explicitly create None

// Type guards
if (Option.isSome(someValue)) {
  console.log(someValue.value) // TypeScript knows value is defined
}
```

### Either

```typescript
// Constructor: create Left or Right
const right = Either(value, true) // Right(value)
const left = Either(error, false) // Left(error)

// Companion methods (preferred)
const success = Either.right<Error, number>(42)
const failure = Either.left<Error, number>(new Error("oops"))

// Utility methods
Either.fromNullable(maybeValue, "default")
Either.fromPredicate(value, (v) => v > 0, "negative")
Either.sequence([right1, right2, right3])
```

### List

```typescript
// Constructor: from iterable
const list = List([1, 2, 3])

// Companion methods
const fromJSON = List.fromJSON<number>('{"_tag":"List","value":[1,2,3]}')
const fromYAML = List.fromYAML<number>("_tag: List\nvalue: [1,2,3]")

// Instance methods
list.map((x) => x * 2) // List([2, 4, 6])
list.filter((x) => x > 1) // List([2, 3])
```

## Scala Inspiration

In Scala, you can have a class and a companion object with the same name:

```scala
// Scala
class Option[T](value: T) {
  def map[U](f: T => U): Option[U] = ...
}

object Option {
  def apply[T](value: T): Option[T] = new Option(value)
  def empty[T]: Option[T] = new Option(null)
}
```

Functype adapts this to TypeScript:

```typescript
// TypeScript with Companion
const OptionConstructor = <T>(value: T) => ({...})
const OptionCompanion = {
  from: <T>(value: T) => Option(value),
  none: <T>() => None<T>(),
}
export const Option = Companion(OptionConstructor, OptionCompanion)
```

## Creating Your Own Companion Types

Here's a complete example of creating a custom Companion type:

```typescript
import { Companion } from "functype"

// 1. Define the interface
interface Box<T> {
  readonly value: T
  map: <U>(f: (value: T) => U) => Box<U>
  flatMap: <U>(f: (value: T) => Box<U>) => Box<U>
  get: () => T
  toString: () => string
}

// 2. Constructor function
const BoxConstructor = <T>(value: T): Box<T> => ({
  value,
  map: <U>(f: (value: T) => U): Box<U> => BoxConstructor(f(value)),
  flatMap: <U>(f: (value: T) => Box<U>): Box<U> => f(value),
  get: () => value,
  toString: () => `Box(${value})`,
})

// 3. Companion object
const BoxCompanion = {
  of: <T>(value: T) => BoxConstructor(value),
  pure: <T>(value: T) => BoxConstructor(value), // Alias
  empty: <T>() => BoxConstructor(undefined as T),
}

// 4. Export the combined Companion
export const Box = Companion(BoxConstructor, BoxCompanion)

// Usage
const box1 = Box(10) // Constructor
const box2 = Box.of(20) // Companion method
const box3 = Box.pure(30) // Another companion method

box1.map((x) => x * 2).get() // 20
```

## Advanced Patterns

### Type Guards in Companion

Type guards are great companion methods:

```typescript
const MyTypeCompanion = {
  // ... other methods

  isSuccess: <T>(myType: MyType<T>): myType is MyType<T> & { success: true } => myType.isSuccess(),

  isFailure: <T>(myType: MyType<T>): myType is MyType<T> & { success: false } => !myType.isSuccess(),
}
```

### Serialization Methods

Common pattern for serializable types:

```typescript
import { createSerializer } from "functype/serialization"

const MyTypeCompanion = {
  // Creation methods
  of: <T>(value: T) => MyTypeConstructor(value),

  // Serialization methods
  fromJSON: <T>(json: string): MyType<T> => {
    const parsed = JSON.parse(json)
    return MyTypeConstructor(parsed.value)
  },

  fromYAML: <T>(yaml: string): MyType<T> => {
    // Parse YAML and reconstruct
    // ...
  },

  fromBinary: <T>(binary: string): MyType<T> => {
    const json = Buffer.from(binary, "base64").toString()
    return MyTypeCompanion.fromJSON(json)
  },
}

// Instance methods use createSerializer helper
const instance = {
  // ... other methods
  serialize: () => createSerializer("MyType", value),
}
```

## Helper Types

Functype provides helper types for working with Companion objects:

```typescript
import { type CompanionMethods, type InstanceType, isCompanion } from "functype/companion"

// Extract companion methods type
type OptionMethods = CompanionMethods<typeof Option>
// { from: ..., none: ..., isSome: ..., isNone: ..., fromJSON: ..., etc. }

// Extract instance type
type OptionInst = InstanceType<typeof Option>
// Option<unknown>

// Runtime type guard
if (isCompanion(Option)) {
  console.log("Option is a Companion object")
}
```

## Best Practices

1. **Naming**: Use PascalCase for the exported Companion (e.g., `Option`, `Either`, `List`)
2. **Constructor Naming**: Use `XConstructor` internally (e.g., `OptionConstructor`)
3. **Companion Naming**: Use `XCompanion` for the companion object (e.g., `OptionCompanion`)
4. **Consistency**: Always follow the same pattern across your codebase
5. **Documentation**: Add JSDoc to both constructor and companion methods
6. **Type Guards**: Add static type guards to companion objects where useful
7. **Immutability**: Ensure all operations return new instances

## Common Companion Methods

Here are standard methods to consider for your Companion objects:

### Creation

- `of(value)` - Basic constructor wrapper
- `from(value)` - Alias for constructor or conversion
- `empty()` - Create empty instance
- `pure(value)` - Monadic pure/return

### Type Guards

- `isSome(option)` - Type guard for Some
- `isNone(option)` - Type guard for None
- `isRight(either)` - Type guard for Right
- `isLeft(either)` - Type guard for Left

### Serialization

- `fromJSON(json)` - Deserialize from JSON
- `fromYAML(yaml)` - Deserialize from YAML
- `fromBinary(binary)` - Deserialize from base64

### Conversions

- `fromNullable(value, default)` - Handle nullable values
- `fromPredicate(value, pred, default)` - Conditional construction
- `fromArray(arr)` - Convert from array
- `fromPromise(promise)` - Convert from Promise

### Combinators

- `sequence(arr)` - Combine array of wrapped values
- `traverse(arr, f)` - Map then sequence
- `ap(fn, value)` - Applicative apply

## Comparison with Other Patterns

### vs Classes

```typescript
// Class approach
class Option<T> {
  constructor(private value: T | null) {}
  static of<T>(value: T) { return new Option(value) }
  static none<T>() { return new Option<T>(null) }
  map<U>(f: (v: T) => U) { ... }
}

// Companion approach
const Option = Companion(OptionConstructor, OptionCompanion)

// Differences:
// - No prototype chain
// - Better tree-shaking
// - More functional style
// - Easier composition
```

### vs Namespace Objects

```typescript
// Namespace object (old Either approach)
export const Either = {
  left: <L, R>(value: L) => Left(value),
  right: <L, R>(value: R) => Right(value),
  // All methods here
}

// Companion approach (new Either)
export const Either = Companion(EitherConstructor, EitherCompanion)

// Advantages of Companion:
// - Can use Either() as constructor
// - Consistent with other types
// - Better type inference
```

## Conclusion

The Companion pattern provides a clean, functional way to organize TypeScript code that needs both instance and static methods. It combines the best of functional and object-oriented programming while staying true to functional principles.

For more examples, see the source code for Option, Either, Try, List, and other core types in functype.
