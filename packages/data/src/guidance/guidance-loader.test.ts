/**
 * Tests for Guidance file loader — parseFrontmatter, matchGlobs,
 * extractAtReferences, isRootDirectory, discoverGuidanceFiles.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseFrontmatter,
  matchGlobs,
  extractAtReferences,
  isRootDirectory,
  discoverGuidanceFiles,
} from "./guidance-loader";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-guidance-"));
});

afterEach(async () => {
  for (let i = 0; i < 5; i++) {
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe("parseFrontmatter", () => {
  it("should parse valid frontmatter with globs", () => {
    const input = `---
globs:
  - "*.ts"
  - "*.js"
---
Project guidance content`;

    const { frontMatter, content } = parseFrontmatter(input);
    assert.ok(frontMatter);
    assert.deepEqual(frontMatter.globs, ["*.ts", "*.js"]);
    assert.equal(content, "Project guidance content");
  });

  it("should return null frontmatter when no frontmatter present", () => {
    const input = "Just some content\nwith no frontmatter";
    const { frontMatter, content } = parseFrontmatter(input);
    assert.equal(frontMatter, null);
    assert.equal(content, "Just some content\nwith no frontmatter");
  });

  it("should return null frontmatter on invalid YAML", () => {
    const input = `---
: this is not valid yaml [[[
---
Some content`;

    const { frontMatter, content } = parseFrontmatter(input);
    assert.equal(frontMatter, null);
    // Content should be trimmed original
    assert.ok(content.includes("Some content"));
  });

  it("should parse single-value globs as string converted to array", () => {
    const input = `---
globs: "*.ts"
---
Content`;

    const { frontMatter, content } = parseFrontmatter(input);
    assert.ok(frontMatter);
    assert.deepEqual(frontMatter.globs, ["*.ts"]);
    assert.equal(content, "Content");
  });

  it("should parse boolean and number values", () => {
    const input = `---
enabled: true
count: 42
---
Body`;

    const { frontMatter } = parseFrontmatter(input);
    assert.ok(frontMatter);
    assert.equal(frontMatter.enabled, true);
    assert.equal(frontMatter.count, 42);
  });
});

// ---------------------------------------------------------------------------
// matchGlobs
// ---------------------------------------------------------------------------

describe("matchGlobs", () => {
  it("should return true when no globs defined", () => {
    assert.equal(matchGlobs(null, ["file.ts"], "test.md"), true);
    assert.equal(matchGlobs({}, ["file.ts"], "test.md"), true);
    assert.equal(matchGlobs({ globs: [] }, ["file.ts"], "test.md"), true);
  });

  it("should return true when glob matches a readFile", () => {
    const fm = { globs: ["**/*.ts"] };
    assert.equal(matchGlobs(fm, ["src/index.ts"], "test.md"), true);
  });

  it("should return false when glob does not match any readFile", () => {
    const fm = { globs: ["**/*.py"] };
    assert.equal(matchGlobs(fm, ["src/index.ts", "lib/util.js"], "test.md"), false);
  });

  it("should return false when readFiles is empty and globs are defined", () => {
    const fm = { globs: ["**/*.ts"] };
    assert.equal(matchGlobs(fm, [], "test.md"), false);
  });

  it("should match simple extension globs", () => {
    const fm = { globs: ["*.ts"] };
    assert.equal(matchGlobs(fm, ["index.ts"], "test.md"), true);
    assert.equal(matchGlobs(fm, ["src/index.ts"], "test.md"), false); // no **/ prefix
  });

  it("should match brace expansion patterns", () => {
    const fm = { globs: ["**/*.{ts,js}"] };
    assert.equal(matchGlobs(fm, ["src/index.ts"], "test.md"), true);
    assert.equal(matchGlobs(fm, ["lib/util.js"], "test.md"), true);
    assert.equal(matchGlobs(fm, ["style.css"], "test.md"), false);
  });
});

// ---------------------------------------------------------------------------
// extractAtReferences
// ---------------------------------------------------------------------------

describe("extractAtReferences", () => {
  it("should extract simple @file references", () => {
    const refs = extractAtReferences("See @AGENTS.md for details");
    assert.deepEqual(refs, ["AGENTS.md"]);
  });

  it("should extract multiple references", () => {
    const refs = extractAtReferences("See @foo/bar.md and @baz/qux.ts");
    assert.deepEqual(refs, ["foo/bar.md", "baz/qux.ts"]);
  });

  it("should ignore references inside code blocks", () => {
    const content = "Normal @valid.md\n```\n@ignored.md\n```\nAfter `@also-ignored.md` end";
    const refs = extractAtReferences(content);
    assert.deepEqual(refs, ["valid.md"]);
  });

  it("should strip trailing punctuation from references", () => {
    const refs = extractAtReferences("Check @file.md, and @other.md.");
    assert.deepEqual(refs, ["file.md", "other.md"]);
  });

  it("should return empty array for no references", () => {
    const refs = extractAtReferences("No references here");
    assert.deepEqual(refs, []);
  });

  it("should handle glob-like references", () => {
    const refs = extractAtReferences("Pattern @**/*.ts applies");
    assert.deepEqual(refs, ["**/*.ts"]);
  });
});

