import type { Either } from "../src"
import {
  BoundedNumber,
  Cond,
  EmailAddress,
  LazyList,
  Left,
  Match,
  PatternString,
  PositiveNumber,
  Right,
  ValidatedBrand,
} from "../src"

// ============================================
// 1. CONDITIONAL EXPRESSIONS (Cond)
// ============================================

// Basic if/else without early returns
function calculateShipping(orderTotal: number): number {
  return Cond.of<number>()
    .when(orderTotal > 100, 0) // Free shipping
    .elseWhen(orderTotal > 50, 5) // Reduced shipping
    .elseWhen(orderTotal > 25, 10) // Standard shipping
    .else(15) // Base shipping
}

// Pattern matching with Cond.match
type OrderStatus = "pending" | "processing" | "shipped" | "delivered"
function getStatusMessage(status: OrderStatus): string {
  return Cond.match(status)({
    pending: "Order received",
    processing: "Preparing your order",
    shipped: "On the way",
    delivered: "Delivered successfully",
  })
}

// Lazy evaluation for expensive operations
function processUserData(userId: string) {
  return Cond.lazy<string>()
    .when(
      () => !userId,
      () => "No user ID provided",
    )
    .when(
      () => isBannedUser(userId),
      () => "User is banned",
    )
    .when(
      () => !hasValidSubscription(userId),
      () => "Subscription expired",
    )
    .else(() => fetchUserData(userId))
}

// ============================================
// 2. PATTERN MATCHING (Match)
// ============================================

// Basic pattern matching with predicates
function categorizeNumber(n: number): string {
  return Match(n)
    .case((x) => x === 0, "zero")
    .case((x) => x > 0 && x % 2 === 0, "positive even")
    .case((x) => x > 0 && x % 2 === 1, "positive odd")
    .case((x) => x < 0 && x % 2 === 0, "negative even")
    .default("negative odd")
}

// Exhaustive matching for discriminated unions
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number }

function calculateArea(shape: Shape): number {
  return Match.exhaustive<Shape["kind"], number>({
    circle: shape.kind === "circle" ? Math.PI * shape.radius ** 2 : 0,
    rectangle: shape.kind === "rectangle" ? shape.width * shape.height : 0,
    triangle: shape.kind === "triangle" ? 0.5 * shape.base * shape.height : 0,
  })(shape.kind)
}

// HTTP status code handling with partial matching
function handleHttpStatus(status: number): string {
  return Match.partial<number, string>({
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
  }).withDefault((code) => {
    if (code >= 200 && code < 300) return "Success"
    if (code >= 400 && code < 500) return "Client Error"
    if (code >= 500) return "Server Error"
    return "Unknown Status"
  })(status)
}

// Guard patterns for complex matching
function getUserTier(user: { age: number; purchases: number; memberSince: Date }): string {
  const yearsSinceMembership = (Date.now() - user.memberSince.getTime()) / (365 * 24 * 60 * 60 * 1000)

  return Match.withGuards<typeof user, string>([
    [(u) => u.purchases > 100 && yearsSinceMembership > 5, "platinum"],
    [(u) => u.purchases > 50 && yearsSinceMembership > 2, "gold"],
    [(u) => u.purchases > 20 || yearsSinceMembership > 1, "silver"],
    [(u) => u.purchases > 0, "bronze"],
  ]).withDefault("new")(user)
}

// ============================================
// 3. VALIDATED BRANDS
// ============================================

// Using predefined brands
function processPayment(amount: number, email: string): Either<string, string> {
  // Validate amount
  const validAmount = PositiveNumber.from(amount)
  if (validAmount.isLeft()) {
    return Left("Invalid payment amount")
  }

  // Validate email
  const validEmail = EmailAddress.from(email)
  if (validEmail.isLeft()) {
    return Left("Invalid email address")
  }

  // Process with validated values
  return Right(`Payment of $${validAmount.value} processed for ${validEmail.value}`)
}

// Custom validated brands
const Port = BoundedNumber("Port", 1, 65535)
const IPv4 = PatternString("IPv4", /^(\d{1,3}\.){3}\d{1,3}$/)
const Username = ValidatedBrand("Username", (s: string) => s.length >= 3 && s.length <= 20 && /^[a-zA-Z0-9_]+$/.test(s))

// Using custom brands
function createServerConfig(host: string, port: number, admin: string) {
  return Cond.of<Either<string, { host: any; port: any; admin: any }>>()
    .when(!IPv4.is(host), Left("Invalid IP address"))
    .when(!Port.is(port), Left("Invalid port number"))
    .when(!Username.is(admin), Left("Invalid admin username"))
    .else(() => {
      const config = {
        host: IPv4.unsafeOf(host),
        port: Port.unsafeOf(port),
        admin: Username.unsafeOf(admin),
      }
      return Right(config)
    })
}

