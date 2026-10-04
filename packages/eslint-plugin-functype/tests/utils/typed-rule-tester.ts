import { join } from "node:path"

import tsParser from "@typescript-eslint/parser"
import { RuleTester } from "@typescript-eslint/rule-tester"
import * as vitest from "vitest"

RuleTester.afterAll = vitest.afterAll
RuleTester.it = vitest.it
RuleTester.itOnly = vitest.it.only
RuleTester.describe = vitest.describe

/**
 * RuleTester with type information, for rules that consult the type checker. Test code is linted as
 * `tests/fixtures/typed/file.ts`, so `import … from "functype"` resolves to the workspace package.
 */
export const typedRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: join(import.meta.dirname, "..", "fixtures", "typed"),
    },
  },
})

export const typedFilename = join(import.meta.dirname, "..", "fixtures", "typed", "file.ts")
