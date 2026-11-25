/**
 * Type-checks every TypeScript code sample on the built site, as a visitor sees it, against this
 * branch's packages/functype src. Run it after `astro build`.
 *
 * The markdown under src/content is also checked as markdown, by packages/functype's
 * test/docs/quick-reference-typecheck.spec.ts. This check reads the built HTML instead, so it also covers
 * the samples written into .astro pages (the landing page) and the markdown pages pull in
 * from elsewhere (the eslint page renders eslint-plugin-functype's README). Three landing-page samples
 * once failed to compile and nothing noticed.
 *
 * - Every `<pre>` must say what it holds with `data-language`. Markdown fences get it from Shiki; a
 *   component's `<pre>` sets it by hand. A `<pre>` without one fails the check.
 * - `ts` and `typescript` samples are type-checked; other languages are counted and left alone.
 * - A sample that is deliberately not valid TypeScript (a fragment, a rule's bad example) opts out with
 *   `data-typecheck="ignore"` on its `<pre>`. In markdown, write the fence as ```ts ignore: the Shiki
 *   transformer in astro.config.mjs turns that into the attribute. The opt-out is visible in the source.
 * - Placeholders a page's samples share (`user`, `option`) are declared in that page's prelude: the
 *   markdown pages reuse the spec's preludes, and the rest are below.
 * - A sample with no import line gets the functype names it uses imported for it, the way a page's
 *   later samples rely on its first sample's import. A sample with its own import line is checked as
 *   written, so an import that leaves out a name it uses fails.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import {
  REPO_ROOT,
  SITE_PAGE_PRELUDES,
  SITE_PAGES,
  SITE_PRELUDE,
  typeCheck,
} from "../../packages/functype/test/docs/snippet-typecheck";

const DIST = join(REPO_ROOT, "dist-site");

/** Placeholders of the landing page's samples (src/pages/index.astro). Its one sample declares what it uses. */
const LANDING_PRELUDE = "";

/** Placeholders of the eslint page's samples (packages/eslint-plugin-functype/README.md). */
const ESLINT_PRELUDE = `
declare global {
  type Row = { readonly id: string }
}
`;

/** The placeholders functype-log's README samples share: a program to run, and a test's `expect`. */
const LOG_PRELUDE = `
import type { Logger } from "functype-log"

declare global {
  const program: IO<Logger, never, unknown>
  const myProgram: IO<Logger, never, unknown>
  const doWork: () => IO<never, never, number>
  const err: Error
  const myStream: { write(text: string): void }
  const format: (args: ReadonlyArray<unknown>) => string
  const UserSchema: { parse(data: unknown): User }
  const logger: Logger
  function expect(actual: unknown): {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toBeInstanceOf(type: abstract new (...args: never[]) => unknown): void
  }
}
`;

const OS_PRELUDE = `
declare global {
  const src: string
  const dest: string
}
`;

const REACT_PRELUDE = `
declare global {
  type Config = { readonly theme: string }
  type Token = { readonly id: string; readonly name: string }
  type CreateTokenInput = { readonly name: string }
  const url: string
  const headers: Record<string, string>
  const toast: (message: string, options: { readonly detail: string }) => void
}
`;

/** Each built page with TypeScript samples, by its path under dist-site without `/index.html`. */
const PAGE_PRELUDES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    SITE_PAGES.map((page) => [
      page,
      SITE_PRELUDE + (SITE_PAGE_PRELUDES[page] ?? ""),
    ]),
  ),
  "": SITE_PRELUDE + LANDING_PRELUDE,
  "feature-matrix": SITE_PRELUDE,
  eslint: SITE_PRELUDE + ESLINT_PRELUDE,
  "functype-log": SITE_PRELUDE + LOG_PRELUDE,
  "functype-os": SITE_PRELUDE + OS_PRELUDE,
  "functype-react": SITE_PRELUDE + REACT_PRELUDE,
  "functype-eval": SITE_PRELUDE,
  "eslint-config": SITE_PRELUDE,
};

const TYPESCRIPT = new Set(["ts", "typescript"]);

type Sample = {
  readonly page: string;
  readonly index: number;
  readonly language: string | undefined;
  readonly ignored: boolean;
  readonly code: string;
};

const htmlFiles = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? htmlFiles(join(dir, entry.name))
      : entry.name.endsWith(".html")
        ? [join(dir, entry.name)]
        : [],
  );

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * The text a visitor sees in a `<pre>`, entities decoded. The HTML is split into comments (React's
 * `<!-- -->` separators), tags and text, and only the text is kept. The result is compiled, never
 * rendered.
 */
const textOf = (html: string): string =>
  [...html.matchAll(/<!--[\s\S]*?-->|<[^>]*>|[^<]+|</g)]
    .map(([token]) => token)
    .filter((token) => token === "<" || !token.startsWith("<"))
    .join("")
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, name: string) =>
      name.startsWith("#x") || name.startsWith("#X")
        ? String.fromCodePoint(parseInt(name.slice(2), 16))
        : name.startsWith("#")
          ? String.fromCodePoint(parseInt(name.slice(1), 10))
          : (ENTITIES[name.toLowerCase()] ?? entity),
    );

