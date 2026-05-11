import * as fsSync from "node:fs"
import * as fs from "node:fs/promises"

import type { Either, TaskResult } from "functype"
import { Err, Left, List, Ok, Option, Right } from "functype"

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

export const Fs = {
  // Async methods — return TaskResult<T>

  exists: async (p: string): TaskResult<boolean> => {
    try {
      await fs.access(p)
      return Ok(true)
    } catch {
      return Ok(false)
    }
  },

  readFile: async (p: string, encoding: BufferEncoding = "utf8"): TaskResult<string> => {
    try {
      return Ok(await fs.readFile(p, { encoding }))
    } catch (error) {
      return Err(toFsError(p, "readFile", error))
    }
  },

  readFileOpt: async (p: string, encoding: BufferEncoding = "utf8"): TaskResult<Option<string>> => {
    try {
      return Ok(Option(await fs.readFile(p, { encoding })))
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return Ok(Option<string>(undefined))
      }
      return Err(toFsError(p, "readFile", error))
    }
  },

  stat: async (p: string): TaskResult<FileInfo> => {
    try {
      return Ok(toFileInfo(await fs.stat(p)))
    } catch (error) {
      return Err(toFsError(p, "stat", error))
    }
  },

  copyFile: async (src: string, dest: string): TaskResult<void> => {
    try {
      await fs.copyFile(src, dest)
      return Ok(undefined as void)
    } catch (error) {
      return Err(toFsError(src, "copyFile", error))
    }
  },

  rename: async (oldPath: string, newPath: string): TaskResult<void> => {
    try {
      await fs.rename(oldPath, newPath)
      return Ok(undefined as void)
    } catch (error) {
      return Err(toFsError(oldPath, "rename", error))
    }
  },

  readdir: async (p: string): TaskResult<List<string>> => {
    try {
      return Ok(List(await fs.readdir(p)))
    } catch (error) {
      return Err(toFsError(p, "readdir", error))
    }
  },

  glob: async (dir: string, pattern: string): TaskResult<List<string>> => {
    try {
      const entries = await fs.readdir(dir, { recursive: true, encoding: "utf8" })
      const matched = entries.filter((entry) => matchGlob(entry, pattern))
      return Ok(List(matched))
    } catch (error) {
      return Err(toFsError(dir, "glob", error))
    }
  },

  writeFile: async (p: string, data: string, encoding: BufferEncoding = "utf8"): TaskResult<void> => {
    try {
      await fs.writeFile(p, data, { encoding })
      return Ok(undefined as void)
    } catch (error) {
      return Err(toFsError(p, "writeFile", error))
    }
  },

  mkdir: async (p: string, options?: { recursive?: boolean }): TaskResult<void> => {
    try {
      await fs.mkdir(p, options)
      return Ok(undefined as void)
    } catch (error) {
      return Err(toFsError(p, "mkdir", error))
    }
  },

  // Sync methods — return Either<FsError, T>

  existsSync: (p: string): boolean => {
    try {
      fsSync.accessSync(p)
      return true
    } catch {
      return false
    }
  },

  readFileSync: (p: string, encoding: BufferEncoding = "utf8"): Either<FsError, string> => {
    try {
      return Right(fsSync.readFileSync(p, { encoding }))
    } catch (error) {
      return Left(toFsError(p, "readFileSync", error))
    }
  },

  readFileOptSync: (p: string, encoding: BufferEncoding = "utf8"): Either<FsError, Option<string>> => {
    try {
      return Right(Option(fsSync.readFileSync(p, { encoding })))
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return Right(Option<string>(undefined))
      }
      return Left(toFsError(p, "readFileOptSync", error))
    }
  },

  statSync: (p: string): Either<FsError, FileInfo> => {
    try {
      return Right(toFileInfo(fsSync.statSync(p)))
    } catch (error) {
      return Left(toFsError(p, "statSync", error))
    }
  },

  copyFileSync: (src: string, dest: string): Either<FsError, void> => {
    try {
      fsSync.copyFileSync(src, dest)
      return Right(undefined as void)
    } catch (error) {
      return Left(toFsError(src, "copyFileSync", error))
    }
  },

  renameSync: (oldPath: string, newPath: string): Either<FsError, void> => {
    try {
      fsSync.renameSync(oldPath, newPath)
      return Right(undefined as void)
    } catch (error) {
      return Left(toFsError(oldPath, "renameSync", error))
    }
  },

  readdirSync: (p: string): Either<FsError, List<string>> => {
    try {
      return Right(List(fsSync.readdirSync(p)))
    } catch (error) {
      return Left(toFsError(p, "readdirSync", error))
    }
  },

  writeFileSync: (p: string, data: string, encoding: BufferEncoding = "utf8"): Either<FsError, void> => {
    try {
      fsSync.writeFileSync(p, data, { encoding })
      return Right(undefined as void)
    } catch (error) {
      return Left(toFsError(p, "writeFileSync", error))
    }
  },

  mkdirSync: (p: string, options?: { recursive?: boolean }): Either<FsError, void> => {
    try {
      fsSync.mkdirSync(p, options)
      return Right(undefined as void)
    } catch (error) {
      return Left(toFsError(p, "mkdirSync", error))
    }
  },

  unlink: async (p: string): TaskResult<void> => {
    try {
      await fs.unlink(p)
      return Ok(undefined as void)
    } catch (error) {
      return Err(toFsError(p, "unlink", error))
    }
  },

  unlinkSync: (p: string): Either<FsError, void> => {
    try {
      fsSync.unlinkSync(p)
      return Right(undefined as void)
    } catch (error) {
      return Left(toFsError(p, "unlinkSync", error))
    }
  },
}
