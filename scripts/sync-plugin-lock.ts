#!/usr/bin/env tsx
/**
 * Keep the Claude plugins' versions honest. An installed plugin updates only when its version in
 * `.claude-plugin/marketplace.json` changes, so a skill edit without a version bump never reaches
 * anyone who installed it (the `functype` plugin sat at 1.0.1 from 2026-04-18 while its skill
 * changed for six months).
 *
 * `scripts/plugin-skills.lock.json` records, for each plugin, its version and a hash of every file
 * in its `skills` directories. The hash is computed from the files themselves, not from git, so the
 * check works in CI's shallow clone.
 *
 * Usage:
 *   pnpm sync:plugin-lock          — rewrites the lock; refuses if a plugin's skills changed and
 *                                    its version didn't
 *   pnpm sync:plugin-lock --check  — fails if the lock doesn't match the skills and manifest.
 *                                    packages/functype/test/docs/plugin-skills-lock.spec.ts runs it
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = ".claude-plugin/marketplace.json";
const LOCK = "scripts/plugin-skills.lock.json";

type Plugin = { name: string; version: string; skills?: readonly string[] };
type Lock = Record<string, { version: string; sha256: string }>;

const checkMode = process.argv.includes("--check");

const readJson = <T>(relPath: string): T =>
  JSON.parse(readFileSync(join(repoRoot, relPath), "utf8")) as T;

// Every file under `dir`, skipping dotfiles (`.DS_Store` and the like), as repo-relative paths.
const filesUnder = (dir: string): string[] =>
  readdirSync(join(repoRoot, dir), { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    });

const hashSkills = (skills: readonly string[]): string => {
  const files = skills
    .flatMap((skill) => filesUnder(skill.replace(/^\.\//, "")))
    .map((path) => path.split("\\").join("/"))
    .sort();
  const hash = createHash("sha256");
  files.forEach((path) =>
    hash
      .update(`${path}\0`)
      .update(readFileSync(join(repoRoot, path)))
      .update("\0"),
  );
  return hash.digest("hex");
};

const plugins = readJson<{ plugins: readonly Plugin[] }>(MANIFEST).plugins;
const lock = readJson<Lock>(LOCK);
const current: Lock = Object.fromEntries(
  plugins.map((plugin) => [
    plugin.name,
    { version: plugin.version, sha256: hashSkills(plugin.skills ?? []) },
  ]),
);

const bumpNeeded = plugins.filter((plugin) => {
  const locked = lock[plugin.name];
  return (
    locked !== undefined &&
    locked.sha256 !== current[plugin.name]?.sha256 &&
    locked.version === plugin.version
  );
});

if (bumpNeeded.length > 0) {
  bumpNeeded.forEach((plugin) =>
    console.error(
      `✗ The ${plugin.name} plugin's skills changed, but its version is still ${plugin.version}. ` +
        `Bump it in ${MANIFEST}, then run \`pnpm sync:plugin-lock\`.`,
    ),
  );
  process.exit(1);
}

const stale = JSON.stringify(lock) !== JSON.stringify(current);

if (checkMode) {
  if (stale) {
    console.error(
      `✗ ${LOCK} is out of date with ${MANIFEST}. Run \`pnpm sync:plugin-lock\`.`,
    );
    process.exit(1);
  }
  console.log(
    `✓ plugin skills lock in sync (${plugins.map((p) => `${p.name}@${p.version}`).join(", ")})`,
  );
} else {
  writeFileSync(join(repoRoot, LOCK), JSON.stringify(current, null, 2) + "\n");
  console.log(`✓ ${stale ? "Wrote" : "Already in sync:"} ${LOCK}`);
}
