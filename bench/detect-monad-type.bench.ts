import { bench, describe } from "vitest"

import { Left, Right } from "@/either"
import { List } from "@/list"
import { Option } from "@/option"
import { Try } from "@/try"

// Current switch implementation
function detectMonadTypeSwitch(value: unknown): string {
  if (!value || typeof value !== "object" || !("_tag" in value)) {
    return "unknown"
  }

  switch (value._tag) {
    case "Some":
    case "None":
      return "Option"

    case "Left":
    case "Right":
      return "Either"

    case "List":
      return "List"

    case "Success":
    case "Failure":
      return "Try"

    default:
      return "unknown"
  }
}

// If/else implementation (optimized order)
function detectMonadTypeIfElse(value: unknown): string {
  if (!value || typeof value !== "object" || !("_tag" in value)) {
    return "unknown"
  }

  const tag = value._tag

  // Order by frequency of use (most common first)
  if (tag === "Some" || tag === "None") return "Option"
  if (tag === "Right" || tag === "Left") return "Either"
  if (tag === "List") return "List"
  if (tag === "Success" || tag === "Failure") return "Try"

  return "unknown"
}

// Object lookup implementation
const TAG_TO_TYPE: Record<string, string> = {
  Some: "Option",
  None: "Option",
  Left: "Either",
  Right: "Either",
  List: "List",
  Success: "Try",
  Failure: "Try",
}

function detectMonadTypeObject(value: unknown): string {
  if (!value || typeof value !== "object" || !("_tag" in value)) {
    return "unknown"
  }

  return TAG_TO_TYPE[value._tag as string] ?? "unknown"
}

// If/else with early return (no intermediate variable)
function detectMonadTypeEarlyReturn(value: unknown): string {
  if (!value || typeof value !== "object" || !("_tag" in value)) {
    return "unknown"
  }

  const tag = (value as { _tag: string })._tag
  if (tag === "Some" || tag === "None") return "Option"
  if (tag === "Right" || tag === "Left") return "Either"
  if (tag === "List") return "List"
  if (tag === "Success" || tag === "Failure") return "Try"
  return "unknown"
}

// Create test data with realistic distribution
const testData = [
  // Most common: Option (40%)
  ...Array(200)
    .fill(null)
    .map(() => Option(Math.random())),
  ...Array(200)
    .fill(null)
    .map(() => Option.none()),

  // Common: Either (30%)
  ...Array(150)
    .fill(null)
    .map(() => Right(Math.random())),
  ...Array(150)
    .fill(null)
    .map(() => Left("error")),

  // Less common: List (20%)
  ...Array(200)
    .fill(null)
    .map(() => List([1, 2, 3])),

  // Least common: Try (10%)
  ...Array(50)
    .fill(null)
    .map(() => Try(() => Math.random())),
  ...Array(50)
    .fill(null)
    .map(() =>
      Try(() => {
        throw new Error("test")
      }),
    ),
]

// Shuffle the data to simulate realistic usage
const shuffled = [...testData].sort(() => Math.random() - 0.5)

describe("detectMonadType performance comparison", () => {
  bench("switch statement (current)", () => {
    for (const item of shuffled) {
      detectMonadTypeSwitch(item)
    }
  })

  bench("if/else chain (optimized order)", () => {
    for (const item of shuffled) {
      detectMonadTypeIfElse(item)
    }
  })

  bench("object lookup", () => {
    for (const item of shuffled) {
      detectMonadTypeObject(item)
    }
  })

  bench("if/else early return", () => {
    for (const item of shuffled) {
      detectMonadTypeEarlyReturn(item)
    }
  })
})

// Additional micro-benchmarks for specific cases
describe("detectMonadType micro-benchmarks", () => {
  const someValue = Option(42)
  void Option.none() // noneValue - unused for now
  const rightValue = Right(42)
  void Left("error") // leftValue - unused for now
  const listValue = List([1, 2, 3])
  const trySuccess = Try(() => 42)
  void Try(() => {
    throw new Error("test")
  }) // tryFailure - unused for now

  bench("switch - Option (Some)", () => {
    detectMonadTypeSwitch(someValue)
  })

  bench("if/else - Option (Some)", () => {
    detectMonadTypeIfElse(someValue)
  })

  bench("object - Option (Some)", () => {
    detectMonadTypeObject(someValue)
  })

  bench("switch - Either (Right)", () => {
    detectMonadTypeSwitch(rightValue)
  })

  bench("if/else - Either (Right)", () => {
    detectMonadTypeIfElse(rightValue)
  })

  bench("object - Either (Right)", () => {
    detectMonadTypeObject(rightValue)
  })

  bench("switch - List", () => {
    detectMonadTypeSwitch(listValue)
  })

  bench("if/else - List", () => {
    detectMonadTypeIfElse(listValue)
  })

  bench("object - List", () => {
    detectMonadTypeObject(listValue)
  })

  bench("switch - Try (Success)", () => {
    detectMonadTypeSwitch(trySuccess)
  })

  bench("if/else - Try (Success)", () => {
    detectMonadTypeIfElse(trySuccess)
  })

  bench("object - Try (Success)", () => {
    detectMonadTypeObject(trySuccess)
  })
})
