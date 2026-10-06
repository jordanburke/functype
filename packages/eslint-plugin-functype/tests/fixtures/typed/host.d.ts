// Library signatures for the type-aware tests, standing in for .d.ts files under node_modules (never
// linted). Several deliberately require mutable arrays, as pg, drizzle and jose do.
declare function hostQuery(text: string, values: unknown[]): void
declare function hostInsertRows(rows: { id: number }[]): void
declare function hostLoadRows(): { id: number }[]
declare function hostAnd(...conds: unknown[]): void
declare function hostVerify(options: { audience: string | string[] }): void
declare function hostRun(options: { sql: string; params: unknown[] }): void
declare function hostAgent(options: { allowedTools?: string[] }): void
declare function hostImportKey(format: "raw", usages: string[]): void
declare function hostImportKey(format: "jwk", usages: string[], extra: number): void
declare function hostJson<T>(data: T): void
declare function hostConsume(values: Iterable<string>): void
