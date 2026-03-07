import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { List, Option } from "functype"

export type UserInfo = {
  readonly username: string
  readonly uid: number
  readonly gid: number
  readonly shell: string | null
  readonly homedir: string
}

export type CloudProvider = "onedrive" | "gdrive" | "dropbox" | "icloud"

export type CloudStorageDir = {
  readonly provider: CloudProvider
  readonly path: string
  readonly label: string
}

const hasDockerEnv = (): boolean => {
  try {
    fs.statSync("/.dockerenv")
    return true
  } catch {
    return false
  }
}
const hasDockerCGroup = (): boolean => {
  try {
    return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker")
  } catch {
    return false
  }
}

const memo = <T>(fn: () => T): (() => T) => {
  const cache: { value?: T } = {}
  return () => {
    if (!("value" in cache)) {
      cache.value = fn()
    }
    return cache.value as T
  }
}

const cachedIsDocker = memo(() => hasDockerEnv() || hasDockerCGroup())
const cachedIsKube = memo(() => {
  try {
    return fs.readFileSync("/proc/self/cgroup", "utf8").includes("kube")
  } catch {
    return false
  }
})
const cachedIsWSL = memo(() => {
  try {
    const version = fs.readFileSync("/proc/version", "utf8")
    return version.includes("Microsoft") || version.includes("WSL")
  } catch {
    return false
  }
})
const cachedIsCI = memo(
  () =>
    process.env["CI"] !== undefined ||
    process.env["GITHUB_ACTIONS"] !== undefined ||
    process.env["GITLAB_CI"] !== undefined ||
    process.env["CIRCLECI"] !== undefined ||
    process.env["JENKINS_URL"] !== undefined ||
    process.env["TRAVIS"] !== undefined ||
    process.env["BUILDKITE"] !== undefined,
)

const SYSTEM_ACCOUNTS = new Set(["all users", "default", "default user", "public"])

const isSystemAccount = (name: string): boolean => {
  const lower = name.toLowerCase()
  if (SYSTEM_ACCOUNTS.has(lower)) return true
  if (lower.startsWith("defaultuser") || lower.startsWith("desktop.") || lower.startsWith("wsiaccount")) return true
  return false
}

const isDirectory = (p: string): boolean => {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

const readRealUsers = (usersDir: string): readonly string[] | undefined => {
  try {
    const entries = fs.readdirSync(usersDir)
    return entries.filter((name) => !isSystemAccount(name) && isDirectory(path.join(usersDir, name)))
  } catch {
    return undefined
  }
}

const resolveViaCmdExe = (usersDir: string, fallback: string): Option<string> => {
  try {
    const raw = execSync("cmd.exe /c echo %USERPROFILE%", { timeout: 3000, encoding: "utf8" }).trim()
    // Convert Windows path C:\Users\foo → /mnt/c/Users/foo
    const match = raw.match(/^([A-Za-z]):\\(.*)$/)
    if (match) {
      const drive = match[1].toLowerCase()
      const rest = match[2].replace(/\\/g, "/")
      const wslPath = `/mnt/${drive}/${rest}`
      if (isDirectory(wslPath)) {
        return Option(wslPath)
      }
    }
  } catch {
    // cmd.exe failed, fall through to best guess
  }
  return Option(fallback)
}

const resolveWindowsHome = (): Option<string> => {
  if (!cachedIsWSL()) return Option<string>(undefined)

  const usersDir = "/mnt/c/Users"
  const realUsers = readRealUsers(usersDir)
  if (realUsers === undefined) return Option<string>(undefined)

  if (realUsers.length === 1) {
    return Option(path.join(usersDir, realUsers[0]))
  }

  if (realUsers.length > 1) {
    return resolveViaCmdExe(usersDir, path.join(usersDir, realUsers[0]))
  }

  return Option<string>(undefined)
}

const cachedWindowsHome = memo(resolveWindowsHome)

const detectCloudProvider = (name: string): { provider: CloudProvider; label: string } | undefined => {
  if (name === "OneDrive" || name.startsWith("OneDrive ") || name.startsWith("OneDrive-")) {
    return { provider: "onedrive", label: name }
  }
  if (name === "Google Drive") {
    return { provider: "gdrive", label: name }
  }
  if (name === "Dropbox") {
    return { provider: "dropbox", label: name }
  }
  return undefined
}

const scanCloudStorageDirs = (home: string): CloudStorageDir[] => {
  const results: CloudStorageDir[] = []

  // Direct home children
  try {
    const entries = fs.readdirSync(home)
    for (const name of entries) {
      const fullPath = path.join(home, name)
      const detection = detectCloudProvider(name)
      if (detection && isDirectory(fullPath)) {
        results.push({ provider: detection.provider, path: fullPath, label: detection.label })
      }
    }
  } catch {
    // home dir may not exist or be readable
  }

  // macOS Library/CloudStorage children
  const cloudStoragePath = path.join(home, "Library", "CloudStorage")
  try {
    const entries = fs.readdirSync(cloudStoragePath)
    for (const name of entries) {
      const fullPath = path.join(cloudStoragePath, name)
      if (!isDirectory(fullPath)) continue
      if (name.startsWith("OneDrive")) {
        results.push({ provider: "onedrive", path: fullPath, label: name })
      } else if (name.startsWith("GoogleDrive")) {
        results.push({ provider: "gdrive", path: fullPath, label: name })
      }
    }
  } catch {
    // Library/CloudStorage may not exist
  }

  // macOS iCloud fixed path
  const icloudPath = path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs")
  if (isDirectory(icloudPath)) {
    results.push({ provider: "icloud", path: icloudPath, label: "iCloud Drive" })
  }

  return results
}

export const Platform = {
  os: (): "darwin" | "linux" | "win32" | string => process.platform,
  arch: (): string => process.arch,
  homeDir: (): string => os.homedir(),
  tmpDir: (): string => os.tmpdir(),
  hostname: (): string => os.hostname(),
  eol: (): string => os.EOL,
  pathSep: (): string => path.sep,

  isWindows: (): boolean => process.platform === "win32",
  isMac: (): boolean => process.platform === "darwin",
  isLinux: (): boolean => process.platform === "linux",

  userInfo: (): Option<UserInfo> => {
    try {
      const info = os.userInfo()
      return Option({
        username: info.username,
        uid: info.uid,
        gid: info.gid,
        shell: info.shell,
        homedir: info.homedir,
      })
    } catch {
      return Option<UserInfo>(undefined)
    }
  },

  isDocker: (): boolean => cachedIsDocker(),
  isKubernetes: (): boolean => cachedIsKube(),
  isWSL: (): boolean => cachedIsWSL(),
  isCI: (): boolean => cachedIsCI(),

  isContainer: (): boolean => Platform.isDocker() || Platform.isKubernetes(),

  windowsHomeDir: (): Option<string> => cachedWindowsHome(),

  homeDirs: (): List<string> => {
    const homes: string[] = [os.homedir()]
    Platform.windowsHomeDir().forEach((winHome) => {
      if (winHome !== os.homedir()) {
        homes.push(winHome)
      }
    })
    return List(homes)
  },

  cloudStorageDirs: (home?: string): List<CloudStorageDir> => {
    if (home !== undefined) {
      return List(scanCloudStorageDirs(home))
    }
    const allDirs: CloudStorageDir[] = []
    const seenPaths = new Set<string>()
    Platform.homeDirs().forEach((h) => {
      for (const dir of scanCloudStorageDirs(h)) {
        if (!seenPaths.has(dir.path)) {
          seenPaths.add(dir.path)
          allDirs.push(dir)
        }
      }
    })
    return List(allDirs)
  },
}
