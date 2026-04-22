/**
 * Check runner subsystem for the review command
 *
 * Discovers check definition files (.md) from `.flitter/checks/` and `.amp/checks/`
 * directories, runs each check as a parallel subagent, and merges results.
 *
 * 逆向: amp check discovery + runner architecture
 *   - pFR (1428_unknown_pFR.js) — walk up directory tree for .agents/checks/
 *   - uFR (1431_unknown_uFR.js) — discover all checks for given files
 *   - mFR (chunk-002.js:32125-32163) — read check .md files from a directory
 *   - AFR (chunk-002.js:32050-32080) — parse frontmatter from check .md
 *   - fFR (1436_unknown_fFR.js) — orchestrate parallel check runs
 *   - IFR (1437_unknown_IFR.js) — run single check as subagent
 *   - MFR (1443_unknown_MFR.js) — parse <checkResult> XML from agent output
 *   - yFR (1432_unknown_yFR.js) — build check system prompt
 *   - dFR (1440_unknown_dFR.js) — orchestrate main review + checks
 *
 * Directory structure:
 *   .agents/checks/*.md   — amp's check dir (oFR = ".agents", NX = "checks")
 *   .flitter/checks/*.md  — flitter's check dir
 *   ~/amp/checks/*.md     — amp's global user config checks (nFR = "amp")
 *   ~/agents/checks/*.md  — amp's global agent checks (lFR = "agents")
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createLogger } from "@flitter/util";

const log = createLogger("check-runner");

// ─── Constants ──────────────────────────────────────────────
// 逆向: chunk-005.js:20182-20185
//   NX = "checks", oFR = ".agents", nFR = "amp", lFR = "agents"

/** Check files subdirectory name */
const CHECKS_DIR_NAME = "checks";

/** Local project check directories (searched relative to workspace root) */
const LOCAL_CHECK_PARENTS = [".agents", ".flitter"];

/** Global user config check directories (searched under ~/.config/) */
const GLOBAL_CHECK_PARENTS = ["amp", "agents"];

// ─── Types ──────────────────────────────────────────────────

/**
 * Frontmatter fields from a check definition .md file.
 * 逆向: AFR (chunk-002.js:32050-32080) — parses name, description, severity-default, tools
 */
export interface CheckFrontmatter {
  name: string;
  description?: string;
  "severity-default"?: string;
  tools?: string[];
}

/**
 * A discovered check definition.
 * 逆向: mFR (chunk-002.js:32125-32163) — builds check objects from .md files
 */
export interface CheckDefinition {
  /** Unique URI/path for this check file */
  uri: string;
  /** Check name (from frontmatter or filename) */
  name: string;
  /** Scope: "dir" for local project checks, "global" for user-level checks */
  scope: string;
  /** Parsed frontmatter */
  frontmatter: CheckFrontmatter;
  /** Markdown body (after frontmatter) */
  content: string;
}

/**
 * Result of check discovery.
 * 逆向: uFR (1431_unknown_uFR.js) — returns allChecks + checksPerFile
 */
export interface CheckDiscoveryResult {
  /** All unique checks found across all directories */
  allChecks: CheckDefinition[];
  /** Map of file path → applicable checks */
  checksPerFile: Map<string, CheckDefinition[]>;
}

/**
 * A single issue found by a check.
 * 逆向: MFR (1443_unknown_MFR.js) — parses <issue> elements
 */
export interface CheckIssue {
  check: string;
  severity: string;
  file: string;
  line?: number;
  problem: string;
  why?: string;
  fix?: string;
  source: string;
}

/**
 * Parsed result from a single check run.
 * 逆向: MFR (1443_unknown_MFR.js) — builds CheckRunResult
 */
export interface CheckRunResult {
  name: string;
  status: "completed" | "error";
  filesAnalyzed?: number;
  linesAnalyzed?: number;
  patternsChecked?: string[];
  issuesFound: number;
  errorMessage?: string;
}

/**
 * Full result of running a single check (definition + result + issues).
 */
export interface CheckRunOutput {
  check: CheckDefinition;
  result: CheckRunResult;
  issues: CheckIssue[];
}

