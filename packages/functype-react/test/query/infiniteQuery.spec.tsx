import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query"
import { useInfiniteQuery } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { ioQueryFn } from "../../src/query/ioQueryFn"
import { IOQueryError } from "../../src/query/IOQueryError"
import { createWrapper } from "./harness"

type Page = { readonly page: number; readonly items: readonly string[] }

const pageAt = (page: number): Page => ({ page, items: [`item-${page}`] })

/**
 * `ioQueryFn` is generic over the query context precisely so an infinite query's
 * `pageParam` reaches the effect factory. That is a runtime contract, not just a
 * typing one — these cover the behaviour the type-level specs assert in `query.test-d.ts`.
 */
describe("ioQueryFn with useInfiniteQuery", () => {
  it("threads pageParam into the effect factory across pages", async () => {
    const seen: number[] = []

    const { result } = renderHook(
      () =>
        useInfiniteQuery({
          queryKey: ["pages"],
          queryFn: ioQueryFn<never, Page, QueryFunctionContext<QueryKey, number>>((context) => {
            seen.push(context.pageParam)
            return IO.succeed(pageAt(context.pageParam))
          }),
          initialPageParam: 0,
          getNextPageParam: (last: Page) => last.page + 1,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(seen).toEqual([0])

    await act(async () => {
      await result.current.fetchNextPage()
    })

    // The factory saw the next page's param — the thread-through this subpath advertises.
    expect(seen).toEqual([0, 1])
  })

  it("boxes a failing page into an IOQueryError", async () => {
    const notFound = { _tag: "HttpStatusError", url: "/pages", status: 404, statusText: "Not Found" } as const

    const { result } = renderHook(
      () =>
        useInfiniteQuery({
          queryKey: ["pages", "failing"],
          queryFn: ioQueryFn<typeof notFound, Page, QueryFunctionContext<QueryKey, number>>(() => IO.fail(notFound)),
          initialPageParam: 0,
          getNextPageParam: (last: Page) => last.page + 1,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    const error = result.current.error
    expect(error).toBeInstanceOf(IOQueryError)
    expect(error).toBeInstanceOf(Error)
    expect((error as IOQueryError<typeof notFound>).error.status).toBe(404)
    expect(error?.message).toBe("HTTP 404 Not Found — /pages")
  })
})
