import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import type { IO, List, Option } from "functype"
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from "vitest"

import { ConfigResolver } from "../src/config"
import type { ConfigError, FsError, ProcessError } from "../src/errors"
import type { ExecResult } from "../src/process"
import { Process } from "../src/process"
import { Fs } from "../src/fs"

/**
 * The async methods return a lazy `IO` instead of an eager `TaskResult` (functype 2.0 drops
 * `Task`). These pin what that changes: nothing runs until `.run()`, the error channel is the
 * real error type rather than a wrapped `Throwable`, and failures that used to be caught are
 * still caught.
 */
describe("functype-os async methods are lazy IO", () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "functype-os-io-"))
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("Fs.writeFile does nothing until run", async () => {
    const target = path.join(tmpDir, "lazy.txt")
    const write = Fs.writeFile(target, "data")
    expect(fs.existsSync(target)).toBe(false)

    const result = await write.run()
    expect(result.isRight()).toBe(true)
    expect(fs.readFileSync(target, "utf8")).toBe("data")
  })

  it("Process.exec doesn't start the command until run", async () => {
    const marker = path.join(tmpDir, "exec-marker")
    const touch = Process.exec(`node -e "require('fs').writeFileSync('${marker}', '')"`)
    expect(fs.existsSync(marker)).toBe(false)

    await touch.run()
    expect(fs.existsSync(marker)).toBe(true)
  })

  it("the mkdir magic-filesystem guard is lazy too", async () => {
    const mkdir = Fs.mkdir("/proc/no-write-here/a", { recursive: true })
    const result = await mkdir.run()
    expect(result.isLeft() && result.value._tag).toBe("FsError")
  })

  it("a synchronous throw inside an operation is an FsError, not a crash", async () => {
    const result = await Fs.readFile(path.join(tmpDir, "x.txt"), "not-an-encoding" as BufferEncoding).run()
    expect(result.isLeft() && result.value._tag).toBe("FsError")
  })

  it("readFileOpt: a missing file is None, any other error is an FsError", async () => {
    const missing = await Fs.readFileOpt(path.join(tmpDir, "absent.txt")).run()
    expect(missing.isRight() && missing.value.isNone()).toBe(true)

    const directory = await Fs.readFileOpt(tmpDir).run()
    expect(directory.isLeft() && directory.value._tag).toBe("FsError")
  })

  it("ConfigResolver.resolveRequired fails with ConfigError when nothing exists", async () => {
    const result = await ConfigResolver.resolveRequired({ candidates: [path.join(tmpDir, "none.json")] }).run()
    expect(result.isLeft() && result.value._tag).toBe("ConfigError")
  })

  it("error channels are the real error types", () => {
    expectTypeOf(Fs.exists("x")).toEqualTypeOf<IO<never, never, boolean>>()
    expectTypeOf(Fs.readFile("x")).toEqualTypeOf<IO<never, FsError, string>>()
    expectTypeOf(Fs.readFileOpt("x")).toEqualTypeOf<IO<never, FsError, Option<string>>>()
    expectTypeOf(Fs.glob("x", "*")).toEqualTypeOf<IO<never, FsError, List<string>>>()
    expectTypeOf(Process.exec("x")).toEqualTypeOf<IO<never, ProcessError, ExecResult>>()
    expectTypeOf(ConfigResolver.resolve({ candidates: [] })).toEqualTypeOf<IO<never, never, Option<string>>>()
    expectTypeOf(ConfigResolver.resolveRequired({ candidates: [] })).toEqualTypeOf<IO<never, ConfigError, string>>()
  })
})
