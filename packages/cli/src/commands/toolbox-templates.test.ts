/**
 * Toolbox templates — unit tests
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateToolboxTemplate,
  getTemplateExtension,
} from "./toolbox-templates";

describe("generateToolboxTemplate", () => {
  it("generates bun/ts template with tool name", () => {
    const result = generateToolboxTemplate({ name: "my-tool", language: "bun" });
    assert.ok(result.includes("#!/usr/bin/env bun"));
    assert.ok(result.includes('"my-tool"'));
    assert.ok(result.includes("TOOLBOX_ACTION"));
    assert.ok(result.includes("describe"));
    assert.ok(result.includes("execute"));
    assert.ok(result.includes("Bun.stdin.text()"));
  });

  it("generates bash template with tool name", () => {
    const result = generateToolboxTemplate({ name: "deploy", language: "bash" });
    assert.ok(result.includes("#!/usr/bin/env bash"));
    assert.ok(result.includes('"deploy"'));
    assert.ok(result.includes("TOOLBOX_ACTION"));
    assert.ok(result.includes("describe"));
    assert.ok(result.includes("execute"));
  });

  it("generates zsh template with tool name", () => {
    const result = generateToolboxTemplate({ name: "lint", language: "zsh" });
    assert.ok(result.includes("#!/usr/bin/env zsh"));
    assert.ok(result.includes('"lint"'));
  });

  it("bash and zsh templates are valid JSON in describe block", () => {
    for (const lang of ["bash", "zsh"] as const) {
      const result = generateToolboxTemplate({ name: "test-tool", language: lang });
      // Extract JSON between <<'JSON' and JSON markers
      const match = result.match(/cat <<'JSON'\n([\s\S]*?)\nJSON/);
      assert.ok(match, `JSON block not found in ${lang} template`);
      const parsed = JSON.parse(match[1]);
      assert.equal(parsed.name, "test-tool");
      assert.ok(parsed.inputSchema);
    }
  });

  it("handles special characters in tool name", () => {
    const result = generateToolboxTemplate({ name: 'tool "special"', language: "bun" });
    // The JSON.stringify should properly escape quotes
    assert.ok(result.includes('tool \\"special\\"'));
  });
});

describe("getTemplateExtension", () => {
  it("returns .ts for bun", () => {
    assert.equal(getTemplateExtension("bun"), ".ts");
  });

  it("returns .sh for bash", () => {
    assert.equal(getTemplateExtension("bash"), ".sh");
  });

  it("returns .zsh for zsh", () => {
    assert.equal(getTemplateExtension("zsh"), ".zsh");
  });
});
