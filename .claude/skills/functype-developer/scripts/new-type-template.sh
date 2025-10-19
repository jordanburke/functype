#!/bin/bash

# Script to generate boilerplate for a new functype data structure
# Usage: ./new-type-template.sh TypeName

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 TypeName"
    echo "Example: $0 Result"
    exit 1
fi

TYPE_NAME=$1
TYPE_NAME_LOWER=$(echo "$TYPE_NAME" | tr '[:upper:]' '[:lower:]')
PROJECT_ROOT=$(cd "$(dirname "$0")/../../.." && pwd)

echo "Creating new type: $TYPE_NAME"
echo "Project root: $PROJECT_ROOT"

# Create source directory
SRC_DIR="$PROJECT_ROOT/src/$TYPE_NAME_LOWER"
mkdir -p "$SRC_DIR"

# Create type implementation
cat > "$SRC_DIR/index.ts" << EOF
import { Base } from "@/core/base"
import type { Functor } from "@/functor"
import type { Foldable } from "@/foldable"

/**
 * $TYPE_NAME type - [TODO: Add description]
 */
export type ${TYPE_NAME}Type<T> = Functor<T> & Foldable<T> & {
  // Core methods
  getValue(): T
  isEmpty(): boolean

  // TODO: Add additional methods
}

/**
 * Create a $TYPE_NAME from a value
 */
export function $TYPE_NAME<T>(value: T): ${TYPE_NAME}Type<T> {
  return Base("$TYPE_NAME", {
    // Functor
    map: <B>(f: (val: T) => B): ${TYPE_NAME}Type<B> => {
      return $TYPE_NAME(f(value))
    },

    // Foldable
    fold: <B>(onEmpty: () => B, onValue: (val: T) => B): B => {
      return value == null ? onEmpty() : onValue(value)
    },

    foldLeft: <B>(z: B) => (op: (b: B, a: T) => B): B => {
      return value == null ? z : op(z, value)
    },

    foldRight: <B>(z: B) => (op: (a: T, b: B) => B): B => {
      return value == null ? z : op(value, z)
    },

    // Core methods
    getValue: () => value,
    isEmpty: () => value == null,

    // Pipe
    pipe: () => ({
      map: (f: (val: T) => any) => $TYPE_NAME(value).map(f),
    }),
  })
}

// Companion methods
$TYPE_NAME.empty = <T>(): ${TYPE_NAME}Type<T> => $TYPE_NAME<T>(null as any)

$TYPE_NAME.of = <T>(value: T): ${TYPE_NAME}Type<T> => $TYPE_NAME(value)
EOF

# Create test file
TEST_FILE="$PROJECT_ROOT/test/$TYPE_NAME_LOWER.spec.ts"
cat > "$TEST_FILE" << EOF
import { describe, expect, it } from "vitest"
import { $TYPE_NAME } from "@/$TYPE_NAME_LOWER"

describe("$TYPE_NAME", () => {
  describe("Construction", () => {
    it("should create from value", () => {
      const value = $TYPE_NAME(5)
      expect(value.getValue()).toBe(5)
      expect(value.isEmpty()).toBe(false)
    })

    it("should create empty", () => {
      const empty = $TYPE_NAME.empty<number>()
      expect(empty.isEmpty()).toBe(true)
    })
  })

  describe("Functor", () => {
    it("should map over values", () => {
      const result = $TYPE_NAME(5).map(x => x * 2)
      expect(result.getValue()).toBe(10)
    })

    it("should satisfy identity law", () => {
      const value = $TYPE_NAME(5)
      expect(value.map(x => x)).toEqual(value)
    })

    it("should satisfy composition law", () => {
      const value = $TYPE_NAME(5)
      const f = (x: number) => x * 2
      const g = (x: number) => x + 1

      expect(value.map(f).map(g)).toEqual(value.map(x => g(f(x))))
    })
  })

  describe("Foldable", () => {
    it("should fold with value", () => {
      const result = $TYPE_NAME(5).fold(
        () => "empty",
        x => \`value: \${x}\`
      )
      expect(result).toBe("value: 5")
    })
  })

  describe("Edge Cases", () => {
    it("should handle null", () => {
      const value = $TYPE_NAME(null)
      expect(value.isEmpty()).toBe(true)
    })
  })
})
EOF

echo ""
echo "✅ Created files:"
echo "   - $SRC_DIR/index.ts"
echo "   - $TEST_FILE"
echo ""
echo "Next steps:"
echo "1. Update src/index.ts to export $TYPE_NAME"
echo "2. Update package.json exports to include ./$TYPE_NAME_LOWER"
echo "3. Implement additional methods in $SRC_DIR/index.ts"
echo "4. Add more tests in $TEST_FILE"
echo "5. Update docs/FUNCTYPE_FEATURE_MATRIX.md"
echo "6. Run: pnpm validate"
EOF