/**
 * Skill management CLI commands
 *
 * 逆向: amp-cli-reversed/chunk-004.js:23716 (g40 — `skill` command group)
 *   - `skill add <source>` — install from local path/GitHub/etc
 *   - `skill list` — scan and display all available skills
 *   - `skill remove <name>` — remove an installed skill
 *   - `skill info <name>` — show detail about a specific skill
 *
 * Key difference: amp's skillService exposes getSkills()/getSkillErrors()/getSkill() separately,
 * while flitter's SkillService.scan() returns {skills, errors, warnings} in one call.
 * For `info`, we scan then filter by name.
 */

import type { SkillService } from "@flitter/data";

// ─── Deps ──────────────────────────────────────────────────

export interface SkillCommandDeps {
  skillService: SkillService;
}

// ─── Constants ─────────────────────────────────────────────

/** Max description length for list view (逆向: EIT constant used with I40 truncation) */
const MAX_DESC_LEN = 80;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}\u2026`;
}

// ─── Handlers ──────────────────────────────────────────────

/**
 * `flitter skill list`
 *
 * 逆向: chunk-004.js:23744 — lists skills + errors, supports --json
 */
export async function handleSkillList(
  deps: SkillCommandDeps,
  options: { json?: boolean },
): Promise<void> {
  const { skillService } = deps;
  const result = await skillService.scan();

  if (options.json) {
    const data = {
      skills: result.skills.map((s) => ({
        name: s.name,
        description: s.description,
        baseDir: s.baseDir,
      })),
      errors: result.errors.map((e) => ({
        path: e.path,
        error: e.error,
      })),
    };
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  if (result.skills.length === 0 && result.errors.length === 0) {
    // 逆向: amp shows discovery path hints when no skills found
    process.stdout.write("No skills available.\n");
    process.stdout.write("\nSkills can be added to:\n");
    process.stdout.write("  \u2022 .agents/skills/ (workspace)\n");
    process.stdout.write("  \u2022 ~/.config/flitter/skills/ (global)\n");
    process.stdout.write("\nOr install from a local path: flitter skill add <path>\n");
    return;
  }

  if (result.skills.length > 0) {
    process.stdout.write(`Available skills (${result.skills.length}):\n\n`);
    for (const skill of result.skills) {
      process.stdout.write(`  \u2022 ${skill.name}\n`);
      process.stdout.write(`    ${truncate(skill.description, MAX_DESC_LEN)}\n`);
      process.stdout.write(`    ${skill.baseDir}\n\n`);
    }
  }

  // 逆向: chunk-004.js:23787 — shows errors with yellow warning prefix
  if (result.errors.length > 0) {
    if (result.skills.length > 0) process.stdout.write("\n");
    process.stdout.write(`Skipped skills with errors (${result.errors.length}):\n\n`);
    for (const err of result.errors) {
      const dirName = err.path.split("/").at(-1) ?? "unknown";
      process.stdout.write(`  \u26A0 ${dirName}\n`);
      process.stdout.write(`    ${err.error}\n`);
      process.stdout.write(`    ${err.path}\n\n`);
    }
  }
}

/**
 * `flitter skill info <name>`
 *
 * 逆向: chunk-004.js:23819 — show detail about a single skill, supports --json
 * Difference: amp has getSkill(name), we scan() then filter
 */
export async function handleSkillInfo(
  deps: SkillCommandDeps,
  name: string,
  options: { json?: boolean },
): Promise<void> {
  const { skillService } = deps;
  const result = await skillService.scan();
  const skill = result.skills.find((s) => s.name === name);

  if (!skill) {
    process.stderr.write(`Skill "${name}" not found.\n`);
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          name: skill.name,
          description: skill.description,
          metadata: skill.frontmatter,
          path: skill.baseDir,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  // 逆向: chunk-004.js:23836 — human-readable output
  process.stdout.write(`Skill: ${skill.name}\n`);
  if (skill.description) {
    process.stdout.write(`Description: ${skill.description}\n`);
  }
  // Show any extra frontmatter metadata (version, license, etc.)
  const fm = skill.frontmatter;
  for (const [key, value] of Object.entries(fm)) {
    if (key === "name" || key === "description" || key === "mcpServers" || key === "includeTools") {
      continue;
    }
    process.stdout.write(`${key}: ${String(value)}\n`);
  }
  if (fm.mcpServers && Object.keys(fm.mcpServers).length > 0) {
    process.stdout.write(`MCP Servers: ${Object.keys(fm.mcpServers).join(", ")}\n`);
  }
  if (fm.includeTools && fm.includeTools.length > 0) {
    process.stdout.write(`Include Tools: ${fm.includeTools.join(", ")}\n`);
  }
  process.stdout.write(`Path: ${skill.baseDir}\n`);
}

/**
 * `flitter skill remove <name>`
 *
 * 逆向: chunk-004.js:23810 — remove by name, print success/failure
 */
export async function handleSkillRemove(deps: SkillCommandDeps, name: string): Promise<void> {
  const { skillService } = deps;

  const removed = await skillService.remove(name);
  if (removed) {
    process.stdout.write(`\u2713 Removed ${name}\n`);
  } else {
    process.stderr.write(`Skill "${name}" not found.\n`);
    process.exitCode = 1;
  }
}

/**
 * `flitter skill add <source>`
 *
 * 逆向: chunk-004.js:23719 — install from source path, supports --name, --overwrite, --global
 * Key difference: amp takes separate targetDir; flitter computes install path internally.
 * The --global flag would need SkillService to support global-only install target.
 * For now, we rely on the service's default behavior (workspace if available, else global).
 */
export async function handleSkillAdd(
  deps: SkillCommandDeps,
  source: string,
  options: { name?: string; overwrite?: boolean },
): Promise<void> {
  const { skillService } = deps;

  process.stdout.write(`Installing skill from ${source}...\n`);

  try {
    const result = await skillService.install(source, {
      name: options.name,
      overwrite: options.overwrite,
    });

    if (result.success) {
      process.stdout.write(`\u2713 Installed ${result.skillName}\n`);
      process.stdout.write(`  \u2192 ${result.installedPath}\n`);
    } else {
      process.stderr.write(`\u2717 Failed to install: ${result.error}\n`);
      process.exitCode = 1;
    }
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
