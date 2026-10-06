import { exec as execCb, execSync as nodeExecSync } from "node:child_process"

import type { Either } from "functype"
import { IO, Left, Option, Right, Try } from "functype"

import { ProcessError } from "../errors/errors"

export type ExecResult = {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

export const Process = {
  // Lazy: the command doesn't start until the IO runs.
  exec: (command: string, options?: { timeout?: number; cwd?: string }): IO<never, ProcessError, ExecResult> =>
    IO.fromPromiseEither(
      () =>
        new Promise<Either<ProcessError, ExecResult>>((resolve) => {
          execCb(command, { timeout: options?.timeout, cwd: options?.cwd }, (error, stdout, stderr) => {
            if (error) {
              // exec callback error has `code` as exit code (number) — distinct from Node errno `code` (string)
              const exitCode = Option(typeof error.code === "number" ? error.code : undefined)
              resolve(Left(ProcessError(command, exitCode, String(stderr))))
            } else {
              resolve(Right({ stdout: String(stdout), stderr: String(stderr), exitCode: 0 }))
            }
          })
        }),
    ),

  execSync: (command: string, options?: { timeout?: number; cwd?: string }): Either<ProcessError, ExecResult> => {
    const buildProcessError = (error: unknown): ProcessError => {
      if (error instanceof Error && "status" in error && "stderr" in error) {
        const execError = error as Error & { status: number; stderr: string }
        return ProcessError(command, Option(execError.status), String(execError.stderr))
      }
      return ProcessError(
        command,
        Option<number>(undefined),
        "",
        error instanceof Error ? error.message : String(error),
      )
    }
    return Try(() =>
      nodeExecSync(command, {
        timeout: options?.timeout,
        cwd: options?.cwd,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }),
    )
      .toEither(buildProcessError)
      .map((stdout): ExecResult => ({ stdout: String(stdout), stderr: "", exitCode: 0 }))
  },
}