/**
 * Status of a check run entry in the orchestrator.
 * 逆向: fFR (1436_unknown_fFR.js) — status object per check
 */
export type CheckRunStatus =
  | { status: "in-progress"; turns: unknown[] }
  | { status: "done"; result: CheckRunOutput }
  | { status: "error"; error: string; message?: string };

/**
 * Entry in the check run map (keyed by check URI).
 */
export interface CheckRunEntry {
  check: CheckDefinition;
  status: CheckRunStatus;
}

/**
 * Comment extracted from check results for display.
 * 逆向: jIT (2531_unknown_jIT.js) — maps check issues to review comments
 */
export interface ReviewComment {
  filename: string;
  startLine: number;
  endLine: number;
  text: string;
  severity: string;
  source: string;
  why?: string;
  fix?: string;
}

// ─── Frontmatter Parsing ────────────────────────────────────

/**
 * Decode basic HTML entities in extracted XML content.
 * 逆向: gzT (chunk-002.js:31954-31956)
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Extract content between XML tags.
 * 逆向: i3 (chunk-002.js:31957-31965)
 */
export function extractXmlTag(text: string, tagName: string): string | null {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const start = text.indexOf(openTag);
  if (start === -1) return null;
  const contentStart = start + openTag.length;
  const end = text.indexOf(closeTag, contentStart);
  if (end === -1) return null;
  return decodeEntities(text.slice(contentStart, end).trim());
}

/**
 * Parse YAML frontmatter from a check definition .md file.
 * 逆向: AFR (chunk-002.js:32050-32080)
 *
 * Check files use simple YAML frontmatter:
 * ```
 * ---
 * name: my-check
 * description: Checks for something
 * severity-default: medium
 * tools:
 *   - bash
 * ---
 * Check body content...
 * ```
 */
export function parseCheckFrontmatter(content: string): {
  frontmatter: CheckFrontmatter | null;
  body: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: content };
  }

  const yamlText = match[1];
  const body = match[2];

  if (yamlText === undefined || body === undefined) {
    return { frontmatter: null, body: content };
  }

  try {
    // Simple YAML parser for frontmatter fields
    // 逆向: amp uses sFR.default.parse (likely js-yaml)
    // We parse the subset of fields amp cares about
    const parsed = parseSimpleCheckYaml(yamlText);

    return {
      frontmatter: {
        name: typeof parsed.name === "string" ? parsed.name : "unknown",
        description: typeof parsed.description === "string" ? parsed.description : undefined,
        "severity-default":
          typeof parsed["severity-default"] === "string" ? parsed["severity-default"] : undefined,
        tools: Array.isArray(parsed.tools)
          ? parsed.tools.filter((t: unknown) => typeof t === "string")
          : undefined,
      },
      body,
    };
  } catch (err) {
    log.error("Failed to parse check file frontmatter", { error: err });
    return { frontmatter: null, body: content };
  }
}

/**
 * Minimal YAML parser for check frontmatter.
 * Handles: scalar values, simple arrays (- item lines)
 */
function parseSimpleCheckYaml(text: string): Record<string, unknown> {
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

    // Match key: value (allow hyphens in keys for severity-default)
    const keyMatch = line.match(/^([a-zA-Z_][\w-]*)\s*:(.*)/);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1]!;
    const inlineValue = keyMatch[2]!.trim();

    if (inlineValue !== "") {
      // Remove quotes if present
      if (
        (inlineValue.startsWith('"') && inlineValue.endsWith('"')) ||
        (inlineValue.startsWith("'") && inlineValue.endsWith("'"))
      ) {
        result[key] = inlineValue.slice(1, -1);
      } else {
        result[key] = inlineValue;
      }
      i++;
      continue;
    }

    // Peek for array items (- value)
    const items: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j]!;
      const arrayMatch = nextLine.match(/^\s+-\s+(.*)/);
      if (arrayMatch) {
        items.push(arrayMatch[1]!.trim());
        j++;
      } else if (nextLine.trim() === "" || nextLine.trim().startsWith("#")) {
        j++;
      } else {
        break;
      }
    }

    if (items.length > 0) {
      result[key] = items;
      i = j;
    } else {
      result[key] = "";
      i++;
    }
  }

  return result;
}

