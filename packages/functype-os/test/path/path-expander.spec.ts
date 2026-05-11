import * as os from "node:os"
import * as path from "node:path"

import { describe, expect, it } from "vitest"

import { expandPath, expandTilde, expandVars, Path } from "../../src/path"

describe("PathExpander", () => {
  describe("expandTilde", () => {
    it("should expand ~ to home directory", () => {
      expect(expandTilde("~")).toBe(os.homedir())
    })

    it("should expand ~/path to home + path", () => {
      const result = expandTilde("~/Documents")
      expect(result).toBe(path.join(os.homedir(), "Documents"))
    })

    it("should not expand paths without tilde", () => {
      expect(expandTilde("/usr/local")).toBe("/usr/local")
    })

    it("should not expand tilde in the middle of a path", () => {
      expect(expandTilde("/home/~user")).toBe("/home/~user")
    })
  })

  describe("expandVars", () => {
    it("should expand $VAR syntax", () => {
      process.env["TEST_PATH_VAR"] = "/tmp/test"
      const result = expandVars("$TEST_PATH_VAR/file.txt")
      expect(result.isRight()).toBe(true)
      expect(result.orElse("")).toBe("/tmp/test/file.txt")
      delete process.env["TEST_PATH_VAR"]
    })

    it("should expand ${VAR} syntax", () => {
      process.env["TEST_BRACED_VAR"] = "/opt"
      const result = expandVars("${TEST_BRACED_VAR}/bin")
      expect(result.isRight()).toBe(true)
      expect(result.orElse("")).toBe("/opt/bin")
      delete process.env["TEST_BRACED_VAR"]
    })

    it("should return Left for unresolved variables", () => {
      const result = expandVars("$UNRESOLVED_VAR_XYZ/path")
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        expect(result.value._tag).toBe("PathError")
        expect(result.value.reason).toBe("unresolved_variable")
      }
    })

    it("should handle multiple variables", () => {
      process.env["TEST_A"] = "aaa"
      process.env["TEST_B"] = "bbb"
      const result = expandVars("$TEST_A/$TEST_B")
      expect(result.isRight()).toBe(true)
      expect(result.orElse("")).toBe("aaa/bbb")
      delete process.env["TEST_A"]
      delete process.env["TEST_B"]
    })

    it("should pass through strings without variables", () => {
      const result = expandVars("/plain/path")
      expect(result.isRight()).toBe(true)
      expect(result.orElse("")).toBe("/plain/path")
    })
  })

  describe("expandPath", () => {
    it("should expand tilde and resolve to absolute", () => {
      const result = expandPath("~/test")
      expect(result.isRight()).toBe(true)
      const expanded = result.orElse("")
      expect(path.isAbsolute(expanded)).toBe(true)
      expect(expanded).toBe(path.resolve(path.join(os.homedir(), "test")))
    })

    it("should expand vars and resolve to absolute", () => {
      process.env["TEST_EXPAND"] = "/tmp"
      const result = expandPath("$TEST_EXPAND/sub")
      expect(result.isRight()).toBe(true)
      expect(result.orElse("")).toBe(path.resolve("/tmp/sub"))
      delete process.env["TEST_EXPAND"]
    })

    it("should return Left for unresolved vars", () => {
      const result = expandPath("$NO_SUCH_VAR/file")
      expect(result.isLeft()).toBe(true)
    })
  })

  describe("Path helpers", () => {
    it("join should join segments", () => {
      expect(Path.join("a", "b", "c")).toBe(path.join("a", "b", "c"))
    })

    it("resolve should resolve to absolute", () => {
      expect(path.isAbsolute(Path.resolve("relative"))).toBe(true)
    })

    it("dirname should return directory", () => {
      expect(Path.dirname("/a/b/c.txt")).toBe("/a/b")
    })

    it("basename should return filename", () => {
      expect(Path.basename("/a/b/c.txt")).toBe("c.txt")
    })

    it("extname should return extension", () => {
      expect(Path.extname("file.ts")).toBe(".ts")
    })

    it("isAbsolute should detect absolute paths", () => {
      expect(Path.isAbsolute("/absolute")).toBe(true)
      expect(Path.isAbsolute("relative")).toBe(false)
    })
  })
})
