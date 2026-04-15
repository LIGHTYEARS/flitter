---
phase: 9
plan: 05
status: complete
---

# SkillService Skill Discovery & Management — Summary

## One-Liner
Implemented the full skill lifecycle: SKILL.md frontmatter parsing with a custom YAML parser, two-path skill discovery, install/remove/list operations, MCP server derivation, and file-watching with debounced rescan.

## What Was Built
- `packages/data/src/skill/skill-types.ts` — Type definitions: SkillFrontmatter, MCPServerSpec, Skill, SkillFile, SkillScanResult, SkillInstallResult
- `packages/data/src/skill/skill-parser.ts` — Parsing and loading utilities:
  - `parseSimpleYaml()` — self-contained YAML parser supporting key:value, arrays, and shallow nested objects (no js-yaml dependency)
  - `parseSkillFrontmatter(content)` — extracts YAML frontmatter delimited by `---`, validates required `name` and `description` fields
  - `validateSkillName(name)` — enforces lowercase alphanumeric + hyphens, no trailing hyphen, max 64 chars
  - `loadSkill(dir)` — loads SKILL.md (or skill.md) from a directory, parses frontmatter, scans files
  - `scanSkillFiles(baseDir)` — recursive file scan skipping hidden files, symlinks, and node_modules
- `packages/data/src/skill/skill-service.ts` — SkillService class:
  - `skills` / `errors` / `mcpServersFromSkills` — BehaviorSubject reactive streams
  - `scan()` — scans two discovery paths, deduplicates by name (project overrides global), extracts MCP servers
  - `install(source, options?)` — copies skill from local path; supports name override and overwrite flag
  - `remove(name)` — deletes skill directory from discovery paths
  - `list()` — returns frontmatters of all scanned skills
  - `startWatching()` — recursive `fs.watch` on discovery paths, debounced rescan on SKILL.md changes
  - `dispose()` — cleanup
- `packages/data/src/skill/skill-service.test.ts` — 25 tests

## Key Decisions
- Custom simple YAML parser (no js-yaml) — supports key:value pairs, arrays (`- item`), shallow nested objects, inline arrays, scalars (boolean, number, null, quoted strings); sufficient for SKILL.md frontmatter
- Two discovery paths instead of the plan's three (dropped the Amp-compatible `.agents/skills/` path per KD-30): `{workspaceRoot}/.flitter/skills/` then `{userConfigDir}/skills/`
- Project-level skills shadow global skills of the same name; duplicate warnings are recorded
- Skills sorted alphabetically by name after scan
- Install copies entire directory tree via recursive `fsp.copyFile`; overwrite deletes existing dir first
- MCP server specs are extracted from frontmatter and aggregated into a single reactive `mcpServersFromSkills` BehaviorSubject

## Test Coverage
25 tests covering: parseSkillFrontmatter (4 — valid, missing delimiters, missing name, missing description), validateSkillName (6 — valid names, uppercase, special chars, empty, too long, trailing hyphen), loadSkill (3 — SKILL.md, skill.md lowercase, missing), scanSkillFiles (3 — recursive scan, hidden files, node_modules), SkillService.scan (2 — multi-path discovery, project overrides global), SkillService.install (3 — basic install, existing without overwrite, with overwrite), SkillService.remove (2 — existing, nonexistent), SkillService.list (1), MCP server derivation (1).

## Artifacts
- `packages/data/src/skill/skill-types.ts`
- `packages/data/src/skill/skill-parser.ts`
- `packages/data/src/skill/skill-service.ts`
- `packages/data/src/skill/skill-service.test.ts`