// ─── Check Discovery ────────────────────────────────────────

/**
 * Read all .md check files from a single directory.
 * 逆向: mFR (chunk-002.js:32125-32163)
 *
 * @param checksDir - Directory to scan for .md files
 * @param scope - Scope identifier for these checks
 * @returns Array of CheckDefinition objects
 */
export function readChecksFromDir(checksDir: string, scope: string): CheckDefinition[] {
  const checks: CheckDefinition[] = [];

  try {
    if (!fs.existsSync(checksDir)) return checks;
    const stat = fs.statSync(checksDir);
    if (!stat.isDirectory()) return checks;

    const entries = fs.readdirSync(checksDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory()) continue;

      const filename = entry.name;
      if (!filename.endsWith(".md")) continue;

      try {
        const filePath = path.join(checksDir, filename);
        const content = fs.readFileSync(filePath, "utf-8");
        if (!content) continue;

        const { frontmatter, body } = parseCheckFrontmatter(content);
        const name = frontmatter?.name ?? filename.replace(/\.md$/, "");

        checks.push({
          uri: filePath,
          name,
          scope,
          frontmatter: frontmatter ?? { name },
          content: body,
        });
      } catch (err) {
        log.error("Failed to read check file", {
          fileUri: path.join(checksDir, filename),
          error: err,
        });
      }
    }
  } catch (err) {
    log.error("Failed to list checks directory", {
      checksDir,
      error: err,
    });
  }

  return checks;
}

/**
 * Walk up from a directory looking for check definitions in local check dirs.
 * 逆向: pFR (1428_unknown_pFR.js) — walks up from dir, stops at workspace roots
 *
 * @param startDir - Directory to start searching from
 * @param stopDirs - Directories to stop at (workspace roots)
 * @param userConfigDir - User config directory (e.g., ~/.config) for global checks
 * @returns Array of unique CheckDefinition objects
 */
export function discoverChecksFromTree(
  startDir: string,
  stopDirs: string[],
  userConfigDir: string | null = null,
): CheckDefinition[] {
  const checksMap = new Map<string, CheckDefinition>();
  const visited = new Set<string>();

  let current = startDir;

  // Walk up directory tree
  // 逆向: pFR while loop — walks up until root or stop dir
  while (true) {
    const normalized = path.resolve(current);
    if (visited.has(normalized)) break;
    visited.add(normalized);

    // Check each local parent directory
    for (const parent of LOCAL_CHECK_PARENTS) {
      const checksDir = path.join(current, parent, CHECKS_DIR_NAME);
      const dirChecks = readChecksFromDir(checksDir, `dir:${current}`);
      for (const check of dirChecks) {
        if (!checksMap.has(check.name)) {
          checksMap.set(check.name, check);
        }
      }
    }

    // Stop if we've reached a workspace root
    if (stopDirs.some((d) => path.resolve(d) === normalized)) break;

    // Move up
    const parentDir = path.dirname(current);
    // 逆向: Q9T — check if we've reached the filesystem root
    if (parentDir === current) break;
    current = parentDir;
  }

  // Also check global user config dirs
  // 逆向: _FR (1429_unknown__FR.js) — adds global checks from userConfigDir
  if (userConfigDir) {
    for (const globalParent of GLOBAL_CHECK_PARENTS) {
      const globalChecksDir = path.join(userConfigDir, globalParent, CHECKS_DIR_NAME);
      const globalChecks = readChecksFromDir(globalChecksDir, "global");
      for (const check of globalChecks) {
        if (!checksMap.has(check.name)) {
          checksMap.set(check.name, check);
        }
      }
    }
  }

  return Array.from(checksMap.values());
}

/**
 * Discover checks for a set of target files.
 * 逆向: uFR (1431_unknown_uFR.js)
 *
 * Groups files by directory, discovers checks per directory, and builds
 * both an allChecks list and a per-file check map.
 *
 * @param targetFiles - Files to find checks for (relative paths)
 * @param workspaceRoot - Workspace root directory
 * @param stopDirs - Directories to stop walk at
 * @param userConfigDir - User config dir for global checks
 * @returns CheckDiscoveryResult with allChecks and checksPerFile
 */
