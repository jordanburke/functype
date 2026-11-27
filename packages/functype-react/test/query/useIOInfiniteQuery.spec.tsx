import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import { keepPreviousData, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { Option as OptionType } from "functype"
import { Option } from "functype"
import { IO } from "functype/io"
import type { ReactNode } from "react"
import { useState } from "react"
import { describe, expect, expectTypeOf, it } from "vitest"

import { IOQueryError } from "../../src/query/IOQueryError"
import { toQueryState } from "../../src/query/queryState"
import { useIOInfiniteQuery } from "../../src/query/useIOInfiniteQuery"
import { createWrapper } from "./harness"

type Page = { readonly items: readonly string[]; readonly next: string | null }
type FeedError = { readonly _tag: "FeedError"; readonly cursor: string }

/** Three pages: "a" (first), "b", "c" (last). */
const PAGES: Readonly<Record<string, Page>> = {
  "": { items: ["a1", "a2"], next: "b" },
  b: { items: ["b1"], next: "c" },
  c: { items: ["c1"], next: null },
}

const fetchPage = (cursor: OptionType<string>): IO<never, FeedError, Page> => {
  const page = PAGES[cursor.getOrElse(() => "")]
  return page === undefined ? IO.fail({ _tag: "FeedError", cursor: cursor.getOrElse(() => "") }) : IO.succeed(page)
}

const nextOf = (last: Page): OptionType<string> => Option(last.next)

describe("useIOInfiniteQuery", () => {
  it("gives the first page None and later pages Some, and stops when getNextPageParam gives None", async () => {
    const seen: OptionType<string>[] = []
    const { result } = renderHook(
      () =>
        useIOInfiniteQuery(
          ["feed"],
          ({ pageParam }) => {
            seen.push(pageParam)
            return fetchPage(pageParam)
          },
          { getNextPageParam: nextOf },
        ),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
    await act(async () => {
      await result.current.fetchNextPage()
    })
    await act(async () => {
      await result.current.fetchNextPage()
    })

    expect(seen.map((p) => p.getOrElse(() => "first"))).toEqual(["first", "b", "c"])
    await waitFor(() => expect(result.current.hasNextPage).toBe(false))
    expect(result.current.data?.pages.flatMap((page) => page.items)).toEqual(["a1", "a2", "b1", "c1"])
    expect(result.current.data?.pageParams).toEqual([null, "b", "c"])
  })

  it("gives the first page None again on a refetch", async () => {
    const seen: string[] = []
    const { result } = renderHook(
      () =>
        useIOInfiniteQuery(
          ["feed-refetch"],
          ({ pageParam }) => {
            seen.push(pageParam.getOrElse(() => "first"))
            return fetchPage(pageParam)
          },
          { getNextPageParam: nextOf },
        ),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => {
      await result.current.fetchNextPage()
    })
    await act(async () => {
      await result.current.refetch()
    })
    expect(seen).toEqual(["first", "b", "first", "b"])
  })

  it("fetches a previous page with the param getPreviousPageParam gives", async () => {
    const seen: string[] = []
    const { result } = renderHook(
      () =>
        useIOInfiniteQuery(
          ["feed-prev"],
          ({ pageParam }) => {
            seen.push(pageParam.getOrElse(() => "first"))
            return fetchPage(pageParam)
          },
          {
            getNextPageParam: nextOf,
            // Only the first page has a previous page, "b"; any other page has none.
            getPreviousPageParam: (_first, _all, firstParam) => (firstParam.isNone() ? Option("b") : Option.none()),
          },
        ),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasPreviousPage).toBe(true)
    await act(async () => {
      await result.current.fetchPreviousPage()
    })
    expect(seen).toEqual(["first", "b"])
    await waitFor(() => expect(result.current.hasPreviousPage).toBe(false))
    expect(result.current.data?.pageParams).toEqual(["b", null])
  })

  it("fails with an IOQueryError carrying the typed error when a later page fails", async () => {
    const { result } = renderHook(
      () =>
        useIOInfiniteQuery(["feed-fail"], ({ pageParam }) => fetchPage(pageParam), {
          getNextPageParam: () => Option("missing"),
        }),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const error = result.current.error
    expect(error).toBeInstanceOf(IOQueryError)
    expect(error?.defect).toBe(false)
    expect(error?.error).toEqual({ _tag: "FeedError", cursor: "missing" })
  })

  it("marks a defect as one", async () => {
    const { result } = renderHook(
      () =>
        useIOInfiniteQuery(["feed-die"], () => IO.die(new Error("boom")) as IO<never, FeedError, Page>, {
          getNextPageParam: nextOf,
        }),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.defect).toBe(true)
  })

  it("aborts the effect's signal when the query is cancelled", async () => {
    const signals: AbortSignal[] = []
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    renderHook(
      () =>
        useIOInfiniteQuery(
          ["feed-cancel"],
          ({ signal }) => {
            signals.push(signal)
            return IO.sleep(5_000).map((): Page => ({ items: [], next: null }))
          },
          { getNextPageParam: nextOf },
        ),
      { wrapper },
    )
    await waitFor(() => expect(signals).toHaveLength(1))
    await act(async () => {
      await client.cancelQueries({ queryKey: ["feed-cancel"] })
    })
    expect(signals[0]?.aborted).toBe(true)
  })

  it("passes select and placeholderData through", async () => {
    const { result, rerender } = renderHook(
      ({ key }: { readonly key: string }) =>
        useIOInfiniteQuery(["feed-select", key], ({ pageParam }) => fetchPage(pageParam), {
          getNextPageParam: nextOf,
          select: (data) => data.pages.flatMap((page) => page.items),
          placeholderData: keepPreviousData,
        }),
      { wrapper: createWrapper(), initialProps: { key: "one" } },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expectTypeOf(result.current.data).toEqualTypeOf<string[] | undefined>()
    expect(result.current.data).toEqual(["a1", "a2"])
    rerender({ key: "two" })
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data).toEqual(["a1", "a2"])
  })

  it("keeps page params JSON-safe in the cache", async () => {
    const { result } = renderHook(
      () => useIOInfiniteQuery(["feed-json"], ({ pageParam }) => fetchPage(pageParam), { getNextPageParam: nextOf }),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => {
      await result.current.fetchNextPage()
    })
    const data = result.current.data
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })

  it("projects onto AsyncState with toQueryState", async () => {
    const { result } = renderHook(
      () => {
        const query = useIOInfiniteQuery(["feed-state"], ({ pageParam }) => fetchPage(pageParam), {
          getNextPageParam: nextOf,
        })
        return toQueryState(query)
      },
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current._tag).toBe("Success"))
  })
})

describe("useIOInfiniteQuery types", () => {
  it("types data, error and the page param", () => {
    const use = () => useIOInfiniteQuery(["t"], ({ pageParam }) => fetchPage(pageParam), { getNextPageParam: nextOf })
    expectTypeOf<ReturnType<typeof use>>().toEqualTypeOf<
      UseInfiniteQueryResult<InfiniteData<Page, string | null>, IOQueryError<FeedError>>
    >()
  })

  it("infers the page param from an annotated inline getNextPageParam", () => {
    const use = () =>
      useIOInfiniteQuery(["t"], ({ pageParam }) => fetchPage(pageParam), {
        getNextPageParam: (last: Page) => Option(last.next),
      })
    expectTypeOf<ReturnType<typeof use>["data"]>().toEqualTypeOf<InfiniteData<Page, string | null> | undefined>()
  })

  it("reports an unannotated inline getNextPageParam on getNextPageParam itself", () => {
    void (() =>
      useIOInfiniteQuery(["t"], ({ pageParam }) => fetchPage(pageParam), {
        // @ts-expect-error the page param can't be inferred, so P stays never
        getNextPageParam: (last) => Option(last.next),
      }))
  })

  it("rejects a page param type that includes null", () => {
    void (() =>
      // @ts-expect-error P can't include null: None already means "no more pages"
      useIOInfiniteQuery<Page, FeedError, string | null>(["t"], () => fetchPage(Option.none()), {
        getNextPageParam: () => Option.none(),
      }))
  })

  it("is usable in a component", () => {
    const Feed = () => {
      const [filter] = useState("all")
      return useIOInfiniteQuery(["feed", filter], ({ pageParam }) => fetchPage(pageParam), {
        getNextPageParam: nextOf,
      })
    }
    expectTypeOf(Feed).returns.toHaveProperty("fetchNextPage")
  })
})
