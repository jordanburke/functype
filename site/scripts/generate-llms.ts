/**
 * Generates the LLM-facing docs from the functype CLI data and the site's pages:
 *
 * - public/llms.txt       — the llms.txt index (https://llmstxt.org), grouped by the CLI's categories
 * - public/reference.md   — every public type's API, generated from src/cli/data.ts
 * - public/llms-full.txt  — the guides and pages concatenated, plus the full API reference
 *
 * `packages/functype/src/cli/data.ts` is the single source for `npx functype`, the MCP server's
 * `search_docs`, and these files, so registering a type there updates all of them. The module-registry
 * spec in packages/functype fails when a public module is left out of data.ts.
 *
 * Every linked or concatenated file must exist: a moved doc fails the build instead of leaving a dead
 * link (the hand-written llms.txt had nine of those after the monorepo migration).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATEGORIES,
  TYPES,
  VERSION,
  type TypeData,
} from "../../packages/functype/src/cli/data";

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = resolve(siteDir, "..");
const functypeDir = resolve(rootDir, "packages/functype");

const SITE = "https://functype.org";
const REPO = "https://github.com/jordanburke/functype/blob/main";

const pkg = JSON.parse(
  readFileSync(resolve(functypeDir, "package.json"), "utf-8"),
) as { description: string };

/** Fail the build on a missing file rather than publish a dead link. */
const mustExist = (path: string): string => {
  if (!existsSync(path)) {
    throw new Error(`generate-llms: ${path} does not exist`);
  }
  return path;
};

// ── Type → page ──────────────────────────────────────────────────────────────

/** Types documented on another type's page, or on a page not named after them. */
const PAGE_OVERRIDES: Readonly<Record<string, string>> = {
  Do: "do-notation",
  Cond: "match",
  TaskOutcome: "task",
  TaskResult: "task",
  HttpError: "http",
};

const pageFor = (name: string): string | undefined => {
  const slug = PAGE_OVERRIDES[name] ?? name.toLowerCase();
  return existsSync(resolve(siteDir, `src/content/${slug}.md`))
    ? slug
    : undefined;
};

const anchorFor = (name: string): string => name.toLowerCase();

const linkFor = (name: string): string => {
  const page = pageFor(name);
  return page !== undefined
    ? `${SITE}/${page}.md`
    : `${SITE}/reference.md#${anchorFor(name)}`;
};

// ── Guides and tooling ───────────────────────────────────────────────────────

type Link = {
  readonly label: string;
  readonly url: string;
  readonly note: string;
};

const guide = (label: string, file: string, note: string): Link => {
  mustExist(resolve(functypeDir, "docs", file));
  return { label, url: `${REPO}/packages/functype/docs/${file}`, note };
};

const sitePage = (label: string, slug: string, note: string): Link => {
  mustExist(resolve(siteDir, `src/pages/${slug}.astro`));
  return { label, url: `${SITE}/${slug}`, note };
};

const GUIDES: ReadonlyArray<Link> = [
  guide(
    "AI Guide",
    "ai-guide.md",
    "Guide for AI assistants writing functype code",
  ),
  guide(
    "Quick Reference",
    "quick-reference.md",
    "Concise guide to common patterns and operations",
  ),
  guide("Examples", "examples.md", "Practical examples for the major types"),
  guide(
    "functype vs Effect",
    "vs-effect.md",
    "How functype relates to Effect-TS",
  ),
  guide(
    "Companion Pattern",
    "companion-pattern.md",
    "Scala-style constructors with static utilities",
  ),
  guide(
    "Variance Guide",
    "variance-guide.md",
    "Covariance conventions and the Widen helper",
  ),
  guide(
    "Error Formatting",
    "error-formatting.md",
    "Utilities for readable error output",
  ),
];

const TOOLING: ReadonlyArray<Link> = [
  sitePage(
    "ESLint Plugin",
    "eslint",
    "Rules, severity policy, and the Wire / @interop / @invariant boundary markers",
  ),
  sitePage(
    "MCP Server",
    "mcp-server",
    "Live type docs and compile-time code validation for AI agents",
  ),
  {
    label: "CLI",
    url: `${REPO}/packages/functype#cli-documentation`,
    note: "`npx functype` prints the LLM-optimized API reference; `npx functype <Type>` for one type",
  },
];

const OPTIONAL: ReadonlyArray<Link> = [
  guide("HKT", "HKT.md", "Higher-kinded types and core architecture"),
  guide(
    "Bundle Optimization",
    "BUNDLE_OPTIMIZATION.md",
    "Tree-shaking and import strategies",
  ),
  guide("Tuple Examples", "TUPLE-EXAMPLES.md", "Fixed-length typed arrays"),
  guide(
    "Task Migration Guide",
    "tasks/v3/TASK_MIGRATION_GUIDE.md",
    "Task version upgrade guide",
  ),
  (() => {
    mustExist(resolve(rootDir, "docs/ROADMAP.md"));
    return {
      label: "Roadmap",
      url: `${REPO}/docs/ROADMAP.md`,
      note: "Planned features",
    };
  })(),
];

// ── llms.txt ─────────────────────────────────────────────────────────────────

const linkLine = ({ label, url, note }: Link): string =>
  `- [${label}](${url}): ${note}`;

