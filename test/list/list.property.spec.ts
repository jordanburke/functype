import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { List } from "../../src"

describe("List - Property-based tests", () => {
  describe("List construction properties", () => {
    it("should properly create a List from an array", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (values) => {
          const list = List(values)
          expect(list.toArray()).toEqual(values)
          expect(list.size).toBe(values.length)
        }),
      )
    })

    it("should properly create an empty List", () => {
      const emptyList = List([])
      expect(emptyList.isEmpty).toBe(true)
      expect(emptyList.size).toBe(0)
      expect(emptyList.toArray()).toEqual([])
    })
  })

  describe("List laws", () => {
    // Identity law: map(x => x) === identity
    it("should satisfy identity law", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (values) => {
          const list = List(values)
          const mapped = list.map((x) => x)
          expect(mapped.toArray()).toEqual(list.toArray())
        }),
      )
    })

    // Composition law: map(f).map(g) === map(x => g(f(x)))
    it("should satisfy composition law", () => {
      const f = (s: string) => s.length
      const g = (n: number) => n * 2

      fc.assert(
        fc.property(fc.array(fc.string()), (values) => {
          const list = List(values)

          // First approach: map(f).map(g)
          const result1 = list.map(f).map(g)

          // Second approach: map(x => g(f(x)))
          const result2 = list.map((x) => g(f(x)))

          expect(result1.toArray()).toEqual(result2.toArray())
        }),
      )
    })

    // Associativity law for flatMap: flatMap(f).flatMap(g) === flatMap(x => f(x).flatMap(g))
    it("should satisfy flatMap associativity law", () => {
      // Create functions that return Lists
      const f = (x: string) => List([x, x + "!"])
      const g = (x: string) => List([x, x.toUpperCase()])

      fc.assert(
        fc.property(fc.array(fc.string()), (values) => {
          const list = List(values)

          // First approach: flatMap(f).flatMap(g)
          const result1 = list.flatMap(f).flatMap(g)

          // Second approach: flatMap(x => f(x).flatMap(g))
          const result2 = list.flatMap((x) => f(x).flatMap(g))

          expect(result1.toArray()).toEqual(result2.toArray())
        }),
      )
    })
  })

  describe("List operations properties", () => {
    // filter should only keep elements that satisfy the predicate
    it("should properly filter elements", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (values) => {
          const list = List(values)
          const isEven = (n: number) => n % 2 === 0
          const filtered = list.filter(isEven)

          // Check that all elements in the filtered list are even
          expect(filtered.toArray().every(isEven)).toBe(true)

          // Check that the filtered list contains all even elements from the original list
          const originalEvenElements = values.filter(isEven)
          expect(filtered.toArray()).toEqual(originalEvenElements)
        }),
      )
    })

    // foldLeft should correctly accumulate values
    it("should properly fold elements", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (values) => {
          const list = List(values)
          const sum = list.foldLeft(0)((acc, val) => acc + val)

          // Check that the sum is correct
          const expectedSum = values.reduce((acc, val) => acc + val, 0)
          expect(sum).toBe(expectedSum)
        }),
      )
    })

    // add should add an element to the end of the list
    it("should properly add elements", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), fc.string(), (values, newValue) => {
          const list = List(values)
          const appended = list.add(newValue)

          // Check that the appended list has the new element at the end
          const expectedArray = [...values, newValue]
          expect(appended.toArray()).toEqual(expectedArray)

          // Check that the original list is unchanged (immutability)
          expect(list.toArray()).toEqual(values)
        }),
      )
    })

    // concat should combine two lists
    it("should properly concatenate lists", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), fc.array(fc.string()), (values1, values2) => {
          const list1 = List(values1)
          const list2 = List(values2)
          const concatenated = list1.concat(list2)

          // Check that the concatenated list has all elements from both lists
          const expectedArray = [...values1, ...values2]
          expect(concatenated.toArray()).toEqual(expectedArray)

          // Check that the original lists are unchanged (immutability)
          expect(list1.toArray()).toEqual(values1)
          expect(list2.toArray()).toEqual(values2)
        }),
      )
    })
  })

  describe("List immutability properties", () => {
    // All operations should return new lists without modifying the original
    it("should maintain immutability for all operations", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), fc.string(), (values, newValue) => {
          const original = List(values)
          const originalArray = [...values]

          // Perform various operations
          original.map((x) => x.toUpperCase())
          original.filter((x) => x.length > 2)
          original.add(newValue)
          original.concat(List([newValue]))
          original.foldLeft("")((acc, val) => acc + val)

          // Check that the original list is unchanged
          expect(original.toArray()).toEqual(originalArray)
        }),
      )
    })
  })
})
