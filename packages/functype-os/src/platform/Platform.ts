import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { List, Option, Set as FSet, Try } from "functype"

export type UserInfo = {
  readonly username: string
  readonly uid: number
  readonly gid: number
  readonly shell: Option<string>
  readonly homedir: string
}

export type CloudProvider = "onedrive" | "gdrive" | "dropbox" | "icloud"

export type CloudStorageDir = {
  readonly provider: CloudProvider
  readonly path: string
  readonly label: string
}

const hasDockerEnv = (): boolean => Try(() => fs.statSync("/.dockerenv")).isSuccess()

const hasDockerCGroup = (): boolean =>
  Try(() => fs.readFileSync("/proc/self/cgroup", "utf8"))
    .map((contents) => contents.includes("docker"))
    .toEither((): boolean => false)
    .fold(
      () => false,
      (matched) => matched,
    )

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
const cachedIsKube = memo(() =>
  Try(() => fs.readFileSync("/proc/self/cgroup", "utf8"))
    .map((contents) => contents.includes("kube"))
    .fold(
      () => false,
      (matched) => matched,
    ),
)
const cachedIsWSL = memo(() =>
  Try(() => fs.readFileSync("/proc/version", "utf8"))
    .map((version) => version.includes("Microsoft") || version.includes("WSL"))
    .fold(
      () => false,
      (matched) => matched,
    ),
)
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

const SYSTEM_ACCOUNTS = FSet.of("all users", "default", "default user", "public")

const isSystemAccount = (name: string): boolean => {
  const lower = name.toLowerCase()
  if (SYSTEM_ACCOUNTS.contains(lower)) return true
  if (lower.startsWith("defaultuser") || lower.startsWith("desktop.") || lower.startsWith("wsiaccount")) return true
  return false
}

const isDirectory = (p: string): boolean =>
  Try(() => fs.statSync(p).isDirectory()).fold(
    () => false,
    (isDir) => isDir,
  )

const readRealUsers = (usersDir: string): Option<readonly string[]> => {
  const filterRealUsers = (entries: readonly string[]): readonly string[] =>
    entries.filter((name) => !isSystemAccount(name) && isDirectory(path.join(usersDir, name)))
  return Try(() => fs.readdirSync(usersDir)).fold<Option<readonly string[]>>(
    () => Option<readonly string[]>(undefined),
    (entries) => Option(filterRealUsers(entries)),
  )
}

const resolveViaCmdExe = (usersDir: string, fallback: string): Option<string> =>
  Try(() => execSync("cmd.exe /c echo %USERPROFILE%", { timeout: 3000, encoding: "utf8" }).trim())
    .map((raw) => {
      // Convert Windows path C:\Users\foo → /mnt/c/Users/foo
      const match = raw.match(/^([A-Za-z]):\\(.*)$/)
      if (!match) return Option<string>(undefined)
      const drive = (match[1] as string).toLowerCase()
      const rest = (match[2] as string).replace(/\\/g, "/")
      const wslPath = `/mnt/${drive}/${rest}`
      return isDirectory(wslPath) ? Option(wslPath) : Option<string>(undefined)
    })
    .fold<Option<string>>(
      () => Option(fallback),
      (opt) =>
        opt.fold<Option<string>>(
          () => Option(fallback),
          (v) => Option(v),
        ),
    )

const resolveWindowsHome = (): Option<string> => {
  if (!cachedIsWSL()) return Option<string>(undefined)

  const usersDir = "/mnt/c/Users"
  return readRealUsers(usersDir).fold<Option<string>>(
    () => Option<string>(undefined),
    (realUsers) => {
      if (realUsers.length === 1) return Option(path.join(usersDir, realUsers[0] as string))
      if (realUsers.length > 1) return resolveViaCmdExe(usersDir, path.join(usersDir, realUsers[0] as string))
      return Option<string>(undefined)
    },
  )
}

const cachedWindowsHome = memo(resolveWindowsHome)

type CloudDetection = { readonly provider: CloudProvider; readonly label: string }

