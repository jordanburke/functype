# Phase 2 Additions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete functype-os with write operations, stat, copy/rename, glob, Env.parse, and Process.exec modules.

**Architecture:** Each feature follows the existing pattern — async methods return `TaskResult<T>` (i.e. `Promise<TaskOutcome<T>>` using `Ok`/`Err`), sync methods return `Either<FsError, T>`. New modules (`Process`) follow the same namespace-object pattern as `Fs`, `Env`, `Platform`. Error types are discriminated unions with `_tag`.

**Tech Stack:** TypeScript strict, functype (Option, Either, Ok, Err, List), Node.js `node:fs`, `node:fs/promises`, `node:child_process`, vitest

---

## File Structure

### New files

- `src/process/Process.ts` — Process.exec, Process.execSync wrapper
- `src/process/index.ts` — Barrel export
- `test/process/process.spec.ts` — Process tests

### Modified files

- `src/fs/Fs.ts` — Add writeFile, mkdir, unlink, stat, copyFile, rename, glob (async + sync)
- `src/errors/errors.ts` — Add ProcessError type + constructor
- `src/index.ts` — Add Process export, ProcessError export
- `package.json` — Add `./process` subpath export
- `test/fs/fs.spec.ts` — Add tests for new Fs methods
- `test/env/env.spec.ts` — Add Env.parse tests
- `src/env/Env.ts` — Add Env.parse method

---

## Chunk 1: Fs Write Operations

### Task 1: Fs.writeFile + Fs.writeFileSync

**Files:**

- Modify: `src/fs/Fs.ts`
- Modify: `test/fs/fs.spec.ts`

- [ ] **Step 1: Write failing tests for writeFile**

Add to `test/fs/fs.spec.ts` inside the `Fs` describe block:

