import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  loadSkill,
  parseSkillFrontmatter,
  scanSkillFiles,
  validateSkillName,
} from "./skill-parser.ts";
import { SkillService } from "./skill-service.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-skill-test-"));
  tmpDirs.push(dir);
  return dir;
}

function writeSkillMd(
  dir: string,
  opts: {
    name?: string;
    description?: string;
    body?: string;
    filename?: string;
    extra?: string;
  } = {},
): void {
  const filename = opts.filename ?? "SKILL.md";
  const name = opts.name ?? "test-skill";
  const description = opts.description ?? "A test skill";
  const body = opts.body ?? "This is the body.";
  const extra = opts.extra ?? "";
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, filename),
    `---\nname: ${name}\ndescription: ${description}\n${extra}---\n${body}\n`,
  );
}

afterEach(async () => {
  for (const dir of tmpDirs) {
    for (let i = 0; i < 5; i++) {
      try {
        await fsp.rm(dir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
  tmpDirs.length = 0;
});

// ---------------------------------------------------------------------------
// parseSkillFrontmatter
// ---------------------------------------------------------------------------

describe("parseSkillFrontmatter", () => {
  it("parses valid frontmatter with name, description, and body", () => {
    const content = "---\nname: my-skill\ndescription: Does things\n---\nBody text here.";
    const { frontmatter, body } = parseSkillFrontmatter(content);
    assert.equal(frontmatter.name, "my-skill");
    assert.equal(frontmatter.description, "Does things");
    assert.equal(body, "Body text here.");
  });

  it("throws when frontmatter delimiters are missing", () => {
    assert.throws(
      () => parseSkillFrontmatter("no frontmatter here"),
      /must contain YAML frontmatter/,
    );
  });

  it("throws when name field is missing", () => {
    const content = "---\ndescription: No name\n---\nBody";
    assert.throws(() => parseSkillFrontmatter(content), /name/);
  });

  it("throws when description field is missing", () => {
    const content = "---\nname: my-skill\n---\nBody";
    assert.throws(() => parseSkillFrontmatter(content), /description/);
  });
});

// ---------------------------------------------------------------------------
// validateSkillName
// ---------------------------------------------------------------------------

describe("validateSkillName", () => {
  it("accepts valid lowercase names with hyphens", () => {
    assert.doesNotThrow(() => validateSkillName("my-skill"));
    assert.doesNotThrow(() => validateSkillName("a"));
    assert.doesNotThrow(() => validateSkillName("skill123"));
    assert.doesNotThrow(() => validateSkillName("my-cool-skill"));
  });

  it("throws for uppercase characters", () => {
    assert.throws(() => validateSkillName("MySkill"), /Invalid skill name/);
  });

  it("throws for special characters", () => {
    assert.throws(() => validateSkillName("my_skill"), /Invalid skill name/);
    assert.throws(() => validateSkillName("my skill"), /Invalid skill name/);
  });

  it("throws for empty string", () => {
    assert.throws(() => validateSkillName(""), /must not be empty/);
  });

  it("throws for names longer than 64 characters", () => {
    const longName = "a".repeat(65);
    assert.throws(() => validateSkillName(longName), /at most 64 characters/);
  });

  it("throws for trailing hyphen", () => {
    assert.throws(() => validateSkillName("my-skill-"), /Invalid skill name/);
  });
});

// ---------------------------------------------------------------------------
// loadSkill
// ---------------------------------------------------------------------------

describe("loadSkill", () => {
  it("reads SKILL.md correctly from a directory", () => {
    const dir = makeTmpDir();
    const skillDir = path.join(dir, "my-skill");
    writeSkillMd(skillDir, { name: "my-skill", description: "Test" });

    const skill = loadSkill(skillDir);
    assert.equal(skill.name, "my-skill");
    assert.equal(skill.description, "Test");
    assert.equal(skill.baseDir, skillDir);
    assert.ok(skill.body.includes("This is the body."));
  });

  it("reads skill.md (lowercase) correctly", () => {
    const dir = makeTmpDir();
    const skillDir = path.join(dir, "lower-skill");
    writeSkillMd(skillDir, {
      name: "lower-skill",
      description: "Lower case",
      filename: "skill.md",
    });

    const skill = loadSkill(skillDir);
    assert.equal(skill.name, "lower-skill");
    assert.equal(skill.description, "Lower case");
  });

  it("throws when SKILL.md is missing", () => {
    const dir = makeTmpDir();
    assert.throws(() => loadSkill(dir), /No SKILL\.md found/);
  });
});

// ---------------------------------------------------------------------------
// scanSkillFiles
// ---------------------------------------------------------------------------

describe("scanSkillFiles", () => {
  it("scans files recursively", () => {
    const dir = makeTmpDir();
    const skillDir = path.join(dir, "scan-skill");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "content");
    fs.mkdirSync(path.join(skillDir, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(skillDir, "scripts", "run.sh"), "#!/bin/sh");

    const files = scanSkillFiles(skillDir);
    const paths = files.map((f) => f.path);
    assert.ok(paths.includes("SKILL.md"));
    assert.ok(paths.includes(path.join("scripts", "run.sh")));
  });

  it("skips hidden directories and files", () => {
    const dir = makeTmpDir();
    const skillDir = path.join(dir, "hidden-test");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "visible.txt"), "ok");
    fs.writeFileSync(path.join(skillDir, ".hidden"), "secret");
    fs.mkdirSync(path.join(skillDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(skillDir, ".git", "config"), "git");

    const files = scanSkillFiles(skillDir);
    const paths = files.map((f) => f.path);
    assert.ok(paths.includes("visible.txt"));
    assert.ok(!paths.includes(".hidden"));
    assert.ok(!paths.some((p) => p.includes(".git")));
  });

  it("skips node_modules", () => {
    const dir = makeTmpDir();
    const skillDir = path.join(dir, "nm-test");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "index.ts"), "ok");
    fs.mkdirSync(path.join(skillDir, "node_modules", "dep"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(skillDir, "node_modules", "dep", "lib.js"), "dep");

    const files = scanSkillFiles(skillDir);
    const paths = files.map((f) => f.path);
    assert.ok(paths.includes("index.ts"));
    assert.ok(!paths.some((p) => p.includes("node_modules")));
  });
});

// ---------------------------------------------------------------------------
// SkillService.scan
// ---------------------------------------------------------------------------

describe("SkillService.scan", () => {
  it("discovers skills from workspace and user config paths", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    const wsSkillDir = path.join(workspace, ".flitter", "skills", "alpha-skill");
    writeSkillMd(wsSkillDir, { name: "alpha-skill", description: "Alpha" });

    const ucSkillDir = path.join(userConfig, "skills", "beta-skill");
    writeSkillMd(ucSkillDir, { name: "beta-skill", description: "Beta" });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });
    const result = await service.scan();

    assert.equal(result.skills.length, 2);
    const names = result.skills.map((s) => s.name);
    assert.ok(names.includes("alpha-skill"));
    assert.ok(names.includes("beta-skill"));
  });

  it("project path overrides global path with same skill name", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    const wsSkillDir = path.join(workspace, ".flitter", "skills", "my-skill");
    writeSkillMd(wsSkillDir, {
      name: "my-skill",
      description: "Project version",
    });

    const ucSkillDir = path.join(userConfig, "skills", "my-skill");
    writeSkillMd(ucSkillDir, {
      name: "my-skill",
      description: "Global version",
    });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });
    const result = await service.scan();

    // Should only have one skill, the project version (discovered first)
    assert.equal(result.skills.length, 1);
    assert.equal(result.skills[0]!.description, "Project version");
    assert.ok(result.warnings.some((w) => w.includes("Duplicate") && w.includes("my-skill")));
  });
});

