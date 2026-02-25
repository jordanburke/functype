# MCP Server Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add functype-mcp-server to the landing site with a merged "AI-Powered Development" homepage section and a dedicated `/mcp-server` page.

**Architecture:** Extend the existing Astro + React landing site by modifying the ClaudeCodeSkills component (rename + add MCP card), updating Navigation (section id + label), creating a new markdown content file and Astro page for `/mcp-server`, and updating Footer/sitemap.

**Tech Stack:** Astro 5, React 19, Tailwind CSS 4

---

### Task 1: Update Navigation component

**Files:**

- Modify: `landing/src/components/Navigation.tsx:9` (sections array)
- Modify: `landing/src/components/Navigation.tsx:33` (navItems array)

**Step 1: Update sections array**

In `Navigation.tsx`, line 9, change the scroll-detection sections array:

```typescript
const sections = ["home", "features", "core-types", "quick-start", "ai-tools"]
```

**Step 2: Update navItems array**

In `Navigation.tsx`, line 33, change the last nav item:

```typescript
{ label: "AI Tools", href: "/#ai-tools", id: "ai-tools" },
```

**Step 3: Verify dev server renders**

Run: `cd /Users/jordanburke/IdeaProjects/functype/landing && pnpm dev`
Expected: Site loads, nav shows "AI Tools" instead of "Claude Skills"

**Step 4: Commit**

```bash
git add landing/src/components/Navigation.tsx
git commit -m "feat(landing): rename nav item from Claude Skills to AI Tools"
```

---

### Task 2: Rename section + fix skill name in ClaudeCodeSkills component

**Files:**

- Modify: `landing/src/components/ClaudeCodeSkills.tsx`

**Step 1: Update section id and title**

Line 3: Change `id="claude-skills"` to `id="ai-tools"`
Line 6: Change `"Claude Code Skills"` to `"AI-Powered Development"`
Lines 7-9: Change subtitle to:

```tsx
<p className="text-xl text-gray-600 max-w-3xl mx-auto">
  Supercharge your functype workflow with AI-powered tools. Install Claude Code skills for intelligent code assistance
  or add the MCP server for live documentation in any AI agent.
</p>
```

**Step 2: Fix skill name from functype-user to functype**

Line 14: Change comment to `{/* functype Skill */}`
Line 28: Change `"Functype User"` to `"Functype"`
Line 86: Change `"/plugin install functype-user"` to `"/plugin install functype"`

**Step 3: Fix skill name in installation box**

Line 183: Change `"/plugin install functype-user"` to `"/plugin install functype"`

**Step 4: Verify dev server**

Expected: Section header reads "AI-Powered Development", first card says "Functype", install commands say `functype` not `functype-user`

**Step 5: Commit**

```bash
git add landing/src/components/ClaudeCodeSkills.tsx
git commit -m "feat(landing): rename section to AI-Powered Development, fix skill name"
```

---

### Task 3: Add MCP Server card to homepage section

**Files:**

- Modify: `landing/src/components/ClaudeCodeSkills.tsx`

**Step 1: Change grid from 2-col to 3-col**

Line 13: Change `className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"` to:

```tsx
className = "grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
```

**Step 2: Add MCP Server card after the functype-developer card (after line 166)**

Insert a third card inside the grid div, right after the closing `</div>` of the functype-developer card:

