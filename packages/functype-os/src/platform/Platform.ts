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

let isDockerCached: boolean | undefined
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

let isKubeCached: boolean | undefined
let isWSLCached: boolean | undefined
let isCICached: boolean | undefined

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

  isDocker: (): boolean => {
    isDockerCached ??= hasDockerEnv() || hasDockerCGroup()
    return isDockerCached
  },

  isKubernetes: (): boolean => {
    isKubeCached ??= (() => {
      try {
        return fs.readFileSync("/proc/self/cgroup", "utf8").includes("kube")
      } catch {
        return false
      }
    })()
    return isKubeCached
  },

  isWSL: (): boolean => {
    isWSLCached ??= (() => {
      try {
        const version = fs.readFileSync("/proc/version", "utf8")
        return version.includes("Microsoft") || version.includes("WSL")
      } catch {
        return false
      }
    })()
    return isWSLCached
  },

  isCI: (): boolean => {
    isCICached ??=
      process.env["CI"] !== undefined ||
      process.env["GITHUB_ACTIONS"] !== undefined ||
      process.env["GITLAB_CI"] !== undefined ||
      process.env["CIRCLECI"] !== undefined ||
      process.env["JENKINS_URL"] !== undefined ||
      process.env["TRAVIS"] !== undefined ||
      process.env["BUILDKITE"] !== undefined
    return isCICached
  },

  isContainer: (): boolean => Platform.isDocker() || Platform.isKubernetes(),
}
