import { describe, expect, expectTypeOf, it, vi } from "vitest"

import { Decoder, type Encoder } from "@/decoder"
import { Http } from "@/fetch/Http"
import { IO } from "@/io"
import { Option } from "@/option/Option"
import type { JSONValue } from "@/serialization/Serialization"

const okFetch = () =>
  vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
    ),
  )

const sentBody = (fetch: ReturnType<typeof okFetch>): unknown => fetch.mock.calls[0]?.[1]?.body

type NewUser = { readonly name: string; readonly createdAt: Date; readonly nickname: Option<string> }

const encodeNewUser: Encoder<NewUser> = (u) => ({
  user_name: u.name,
  created_at: u.createdAt.toISOString().slice(0, 10),
})

const alice: NewUser = { name: "alice", createdAt: new Date("2026-06-01T12:00:00Z"), nickname: Option("al") }

/**
 * `encode` is the request-side escape hatch for wire shapes `flatten` can't express (#276 §7).
 * When set it owns the body: `flatten` is ignored and its output is JSON-stringified as is.
 */
describe("Http encode", () => {
  it("puts the encoder's output on the wire", async () => {
    const fetch = okFetch()
    const http = Http.client({ fetch })
    await http.post("https://api.test/users", { body: alice, encode: encodeNewUser }).runOrThrow()

    expect(sentBody(fetch)).toBe(JSON.stringify({ user_name: "alice", created_at: "2026-06-01" }))
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({ "Content-Type": "application/json" })
  })

  it("ignores flatten when encode is set", async () => {
    const fetch = okFetch()
    const http = Http.client({ fetch })
    const encode: Encoder<{ readonly tag: Option<number> }> = (b) => ({ tag: b.tag.orElse(0) + 1 })
    await http.put("https://api.test/x", { body: { tag: Option(1) }, encode, flatten: false }).runOrThrow()

    expect(sentBody(fetch)).toBe(JSON.stringify({ tag: 2 }))
  })

  it("works on patch, delete and request", async () => {
    const fetch = okFetch()
    const http = Http.client({ fetch })
    const encode: Encoder<number> = (n) => ({ n })
    await http.patch("https://api.test/a", { body: 1, encode }).runOrThrow()
    await http.delete("https://api.test/b", { body: 2, encode }).runOrThrow()
    await http.request({ url: "https://api.test/c", method: "POST", body: 3, encode }).runOrThrow()

    expect(fetch.mock.calls.map((call) => call[1]?.body)).toEqual(['{"n":1}', '{"n":2}', '{"n":3}'])
  })

  it("is not called when there is no body", async () => {
    const fetch = okFetch()
    const encode = vi.fn<Encoder<unknown>>(() => null)
    await Http.client({ fetch }).post("https://api.test/empty", { encode }).runOrThrow()

    expect(encode).not.toHaveBeenCalled()
    expect(sentBody(fetch)).toBeUndefined()
  })

  it("encodes the body beforeRequest returns", async () => {
    const fetch = okFetch()
    const http = Http.client({
      fetch,
      beforeRequest: (view) => IO.succeed({ ...view, body: { ...alice, name: "bob" } }),
    })
    await http.post("https://api.test/users", { body: alice, encode: encodeNewUser }).runOrThrow()

    expect(sentBody(fetch)).toBe(JSON.stringify({ user_name: "bob", created_at: "2026-06-01" }))
  })

  it("fails with NetworkError and never calls fetch when encode throws", async () => {
    const fetch = okFetch()
    const boom = new Error("cannot encode")
    const result = await Http.client({ fetch })
      .post("https://api.test/users", {
        body: alice,
        encode: () => {
          throw boom
        },
      })
      .run()

    expect(fetch).not.toHaveBeenCalled()
    const error = result.fold(
      (e) => e,
      () => undefined,
    )
    expect(error?._tag).toBe("NetworkError")
    expect(error?._tag === "NetworkError" ? error.cause : undefined).toBe(boom)
  })

  it("combines with decode on the same call", async () => {
    const fetch = okFetch()
    const response = await Http.client({ fetch })
      .post("https://api.test/users", {
        body: alice,
        encode: encodeNewUser,
        decode: Decoder.object({ ok: Decoder.boolean }),
      })
      .runOrThrow()

    expect(response.data).toEqual({ ok: true })
  })

  describe("types", () => {
    it("Encoder<A> returns JSONValue", () => {
      expectTypeOf(encodeNewUser).toEqualTypeOf<(value: NewUser) => JSONValue>()
      // @ts-expect-error a Date is not a JSONValue
      const bad: Encoder<NewUser> = (u) => ({ at: u.createdAt })
      expect(bad).toBeTypeOf("function")
    })

    it("infers TReq from encode when no type arguments are passed", () => {
      // Built only to type-check; `void` marks the IOs as deliberately not run.
      const http = Http.client({ fetch: okFetch() })
      void http.post("https://api.test/users", { body: alice, encode: encodeNewUser })
      void Http.post("https://api.test/users", { body: alice, encode: encodeNewUser })
    })

    it("needs both type arguments when the response type is explicit", () => {
      const http = Http.client({ fetch: okFetch() })
      const decode = Decoder.object({ id: Decoder.number })
      void http.post<{ id: number }, NewUser>("https://api.test/users", { body: alice, encode: encodeNewUser, decode })
      // @ts-expect-error TReq defaults to unknown, and Encoder<NewUser> doesn't accept unknown
      void http.post<{ id: number }>("https://api.test/users", { body: alice, encode: encodeNewUser, decode })
    })
  })
})
