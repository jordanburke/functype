import { describe, expect, it } from "vitest"

import {
  createCustomSerializer,
  createSerializer,
  createSerializationCompanion,
  fromBinary,
  fromJSON,
  fromYAML,
} from "@/serialization"

describe("SerializationCompanion", () => {
  describe("createSerializer", () => {
    it("should create a serializer for simple values", () => {
      const serializer = createSerializer("Test", { foo: "bar" })

      expect(serializer.toJSON()).toBe('{"_tag":"Test","value":{"foo":"bar"}}')
      expect(serializer.toYAML()).toContain("_tag: Test")
      expect(serializer.toYAML()).toContain('value: {"foo":"bar"}')
    })

    it("should handle null values", () => {
      const serializer = createSerializer("None", null)

      expect(serializer.toJSON()).toBe('{"_tag":"None","value":null}')
      expect(serializer.toYAML()).toBe("_tag: None\nvalue: null")
    })

    it("should handle primitive values", () => {
      const numberSerializer = createSerializer("Number", 42)
      const stringSerializer = createSerializer("String", "hello")
      const boolSerializer = createSerializer("Bool", true)

      expect(numberSerializer.toJSON()).toBe('{"_tag":"Number","value":42}')
      expect(stringSerializer.toJSON()).toBe('{"_tag":"String","value":"hello"}')
      expect(boolSerializer.toJSON()).toBe('{"_tag":"Bool","value":true}')
    })

    it("should create binary serialization", () => {
      const serializer = createSerializer("Test", "data")
      const binary = serializer.toBinary()

      expect(binary).toBeTruthy()
      expect(typeof binary).toBe("string")

      // Verify it can be decoded
      const decoded = Buffer.from(binary, "base64").toString()
      expect(decoded).toBe('{"_tag":"Test","value":"data"}')
    })
  })

  describe("createCustomSerializer", () => {
    it("should serialize custom objects", () => {
      const data = {
        _tag: "Custom",
        value: 123,
        metadata: "test",
      }

      const serializer = createCustomSerializer(data)

      expect(serializer.toJSON()).toBe('{"_tag":"Custom","value":123,"metadata":"test"}')
      expect(serializer.toYAML()).toContain('_tag: "Custom"')
      expect(serializer.toYAML()).toContain("value: 123")
      expect(serializer.toYAML()).toContain('metadata: "test"')
    })

    it("should handle complex nested objects", () => {
      const data = {
        _tag: "Complex",
        nested: { a: 1, b: 2 },
        array: [1, 2, 3],
      }

      const serializer = createCustomSerializer(data)
      const json = serializer.toJSON()

      expect(json).toContain('"_tag":"Complex"')
      expect(json).toContain('"nested":{"a":1,"b":2}')
      expect(json).toContain('"array":[1,2,3]')
    })
  })

  describe("fromJSON", () => {
    it("should deserialize JSON with reconstructor", () => {
      const json = '{"_tag":"Test","value":42}'

      const result = fromJSON(json, (parsed) => {
        expect(parsed._tag).toBe("Test")
        expect(parsed.value).toBe(42)
        return { type: parsed._tag as string, data: parsed.value as number }
      })

      expect(result.type).toBe("Test")
      expect(result.data).toBe(42)
    })

    it("should handle null values in JSON", () => {
      const json = '{"_tag":"None","value":null}'

      const result = fromJSON(json, (parsed) => {
        return { isEmpty: parsed.value === null }
      })

      expect(result.isEmpty).toBe(true)
    })
  })

  describe("fromYAML", () => {
    it("should deserialize simple YAML", () => {
      const yaml = "_tag: Test\nvalue: 42"

      const result = fromYAML(yaml, (parsed) => {
        expect(parsed._tag).toBe("Test")
        expect(parsed.value).toBe(42)
        return { type: parsed._tag as string, data: parsed.value as number }
      })

      expect(result.type).toBe("Test")
      expect(result.data).toBe(42)
    })

    it("should handle null values in YAML", () => {
      const yaml = "_tag: None\nvalue: null"

      const result = fromYAML(yaml, (parsed) => {
        return { isEmpty: parsed.value === null || parsed.value === "null" }
      })

      expect(result.isEmpty).toBe(true)
    })

    it("should parse JSON values in YAML", () => {
      const yaml = "_tag: List\nvalue: [1,2,3]"

      const result = fromYAML(yaml, (parsed) => {
        return { items: parsed.value as number[] }
      })

      expect(result.items).toEqual([1, 2, 3])
    })
  })

  describe("fromBinary", () => {
    it("should deserialize base64-encoded JSON", () => {
      const json = '{"_tag":"Test","value":"hello"}'
      const binary = Buffer.from(json).toString("base64")

      const result = fromBinary(binary, (parsed) => {
        return { tag: parsed._tag as string, data: parsed.value as string }
      })

      expect(result.tag).toBe("Test")
      expect(result.data).toBe("hello")
    })

    it("should handle complex data in binary format", () => {
      const json = '{"_tag":"Complex","value":{"nested":true,"count":5}}'
      const binary = Buffer.from(json).toString("base64")

      const result = fromBinary(binary, (parsed) => {
        return parsed.value as { nested: boolean; count: number }
      })

      expect(result.nested).toBe(true)
      expect(result.count).toBe(5)
    })
  })

  describe("createSerializationCompanion", () => {
    it("should create companion methods for a type", () => {
      interface MyType {
        value: number
      }

      const reconstructor = (parsed: { _tag: string; [key: string]: unknown }): MyType => ({
        value: parsed.value as number,
      })

      const companion = createSerializationCompanion(reconstructor)

      expect(companion.fromJSON).toBeDefined()
      expect(companion.fromYAML).toBeDefined()
      expect(companion.fromBinary).toBeDefined()

      // Test fromJSON
      const json = '{"_tag":"MyType","value":42}'
      const result1 = companion.fromJSON(json)
      expect(result1.value).toBe(42)

      // Test fromYAML
      const yaml = "_tag: MyType\nvalue: 100"
      const result2 = companion.fromYAML(yaml)
      expect(result2.value).toBe(100)

      // Test fromBinary
      const binary = Buffer.from(json).toString("base64")
      const result3 = companion.fromBinary(binary)
      expect(result3.value).toBe(42)
    })

    it("should work with custom type reconstruction logic", () => {
      interface Person {
        name: string
        age: number
      }

      const reconstructor = (parsed: { _tag: string; [key: string]: unknown }): Person => {
        const data = parsed.value as { name: string; age: number }
        return {
          name: data.name.toUpperCase(), // Custom logic
          age: data.age,
        }
      }

      const companion = createSerializationCompanion(reconstructor)

      const json = '{"_tag":"Person","value":{"name":"alice","age":30}}'
      const result = companion.fromJSON(json)

      expect(result.name).toBe("ALICE") // Custom transformation applied
      expect(result.age).toBe(30)
    })
  })

  describe("Round-trip serialization", () => {
    it("should support JSON round-trip", () => {
      const original = { foo: "bar", num: 42 }
      const serializer = createSerializer("Test", original)
      const json = serializer.toJSON()

      const reconstructed = fromJSON(json, (parsed) => parsed.value as typeof original)

      expect(reconstructed).toEqual(original)
    })

    it("should support YAML round-trip for simple values", () => {
      const original = 123
      const serializer = createSerializer("Number", original)
      const yaml = serializer.toYAML()

      const reconstructed = fromYAML(yaml, (parsed) => parsed.value as number)

      expect(reconstructed).toBe(original)
    })

    it("should support binary round-trip", () => {
      const original = { data: "test", flag: true }
      const serializer = createSerializer("Complex", original)
      const binary = serializer.toBinary()

      const reconstructed = fromBinary(binary, (parsed) => parsed.value as typeof original)

      expect(reconstructed).toEqual(original)
    })
  })
})
