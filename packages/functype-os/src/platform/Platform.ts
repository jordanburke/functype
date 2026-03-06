import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { Option } from "functype"

export type UserInfo = {
  readonly username: string
  readonly uid: number
  readonly gid: number
  readonly shell: string | null
  readonly homedir: string
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
}
