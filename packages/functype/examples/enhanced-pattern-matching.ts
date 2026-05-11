/**
 * Enhanced Pattern Matching Examples
 *
 * This demonstrates the new pattern matching features:
 * 1. Exhaustiveness checking at compile time
 * 2. Nested pattern matching
 * 3. Guard patterns
 */

import { Match } from "../src/conditional/Match"

// Example 1: Exhaustive Pattern Matching with Union Types
type Status = "idle" | "loading" | "success" | "error"

function getStatusIcon(status: Status): string {
  // Use Match.exhaustive for union types to ensure all cases are handled
  return Match.exhaustive<Status, string>({
    idle: "⏸️",
    loading: "⏳",
    success: "✅",
    error: "❌",
  })(status)
}

// Example 2: Nested Pattern Matching
type User = {
  name: string
  age: number
  role: "admin" | "user" | "guest"
  preferences?: {
    theme: "light" | "dark"
    notifications: boolean
  }
}

function getUserMessage(user: User): string {
  return Match(user)
    .case({ role: "admin", age: (n: number) => n >= 18, preferences: { theme: "dark" } }, "Welcome, dark mode admin!")
    .case(
      { role: "admin", preferences: { notifications: true } },
      (u) => `Admin ${u.name}, you have notifications enabled`,
    )
    .case({ role: "guest" }, "Please sign up for full access")
    .when(
      (u) => u.age < 18,
      (u) => `Hello ${u.name}, parental consent required`,
    )
    .default((u) => `Welcome, ${u.name}!`)
}

// Example 3: Type-Safe Redux Action Handling
type Action =
  | { type: "SET_USER"; payload: { id: string; name: string } }
  | { type: "LOGOUT" }
  | { type: "UPDATE_SETTINGS"; payload: { key: string; value: any } }
  | { type: "API_REQUEST"; endpoint: string; method: "GET" | "POST" | "PUT" | "DELETE" }

type State = {
  user: { id: string; name: string } | null
  settings: Record<string, any>
  loading: boolean
}

function reducer(state: State, action: Action): State {
  return (
    Match(action)
      .case(
        { type: "SET_USER" },
        (a): State => ({
          ...state,
          user: (a as { type: "SET_USER"; payload: { id: string; name: string } }).payload,
          loading: false,
        }),
      )
      .case({ type: "LOGOUT" }, (): State => ({ ...state, user: null, settings: {} }))
      .case(
        { type: "UPDATE_SETTINGS" },
        (a): State => ({
          ...state,
          settings: {
            ...state.settings,
            [(a as { type: "UPDATE_SETTINGS"; payload: { key: string; value: any } }).payload.key]: (
              a as { type: "UPDATE_SETTINGS"; payload: { key: string; value: any } }
            ).payload.value,
          },
        }),
      )
      // Match specific API methods
      .case({ type: "API_REQUEST", method: "GET" }, (): State => ({ ...state, loading: true }))
      .case({ type: "API_REQUEST", method: "DELETE" }, (a): State => {
        console.log(`DELETE request to ${(a as { type: "API_REQUEST"; endpoint: string; method: "DELETE" }).endpoint}`)
        return state
      })
      .default((): State => state)
  )
}

// Use the reducer
console.log("\\nRedux-style state management:")
const initialState: State = { user: null, settings: {}, loading: false }
const finalState = reducer(initialState, { type: "SET_USER", payload: { id: "123", name: "Alice" } })
console.log("User set:", finalState.user)

// Example 4: Builder Pattern for Reusable Matchers
type Animal = {
  species: string
  legs: number
  canFly: boolean
  habitat: "land" | "water" | "air" | "amphibious"
}

const animalClassifier = Match.builder<Animal, string>()
  // Guards take precedence
  .when((a) => a.canFly && a.habitat === "air", "Flying creature")
  .when((a) => a.habitat === "water" && a.legs === 0, "Fish")
  .when((a) => a.habitat === "amphibious", "Amphibian")
  // Pattern matching
  .case({ legs: 0 }, "Legless creature")
  .case({ legs: 2 }, "Biped")
  .case({ legs: 4 }, "Quadruped")
  .case({ legs: 6 }, "Insect")
  .case({ legs: 8 }, "Arachnid")
  .when((a) => a.legs > 8, "Multi-legged creature")
  .default("Unknown creature type")
  .build()