// ---------------------------------------------------------------------------
// SkillService.install
// ---------------------------------------------------------------------------

describe("SkillService.install", () => {
  it("installs a skill from a local path", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();
    const sourceDir = makeTmpDir();

    const srcSkillDir = path.join(sourceDir, "source-skill");
    writeSkillMd(srcSkillDir, {
      name: "installed-skill",
      description: "To be installed",
    });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });

    const result = await service.install(srcSkillDir);

    assert.equal(result.success, true);
    assert.equal(result.skillName, "installed-skill");
    assert.ok(fs.existsSync(path.join(result.installedPath, "SKILL.md")));
  });

  it("returns error for existing skill without overwrite", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();
    const sourceDir = makeTmpDir();

    const srcSkillDir = path.join(sourceDir, "source-skill");
    writeSkillMd(srcSkillDir, {
      name: "dup-skill",
      description: "First install",
    });

    // Pre-create the target
    const targetDir = path.join(workspace, ".flitter", "skills", "dup-skill");
    writeSkillMd(targetDir, {
      name: "dup-skill",
      description: "Already here",
    });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });

    const result = await service.install(srcSkillDir);

    assert.equal(result.success, false);
    assert.ok(result.error!.includes("already exists"));
  });

  it("overwrites existing skill when overwrite is true", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();
    const sourceDir = makeTmpDir();

    const srcSkillDir = path.join(sourceDir, "source-skill");
    writeSkillMd(srcSkillDir, {
      name: "overwrite-skill",
      description: "New version",
    });

    // Pre-create the target
    const targetDir = path.join(workspace, ".flitter", "skills", "overwrite-skill");
    writeSkillMd(targetDir, {
      name: "overwrite-skill",
      description: "Old version",
    });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });

    const result = await service.install(srcSkillDir, { overwrite: true });

    assert.equal(result.success, true);
    // Verify the content was replaced
    const installedContent = fs.readFileSync(path.join(result.installedPath, "SKILL.md"), "utf-8");
    assert.ok(installedContent.includes("New version"));
  });
});