```typescript
describe("writeFile", () => {
  it("should write content and return Ok(undefined)", async () => {
    const target = path.join(tmpDir, "write-test.txt")
    const result = await Fs.writeFile(target, "written content")
    expect(result.isOk()).toBe(true)
    expect(fs.readFileSync(target, "utf8")).toBe("written content")
  })

  it("should return Err for invalid path", async () => {
    const result = await Fs.writeFile("/no-such-dir/file.txt", "data")
    expect(result.isErr()).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL — `Fs.writeFile is not a function`

- [ ] **Step 3: Implement Fs.writeFile**

Add to `src/fs/Fs.ts` inside the `Fs` object, after `readdir`:

```typescript
writeFile: async (p: string, data: string, encoding: BufferEncoding = "utf8"): TaskResult<void> => {
  try {
    await fs.writeFile(p, data, { encoding })
    return Ok(undefined as void)
  } catch (error) {
    return Err(toFsError(p, "writeFile", error))
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for writeFileSync**

Add to `test/fs/fs.spec.ts`:

```typescript
describe("writeFileSync", () => {
  it("should write content and return Right(undefined)", () => {
    const target = path.join(tmpDir, "write-sync-test.txt")
    const result = Fs.writeFileSync(target, "sync content")
    expect(result.isRight()).toBe(true)
    expect(fs.readFileSync(target, "utf8")).toBe("sync content")
  })

  it("should return Left for invalid path", () => {
    const result = Fs.writeFileSync("/no-such-dir/file.txt", "data")
    expect(result.isLeft()).toBe(true)
  })
})
```

- [ ] **Step 6: Implement Fs.writeFileSync**

Add to `src/fs/Fs.ts` inside the `Fs` object, after `readdirSync`:

```typescript
writeFileSync: (p: string, data: string, encoding: BufferEncoding = "utf8"): Either<FsError, void> => {
  try {
    fsSync.writeFileSync(p, data, { encoding })
    return Right(undefined as void)
  } catch (error) {
    return Left(toFsError(p, "writeFileSync", error))
  }
},
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/fs/Fs.ts test/fs/fs.spec.ts
git commit -m "feat(fs): add writeFile and writeFileSync"
```

### Task 2: Fs.mkdir + Fs.mkdirSync

**Files:**

- Modify: `src/fs/Fs.ts`
- Modify: `test/fs/fs.spec.ts`

- [ ] **Step 1: Write failing tests for mkdir**

```typescript
describe("mkdir", () => {
  it("should create directory and return Ok(undefined)", async () => {
    const target = path.join(tmpDir, "new-dir")
    const result = await Fs.mkdir(target)
    expect(result.isOk()).toBe(true)
    expect(fs.statSync(target).isDirectory()).toBe(true)
  })

  it("should create nested directories with recursive option", async () => {
    const target = path.join(tmpDir, "a", "b", "c")
    const result = await Fs.mkdir(target, { recursive: true })
    expect(result.isOk()).toBe(true)
    expect(fs.statSync(target).isDirectory()).toBe(true)
  })

  it("should return Err for invalid path without recursive", async () => {
    const result = await Fs.mkdir(path.join(tmpDir, "x", "y", "z"))
    expect(result.isErr()).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement Fs.mkdir**

```typescript
mkdir: async (p: string, options?: { recursive?: boolean }): TaskResult<void> => {
  try {
    await fs.mkdir(p, options)
    return Ok(undefined as void)
  } catch (error) {
    return Err(toFsError(p, "mkdir", error))
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for mkdirSync**

```typescript
describe("mkdirSync", () => {
  it("should create directory and return Right(undefined)", () => {
    const target = path.join(tmpDir, "new-dir-sync")
    const result = Fs.mkdirSync(target)
    expect(result.isRight()).toBe(true)
    expect(fs.statSync(target).isDirectory()).toBe(true)
  })

  it("should create nested directories with recursive", () => {
    const target = path.join(tmpDir, "d", "e", "f")
    const result = Fs.mkdirSync(target, { recursive: true })
    expect(result.isRight()).toBe(true)
    expect(fs.statSync(target).isDirectory()).toBe(true)
  })
})
```

- [ ] **Step 6: Implement Fs.mkdirSync**

```typescript
mkdirSync: (p: string, options?: { recursive?: boolean }): Either<FsError, void> => {
  try {
    fsSync.mkdirSync(p, options)
    return Right(undefined as void)
  } catch (error) {
    return Left(toFsError(p, "mkdirSync", error))
  }
},
```

- [ ] **Step 7: Run tests, commit**

Run: `pnpm vitest run test/fs/fs.spec.ts`

```bash
git add src/fs/Fs.ts test/fs/fs.spec.ts
git commit -m "feat(fs): add mkdir and mkdirSync"
```

### Task 3: Fs.unlink + Fs.unlinkSync

**Files:**

- Modify: `src/fs/Fs.ts`
- Modify: `test/fs/fs.spec.ts`

- [ ] **Step 1: Write failing tests for unlink**

```typescript
describe("unlink", () => {
  it("should delete file and return Ok(undefined)", async () => {
    const target = path.join(tmpDir, "to-delete.txt")
    fs.writeFileSync(target, "delete me")
    const result = await Fs.unlink(target)
    expect(result.isOk()).toBe(true)
    expect(fs.existsSync(target)).toBe(false)
  })

  it("should return Err for non-existing file", async () => {
    const result = await Fs.unlink(path.join(tmpDir, "no-exist.txt"))
    expect(result.isErr()).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement Fs.unlink**

```typescript
unlink: async (p: string): TaskResult<void> => {
  try {
    await fs.unlink(p)
    return Ok(undefined as void)
  } catch (error) {
    return Err(toFsError(p, "unlink", error))
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Write failing tests for unlinkSync**

```typescript
describe("unlinkSync", () => {
  it("should delete file and return Right(undefined)", () => {
    const target = path.join(tmpDir, "to-delete-sync.txt")
    fs.writeFileSync(target, "delete me")
    const result = Fs.unlinkSync(target)
    expect(result.isRight()).toBe(true)
    expect(fs.existsSync(target)).toBe(false)
  })

  it("should return Left for non-existing file", () => {
    const result = Fs.unlinkSync(path.join(tmpDir, "no-exist-sync.txt"))
    expect(result.isLeft()).toBe(true)
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL — `Fs.unlinkSync is not a function`

- [ ] **Step 7: Implement unlinkSync**

```typescript
unlinkSync: (p: string): Either<FsError, void> => {
  try {
    fsSync.unlinkSync(p)
    return Right(undefined as void)
  } catch (error) {
    return Left(toFsError(p, "unlinkSync", error))
  }
},
```

- [ ] **Step 8: Run tests, commit**

Run: `pnpm vitest run test/fs/fs.spec.ts`

```bash
git add src/fs/Fs.ts test/fs/fs.spec.ts
git commit -m "feat(fs): add unlink and unlinkSync"
```

---

## Chunk 2: Fs.stat + FileInfo Type

### Task 4: FileInfo type and Fs.stat + Fs.statSync

**Files:**

- Modify: `src/fs/Fs.ts`
- Modify: `src/index.ts` — export `FileInfo` type
- Modify: `test/fs/fs.spec.ts`

- [ ] **Step 1: Define FileInfo type**

Add at the top of `src/fs/Fs.ts` (after imports):

```typescript
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
```

- [ ] **Step 2: Write failing tests for stat**

```typescript
describe("stat", () => {
  it("should return Ok with FileInfo for existing file", async () => {
    const result = await Fs.stat(testFile)
    expect(result.isOk()).toBe(true)
    const info = result.value
    expect(info.isFile).toBe(true)
    expect(info.isDirectory).toBe(false)
    expect(info.size).toBeGreaterThan(0)
    expect(info.modifiedAt).toBeInstanceOf(Date)
  })

  it("should return Ok with FileInfo for directory", async () => {
    const result = await Fs.stat(tmpDir)
    expect(result.isOk()).toBe(true)
    expect(result.value.isDirectory).toBe(true)
    expect(result.value.isFile).toBe(false)
  })

  it("should return Err for non-existing path", async () => {
    const result = await Fs.stat(path.join(tmpDir, "nope"))
    expect(result.isErr()).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`

- [ ] **Step 4: Implement Fs.stat**

```typescript
stat: async (p: string): TaskResult<FileInfo> => {
  try {
    return Ok(toFileInfo(await fs.stat(p)))
  } catch (error) {
    return Err(toFsError(p, "stat", error))
  }
},
```

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Write failing tests for statSync**

```typescript
describe("statSync", () => {
  it("should return Right with FileInfo for existing file", () => {
    const result = Fs.statSync(testFile)
    expect(result.isRight()).toBe(true)
    expect(result.value.isFile).toBe(true)
    expect(result.value.size).toBeGreaterThan(0)
  })

  it("should return Left for non-existing path", () => {
    const result = Fs.statSync(path.join(tmpDir, "nope"))
    expect(result.isLeft()).toBe(true)
  })
})
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL — `Fs.statSync is not a function`

- [ ] **Step 8: Implement statSync**

```typescript
statSync: (p: string): Either<FsError, FileInfo> => {
  try {
    return Right(toFileInfo(fsSync.statSync(p)))
  } catch (error) {
    return Left(toFsError(p, "statSync", error))
  }
},
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: PASS

- [ ] **Step 10: Export FileInfo from src/index.ts**

Add to `src/index.ts`:

```typescript
export type { FileInfo } from "./fs"
```

And in `src/fs/index.ts`, add:

```typescript
export type { FileInfo } from "./Fs"
```

- [ ] **Step 11: Run tests, commit**

Run: `pnpm vitest run test/fs/fs.spec.ts`

```bash
git add src/fs/Fs.ts src/fs/index.ts src/index.ts test/fs/fs.spec.ts
git commit -m "feat(fs): add stat/statSync with FileInfo type"
```

---

## Chunk 3: Fs.copyFile, Fs.rename, Fs.glob

### Task 5: Fs.copyFile + Fs.copyFileSync

**Files:**

- Modify: `src/fs/Fs.ts`
- Modify: `test/fs/fs.spec.ts`

- [ ] **Step 1: Write failing tests for copyFile**

```typescript
describe("copyFile", () => {
  it("should copy file and return Ok(undefined)", async () => {
    const dest = path.join(tmpDir, "copied.txt")
    const result = await Fs.copyFile(testFile, dest)
    expect(result.isOk()).toBe(true)
    expect(fs.readFileSync(dest, "utf8")).toBe(testContent)
  })

  it("should return Err when source does not exist", async () => {
    const result = await Fs.copyFile(path.join(tmpDir, "nope.txt"), path.join(tmpDir, "dest.txt"))
    expect(result.isErr()).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement Fs.copyFile**

```typescript
copyFile: async (src: string, dest: string): TaskResult<void> => {
  try {
    await fs.copyFile(src, dest)
    return Ok(undefined as void)
  } catch (error) {
    return Err(toFsError(src, "copyFile", error))
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Write failing tests for copyFileSync**

```typescript
describe("copyFileSync", () => {
  it("should copy file and return Right(undefined)", () => {
    const dest = path.join(tmpDir, "copied-sync.txt")
    const result = Fs.copyFileSync(testFile, dest)
    expect(result.isRight()).toBe(true)
    expect(fs.readFileSync(dest, "utf8")).toBe(testContent)
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL — `Fs.copyFileSync is not a function`

- [ ] **Step 7: Implement copyFileSync**

```typescript
copyFileSync: (src: string, dest: string): Either<FsError, void> => {
  try {
    fsSync.copyFileSync(src, dest)
    return Right(undefined as void)
  } catch (error) {
    return Left(toFsError(src, "copyFileSync", error))
  }
},
```

- [ ] **Step 8: Run tests, commit**

```bash
git add src/fs/Fs.ts test/fs/fs.spec.ts
git commit -m "feat(fs): add copyFile and copyFileSync"
```

### Task 6: Fs.rename + Fs.renameSync

**Files:**

- Modify: `src/fs/Fs.ts`
- Modify: `test/fs/fs.spec.ts`

- [ ] **Step 1: Write failing tests for rename**

```typescript
describe("rename", () => {
  it("should rename file and return Ok(undefined)", async () => {
    const src = path.join(tmpDir, "rename-src.txt")
    const dest = path.join(tmpDir, "rename-dest.txt")
    fs.writeFileSync(src, "rename me")
    const result = await Fs.rename(src, dest)
    expect(result.isOk()).toBe(true)
    expect(fs.existsSync(src)).toBe(false)
    expect(fs.readFileSync(dest, "utf8")).toBe("rename me")
  })

  it("should return Err when source does not exist", async () => {
    const result = await Fs.rename(path.join(tmpDir, "nope.txt"), path.join(tmpDir, "dest.txt"))
    expect(result.isErr()).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL — `Fs.rename is not a function`

- [ ] **Step 3: Implement Fs.rename**

```typescript
rename: async (oldPath: string, newPath: string): TaskResult<void> => {
  try {
    await fs.rename(oldPath, newPath)
    return Ok(undefined as void)
  } catch (error) {
    return Err(toFsError(oldPath, "rename", error))
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for renameSync**

```typescript
describe("renameSync", () => {
  it("should rename file and return Right(undefined)", () => {
    const src = path.join(tmpDir, "rename-sync-src.txt")
    const dest = path.join(tmpDir, "rename-sync-dest.txt")
    fs.writeFileSync(src, "rename sync")
    const result = Fs.renameSync(src, dest)
    expect(result.isRight()).toBe(true)
    expect(fs.existsSync(src)).toBe(false)
    expect(fs.readFileSync(dest, "utf8")).toBe("rename sync")
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL — `Fs.renameSync is not a function`

- [ ] **Step 7: Implement renameSync**

```typescript
renameSync: (oldPath: string, newPath: string): Either<FsError, void> => {
  try {
    fsSync.renameSync(oldPath, newPath)
    return Right(undefined as void)
  } catch (error) {
    return Left(toFsError(oldPath, "renameSync", error))
  }
},
```

- [ ] **Step 8: Run tests, commit**

```bash
git add src/fs/Fs.ts test/fs/fs.spec.ts
git commit -m "feat(fs): add rename and renameSync"
```

### Task 7: Fs.glob

**Files:**

- Modify: `src/fs/Fs.ts`
- Modify: `test/fs/fs.spec.ts`

Note: `node:fs/promises` has `glob` since Node 22. Since we use `fs.readdir` with `{ recursive: true }` (available since Node 18.17), bump `package.json` engines to `"node": ">=18.17.0"`. The `matchGlob` helper supports `**` (globstar) and `*` (wildcard) patterns — `?` and character classes are not supported in v1.

- [ ] **Step 1: Write failing tests for glob**

```typescript
describe("glob", () => {
  beforeAll(() => {
    fs.mkdirSync(path.join(tmpDir, "glob-test", "sub"), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, "glob-test", "a.ts"), "a")
    fs.writeFileSync(path.join(tmpDir, "glob-test", "b.js"), "b")
    fs.writeFileSync(path.join(tmpDir, "glob-test", "sub", "c.ts"), "c")
  })

  it("should return matching files for *.ts pattern", async () => {
    const result = await Fs.glob(path.join(tmpDir, "glob-test"), "**/*.ts")
    expect(result.isOk()).toBe(true)
    const files = result.value.toArray()
    expect(files).toContain("a.ts")
    expect(files).toContain(path.join("sub", "c.ts"))
    expect(files).not.toContain("b.js")
  })

  it("should return empty list for no matches", async () => {
    const result = await Fs.glob(path.join(tmpDir, "glob-test"), "**/*.py")
    expect(result.isOk()).toBe(true)
    expect(result.value.size).toBe(0)
  })

  it("should return Err for non-existing directory", async () => {
    const result = await Fs.glob(path.join(tmpDir, "no-dir"), "**/*")
    expect(result.isErr()).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run test/fs/fs.spec.ts`
Expected: FAIL — `Fs.glob is not a function`

- [ ] **Step 3: Implement Fs.glob**

Add a helper function before the `Fs` object:

```typescript
const matchGlob = (filePath: string, pattern: string): boolean => {
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*")
  return new RegExp(`^${regex}$`).test(filePath)
}
```

Add to the `Fs` object:

```typescript
glob: async (dir: string, pattern: string): TaskResult<List<string>> => {
  try {
    const entries = await fs.readdir(dir, { recursive: true })
    const matched = entries
      .map((e) => (typeof e === "string" ? e : e.toString()))
      .filter((entry) => matchGlob(entry, pattern))
    return Ok(List(matched))
  } catch (error) {
    return Err(toFsError(dir, "glob", error))
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run test/fs/fs.spec.ts`

- [ ] **Step 5: Bump Node engine version in package.json**

Change `"node": ">=18.0.0"` to `"node": ">=18.17.0"` in `package.json` (required for `readdir({ recursive: true })`).

- [ ] **Step 6: Commit**

```bash
git add src/fs/Fs.ts test/fs/fs.spec.ts package.json
git commit -m "feat(fs): add glob for pattern-based file discovery"
```

---

## Chunk 4: Env.parse

### Task 8: Env.parse

**Files:**

- Modify: `src/env/Env.ts`
- Modify: `test/env/env.spec.ts`

- [ ] **Step 1: Write failing tests for Env.parse**

Add to `test/env/env.spec.ts`:

```typescript
describe("parse", () => {
  it("should parse string env var as number", () => {
    process.env["TEST_PORT"] = "3000"
    const result = Env.parse("TEST_PORT", Number)
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe(3000)
    delete process.env["TEST_PORT"]
  })

  it("should return Left for NaN result with Number parser", () => {
    process.env["TEST_BAD_NUM"] = "not-a-number"
    const result = Env.parse("TEST_BAD_NUM", Number)
    expect(result.isLeft()).toBe(true)
    delete process.env["TEST_BAD_NUM"]
  })

  it("should return Left for missing env var", () => {
    const result = Env.parse("MISSING_PARSE_VAR", Number)
    expect(result.isLeft()).toBe(true)
  })

  it("should parse with custom parser function", () => {
    process.env["TEST_BOOL"] = "true"
    const result = Env.parse("TEST_BOOL", (v) => v === "true")
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe(true)
    delete process.env["TEST_BOOL"]
  })

  it("should parse JSON with JSON.parse", () => {
    process.env["TEST_JSON"] = '{"key":"value"}'
    const result = Env.parse("TEST_JSON", JSON.parse)
    expect(result.isRight()).toBe(true)
    expect(result.value).toEqual({ key: "value" })
    delete process.env["TEST_JSON"]
  })

  it("should return Left when custom parser throws", () => {
    process.env["TEST_THROW"] = "bad"
    const result = Env.parse("TEST_THROW", () => {
      throw new Error("parse failed")
    })
    expect(result.isLeft()).toBe(true)
    delete process.env["TEST_THROW"]
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run test/env/env.spec.ts`
Expected: FAIL — `Env.parse is not a function`

- [ ] **Step 3: Implement Env.parse**

Add to the `EnvCompanion` object in `src/env/Env.ts`:

```typescript
parse: <T>(name: string, parser: (value: string) => T): Either<EnvError, T> => {
  const value = process.env[name]
  if (value === undefined) {
    return Left(EnvError(name))
  }
  try {
    const parsed = parser(value)
    if (typeof parsed === "number" && isNaN(parsed)) {
      return Left(EnvError(name, `Cannot parse '${value}' as number for '${name}'`))
    }
    return Right(parsed)
  } catch (error) {
    return Left(EnvError(name, `Failed to parse '${name}': ${error instanceof Error ? error.message : String(error)}`))
  }
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run test/env/env.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/env/Env.ts test/env/env.spec.ts
git commit -m "feat(env): add Env.parse for typed env var parsing"
```

---

## Chunk 5: Process Module

### Task 9: ProcessError type

**Files:**

- Modify: `src/errors/errors.ts`

- [ ] **Step 1: Add ProcessError type and constructor**

Add to `src/errors/errors.ts`:

```typescript
export type ProcessError = {
  readonly _tag: "ProcessError"
  readonly command: string
  readonly exitCode: number | null
  readonly stderr: string
  readonly message: string
}

export const ProcessError = (
  command: string,
  exitCode: number | null,
  stderr: string,
  message?: string,
): ProcessError => ({
  _tag: "ProcessError",
  command,
  exitCode,
  stderr,
  message: message ?? `Command '${command}' failed (exit ${exitCode}): ${stderr}`,
})
```

- [ ] **Step 2: Update OsError union**

Change the `OsError` type:

```typescript
export type OsError = EnvError | PathError | FsError | ConfigError | ProcessError
```

- [ ] **Step 3: Commit**

```bash
git add src/errors/errors.ts
git commit -m "feat(errors): add ProcessError type"
```

### Task 10: Process module

**Files:**

- Create: `src/process/Process.ts`
- Create: `src/process/index.ts`
- Modify: `src/index.ts`
- Modify: `package.json`
- Create: `test/process/process.spec.ts`

- [ ] **Step 1: Create Process module files**

`src/process/index.ts`:

```typescript
export { Process } from "./Process"
```

`src/process/Process.ts`:

```typescript
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
```

- [ ] **Step 2: Update barrel exports**

Add to `src/index.ts`:

```typescript
export { ProcessError } from "./errors"
export type { ExecResult } from "./process"
export { Process } from "./process"
```

Add `ProcessError` to the existing errors export line or add a new line.

- [ ] **Step 3: Update errors/index.ts to export ProcessError**

Replace `src/errors/index.ts` with the complete file:

```typescript
export type { OsError } from "./errors"
export { ConfigError, EnvError, FsError, PathError, ProcessError } from "./errors"
```

- [ ] **Step 4: Add subpath export to package.json**

Add to the `exports` field in `package.json`:

```json
"./process": {
  "types": "./dist/process/index.d.ts",
  "import": "./dist/process/index.js",
  "default": "./dist/process/index.js"
}
```

- [ ] **Step 5: Write tests**

`test/process/process.spec.ts`:

```typescript
import { describe, expect, it } from "vitest"

import { Process } from "../../src/process"

describe("Process", () => {
  describe("exec", () => {
    it("should execute command and return Ok with ExecResult", async () => {
      const result = await Process.exec("echo hello")
      expect(result.isOk()).toBe(true)
      expect(result.value.stdout.trim()).toBe("hello")
      expect(result.value.exitCode).toBe(0)
    })

    it("should return Err for failing command", async () => {
      const result = await Process.exec("node -e 'process.exit(1)'")
      expect(result.isErr()).toBe(true)
    })

    it("should respect cwd option", async () => {
      const result = await Process.exec("pwd", { cwd: "/tmp" })
      expect(result.isOk()).toBe(true)
      // /tmp may resolve to a real path
      expect(result.value.stdout.trim()).toMatch(/tmp/)
    })
  })

  describe("execSync", () => {
    it("should execute command and return Right with ExecResult", () => {
      const result = Process.execSync("echo hello")
      expect(result.isRight()).toBe(true)
      expect(result.value.stdout.trim()).toBe("hello")
      expect(result.value.exitCode).toBe(0)
    })

    it("should return Left for failing command", () => {
      const result = Process.execSync("node -e 'process.exit(1)'")
      expect(result.isLeft()).toBe(true)
    })

    it("should respect cwd option", () => {
      const result = Process.execSync("pwd", { cwd: "/tmp" })
      expect(result.isRight()).toBe(true)
      expect(result.value.stdout.trim()).toMatch(/tmp/)
    })
  })
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run test/process/process.spec.ts`
Expected: PASS

- [ ] **Step 7: Run full validation**

Run: `pnpm validate`
Expected: All checks pass (format, lint, typecheck, test, build)

- [ ] **Step 8: Commit**

```bash
git add src/process/ src/errors/errors.ts src/errors/index.ts src/index.ts package.json test/process/
git commit -m "feat: add Process module with exec/execSync"
```

---

## Chunk 6: Final Validation + CLAUDE.md Update

### Task 11: Update CLAUDE.md and validate

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update module structure in CLAUDE.md**

Update the Architecture > Module Structure section to include `process/`:

```
src/
├── errors/     # Discriminated union error types (EnvError, PathError, FsError, ConfigError, ProcessError)
├── env/        # Env("VAR") → Option, Env.getRequired() → Either, Env.parse() → Either
├── path/       # expandTilde, expandVars, expandPath — pure sync functions
├── fs/         # Fs.exists, readFile, writeFile, mkdir, unlink, stat, copyFile, rename, glob → TaskResult
├── platform/   # OS detection + container runtime detection (lazy-cached)
├── config/     # ConfigResolver — find first existing config from candidates
├── process/    # Process.exec, Process.execSync → TaskResult/Either<ProcessError, ExecResult>
└── index.ts    # Barrel export
```

- [ ] **Step 2: Update Phase 2 section**

Replace the Phase 2 section with what remains:

```markdown
## Phase 3 (Future)

- Branded types: `AbsolutePath`, `RelativePath` via functype `Brand`
- `Fs.watch` — file watching
```

- [ ] **Step 3: Run full validation**

Run: `pnpm validate`
Expected: All checks pass

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for phase 2 additions"
```