export function discoverChecks(
  targetFiles: string[],
  workspaceRoot: string,
  stopDirs: string[],
  userConfigDir: string | null = null,
): CheckDiscoveryResult {
  const allChecksMap = new Map<string, CheckDefinition>();
  const checksPerFile = new Map<string, CheckDefinition[]>();

  // Group files by directory
  // 逆向: uFR groups files by their directory prefix
  const dirToFiles = new Map<string, string[]>();
  for (const file of targetFiles) {
    const dir = file.includes("/") ? file.substring(0, file.lastIndexOf("/")) : "";
    const existing = dirToFiles.get(dir) ?? [];
    existing.push(file);
    dirToFiles.set(dir, existing);
  }

  // Discover checks per directory group
  const dirChecksCache = new Map<string, CheckDefinition[]>();
  for (const dir of dirToFiles.keys()) {
    const searchDir = dir ? path.join(workspaceRoot, dir) : workspaceRoot;
    const checks = discoverChecksFromTree(searchDir, stopDirs, userConfigDir);
    dirChecksCache.set(dir, checks);

    for (const check of checks) {
      if (!allChecksMap.has(check.name)) {
        allChecksMap.set(check.name, check);
      }
    }
  }

  // Map each file to its directory's checks
  for (const [dir, files] of dirToFiles.entries()) {
    const checks = dirChecksCache.get(dir) ?? [];
    for (const file of files) {
      checksPerFile.set(file, checks);
    }
  }

  return {
    allChecks: Array.from(allChecksMap.values()),
    checksPerFile,
  };
}

/**
 * Filter checks by name patterns.
 * 逆向: fFR (1436_unknown_fFR.js:8) — T.checkFilter ? h.allChecks.filter(...)
 *
 * @param checks - All discovered checks
 * @param filter - Check names to include (exact match)
 * @returns Filtered checks array
 */
export function filterChecks(
  checks: CheckDefinition[],
  filter: string[] | undefined,
): CheckDefinition[] {
  if (!filter || filter.length === 0) return checks;
  return checks.filter((c) => filter.includes(c.name));
}

// ─── Check System Prompt ────────────────────────────────────

/**
 * Build the system prompt for a single check subagent.
 * 逆向: yFR (1432_unknown_yFR.js)
 *
 * @param check - The check definition
 * @param files - Files to review
 * @param diffDescription - Description of the diff
 * @param workingDir - Working directory path
 * @returns System prompt string
 */
export function buildCheckSystemPrompt(
  check: CheckDefinition,
  files: string[],
  diffDescription: string | null,
  workingDir: string | null,
): string {
  const filesSection =
    files.length > 0
      ? `## Files to Review\n\n${files.join("\n")}`
      : "## Files to Review\n\nReview all relevant files in the working directory.";

  const diffSection = diffDescription
    ? `## Diff Description\n\nUse this description to gather the full diff using git or bash commands:\n\n${diffDescription}`
    : "";

  const severityDefault = check.frontmatter["severity-default"] ?? "medium";

  return `# ${check.name} Check

${check.content}

${filesSection}

${diffSection}

Working directory: ${workingDir ?? "unknown"}

## Your Task

1. Review the git diff to see what changed
2. Search for patterns described above ONLY in the changed lines (+ lines in diff)
3. Report issues ONLY for code that was added or modified in this diff
4. Do NOT report issues for unchanged/pre-existing code

## Output Format

End your response with:

<checkResult>
<checkName>${check.name}</checkName>
<status>completed</status>
<filesAnalyzed>NUMBER</filesAnalyzed>
<linesAnalyzed>NUMBER</linesAnalyzed>
<patternsChecked>
<pattern>Brief description of pattern 1</pattern>
<pattern>Brief description of pattern 2</pattern>
</patternsChecked>
<issues>
<issue severity="${severityDefault}" file="path/to/file.ts" line="LINE">
<problem>functionName(): What is wrong (include method/function name if applicable)</problem>
<why>Why this matters</why>
<fix>How to fix it</fix>
</issue>
</issues>
</checkResult>

IMPORTANT: The "file" attribute MUST use the EXACT path from the diff header (e.g., "core/src/tools/file.ts"), not just the filename.

## Severity (default: ${severityDefault})
- critical: Security vulnerability, data loss, crash
- high: Bug or performance issue
- medium: Code smell or maintainability
- low: Style suggestion`;
}

