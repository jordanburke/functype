---
"functype": minor
"functype-os": patch
"functype-log": patch
"functype-react": patch
"functype-mcp-server": patch
"eslint-config-functype": patch
"eslint-plugin-functype": patch
---

- **functype** — Adds `HttpClientConfig.beforeRequest`: an effectful (IO-returning) transformer that runs after `defaultHeaders` and per-call headers are merged but before the request is sent. Closes the request/response asymmetry called out in [#154](https://github.com/jordanburke/functype/issues/154) — the response side already composes via `.tap`/`.map`/`.flatMap`/`.catchTag` on the returned IO; `beforeRequest` lets request-side concerns (auth refresh, request IDs, entry logging) compose the same way using standard IO operators. Returning a failed IO short-circuits the call with the produced `HttpError` and `fetch` is never invoked. Strictly additive; no breaking changes. New `HttpRequestView` type re-exported from `functype/fetch`. `Http`'s CLI/MCP entry now also surfaces the full IO chain methods (`.tap` etc.) that were previously not discoverable from the type's own listing, and `npx functype Http --full` now shows the JSDoc'd `HttpClientConfig` interface. Closes [#154](https://github.com/jordanburke/functype/issues/154).
