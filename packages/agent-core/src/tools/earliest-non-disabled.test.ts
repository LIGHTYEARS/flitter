/**
 * findEarliestNonDisabledTool unit tests
 *
 * 逆向: amp-cli-reversed/modules/1737_EarliestNonDisabledTool_$mR.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Settings } from "@flitter/schemas";
import { findEarliestNonDisabledTool } from "./earliest-non-disabled";

describe("findEarliestNonDisabledTool", () => {
  it("returns the first tool when none are disabled", () => {
    const tools = [
      { name: "Read", id: "t1" },
      { name: "Write", id: "t2" },
    ];
    const result = findEarliestNonDisabledTool(tools, {} as Settings);
    assert.equal(result?.name, "Read");
  });

  it("skips disabled tools and returns the first enabled one", () => {
    const tools = [
      { name: "Read", id: "t1" },
      { name: "Write", id: "t2" },
      { name: "Bash", id: "t3" },
    ];
    const config = { "tools.disable": ["Read", "Write"] } as Settings;
    const result = findEarliestNonDisabledTool(tools, config);
    assert.equal(result?.name, "Bash");
  });

  it("returns undefined when all tools are disabled", () => {
    const tools = [
      { name: "Read", id: "t1" },
      { name: "Write", id: "t2" },
    ];
    const config = { "tools.disable": ["Read", "Write"] } as Settings;
    const result = findEarliestNonDisabledTool(tools, config);
    assert.equal(result, undefined);
  });

  it("respects tools.enable whitelist", () => {
    const tools = [
      { name: "Read", id: "t1" },
      { name: "Write", id: "t2" },
      { name: "Bash", id: "t3" },
    ];
    const config = { "tools.enable": ["Bash"] } as Settings;
    const result = findEarliestNonDisabledTool(tools, config);
    assert.equal(result?.name, "Bash");
  });

  it("returns undefined for empty array", () => {
    const result = findEarliestNonDisabledTool([], {} as Settings);
    assert.equal(result, undefined);
  });

  it("skips entries with empty name", () => {
    const tools = [
      { name: "", id: "t1" },
      { name: "Read", id: "t2" },
    ];
    const result = findEarliestNonDisabledTool(tools, {} as Settings);
    assert.equal(result?.name, "Read");
  });

  it("tools.disable takes priority over tools.enable when both set", () => {
    const tools = [
      { name: "Read", id: "t1" },
      { name: "Write", id: "t2" },
    ];
    const config = {
      "tools.enable": ["Read", "Write"],
      "tools.disable": ["Read"],
    } as Settings;
    const result = findEarliestNonDisabledTool(tools, config);
    assert.equal(result?.name, "Write");
  });
});
