# Design: Add MCP Server to Landing Site

## Summary

Add functype-mcp-server to the landing site with two touchpoints: a merged "AI-Powered Development" homepage section (combining existing Claude Code Skills with new MCP card) and a dedicated `/mcp-server` page with full tool documentation.

## Homepage Changes

### Rename Section

- Section title: "Claude Code Skills" -> "AI-Powered Development"
- Section subtitle: Updated to mention MCP server alongside skills
- Nav label: "Claude Skills" -> "AI Tools" (in Navigation component)
- Section id: `claude-skills` -> `ai-tools`

### Fix Existing Skill Name

- Rename "Functype User" card to "Functype" (skill was renamed from functype-user to functype)
- Update install command: `/plugin install functype-user` -> `/plugin install functype`

### Add MCP Server Card

- Grid: `md:grid-cols-2` -> `md:grid-cols-3`
- New card (green-themed to differentiate from blue/purple):
  - Title: "MCP Server"
  - Subtitle: "For Any AI Agent"
  - Description: Live documentation lookup and compile-time code validation for any MCP-compatible AI tool
  - Feature bullets:
    1. Search docs and type API references
    2. Compile-time code validation
    3. Runtime version switching
  - Install snippet: `.mcp.json` config
  - Link to dedicated `/mcp-server` page

### Update Quick Installation Box

Add MCP server setup alongside existing skill install commands.

## Dedicated Page: `/mcp-server`

### Structure

Follows existing type page pattern (Astro page + markdown content).

### Hero

- Title: "MCP Server"
- Tagline: "Live documentation and code validation for any AI agent"
- CTA buttons: npm package link, GitHub source link

### Content Sections

1. **Overview** - What the MCP server is, who it's for (Claude Code, Cursor, Windsurf, any MCP-compatible tool)
2. **Setup** - `.mcp.json` config snippet
3. **Tools** (5 sections):
   - `search_docs` - Browse all types or search by keyword
   - `get_type_api` - Detailed API reference for any type with methods by category
   - `get_interfaces` - Interface hierarchy (Functor, Monad, Foldable, etc.)
   - `validate_code` - Type-check functype code at compile time
   - `set_functype_version` - Switch version at runtime
4. **Compatibility** - Works with any MCP-compatible AI tool

## Files

| Action | File                                  | Description                                  |
| ------ | ------------------------------------- | -------------------------------------------- |
| Modify | `src/components/ClaudeCodeSkills.tsx` | Add MCP card, rename section, fix skill name |
| Modify | `src/components/Navigation.tsx`       | Rename nav label, update section id          |
| Create | `src/content/mcp-server.md`           | Dedicated page content                       |
| Create | `src/pages/mcp-server.astro`          | Dedicated page route                         |
