import * as fsSync from "node:fs"
import * as fs from "node:fs/promises"

import type { Either } from "functype"
import { IO, Left, List, Option, Right, Try } from "functype"

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

// Async helper: lift a Promise-returning thunk into a lazy IO, mapping rejections to
// FsError. Nothing touches the filesystem until the IO runs. The interpreter awaits the
// thunk inside its own try, so a synchronous throw from inside it (e.g. a bad encoding
// argument) fails the same way a rejection does — same FsError, no unhandled rejection.
const liftAsync = <T>(p: string, op: string, thunk: () => Promise<T>): IO<never, FsError, T> =>
  IO.tryPromise({ try: thunk, catch: (err) => toFsError(p, op, err) })

const isNotFound = (err: unknown): boolean => err instanceof Error && "code" in err && err.code === "ENOENT"

// Sync helper: run a thunk via Try and convert to Either<FsError, T>.
const liftSync = <T>(p: string, op: string, thunk: () => T): Either<FsError, T> =>
  Try(thunk).toEither((err) => toFsError(p, op, err))

export const Fs = {
  // Async methods — return a lazy IO<never, FsError, T>; nothing runs until `.run()`

  exists: (p: string): IO<never, never, boolean> =>
    IO.async(() => fs.access(p)).fold(
      () => false,
      () => true,
    ),

  readFile: (p: string, encoding: BufferEncoding = "utf8"): IO<never, FsError, string> =>
    liftAsync(p, "readFile", () => fs.readFile(p, { encoding })),

  readFileOpt: (p: string, encoding: BufferEncoding = "utf8"): IO<never, FsError, Option<string>> =>
    IO.async(() => fs.readFile(p, { encoding }))
      .fold(
        (err): Either<FsError, Option<string>> =>
          isNotFound(err) ? Right(Option<string>(undefined)) : Left(toFsError(p, "readFile", err)),
        (data): Either<FsError, Option<string>> => Right(Option(data)),
      )
      .flatMap((result) => IO.fromEither(result)),

  stat: (p: string): IO<never, FsError, FileInfo> => liftAsync(p, "stat", () => fs.stat(p).then(toFileInfo)),

  copyFile: (src: string, dest: string): IO<never, FsError, void> =>
    liftAsync(src, "copyFile", () => fs.copyFile(src, dest)),

  rename: (oldPath: string, newPath: string): IO<never, FsError, void> =>
    liftAsync(oldPath, "rename", () => fs.rename(oldPath, newPath)),

  readdir: (p: string): IO<never, FsError, List<string>> =>
    liftAsync(p, "readdir", () => fs.readdir(p).then((entries) => List<string>(entries))),

  glob: (dir: string, pattern: string): IO<never, FsError, List<string>> =>
    liftAsync(dir, "glob", () => fs.readdir(dir, { recursive: true, encoding: "utf8" })).map((entries) =>
      List<string>(entries.filter((entry) => matchGlob(entry, pattern))),
    ),

  writeFile: (p: string, data: string, encoding: BufferEncoding = "utf8"): IO<never, FsError, void> =>
    liftAsync(p, "writeFile", () => fs.writeFile(p, data, { encoding })),

  appendFile: (p: string, data: string, encoding: BufferEncoding = "utf8"): IO<never, FsError, void> =>
    liftAsync(p, "appendFile", () => fs.appendFile(p, data, { encoding })),

  mkdir: (p: string, options?: { recursive?: boolean }): IO<never, FsError, void> =>
    options?.recursive && isMagicFsPath(p)
      ? IO.fail(
          toFsError(p, "mkdir", new Error("recursive mkdir refused under magic filesystem root (/proc, /sys, /dev)")),
        )
      : liftAsync(p, "mkdir", () => fs.mkdir(p, options).then(() => undefined)),

  unlink: (p: string): IO<never, FsError, void> => liftAsync(p, "unlink", () => fs.unlink(p)),

  // Sync methods — return Either<FsError, T>

  existsSync: (p: string): boolean => Try(() => fsSync.accessSync(p)).isSuccess(),

  readFileSync: (p: string, encoding: BufferEncoding = "utf8"): Either<FsError, string> =>
    liftSync(p, "readFileSync", () => fsSync.readFileSync(p, { encoding })),

  readFileOptSync: (p: string, encoding: BufferEncoding = "utf8"): Either<FsError, Option<string>> => {
    const tryResult = Try(() => fsSync.readFileSync(p, { encoding }))
    return tryResult.fold<Either<FsError, Option<string>>>(
      (err) => (isNotFound(err) ? Right(Option<string>(undefined)) : Left(toFsError(p, "readFileOptSync", err))),
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
