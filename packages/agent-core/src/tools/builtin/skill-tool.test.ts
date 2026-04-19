/**
 * SkillTool unit tests
 *
 * Covers: ToolSpec shape, successful skill load, skill not found,
 * argument substitution, argument append, files list, baseDir replacement.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Config } from "@flitter/schemas";
import type { ToolContext } from "../types";
import { createSkillTool, type SkillLike, type SkillServiceLike } from "./skill-tool";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as unknown as Config,
    ...overrides,
  };
}

function createMockSkillService(skills: SkillLike[]): SkillServiceLike {
  return {
    list: () => skills.map((s) => s.frontmatter),
    skills: {
      getValue: () => skills,
    },
  };
}

const testSkill: SkillLike = {
  name: "test-skill",
  description: "A test skill",
  baseDir: "/skills/test-skill",
  frontmatter: {
    name: "test-skill",
    description: "A test skill",
  },
  body: "This is the skill body.\nDo things correctly.",
  files: [
    { path: "scripts/run.sh", fullPath: "/skills/test-skill/scripts/run.sh" },
  ],
};

const argSkill: SkillLike = {
  name: "arg-skill",
  description: "A skill with arguments",
  baseDir: "/skills/arg-skill",
  frontmatter: {
    name: "arg-skill",
    description: "A skill with arguments",
  },
  body: "Run with: {{arguments}}",
  files: [],
};

const baseDirSkill: SkillLike = {
  name: "basedir-skill",
  description: "A skill referencing baseDir",
  baseDir: "/skills/basedir-skill",
  frontmatter: {
    name: "basedir-skill",
    description: "A skill referencing baseDir",
  },
  body: "Script at {baseDir}/scripts/run.sh",
  files: [],
};

describe("SkillTool", () => {
  // ─── ToolSpec shape ────────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    const tool = createSkillTool(createMockSkillService([]));
    assert.equal(tool.name, "Skill");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
    assert.equal(typeof tool.execute, "function");
    assert.ok(tool.description.includes("skill"));
  });

  // ─── Successful load ──────────────────────────────────────

  it("loads a skill and returns formatted content", async () => {
    const service = createMockSkillService([testSkill]);
    const tool = createSkillTool(service);

    const result = await tool.execute({ name: "test-skill" }, createMockContext());

    assert.equal(result.status, "done");
    assert.ok(result.content);
    assert.ok(result.content!.includes("<loaded_skill"));
    assert.ok(result.content!.includes("test-skill"));
    assert.ok(result.content!.includes("This is the skill body."));
    assert.ok(result.content!.includes("</loaded_skill>"));
  });

  it("includes skill files in output", async () => {
    const service = createMockSkillService([testSkill]);
    const tool = createSkillTool(service);

    const result = await tool.execute({ name: "test-skill" }, createMockContext());

    assert.ok(result.content!.includes("<skill_files>"));
    assert.ok(result.content!.includes("/skills/test-skill/scripts/run.sh"));
    assert.ok(result.content!.includes("</skill_files>"));
  });

  it("includes base directory reference", async () => {
    const service = createMockSkillService([testSkill]);
    const tool = createSkillTool(service);

    const result = await tool.execute({ name: "test-skill" }, createMockContext());

    assert.ok(result.content!.includes("Base directory for this skill: /skills/test-skill"));
  });

  // ─── Skill not found ──────────────────────────────────────

  it("returns error for unknown skill", async () => {
    const service = createMockSkillService([testSkill]);
    const tool = createSkillTool(service);

    const result = await tool.execute({ name: "unknown" }, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes('Skill "unknown" not found'));
    assert.ok(result.error!.includes("test-skill"));
  });

  it("lists 'none' when no skills available", async () => {
    const service = createMockSkillService([]);
    const tool = createSkillTool(service);

    const result = await tool.execute({ name: "whatever" }, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("none"));
  });

  // ─── Argument substitution ────────────────────────────────

  it("substitutes {{arguments}} in skill body", async () => {
    const service = createMockSkillService([argSkill]);
    const tool = createSkillTool(service);

    const result = await tool.execute(
      { name: "arg-skill", arguments: "my-custom-arg" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content!.includes("Run with: my-custom-arg"));
    assert.ok(!result.content!.includes("{{arguments}}"));
  });

  it("appends ARGUMENTS section when no placeholder exists", async () => {
    const service = createMockSkillService([testSkill]);
    const tool = createSkillTool(service);

    const result = await tool.execute(
      { name: "test-skill", arguments: "extra-args" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content!.includes("ARGUMENTS: extra-args"));
  });

  // ─── baseDir replacement ──────────────────────────────────

  it("replaces {baseDir} in skill content", async () => {
    const service = createMockSkillService([baseDirSkill]);
    const tool = createSkillTool(service);

    const result = await tool.execute({ name: "basedir-skill" }, createMockContext());

    assert.equal(result.status, "done");
    assert.ok(result.content!.includes("/skills/basedir-skill/scripts/run.sh"));
    assert.ok(!result.content!.includes("{baseDir}"));
  });

  // ─── Missing name ────────────────────────────────────────

  it("returns error for missing name", async () => {
    const service = createMockSkillService([]);
    const tool = createSkillTool(service);

    const result = await tool.execute({}, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("name"));
  });

  // ─── executionProfile ────────────────────────────────────

  it("executionProfile is undefined (read-only, no conflicts)", () => {
    const tool = createSkillTool(createMockSkillService([]));
    assert.equal(tool.executionProfile, undefined);
  });
});
