import { describe, expect, it } from "vitest"

import {
  createCustomSerializer,
  createSerializer,
  createSerializationCompanion,
  createTaggedSerializer,
  envelope,
  FUNCTYPE_MARKER,
  fromBinary,
  fromJSON,
  fromYAML,
  taggedEnvelope,
} from "@/serialization"

describe("SerializationCompanion", () => {
  describe("createSerializer (variant-less form)", () => {
    it("stamps the @functype marker and emits {marker, _tag=marker, value}", () => {
      const serializer = createSerializer("Test", { foo: "bar" })

      expect(serializer.toJSON()).toBe('{"@functype":"Test","_tag":"Test","value":{"foo":"bar"}}')
      expect(serializer.toYAML()).toContain("@functype: Test")
      expect(serializer.toYAML()).toContain("_tag: Test")
      expect(serializer.toYAML()).toContain('value: {"foo":"bar"}')
    })

    it("handles null values", () => {
      const serializer = createSerializer("Marker", null)

      expect(serializer.toJSON()).toBe('{"@functype":"Marker","_tag":"Marker","value":null}')
      expect(serializer.toYAML()).toBe("@functype: Marker\n_tag: Marker\nvalue: null")
    })

    it("handles primitive values", () => {
      expect(createSerializer("Number", 42).toJSON()).toBe('{"@functype":"Number","_tag":"Number","value":42}')
      expect(createSerializer("String", "hello").toJSON()).toBe(
        '{"@functype":"String","_tag":"String","value":"hello"}',
      )
      expect(createSerializer("Bool", true).toJSON()).toBe('{"@functype":"Bool","_tag":"Bool","value":true}')
    })

    it("emits base64-encoded JSON via toBinary", () => {
      const serializer = createSerializer("Test", "data")
      const decoded = Buffer.from(serializer.toBinary(), "base64").toString()
      expect(decoded).toBe('{"@functype":"Test","_tag":"Test","value":"data"}')
    })
  })

  describe("createSerializer (variant form)", () => {
    it("emits {marker, _tag, value} when called with three args", () => {
      const serializer = createSerializer("Either", "Right", 5)

      expect(serializer.toJSON()).toBe('{"@functype":"Either","_tag":"Right","value":5}')
      expect(serializer.toYAML()).toContain("@functype: Either")
      expect(serializer.toYAML()).toContain("_tag: Right")
      expect(serializer.toYAML()).toContain("value: 5")
    })

    it("round-trips a variant envelope through binary", () => {
      const serializer = createSerializer("Option", "Some", "hello")
      const decoded = Buffer.from(serializer.toBinary(), "base64").toString()
      expect(decoded).toBe('{"@functype":"Option","_tag":"Some","value":"hello"}')
    })
  })

  describe("createTaggedSerializer", () => {
    it("merges arbitrary fields into the envelope under marker + _tag", () => {
      const serializer = createTaggedSerializer("Try", "Failure", {
        error: { name: "TypeError", message: "boom" },
      })

      const json = JSON.parse(serializer.toJSON()) as Record<string, unknown>
      expect(json[FUNCTYPE_MARKER]).toBe("Try")
      expect(json._tag).toBe("Failure")
      expect(json.error).toEqual({ name: "TypeError", message: "boom" })
    })
  })

  describe("envelope / taggedEnvelope helpers (object form)", () => {
    it("envelope() returns the same shape createSerializer stringifies", () => {
      const obj = envelope("Option", "Some", 30)
      expect(obj).toEqual({ [FUNCTYPE_MARKER]: "Option", _tag: "Some", value: 30 })
    })

    it("envelope() defaults _tag to marker when tag is undefined (variant-less)", () => {
      const obj = envelope("List", undefined, [1, 2, 3])
      expect(obj).toEqual({ [FUNCTYPE_MARKER]: "List", _tag: "List", value: [1, 2, 3] })
    })

    it("taggedEnvelope() merges arbitrary fields", () => {
      const obj = taggedEnvelope("Task", "Err", { error: { name: "Error", message: "x" } })
      expect(obj[FUNCTYPE_MARKER]).toBe("Task")
      expect(obj._tag).toBe("Err")
      expect(obj.error).toEqual({ name: "Error", message: "x" })
    })
  })

  describe("createCustomSerializer (deprecated, retained for back-compat)", () => {
    it("emits the data verbatim — no @functype marker added", () => {
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

    it("handles complex nested objects", () => {
      const data = {
        _tag: "Complex",
        nested: { a: 1, b: 2 },
        array: [1, 2, 3],
      }

      const json = createCustomSerializer(data).toJSON()
      expect(json).toContain('"_tag":"Complex"')
      expect(json).toContain('"nested":{"a":1,"b":2}')
      expect(json).toContain('"array":[1,2,3]')
    })
  })

  describe("fromJSON", () => {
    it("passes the parsed envelope to the reconstructor", () => {
      const json = '{"@functype":"Test","value":42}'

      const result = fromJSON(json, (parsed) => {
        expect(parsed[FUNCTYPE_MARKER]).toBe("Test")
        expect(parsed.value).toBe(42)
        return { marker: parsed[FUNCTYPE_MARKER] as string, data: parsed.value as number }
      })

      expect(result.marker).toBe("Test")
      expect(result.data).toBe(42)
    })

    it("handles null values in JSON", () => {
      const json = '{"@functype":"None","value":null}'
      const result = fromJSON(json, (parsed) => ({ isEmpty: parsed.value === null }))
      expect(result.isEmpty).toBe(true)
    })
  })

  describe("fromYAML", () => {
    it("parses simple YAML envelopes", () => {
      const yaml = "@functype: Test\nvalue: 42"
      const result = fromYAML(yaml, (parsed) => ({
        marker: parsed[FUNCTYPE_MARKER] as string,
        data: parsed.value as number,
      }))
      expect(result.marker).toBe("Test")
      expect(result.data).toBe(42)
    })

    it("parses variant YAML envelopes", () => {
      const yaml = "@functype: Either\n_tag: Right\nvalue: 7"
      const result = fromYAML(yaml, (parsed) => ({
        marker: parsed[FUNCTYPE_MARKER] as string,
        tag: parsed._tag as string,
        value: parsed.value as number,
      }))
      expect(result.marker).toBe("Either")
      expect(result.tag).toBe("Right")
      expect(result.value).toBe(7)
    })

    it("parses JSON values embedded in YAML", () => {
      const yaml = "@functype: List\nvalue: [1,2,3]"
      const result = fromYAML(yaml, (parsed) => ({ items: parsed.value as number[] }))
      expect(result.items).toEqual([1, 2, 3])
    })
  })

  describe("fromBinary", () => {
    it("decodes base64-encoded JSON envelopes", () => {
      const json = '{"@functype":"Test","value":"hello"}'
      const binary = Buffer.from(json).toString("base64")
      const result = fromBinary(binary, (parsed) => ({
        marker: parsed[FUNCTYPE_MARKER] as string,
        data: parsed.value as string,
      }))
      expect(result.marker).toBe("Test")
      expect(result.data).toBe("hello")
    })

    it("handles complex data in binary format", () => {
      const json = '{"@functype":"Complex","value":{"nested":true,"count":5}}'
      const binary = Buffer.from(json).toString("base64")
      const result = fromBinary(binary, (parsed) => parsed.value as { nested: boolean; count: number })
      expect(result.nested).toBe(true)
      expect(result.count).toBe(5)
    })
  })

  describe("createSerializationCompanion", () => {
    it("creates companion methods for a type", () => {
      interface MyType {
        value: number
      }

      const reconstructor = (parsed: { [key: string]: unknown }): MyType => ({
        value: parsed.value as number,
      })

      const companion = createSerializationCompanion(reconstructor)

      expect(companion.fromJSON).toBeDefined()
      expect(companion.fromYAML).toBeDefined()
      expect(companion.fromBinary).toBeDefined()

      const json = '{"@functype":"MyType","value":42}'
      expect(companion.fromJSON(json).value).toBe(42)

      const yaml = "@functype: MyType\nvalue: 100"
      expect(companion.fromYAML(yaml).value).toBe(100)

      const binary = Buffer.from(json).toString("base64")
      expect(companion.fromBinary(binary).value).toBe(42)
    })

    it("supports custom reconstruction logic", () => {
      interface Person {
        name: string
        age: number
      }

      const reconstructor = (parsed: { [key: string]: unknown }): Person => {
        const data = parsed.value as { name: string; age: number }
        return {
          name: data.name.toUpperCase(),
          age: data.age,
        }
      }

      const companion = createSerializationCompanion(reconstructor)
      const json = '{"@functype":"Person","value":{"name":"alice","age":30}}'
      const result = companion.fromJSON(json)

      expect(result.name).toBe("ALICE")
      expect(result.age).toBe(30)
    })
  })

  describe("Round-trip serialization", () => {
    it("supports JSON round-trip (variant-less)", () => {
      const original = { foo: "bar", num: 42 }
      const json = createSerializer("Test", original).toJSON()
      const reconstructed = fromJSON(json, (parsed) => parsed.value as typeof original)
      expect(reconstructed).toEqual(original)
    })

    it("supports YAML round-trip for simple values", () => {
      const yaml = createSerializer("Number", 123).toYAML()
      const reconstructed = fromYAML(yaml, (parsed) => parsed.value as number)
      expect(reconstructed).toBe(123)
    })

    it("supports binary round-trip", () => {
      const original = { data: "test", flag: true }
      const binary = createSerializer("Complex", original).toBinary()
      const reconstructed = fromBinary(binary, (parsed) => parsed.value as typeof original)
      expect(reconstructed).toEqual(original)
    })

    it("supports variant round-trip", () => {
      const json = createSerializer("Either", "Right", 5).toJSON()
      const parsed = JSON.parse(json) as Record<string, unknown>
      expect(parsed[FUNCTYPE_MARKER]).toBe("Either")
      expect(parsed._tag).toBe("Right")
      expect(parsed.value).toBe(5)
    })
  })
})
