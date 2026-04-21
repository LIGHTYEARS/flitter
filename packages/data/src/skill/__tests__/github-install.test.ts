/**
 * Tests for GitHub skill install support (GAP-DATA-28)
 *
 * Tests the isGitUrl() helper and the install() method's URL detection.
 * Note: cloneFromGit() is not tested here (requires actual git binary).
 *
 * 逆向: amp modules/1322_unknown_pqR.js
 */
import { describe, expect, test } from "bun:test";
import { isGitUrl } from "../skill-service.js";

describe("isGitUrl", () => {
  test("detects https://github.com/ URLs", () => {
    expect(isGitUrl("https://github.com/user/repo")).toBe(true);
    expect(isGitUrl("https://github.com/user/repo.git")).toBe(true);
    expect(isGitUrl("https://github.com/org/repo/tree/main")).toBe(true);
  });

  test("detects git@github.com: URLs", () => {
    expect(isGitUrl("git@github.com:user/repo.git")).toBe(true);
  });

  test("detects github: shorthand", () => {
    expect(isGitUrl("github:user/repo")).toBe(true);
    expect(isGitUrl("github:org/skill-name")).toBe(true);
  });

  test("detects generic .git URLs", () => {
    expect(isGitUrl("https://gitlab.com/user/repo.git")).toBe(true);
    expect(isGitUrl("http://example.com/path/repo.git")).toBe(true);
  });

  test("rejects local paths", () => {
    expect(isGitUrl("/home/user/skills/my-skill")).toBe(false);
    expect(isGitUrl("./my-skill")).toBe(false);
    expect(isGitUrl("my-skill")).toBe(false);
    expect(isGitUrl("../skills/demo")).toBe(false);
  });

  test("rejects non-git URLs", () => {
    expect(isGitUrl("https://example.com/page")).toBe(false);
    expect(isGitUrl("ftp://server/file")).toBe(false);
  });
});
