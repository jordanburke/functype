# JavaScript/TypeScript to Functype Pattern Guide

This guide shows common JavaScript/TypeScript patterns and their functype equivalents. Each pattern includes a "before" example using traditional JavaScript/TypeScript and an "after" example using functype.

## Table of Contents

- [Null/Undefined Handling](#nullundefined-handling)
- [Error Handling](#error-handling)
- [Array Operations](#array-operations)
- [Conditional Logic](#conditional-logic)
- [Async Operations](#async-operations)
- [Object/Map Operations](#objectmap-operations)
- [Type Validation](#type-validation)
- [Data Transformation Pipelines](#data-transformation-pipelines)
- [State Management](#state-management)
- [Common Anti-Patterns](#common-anti-patterns)

## Null/Undefined Handling

### Null Checks

**❌ JavaScript Pattern:**

```typescript
function getUserName(user: User | null | undefined): string {
  if (user && user.profile && user.profile.name) {
    return user.profile.name.toUpperCase()
  }
  return "Anonymous"
}
```

**✅ Functype Pattern:**

```typescript
function getUserName(user: User | null | undefined): string {
  return Option(user)
    .flatMap((u) => Option(u.profile))
    .flatMap((p) => Option(p.name))
    .map((name) => name.toUpperCase())
    .orElse("Anonymous")
}
```

### Optional Chaining Alternative

**❌ JavaScript Pattern:**

```typescript
const city = user?.address?.city ?? "Unknown"
const zipCode = user?.address?.zipCode
if (zipCode) {
  console.log(`Zip: ${zipCode}`)
}
```

**✅ Functype Pattern:**

```typescript
const city = Option(user)
  .flatMap((u) => Option(u.address))
  .flatMap((a) => Option(a.city))
  .orElse("Unknown")

Option(user)
  .flatMap((u) => Option(u.address))
  .flatMap((a) => Option(a.zipCode))
  .fold(
    () => {}, // Do nothing if no zip code
    (zipCode) => console.log(`Zip: ${zipCode}`),
  )
```

### Default Values

**❌ JavaScript Pattern:**

```typescript
function getConfig(config?: Partial<Config>): Config {
  return {
    host: config?.host || "localhost",
    port: config?.port || 8080,
    debug: config?.debug ?? false,
  }
}
```

**✅ Functype Pattern:**

```typescript
function getConfig(config?: Partial<Config>): Config {
  const configOpt = Option(config)
  return {
    host: configOpt.flatMap((c) => Option(c.host)).orElse("localhost"),
    port: configOpt.flatMap((c) => Option(c.port)).orElse(8080),
    debug: configOpt.flatMap((c) => Option(c.debug)).orElse(false),
  }
}
```

## Error Handling

### Try-Catch Blocks

**❌ JavaScript Pattern:**

```typescript
function parseJSON(jsonString: string): { data?: any; error?: string } {
  try {
    const data = JSON.parse(jsonString)
    return { data }
  } catch (error) {
    return { error: error.message }
  }
}

// Usage
const result = parseJSON(input)
if (result.error) {
  console.error("Parse failed:", result.error)
} else {
  console.log("Data:", result.data)
}
```

**✅ Functype Pattern:**

```typescript
function parseJSON(jsonString: string): Try<any> {
  return Try(() => JSON.parse(jsonString))
}

// Usage
parseJSON(input).fold(
  (error) => console.error("Parse failed:", error.message),
  (data) => console.log("Data:", data),
)
```

### Multiple Error Handling

**❌ JavaScript Pattern:**

```typescript
function processUser(userId: string): { user?: User; error?: string } {
  if (!userId) {
    return { error: "User ID is required" }
  }

  const user = findUserById(userId)
  if (!user) {
    return { error: "User not found" }
  }

  if (!user.isActive) {
    return { error: "User is not active" }
  }

  return { user }
}
```

**✅ Functype Pattern:**

```typescript
function processUser(userId: string): Either<string, User> {
  return Either.fromNullable(userId, "User ID is required")
    .flatMap((id) => Either.fromNullable(findUserById(id), "User not found"))
    .flatMap((user) => (user.isActive ? Either.right(user) : Either.left("User is not active")))
}
```

### Async Error Handling

**❌ JavaScript Pattern:**

```typescript
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${userId}`)
    if (!response.ok) {
      console.error(`HTTP error: ${response.status}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.error("Fetch failed:", error)
    return null
  }
}
```

**✅ Functype Pattern:**

```typescript
function fetchUserData(userId: string): Task<User, Error> {
  return Task.tryCatchAsync(
    async () => {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      return response.json()
    },
    (error) => new Error(`Fetch failed: ${error}`),
  )
}

// Usage
fetchUserData(userId).fold(
  (error) => console.error(error.message),
  (user) => console.log("User:", user),
)
```

## Array Operations

### Filtering and Mapping

**❌ JavaScript Pattern:**

```typescript
function getActiveUserNames(users: User[]): string[] {
  const activeUsers = users.filter((user) => user.isActive)
  const names = activeUsers.map((user) => user.name.toUpperCase())
  return names
}
```

**✅ Functype Pattern:**

```typescript
function getActiveUserNames(users: User[]): List<string> {
  return List(users)
    .filter((user) => user.isActive)
    .map((user) => user.name.toUpperCase())
}
```

### Safe Array Access

**❌ JavaScript Pattern:**

```typescript
function getFirstActiveUser(users: User[]): User | undefined {
  return users.find((user) => user.isActive)
}

function getThirdUser(users: User[]): User | null {
  return users.length > 2 ? users[2] : null
}
```

**✅ Functype Pattern:**

```typescript
function getFirstActiveUser(users: User[]): Option<User> {
  return List(users).find((user) => user.isActive)
}

function getThirdUser(users: User[]): Option<User> {
  return List(users).get(2) // Returns Option<User>
}
```

### Array Aggregation

**❌ JavaScript Pattern:**

```typescript
function calculateTotal(items: Item[]): number {
  let total = 0
  for (const item of items) {
    if (item.price && item.quantity) {
      total += item.price * item.quantity
    }
  }
  return total
}
```

**✅ Functype Pattern:**

```typescript
function calculateTotal(items: Item[]): number {
  return List(items)
    .filter((item) => item.price && item.quantity)
    .map((item) => item.price * item.quantity)
    .foldLeft(0)((total, amount) => total + amount)
}
```

### Unique Values

**❌ JavaScript Pattern:**

```typescript
function getUniqueCategories(products: Product[]): string[] {
  const categories = new Set<string>()
  for (const product of products) {
    if (product.category) {
      categories.add(product.category)
    }
  }
  return Array.from(categories)
}
```

**✅ Functype Pattern:**

```typescript
function getUniqueCategories(products: Product[]): Set<string> {
  return List(products)
    .flatMap((product) => Option(product.category).toList())
    .toSet()
}
```

## Conditional Logic

### If-Else Chains

**❌ JavaScript Pattern:**

```typescript
function getStatusMessage(status: number): string {
  if (status >= 200 && status < 300) {
    return "Success"
  } else if (status >= 300 && status < 400) {
    return "Redirect"
  } else if (status >= 400 && status < 500) {
    return "Client Error"
  } else if (status >= 500) {
    return "Server Error"
  } else {
    return "Unknown Status"
  }
}
```

**✅ Functype Pattern:**

```typescript
function getStatusMessage(status: number): string {
  return Cond.of<string>()
    .when(status >= 200 && status < 300, "Success")
    .elseWhen(status >= 300 && status < 400, "Redirect")
    .elseWhen(status >= 400 && status < 500, "Client Error")
    .elseWhen(status >= 500, "Server Error")
    .else("Unknown Status")
}
```

### Switch Statements

**❌ JavaScript Pattern:**

```typescript
function processAction(action: Action): string {
  switch (action.type) {
    case "create":
      return `Creating ${action.payload.name}`
    case "update":
      return `Updating ${action.payload.id}`
    case "delete":
      return `Deleting ${action.payload.id}`
    default:
      return "Unknown action"
  }
}
```

**✅ Functype Pattern:**

```typescript
function processAction(action: Action): string {
  return Match<Action["type"], string>(action.type)
    .caseValue("create", `Creating ${action.payload.name}`)
    .caseValue("update", `Updating ${action.payload.id}`)
    .caseValue("delete", `Deleting ${action.payload.id}`)
    .default("Unknown action")
}
```

### Early Returns

**❌ JavaScript Pattern:**

```typescript
function validateUser(user: any): string | null {
  if (!user) {
    return "User is required"
  }
  if (!user.email) {
    return "Email is required"
  }
  if (!user.email.includes("@")) {
    return "Invalid email format"
  }
  if (!user.age || user.age < 18) {
    return "User must be 18 or older"
  }
  return null // Valid
}
```

**✅ Functype Pattern:**

```typescript
function validateUser(user: any): Option<string> {
  return Cond.of<Option<string>>()
    .when(!user, Option("User is required"))
    .elseWhen(!user?.email, Option("Email is required"))
    .elseWhen(!user?.email?.includes("@"), Option("Invalid email format"))
    .elseWhen(!user?.age || user.age < 18, Option("User must be 18 or older"))
    .else(None()) // Valid - no error
}
```

## Async Operations

### Promise Chaining

**❌ JavaScript Pattern:**

```typescript
async function fetchUserWithPosts(userId: string): Promise<UserWithPosts | null> {
  try {
    const user = await fetchUser(userId)
    if (!user) return null

    const posts = await fetchUserPosts(userId)
    return { ...user, posts }
  } catch (error) {
    console.error("Failed to fetch user data:", error)
    return null
  }
}
```

**✅ Functype Pattern:**

```typescript
function fetchUserWithPosts(userId: string): Task<UserWithPosts, Error> {
  return Task.tryCatch(() => fetchUser(userId)).flatMap((user) =>
    Task.tryCatch(() => fetchUserPosts(userId)).map((posts) => ({ ...user, posts })),
  )
}
```

### Parallel Promises

**❌ JavaScript Pattern:**

```typescript
async function fetchAllData(): Promise<{ users?: User[]; posts?: Post[]; error?: string }> {
  try {
    const [users, posts] = await Promise.all([fetchUsers(), fetchPosts()])
    return { users, posts }
  } catch (error) {
    return { error: error.message }
  }
}
```

**✅ Functype Pattern:**

```typescript
function fetchAllData(): Task<{ users: User[]; posts: Post[] }, Error> {
  return Task.all([Task.tryCatch(() => fetchUsers()), Task.tryCatch(() => fetchPosts())]).map(([users, posts]) => ({
    users,
    posts,
  }))
}
```

### Timeout Handling

**❌ JavaScript Pattern:**

```typescript
function fetchWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
  ])
}
```

**✅ Functype Pattern:**

```typescript
function fetchWithTimeout<T>(task: () => Promise<T>, timeout: number): Task<T, Error> {
  return Task.timeout(Task.tryCatch(task), timeout, () => new Error("Timeout"))
}
```

## Object/Map Operations

### Object Property Access

**❌ JavaScript Pattern:**

```typescript
function getConfigValue(config: Config, path: string): any {
  const keys = path.split(".")
  let value: any = config

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key]
    } else {
      return undefined
    }
  }

  return value
}
```

**✅ Functype Pattern:**

```typescript
function getConfigValue(config: Config, path: string): Option<any> {
  return List(path.split(".")).foldLeft(Option<any>(config))((acc, key) =>
    acc.flatMap((obj) => (typeof obj === "object" && obj !== null && key in obj ? Option(obj[key]) : None())),
  )
}
```

### Map Operations

**❌ JavaScript Pattern:**

```typescript
function countByCategory(items: Item[]): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const item of items) {
    if (item.category) {
      counts[item.category] = (counts[item.category] || 0) + 1
    }
  }

  return counts
}
```

**✅ Functype Pattern:**

```typescript
function countByCategory(items: Item[]): Map<string, number> {
  return List(items)
    .flatMap((item) => Option(item.category).toList())
    .foldLeft(Map<string, number>())((acc, category) => acc.add(category, acc.orElse(category, 0) + 1))
}
```

### Merging Objects

**❌ JavaScript Pattern:**

```typescript
function mergeConfigs(base: Config, overrides: Partial<Config>[]): Config {
  let result = { ...base }

  for (const override of overrides) {
    for (const key in override) {
      if (override[key] !== undefined) {
        result[key] = override[key]
      }
    }
  }

  return result
}
```

**✅ Functype Pattern:**

```typescript
function mergeConfigs(base: Config, overrides: Partial<Config>[]): Config {
  return List(overrides)
    .foldLeft(Map(base))((acc, override) =>
      Object.entries(override).reduce(
        (map, [key, value]) =>
          Option(value).fold(
            () => map,
            (v) => map.add(key, v),
          ),
        acc,
      ),
    )
    .toObject()
}
```

## Type Validation

### Runtime Type Checking

**❌ JavaScript Pattern:**

```typescript
function validateEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("Email must be a string")
  }
  if (!email.includes("@")) {
    throw new Error("Invalid email format")
  }
  return email
}
```

**✅ Functype Pattern:**

```typescript
import { ValidatedBrand } from "functype/branded"

const Email = ValidatedBrand("Email", (value: unknown): value is string => {
  if (typeof value !== "string") return false
  return /^[^@]+@[^@]+\.[^@]+$/.test(value)
})

// Usage
const emailResult = Email.validate("user@example.com")
emailResult.fold(
  (errors) => console.error("Invalid email:", errors),
  (email) => console.log("Valid email:", email),
)
```

### Multiple Validations

**❌ JavaScript Pattern:**

```typescript
function validateUser(data: any): User {
  const errors: string[] = []

  if (!data.name || typeof data.name !== "string") {
    errors.push("Name is required and must be a string")
  }

  if (!data.age || typeof data.age !== "number" || data.age < 0) {
    errors.push("Age must be a positive number")
  }

  if (!data.email || !data.email.includes("@")) {
    errors.push("Valid email is required")
  }

  if (errors.length > 0) {
    throw new Error(errors.join(", "))
  }

  return data as User
}
```

**✅ Functype Pattern:**

```typescript
function validateUser(data: any): Either<string[], User> {
  const nameValidation = Option(data.name)
    .filter((name) => typeof name === "string")
    .toEither(() => ["Name is required and must be a string"])

  const ageValidation = Option(data.age)
    .filter((age) => typeof age === "number" && age >= 0)
    .toEither(() => ["Age must be a positive number"])

  const emailValidation = Option(data.email)
    .filter((email) => typeof email === "string" && email.includes("@"))
    .toEither(() => ["Valid email is required"])

  // Combine validations
  return nameValidation.flatMap((name) =>
    ageValidation.flatMap((age) =>
      emailValidation.map(
        (email) =>
          ({
            name,
            age,
            email,
          }) as User,
      ),
    ),
  )
}
```

## Data Transformation Pipelines

### Complex Data Processing

**❌ JavaScript Pattern:**

```typescript
function processOrders(orders: Order[]): Summary {
  // Filter valid orders
  const validOrders = orders.filter((order) => order.status === "completed" && order.total > 0)

  // Group by customer
  const byCustomer: Record<string, Order[]> = {}
  for (const order of validOrders) {
    if (!byCustomer[order.customerId]) {
      byCustomer[order.customerId] = []
    }
    byCustomer[order.customerId].push(order)
  }

  // Calculate totals
  const customerTotals: Record<string, number> = {}
  for (const [customerId, customerOrders] of Object.entries(byCustomer)) {
    customerTotals[customerId] = customerOrders.reduce((sum, order) => sum + order.total, 0)
  }

  // Find top customer
  let topCustomer = null
  let maxTotal = 0
  for (const [customerId, total] of Object.entries(customerTotals)) {
    if (total > maxTotal) {
      maxTotal = total
      topCustomer = customerId
    }
  }

  return {
    totalOrders: validOrders.length,
    totalRevenue: Object.values(customerTotals).reduce((a, b) => a + b, 0),
    topCustomer,
    topCustomerRevenue: maxTotal,
  }
}
```

**✅ Functype Pattern:**

```typescript
function processOrders(orders: Order[]): Summary {
  const validOrders = List(orders).filter((order) => order.status === "completed" && order.total > 0)

  const customerTotals = validOrders
    .groupBy((order) => order.customerId)
    .map((orders) => orders.map((o) => o.total).foldLeft(0)((a, b) => a + b))

  const topCustomer = customerTotals
    .toList()
    .maxBy(([_, total]) => total)
    .map(([customerId, total]) => ({ customerId, total }))

  return {
    totalOrders: validOrders.size(),
    totalRevenue: customerTotals.values().foldLeft(0)((a, b) => a + b),
    topCustomer: topCustomer.map((t) => t.customerId).orElse(null),
    topCustomerRevenue: topCustomer.map((t) => t.total).orElse(0),
  }
}
```

### Data Pipeline with Error Handling

**❌ JavaScript Pattern:**

```typescript
async function processDataFile(filePath: string): Promise<ProcessedData | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    const data = JSON.parse(content)

    if (!Array.isArray(data)) {
      console.error("Data must be an array")
      return null
    }

    const processed = data
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        value: item.value * 1.1,
      }))

    const result = {
      items: processed,
      total: processed.reduce((sum, item) => sum + item.value, 0),
      average: processed.length > 0 ? processed.reduce((sum, item) => sum + item.value, 0) / processed.length : 0,
    }

    return result
  } catch (error) {
    console.error("Processing failed:", error)
    return null
  }
}
```

**✅ Functype Pattern:**

```typescript
function processDataFile(filePath: string): Task<ProcessedData, Error> {
  return Task.tryCatchAsync(async () => {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content)
  })
    .flatMap((data) => (Array.isArray(data) ? Task.resolve(data) : Task.reject(new Error("Data must be an array"))))
    .map((data) => {
      const processed = List(data)
        .filter((item) => item.value > 0)
        .map((item) => ({
          ...item,
          value: item.value * 1.1,
        }))

      return {
        items: processed.toArray(),
        total: processed.map((item) => item.value).foldLeft(0)((a, b) => a + b),
        average: processed.isEmpty()
          ? 0
          : processed.map((item) => item.value).foldLeft(0)((a, b) => a + b) / processed.size(),
      }
    })
}
```

## State Management

### Reducer Pattern

**❌ JavaScript Pattern:**

```typescript
type State = {
  count: number
  history: number[]
  error?: string
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment":
      if (state.count >= 100) {
        return { ...state, error: "Maximum count reached" }
      }
      return {
        ...state,
        count: state.count + 1,
        history: [...state.history, state.count + 1],
        error: undefined,
      }

    case "decrement":
      if (state.count <= 0) {
        return { ...state, error: "Count cannot be negative" }
      }
      return {
        ...state,
        count: state.count - 1,
        history: [...state.history, state.count - 1],
        error: undefined,
      }

    case "reset":
      return {
        count: 0,
        history: [0],
        error: undefined,
      }

    default:
      return state
  }
}
```

**✅ Functype Pattern:**

```typescript
type State = {
  count: number
  history: List<number>
  error: Option<string>
}

function reducer(state: State, action: Action): State {
  return Match<Action["type"], State>(action.type)
    .caseValue(
      "increment",
      Cond.of<State>()
        .when(state.count >= 100, {
          ...state,
          error: Option("Maximum count reached"),
        })
        .else({
          count: state.count + 1,
          history: state.history.add(state.count + 1),
          error: None(),
        }),
    )
    .caseValue(
      "decrement",
      Cond.of<State>()
        .when(state.count <= 0, {
          ...state,
          error: Option("Count cannot be negative"),
        })
        .else({
          count: state.count - 1,
          history: state.history.add(state.count - 1),
          error: None(),
        }),
    )
    .caseValue("reset", {
      count: 0,
      history: List([0]),
      error: None(),
    })
    .default(state)
}
```

## Common Anti-Patterns

### Nested Ternaries

**❌ JavaScript Pattern:**

```typescript
const message = user ? (user.isActive ? (user.isAdmin ? "Active Admin" : "Active User") : "Inactive User") : "No User"
```

**✅ Functype Pattern:**

```typescript
const message = Option(user).fold(
  () => "No User",
  (u) => Cond.of<string>().when(!u.isActive, "Inactive User").elseWhen(u.isAdmin, "Active Admin").else("Active User"),
)
```

### Mutation and Side Effects

**❌ JavaScript Pattern:**

```typescript
function processItems(items: Item[]): Item[] {
  const result = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    item.processed = true // Mutation!

    if (item.value > 0) {
      item.value *= 1.1 // Mutation!
      result.push(item)
    }
  }

  return result
}
```

**✅ Functype Pattern:**

```typescript
function processItems(items: Item[]): List<Item> {
  return List(items)
    .filter((item) => item.value > 0)
    .map((item) => ({
      ...item,
      processed: true,
      value: item.value * 1.1,
    }))
}
```

### Callback Hell

**❌ JavaScript Pattern:**

```typescript
getUserById(userId, (err, user) => {
  if (err) {
    handleError(err)
    return
  }

  getOrdersByUser(user.id, (err, orders) => {
    if (err) {
      handleError(err)
      return
    }

    calculateTotal(orders, (err, total) => {
      if (err) {
        handleError(err)
        return
      }

      displayResult(total)
    })
  })
})
```

**✅ Functype Pattern:**

```typescript
Task.tryCatch(() => getUserById(userId))
  .flatMap((user) => Task.tryCatch(() => getOrdersByUser(user.id)))
  .flatMap((orders) => Task.tryCatch(() => calculateTotal(orders)))
  .fold(
    (error) => handleError(error),
    (total) => displayResult(total),
  )
```

## Summary

The key principles when converting JavaScript/TypeScript to functype patterns:

1. **Replace null/undefined checks with Option**
2. **Replace try-catch with Try or Either**
3. **Replace mutable arrays with List**
4. **Replace object literals with Map for dynamic keys**
5. **Replace if-else chains with Cond**
6. **Replace switch statements with Match**
7. **Replace Promises with Task for better error handling**
8. **Replace mutation with immutable transformations**
9. **Use composition over imperative loops**
10. **Leverage type safety with branded types**

Remember: functype encourages thinking in terms of data transformations rather than step-by-step mutations. This leads to more predictable, testable, and maintainable code.