```tsx
{
  /* MCP Server */
}
;<div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-green-500 transition-all hover:shadow-lg">
  <div className="flex items-start mb-6">
    <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
        ></path>
      </svg>
    </div>
    <div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">MCP Server</h3>
      <p className="text-sm text-green-600 font-medium">For Any AI Agent</p>
    </div>
  </div>

  <p className="text-gray-600 mb-6">
    Live documentation lookup and compile-time code validation via the Model Context Protocol. Works with Claude Code,
    Cursor, Windsurf, and any MCP-compatible tool.
  </p>

  <div className="space-y-3 mb-6">
    <div className="flex items-start">
      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-sm text-gray-700">Search docs and type API references</span>
    </div>
    <div className="flex items-start">
      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-sm text-gray-700">Compile-time code validation</span>
    </div>
    <div className="flex items-start">
      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-sm text-gray-700">Runtime version switching</span>
    </div>
  </div>

  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
    <div className="font-mono text-sm">
      <div className="text-green-400 mb-2"># Add to .mcp.json</div>
      <div className="text-gray-300">
        {"{"} "functype": {"{"} "command": "npx",
      </div>
      <div className="text-gray-300">
        {"  "}"args": ["-y", "functype-mcp-server"] {"}"} {"}"}
      </div>
    </div>
  </div>

  <a href="/mcp-server" className="mt-4 inline-block text-sm text-green-600 hover:text-green-700 font-medium">
    View full documentation →
  </a>
</div>
```

**Step 3: Update the Quick Installation box to include MCP setup**

Replace the installation box content (lines 170-186) to add MCP server setup:

```tsx
{
  /* Installation Instructions */
}
;<div className="mt-12 bg-gray-900 text-gray-100 p-8 rounded-2xl max-w-4xl mx-auto">
  <h3 className="text-xl font-bold mb-4 flex items-center">
    <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
    </svg>
    Quick Installation
  </h3>

  <div className="grid md:grid-cols-2 gap-6">
    <div>
      <p className="text-gray-300 mb-3 text-sm font-medium">Claude Code Skills</p>
      <div className="bg-gray-800 p-4 rounded-lg font-mono text-sm overflow-x-auto">
        <div className="text-green-400"># Add the functype marketplace</div>
        <div className="text-gray-300 mt-2">/plugin marketplace add jordanburke/functype</div>
        <div className="text-green-400 mt-3"># Install skills</div>
        <div className="text-gray-300 mt-2">/plugin install functype</div>
        <div className="text-gray-300">/plugin install functype-developer</div>
      </div>
    </div>

    <div>
      <p className="text-gray-300 mb-3 text-sm font-medium">MCP Server</p>
      <div className="bg-gray-800 p-4 rounded-lg font-mono text-sm overflow-x-auto">
        <div className="text-green-400"># Add to your .mcp.json</div>
        <div className="text-gray-300 mt-2">{"{"}</div>
        <div className="text-gray-300">
          {"  "}"mcpServers": {"{"}
        </div>
        <div className="text-gray-300">
          {"    "}"functype": {"{"}
        </div>
        <div className="text-gray-300">{"      "}"command": "npx",</div>
        <div className="text-gray-300">{"      "}"args": ["-y", "functype-mcp-server"]</div>
        <div className="text-gray-300">
          {"    "}
          {"}"}
        </div>
        <div className="text-gray-300">
          {"  "}
          {"}"}
        </div>
        <div className="text-gray-300">{"}"}</div>
      </div>
    </div>
  </div>
</div>
```

**Step 4: Verify dev server**

Expected: 3-column grid with green MCP card, split installation instructions

**Step 5: Commit**

```bash
git add landing/src/components/ClaudeCodeSkills.tsx
git commit -m "feat(landing): add MCP Server card and split installation instructions"
```

---

### Task 4: Create MCP Server markdown content

**Files:**

- Create: `landing/src/content/mcp-server.md`

**Step 1: Write the content file**

Create `landing/src/content/mcp-server.md`:

```markdown
# MCP Server

Live documentation and code validation for any AI agent.

## Overview

The functype MCP server gives AI coding assistants direct access to functype's documentation, type APIs, and a compile-time code validator. Instead of relying on training data that may be outdated, your AI tools get live, accurate information from the library itself.

It works with any tool that supports the [Model Context Protocol](https://modelcontextprotocol.io/) — Claude Code, Cursor, Windsurf, and more.

## Setup

Add the MCP server to your project's `.mcp.json`:

\`\`\`json
{
"mcpServers": {
"functype": {
"command": "npx",
"args": ["-y", "functype-mcp-server"]
}
}
}
\`\`\`

The server is installed automatically via npx — no global installation needed.

## Tools

The MCP server provides 5 tools:

### search_docs

Browse all functype types or search by keyword. Call with no arguments for a full overview of every type and its implemented interfaces.

**Example output:**
\`\`\`
Option [Functor, Monad, Foldable, Extractable, Matchable, Serializable, Traversable]
Safe nullable handling - Some<T> or None

Either [Functor, Monad, Foldable, Traversable, PromiseLike]
Error handling with Left (error) or Right (success)

List [Functor, Monad, Foldable, Collection, Serializable, Traversable]
Immutable array with functional operations
\`\`\`

### get_type_api

Get detailed API reference for any type, organized by category: Create, Transform, Extract, Check.

**Example** — `get_type_api("Option")`:
\`\`\`
Option<T> [Functor, Monad, Foldable, Extractable, Matchable, Serializable, Traversable]

Create: Option(v), Option.none(), Some(v), None()
Transform: .map(f), .flatMap(f), .filter(p), .ap(ff)
Extract: .fold(n, s), .orElse(d), .orThrow(), .orNull(), .match({Some, None})
Check: .isSome, .isNone, .isDefined, .isEmpty
\`\`\`

### get_interfaces

Get the full interface hierarchy — Functor, Monad, Foldable, Extractable, Matchable, and more — with their method signatures and inheritance relationships.

**Example output:**
\`\`\`
Functor<A> .map<B>(f: A => B): Functor<B>
Monad<A> .flatMap<B>(f: A => Monad<B>): Monad<B>
Foldable<A> .fold<B>(empty: () => B, f: A => B): B
Extractable<A> .orElse(d: T): T
Matchable<A> .match<R>(patterns): R
\`\`\`

### validate_code

Type-check functype code snippets against the TypeScript compiler. Catches type errors before code is presented or committed. Supports auto-importing all functype types.

**Example** — valid code:
\`\`\`typescript
const result = Option(42)
.map(x => x \* 2)
.flatMap(x => x > 50 ? Option(x) : Option.none<number>())
.fold(() => "nothing", x => \`got \${x}\`)
// Validation PASSED
\`\`\`

**Example** — invalid code:
\`\`\`typescript
const result = Option(42)
.map(x => x \* 2)
.flatMap(x => x > 50 ? Option(x) : Option.none())
// Validation FAILED — Option.none() without type parameter
// creates Option<unknown>, incompatible with Option<number>
\`\`\`

### set_functype_version

Switch the functype version at runtime. Installs the specified version and reloads all documentation and type definitions. Useful for working with projects pinned to older versions.

**Example:** `set_functype_version("0.46.0")`

## Compatibility

The functype MCP server works with any tool that supports the Model Context Protocol:

| Tool           | Status    |
| -------------- | --------- |
| Claude Code    | Supported |
| Cursor         | Supported |
| Windsurf       | Supported |
| Any MCP client | Supported |

\`\`\`
```

**Step 2: Commit**

```bash
git add landing/src/content/mcp-server.md
git commit -m "feat(landing): add MCP server documentation content"
```

---

### Task 5: Create MCP Server Astro page

**Files:**

- Create: `landing/src/pages/mcp-server.astro`

**Step 1: Create the page file**

Create `landing/src/pages/mcp-server.astro` following the existing type page pattern (e.g., `option.astro`):