// ─── Check Result Parsing ───────────────────────────────────

/**
 * Parse the <checkResult> XML block from a check agent's output.
 * 逆向: MFR (1443_unknown_MFR.js)
 *
 * @param check - The check definition that was run
 * @param agentOutput - Raw text output from the check subagent
 * @param workingDir - Working directory for resolving relative file paths
 * @returns Parsed CheckRunOutput
 */
export function parseCheckResult(
  check: CheckDefinition,
  agentOutput: string,
  workingDir: string,
): CheckRunOutput {
  const issues: CheckIssue[] = [];

  const resultBlock = extractXmlTag(agentOutput, "checkResult");
  if (!resultBlock) {
    return {
      check,
      result: {
        name: check.name,
        status: "error",
        issuesFound: 0,
        errorMessage: "No checkResult block found in agent output",
      },
      issues: [],
    };
  }

  // Parse status
  const statusMatch = resultBlock.match(/<status>(.*?)<\/status>/);
  const status: "completed" | "error" = statusMatch?.[1] === "completed" ? "completed" : "error";

  // Parse filesAnalyzed / linesAnalyzed
  const filesAnalyzedMatch = resultBlock.match(/<filesAnalyzed>(\d+)<\/filesAnalyzed>/);
  const linesAnalyzedMatch = resultBlock.match(/<linesAnalyzed>(\d+)<\/linesAnalyzed>/);
  const filesAnalyzed = filesAnalyzedMatch?.[1] ? parseInt(filesAnalyzedMatch[1], 10) : undefined;
  const linesAnalyzed = linesAnalyzedMatch?.[1] ? parseInt(linesAnalyzedMatch[1], 10) : undefined;

  // Parse patterns checked
  const patternsChecked: string[] = [];
  const patternsBlock = extractXmlTag(resultBlock, "patternsChecked");
  if (patternsBlock) {
    const patternMatches = patternsBlock.matchAll(/<pattern>([\s\S]*?)<\/pattern>/g);
    for (const m of patternMatches) {
      const p = m[1]?.trim();
      if (p) patternsChecked.push(p);
    }
  }

  // Parse issues
  const issuesBlock = extractXmlTag(resultBlock, "issues");
  if (issuesBlock) {
    const issueMatches = issuesBlock.matchAll(/<issue\s+([^>]+)>([\s\S]*?)<\/issue>/g);
    for (const m of issueMatches) {
      const attrs = m[1] ?? "";
      const body = m[2] ?? "";

      const severityMatch = attrs.match(/severity="(critical|high|medium|low)"/);
      const fileMatch = attrs.match(/file="([^"]+)"/);
      const lineMatch = attrs.match(/line="(\d+)"/);

      const severity = severityMatch?.[1];
      const file = fileMatch?.[1];
      const lineNum = lineMatch?.[1];

      const problem = extractXmlTag(body, "problem");
      const why = extractXmlTag(body, "why");
      const fix = extractXmlTag(body, "fix");

      const problemText = problem?.trim() || body.trim();

      if (severity && file && problemText) {
        // Resolve relative paths to absolute
        // 逆向: MFR uses zU.isAbsolute(f) ? f : zU.join(a, f)
        const resolvedFile = path.isAbsolute(file) ? file : path.join(workingDir, file);

        issues.push({
          check: check.name,
          severity,
          file: resolvedFile,
          line: lineNum ? parseInt(lineNum, 10) : undefined,
          problem: problemText,
          why: why?.trim(),
          fix: fix?.trim(),
          source: check.name,
        });
      }
    }
  }

  return {
    check,
    result: {
      name: check.name,
      status,
      filesAnalyzed,
      linesAnalyzed,
      patternsChecked: patternsChecked.length > 0 ? patternsChecked : undefined,
      issuesFound: issues.length,
    },
    issues,
  };
}

