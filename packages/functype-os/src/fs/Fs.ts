import * as fsSync from "node:fs"
import * as fs from "node:fs/promises"

import type { Either, TaskResult } from "functype"
import { Err, Left, List, Ok, Option, Right, Try } from "functype"

import { FsError } from "../errors/errors"

export type FileInfo = {
  readonly size: number
  readonly isFile: boolean
  readonly isDirectory: boolean
  readonly isSymbolicLink: boolean
  readonly createdAt: Date
  readonly modifiedAt: Date
  readonly accessedAt: Date
  readonly permissions: number
}

const toFileInfo = (stats: fsSync.Stats): FileInfo => ({
  size: stats.size,
  isFile: stats.isFile(),
  isDirectory: stats.isDirectory(),
  isSymbolicLink: stats.isSymbolicLink(),
  createdAt: stats.birthtime,
  modifiedAt: stats.mtime,
  accessedAt: stats.atime,
  permissions: stats.mode,
})

const toFsError = (p: string, op: string, error: unknown): FsError =>
  FsError(p, op, error instanceof Error ? error : new Error(String(error)))

/**
 * Linux magic filesystems where recursive mkdir can hang indefinitely against
 * unwritable subpaths (libuv quirk; macOS errors immediately instead).
 * Refusing recursive mkdir under these prefixes keeps `mkdir({ recursive: true })`
 * fast-failing and predictable across platforms. See issue #135.
 */
const MAGIC_FS_PREFIXES: ReadonlyArray<string> = ["/proc/", "/sys/", "/dev/"]

const isMagicFsPath = (p: string): boolean => MAGIC_FS_PREFIXES.some((prefix) => p.startsWith(prefix))

