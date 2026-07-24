/* eslint-disable @typescript-eslint/no-unused-vars -- type-level assertions only */
import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query"
import type { HttpError } from "functype/fetch"
import { describe, expectTypeOf, it } from "vitest"

import type { TaskState } from "../../src/async/TaskState"
import type { MatchCases } from "../../src/match/Match"
import type { IOQueryError } from "../../src/query/IOQueryError"
import type { ioMutationFn, ioQueryFn } from "../../src/query/ioQueryFn"
import { toQueryState } from "../../src/query/queryState"
import type { UseIOQueryStateResult } from "../../src/query/useIOQueryState"
import type { useIOMutation } from "../../src/query/useIOMutation"
import type { useIOQuery } from "../../src/query/useIOQuery"

describe("useIOQuery types", () => {
  it("threads E through as IOQueryError<E>, not unknown", () => {
    type Result = ReturnType<typeof useIOQuery<{ seats: number }, HttpError>>

    expectTypeOf<Result["error"]>().toEqualTypeOf<IOQueryError<HttpError> | null>()
  })

  it("keeps the functype error discriminable on .error", () => {
    expectTypeOf<IOQueryError<HttpError>["error"]>().toEqualTypeOf<HttpError>()
  })

  it("boxes into a real Error", () => {
    expectTypeOf<IOQueryError<HttpError>>().toMatchTypeOf<Error>()
  })

  it("applies select to the data channel", () => {
    type Result = ReturnType<typeof useIOQuery<{ seats: number }, HttpError, number>>

    expectTypeOf<Result["data"]>().toEqualTypeOf<number | undefined>()
  })
})

describe("useIOMutation types", () => {
  it("threads E through as IOQueryError<E>", () => {
    type Result = ReturnType<typeof useIOMutation<{ id: number }, HttpError, { name: string }>>

    expectTypeOf<Result["error"]>().toEqualTypeOf<IOQueryError<HttpError> | null>()
  })
})

describe("TaskState projection", () => {
  it("projects onto the same TaskState the async subpath uses", () => {
    expectTypeOf(toQueryState<IOQueryError<HttpError>, number>).returns.toEqualTypeOf<
      TaskState<IOQueryError<HttpError>, number>
    >()
  })

  it("hands the Success branch a defined value — no `| undefined`, no `!`", () => {
    type Success = Extract<TaskState<IOQueryError<HttpError>, number>, { _tag: "Success" }>

    expectTypeOf<Success["value"]>().toEqualTypeOf<number>()
  })

  it("keeps the functype error reachable through the Failure branch", () => {
    type Failure = Extract<TaskState<IOQueryError<HttpError>, number>, { _tag: "Failure" }>

    expectTypeOf<Failure["error"]["error"]>().toEqualTypeOf<HttpError>()
  })

  it("makes an omitted case a compile error", () => {
    type Cases = MatchCases<TaskState<IOQueryError<HttpError>, number>>

    // @ts-expect-error -- `Success` is missing; exhaustiveness must reject this.
    const incomplete: Cases = { Idle: () => null, Pending: () => null, Failure: () => null }
    void incomplete
  })
})

describe("useIOQueryState types", () => {
  it("stays exhaustively matchable despite the flags/refetch intersection", () => {
    type Cases = MatchCases<UseIOQueryStateResult<HttpError, number>>

    // @ts-expect-error -- `Success` is missing; the intersection must not weaken this.
    const incomplete: Cases = { Idle: () => null, Pending: () => null, Failure: () => null }
    void incomplete
  })

  it("narrows to a defined value on the Success branch", () => {
    type Success = Extract<UseIOQueryStateResult<HttpError, number>, { _tag: "Success" }>

    expectTypeOf<Success["value"]>().toEqualTypeOf<number>()
    expectTypeOf<Success["isSuccess"]>().toEqualTypeOf<boolean>()
  })

  it("keeps the typed error reachable on the Failure branch", () => {
    type Failure = Extract<UseIOQueryStateResult<HttpError, number>, { _tag: "Failure" }>

    expectTypeOf<Failure["error"]["error"]>().toEqualTypeOf<HttpError>()
  })
})

describe("primitive types", () => {
  it("ioQueryFn returns a Promise of the success channel", () => {
    expectTypeOf<ReturnType<ReturnType<typeof ioQueryFn<HttpError, number>>>>().toEqualTypeOf<Promise<number>>()
  })

  // Regression guard for the README's claim that the primitives cover infinite
  // queries: a context carrying `pageParam` must survive into the effect factory,
  // not be flattened to the `{ signal }` floor.
  it("ioQueryFn threads a richer context through, including pageParam", () => {
    type InfiniteContext = QueryFunctionContext<QueryKey, number>
    type Fn = ReturnType<typeof ioQueryFn<HttpError, number, InfiniteContext>>

    expectTypeOf<Fn>().parameter(0).toEqualTypeOf<InfiniteContext>()
    expectTypeOf<Parameters<Fn>[0]["pageParam"]>().toEqualTypeOf<number>()
  })

  it("ioMutationFn takes the variables and returns a Promise of the success channel", () => {
    type Fn = ReturnType<typeof ioMutationFn<HttpError, number, { name: string }>>

    expectTypeOf<Fn>().parameter(0).toEqualTypeOf<{ name: string }>()
    expectTypeOf<ReturnType<Fn>>().toEqualTypeOf<Promise<number>>()
  })
})