// ─── Check Results to Review Comments ───────────────────────

/**
 * Convert check run results to review comments.
 * 逆向: jIT (2531_unknown_jIT.js) — maps check issues to display comments
 *
 * @param checkRuns - Map of check URI to CheckRunEntry
 * @returns Array of ReviewComment objects
 */
export function checkResultsToComments(checkRuns: Record<string, CheckRunEntry>): ReviewComment[] {
  const comments: ReviewComment[] = [];

  for (const entry of Object.values(checkRuns)) {
    if (entry.status.status !== "done") continue;
    const result = entry.status.result;

    for (const issue of result.issues) {
      comments.push({
        filename: issue.file,
        startLine: issue.line ?? 0,
        endLine: issue.line ?? 0,
        text: issue.problem,
        severity: issue.severity,
        source: issue.source ?? issue.check,
        why: issue.why,
        fix: issue.fix,
      });
    }
  }

  return comments;
}

// ─── Output Formatting ──────────────────────────────────────

/**
 * Format review comments for terminal output.
 * 逆向: _40 (2537_unknown__40.js) — groups comments by file, formats with links
 *
 * @param comments - Review comments to format
 * @param workingDir - Working directory for relative path display
 * @returns Formatted string
 */
export function formatReviewComments(comments: ReviewComment[], workingDir: string): string {
  if (comments.length === 0) return "No issues found.";

  // Group by file
  const byFile = new Map<string, ReviewComment[]>();
  for (const comment of comments) {
    const relPath = path.isAbsolute(comment.filename)
      ? path.relative(workingDir, comment.filename)
      : comment.filename;
    const existing = byFile.get(relPath);
    if (existing) {
      existing.push(comment);
    } else {
      byFile.set(relPath, [comment]);
    }
  }

  const lines: string[] = [];
  for (const [file, fileComments] of byFile.entries()) {
    lines.push(`* ${file}`);

    for (let i = 0; i < fileComments.length; i++) {
      const c = fileComments[i]!;
      const lineRef = c.startLine && c.startLine > 0 ? `@L${c.startLine}` : null;
      const source = c.source ? ` [${c.source}]` : "";

      if (lineRef) {
        lines.push(`${lineRef}${source} ${c.text}`);
      } else {
        lines.push(`${source ? `${source} ` : ""}${c.text}`);
      }

      if (i < fileComments.length - 1) lines.push("");
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Format check run summary for terminal output.
 * 逆向: b40 (2538_unknown_b40.js)
 *
 * @param checkRuns - Map of check URI to CheckRunEntry
 * @returns Formatted summary string
 */
export function formatCheckSummary(checkRuns: Record<string, CheckRunEntry>): string {
  const entries = Object.entries(checkRuns);
  if (entries.length === 0) return "No checks were run.";

  const lines: string[] = [];

  for (const [uri, entry] of entries) {
    if (entry.status.status === "done") {
      const result = entry.status.result;
      const issueCount = result.issues.length;
      const issueWord = issueCount === 1 ? "issue" : "issues";
      const statusText = issueCount === 0 ? "ok" : "issues found";
      lines.push(`- ${result.check.name}: ${statusText} (${issueCount} ${issueWord})`);
      continue;
    }

    // For non-done statuses, extract name from URI
    const basename = path.basename(uri, path.extname(uri));

    if (entry.status.status === "error") {
      lines.push(`- ${basename}: error (${entry.status.error})`);
      continue;
    }

    lines.push(`- ${basename}: running`);
  }

  return lines.join("\n");
}

// ─── Orchestrator ───────────────────────────────────────────

/**
 * Options for running the check subsystem.
 * 逆向: OFR (1439_unknown_OFR.js) — normalizes review options
 */
export interface CheckRunnerOptions {
  /** Diff description for git commands */
  diffDescription: string;
  /** Specific files to scope checks to */
  targetFiles?: string[];
  /** Directory to scope check discovery to */
  checkScope?: string;
  /** Filter checks by name */
  checkFilter?: string[];
  /** Only run checks, skip main review */
  checksOnly?: boolean;
  /** Only output summary */
  summaryOnly?: boolean;
  /** Working directory */
  workingDir: string;
  /** User config directory for global checks */
  userConfigDir?: string;
}

/**
 * Normalize raw option values into typed CheckRunnerOptions.
 * 逆向: OFR (1439_unknown_OFR.js)
 */
export function normalizeCheckOptions(raw: Record<string, unknown>): Partial<CheckRunnerOptions> {
  return {
    checkScope: typeof raw.checkScope === "string" ? raw.checkScope : undefined,
    checkFilter: normalizeStringArray(raw.checkFilter),
    checksOnly: raw.checksOnly === true,
    summaryOnly: raw.summaryOnly === true,
  };
}

/**
 * Normalize a value to string array (or undefined).
 * 逆向: WuT (1438_unknown_WuT.js)
 *
 * Handles: string[], JSON string of array, undefined/null
 */
export function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v: unknown) => typeof v === "string");
    } catch {
      // Not JSON, ignore
    }
  }
  return undefined;
}

