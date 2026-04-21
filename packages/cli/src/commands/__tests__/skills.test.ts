/**
 * Tests for skill CLI command handlers
 *
 * Tests: handleSkillList, handleSkillInfo, handleSkillRemove, handleSkillAdd
 * Uses mock SkillService that returns canned scan/install/remove results.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SkillService } from "@flitter/data";
import { handleSkillAdd, handleSkillInfo, handleSkillList, handleSkillRemove } from "../skills";

// ─── Mock factory ──────────────────────────────────────────

function createMockSkillService(
  overrides: Partial<{
    scanResult: {
      skills: Array<{
        name: string;
        description: string;
        baseDir: string;
        frontmatter: Record<string, unknown>;
        body: string;
      }>;
      errors: Array<{ path: string; error: string }>;
      warnings: string[];
    };
    installResult: { success: boolean; skillName: string; installedPath: string; error?: string };
    removeResult: boolean;
  }> = {},
): SkillService {
  const defaultScan = { skills: [], errors: [], warnings: [] };
  const defaultInstall = {
    success: true,
    skillName: "test-skill",
    installedPath: "/tmp/skills/test-skill",
  };

  return {
    scan: async () => overrides.scanResult ?? defaultScan,
    install: async () => overrides.installResult ?? defaultInstall,
    remove: async () => overrides.removeResult ?? false,
    list: () => [],
    getDiscoveryPaths: () => ["/tmp/skills"],
    startWatching: () => ({ dispose: () => {} }),
    dispose: () => {},
  } as unknown as SkillService;
}

// ─── Capture stdout/stderr ──────────────────────────────────

function captureOutput(fn: () => Promise<void>): Promise<{ stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const origStdout = process.stdout.write;
  const origStderr = process.stderr.write;
  process.stdout.write = ((s: string) => {
    stdout += s;
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((s: string) => {
    stderr += s;
    return true;
  }) as typeof process.stderr.write;

  return fn()
    .then(() => {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
      return { stdout, stderr };
    })
    .catch((err) => {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
      throw err;
    });
}

// ─── handleSkillList tests ──────────────────────────────────

describe("handleSkillList", () => {
  it("should show 'no skills' message when empty", async () => {
    const svc = createMockSkillService();
    const { stdout } = await captureOutput(() => handleSkillList({ skillService: svc }, {}));
    assert.ok(stdout.includes("No skills available"));
  });

  it("should list skills with names and descriptions", async () => {
    const svc = createMockSkillService({
      scanResult: {
        skills: [
          {
            name: "my-skill",
            description: "Does things",
            baseDir: "/tmp/skills/my-skill",
            frontmatter: { name: "my-skill", description: "Does things" },
            body: "",
          },
        ],
        errors: [],
        warnings: [],
      },
    });
    const { stdout } = await captureOutput(() => handleSkillList({ skillService: svc }, {}));
    assert.ok(stdout.includes("my-skill"));
    assert.ok(stdout.includes("Does things"));
    assert.ok(stdout.includes("Available skills (1)"));
  });

  it("should show errors section when scan has errors", async () => {
    const svc = createMockSkillService({
      scanResult: {
        skills: [],
        errors: [{ path: "/tmp/skills/broken", error: "invalid frontmatter" }],
        warnings: [],
      },
    });
    const { stdout } = await captureOutput(() => handleSkillList({ skillService: svc }, {}));
    assert.ok(stdout.includes("Skipped skills with errors"));
    assert.ok(stdout.includes("invalid frontmatter"));
  });

  it("should output JSON when --json is set", async () => {
    const svc = createMockSkillService({
      scanResult: {
        skills: [
          {
            name: "a",
            description: "b",
            baseDir: "/c",
            frontmatter: { name: "a", description: "b" },
            body: "",
          },
        ],
        errors: [],
        warnings: [],
      },
    });
    const { stdout } = await captureOutput(() =>
      handleSkillList({ skillService: svc }, { json: true }),
    );
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.skills.length, 1);
    assert.equal(parsed.skills[0].name, "a");
  });
});

// ─── handleSkillInfo tests ──────────────────────────────────

describe("handleSkillInfo", () => {
  it("should show skill details", async () => {
    const svc = createMockSkillService({
      scanResult: {
        skills: [
          {
            name: "my-skill",
            description: "A great skill",
            baseDir: "/tmp/skills/my-skill",
            frontmatter: { name: "my-skill", description: "A great skill" },
            body: "# Hello",
          },
        ],
        errors: [],
        warnings: [],
      },
    });
    const { stdout } = await captureOutput(() =>
      handleSkillInfo({ skillService: svc }, "my-skill", {}),
    );
    assert.ok(stdout.includes("Skill: my-skill"));
    assert.ok(stdout.includes("Description: A great skill"));
    assert.ok(stdout.includes("Path: /tmp/skills/my-skill"));
  });

  it("should error when skill not found", async () => {
    const svc = createMockSkillService();
    const origExitCode = process.exitCode;
    const { stderr } = await captureOutput(() =>
      handleSkillInfo({ skillService: svc }, "nonexistent", {}),
    );
    assert.ok(stderr.includes("not found"));
    process.exitCode = origExitCode;
  });

  it("should output JSON when --json is set", async () => {
    const svc = createMockSkillService({
      scanResult: {
        skills: [
          {
            name: "my-skill",
            description: "desc",
            baseDir: "/path",
            frontmatter: { name: "my-skill", description: "desc" },
            body: "",
          },
        ],
        errors: [],
        warnings: [],
      },
    });
    const { stdout } = await captureOutput(() =>
      handleSkillInfo({ skillService: svc }, "my-skill", { json: true }),
    );
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.name, "my-skill");
    assert.equal(parsed.path, "/path");
  });
});

// ─── handleSkillRemove tests ────────────────────────────────

describe("handleSkillRemove", () => {
  it("should print success when skill removed", async () => {
    const svc = createMockSkillService({ removeResult: true });
    const { stdout } = await captureOutput(() =>
      handleSkillRemove({ skillService: svc }, "my-skill"),
    );
    assert.ok(stdout.includes("Removed my-skill"));
  });

  it("should error when skill not found", async () => {
    const svc = createMockSkillService({ removeResult: false });
    const origExitCode = process.exitCode;
    const { stderr } = await captureOutput(() =>
      handleSkillRemove({ skillService: svc }, "nonexistent"),
    );
    assert.ok(stderr.includes("not found"));
    process.exitCode = origExitCode;
  });
});

// ─── handleSkillAdd tests ───────────────────────────────────

describe("handleSkillAdd", () => {
  it("should print success on successful install", async () => {
    const svc = createMockSkillService({
      installResult: {
        success: true,
        skillName: "new-skill",
        installedPath: "/tmp/skills/new-skill",
      },
    });
    const { stdout } = await captureOutput(() =>
      handleSkillAdd({ skillService: svc }, "/source/path", {}),
    );
    assert.ok(stdout.includes("Installed new-skill"));
    assert.ok(stdout.includes("/tmp/skills/new-skill"));
  });

  it("should print error on failed install", async () => {
    const svc = createMockSkillService({
      installResult: {
        success: false,
        skillName: "dupe",
        installedPath: "/tmp/skills/dupe",
        error: 'Skill "dupe" already exists',
      },
    });
    const origExitCode = process.exitCode;
    const { stderr } = await captureOutput(() =>
      handleSkillAdd({ skillService: svc }, "/source/path", {}),
    );
    assert.ok(stderr.includes("already exists"));
    process.exitCode = origExitCode;
  });
});
