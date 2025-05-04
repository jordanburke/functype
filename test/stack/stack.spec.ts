import { describe, expect, it } from "vitest"

import { Stack } from "@/stack/Stack"

describe("Stack", () => {
  it("should create an empty stack", () => {
    const stack = Stack<number>()
    expect(stack.isEmpty).toBe(true)
    expect(stack.size).toBe(0)
  })

  it("should push and pop values correctly", () => {
    const stack = Stack<number>()
    const stack1 = stack.push(1)
    const stack2 = stack1.push(2)
    const stack3 = stack2.push(3)

    expect(stack3.isEmpty).toBe(false)
    expect(stack3.size).toBe(3)

    const [stack4, value1] = stack3.pop()
    expect(value1.get()).toBe(3)
    expect(stack4.size).toBe(2)

    const [stack5, value2] = stack4.pop()
    expect(value2.get()).toBe(2)
    expect(stack5.size).toBe(1)

    const [stack6, value3] = stack5.pop()
    expect(value3.get()).toBe(1)
    expect(stack6.size).toBe(0)
    expect(stack6.isEmpty).toBe(true)

    const [stack7, value4] = stack6.pop()
    expect(value4.isEmpty).toBe(true)
    expect(stack7.isEmpty).toBe(true)
  })

  it("should peek the top value without removing it", () => {
    const stack = Stack([1, 2, 3])
    expect(stack.peek().get()).toBe(3)
    expect(stack.size).toBe(3) // Size remains unchanged
  })

  it("should implement map correctly", () => {
    const stack = Stack([1, 2, 3])
    const doubled = stack.map((x: number) => x * 2)

    expect(doubled.size).toBe(3)
    expect(doubled.toArray()).toEqual([2, 4, 6])

    // Original stack should remain unchanged
    expect(stack.toArray()).toEqual([1, 2, 3])
  })

  it("should implement flatMap correctly", () => {
    const stack = Stack([1, 2])
    const result = stack.flatMap((x: number) => Stack([x, x + 10]))

    expect(result.size).toBe(4)
    expect(result.toArray()).toEqual([1, 11, 2, 12])
  })

  it("should implement contains correctly", () => {
    const stack = Stack([1, 2, 3])
    expect(stack.contains(2)).toBe(true)
    expect(stack.contains(4)).toBe(false)
  })

  it("should implement reduce correctly", () => {
    const stack = Stack([1, 2, 3, 4])
    const sum = stack.reduce((acc: number, val: number) => acc + val)
    expect(sum).toBe(10)
  })

  it("should implement reduceRight correctly", () => {
    const stack = Stack([1, 2, 3, 4])

    // For subtraction, the order matters
    const leftFold = stack.reduce((acc: number, val: number) => acc - val)
    const rightFold = stack.reduceRight((acc: number, val: number) => acc - val)

    // (((1 - 2) - 3) - 4) = -8
    expect(leftFold).toBe(-8)

    // (1 - (2 - (3 - 4))) = 1 - (2 - (-1)) = 1 - 3 = -2
    expect(rightFold).toBe(-2)
  })

  it("should implement foldLeft and foldRight correctly", () => {
    const stack = Stack([1, 2, 3])

    const resultLeft = stack.foldLeft(0)((acc: number, val: number) => acc + val)
    expect(resultLeft).toBe(6)

    const resultRight = stack.foldRight(0)((val: number, acc: number) => val + acc)
    expect(resultRight).toBe(6)
  })

  it("should implement match correctly", () => {
    const emptyStack = Stack<number>([])
    const nonEmptyStack = Stack([1, 2, 3])

    const emptyResult = emptyStack.match({
      Empty: () => "empty",
      NonEmpty: (values: number[]) => `has ${values.length} items`,
    })

    const nonEmptyResult = nonEmptyStack.match({
      Empty: () => "empty",
      NonEmpty: (values: number[]) => `has ${values.length} items`,
    })

    expect(emptyResult).toBe("empty")
    expect(nonEmptyResult).toBe("has 3 items")
  })

  it("should implement fold correctly", () => {
    const emptyStack = Stack<number>([])
    const nonEmptyStack = Stack([1, 2, 3])

    const emptyResult = emptyStack.fold(
      () => "empty",
      (value: number) => `top: ${value}`,
    )

    const nonEmptyResult = nonEmptyStack.fold(
      () => "empty",
      (value: number) => `top: ${value}`,
    )

    expect(emptyResult).toBe("empty")
    expect(nonEmptyResult).toBe("top: 3") // Top value is 3
  })

  it("should convert to list correctly", () => {
    const stack = Stack([1, 2, 3])
    const list = stack.toList()

    expect(list.toArray()).toEqual([1, 2, 3])
  })

  it("should serialize and deserialize correctly", () => {
    const stack = Stack([1, 2, 3])
    const json = stack.serialize().toJSON()
    const recreated = Stack.fromJSON<number>(json)

    expect(recreated.toArray()).toEqual([1, 2, 3])
  })
})
