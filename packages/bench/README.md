# functype-bench

functype against Effect: the timings and bundle sizes on [functype.org/performance](https://functype.org/performance/). Private; never published.

```bash
pnpm -F functype build
pnpm -F functype-bench bench                      # a summary on the terminal
pnpm -F functype-bench bench --out results.json   # the file the site reads
pnpm -F functype-bench bench --base <dist>        # also time another functype build
pnpm -F functype-bench smoke                      # every case agrees across both libraries
```

- **Cases** live in `src/cases.mjs`, each written the way its library's docs write it. The page shows each function's own source text, so the code timed is the code published. Every case must return the same number in both libraries; the run stops otherwise.
- **Method:** `src/run.mjs` starts several fresh Node processes (`src/worker.mjs`). Each warms every case, then times it in rounds whose library order rotates. A case is faster or slower only when every process agrees and the median moves 10%; otherwise it is "about the same".
- **Bundle sizes** come from `src/bundles.mjs`: esbuild for the browser, minified, gzip -9.
- **CI:** `.github/workflows/perf.yml` posts a comparison with the base branch on PRs, and on main and weekly writes the results to the `perf-data` branch. The docs deploy reads `latest.json` from there; `site/src/data/perf.json` is the fallback. Timings never fail a build.
- **Effect's version** is pinned in `package.json`, and Dependabot moves it.
