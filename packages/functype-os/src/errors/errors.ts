export type EnvError = {
  readonly _tag: "EnvError"
  readonly variable: string
  readonly message: string
}

export type PathError = {
  readonly _tag: "PathError"
  readonly path: string
  readonly reason: "unresolved_variable" | "invalid_path"
  readonly message: string
}

export type FsError = {
  readonly _tag: "FsError"
  readonly path: string
  readonly operation: string
  readonly cause: Error
  readonly message: string
}

export type ConfigError = {
  readonly _tag: "ConfigError"
  readonly candidates: readonly string[]
  readonly message: string
}

export type OsError = EnvError | PathError | FsError | ConfigError

export const EnvError = (variable: string, message?: string): EnvError => ({
  _tag: "EnvError",
  variable,
  message: message ?? `Environment variable '${variable}' is not set`,
})

export const PathError = (path: string, reason: PathError["reason"], message?: string): PathError => ({
  _tag: "PathError",
  path,
  reason,
  message:
    message ?? (reason === "unresolved_variable" ? `Unresolved variable in path: ${path}` : `Invalid path: ${path}`),
})

export const FsError = (path: string, operation: string, cause: Error): FsError => ({
  _tag: "FsError",
  path,
  operation,
  cause,
  message: `${operation} failed for '${path}': ${cause.message}`,
})

export const ConfigError = (candidates: readonly string[], message?: string): ConfigError => ({
  _tag: "ConfigError",
  candidates,
  message: message ?? `No config file found among candidates: ${candidates.join(", ")}`,
})
