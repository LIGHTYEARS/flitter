// packages/cli/src/commands/__tests__/permissions.test.ts
import { describe, expect, it } from "bun:test";
import { parsePermissionAddArgs } from "../permissions";

describe("parsePermissionAddArgs", () => {
  it("parses simple allow rule", () => {
    const result = parsePermissionAddArgs("allow", "Bash", []);
    expect(result).toEqual({ tool: "Bash", action: "allow" });
  });

  it("parses ask rule", () => {
    const result = parsePermissionAddArgs("ask", "Write", []);
    expect(result).toEqual({ tool: "Write", action: "ask" });
  });

  it("parses rule with key=value matchers", () => {
    const result = parsePermissionAddArgs("allow", "Edit", ["file_path=/home/user/project/**"]);
    expect(result).toEqual({
      tool: "Edit",
      action: "allow",
      matches: { file_path: "/home/user/project/**" },
    });
  });

  it("rejects invalid action", () => {
    expect(() => parsePermissionAddArgs("invalid" as "allow", "Bash", [])).toThrow();
  });
});
