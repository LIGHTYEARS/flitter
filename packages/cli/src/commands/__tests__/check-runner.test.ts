/**
 * Check runner subsystem tests
 *
 * Tests for check file discovery, filtering, result parsing,
 * system prompt building, and output formatting.
 *
 * 逆向: Tests match amp's check runner architecture:
 *   - pFR/uFR/mFR: check discovery
 *   - fFR: check filtering
 *   - yFR: system prompt
 *   - MFR: result parsing
 *   - jIT: result-to-comment mapping
 *   - _40/b40: formatting
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  buildCheckSystemPrompt,
  buildInitialCheckRunMap,
  type CheckDefinition,
  type CheckRunEntry,
  checkResultsToComments,
  discoverAndFilterChecks,
  discoverChecks,
  discoverChecksFromTree,
  extractXmlTag,
  filterChecks,
  formatCheckSummary,
  formatReviewComments,
  mergeReviewResults,
  normalizeCheckOptions,
  normalizeStringArray,
  parseCheckFrontmatter,
  parseCheckResult,
  readChecksFromDir,
} from "../check-runner";

// ─── Helpers ────────────────────────────────────────────────

let tmpDir: string;

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "flitter-check-test-"));
}

function writeCheckFile(dir: string, filename: string, content: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

const SAMPLE_CHECK_MD = `---
name: no-console
description: Check for console.log statements
severity-default: medium
---
Look for console.log, console.warn, console.error statements in production code.
These should be replaced with proper logging.
`;

const SAMPLE_CHECK_WITH_TOOLS = `---
name: security-check
description: Check for security issues
severity-default: high
tools:
  - bash
  - grep
---
Check for hardcoded secrets, SQL injection, and XSS vulnerabilities.
`;

const SAMPLE_CHECK_NO_FRONTMATTER = `Just a check body without any frontmatter.

Look for TODO comments.
`;

beforeEach(() => {
  tmpDir = createTmpDir();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── 1. Frontmatter Parsing ────────────────────────────────

describe("parseCheckFrontmatter", () => {
  it("should parse frontmatter with all fields", () => {
    const { frontmatter, body } = parseCheckFrontmatter(SAMPLE_CHECK_MD);

    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.name).toBe("no-console");
    expect(frontmatter!.description).toBe("Check for console.log statements");
    expect(frontmatter!["severity-default"]).toBe("medium");
    expect(body).toContain("console.log");
  });

  it("should parse frontmatter with tools array", () => {
    const { frontmatter } = parseCheckFrontmatter(SAMPLE_CHECK_WITH_TOOLS);

    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.name).toBe("security-check");
    expect(frontmatter!.tools).toEqual(["bash", "grep"]);
    expect(frontmatter!["severity-default"]).toBe("high");
  });

  it("should return null frontmatter when no frontmatter present", () => {
    const { frontmatter, body } = parseCheckFrontmatter(SAMPLE_CHECK_NO_FRONTMATTER);

    expect(frontmatter).toBeNull();
    expect(body).toContain("TODO comments");
  });

  it("should use 'unknown' as default name when not in frontmatter", () => {
    const content = `---
description: No name field
---
Body text.
`;
    const { frontmatter } = parseCheckFrontmatter(content);

    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.name).toBe("unknown");
  });
});

// ─── 2. Check File Discovery ────────────────────────────────

describe("readChecksFromDir", () => {
  it("should read .md check files from a directory", () => {
    const checksDir = path.join(tmpDir, ".agents", "checks");
    writeCheckFile(checksDir, "no-console.md", SAMPLE_CHECK_MD);
    writeCheckFile(checksDir, "security.md", SAMPLE_CHECK_WITH_TOOLS);

    const checks = readChecksFromDir(checksDir, "dir:/test");

    expect(checks).toHaveLength(2);
    expect(checks.map((c) => c.name).sort()).toEqual(["no-console", "security-check"]);
  });

  it("should skip non-.md files", () => {
    const checksDir = path.join(tmpDir, ".agents", "checks");
    writeCheckFile(checksDir, "no-console.md", SAMPLE_CHECK_MD);
    writeCheckFile(checksDir, "readme.txt", "Not a check file");
    writeCheckFile(checksDir, "config.json", "{}");

    const checks = readChecksFromDir(checksDir, "test");

    expect(checks).toHaveLength(1);
    expect(checks[0]!.name).toBe("no-console");
  });

  it("should return empty array for non-existent directory", () => {
    const checks = readChecksFromDir("/nonexistent/path", "test");
    expect(checks).toHaveLength(0);
  });

  it("should use filename as name when frontmatter has no name", () => {
    const checksDir = path.join(tmpDir, "checks");
    writeCheckFile(checksDir, "todo-check.md", SAMPLE_CHECK_NO_FRONTMATTER);

    const checks = readChecksFromDir(checksDir, "test");

    expect(checks).toHaveLength(1);
    expect(checks[0]!.name).toBe("todo-check");
  });
});

describe("discoverChecksFromTree", () => {
  it("should discover checks from .agents/checks/ directory", () => {
    const projectDir = path.join(tmpDir, "project");
    const checksDir = path.join(projectDir, ".agents", "checks");
    writeCheckFile(checksDir, "check1.md", SAMPLE_CHECK_MD);

    const checks = discoverChecksFromTree(projectDir, [projectDir]);

    expect(checks).toHaveLength(1);
    expect(checks[0]!.name).toBe("no-console");
  });

  it("should discover checks from .flitter/checks/ directory", () => {
    const projectDir = path.join(tmpDir, "project");
    const checksDir = path.join(projectDir, ".flitter", "checks");
    writeCheckFile(checksDir, "my-check.md", SAMPLE_CHECK_WITH_TOOLS);

    const checks = discoverChecksFromTree(projectDir, [projectDir]);

    expect(checks).toHaveLength(1);
    expect(checks[0]!.name).toBe("security-check");
  });

  it("should deduplicate checks by name across directories", () => {
    const projectDir = path.join(tmpDir, "project");
    // Same check name in both .agents and .flitter dirs
    writeCheckFile(path.join(projectDir, ".agents", "checks"), "dup.md", SAMPLE_CHECK_MD);
    writeCheckFile(path.join(projectDir, ".flitter", "checks"), "dup.md", SAMPLE_CHECK_MD);

    const checks = discoverChecksFromTree(projectDir, [projectDir]);

    // First one found wins (by name), so only 1 unique
    expect(checks).toHaveLength(1);
  });

  it("should discover global checks from user config dir", () => {
    const projectDir = path.join(tmpDir, "project");
    fs.mkdirSync(projectDir, { recursive: true });

    const globalDir = path.join(tmpDir, "config");
    writeCheckFile(path.join(globalDir, "amp", "checks"), "global-check.md", SAMPLE_CHECK_MD);

    const checks = discoverChecksFromTree(projectDir, [projectDir], globalDir);

    expect(checks).toHaveLength(1);
    expect(checks[0]!.scope).toBe("global");
  });
});

// ─── 3. Check Filtering ────────────────────────────────────

describe("filterChecks", () => {
  const checks: CheckDefinition[] = [
    {
      uri: "/a.md",
      name: "check-a",
      scope: "dir",
      frontmatter: { name: "check-a" },
      content: "A",
    },
    {
      uri: "/b.md",
      name: "check-b",
      scope: "dir",
      frontmatter: { name: "check-b" },
      content: "B",
    },
    {
      uri: "/c.md",
      name: "check-c",
      scope: "dir",
      frontmatter: { name: "check-c" },
      content: "C",
    },
  ];

  it("should return all checks when filter is undefined", () => {
    const result = filterChecks(checks, undefined);
    expect(result).toHaveLength(3);
  });

  it("should return all checks when filter is empty array", () => {
    const result = filterChecks(checks, []);
    expect(result).toHaveLength(3);
  });

  it("should filter checks by exact name match", () => {
    const result = filterChecks(checks, ["check-a", "check-c"]);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(["check-a", "check-c"]);
  });

  it("should return empty array when no names match", () => {
    const result = filterChecks(checks, ["nonexistent"]);
    expect(result).toHaveLength(0);
  });
});

// ─── 4. XML Tag Extraction ─────────────────────────────────

describe("extractXmlTag", () => {
  it("should extract content between tags", () => {
    const result = extractXmlTag("<foo>bar</foo>", "foo");
    expect(result).toBe("bar");
  });

  it("should return null when tag not found", () => {
    const result = extractXmlTag("<foo>bar</foo>", "baz");
    expect(result).toBeNull();
  });

  it("should decode HTML entities", () => {
    const result = extractXmlTag("<code>&lt;div&gt;</code>", "code");
    expect(result).toBe("<div>");
  });

  it("should handle nested content", () => {
    const result = extractXmlTag("<issues><issue>problem</issue></issues>", "issues");
    expect(result).toBe("<issue>problem</issue>");
  });
});

// ─── 5. Check Result Parsing ────────────────────────────────

describe("parseCheckResult", () => {
  const mockCheck: CheckDefinition = {
    uri: "/checks/test.md",
    name: "test-check",
    scope: "dir",
    frontmatter: { name: "test-check" },
    content: "test",
  };

  it("should parse a complete checkResult block", () => {
    const output = `Some preamble text.

<checkResult>
<checkName>test-check</checkName>
<status>completed</status>
<filesAnalyzed>3</filesAnalyzed>
<linesAnalyzed>42</linesAnalyzed>
<patternsChecked>
<pattern>Console log usage</pattern>
<pattern>Debug statements</pattern>
</patternsChecked>
<issues>
<issue severity="medium" file="src/foo.ts" line="10">
<problem>console.log(): Debug statement left in production code</problem>
<why>Console statements impact performance and leak internal info</why>
<fix>Remove or replace with structured logging</fix>
</issue>
</issues>
</checkResult>`;

    const result = parseCheckResult(mockCheck, output, "/workspace");

    expect(result.result.status).toBe("completed");
    expect(result.result.filesAnalyzed).toBe(3);
    expect(result.result.linesAnalyzed).toBe(42);
    expect(result.result.patternsChecked).toHaveLength(2);
    expect(result.result.issuesFound).toBe(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.severity).toBe("medium");
    expect(result.issues[0]!.file).toBe("/workspace/src/foo.ts");
    expect(result.issues[0]!.line).toBe(10);
    expect(result.issues[0]!.problem).toContain("console.log()");
    expect(result.issues[0]!.why).toContain("performance");
    expect(result.issues[0]!.fix).toContain("structured logging");
  });

  it("should return error when no checkResult block found", () => {
    const result = parseCheckResult(mockCheck, "No XML here", "/workspace");

    expect(result.result.status).toBe("error");
    expect(result.result.errorMessage).toBe("No checkResult block found in agent output");
    expect(result.issues).toHaveLength(0);
  });

  it("should handle empty issues block", () => {
    const output = `<checkResult>
<checkName>test-check</checkName>
<status>completed</status>
<filesAnalyzed>5</filesAnalyzed>
<linesAnalyzed>100</linesAnalyzed>
<patternsChecked>
<pattern>Test pattern</pattern>
</patternsChecked>
<issues>
</issues>
</checkResult>`;

    const result = parseCheckResult(mockCheck, output, "/workspace");

    expect(result.result.status).toBe("completed");
    expect(result.result.issuesFound).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve relative file paths to absolute", () => {
    const output = `<checkResult>
<status>completed</status>
<filesAnalyzed>1</filesAnalyzed>
<linesAnalyzed>10</linesAnalyzed>
<issues>
<issue severity="high" file="src/utils.ts" line="5">
<problem>Bug found</problem>
</issue>
</issues>
</checkResult>`;

    const result = parseCheckResult(mockCheck, output, "/my/project");

    expect(result.issues[0]!.file).toBe("/my/project/src/utils.ts");
  });

  it("should keep absolute file paths unchanged", () => {
    const output = `<checkResult>
<status>completed</status>
<filesAnalyzed>1</filesAnalyzed>
<linesAnalyzed>10</linesAnalyzed>
<issues>
<issue severity="high" file="/absolute/path/file.ts" line="5">
<problem>Bug found</problem>
</issue>
</issues>
</checkResult>`;

    const result = parseCheckResult(mockCheck, output, "/my/project");

    expect(result.issues[0]!.file).toBe("/absolute/path/file.ts");
  });
});

// ─── 6. Check System Prompt ────────────────────────────────

describe("buildCheckSystemPrompt", () => {
  const check: CheckDefinition = {
    uri: "/checks/test.md",
    name: "security-check",
    scope: "dir",
    frontmatter: { name: "security-check", "severity-default": "high" },
    content: "Check for SQL injection vulnerabilities.",
  };

  it("should include check name and content", () => {
    const prompt = buildCheckSystemPrompt(check, ["src/api.ts"], "git diff HEAD", "/workspace");

    expect(prompt).toContain("# security-check Check");
    expect(prompt).toContain("SQL injection");
  });

  it("should include file list", () => {
    const prompt = buildCheckSystemPrompt(check, ["src/a.ts", "src/b.ts"], null, "/workspace");

    expect(prompt).toContain("src/a.ts");
    expect(prompt).toContain("src/b.ts");
  });

  it("should include diff description", () => {
    const prompt = buildCheckSystemPrompt(check, [], "git diff main..HEAD", null);

    expect(prompt).toContain("git diff main..HEAD");
  });

  it("should use severity-default from frontmatter", () => {
    const prompt = buildCheckSystemPrompt(check, [], null, null);

    expect(prompt).toContain('severity="high"');
    expect(prompt).toContain("default: high");
  });

  it("should default severity to medium when not specified", () => {
    const noSeverityCheck: CheckDefinition = {
      ...check,
      frontmatter: { name: "test" },
    };

    const prompt = buildCheckSystemPrompt(noSeverityCheck, [], null, null);

    expect(prompt).toContain('severity="medium"');
    expect(prompt).toContain("default: medium");
  });

  it("should include checkResult XML template", () => {
    const prompt = buildCheckSystemPrompt(check, [], null, null);

    expect(prompt).toContain("<checkResult>");
    expect(prompt).toContain("<checkName>security-check</checkName>");
    expect(prompt).toContain("</checkResult>");
  });
});

// ─── 7. Results to Comments ────────────────────────────────

describe("checkResultsToComments", () => {
  it("should convert done check results to review comments", () => {
    const checkRuns: Record<string, CheckRunEntry> = {
      "/checks/a.md": {
        check: {
          uri: "/checks/a.md",
          name: "check-a",
          scope: "dir",
          frontmatter: { name: "check-a" },
          content: "",
        },
        status: {
          status: "done",
          result: {
            check: {
              uri: "/checks/a.md",
              name: "check-a",
              scope: "dir",
              frontmatter: { name: "check-a" },
              content: "",
            },
            result: {
              name: "check-a",
              status: "completed",
              issuesFound: 1,
            },
            issues: [
              {
                check: "check-a",
                severity: "high",
                file: "/workspace/src/api.ts",
                line: 42,
                problem: "SQL injection risk",
                why: "User input not sanitized",
                fix: "Use parameterized queries",
                source: "check-a",
              },
            ],
          },
        },
      },
    };

    const comments = checkResultsToComments(checkRuns);

    expect(comments).toHaveLength(1);
    expect(comments[0]!.filename).toBe("/workspace/src/api.ts");
    expect(comments[0]!.startLine).toBe(42);
    expect(comments[0]!.severity).toBe("high");
    expect(comments[0]!.text).toBe("SQL injection risk");
    expect(comments[0]!.source).toBe("check-a");
  });

  it("should skip non-done check results", () => {
    const checkRuns: Record<string, CheckRunEntry> = {
      "/checks/a.md": {
        check: {
          uri: "/checks/a.md",
          name: "check-a",
          scope: "dir",
          frontmatter: { name: "check-a" },
          content: "",
        },
        status: { status: "in-progress", turns: [] },
      },
      "/checks/b.md": {
        check: {
          uri: "/checks/b.md",
          name: "check-b",
          scope: "dir",
          frontmatter: { name: "check-b" },
          content: "",
        },
        status: { status: "error", error: "timeout" },
      },
    };

    const comments = checkResultsToComments(checkRuns);
    expect(comments).toHaveLength(0);
  });
});

// ─── 8. Formatting ─────────────────────────────────────────

describe("formatReviewComments", () => {
  it("should return 'No issues found.' when empty", () => {
    expect(formatReviewComments([], "/workspace")).toBe("No issues found.");
  });

  it("should group comments by file", () => {
    const comments = [
      {
        filename: "/workspace/src/a.ts",
        startLine: 10,
        endLine: 10,
        text: "Issue in a",
        severity: "high",
        source: "check-1",
      },
      {
        filename: "/workspace/src/b.ts",
        startLine: 20,
        endLine: 20,
        text: "Issue in b",
        severity: "medium",
        source: "check-1",
      },
    ];

    const output = formatReviewComments(comments, "/workspace");

    expect(output).toContain("* src/a.ts");
    expect(output).toContain("* src/b.ts");
    expect(output).toContain("@L10");
    expect(output).toContain("@L20");
  });
});

describe("formatCheckSummary", () => {
  it("should return 'No checks were run.' when empty", () => {
    expect(formatCheckSummary({})).toBe("No checks were run.");
  });

  it("should format completed checks with issue counts", () => {
    const checkRuns: Record<string, CheckRunEntry> = {
      "/checks/a.md": {
        check: {
          uri: "/checks/a.md",
          name: "check-a",
          scope: "dir",
          frontmatter: { name: "check-a" },
          content: "",
        },
        status: {
          status: "done",
          result: {
            check: {
              uri: "/checks/a.md",
              name: "check-a",
              scope: "dir",
              frontmatter: { name: "check-a" },
              content: "",
            },
            result: {
              name: "check-a",
              status: "completed",
              issuesFound: 2,
            },
            issues: [
              {
                check: "check-a",
                severity: "high",
                file: "a.ts",
                problem: "p1",
                source: "check-a",
              },
              {
                check: "check-a",
                severity: "medium",
                file: "a.ts",
                problem: "p2",
                source: "check-a",
              },
            ],
          },
        },
      },
    };

    const output = formatCheckSummary(checkRuns);

    expect(output).toContain("check-a");
    expect(output).toContain("issues found");
    expect(output).toContain("2 issues");
  });

  it("should format error checks", () => {
    const checkRuns: Record<string, CheckRunEntry> = {
      "/checks/broken.md": {
        check: {
          uri: "/checks/broken.md",
          name: "broken",
          scope: "dir",
          frontmatter: { name: "broken" },
          content: "",
        },
        status: { status: "error", error: "timeout" },
      },
    };

    const output = formatCheckSummary(checkRuns);

    expect(output).toContain("broken");
    expect(output).toContain("error");
    expect(output).toContain("timeout");
  });
});

// ─── 9. normalizeStringArray ────────────────────────────────

describe("normalizeStringArray", () => {
  it("should return undefined for null/undefined", () => {
    expect(normalizeStringArray(null)).toBeUndefined();
    expect(normalizeStringArray(undefined)).toBeUndefined();
  });

  it("should pass through string arrays", () => {
    expect(normalizeStringArray(["a", "b"])).toEqual(["a", "b"]);
  });

  it("should filter non-strings from arrays", () => {
    expect(normalizeStringArray(["a", 42, "b", true])).toEqual(["a", "b"]);
  });

  it("should parse JSON string arrays", () => {
    expect(normalizeStringArray('["x", "y"]')).toEqual(["x", "y"]);
  });

  it("should return undefined for non-array JSON strings", () => {
    expect(normalizeStringArray('"hello"')).toBeUndefined();
  });
});

// ─── 10. normalizeCheckOptions ──────────────────────────────

describe("normalizeCheckOptions", () => {
  it("should normalize valid options", () => {
    const result = normalizeCheckOptions({
      checkScope: "/some/dir",
      checkFilter: ["check-a", "check-b"],
      checksOnly: true,
      summaryOnly: false,
    });

    expect(result.checkScope).toBe("/some/dir");
    expect(result.checkFilter).toEqual(["check-a", "check-b"]);
    expect(result.checksOnly).toBe(true);
    expect(result.summaryOnly).toBe(false);
  });

  it("should return undefined for non-string checkScope", () => {
    const result = normalizeCheckOptions({ checkScope: 42 });
    expect(result.checkScope).toBeUndefined();
  });

  it("should return false for non-boolean checksOnly", () => {
    const result = normalizeCheckOptions({ checksOnly: "yes" });
    expect(result.checksOnly).toBe(false);
  });
});

// ─── 11. mergeReviewResults ─────────────────────────────────

describe("mergeReviewResults", () => {
  const emptyCheckRuns: Record<string, CheckRunEntry> = {};

  it("should return mainReviewText=null when checksOnly", () => {
    const result = mergeReviewResults("some review", emptyCheckRuns, "/workspace", true);
    expect(result.mainReviewText).toBeNull();
  });

  it("should include mainReviewText when not checksOnly", () => {
    const result = mergeReviewResults("some review", emptyCheckRuns, "/workspace", false);
    expect(result.mainReviewText).toBe("some review");
  });

  it("should include check comments in merged output", () => {
    const checkRuns: Record<string, CheckRunEntry> = {
      "/checks/a.md": {
        check: {
          uri: "/checks/a.md",
          name: "check-a",
          scope: "dir",
          frontmatter: { name: "check-a" },
          content: "",
        },
        status: {
          status: "done",
          result: {
            check: {
              uri: "/checks/a.md",
              name: "check-a",
              scope: "dir",
              frontmatter: { name: "check-a" },
              content: "",
            },
            result: { name: "check-a", status: "completed", issuesFound: 1 },
            issues: [
              {
                check: "check-a",
                severity: "high",
                file: "file.ts",
                problem: "issue",
                source: "check-a",
              },
            ],
          },
        },
      },
    };

    const result = mergeReviewResults(null, checkRuns, "/workspace", true);
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]!.text).toBe("issue");
  });
});

// ─── 12. discoverChecks (full integration) ──────────────────

describe("discoverChecks", () => {
  it("should discover checks and group by file", () => {
    const projectDir = path.join(tmpDir, "project");
    const checksDir = path.join(projectDir, ".flitter", "checks");
    writeCheckFile(checksDir, "check1.md", SAMPLE_CHECK_MD);

    const result = discoverChecks(["src/a.ts", "src/b.ts"], projectDir, [projectDir], null);

    expect(result.allChecks).toHaveLength(1);
    expect(result.checksPerFile.get("src/a.ts")).toBeDefined();
    expect(result.checksPerFile.get("src/b.ts")).toBeDefined();
  });

  it("should return empty when no checks exist", () => {
    const projectDir = path.join(tmpDir, "empty-project");
    fs.mkdirSync(projectDir, { recursive: true });

    const result = discoverChecks(["src/a.ts"], projectDir, [projectDir], null);

    expect(result.allChecks).toHaveLength(0);
  });
});

// ─── 13. buildInitialCheckRunMap ────────────────────────────

describe("buildInitialCheckRunMap", () => {
  it("should create map with all checks in in-progress state", () => {
    const checks: CheckDefinition[] = [
      {
        uri: "/a.md",
        name: "a",
        scope: "dir",
        frontmatter: { name: "a" },
        content: "",
      },
      {
        uri: "/b.md",
        name: "b",
        scope: "dir",
        frontmatter: { name: "b" },
        content: "",
      },
    ];

    const map = buildInitialCheckRunMap(checks);

    expect(Object.keys(map)).toHaveLength(2);
    expect(map["/a.md"]!.status.status).toBe("in-progress");
    expect(map["/b.md"]!.status.status).toBe("in-progress");
  });
});

// ─── 14. discoverAndFilterChecks ────────────────────────────

describe("discoverAndFilterChecks", () => {
  it("should discover and filter checks in one step", () => {
    const projectDir = path.join(tmpDir, "project");
    const checksDir = path.join(projectDir, ".agents", "checks");
    writeCheckFile(checksDir, "a.md", SAMPLE_CHECK_MD);
    writeCheckFile(checksDir, "b.md", SAMPLE_CHECK_WITH_TOOLS);

    // Without filter — get both
    const all = discoverAndFilterChecks({
      diffDescription: "test",
      workingDir: projectDir,
    });
    expect(all).toHaveLength(2);

    // With filter — get only one
    const filtered = discoverAndFilterChecks({
      diffDescription: "test",
      workingDir: projectDir,
      checkFilter: ["no-console"],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.name).toBe("no-console");
  });

  it("should use checkScope to override discovery root", () => {
    const projectDir = path.join(tmpDir, "project");
    const subDir = path.join(projectDir, "sub");
    const checksDir = path.join(subDir, ".flitter", "checks");
    writeCheckFile(checksDir, "sub-check.md", SAMPLE_CHECK_MD);

    // Without scope — search from project root, won't find sub checks
    // (because discoverChecksFromTree walks UP, not down)
    const _noScope = discoverAndFilterChecks({
      diffDescription: "test",
      workingDir: projectDir,
    });

    // With scope pointing to sub — will find the checks
    const withScope = discoverAndFilterChecks({
      diffDescription: "test",
      workingDir: projectDir,
      checkScope: subDir,
    });

    expect(withScope).toHaveLength(1);
    expect(withScope[0]!.name).toBe("no-console");
  });
});
