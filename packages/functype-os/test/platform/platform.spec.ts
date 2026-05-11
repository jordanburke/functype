import { describe, expect, it } from "vitest"

import { Platform } from "../../src/platform"

describe("Platform", () => {
  describe("OS detection", () => {
    it("os should return a non-empty string", () => {
      expect(Platform.os().length).toBeGreaterThan(0)
    })

    it("arch should return a non-empty string", () => {
      expect(Platform.arch().length).toBeGreaterThan(0)
    })

    it("homeDir should return a non-empty string", () => {
      expect(Platform.homeDir().length).toBeGreaterThan(0)
    })

    it("tmpDir should return a non-empty string", () => {
      expect(Platform.tmpDir().length).toBeGreaterThan(0)
    })

    it("hostname should return a non-empty string", () => {
      expect(Platform.hostname().length).toBeGreaterThan(0)
    })

    it("eol should return a line ending", () => {
      expect(["\n", "\r\n"]).toContain(Platform.eol())
    })

    it("pathSep should be / or \\", () => {
      expect(["/", "\\"]).toContain(Platform.pathSep())
    })

    it("exactly one of isWindows/isMac/isLinux should be true (or none for exotic OS)", () => {
      const trueCount = [Platform.isWindows(), Platform.isMac(), Platform.isLinux()].filter(Boolean).length
      expect(trueCount).toBeLessThanOrEqual(1)
    })
  })

  describe("userInfo", () => {
    it("should return Some with user info", () => {
      const info = Platform.userInfo()
      expect(info.isSome()).toBe(true)
      if (info.isSome()) {
        expect(info.value.username.length).toBeGreaterThan(0)
      }
    })
  })

  describe("container detection", () => {
    it("isDocker should return a boolean", () => {
      expect(typeof Platform.isDocker()).toBe("boolean")
    })

    it("isKubernetes should return a boolean", () => {
      expect(typeof Platform.isKubernetes()).toBe("boolean")
    })

    it("isWSL should return a boolean", () => {
      expect(typeof Platform.isWSL()).toBe("boolean")
    })

    it("isCI should return a boolean", () => {
      expect(typeof Platform.isCI()).toBe("boolean")
    })

    it("isContainer should be consistent with isDocker/isKubernetes", () => {
      expect(Platform.isContainer()).toBe(Platform.isDocker() || Platform.isKubernetes())
    })
  })
})