// Example 5: Struct Pattern Matching for Event Handling
type DomEvent =
  | { type: "click"; x: number; y: number; button: "left" | "right" | "middle" }
  | { type: "keypress"; key: string; shift: boolean; ctrl: boolean; alt: boolean }
  | { type: "scroll"; deltaY: number; deltaX: number }
  | { type: "focus"; element: string }
  | { type: "blur"; element: string }

const eventHandler = Match.struct<DomEvent, void>()
  // Specific key combinations
  .case({ type: "keypress", key: "Enter", ctrl: true }, () => console.log("Ctrl+Enter pressed"))
  .case({ type: "keypress", key: "s", ctrl: true }, () => console.log("Save shortcut"))
  // Right-click
  .case({ type: "click", button: "right" }, (e) =>
    console.log(
      `Right-click at (${(e as { type: "click"; x: number; y: number; button: "right" }).x}, ${(e as { type: "click"; x: number; y: number; button: "right" }).y})`,
    ),
  )
  // Scroll handling
  .case({ type: "scroll" }, (e) => {
    const scrollEvent = e as { type: "scroll"; deltaY: number; deltaX: number }
    if (Math.abs(scrollEvent.deltaY) > Math.abs(scrollEvent.deltaX)) {
      console.log(`Vertical scroll: ${scrollEvent.deltaY}`)
    } else {
      console.log(`Horizontal scroll: ${scrollEvent.deltaX}`)
    }
  })
  .build()

// Use the event handler
console.log("\\nEvent handling examples:")
eventHandler({ type: "click", x: 100, y: 200, button: "right" })
eventHandler({ type: "keypress", key: "s", shift: false, ctrl: true, alt: false })

// Example 6: Complex Validation with Pattern Matching
type FormData = {
  username: string
  email: string
  password: string
  age?: number
  country?: string
  acceptedTerms: boolean
}

type ValidationResult = { valid: true; data: FormData } | { valid: false; errors: string[] }

function validateForm(input: unknown): ValidationResult {
  return Match(input)
    .when(
      (x) => !x || typeof x !== "object",
      (): ValidationResult => ({ valid: false, errors: ["Invalid input format"] }),
    )
    .when(
      (x) => !(x as any).username || typeof (x as any).username !== "string",
      (): ValidationResult => ({ valid: false, errors: ["Username is required"] }),
    )
    .when(
      (x) => !(x as any).email || !(x as any).email.includes("@"),
      (): ValidationResult => ({ valid: false, errors: ["Valid email is required"] }),
    )
    .when(
      (x) => !(x as any).password || (x as any).password.length < 8,
      (): ValidationResult => ({ valid: false, errors: ["Password must be at least 8 characters"] }),
    )
    .when(
      (x) => !(x as any).acceptedTerms,
      (): ValidationResult => ({ valid: false, errors: ["You must accept the terms"] }),
    )
    .when(
      (x) =>
        (x as any).age !== undefined &&
        (typeof (x as any).age !== "number" || (x as any).age < 13 || (x as any).age > 120),
      (): ValidationResult => ({ valid: false, errors: ["Age must be between 13 and 120"] }),
    )
    .default((x): ValidationResult => ({ valid: true, data: x as FormData }))
}

// Usage Examples
console.log("Status Icons:")
console.log("idle:", getStatusIcon("idle"))
console.log("loading:", getStatusIcon("loading"))
console.log("success:", getStatusIcon("success"))
console.log("error:", getStatusIcon("error"))

console.log("\nUser Messages:")
const admin: User = {
  name: "Alice",
  age: 30,
  role: "admin",
  preferences: { theme: "dark", notifications: true },
}
const youngUser: User = {
  name: "Bob",
  age: 16,
  role: "user",
}
const guest: User = {
  name: "Charlie",
  age: 25,
  role: "guest",
}

console.log(getUserMessage(admin))
console.log(getUserMessage(youngUser))
console.log(getUserMessage(guest))

console.log("\nAnimal Classification:")
console.log(animalClassifier({ species: "Eagle", legs: 2, canFly: true, habitat: "air" }))
console.log(animalClassifier({ species: "Shark", legs: 0, canFly: false, habitat: "water" }))
console.log(animalClassifier({ species: "Frog", legs: 4, canFly: false, habitat: "amphibious" }))
console.log(animalClassifier({ species: "Spider", legs: 8, canFly: false, habitat: "land" }))

console.log("\nForm Validation:")
console.log(
  validateForm({
    username: "john_doe",
    email: "john@example.com",
    password: "secure123",
    acceptedTerms: true,
  }),
)
console.log(
  validateForm({
    username: "jane",
    email: "invalid-email",
    password: "123",
    acceptedTerms: false,
  }),
)
