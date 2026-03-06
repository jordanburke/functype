import { describe, expect, it } from "vitest"

import { Env } from "../../src/env"

describe("Env", () => {
  describe("constructor", () => {
    it("should return Some for existing env var", () => {
      process.env["TEST_ENV_VAR"] = "hello"
      const result = Env("TEST_ENV_VAR")
      expect(result.isSome()).toBe(true)
      expect(result.orElse("")).toBe("hello")
      delete process.env["TEST_ENV_VAR"]
    })

    it("should return None for missing env var", () => {
      const result = Env("DEFINITELY_NOT_SET_12345")
      expect(result.isNone()).toBe(true)
    })
  })

  describe("get", () => {
    it("should return Some for existing var", () => {
      process.env["TEST_GET_VAR"] = "world"
      const result = Env.get("TEST_GET_VAR")
      expect(result.isSome()).toBe(true)
      expect(result.orElse("")).toBe("world")
      delete process.env["TEST_GET_VAR"]
    })

    it("should return None for missing var", () => {
      const result = Env.get("MISSING_VAR_XYZ")
      expect(result.isNone()).toBe(true)
    })
  })

  describe("getRequired", () => {
    it("should return Right for existing var", () => {
      process.env["TEST_REQ_VAR"] = "value"
      const result = Env.getRequired("TEST_REQ_VAR")
      expect(result.isRight()).toBe(true)
      expect(result.orElse("")).toBe("value")
      delete process.env["TEST_REQ_VAR"]
    })

    it("should return Left with EnvError for missing var", () => {
      const result = Env.getRequired("MISSING_REQ_VAR")
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        expect(result.value._tag).toBe("EnvError")
        expect(result.value.variable).toBe("MISSING_REQ_VAR")
      }
    })
  })

  describe("getOrDefault", () => {
    it("should return value when set", () => {
      process.env["TEST_DEFAULT_VAR"] = "actual"
      expect(Env.getOrDefault("TEST_DEFAULT_VAR", "fallback")).toBe("actual")
      delete process.env["TEST_DEFAULT_VAR"]
    })

    it("should return default when not set", () => {
      expect(Env.getOrDefault("MISSING_DEFAULT_VAR", "fallback")).toBe("fallback")
    })
  })

  describe("has", () => {
    it("should return true for existing var", () => {
      process.env["TEST_HAS_VAR"] = "yes"
      expect(Env.has("TEST_HAS_VAR")).toBe(true)
      delete process.env["TEST_HAS_VAR"]
    })

    it("should return false for missing var", () => {
      expect(Env.has("MISSING_HAS_VAR")).toBe(false)
    })
  })

  describe("entries", () => {
    it("should return a List of key-value pairs", () => {
      const entries = Env.entries()
      expect(entries.size).toBeGreaterThan(0)
      const arr = entries.toArray()
      for (const [key, value] of arr) {
        expect(typeof key).toBe("string")
        expect(typeof value).toBe("string")
      }
    })
  })
})
