# ts-builds-template Skill

Claude Code skill for bootstrapping new TypeScript libraries from the ts-builds-template.

## Overview

This skill provides guidance for creating new TypeScript libraries from the [ts-builds-template](https://github.com/jordanburke/ts-builds-template):

- Cloning and customizing the template for a new project
- Understanding the project structure and dev workflow
- Publishing to npm with ES module output and TypeScript declarations

## Skill Contents

```
ts-builds-template/
├── SKILL.md                        # Main skill guide (loaded by Claude Code)
└── references/
    └── template-setup.md           # Complete setup guide for new projects
```

## When Claude Code Uses This Skill

The skill activates when:

- Creating a new TypeScript library or npm package from this template
- Customizing the template (package.json, README, CLAUDE.md)
- Understanding the template's project structure
- Publishing a library to npm for the first time

## Installation

### For Use in Other Projects

```bash
# Copy to Claude Code skills directory
cp -r .claude/skills/ts-builds-template ~/.claude/skills/
```

### For Marketplace Distribution

This skill is configured for marketplace distribution via `.claude-plugin/marketplace.json`.

## Related Skills

- **ts-builds** — Detailed tooling configuration (tsdown, Vitest, ESLint, Prettier), migration guides for existing projects, and standardization patterns

## Resources

- **Template Repository**: https://github.com/jordanburke/ts-builds-template
- **ts-builds**: https://github.com/jordanburke/ts-builds
- **Marketplace Distribution**: `.claude-plugin/marketplace.json`

## License

MIT - Same as the ts-builds-template repository
