# Functype Skills

This directory contains Claude Code skills for working with the functype library.

## Available Skills

### 1. functype

**Purpose**: Help developers use functype patterns in their TypeScript projects

**Use when**:

- Converting imperative/OOP code to functional patterns
- Looking up functype APIs and methods
- Handling nulls with Option
- Managing errors with Either/Try
- Working with immutable collections (List, Set)
- Debugging functype code

**Installation**:

```bash
# From the distributed zip
claude-code install dist/skills/functype.zip

# Or copy directly to Claude's skills directory
cp -r .claude/skills/functype ~/.claude/skills/
```

### 2. functype-developer

**Purpose**: Assist contributors developing the functype library itself

**Use when**:

- Creating new data structures
- Implementing functional interfaces (Functor, Monad, Foldable)
- Adding tests
- Understanding library architecture
- Debugging functional type implementations
- Following the Base pattern and Companion utilities

**Installation**:

```bash
# From the distributed zip
claude-code install dist/skills/functype-developer.zip

# Or copy directly to Claude's skills directory
cp -r .claude/skills/functype-developer ~/.claude/skills/
```

## Skill Contents

### functype

```
functype/
├── SKILL.md                        # Main skill guide
└── references/
    ├── feature-matrix.md           # Interface and method reference (symlink)
    ├── common-patterns.md          # Additional pattern examples
    └── quick-reference.md          # Quick API lookup
```

**Key features**:

- Pattern conversion examples (imperative → functional)
- Common use cases (validation, error handling, collections)
- API lookup by type
- Debugging tips
- CLI documentation access (`npx functype`)

### functype-developer

```
functype-developer/
├── SKILL.md                        # Main development guide
├── scripts/
│   ├── new-type-template.sh        # Generate boilerplate for new types
│   └── validate.sh                 # Run full validation workflow
└── references/
    ├── architecture.md             # Architecture and design patterns
    ├── adding-types.md             # Step-by-step guide for new types
    └── testing-patterns.md         # Testing strategies
```

**Key features**:

- Complete development workflow
- Architecture patterns (Base, Companion, HKT)
- Interface implementation guide
- Testing patterns (unit, property-based, integration)
- Code style guidelines
- Debugging tips

## Building Skills

The skills are created using the Anthropic skill-creator toolkit:

```bash
# Initialize new skill
python3 ~/.claude/plugins/marketplaces/anthropic-agent-skills/skill-creator/scripts/init_skill.py skill-name --path .claude/skills

# Package skill
python3 ~/.claude/plugins/marketplaces/anthropic-agent-skills/skill-creator/scripts/package_skill.py .claude/skills/skill-name dist/skills
```

## Marketplace Distribution

The `.claude-plugin/marketplace.json` file enables marketplace distribution:

```json
{
  "name": "functype",
  "skills": [
    {
      "id": "functype",
      "name": "Functype User Guide",
      "path": ".claude/skills/functype"
    },
    {
      "id": "functype-developer",
      "name": "Functype Library Developer",
      "path": ".claude/skills/functype-developer"
    }
  ]
}
```

## Usage in Claude Code

Once installed, Claude Code will automatically suggest these skills when:

**functype** triggers:

- Code contains null checks, optional chaining, or try-catch
- User asks about functype patterns or APIs
- Working with Option, Either, Try, List types

**functype-developer** triggers:

- Creating new functype types
- Implementing functional interfaces
- Adding tests to functype
- Working in the functype repository

## Updating Skills

To update skills after making changes:

1. Edit the skill files in `.claude/skills/`
2. Repackage: `python3 ~/.claude/plugins/.../package_skill.py .claude/skills/skill-name dist/skills`
3. Reinstall if needed

## Contributing

To improve these skills:

1. Edit files in `.claude/skills/functype/` or `.claude/skills/functype-developer/`
2. Test the skill locally
3. Repackage and verify
4. Commit changes to the repository

## Skill Validation Checklist

Before packaging or updating skills, verify the following to prevent errors:

### Content Validation

- [ ] **YAML frontmatter**: Properly formatted with `---` delimiters (no extra characters)
- [ ] **Import statements**: All imports verified against `package.json` exports
- [ ] **Code examples**: All code compiles and type-checks correctly
- [ ] **File paths**: All referenced files exist in the repository
- [ ] **URLs**: All links point to valid, accessible URLs
- [ ] **Skill description**: Accurately describes when to trigger the skill

### Import Verification Process

1. Open `package.json` and review the `exports` section
2. Compare all `import` statements in skill files against available exports
3. Remove or update any imports that aren't exported
4. For internal development examples (functype-developer), use `@/` imports
5. For user-facing examples (functype), only use published package imports

### Common Import Mistakes to Avoid

- ❌ `import { Base } from "functype/core/base"` (internal paths not exported)
- ❌ `import { Option } from "functype/option"` (subpath imports don't work)
- ✅ `import { Option } from "functype"` (correct - use main bundle)
- ✅ `import { Base } from "@/core/base"` (valid for functype-developer only)

### Package Validation

```bash
# Validate before packaging
python3 ~/.claude/plugins/marketplaces/anthropic-agent-skills/skill-creator/scripts/quick_validate.py .claude/skills/functype

# Package after validation passes
python3 ~/.claude/plugins/marketplaces/anthropic-agent-skills/skill-creator/scripts/package_skill.py .claude/skills/functype dist/skills
```

## Resources

- **Skill Creator Docs**: See the skill-creator skill for guidelines
- **Functype Docs**: https://jordanburke.github.io/functype/
- **Feature Matrix**: `docs/FUNCTYPE_FEATURE_MATRIX.md`
- **GitHub**: https://github.com/jordanburke/functype
