import * as fs from "node:fs/promises"

import type { TaskResult } from "functype"
import { Err, List, Ok, Option } from "functype"

import { FsError } from "../errors/errors"

export const Fs = {
  exists: async (path: string): TaskResult<boolean> => {
    try {
      await fs.access(path)
      return Ok(true)
    } catch {
      return Ok(false)
    }
  },

  readFile: async (path: string, encoding: BufferEncoding = "utf8"): TaskResult<string> => {
    try {
      const content = await fs.readFile(path, { encoding })
      return Ok(content)
    } catch (error) {
      return Err(FsError(path, "readFile", error instanceof Error ? error : new Error(String(error))))
    }
  },

  readFileOpt: async (path: string, encoding: BufferEncoding = "utf8"): TaskResult<Option<string>> => {
    try {
      const content = await fs.readFile(path, { encoding })
      return Ok(Option(content))
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return Ok(Option<string>(undefined))
      }
      return Err(FsError(path, "readFile", error instanceof Error ? error : new Error(String(error))))
    }
  },

  readdir: async (path: string): TaskResult<List<string>> => {
    try {
      const entries = await fs.readdir(path)
      return Ok(List(entries))
    } catch (error) {
      return Err(FsError(path, "readdir", error instanceof Error ? error : new Error(String(error))))
    }
  },
}
