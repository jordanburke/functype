import type { QueryClientConfig } from "@tanstack/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

type QueryDefaults = NonNullable<QueryClientConfig["defaultOptions"]>["queries"]

/**
 * Fresh `QueryClient` per test with retries disabled, so a failing effect surfaces on
 * the first attempt instead of after React Query's default backoff schedule.
 *
 * Pass `queries` to override that default — the retry test needs the real retry path.
 */
export const createWrapper = (queries?: QueryDefaults) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, ...queries },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}
