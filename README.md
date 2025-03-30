# Functype

![NPM Version](https://img.shields.io/npm/v/functype?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Ffunctype)
[![Node.js Build](https://github.com/jordanburke/functype/actions/workflows/pnpm-build.yml/badge.svg)](https://github.com/jordanburke/functype/actions/workflows/pnpm-build.yml)

## A Functional Programming Library for TypeScript

Functype is a lightweight functional programming library for TypeScript, drawing inspiration from functional programming paradigms, the Scala Standard Library, and ZIO. It provides a comprehensive set of utilities and abstractions designed to facilitate functional programming within TypeScript applications.

[API Documentation](https://jordanburke.github.io/functype/)

## Core Principles

- **Immutability**: All data structures are immutable, promoting predictable and side-effect-free code
- **Type Safety**: Leverages TypeScript's type system to ensure compile-time safety
- **Composability**: Provides abstractions for building complex programs from simple components
- **Functional Paradigms**: Embraces concepts like monads, functors, and type classes

## Key Features

- **Option Type**: Handle nullable values with `Some` and `None` types
- **Either Type**: Express computation results with potential failures using `Left` and `Right`
- **List, Set, Map**: Immutable collection types with functional operators
- **Try Type**: Safely execute operations that might throw exceptions
- **Task**: Handle synchronous and asynchronous operations with error handling
- **Tuple**: Type-safe fixed-length arrays
- **Typeable**: Runtime type identification with compile-time safety

## Roadmap / TODO

### Missing Functionality

- [ ] Add lazy evaluation structures (LazyList/Stream)
- [ ] Implement Validation type for applicative validation
- [ ] Add Reader/State/IO monads for more functional patterns
- [ ] Implement lens/optics for immutable updates
- [ ] Expand concurrent execution utilities beyond FPromise.all

### Performance Optimizations

- [ ] Add memoization utilities
- [ ] Improve recursive operations for large collections
- [ ] Implement immutable data structures with structural sharing
- [ ] Add performance benchmarks
- [x] Optimize TreeShaking with sideEffects flag in package.json

### API Consistency

- [ ] Ensure all modules follow the Scala-inspired pattern:
  - Constructor functions that return objects with methods
  - Object methods for common operations
  - Companion functions for additional utilities
- [x] Align Task API with other monadic structures
- [ ] Standardize import patterns (@ imports vs relative paths)
- [x] Implement consistent error handling strategy for async operations

### Testing and Documentation

- [ ] Add observable test coverage metrics
- [x] Implement property-based testing
- [ ] Expand error handling tests
- [ ] Add interoperability tests with other libraries

### TypeScript Improvements

- [x] Enable stricter TypeScript settings (noImplicitAny: true)
- [x] Add noUncheckedIndexedAccess for safer array indexing
- [ ] Improve support for higher-kinded types:
  - Current type parameters work well for first-order types
  - Expand to support type constructors as parameters (F<A> => F<B>)
- [ ] Add branded/nominal types for stronger type safety
- [ ] Implement more type-level utilities (conditional types, template literals)
- [ ] Leverage newer TypeScript features (const type parameters, tuple manipulation)

## Installation

```bash
# NPM
npm install functype

# Yarn
yarn add functype

# PNPM
pnpm add functype

# Bun
bun add functype
```

## Usage Examples

### Option

```typescript
import { Option, Some, None } from "functype"

// Create options
const value = Option("hello") // Some("hello")
const empty = Option(null) // None
const explicit = Some(42) // Some(42)

// Transform values
const length = value.map((s) => s.length) // Some(5)
const nothing = empty.map((s) => s.length) // None

// Handle default values
const result = value.getOrElse("world") // "hello"
const fallback = empty.getOrElse("world") // "world"

// Conditionally filter
const filtered = value.filter((s) => s.length > 10) // None
```

### Either

```typescript
import { Either, Right, Left } from "functype"

// Success case
const success = Right<string, number>(42)
// Error case
const failure = Left<string, number>("error")

// Transform values (map only applies to Right)
const doubled = success.map((x) => x * 2) // Right(84)
const stillError = failure.map((x) => x * 2) // Left("error")

// Handle errors
const value = success.getOrElse(0) // 42
const fallback = failure.getOrElse(0) // 0

// Pattern matching with fold
const result = success.fold(
  (err) => `Error: ${err}`,
  (val) => `Success: ${val}`,
) // "Success: 42"
```

### List

```typescript
import { List } from "functype"

const numbers = List([1, 2, 3, 4])

// Transform
const doubled = numbers.map((x) => x * 2) // List([2, 4, 6, 8])

// Filter
const evens = numbers.filter((x) => x % 2 === 0) // List([2, 4])

// Reduce
const sum = numbers.foldLeft(0)((acc, x) => acc + x) // 10

// Add/remove elements (immutably)
const withFive = numbers.add(5) // List([1, 2, 3, 4, 5])
const without3 = numbers.remove(3) // List([1, 2, 4])
```

### Try

```typescript
import { Try } from "functype"

// Safely execute code that might throw
const result = Try(() => {
  // Potentially throwing operation
  return JSON.parse('{"name": "John"}')
})

// Handle success/failure
if (result.isSuccess()) {
  console.log("Result:", result.get())
} else {
  console.error("Error:", result.error)
}

// Transform with map (only applies on Success)
const name = result.map((obj) => obj.name)

// Convert to Either
const either = result.toEither()
```

### Task

```typescript
import { Task } from "functype"

// Synchronous operations with error handling
const syncResult = Task().Sync(
  () => "success",
  (error) => new Error(`Failed: ${error}`),
)

// Asynchronous operations
const asyncTask = async () => {
  const result = await Task().Async(
    async () => await fetchData(),
    async (error) => new Error(`Fetch failed: ${error}`),
  )
  return result
}

// Converting promise-based functions to Task
const fetchUserAPI = (userId: string): Promise<User> => fetch(`/api/users/${userId}`).then((r) => r.json())

// Use the adapter pattern for seamless integration
const fetchUser = Task({ name: "UserFetch" }).fromPromise(fetchUserAPI)

// Later use it with standard promise patterns
fetchUser("user123")
  .then((user) => console.log(user))
  .catch((error) => console.error(error))

// Or convert Task results back to promises
const taskResult = Task().Sync(() => "hello world")
const promise = Task().toPromise(taskResult) // Promise<string>
```

## Type Safety

Functype leverages TypeScript's advanced type system to provide compile-time safety for functional patterns, ensuring that your code is both robust and maintainable.

```typescript
// Type inference works seamlessly
const option = Option(42)
// Inferred as number
const mappedValue = option.map((x) => x.toString())
// Inferred as string
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

Copyright (c) 2025 Jordan Burke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
