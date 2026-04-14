import * as fs from "node:fs";
import * as path from "node:path";
import type { Skill, SkillFile, SkillFrontmatter } from "./skill-types.ts";

// ---------------------------------------------------------------------------
// Simple YAML parser (no js-yaml dependency)
// ---------------------------------------------------------------------------

/**
 * Parse simple YAML key:value pairs, arrays, and shallow nested objects.
 * Good enough for SKILL.md frontmatter -- not a full YAML parser.
 */
export function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Skip blank lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    // Match top-level key (allow hyphens in keys for YAML compatibility)
    const keyMatch = line.match(/^([a-zA-Z_][\w-]*)\s*:(.*)/);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1]!;
    const inlineValue = keyMatch[2]!.trim();

    // If there is an inline value, parse it as a scalar
    if (inlineValue !== "") {
      result[key] = parseScalar(inlineValue);
      i++;
      continue;
    }

    // No inline value -- peek at next lines for array or nested object
    const nested = collectIndented(lines, i + 1);
    if (nested.lines.length === 0) {
      result[key] = "";
      i++;
      continue;
    }

    // Determine if it's an array (lines start with "- ") or nested object
    const firstNested = nested.lines[0]!.trimStart();
    if (firstNested.startsWith("- ")) {
      result[key] = parseArrayBlock(nested.lines);
    } else {
      result[key] = parseNestedObject(nested.lines);
    }
    i = nested.nextIndex;
  }

  return result;
}

function collectIndented(
  lines: string[],
  startIndex: number,
): { lines: string[]; nextIndex: number } {
  const collected: string[] = [];
  let i = startIndex;

  if (i >= lines.length) return { lines: collected, nextIndex: i };

  // Determine the indentation level of the first indented line
  const firstLine = lines[i]!;
  const indentMatch = firstLine.match(/^(\s+)/);
  if (!indentMatch) return { lines: collected, nextIndex: i };

  const indent = indentMatch[1]!.length;

  while (i < lines.length) {
    const line = lines[i]!;
    // Blank lines within indented block are included
    if (line.trim() === "") {
      collected.push(line);
      i++;
      continue;
    }
    const lineIndentMatch = line.match(/^(\s*)/);
    const lineIndent = lineIndentMatch ? lineIndentMatch[1]!.length : 0;
    if (lineIndent < indent) break;
    collected.push(line);
    i++;
  }

  return { lines: collected, nextIndex: i };
}

function parseArrayBlock(lines: string[]): unknown[] {
  const items: unknown[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const arrayMatch = trimmed.match(/^-\s+(.*)/);
    if (arrayMatch) {
      items.push(parseScalar(arrayMatch[1]!.trim()));
    }
  }
  return items;
}

function parseNestedObject(lines: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    const keyMatch = trimmed.match(/^([a-zA-Z_][\w-]*)\s*:(.*)/);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1]!;
    const inlineValue = keyMatch[2]!.trim();

    if (inlineValue !== "") {
      obj[key] = parseScalar(inlineValue);
      i++;
      continue;
    }

    // Look for deeper nesting
    const nested = collectIndented(lines, i + 1);
    if (nested.lines.length === 0) {
      obj[key] = "";
      i++;
      continue;
    }

    const firstNested = nested.lines[0]!.trimStart();
    if (firstNested.startsWith("- ")) {
      obj[key] = parseArrayBlock(nested.lines);
    } else {
      obj[key] = parseNestedObject(nested.lines);
    }
    i = nested.nextIndex;
  }
  return obj;
}

function parseScalar(value: string): unknown {
  // Remove surrounding quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Null
  if (value === "null" || value === "~") return null;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  // Inline array [a, b, c]
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1);
    if (inner.trim() === "") return [];
    return inner.split(",").map((item) => parseScalar(item.trim()));
  }

  return value;
}

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

/**
 * Parse SKILL.md YAML frontmatter (from SqR, line 2807-2820)
 * Throws if no frontmatter, or missing name/description
 */
export function parseSkillFrontmatter(content: string): {
  frontmatter: SkillFrontmatter;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error("SKILL.md must contain YAML frontmatter delimited by ---");
  }

  const yamlText = match[1]!;
  const body = (match[2] ?? "").trim();
  const raw = parseSimpleYaml(yamlText);

  if (!raw.name || typeof raw.name !== "string") {
    throw new Error('SKILL.md frontmatter must include a "name" field');
  }
  if (!raw.description || typeof raw.description !== "string") {
    throw new Error('SKILL.md frontmatter must include a "description" field');
  }

  const frontmatter = raw as unknown as SkillFrontmatter;
  return { frontmatter, body };
}

// ---------------------------------------------------------------------------
// Skill name validation
// ---------------------------------------------------------------------------

const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validate skill name (from vqR, line 2793-2797)
 * Lowercase alphanumeric + hyphens, no trailing hyphen, max 64 chars.
 */
export function validateSkillName(name: string): void {
  if (!name) {
    throw new Error("Skill name must not be empty");
  }
  if (name.length > 64) {
    throw new Error(`Skill name must be at most 64 characters, got ${name.length}`);
  }
  if (!SKILL_NAME_RE.test(name)) {
    throw new Error(
      `Invalid skill name "${name}": must be lowercase alphanumeric with hyphens (e.g. "my-skill")`,
    );
  }
}

// ---------------------------------------------------------------------------
// Load a single skill from a directory
// ---------------------------------------------------------------------------

/**
 * Load single skill from directory (from OqR, line 2822-2848)
 * Looks for SKILL.md or skill.md, reads content, parses frontmatter, scans files
 */
export function loadSkill(dir: string): Skill {
  const candidates = ["SKILL.md", "skill.md"];
  let skillMdPath: string | null = null;

  for (const candidate of candidates) {
    const fullPath = path.join(dir, candidate);
    if (fs.existsSync(fullPath)) {
      skillMdPath = fullPath;
      break;
    }
  }

  if (!skillMdPath) {
    throw new Error(`No SKILL.md found in ${dir} (looked for SKILL.md and skill.md)`);
  }

  const content = fs.readFileSync(skillMdPath, "utf-8");
  const { frontmatter, body } = parseSkillFrontmatter(content);

  validateSkillName(frontmatter.name);

  const files = scanSkillFiles(dir);

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    baseDir: dir,
    frontmatter,
    body,
    files,
  };
}

// ---------------------------------------------------------------------------
// Recursively scan skill directory files
// ---------------------------------------------------------------------------

/**
 * Recursively scan skill directory files (from SaT, line 2764-2791)
 * Skip symlinks, hidden files (starting with .), node_modules
 * Returns relative paths
 */
export function scanSkillFiles(baseDir: string, subDir?: string): SkillFile[] {
  const currentDir = subDir ? path.join(baseDir, subDir) : baseDir;
  const files: SkillFile[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    // Skip hidden files/dirs
    if (entry.name.startsWith(".")) continue;
    // Skip node_modules
    if (entry.name === "node_modules") continue;

    const relativePath = subDir ? path.join(subDir, entry.name) : entry.name;
    const fullPath = path.join(baseDir, relativePath);

    // Skip symlinks
    try {
      const lstat = fs.lstatSync(fullPath);
      if (lstat.isSymbolicLink()) continue;

      if (lstat.isDirectory()) {
        const nested = scanSkillFiles(baseDir, relativePath);
        files.push(...nested);
      } else if (lstat.isFile()) {
        files.push({
          path: relativePath,
          fullPath,
          size: lstat.size,
        });
      }
    } catch {}
  }

  return files;
}
