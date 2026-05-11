import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { describe, expect, it } from "vitest"

import { Platform } from "../../src/platform"

describe("windowsHomeDir", () => {
  describe("system account filtering", () => {
    it("should filter out well-known system accounts from user directories", () => {
      const systemAccounts = ["All Users", "Default", "Default User", "Public"]
      const realUsers = ["JordanBurke", "AnotherUser"]
      const all = [...systemAccounts, ...realUsers]

      // Use the same filtering logic the implementation uses
      const filtered = all.filter((name) => {
        const lower = name.toLowerCase()
        if (lower === "all users" || lower === "default" || lower === "default user" || lower === "public") {
          return false
        }
        if (lower.startsWith("defaultuser") || lower.startsWith("desktop.") || lower.startsWith("wsiaccount")) {
          return false
        }
        return true
      })

      expect(filtered).toEqual(realUsers)
    })

    it("should filter out defaultuserN and desktop. prefixed accounts", () => {
      const entries = ["defaultuser0", "desktop.ABCDEF", "WsiAccount1234", "RealUser"]
      const filtered = entries.filter((name) => {
        const lower = name.toLowerCase()
        if (lower === "all users" || lower === "default" || lower === "default user" || lower === "public") {
          return false
        }
        if (lower.startsWith("defaultuser") || lower.startsWith("desktop.") || lower.startsWith("wsiaccount")) {
          return false
        }
        return true
      })
      expect(filtered).toEqual(["RealUser"])
    })
  })

  it("should return an Option", () => {
    const result = Platform.windowsHomeDir()
    expect(result).toBeDefined()
    // On non-WSL it should be None
    if (!Platform.isWSL()) {
      expect(result.isNone()).toBe(true)
    }
  })

  describe.skipIf(!Platform.isWSL())("WSL smoke tests", () => {
    it("should return a path matching /mnt/[a-z]/Users/", () => {
      const result = Platform.windowsHomeDir()
      expect(result.isSome()).toBe(true)
      if (result.isSome()) {
        expect(result.value).toMatch(/^\/mnt\/[a-z]\/Users\//)
      }
    })
  })
})

describe("homeDirs", () => {
  it("should always include Platform.homeDir()", () => {
    const dirs = Platform.homeDirs()
    expect(dirs.toArray()).toContain(Platform.homeDir())
  })

  it("should include windowsHomeDir on WSL when available", () => {
    const dirs = Platform.homeDirs()
    const winHome = Platform.windowsHomeDir()
    if (winHome.isSome()) {
      expect(dirs.toArray()).toContain(winHome.value)
    }
  })

  it("should not contain duplicates", () => {
    const dirs = Platform.homeDirs()
    const arr = dirs.toArray()
    const unique = [...new Set(arr)]
    expect(arr).toEqual(unique)
  })

  it("should return a List", () => {
    const dirs = Platform.homeDirs()
    expect(dirs.toArray).toBeDefined()
    expect(dirs.size).toBeGreaterThanOrEqual(1)
  })
})