// ============================================
// 4. LAZY LISTS
// ============================================

// Basic lazy evaluation
const numbers = LazyList.range(1, 1000000)
  .filter((n) => n % 2 === 0)
  .map((n) => n * n)
  .take(10)
  .toArray()
// Only processes enough elements to get 10 results

// Infinite sequences
const fibonacci = LazyList.iterate(
  [0, 1] as [number, number],
  ([a, b]: [number, number]) => [b, a + b] as [number, number],
)
  .map(([a]: [number, number]) => a)
  .takeWhile((n: number) => n < 1000)
  .toArray()

// Prime number generator
function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false
  }
  return true
}

const primes = LazyList.iterate(2, (n: number) => n + 1)
  .filter(isPrime)
  .take(100) // First 100 primes
console.log("First 10 primes:", primes.take(10).toArray())

// Complex data processing pipeline
interface Transaction {
  id: string
  amount: number
  type: "credit" | "debit"
  timestamp: Date
}

function analyzeTransactions(transactions: Transaction[]) {
  const result = LazyList(transactions)
    .filter((t: Transaction) => t.type === "credit")
    .map((t: Transaction) => t.amount)
    .filter((amount: number) => amount > 100)
    .reduce((sum: number, amount: number) => sum + amount, 0)

  const topTransactions = LazyList(transactions)
    .filter((t: Transaction) => t.amount > 1000)
    .take(10)
    .toArray()

  return { totalLargeCredits: result, topTransactions }
}

// ============================================
// 5. COMBINING ALL FEATURES
// ============================================

// Complex business logic using all features
type UserRole = "admin" | "moderator" | "user" | "guest"
type FeatureFlag = "beta" | "experimental" | "stable"

const FeatureAccess = ValidatedBrand(
  "FeatureAccess",
  (config: { role: UserRole; feature: FeatureFlag; accountAge: number }) => {
    return Match.exhaustive<FeatureFlag, boolean>({
      stable: true,
      beta: config.role !== "guest" && config.accountAge > 30,
      experimental: config.role === "admin" || (config.role === "moderator" && config.accountAge > 90),
    })(config.feature)
  },
)

function processFeatureRequest(
  userId: string,
  role: UserRole,
  feature: FeatureFlag,
  accountAge: number,
): Either<string, string> {
  // Validate user permissions
  const accessConfig = { role, feature, accountAge }
  const hasAccess = FeatureAccess.of(accessConfig)

  return Cond.of<Either<string, string>>()
    .when(!userId, Left("User ID required"))
    .when(hasAccess.isEmpty, Left(`Access denied for ${feature} feature`))
    .else((): Either<string, string> => {
      // Process based on feature type - use exhaustive for union types
      const result = Match.exhaustive<FeatureFlag, Either<string, string>>({
        stable: Right(`Enabled ${feature} for user ${userId}`),
        beta: Right(`Beta feature ${feature} enabled with limited access`),
        experimental: Right(`Experimental feature ${feature} enabled - use with caution`),
      })(feature)

      return result
    })
}

// Data processing pipeline with lazy evaluation
function generateReport(startDate: Date, endDate: Date) {
  const dateRange = LazyList.iterate(startDate, (date: Date) => {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    return next
  })
    .takeWhile((date: Date) => date <= endDate)
    .map((date: Date) => ({
      date,
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    }))

  const weekendCount = dateRange.filter((d: { isWeekend: boolean }) => d.isWeekend).count()

  const weekdayCount = dateRange.filter((d: { isWeekend: boolean }) => !d.isWeekend).count()

  return { weekendCount, weekdayCount }
}

// ============================================
// USAGE EXAMPLES
// ============================================

console.log("Shipping cost for $75 order:", calculateShipping(75))
console.log("Order status:", getStatusMessage("processing"))
console.log("Number category:", categorizeNumber(-3))
console.log("HTTP status:", handleHttpStatus(404))

const paymentResult = processPayment(100, "user@example.com")
console.log("Payment result:", paymentResult)

const serverConfig = createServerConfig("192.168.1.1", 8080, "admin_user")
console.log("Server config:", serverConfig)

console.log("First 10 even squares:", numbers)
console.log("Fibonacci < 1000:", fibonacci)
console.log("Date report:", generateReport(new Date("2024-01-01"), new Date("2024-01-31")))

// Dummy helper functions
function isBannedUser(_id: string): boolean {
  return false
}
function hasValidSubscription(_id: string): boolean {
  return true
}
function fetchUserData(id: string): string {
  return `Data for ${id}`
}

// Export functions to prevent unused warnings
export {
  analyzeTransactions,
  calculateArea,
  calculateShipping,
  categorizeNumber,
  createServerConfig,
  generateReport,
  getUserTier,
  processFeatureRequest,
  processPayment,
  processUserData,
}
