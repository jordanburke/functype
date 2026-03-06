import * as fsSync from "node:fs"
import * as fs from "node:fs/promises"

import type { Either, TaskResult } from "functype"
import { Err, Left, List, Ok, Option, Right } from "functype"

import { FsError } from "../errors/errors"

const toFsError = (p: string, op: string, error: unknown): FsError =>
  FsError(p, op, error instanceof Error ? error : new Error(String(error)))

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

  readdir: async (p: string): TaskResult<List<string>> => {
    try {
      return Ok(List(await fs.readdir(p)))
    } catch (error) {
      return Err(toFsError(p, "readdir", error))
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

  readdirSync: (p: string): Either<FsError, List<string>> => {
    try {
      return Right(List(fsSync.readdirSync(p)))
    } catch (error) {
      return Left(toFsError(p, "readdirSync", error))
    }
  },
}
