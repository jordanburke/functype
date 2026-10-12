import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { IO } from "@/io"

/**
 * A successful `IO.all` must leave its children's signal live: a `fetch` response it returns is
 * still read through that signal. 1.16's first cut aborted it on success, and the body read
 * failed with `AbortError`.
 */

const state: { server?: Server; url: string } = { url: "" }

beforeAll(async () => {
  const server = createServer((_, res) => {
    res.writeHead(200, { "content-type": "application/json" })
    res.write('{"items":[')
    // Send the rest later, so the body is still streaming after `fetch` resolves.
    setTimeout(() => res.end("1,2,3]}"), 30)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  state.server = server
  state.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
})

afterAll(async () => {
  await new Promise<void>((resolve) => state.server?.close(() => resolve()))
})

describe("IO.all with real fetch", () => {
  it("returns responses whose bodies can still be read", async () => {
    const get = IO.async((signal) => fetch(state.url, { signal }))
    const responses = await IO.all([get, get], { concurrency: 2 }).runOrThrow()
    const bodies = await Promise.all(responses.map((r) => r.json() as Promise<{ items: number[] }>))
    expect(bodies.map((b) => b.items)).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ])
  })
})
