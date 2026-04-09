// skill-loader.ts — Filesystem skill scanner for flitter-cli.
//
// Scans local (.agents/skills/) and global (~/.agents/skills/) directories
// for SKILL.md files, parses YAML frontmatter, and returns SkillDefinitions
// ready to be passed to SkillService.setSkills().

import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import type { SkillDefinition, SkillError, SkillWarning, SkillFrontmatter } from './skill-types';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SkillLoadResult {
  skills: SkillDefinition[];
  errors: SkillError[];
  warnings: SkillWarning[];
}

/**
 * Scan skill directories and load all SKILL.md definitions.
 *
 * Scans two directories:
 *   - Local: {cwd}/.agents/skills/
 *   - Global: ~/.agents/skills/
 *
 * Each subdirectory containing a SKILL.md file is treated as a skill.
 * Returns the combined result of all loaded skills, errors, and warnings.
 */
export function loadSkills(cwd: string): SkillLoadResult {
  const skills: SkillDefinition[] = [];
  const errors: SkillError[] = [];
  const warnings: SkillWarning[] = [];

  const localDir = resolve(cwd, '.agents/skills');
  const globalDir = resolve(homedir(), '.agents/skills');

  _scanDirectory(localDir, skills, errors, warnings);
  _scanDirectory(globalDir, skills, errors, warnings);

  log.info(`skill-loader: loaded ${skills.length} skills, ${errors.length} errors, ${warnings.length} warnings`);
  return { skills, errors, warnings };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _scanDirectory(
  dir: string,
  skills: SkillDefinition[],
  errors: SkillError[],
  warnings: SkillWarning[],
): void {
  if (!existsSync(dir)) return;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;

    const skillDir = join(dir, entry);
    try {
      const stat = statSync(skillDir);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }

    const skillMdPath = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;

    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      const { frontmatter, body } = _parseFrontmatter(content);

      // List files in the skill directory
      let files: string[] = [];
      try {
        files = readdirSync(skillDir).filter(f => !f.startsWith('.'));
      } catch { /* ignore */ }

      const name = frontmatter.name || entry;
      const description = frontmatter.description;

      // Check for duplicate names
      if (skills.some(s => s.name === name)) {
        warnings.push({
          path: skillMdPath,
          error: `Duplicate skill name "${name}" — skipping`,
        });
        continue;
      }

      skills.push({
        name,
        description,
        baseDir: `file://${skillDir}`,
        frontmatter,
        content: body,
        files,
      });
    } catch (err) {
      errors.push({
        path: skillMdPath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Expects `---` delimiters at start and end of frontmatter block.
 * Returns parsed frontmatter fields and the body text after the delimiter.
 */
function _parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  const lines = content.split('\n');
  if (lines.length === 0 || lines[0]!.trim() !== '---') {
    return { frontmatter: {}, body: content };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = lines.slice(1, endIdx).join('\n');
  const body = lines.slice(endIdx + 1).join('\n').trim();
  const frontmatter = _parseSimpleYaml(yamlBlock);

  return { frontmatter, body };
}

/**
 * Minimal YAML parser for skill frontmatter.
 * Handles: string fields, boolean fields, simple string arrays.
 * Does not handle nested objects or multiline strings beyond basic `>` folding.
 */
function _parseSimpleYaml(yaml: string): SkillFrontmatter {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Array item: "  - value"
    if (/^\s+-\s+/.test(line) && currentKey) {
      const val = line.replace(/^\s+-\s+/, '').trim();
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      (result[currentKey] as string[]).push(val);
      continue;
    }

    // Continuation of multiline scalar (folded `>` or literal `|`)
    if (currentKey && /^\s+\S/.test(line) && typeof result[currentKey] === 'string') {
      const trimmed = line.trim();
      result[currentKey] = ((result[currentKey] as string) + ' ' + trimmed).trim();
      continue;
    }

    // Key-value pair
    const match = line.match(/^([a-zA-Z_-]+(?:\s*[a-zA-Z_-]*)*)\s*:\s*(.*)/);
    if (match) {
      const key = match[1]!.trim();
      let value = match[2]!.trim();

      // Handle multiline indicators
      if (value === '>' || value === '|') {
        currentKey = key;
        result[key] = '';
        continue;
      }

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Boolean
      if (value === 'true') { result[key] = true; currentKey = key; continue; }
      if (value === 'false') { result[key] = false; currentKey = key; continue; }

      result[key] = value || undefined;
      currentKey = key;
    }
  }

  return result as SkillFrontmatter;
}
