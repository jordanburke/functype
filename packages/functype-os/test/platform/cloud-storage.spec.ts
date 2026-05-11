import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { describe, expect, it, beforeEach, afterEach } from "vitest"

import { Platform } from "../../src/platform"
import type { CloudProvider, CloudStorageDir } from "../../src/platform"

describe("cloudStorageDirs", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "functype-os-cloud-"))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe("direct home children detection", () => {
    it("should detect OneDrive directory", () => {
      fs.mkdirSync(path.join(tmpDir, "OneDrive"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      expect(arr).toHaveLength(1)
      expect(arr[0].provider).toBe("onedrive")
      expect(arr[0].label).toBe("OneDrive")
    })

    it("should detect OneDrive with space suffix (e.g. OneDrive - Personal)", () => {
      fs.mkdirSync(path.join(tmpDir, "OneDrive - Personal"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      expect(arr).toHaveLength(1)
      expect(arr[0].provider).toBe("onedrive")
      expect(arr[0].label).toBe("OneDrive - Personal")
    })

    it("should detect OneDrive with dash suffix (e.g. OneDrive-Company)", () => {
      fs.mkdirSync(path.join(tmpDir, "OneDrive-Company"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      expect(arr).toHaveLength(1)
      expect(arr[0].provider).toBe("onedrive")
    })

    it("should detect Google Drive directory", () => {
      fs.mkdirSync(path.join(tmpDir, "Google Drive"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      expect(arr).toHaveLength(1)
      expect(arr[0].provider).toBe("gdrive")
      expect(arr[0].label).toBe("Google Drive")
    })

    it("should detect Dropbox directory", () => {
      fs.mkdirSync(path.join(tmpDir, "Dropbox"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      expect(arr).toHaveLength(1)
      expect(arr[0].provider).toBe("dropbox")
      expect(arr[0].label).toBe("Dropbox")
    })

    it("should detect multiple cloud providers", () => {
      fs.mkdirSync(path.join(tmpDir, "OneDrive"))
      fs.mkdirSync(path.join(tmpDir, "Dropbox"))
      fs.mkdirSync(path.join(tmpDir, "Google Drive"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const providers = result.toArray().map((d) => d.provider)
      expect(providers).toContain("onedrive")
      expect(providers).toContain("dropbox")
      expect(providers).toContain("gdrive")
    })
  })

  describe("macOS Library/CloudStorage detection", () => {
    it("should detect OneDrive in Library/CloudStorage", () => {
      const cloudStorage = path.join(tmpDir, "Library", "CloudStorage")
      fs.mkdirSync(cloudStorage, { recursive: true })
      fs.mkdirSync(path.join(cloudStorage, "OneDrive-Personal"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      const onedrive = arr.find((d) => d.provider === "onedrive")
      expect(onedrive).toBeDefined()
    })

    it("should detect GoogleDrive in Library/CloudStorage", () => {
      const cloudStorage = path.join(tmpDir, "Library", "CloudStorage")
      fs.mkdirSync(cloudStorage, { recursive: true })
      fs.mkdirSync(path.join(cloudStorage, "GoogleDrive-MyDrive"))
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      const gdrive = arr.find((d) => d.provider === "gdrive")
      expect(gdrive).toBeDefined()
    })
  })

  describe("macOS iCloud detection", () => {
    it("should detect iCloud Drive at Library/Mobile Documents/com~apple~CloudDocs", () => {
      const icloudPath = path.join(tmpDir, "Library", "Mobile Documents", "com~apple~CloudDocs")
      fs.mkdirSync(icloudPath, { recursive: true })
      const result = Platform.cloudStorageDirs(tmpDir)
      const arr = result.toArray()
      const icloud = arr.find((d) => d.provider === "icloud")
      expect(icloud).toBeDefined()
      expect(icloud!.label).toBe("iCloud Drive")
    })
  })

  describe("edge cases", () => {
    it("should ignore non-cloud directories", () => {
      fs.mkdirSync(path.join(tmpDir, "Documents"))
      fs.mkdirSync(path.join(tmpDir, "Downloads"))
      fs.mkdirSync(path.join(tmpDir, "Projects"))
      const result = Platform.cloudStorageDirs(tmpDir)
      expect(result.toArray()).toHaveLength(0)
    })

    it("should return empty for nonexistent path", () => {
      const result = Platform.cloudStorageDirs("/nonexistent/path/that/does/not/exist")
      expect(result.toArray()).toHaveLength(0)
    })

    it("should ignore files named like cloud providers (not directories)", () => {
      fs.writeFileSync(path.join(tmpDir, "OneDrive"), "not a directory")
      const result = Platform.cloudStorageDirs(tmpDir)
      expect(result.toArray()).toHaveLength(0)
    })

    it("should deduplicate by path", () => {
      fs.mkdirSync(path.join(tmpDir, "OneDrive"))
      // Calling with same home twice should not produce duplicates
      // We test by calling without args (which uses homeDirs) — but we can test dedup logic
      // by verifying the single-home scan doesn't produce dupes
      const result = Platform.cloudStorageDirs(tmpDir)
      const paths = result.toArray().map((d) => d.path)
      const unique = [...new Set(paths)]
      expect(paths).toEqual(unique)
    })
  })

  describe.skipIf(!Platform.isWSL())("WSL smoke tests", () => {
    it("should scan both Linux and Windows home directories", () => {
      // Just verify it runs without error and returns a List
      const result = Platform.cloudStorageDirs()
      expect(result.toArray).toBeDefined()
    })
  })
})
