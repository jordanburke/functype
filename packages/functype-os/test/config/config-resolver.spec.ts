import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { ConfigResolver } from "../../src/config"

describe("ConfigResolver", () => {
  let tmpDir: string
  let configFile: string

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "functype-os-config-"))
    configFile = path.join(tmpDir, "app.toml")
    fs.writeFileSync(configFile, "key = 'value'", "utf8")
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe("resolve", () => {
    it("should find the first existing config", async () => {
      const result = await ConfigResolver.resolve({
        candidates: ["/no/such/file.toml", configFile, "/also/missing.toml"],
      })
      expect(result.isOk()).toBe(true)
      const opt = result.value
      expect(opt.isSome()).toBe(true)
      expect(opt.orElse("")).toBe(configFile)
    })

    it("should return None when no candidates exist", async () => {
      const result = await ConfigResolver.resolve({
        candidates: ["/no/such/a.toml", "/no/such/b.toml"],
      })
      expect(result.isOk()).toBe(true)
      expect(result.value.isNone()).toBe(true)
    })

    it("should skip candidates with unresolved variables", async () => {
      const result = await ConfigResolver.resolve({
        candidates: ["$UNRESOLVED_VAR_XYZ/file.toml", configFile],
      })
      expect(result.isOk()).toBe(true)
      expect(result.value.isSome()).toBe(true)
      expect(result.value.orElse("")).toBe(configFile)
    })

    it("should expand tilde in candidates", async () => {
      const homeConfig = path.join(os.homedir(), ".functype-os-test-config-unlikely")
      fs.writeFileSync(homeConfig, "test", "utf8")
      try {
        const result = await ConfigResolver.resolve({
          candidates: ["~/.functype-os-test-config-unlikely"],
        })
        expect(result.isOk()).toBe(true)
        expect(result.value.isSome()).toBe(true)
      } finally {
        fs.unlinkSync(homeConfig)
      }
    })
  })

  describe("resolveRequired", () => {
    it("should return Ok with path when found", async () => {
      const result = await ConfigResolver.resolveRequired({
        candidates: [configFile],
      })
      expect(result.isOk()).toBe(true)
      expect(result.value).toBe(configFile)
    })

    it("should return Err with ConfigError when not found", async () => {
      const result = await ConfigResolver.resolveRequired({
        candidates: ["/no/such/file.toml"],
      })
      expect(result.isErr()).toBe(true)
    })
  })

  describe("resolveAll", () => {
    it("should return all existing configs", async () => {
      const secondFile = path.join(tmpDir, "second.toml")
      fs.writeFileSync(secondFile, "x = 1", "utf8")

      const result = await ConfigResolver.resolveAll({
        candidates: [configFile, "/missing.toml", secondFile],
      })
      expect(result.isOk()).toBe(true)
      const found = result.value.toArray()
      expect(found).toHaveLength(2)
      expect(found).toContain(configFile)
      expect(found).toContain(secondFile)
    })

    it("should return empty List when none exist", async () => {
      const result = await ConfigResolver.resolveAll({
        candidates: ["/no/a.toml", "/no/b.toml"],
      })
      expect(result.isOk()).toBe(true)
      expect(result.value.isEmpty).toBe(true)
    })
  })

  describe("resolveSync", () => {
    it("should find the first existing config", () => {
      const result = ConfigResolver.resolveSync({
        candidates: ["/no/such/file.toml", configFile, "/also/missing.toml"],
      })
      expect(result.isSome()).toBe(true)
      expect(result.orElse("")).toBe(configFile)
    })

    it("should return None when no candidates exist", () => {
      const result = ConfigResolver.resolveSync({
        candidates: ["/no/such/a.toml", "/no/such/b.toml"],
      })
      expect(result.isNone()).toBe(true)
    })

    it("should skip candidates with unresolved variables", () => {
      const result = ConfigResolver.resolveSync({
        candidates: ["$UNRESOLVED_VAR_XYZ/file.toml", configFile],
      })
      expect(result.isSome()).toBe(true)
      expect(result.orElse("")).toBe(configFile)
    })

    it("should expand tilde in candidates", () => {
      const homeConfig = path.join(os.homedir(), ".functype-os-test-config-sync-unlikely")
      fs.writeFileSync(homeConfig, "test", "utf8")
      try {
        const result = ConfigResolver.resolveSync({
          candidates: ["~/.functype-os-test-config-sync-unlikely"],
        })
        expect(result.isSome()).toBe(true)
      } finally {
        fs.unlinkSync(homeConfig)
      }
    })
  })

  describe("resolveRequiredSync", () => {
    it("should return Right with path when found", () => {
      const result = ConfigResolver.resolveRequiredSync({
        candidates: [configFile],
      })
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(configFile)
    })

    it("should return Left with ConfigError when not found", () => {
      const result = ConfigResolver.resolveRequiredSync({
        candidates: ["/no/such/file.toml"],
      })
      expect(result.isLeft()).toBe(true)
    })
  })

  describe("resolveAllSync", () => {
    it("should return all existing configs", () => {
      const secondFile = path.join(tmpDir, "second-sync.toml")
      fs.writeFileSync(secondFile, "x = 1", "utf8")

      const found = ConfigResolver.resolveAllSync({
        candidates: [configFile, "/missing.toml", secondFile],
      }).toArray()
      expect(found).toHaveLength(2)
      expect(found).toContain(configFile)
      expect(found).toContain(secondFile)
    })

    it("should return empty List when none exist", () => {
      const result = ConfigResolver.resolveAllSync({
        candidates: ["/no/a.toml", "/no/b.toml"],
      })
      expect(result.isEmpty).toBe(true)
    })
  })
})