const attribute = (attributes: string, name: string): string | undefined =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(attributes)?.[1];

/** The page key of a built file: its directory under dist-site, "" for the landing page. */
const pageOf = (file: string): string =>
  relative(DIST, file)
    .split(sep)
    .join("/")
    .replace(/(^|\/)index\.html$/, "")
    .replace(/\.html$/, "");

const samplesOf = (file: string): ReadonlyArray<Sample> =>
  [
    ...readFileSync(file, "utf8").matchAll(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/g),
  ].map((match, index) => ({
    page: pageOf(file),
    index: index + 1,
    language: attribute(match[1] ?? "", "data-language"),
    ignored: attribute(match[1] ?? "", "data-typecheck") === "ignore",
    code: textOf(match[2] ?? ""),
  }));

const label = (sample: Sample): string =>
  `${sample.page === "" ? "/" : `/${sample.page}/`} sample ${sample.index}`;

const numbered = (code: string): string =>
  code
    .split("\n")
    .map((line, i) => `    ${String(i + 1).padStart(3)} | ${line}`)
    .join("\n");

const main = (): number => {
  const started = performance.now();
  if (!existsSync(DIST)) {
    console.error(
      `check-examples: ${DIST} does not exist. Run astro build first.`,
    );
    return 1;
  }
  const samples = htmlFiles(DIST).flatMap(samplesOf);
  const unlabeled = samples.filter((sample) => sample.language === undefined);
  const typescript = samples.filter(
    (sample) =>
      sample.language !== undefined && TYPESCRIPT.has(sample.language),
  );
  const tsx = samples.filter((sample) => sample.language === "tsx");
  const checked = typescript.filter((sample) => !sample.ignored);
  const pages = [...new Set(checked.map((sample) => sample.page))].sort();
  const unknownPages = pages.filter(
    (page) => PAGE_PRELUDES[page] === undefined,
  );

  const failures: ReadonlyArray<string> = [
    ...unlabeled.map(
      (sample) =>
        `${label(sample)}: its <pre> has no data-language, so nothing says whether it is TypeScript.`,
    ),
    ...tsx
      .filter((sample) => !sample.ignored)
      .map(
        (sample) =>
          `${label(sample)}: tsx samples are not type-checked yet; mark it ignore, or teach this check JSX.`,
      ),
    ...unknownPages.map(
      (page) =>
        `/${page}/ has TypeScript samples but no prelude: add the page to PAGE_PRELUDES in site/scripts/check-examples.ts.`,
    ),
    ...(checked.length === 0
      ? ["no TypeScript samples found in the built site"]
      : []),
    ...checked
      .filter((sample) => sample.code.trim() === "")
      .map(
        (sample) =>
          `${label(sample)} has no text, so there is nothing to check.`,
      ),
    ...pages
      .filter((page) => PAGE_PRELUDES[page] !== undefined)
      .flatMap((page) => {
        const pageSamples = checked.filter((sample) => sample.page === page);
        const result = typeCheck(
          {
            path: page === "" ? "/" : `/${page}/`,
            prelude: PAGE_PRELUDES[page] ?? "",
            autoImport: true,
          },
          pageSamples.map((sample) => ({
            line: 1,
            code: sample.code,
            autoImport: !/^\s*import\s/m.test(sample.code),
          })),
        );
        return [
          ...result.other,
          ...pageSamples.flatMap((sample, i) => {
            const diagnostics = result.blocks[i] ?? [];
            return diagnostics.length === 0
              ? []
              : [
                  `${label(sample)} does not compile:\n${diagnostics.map((d) => `    ${d}`).join("\n")}\n${numbered(sample.code)}`,
                ];
          }),
        ];
      }),
  ];

  const others = samples.filter(
    (sample) =>
      sample.language !== undefined &&
      !TYPESCRIPT.has(sample.language) &&
      sample.language !== "tsx",
  );
  const byLanguage = [...new Set(others.map((sample) => sample.language))]
    .sort()
    .map(
      (language) =>
        `${language} ${others.filter((sample) => sample.language === language).length}`,
    )
    .join(", ");
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  failures.forEach((failure) => console.error(`✗ ${failure}\n`));
  console.log(
    `check-examples: ${checked.length} TypeScript samples on ${pages.length} pages checked in ${seconds}s; ` +
      `${samples.filter((sample) => sample.ignored).length} opted out with data-typecheck="ignore"; ` +
      `not TypeScript: ${byLanguage || "none"}. ${failures.length === 0 ? "All compile." : `${failures.length} failed.`}`,
  );
  return failures.length === 0 ? 0 : 1;
};

process.exitCode = main();