/**
 * Run check discovery and return checks ready for execution.
 * 逆向: fFR (1436_unknown_fFR.js) — first half: discovery + filtering
 *
 * This is the synchronous discovery phase. Actual check execution (which
 * requires an LLM) is handled separately by the caller.
 *
 * @param options - Check runner options
 * @returns Filtered checks ready for execution, or empty array
 */
export function discoverAndFilterChecks(options: CheckRunnerOptions): CheckDefinition[] {
  const scope = options.checkScope ? path.resolve(options.checkScope) : options.workingDir;

  const targetFiles = options.targetFiles ?? [];
  const stopDirs = [scope];

  // When no target files are provided, discover directly from the scope root.
  // 逆向: fFR (1436_unknown_fFR.js:3-7) — amp's xFR always provides files from git;
  // but when called without files (e.g., --checks-only with no --files), we still
  // need to discover checks from the workspace tree.
  let allChecks: CheckDefinition[];
  if (targetFiles.length === 0) {
    allChecks = discoverChecksFromTree(scope, stopDirs, options.userConfigDir ?? null);
  } else {
    const result = discoverChecks(targetFiles, scope, stopDirs, options.userConfigDir ?? null);
    allChecks = result.allChecks;
  }

  return filterChecks(allChecks, options.checkFilter);
}

/**
 * Build initial check run map with all checks in "in-progress" state.
 * 逆向: fFR (1436_unknown_fFR.js:14-20) — builds initial status map
 *
 * @param checks - Checks to run
 * @returns Map of check URI to initial CheckRunEntry
 */
export function buildInitialCheckRunMap(checks: CheckDefinition[]): Record<string, CheckRunEntry> {
  const map: Record<string, CheckRunEntry> = {};
  for (const check of checks) {
    map[check.uri] = {
      check,
      status: { status: "in-progress", turns: [] },
    };
  }
  return map;
}

/**
 * Merge check results into the orchestrator output format.
 * 逆向: dFR (1440_unknown_dFR.js) — combines main review + check results
 *
 * @param mainReviewText - Text from main review agent (null if checksOnly)
 * @param checkRuns - Check run results
 * @param workingDir - Working directory
 * @param checksOnly - Whether only checks were run
 * @returns Merged review output
 */
export function mergeReviewResults(
  mainReviewText: string | null,
  checkRuns: Record<string, CheckRunEntry>,
  _workingDir: string,
  checksOnly: boolean,
): {
  comments: ReviewComment[];
  checks: Record<string, CheckRunEntry>;
  mainReviewText: string | null;
} {
  const checkComments = checkResultsToComments(checkRuns);

  if (checksOnly) {
    return {
      comments: checkComments,
      checks: checkRuns,
      mainReviewText: null,
    };
  }

  // Main review comments are displayed as-is (text format),
  // check comments are structured
  return {
    comments: checkComments,
    checks: checkRuns,
    mainReviewText,
  };
}