const categoryTitle = (category: string): string => category;

const llmsTxt = (): string =>
  [
    "# Functype",
    "",
    `> ${pkg.description}. Scala-inspired: Option, Either, Try, List, IO and more, with typed errors, dependency injection and do-notation. Version ${VERSION}.`,
    "",
    "Install with `npm install functype`. Every type listed below is also available from the CLI (`npx functype <Type>`) and the functype MCP server.",
    "",
    `- [llms-full.txt](${SITE}/llms-full.txt): The guides, type pages and full API reference in one file`,
    `- [API reference](${SITE}/reference.md): Every public type's methods, generated from the CLI data`,
    "",
    ...Object.entries(CATEGORIES).flatMap(([category, names]) => [
      `## ${categoryTitle(category)}`,
      "",
      ...names
        .filter((name) => TYPES[name] !== undefined)
        .map(
          (name) =>
            `- [${name}](${linkFor(name)}): ${TYPES[name]!.description}`,
        ),
      "",
    ]),
    "## Guides",
    "",
    ...GUIDES.map(linkLine),
    "",
    "## Tooling",
    "",
    ...TOOLING.map(linkLine),
    "",
    "## Optional",
    "",
    ...OPTIONAL.map(linkLine),
    "",
  ].join("\n");

// ── reference.md ─────────────────────────────────────────────────────────────

const code = (item: string): string =>
  item.includes("`") ? `\`\` ${item} \`\`` : `\`${item}\``;

const METHOD_GROUPS: ReadonlyArray<
  readonly [keyof TypeData["methods"], string]
> = [
  ["create", "Create"],
  ["transform", "Transform"],
  ["extract", "Extract"],
  ["check", "Check"],
  ["other", "Other"],
];

const typeSection = (name: string, data: TypeData): string =>
  [
    `### ${name}`,
    "",
    data.description,
    "",
    ...(data.interfaces.length > 0
      ? [`Implements: ${data.interfaces.join(", ")}`, ""]
      : []),
    ...METHOD_GROUPS.flatMap(([key, label]) => {
      const items = data.methods[key] ?? [];
      return items.length > 0
        ? [`**${label}**`, "", ...items.map((item) => `- ${code(item)}`), ""]
        : [];
    }),
  ].join("\n");

const referenceMd = (): string =>
  [
    `# Functype API reference (v${VERSION})`,
    "",
    "Generated from the functype CLI data — the same source as `npx functype` and the MCP server's `search_docs`. Types are grouped as in the CLI overview.",
    "",
    ...Object.entries(CATEGORIES).flatMap(([category, names]) => [
      `## ${categoryTitle(category)}`,
      "",
      ...names
        .filter((name) => TYPES[name] !== undefined)
        .map((name) => typeSection(name, TYPES[name]!)),
    ]),
  ].join("\n");

// ── llms-full.txt ────────────────────────────────────────────────────────────

const FULL_SECTIONS: ReadonlyArray<{
  readonly label: string;
  readonly path: string;
}> = [
  { label: "AI Guide", path: resolve(functypeDir, "docs/ai-guide.md") },
  {
    label: "Quick Reference",
    path: resolve(functypeDir, "docs/quick-reference.md"),
  },
  {
    label: "Feature Matrix",
    path: resolve(functypeDir, "docs/FUNCTYPE_FEATURE_MATRIX.md"),
  },
  ...[
    "option",
    "either",
    "try",
    "list",
    "obj",
    "task",
    "io",
    "http",
    "logger",
    "wire",
    "do-notation",
    "match",
    "mcp-server",
  ].map((slug) => ({
    label: slug,
    path: resolve(siteDir, `src/content/${slug}.md`),
  })),
  {
    label: "ESLint Plugin",
    path: resolve(rootDir, "packages/eslint-plugin-functype/README.md"),
  },
].map((section) => ({ ...section, path: mustExist(section.path) }));

const separator = (label: string): string =>
  `\n${"─".repeat(80)}\n## ${label}\n${"─".repeat(80)}\n`;

const llmsFullTxt = (reference: string): string =>
  [
    `# Functype v${VERSION}`,
    "",
    `> ${pkg.description}, with Scala-inspired patterns.`,
    "",
    "- Install: npm install functype",
    `- Homepage: ${SITE}/`,
    `- Repository: https://github.com/jordanburke/functype`,
    "",
    "This file contains the complete functype documentation concatenated into a single file for LLM consumption.",
    ...FULL_SECTIONS.flatMap(({ label, path }) => [
      separator(label),
      readFileSync(path, "utf-8").trim(),
      "",
    ]),
    separator("API Reference"),
    reference.trim(),
    "",
  ].join("\n");

// ── write ────────────────────────────────────────────────────────────────────

const reference = referenceMd();
const outputs: ReadonlyArray<readonly [string, string]> = [
  ["public/llms.txt", llmsTxt()],
  ["public/reference.md", reference],
  ["public/llms-full.txt", llmsFullTxt(reference)],
];

outputs.forEach(([file, content]) => {
  writeFileSync(resolve(siteDir, file), content, "utf-8");
  console.log(
    `Generated ${file} (${content.length} bytes, ${content.split("\n").length} lines)`,
  );
});