const detectCloudProvider = (name: string): Option<CloudDetection> => {
  if (name === "OneDrive" || name.startsWith("OneDrive ") || name.startsWith("OneDrive-")) {
    return Option({ provider: "onedrive" as const, label: name })
  }
  if (name === "Google Drive") return Option({ provider: "gdrive" as const, label: name })
  if (name === "Dropbox") return Option({ provider: "dropbox" as const, label: name })
  return Option<CloudDetection>(undefined)
}

const scanDirectChildren = (home: string): readonly CloudStorageDir[] =>
  Try(() => fs.readdirSync(home))
    .map((entries) =>
      entries.flatMap((name): CloudStorageDir[] => {
        const fullPath = path.join(home, name)
        return detectCloudProvider(name).fold<CloudStorageDir[]>(
          () => [],
          (detection) =>
            isDirectory(fullPath) ? [{ provider: detection.provider, path: fullPath, label: detection.label }] : [],
        )
      }),
    )
    .fold<readonly CloudStorageDir[]>(
      () => [],
      (results) => results,
    )

const scanMacCloudStorage = (home: string): readonly CloudStorageDir[] => {
  const cloudStoragePath = path.join(home, "Library", "CloudStorage")
  return Try(() => fs.readdirSync(cloudStoragePath))
    .map((entries) =>
      entries.flatMap((name): CloudStorageDir[] => {
        const fullPath = path.join(cloudStoragePath, name)
        if (!isDirectory(fullPath)) return []
        if (name.startsWith("OneDrive")) return [{ provider: "onedrive", path: fullPath, label: name }]
        if (name.startsWith("GoogleDrive")) return [{ provider: "gdrive", path: fullPath, label: name }]
        return []
      }),
    )
    .fold<readonly CloudStorageDir[]>(
      () => [],
      (results) => results,
    )
}

const scanMacICloud = (home: string): readonly CloudStorageDir[] => {
  const icloudPath = path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs")
  return isDirectory(icloudPath) ? [{ provider: "icloud", path: icloudPath, label: "iCloud Drive" }] : []
}

const scanCloudStorageDirs = (home: string): readonly CloudStorageDir[] => [
  ...scanDirectChildren(home),
  ...scanMacCloudStorage(home),
  ...scanMacICloud(home),
]

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

  userInfo: (): Option<UserInfo> =>
    Try(() => os.userInfo()).fold<Option<UserInfo>>(
      () => Option<UserInfo>(undefined),
      (info) =>
        Option<UserInfo>({
          username: info.username,
          uid: info.uid,
          gid: info.gid,
          shell: Option(info.shell),
          homedir: info.homedir,
        }),
    ),

  isDocker: (): boolean => cachedIsDocker(),
  isKubernetes: (): boolean => cachedIsKube(),
  isWSL: (): boolean => cachedIsWSL(),
  isCI: (): boolean => cachedIsCI(),

  isContainer: (): boolean => Platform.isDocker() || Platform.isKubernetes(),

  windowsHomeDir: (): Option<string> => cachedWindowsHome(),

  homeDirs: (): List<string> => {
    const primary = os.homedir()
    const windowsHome = Platform.windowsHomeDir().fold<readonly string[]>(
      () => [],
      (h) => (h !== primary ? [h] : []),
    )
    return List<string>([primary, ...windowsHome])
  },

  cloudStorageDirs: (home?: string): List<CloudStorageDir> => {
    if (home !== undefined) return List(scanCloudStorageDirs(home))
    const allDirs = Platform.homeDirs()
      .toArray()
      .flatMap((h) => [...scanCloudStorageDirs(h)])
    // Deduplicate by path, first-wins
    const deduped = allDirs.reduce<{
      readonly seen: ReadonlyArray<string>
      readonly results: ReadonlyArray<CloudStorageDir>
    }>(
      (acc, dir) =>
        acc.seen.includes(dir.path) ? acc : { seen: [...acc.seen, dir.path], results: [...acc.results, dir] },
      { seen: [], results: [] },
    )
    return List(deduped.results)
  },
}
