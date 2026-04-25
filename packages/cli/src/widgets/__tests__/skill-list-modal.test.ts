/**
 * Tests for SkillListModalWidget and groupSkillsByScope.
 *
 * 逆向: Az0 (groupSkillsByScope) in chunk-005.js:3591
 * 逆向: H8R (SkillListModalWidget) in misc_utils.js:9889
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupSkillsByScope,
  type SkillData,
  type SkillError,
  SkillListModalWidget,
  type SkillWarning,
} from "../skill-list-modal.js";

// ─── Helpers ──────────────────────────────────────────────

function makeSkill(overrides: Partial<SkillData> & { name: string }): SkillData {
  return {
    description: "",
    content: "",
    baseDir: "file:///home/user/project/.skills",
    scope: "local",
    ...overrides,
  };
}

const noop = () => {};

// ─── groupSkillsByScope ───────────────────────────────────

describe("groupSkillsByScope", () => {
  it("returns empty array for empty input", () => {
    const result = groupSkillsByScope([]);
    assert.deepEqual(result, []);
  });

  it("groups a single local skill", () => {
    const skills = [makeSkill({ name: "deploy", scope: "local" })];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].scope, "local");
    assert.equal(groups[0].label, "Local");
    assert.equal(groups[0].skills.length, 1);
    assert.equal(groups[0].skills[0].name, "deploy");
  });

  it("groups a single global skill", () => {
    const skills = [
      makeSkill({ name: "format", scope: "global", baseDir: "file:///home/user/.config/skills" }),
    ];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].scope, "global");
    assert.equal(groups[0].label, "Global");
    assert.equal(groups[0].skills.length, 1);
  });

  it("groups a single builtin skill", () => {
    const skills = [makeSkill({ name: "help", scope: "builtin", baseDir: "builtin://core" })];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].scope, "builtin");
    assert.equal(groups[0].label, "Built-in");
    assert.equal(groups[0].skills.length, 1);
  });

  it("builtin groups have no pathHint", () => {
    const skills = [makeSkill({ name: "help", scope: "builtin", baseDir: "builtin://core" })];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups[0].pathHint, undefined);
  });

  it("local and global groups have a pathHint", () => {
    const skills = [makeSkill({ name: "deploy", scope: "local" })];
    const groups = groupSkillsByScope(skills);
    assert.equal(typeof groups[0].pathHint, "string");
    assert.ok(groups[0].pathHint!.length > 0);
  });

  it("sorts groups: local before global before builtin", () => {
    const skills = [
      makeSkill({ name: "b-builtin", scope: "builtin", baseDir: "builtin://core" }),
      makeSkill({ name: "g-global", scope: "global", baseDir: "file:///global/path" }),
      makeSkill({ name: "l-local", scope: "local", baseDir: "file:///local/path" }),
    ];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].scope, "local");
    assert.equal(groups[1].scope, "global");
    assert.equal(groups[2].scope, "builtin");
  });

  it("groups multiple skills with the same scope and baseDir together", () => {
    const skills = [
      makeSkill({ name: "alpha", scope: "local", baseDir: "file:///project/.skills" }),
      makeSkill({ name: "beta", scope: "local", baseDir: "file:///project/.skills" }),
      makeSkill({ name: "gamma", scope: "local", baseDir: "file:///project/.skills" }),
    ];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].skills.length, 3);
  });

  it("separates skills with same scope but different baseDir into separate groups", () => {
    const skills = [
      makeSkill({ name: "a", scope: "local", baseDir: "file:///project-a/.skills" }),
      makeSkill({ name: "b", scope: "local", baseDir: "file:///project-b/.skills" }),
    ];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].skills.length, 1);
    assert.equal(groups[1].skills.length, 1);
  });

  it("sorts groups with same scope alphabetically by pathHint", () => {
    const skills = [
      makeSkill({ name: "z", scope: "local", baseDir: "file:///zzz/path" }),
      makeSkill({ name: "a", scope: "local", baseDir: "file:///aaa/path" }),
    ];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 2);
    // /aaa/path should sort before /zzz/path
    assert.ok(groups[0].pathHint!.localeCompare(groups[1].pathHint!) < 0);
  });

  it("derives pathHint relative to cwd for file:// baseDirs", () => {
    const skills = [
      makeSkill({ name: "deploy", scope: "local", baseDir: "file:///home/user/project/.skills" }),
    ];
    const groups = groupSkillsByScope(skills, "/home/user/project");
    assert.equal(groups[0].pathHint, ".skills");
  });

  it("uses absolute path when cwd does not match", () => {
    const skills = [
      makeSkill({ name: "deploy", scope: "local", baseDir: "file:///other/place/.skills" }),
    ];
    const groups = groupSkillsByScope(skills, "/home/user/project");
    assert.equal(groups[0].pathHint, "/other/place/.skills");
  });

  it("handles cwd at root of baseDir path", () => {
    const skills = [
      makeSkill({ name: "deploy", scope: "local", baseDir: "file:///home/user/project" }),
    ];
    const groups = groupSkillsByScope(skills, "/home/user/project");
    // When the path equals cwd, makeRelative returns "."
    assert.equal(groups[0].pathHint, ".");
  });

  it("handles builtin:// baseDir (returns '(built-in skill)' then undefined pathHint)", () => {
    const skills = [makeSkill({ name: "commit", scope: "builtin", baseDir: "builtin://commit" })];
    const groups = groupSkillsByScope(skills, "/home/user");
    assert.equal(groups[0].pathHint, undefined);
  });

  it("groups mixed scopes correctly with multiple skills each", () => {
    const skills = [
      makeSkill({ name: "local-a", scope: "local", baseDir: "file:///proj/.skills" }),
      makeSkill({ name: "local-b", scope: "local", baseDir: "file:///proj/.skills" }),
      makeSkill({ name: "global-a", scope: "global", baseDir: "file:///home/.config" }),
      makeSkill({ name: "builtin-a", scope: "builtin", baseDir: "builtin://core" }),
      makeSkill({ name: "builtin-b", scope: "builtin", baseDir: "builtin://core" }),
    ];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].scope, "local");
    assert.equal(groups[0].skills.length, 2);
    assert.equal(groups[1].scope, "global");
    assert.equal(groups[1].skills.length, 1);
    assert.equal(groups[2].scope, "builtin");
    assert.equal(groups[2].skills.length, 2);
  });

  it("preserves insertion order of skills within a group", () => {
    const skills = [
      makeSkill({ name: "zulu", scope: "local", baseDir: "file:///proj" }),
      makeSkill({ name: "alpha", scope: "local", baseDir: "file:///proj" }),
      makeSkill({ name: "mike", scope: "local", baseDir: "file:///proj" }),
    ];
    const groups = groupSkillsByScope(skills);
    assert.equal(groups[0].skills[0].name, "zulu");
    assert.equal(groups[0].skills[1].name, "alpha");
    assert.equal(groups[0].skills[2].name, "mike");
  });

  it("handles baseDir without file:// prefix", () => {
    const skills = [makeSkill({ name: "raw", scope: "local", baseDir: "/raw/absolute/path" })];
    const groups = groupSkillsByScope(skills);
    // Non file:// and non builtin:// baseDir is returned as-is
    assert.equal(groups[0].pathHint, "/raw/absolute/path");
  });

  it("handles cwd with trailing slash", () => {
    const skills = [
      makeSkill({ name: "deploy", scope: "local", baseDir: "file:///home/user/project/.skills" }),
    ];
    const groups = groupSkillsByScope(skills, "/home/user/project/");
    assert.equal(groups[0].pathHint, ".skills");
  });
});

// ─── SkillListModalWidget construction ────────────────────

describe("SkillListModalWidget", () => {
  it("constructs with minimal config", () => {
    const widget = new SkillListModalWidget({
      skills: [],
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    assert.ok(widget.config);
    assert.deepEqual(widget.config.skills, []);
  });

  it("stores skills in config", () => {
    const skills = [makeSkill({ name: "deploy" }), makeSkill({ name: "test" })];
    const widget = new SkillListModalWidget({
      skills,
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    assert.equal(widget.config.skills.length, 2);
    assert.equal(widget.config.skills[0].name, "deploy");
    assert.equal(widget.config.skills[1].name, "test");
  });

  it("stores onInvokeSkill callback", () => {
    let invokedName = "";
    const widget = new SkillListModalWidget({
      skills: [],
      onInvokeSkill: (name) => {
        invokedName = name;
      },
      onDismiss: noop,
    });
    widget.config.onInvokeSkill("my-skill");
    assert.equal(invokedName, "my-skill");
  });

  it("stores onDismiss callback", () => {
    let dismissed = false;
    const widget = new SkillListModalWidget({
      skills: [],
      onInvokeSkill: noop,
      onDismiss: () => {
        dismissed = true;
      },
    });
    widget.config.onDismiss();
    assert.equal(dismissed, true);
  });

  it("stores skillErrors in config", () => {
    const errors: SkillError[] = [
      { name: "bad-skill", error: "parse error", path: "file:///proj/bad-skill/SKILL.md" },
    ];
    const widget = new SkillListModalWidget({
      skills: [],
      skillErrors: errors,
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    assert.equal(widget.config.skillErrors!.length, 1);
    assert.equal(widget.config.skillErrors![0].name, "bad-skill");
    assert.equal(widget.config.skillErrors![0].error, "parse error");
  });

  it("stores skillWarnings in config", () => {
    const warnings: SkillWarning[] = [
      { name: "warn-skill", warning: "deprecated syntax", path: "file:///proj/warn/SKILL.md" },
    ];
    const widget = new SkillListModalWidget({
      skills: [],
      skillWarnings: warnings,
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    assert.equal(widget.config.skillWarnings!.length, 1);
    assert.equal(widget.config.skillWarnings![0].warning, "deprecated syntax");
  });

  it("stores cwd in config", () => {
    const widget = new SkillListModalWidget({
      skills: [],
      cwd: "/home/user/project",
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    assert.equal(widget.config.cwd, "/home/user/project");
  });

  it("defaults skillErrors and skillWarnings to undefined", () => {
    const widget = new SkillListModalWidget({
      skills: [],
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    assert.equal(widget.config.skillErrors, undefined);
    assert.equal(widget.config.skillWarnings, undefined);
  });

  it("is a StatefulWidget with createState", () => {
    const widget = new SkillListModalWidget({
      skills: [],
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    assert.equal(typeof widget.createState, "function");
    const state = widget.createState();
    assert.ok(state);
  });

  it("createState returns state with null selectedSkill", () => {
    const widget = new SkillListModalWidget({
      skills: [],
      onInvokeSkill: noop,
      onDismiss: noop,
    });
    const state = widget.createState();
    assert.equal(state.selectedSkill, null);
    assert.equal(state.detailScrollOffset, 0);
  });
});