```astro
---
import Layout from '../layouts/Layout.astro';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Content as McpServerContent } from '../content/mcp-server.md';
---

<Layout title="MCP Server - Functype">
  <Navigation client:load />
  <div class="min-h-screen bg-white pt-16">
    <!-- Hero Section -->
    <section class="px-6 py-20 text-center max-w-4xl mx-auto">
      <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">MCP Server</h1>
      <p class="text-2xl text-gray-600 mb-4">Live documentation and code validation for any AI agent</p>
      <p class="text-lg text-gray-500 max-w-2xl mx-auto">
        Give your AI coding assistant direct access to functype's type APIs, documentation, and a compile-time code validator
      </p>
      <div class="flex gap-4 justify-center mt-8">
        <a href="https://www.npmjs.com/package/functype-mcp-server" target="_blank" rel="noopener noreferrer" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          npm Package
        </a>
        <a href="https://github.com/jordanburke/functype-mcp-server" target="_blank" rel="noopener noreferrer" class="px-6 py-3 bg-white text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition-colors">
          View Source
        </a>
      </div>
    </section>

    <!-- Content from Markdown -->
    <section class="px-6 py-16">
      <div class="max-w-4xl mx-auto prose prose-lg markdown-content">
        <McpServerContent />
      </div>
    </section>

    <Footer client:load />
  </div>
</Layout>

<style>
  .markdown-content :global(h1) {
    display: none;
  }
  .markdown-content :global(h2) {
    font-size: 1.875rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1rem;
    margin-top: 2.5rem;
  }
  .markdown-content :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.75rem;
    margin-top: 1.5rem;
  }
  .markdown-content :global(p) {
    margin-bottom: 1rem;
    line-height: 1.75;
    color: #374151;
  }
  .markdown-content :global(pre) {
    background-color: #1f2937;
    border-radius: 0.75rem;
    padding: 1.5rem;
    overflow-x: auto;
    margin: 1.5rem 0;
  }
  .markdown-content :global(code) {
    font-size: 0.875rem;
    font-family: ui-monospace, monospace;
  }
  .markdown-content :global(pre code) {
    color: #f3f4f6;
  }
  .markdown-content :global(:not(pre) > code) {
    background-color: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: #1f2937;
  }
  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
  }
  .markdown-content :global(th),
  .markdown-content :global(td) {
    border: 1px solid #d1d5db;
    padding: 0.75rem 1rem;
    text-align: left;
  }
  .markdown-content :global(th) {
    background-color: #f3f4f6;
    font-weight: 600;
  }
  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  .markdown-content :global(li) {
    margin-bottom: 0.5rem;
    color: #374151;
  }
</style>
```

**Step 2: Verify the page loads**

Run: `cd /Users/jordanburke/IdeaProjects/functype/landing && pnpm dev`
Navigate to: `http://localhost:4321/mcp-server`
Expected: Page renders with hero, setup instructions, and 5 tool sections

**Step 3: Commit**

```bash
git add landing/src/pages/mcp-server.astro
git commit -m "feat(landing): add /mcp-server page"
```

---

### Task 6: Update Footer and Sitemap

**Files:**

- Modify: `landing/src/components/Footer.tsx`
- Modify: `landing/src/pages/sitemap.xml.ts`

**Step 1: Add MCP Server link to Footer Resources column**

In `Footer.tsx`, after the Feature Matrix link (line 122), add:

```tsx
<li>
  <a href="/mcp-server" className="hover:text-white transition-colors">
    MCP Server
  </a>
</li>
```

**Step 2: Add MCP Server to sitemap**

In `sitemap.xml.ts`, add to the pages array after the match entry (line 11):

```typescript
    { loc: "/mcp-server", priority: "0.8", changefreq: "monthly" },
```

**Step 3: Verify**

- Footer shows MCP Server link in Resources
- `/sitemap.xml` includes `/mcp-server`

**Step 4: Commit**

```bash
git add landing/src/components/Footer.tsx landing/src/pages/sitemap.xml.ts
git commit -m "feat(landing): add MCP server to footer and sitemap"
```

---

### Task 7: Build verification

**Step 1: Run full build**

Run: `cd /Users/jordanburke/IdeaProjects/functype/landing && pnpm build`
Expected: Build succeeds with no errors

**Step 2: Visual check**

Run dev server and verify:

- Homepage "AI-Powered Development" section has 3 cards (blue, purple, green)
- Skill name reads "Functype" not "Functype User"
- Installation box is split into Skills / MCP columns
- Nav shows "AI Tools"
- `/mcp-server` page loads with full content
- Footer has MCP Server link
- All existing pages still work

**Step 3: Final commit if any fixes needed**