// ---------------------------------------------------------------------------
// SkillService.remove
// ---------------------------------------------------------------------------

describe("SkillService.remove", () => {
  it("removes an installed skill and returns true", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    const skillDir = path.join(workspace, ".flitter", "skills", "remove-me");
    writeSkillMd(skillDir, { name: "remove-me", description: "Goodbye" });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });

    const removed = await service.remove("remove-me");
    assert.equal(removed, true);
    assert.equal(fs.existsSync(skillDir), false);
  });

  it("returns false for a nonexistent skill", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });

    const removed = await service.remove("nonexistent");
    assert.equal(removed, false);
  });
});

// ---------------------------------------------------------------------------
// SkillService.list
// ---------------------------------------------------------------------------

describe("SkillService.list", () => {
  it("returns frontmatters of all scanned skills", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    const skillDir = path.join(workspace, ".flitter", "skills", "list-skill");
    writeSkillMd(skillDir, { name: "list-skill", description: "Listed" });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });
    await service.scan();

    const frontmatters = service.list();
    assert.equal(frontmatters.length, 1);
    assert.equal(frontmatters[0]!.name, "list-skill");
    assert.equal(frontmatters[0]!.description, "Listed");
  });
});

// ---------------------------------------------------------------------------
// MCP server derivation
// ---------------------------------------------------------------------------

describe("MCP server derivation", () => {
  it("extracts mcpServers from skill frontmatter", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    const skillDir = path.join(workspace, ".flitter", "skills", "mcp-skill");
    writeSkillMd(skillDir, {
      name: "mcp-skill",
      description: "Has MCP servers",
      extra: "mcpServers:\n  my-server:\n    command: node\n    args:\n      - server.js\n",
    });

    const service = new SkillService({
      workspaceRoot: workspace,
      userConfigDir: userConfig,
    });
    await service.scan();

    const servers = service.mcpServersFromSkills.getValue();
    assert.ok("my-server" in servers);
    assert.equal(servers["my-server"]!.command, "node");
    assert.ok(Array.isArray(servers["my-server"]!.args));
    assert.equal(servers["my-server"]!.args![0], "server.js");
  });
});