// ---------------------------------------------------------------------------
// isRootDirectory
// ---------------------------------------------------------------------------

describe("isRootDirectory", () => {
  it('should return true for "/"', () => {
    assert.equal(isRootDirectory("/"), true);
  });

  it("should return false for normal directories", () => {
    assert.equal(isRootDirectory("/home/user"), false);
    assert.equal(isRootDirectory("/tmp/test"), false);
  });

  it("should return false for workspace-like paths", () => {
    assert.equal(isRootDirectory("/home/gem/workspace"), false);
  });
});

// ---------------------------------------------------------------------------
// discoverGuidanceFiles
// ---------------------------------------------------------------------------

describe("discoverGuidanceFiles", () => {
  it("should find AGENTS.md in workspace root", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });
    await fsp.writeFile(path.join(workspace, "AGENTS.md"), "Project guidance");

    const files = await discoverGuidanceFiles({ workspaceRoots: [workspace] });

    const projectFile = files.find((f) => f.uri === path.join(workspace, "AGENTS.md"));
    assert.ok(projectFile, "should find AGENTS.md");
    assert.equal(projectFile.type, "project");
    assert.equal(projectFile.content, "Project guidance");
  });

  it("should prefer AGENTS.md over CLAUDE.md in same directory", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });
    await fsp.writeFile(path.join(workspace, "AGENTS.md"), "Agents content");
    await fsp.writeFile(path.join(workspace, "CLAUDE.md"), "Claude content");

    const files = await discoverGuidanceFiles({ workspaceRoots: [workspace] });

    const fromWorkspace = files.filter(
      (f) => path.dirname(f.uri) === workspace,
    );
    assert.equal(fromWorkspace.length, 1, "only one file per directory");
    assert.ok(
      fromWorkspace[0].uri.endsWith("AGENTS.md"),
      "AGENTS.md preferred",
    );
  });

  it("should only load one file per directory (dedup)", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });
    await fsp.writeFile(path.join(workspace, "AGENTS.md"), "Agents");
    await fsp.writeFile(path.join(workspace, "CLAUDE.md"), "Claude");

    const files = await discoverGuidanceFiles({ workspaceRoots: [workspace] });

    const fromWorkspace = files.filter(
      (f) => path.dirname(f.uri) === workspace,
    );
    assert.equal(fromWorkspace.length, 1);
  });

  it("should classify types correctly: project, parent, user", async () => {
    // Create nested structure: parent/workspace/
    const parentDir = path.join(tmpDir, "parent");
    const workspace = path.join(parentDir, "workspace");
    const configDir = path.join(tmpDir, "config");

    await fsp.mkdir(workspace, { recursive: true });
    await fsp.mkdir(configDir, { recursive: true });

    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      "Project guidance",
    );
    await fsp.writeFile(path.join(parentDir, "CLAUDE.md"), "Parent guidance");
    await fsp.writeFile(path.join(configDir, "AGENTS.md"), "User guidance");

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
      userConfigDir: configDir,
    });

    const project = files.find(
      (f) => f.uri === path.join(workspace, "AGENTS.md"),
    );
    const parent = files.find(
      (f) => f.uri === path.join(parentDir, "CLAUDE.md"),
    );
    const user = files.find(
      (f) => f.uri === path.join(configDir, "AGENTS.md"),
    );

    assert.ok(project, "project file found");
    assert.equal(project.type, "project");

    assert.ok(parent, "parent file found");
    assert.equal(parent.type, "parent");

    assert.ok(user, "user file found");
    assert.equal(user.type, "user");
  });

  it("should walk up parent directories", async () => {
    const grandparent = path.join(tmpDir, "gp");
    const parentDir = path.join(grandparent, "parent");
    const workspace = path.join(parentDir, "workspace");

    await fsp.mkdir(workspace, { recursive: true });
    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      "Project",
    );
    await fsp.writeFile(
      path.join(grandparent, "CLAUDE.md"),
      "Grandparent",
    );

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
    });

    const grandparentFile = files.find(
      (f) => f.uri === path.join(grandparent, "CLAUDE.md"),
    );
    assert.ok(grandparentFile, "should find grandparent CLAUDE.md");
    assert.equal(grandparentFile.type, "parent");
  });

  it("should stop at filesystem root without error", async () => {
    // Use actual workspace root — this just verifies no infinite loop
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });
    await fsp.writeFile(path.join(workspace, "AGENTS.md"), "Content");

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
    });

    assert.ok(files.length >= 1, "found at least the workspace file");
  });

  it("should load @referenced files as mentioned type", async () => {
    const workspace = path.join(tmpDir, "workspace");
    const subDir = path.join(workspace, "sub");

    await fsp.mkdir(subDir, { recursive: true });
    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      "Main guidance @sub/AGENTS.md",
    );
    await fsp.writeFile(path.join(subDir, "AGENTS.md"), "Sub guidance");

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
    });

    const mentioned = files.find(
      (f) =>
        f.uri === path.join(workspace, "sub", "AGENTS.md") &&
        f.type === "mentioned",
    );
    assert.ok(mentioned, "referenced file loaded as mentioned");
    assert.equal(mentioned.content, "Sub guidance");
  });

  it("should prevent cycles in @references", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });

    // A references B, B references A
    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      "See @other.md",
    );
    await fsp.writeFile(
      path.join(workspace, "other.md"),
      "See @AGENTS.md",
    );

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
    });

    // Should not loop infinitely; both files appear at most once
    const uris = files.map((f) => f.uri);
    const uniqueUris = new Set(uris);
    assert.equal(uris.length, uniqueUris.size, "no duplicate URIs");
  });

  it("should truncate content exceeding maxBytesPerFile", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });

    const longContent = "A".repeat(1000);
    await fsp.writeFile(path.join(workspace, "AGENTS.md"), longContent);

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
      maxBytesPerFile: 100,
    });

    const file = files.find(
      (f) => f.uri === path.join(workspace, "AGENTS.md"),
    );
    assert.ok(file, "file found");
    assert.ok(
      Buffer.byteLength(file.content, "utf-8") <= 100,
      "content truncated to budget",
    );
  });

  it("should gracefully handle missing files", async () => {
    const workspace = path.join(tmpDir, "workspace-missing");
    await fsp.mkdir(workspace, { recursive: true });
    // No AGENTS.md or CLAUDE.md created

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
    });

    const fromWorkspace = files.filter(
      (f) => path.dirname(f.uri) === workspace,
    );
    assert.equal(fromWorkspace.length, 0, "no files from empty workspace");
  });

  it("should return empty array for empty workspace roots", async () => {
    const files = await discoverGuidanceFiles({ workspaceRoots: [] });
    assert.equal(files.length, 0);
  });

  it("should set exclude=true when globs do not match readFiles", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });

    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      `---
globs:
  - "*.py"
---
Python only guidance`,
    );

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
      readFiles: ["src/index.ts"],
    });

    const file = files.find(
      (f) => f.uri === path.join(workspace, "AGENTS.md"),
    );
    assert.ok(file, "file found");
    assert.equal(file.exclude, true, "excluded because glob does not match");
  });

  it("should set exclude=false when globs match readFiles", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });

    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      `---
globs:
  - "**/*.ts"
---
TypeScript guidance`,
    );

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
      readFiles: ["src/index.ts"],
    });

    const file = files.find(
      (f) => f.uri === path.join(workspace, "AGENTS.md"),
    );
    assert.ok(file, "file found");
    assert.equal(file.exclude, false, "not excluded because glob matches");
  });

  it("should set exclude=false when no frontmatter globs", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });

    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      "No frontmatter guidance",
    );

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
      readFiles: ["src/index.ts"],
    });

    const file = files.find(
      (f) => f.uri === path.join(workspace, "AGENTS.md"),
    );
    assert.ok(file, "file found");
    assert.equal(file.exclude, false, "not excluded when no globs");
  });

  it("should compute lineCount correctly", async () => {
    const workspace = path.join(tmpDir, "workspace");
    await fsp.mkdir(workspace, { recursive: true });

    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      "Line 1\nLine 2\nLine 3",
    );

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
    });

    const file = files.find(
      (f) => f.uri === path.join(workspace, "AGENTS.md"),
    );
    assert.ok(file);
    assert.equal(file.lineCount, 3);
  });

  it("should place mentioned files after their referrer in results", async () => {
    const workspace = path.join(tmpDir, "workspace");
    const subDir = path.join(workspace, "sub");
    await fsp.mkdir(subDir, { recursive: true });

    await fsp.writeFile(
      path.join(workspace, "AGENTS.md"),
      "Main @sub/referenced.md",
    );
    await fsp.writeFile(
      path.join(subDir, "referenced.md"),
      "Referenced content",
    );

    const files = await discoverGuidanceFiles({
      workspaceRoots: [workspace],
    });

    const mainIdx = files.findIndex(
      (f) => f.uri === path.join(workspace, "AGENTS.md"),
    );
    const refIdx = files.findIndex(
      (f) => f.uri === path.join(subDir, "referenced.md"),
    );

    assert.ok(mainIdx >= 0, "main file found");
    assert.ok(refIdx >= 0, "referenced file found");
    assert.ok(refIdx > mainIdx, "mentioned file after referrer");
  });
});
