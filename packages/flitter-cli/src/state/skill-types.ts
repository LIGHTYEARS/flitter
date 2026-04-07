// Skill data model types for flitter-cli.
//
// Self-contained domain types for the skills system, matching AMP's
// reverse-engineered skill object shapes exactly:
//   - 03_skills_modal_m9T.js (widget props: skills, errors, warnings)
//   - 03_skills_modal_state_f9T.js (skill object: name, description, baseDir, frontmatter, content, files)
//   - 26_toast_skills.js (pending skills: name field)
//
// Zero external dependencies.

// ---------------------------------------------------------------------------
// SkillFrontmatter — all 12 fields from AMP detail panel rendering
// ---------------------------------------------------------------------------

/**
 * Frontmatter metadata parsed from a SKILL.md file header.
 *
 * Matches every field rendered in AMP f9T's detail panel:
 * D.name, D.description, D.license, D.compatibility, D["argument-hint"],
 * D.model, D["allowed-tools"], D["builtin-tools"], D["disable-model-invocation"],
 * D.mode, D.isolatedContext, D.metadata.
 */
export interface SkillFrontmatter {
  name?: string;
  description?: string;
  license?: string;
  compatibility?: string;
  'argument-hint'?: string;
  model?: string;
  'allowed-tools'?: string[];
  'builtin-tools'?: string[];
  'disable-model-invocation'?: boolean;
  mode?: boolean;
  isolatedContext?: boolean;
  metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// SkillDefinition — the skill object passed to the modal widget
// ---------------------------------------------------------------------------

/**
 * A fully-loaded skill definition, matching the skill objects in AMP's
 * m9T.skills[] array and f9T build() method.
 *
 * - name: skill display name (also used as invoke key)
 * - description: optional short description for list view
 * - baseDir: file:// URI for filesystem skills, "builtin://" prefix for built-ins
 * - frontmatter: parsed SKILL.md YAML frontmatter
 * - content: SKILL.md body text after frontmatter delimiter
 * - files: file paths in the skill directory (used in detail panel)
 */
export interface SkillDefinition {
  name: string;
  description?: string;
  baseDir: string;
  frontmatter: SkillFrontmatter;
  content: string;
  files: string[];
}

// ---------------------------------------------------------------------------
// SkillError — load errors shown in the "Skipped skills with errors" section
// ---------------------------------------------------------------------------

/**
 * Represents a skill that failed to load.
 *
 * Rendered in f9T build() as:
 *   - path.split("/")[path.split("/").length - 2] for display name
 *   - error text in destructive color
 *   - optional hint (first line only)
 *   - relativized path in dim
 */
export interface SkillError {
  path: string;
  error: string;
  hint?: string;
}

// ---------------------------------------------------------------------------
// SkillWarning — non-fatal load warnings
// ---------------------------------------------------------------------------

/**
 * Represents a skill with a non-fatal warning.
 *
 * Rendered in f9T build() as:
 *   - relativized path with warning icon
 *   - error text
 */
export interface SkillWarning {
  path: string;
  error: string;
}

// ---------------------------------------------------------------------------
// SkillGroup — grouping result from Cq0 helper
// ---------------------------------------------------------------------------

/**
 * A group of skills sharing the same path origin.
 *
 * Produced by groupSkillsByPath() (AMP's Cq0 function):
 *   - "Local" group: skills in .agents/skills/ relative to cwd
 *   - "Global" group: skills in ~/.agents/skills/
 *   - Other: custom path label
 *
 * pathHint is rendered dim next to the label in the group header.
 */
export interface SkillGroup {
  label: string;
  pathHint: string | null;
  skills: SkillDefinition[];
}
