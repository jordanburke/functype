import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { Fs } from "../../src/fs"

describe("Fs", () => {
  let tmpDir: string
  let testFile: string
  let testContent: string

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "functype-os-test-"))
    testFile = path.join(tmpDir, "test.txt")
    testContent = "hello functype-os"
    fs.writeFileSync(testFile, testContent, "utf8")
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe("exists", () => {
    it("should return Ok(true) for existing file", async () => {
      const result = await Fs.exists(testFile)
      expect(result.isOk()).toBe(true)
      expect(result.value).toBe(true)
    })

    it("should return Ok(false) for non-existing file", async () => {
      const result = await Fs.exists(path.join(tmpDir, "nope.txt"))
      expect(result.isOk()).toBe(true)
      expect(result.value).toBe(false)
    })
  })

  describe("readFile", () => {
    it("should return Ok with file content", async () => {
      const result = await Fs.readFile(testFile)
      expect(result.isOk()).toBe(true)
      expect(result.value).toBe(testContent)
    })

    it("should return Err for non-existing file", async () => {
      const result = await Fs.readFile(path.join(tmpDir, "missing.txt"))
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toContain("readFile")
      }
    })
  })

  describe("readFileOpt", () => {
    it("should return Ok(Some) for existing file", async () => {
      const result = await Fs.readFileOpt(testFile)
      expect(result.isOk()).toBe(true)
      const opt = result.value
      expect(opt.isSome()).toBe(true)
      expect(opt.orElse("")).toBe(testContent)
    })

    it("should return Ok(None) for ENOENT", async () => {
      const result = await Fs.readFileOpt(path.join(tmpDir, "missing.txt"))
      expect(result.isOk()).toBe(true)
      expect(result.value.isNone()).toBe(true)
    })
  })

  describe("readdir", () => {
    it("should return Ok with List of entries", async () => {
      const result = await Fs.readdir(tmpDir)
      expect(result.isOk()).toBe(true)
      const entries = result.value.toArray()
      expect(entries).toContain("test.txt")
    })

    it("should return Err for non-existing directory", async () => {
      const result = await Fs.readdir(path.join(tmpDir, "no-such-dir"))
      expect(result.isErr()).toBe(true)
    })
  })

  describe("existsSync", () => {
    it("should return true for existing file", () => {
      expect(Fs.existsSync(testFile)).toBe(true)
    })

    it("should return false for non-existing file", () => {
      expect(Fs.existsSync(path.join(tmpDir, "nope.txt"))).toBe(false)
    })
  })

  describe("readFileSync", () => {
    it("should return Right with file content", () => {
      const result = Fs.readFileSync(testFile)
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(testContent)
    })

    it("should return Left for non-existing file", () => {
      const result = Fs.readFileSync(path.join(tmpDir, "missing.txt"))
      expect(result.isLeft()).toBe(true)
    })
  })

  describe("readFileOptSync", () => {
    it("should return Right(Some) for existing file", () => {
      const result = Fs.readFileOptSync(testFile)
      expect(result.isRight()).toBe(true)
      expect(result.value.isSome()).toBe(true)
      expect(result.value.orElse("")).toBe(testContent)
    })

    it("should return Right(None) for ENOENT", () => {
      const result = Fs.readFileOptSync(path.join(tmpDir, "missing.txt"))
      expect(result.isRight()).toBe(true)
      expect(result.value.isNone()).toBe(true)
    })
  })

  describe("readdirSync", () => {
    it("should return Right with List of entries", () => {
      const result = Fs.readdirSync(tmpDir)
      expect(result.isRight()).toBe(true)
      expect(result.value.toArray()).toContain("test.txt")
    })

    it("should return Left for non-existing directory", () => {
      const result = Fs.readdirSync(path.join(tmpDir, "no-such-dir"))
      expect(result.isLeft()).toBe(true)
    })
  })
})