const matchGlob = (filePath: string, pattern: string): boolean => {
  // Escape every regex metachar EXCEPT '*' first, so the subsequent
  // '*' transformations are the only special characters in the output.
  // Order matters: backslashes must be escaped before any '\\' insertion below.
  const escaped = pattern.replace(/[\\^$+?.()|[\]{}]/g, "\\$&")
  const regex = escaped
    .replace(/\*\*\//g, "{{GLOBSTAR}}")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, "(?:.*/)?")
  return new RegExp(`^${regex}$`).test(filePath)
}

// Async helper: lift a Promise into TaskResult, mapping rejections to FsError.
const liftAsync = async <T>(p: string, op: string, promise: () => Promise<T>): TaskResult<T> => {
  const result = await Try.fromPromise(promise())
  return result.fold<TaskResult<T>>(
    (err) => Promise.resolve(Err(toFsError(p, op, err))),
    (value) => Promise.resolve(Ok(value)),
  )
}

// Sync helper: run a thunk via Try and convert to Either<FsError, T>.
const liftSync = <T>(p: string, op: string, thunk: () => T): Either<FsError, T> =>
  Try(thunk).toEither((err) => toFsError(p, op, err))

export const Fs = {
  // Async methods — return TaskResult<T>

  exists: async (p: string): TaskResult<boolean> => {
    const result = await Try.fromPromise(fs.access(p))
    return Ok(result.isSuccess())
  },

  readFile: (p: string, encoding: BufferEncoding = "utf8"): TaskResult<string> =>
    liftAsync(p, "readFile", () => fs.readFile(p, { encoding })),

  readFileOpt: async (p: string, encoding: BufferEncoding = "utf8"): TaskResult<Option<string>> => {
    const result = await Try.fromPromise(fs.readFile(p, { encoding }))
    return result.fold<TaskResult<Option<string>>>(
      (err) => {
        if (err instanceof Error && "code" in err && err.code === "ENOENT") {
          return Promise.resolve(Ok(Option<string>(undefined)))
        }
        return Promise.resolve(Err(toFsError(p, "readFile", err)))
      },
      (data) => Promise.resolve(Ok(Option(data))),
    )
  },

  stat: (p: string): TaskResult<FileInfo> => liftAsync(p, "stat", () => fs.stat(p).then(toFileInfo)),

  copyFile: (src: string, dest: string): TaskResult<void> => liftAsync(src, "copyFile", () => fs.copyFile(src, dest)),

  rename: (oldPath: string, newPath: string): TaskResult<void> =>
    liftAsync(oldPath, "rename", () => fs.rename(oldPath, newPath)),

  readdir: (p: string): TaskResult<List<string>> =>
    liftAsync(p, "readdir", () => fs.readdir(p).then((entries) => List<string>(entries))),

  glob: async (dir: string, pattern: string): TaskResult<List<string>> => {
    const result = await Try.fromPromise(fs.readdir(dir, { recursive: true, encoding: "utf8" }))
    return result.fold<TaskResult<List<string>>>(
      (err) => Promise.resolve(Err(toFsError(dir, "glob", err))),
      (entries) => {
        const matched = (entries as string[]).filter((entry) => matchGlob(entry, pattern))
        return Promise.resolve(Ok(List<string>(matched)))
      },
    )
  },

  writeFile: (p: string, data: string, encoding: BufferEncoding = "utf8"): TaskResult<void> =>
    liftAsync(p, "writeFile", () => fs.writeFile(p, data, { encoding })),

  appendFile: (p: string, data: string, encoding: BufferEncoding = "utf8"): TaskResult<void> =>
    liftAsync(p, "appendFile", () => fs.appendFile(p, data, { encoding })),

  mkdir: (p: string, options?: { recursive?: boolean }): TaskResult<void> => {
    if (options?.recursive && isMagicFsPath(p)) {
      return Promise.resolve(
        Err(
          toFsError(p, "mkdir", new Error("recursive mkdir refused under magic filesystem root (/proc, /sys, /dev)")),
        ),
      )
    }
    return liftAsync(p, "mkdir", () => fs.mkdir(p, options).then(() => undefined))
  },

  unlink: (p: string): TaskResult<void> => liftAsync(p, "unlink", () => fs.unlink(p)),

  // Sync methods — return Either<FsError, T>

  existsSync: (p: string): boolean => Try(() => fsSync.accessSync(p)).isSuccess(),

  readFileSync: (p: string, encoding: BufferEncoding = "utf8"): Either<FsError, string> =>
    liftSync(p, "readFileSync", () => fsSync.readFileSync(p, { encoding })),

  readFileOptSync: (p: string, encoding: BufferEncoding = "utf8"): Either<FsError, Option<string>> => {
    const tryResult = Try(() => fsSync.readFileSync(p, { encoding }))
    return tryResult.fold<Either<FsError, Option<string>>>(
      (err) => {
        if (err instanceof Error && "code" in err && err.code === "ENOENT") {
          return Right(Option<string>(undefined))
        }
        return Left(toFsError(p, "readFileOptSync", err))
      },
      (data) => Right(Option(data)),
    )
  },

  statSync: (p: string): Either<FsError, FileInfo> => liftSync(p, "statSync", () => toFileInfo(fsSync.statSync(p))),

  copyFileSync: (src: string, dest: string): Either<FsError, void> =>
    liftSync(src, "copyFileSync", () => fsSync.copyFileSync(src, dest)),

  renameSync: (oldPath: string, newPath: string): Either<FsError, void> =>
    liftSync(oldPath, "renameSync", () => fsSync.renameSync(oldPath, newPath)),

  readdirSync: (p: string): Either<FsError, List<string>> =>
    liftSync(p, "readdirSync", () => List(fsSync.readdirSync(p))),

  writeFileSync: (p: string, data: string, encoding: BufferEncoding = "utf8"): Either<FsError, void> =>
    liftSync(p, "writeFileSync", () => fsSync.writeFileSync(p, data, { encoding })),

  appendFileSync: (p: string, data: string, encoding: BufferEncoding = "utf8"): Either<FsError, void> =>
    liftSync(p, "appendFileSync", () => fsSync.appendFileSync(p, data, { encoding })),

  mkdirSync: (p: string, options?: { recursive?: boolean }): Either<FsError, void> => {
    if (options?.recursive && isMagicFsPath(p)) {
      return Left(
        toFsError(p, "mkdirSync", new Error("recursive mkdir refused under magic filesystem root (/proc, /sys, /dev)")),
      )
    }
    return liftSync(p, "mkdirSync", () => {
      fsSync.mkdirSync(p, options)
    })
  },

  unlinkSync: (p: string): Either<FsError, void> => liftSync(p, "unlinkSync", () => fsSync.unlinkSync(p)),
}
