import { Cond, Either, Left, Right, Match, Option } from "../src"

// Example 1: Basic conditional expressions without early returns
function calculateDiscount(amount: number): string {
  return Cond.of<string>()
    .when(amount > 1000, "20% discount")
    .elseWhen(amount > 500, "10% discount")
    .elseWhen(amount > 100, "5% discount")
    .else("No discount")
}

// Example 2: Pattern matching with exhaustive checking
type PaymentStatus = "pending" | "completed" | "failed" | "refunded"

function getPaymentMessage(status: PaymentStatus): string {
  return Match.exhaustive<PaymentStatus, string>({
    pending: "Payment is being processed",
    completed: "Payment successful",
    failed: "Payment failed, please try again",
    refunded: "Payment has been refunded",
  })(status)
}

// Example 3: Lazy evaluation for expensive computations
function processData(data: unknown) {
  return Cond.lazy<string>()
    .when(
      () => data === null || data === undefined,
      () => "No data provided",
    )
    .when(
      () => Array.isArray(data) && data.length === 0,
      () => "Empty array",
    )
    .when(
      () => typeof data === "object" && data !== null && Object.keys(data).length === 0,
      () => "Empty object",
    )
    .else(() => `Processing ${JSON.stringify(data)}`)
}

// Example 4: Integration with Option
function getUserPermissions(userId: string): Option<string[]> {
  return Option(userId).map((id) =>
    Cond.of<string[]>()
      .when(id === "admin", ["read", "write", "delete"])
      .when(id.startsWith("user_"), ["read", "write"])
      .when(id.startsWith("guest_"), ["read"])
      .else([]),
  )
}

// Example 5: Complex pattern matching with guards
type HttpResponse = {
  status: number
  body: unknown
}

function handleResponse(response: HttpResponse): Either<string, unknown> {
  return Match<HttpResponse, Either<string, unknown>>(response)
    .case(
      (r: HttpResponse) => r.status >= 200 && r.status < 300,
      (r: HttpResponse) => Right(r.body),
    )
    .case(
      (r: HttpResponse) => r.status === 404,
      () => Left("Resource not found"),
    )
    .case(
      (r: HttpResponse) => r.status >= 400 && r.status < 500,
      (r: HttpResponse) => Left(`Client error: ${r.status}`),
    )
    .case(
      (r: HttpResponse) => r.status >= 500,
      (r: HttpResponse) => Left(`Server error: ${r.status}`),
    )
    .default(() => Left("Unknown error"))
}

// Example 6: State machine with pattern matching
type State = "idle" | "loading" | "success" | "error"
type Action =
  | { type: "fetch" }
  | { type: "success"; data: unknown }
  | { type: "fail"; error: string }
  | { type: "reset" }

function reducer(state: State, action: Action): State {
  return Match<Action["type"], State>(action.type)
    .caseValue(
      "fetch",
      Cond.of<State>()
        .when(state === "idle" || state === "error", "loading")
        .else(state),
    )
    .caseValue("success", "success")
    .caseValue("fail", "error")
    .caseValue("reset", "idle")
    .default(state)
}

// Example usage
console.log(calculateDiscount(750)) // "10% discount"
console.log(getPaymentMessage("completed")) // "Payment successful"
console.log(processData({})) // "Empty object"
console.log(getUserPermissions("admin")) // Option(["read", "write", "delete"])

const response = { status: 404, body: null }
console.log(handleResponse(response)) // Left("Resource not found")

console.log(reducer("idle", { type: "fetch" })) // "loading"
console.log(reducer("loading", { type: "success", data: {} })) // "success"
