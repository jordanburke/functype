import { describe, expect, it } from "vitest"

import { Process } from "../../src/process"

describe("Process", () => {
  describe("exec", () => {
    it("returns a Left, not a rejected run(), when the command can't start", async () => {
      // node's exec throws synchronously on a NUL byte in the command (ERR_INVALID_ARG_VALUE).
      const result = await Process.exec("echo a\u0000b").run()
      expect(result.isLeft()).toBe(true)
      expect(result.isLeft() && result.value.message).toMatch(/null bytes|ERR_INVALID_ARG_VALUE|argument/i)
    })

    it("should execute command and return Ok with ExecResult", async () => {
      const result = await Process.exec("echo hello").run()
      expect(result.isRight()).toBe(true)
      expect(result.value.stdout.trim()).toBe("hello")
      expect(result.value.exitCode).toBe(0)
    })

    it("should return Err for failing command", async () => {
      const result = await Process.exec("node -e 'process.exit(1)'").run()
      expect(result.isLeft()).toBe(true)
    })

    it("should respect cwd option", async () => {
      const result = await Process.exec("pwd", { cwd: "/tmp" }).run()
      expect(result.isRight()).toBe(true)
      expect(result.value.stdout.trim()).toMatch(/tmp/)
    })
  })

  describe("execSync", () => {
    it("should execute command and return Right with ExecResult", () => {
      const result = Process.execSync("echo hello")
      expect(result.isRight()).toBe(true)
      expect(result.value.stdout.trim()).toBe("hello")
      expect(result.value.exitCode).toBe(0)
    })

    it("should return Left for failing command", () => {
      const result = Process.execSync("node -e 'process.exit(1)'")
      expect(result.isLeft()).toBe(true)
    })

    it("should respect cwd option", () => {
      const result = Process.execSync("pwd", { cwd: "/tmp" })
      expect(result.isRight()).toBe(true)
      expect(result.value.stdout.trim()).toMatch(/tmp/)
    })
  })
})
