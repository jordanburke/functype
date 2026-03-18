import { exec as execCb, execSync as nodeExecSync } from "node:child_process"

import type { Either, TaskResult } from "functype"
import { Err, Left, Ok, Right } from "functype"

import { ProcessError } from "../errors/errors"

export type ExecResult = {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

export const Process = {
  exec: (command: string, options?: { timeout?: number; cwd?: string }): TaskResult<ExecResult> => {
    return new Promise((resolve) => {
      execCb(command, { timeout: options?.timeout, cwd: options?.cwd }, (error, stdout, stderr) => {
        if (error) {
          // exec callback error has `code` as exit code (number) — distinct from Node errno `code` (string)
          const exitCode = typeof error.code === "number" ? error.code : null
          resolve(Err(ProcessError(command, exitCode, String(stderr))))
        } else {
          resolve(Ok({ stdout: String(stdout), stderr: String(stderr), exitCode: 0 }))
        }
      })
    })
  },

  execSync: (command: string, options?: { timeout?: number; cwd?: string }): Either<ProcessError, ExecResult> => {
    try {
      const stdout = nodeExecSync(command, {
        timeout: options?.timeout,
        cwd: options?.cwd,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      })
      return Right({ stdout: String(stdout), stderr: "", exitCode: 0 })
    } catch (error) {
      if (error instanceof Error && "status" in error && "stderr" in error) {
        const execError = error as Error & { status: number; stderr: string }
        return Left(ProcessError(command, execError.status, String(execError.stderr)))
      }
      return Left(ProcessError(command, null, "", error instanceof Error ? error.message : String(error)))
    }
  },
}
