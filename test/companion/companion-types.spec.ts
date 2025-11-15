import { describe, expect, it } from "vitest"

import { Companion, type CompanionMethods, isCompanion, type InstanceType } from "@/companion"
import { Option } from "@/option"

describe("CompanionTypes", () => {
  describe("isCompanion", () => {
    it("should return true for Companion objects", () => {
      expect(isCompanion(Option)).toBe(true)
    })

    it("should return false for regular functions", () => {
      const regularFn = () => "test"
      expect(isCompanion(regularFn)).toBe(false)
    })

    it("should return false for plain objects", () => {
      const plainObject = { key: "value" }
      expect(isCompanion(plainObject)).toBe(false)
    })

    it("should return false for null/undefined", () => {
      expect(isCompanion(null)).toBe(false)
      expect(isCompanion(undefined)).toBe(false)
    })

    it("should return true for custom Companion objects", () => {
      const CustomConstructor = (value: string) => ({ value, toUpper: () => value.toUpperCase() })
      const CustomCompanion = { from: (v: string) => CustomConstructor(v) }
      const Custom = Companion(CustomConstructor, CustomCompanion)

      expect(isCompanion(Custom)).toBe(true)
    })
  })

  describe("CompanionMethods type", () => {
    it("should extract companion methods from Option", () => {
      type OptionCompanionMethods = CompanionMethods<typeof Option>

      // This is a compile-time test - if it compiles, the type works correctly
      const methods: OptionCompanionMethods = {
        from: Option.from,
        none: Option.none,
        isSome: Option.isSome,
        isNone: Option.isNone,
        fromJSON: Option.fromJSON,
        fromYAML: Option.fromYAML,
        fromBinary: Option.fromBinary,
      }

      expect(methods.from).toBeDefined()
      expect(methods.none).toBeDefined()
      expect(methods.fromJSON).toBeDefined()
    })
  })

  describe("InstanceType type", () => {
    it("should extract instance type from Option constructor", () => {
      // Compile-time test: InstanceType<typeof Option> should be Option<unknown>
      type OptionInstance = InstanceType<typeof Option>

      const someValue: OptionInstance = Option(42)
      const noneValue: OptionInstance = Option(null)

      expect(someValue.isSome()).toBe(true)
      expect(noneValue.isNone()).toBe(true)
    })

    it("should work with custom Companion objects", () => {
      const CustomConstructor = (value: string) => ({
        value,
        toUpper: () => value.toUpperCase(),
        map: <U>(f: (v: string) => U) => ({ value: f(value) }),
      })
      const CustomCompanion = { from: (v: string) => CustomConstructor(v) }
      const Custom = Companion(CustomConstructor, CustomCompanion)

      type CustomInstance = InstanceType<typeof Custom>

      const instance: CustomInstance = Custom("hello")

      expect(instance.value).toBe("hello")
      expect(instance.toUpper()).toBe("HELLO")
    })
  })

  describe("Integration tests", () => {
    it("should work with Companion pattern for creating custom types", () => {
      // Create a custom type using Companion
      interface Box<T> {
        value: T
        map: <U>(f: (value: T) => U) => Box<U>
        unwrap: () => T
      }

      const BoxConstructor = <T>(value: T): Box<T> => ({
        value,
        map: <U>(f: (value: T) => U): Box<U> => BoxConstructor(f(value)),
        unwrap: () => value,
      })

      const BoxCompanion = {
        of: <T>(value: T) => BoxConstructor(value),
        empty: <T>() => BoxConstructor(undefined as T),
      }

      const Box = Companion(BoxConstructor, BoxCompanion)

      // Verify it's a Companion
      expect(isCompanion(Box)).toBe(true)

      // Extract types
      type BoxMethods = CompanionMethods<typeof Box>
      type BoxInst = InstanceType<typeof Box>

      // Use the companion methods
      const box1: BoxInst = Box(10)
      const box2: BoxInst = Box.of(20)

      expect(box1.unwrap()).toBe(10)
      expect(box2.unwrap()).toBe(20)
      expect(box1.map((x) => x * 2).unwrap()).toBe(20)

      // Verify companion methods are accessible
      const methods: BoxMethods = {
        of: Box.of,
        empty: Box.empty,
      }
      expect(methods.of).toBeDefined()
      expect(methods.empty).toBeDefined()
    })
  })
})
