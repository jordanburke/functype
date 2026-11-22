# Bundle Size

`dist` holds one file per source module, and `package.json` declares `"sideEffects": false`. A bundler keeps only the modules your code reaches.

## What an app ships

Each program below is bundled with esbuild, minified for the browser, then compressed with `gzip -9`. 1 KB is 1,000 bytes. `pnpm validate` runs the same check (`scripts/check-bundle-size.ts`) and fails when a program goes over its ceiling.

| Program                                                                 | Minified | Gzipped | Ceiling (gzipped) |
| ----------------------------------------------------------------------- | -------: | ------: | ----------------: |
| Option only, from `functype/option`                                     |  22.8 KB |  5.7 KB |            6.5 KB |
| Option only, from `functype`                                            |  22.8 KB |  5.6 KB |            6.5 KB |
| `IO.gen`, `catchTag` and `runSyncOrThrow`, plus Either, Option and List |  44.5 KB | 11.5 KB |           13.5 KB |

## Why Option-only is 5.7 KB

Option's methods convert to the other core types: `toEither`, `toList`, `toTry` and the like. So an Option reaches Either, List, Set and Try, and those modules ship with it. That is the cost of methods on values, and it is a fixed floor: adding the other core types to your program adds little, because they are already in.

## Import style

The root import and the subpath imports bundle the same, so use whichever reads better:

```typescript
import { Option } from "functype/option" // bundles the same as importing from "functype"
```

## Checking your own bundle

Use your bundler's analyzer, such as [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer), or esbuild's `--metafile` with its [analyzer](https://esbuild.github.io/analyze/). functype has no runtime dependencies.
