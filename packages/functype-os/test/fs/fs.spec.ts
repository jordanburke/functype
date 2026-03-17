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

  describe("stat", () => {
    it("should return Ok with FileInfo for existing file", async () => {
      const result = await Fs.stat(testFile)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        const info = result.value
        expect(info.isFile).toBe(true)
        expect(info.isDirectory).toBe(false)
        expect(info.size).toBeGreaterThan(0)
        expect(info.modifiedAt).toBeInstanceOf(Date)
      }
    })

    it("should return Ok with FileInfo for directory", async () => {
      const result = await Fs.stat(tmpDir)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.isDirectory).toBe(true)
        expect(result.value.isFile).toBe(false)
      }
    })

    it("should return Err for non-existing path", async () => {
      const result = await Fs.stat(path.join(tmpDir, "nope"))
      expect(result.isErr()).toBe(true)
    })
  })

  describe("copyFile", () => {
    it("should copy file and return Ok(undefined)", async () => {
      const dest = path.join(tmpDir, "copied.txt")
      const result = await Fs.copyFile(testFile, dest)
      expect(result.isOk()).toBe(true)
      expect(fs.readFileSync(dest, "utf8")).toBe(testContent)
    })

    it("should return Err when source does not exist", async () => {
      const result = await Fs.copyFile(path.join(tmpDir, "nope.txt"), path.join(tmpDir, "dest.txt"))
      expect(result.isErr()).toBe(true)
    })
  })

  describe("rename", () => {
    it("should rename file and return Ok(undefined)", async () => {
      const src = path.join(tmpDir, "rename-src.txt")
      const dest = path.join(tmpDir, "rename-dest.txt")
      fs.writeFileSync(src, "rename me")
      const result = await Fs.rename(src, dest)
      expect(result.isOk()).toBe(true)
      expect(fs.existsSync(src)).toBe(false)
      expect(fs.readFileSync(dest, "utf8")).toBe("rename me")
    })

    it("should return Err when source does not exist", async () => {
      const result = await Fs.rename(path.join(tmpDir, "nope.txt"), path.join(tmpDir, "dest.txt"))
      expect(result.isErr()).toBe(true)
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

  describe("statSync", () => {
    it("should return Right with FileInfo for existing file", () => {
      const result = Fs.statSync(testFile)
      expect(result.isRight()).toBe(true)
      if (result.isRight()) {
        expect(result.value.isFile).toBe(true)
        expect(result.value.size).toBeGreaterThan(0)
      }
    })

    it("should return Left for non-existing path", () => {
      const result = Fs.statSync(path.join(tmpDir, "nope"))
      expect(result.isLeft()).toBe(true)
    })
  })

  describe("copyFileSync", () => {
    it("should copy file and return Right(undefined)", () => {
      const dest = path.join(tmpDir, "copied-sync.txt")
      const result = Fs.copyFileSync(testFile, dest)
      expect(result.isRight()).toBe(true)
      expect(fs.readFileSync(dest, "utf8")).toBe(testContent)
    })
  })

  describe("renameSync", () => {
    it("should rename file and return Right(undefined)", () => {
      const src = path.join(tmpDir, "rename-sync-src.txt")
      const dest = path.join(tmpDir, "rename-sync-dest.txt")
      fs.writeFileSync(src, "rename sync")
      const result = Fs.renameSync(src, dest)
      expect(result.isRight()).toBe(true)
      expect(fs.existsSync(src)).toBe(false)
      expect(fs.readFileSync(dest, "utf8")).toBe("rename sync")
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

  describe("writeFile", () => {
    it("should write content and return Ok(undefined)", async () => {
      const target = path.join(tmpDir, "write-test.txt")
      const result = await Fs.writeFile(target, "written content")
      expect(result.isOk()).toBe(true)
      expect(fs.readFileSync(target, "utf8")).toBe("written content")
    })

    it("should return Err for invalid path", async () => {
      const result = await Fs.writeFile("/no-such-dir/file.txt", "data")
      expect(result.isErr()).toBe(true)
    })
  })

  describe("writeFileSync", () => {
    it("should write content and return Right(undefined)", () => {
      const target = path.join(tmpDir, "write-sync-test.txt")
      const result = Fs.writeFileSync(target, "sync content")
      expect(result.isRight()).toBe(true)
      expect(fs.readFileSync(target, "utf8")).toBe("sync content")
    })

    it("should return Left for invalid path", () => {
      const result = Fs.writeFileSync("/no-such-dir/file.txt", "data")
      expect(result.isLeft()).toBe(true)
    })
  })

  describe("mkdir", () => {
    it("should create directory and return Ok(undefined)", async () => {
      const target = path.join(tmpDir, "new-dir")
      const result = await Fs.mkdir(target)
      expect(result.isOk()).toBe(true)
      expect(fs.statSync(target).isDirectory()).toBe(true)
    })

    it("should create nested directories with recursive option", async () => {
      const target = path.join(tmpDir, "a", "b", "c")
      const result = await Fs.mkdir(target, { recursive: true })
      expect(result.isOk()).toBe(true)
      expect(fs.statSync(target).isDirectory()).toBe(true)
    })

    it("should return Err for invalid path without recursive", async () => {
      const result = await Fs.mkdir(path.join(tmpDir, "x", "y", "z"))
      expect(result.isErr()).toBe(true)
    })
  })

  describe("mkdirSync", () => {
    it("should create directory and return Right(undefined)", () => {
      const target = path.join(tmpDir, "new-dir-sync")
      const result = Fs.mkdirSync(target)
      expect(result.isRight()).toBe(true)
      expect(fs.statSync(target).isDirectory()).toBe(true)
    })

    it("should create nested directories with recursive", () => {
      const target = path.join(tmpDir, "d", "e", "f")
      const result = Fs.mkdirSync(target, { recursive: true })
      expect(result.isRight()).toBe(true)
      expect(fs.statSync(target).isDirectory()).toBe(true)
    })
  })

  describe("unlink", () => {
    it("should delete file and return Ok(undefined)", async () => {
      const target = path.join(tmpDir, "to-delete.txt")
      fs.writeFileSync(target, "delete me")
      const result = await Fs.unlink(target)
      expect(result.isOk()).toBe(true)
      expect(fs.existsSync(target)).toBe(false)
    })

    it("should return Err for non-existing file", async () => {
      const result = await Fs.unlink(path.join(tmpDir, "no-exist.txt"))
      expect(result.isErr()).toBe(true)
    })
  })

  describe("unlinkSync", () => {
    it("should delete file and return Right(undefined)", () => {
      const target = path.join(tmpDir, "to-delete-sync.txt")
      fs.writeFileSync(target, "delete me")
      const result = Fs.unlinkSync(target)
      expect(result.isRight()).toBe(true)
      expect(fs.existsSync(target)).toBe(false)
    })

    it("should return Left for non-existing file", () => {
      const result = Fs.unlinkSync(path.join(tmpDir, "no-exist-sync.txt"))
      expect(result.isLeft()).toBe(true)
    })
  })
})
