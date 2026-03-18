import { describe, expect, it } from "vitest"

import { Process } from "../../src/process"

describe("Process", () => {
  describe("exec", () => {
    it("should execute command and return Ok with ExecResult", async () => {
      const result = await Process.exec("echo hello")
      expect(result.isOk()).toBe(true)
      expect(result.value.stdout.trim()).toBe("hello")
      expect(result.value.exitCode).toBe(0)
    })

    it("should return Err for failing command", async () => {
      const result = await Process.exec("node -e 'process.exit(1)'")
      expect(result.isErr()).toBe(true)
    })

    it("should respect cwd option", async () => {
      const result = await Process.exec("pwd", { cwd: "/tmp" })
      expect(result.isOk()).toBe(true)
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
