/**
 * ToolRegistry 单元测试
 *
 * 覆盖 CRUD、过滤、名称规范化
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Settings } from "@flitter/schemas";
import { ToolRegistry } from "./registry";
import type { ToolSpec } from "./types";

/** 创建 mock ToolSpec */
function createMockToolSpec(overrides?: Partial<ToolSpec>): ToolSpec {
  return {
    name: "mock-tool",
    description: "A mock tool for testing",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ status: "done" as const }),
    source: "builtin" as const,
    ...overrides,
  };
}

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  // ─── register ────────────────────────────────────────────

  describe("register", () => {
    it("注册工具成功并可通过 get 获取", () => {
      const spec = createMockToolSpec({ name: "read" });
      registry.register(spec);
      assert.equal(registry.get("read"), spec);
    });

    it("注册工具后 has 返回 true", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      assert.equal(registry.has("read"), true);
    });

    it("重复注册同名工具抛出 Error", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      assert.throws(() => registry.register(createMockToolSpec({ name: "read" })), {
        message: 'Tool "read" is already registered',
      });
    });

    it("不同名工具可同时注册", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      registry.register(createMockToolSpec({ name: "write" }));
      assert.equal(registry.has("read"), true);
      assert.equal(registry.has("write"), true);
    });
  });

  // ─── unregister ──────────────────────────────────────────

  describe("unregister", () => {
    it("移除已注册工具返回 true", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      assert.equal(registry.unregister("read"), true);
    });

    it("移除未注册工具返回 false", () => {
      assert.equal(registry.unregister("nonexistent"), false);
    });

    it("移除后 get 返回 undefined, has 返回 false", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      registry.unregister("read");
      assert.equal(registry.get("read"), undefined);
      assert.equal(registry.has("read"), false);
    });
  });

  // ─── get / has ───────────────────────────────────────────

  describe("get / has", () => {
    it("未注册工具 get 返回 undefined", () => {
      assert.equal(registry.get("nonexistent"), undefined);
    });

    it("未注册工具 has 返回 false", () => {
      assert.equal(registry.has("nonexistent"), false);
    });
  });

  // ─── list ────────────────────────────────────────────────

  describe("list", () => {
    it("空 registry 返回空数组", () => {
      assert.deepEqual(registry.list(), []);
    });

    it("返回所有已注册工具", () => {
      const read = createMockToolSpec({ name: "read" });
      const write = createMockToolSpec({ name: "write" });
      registry.register(read);
      registry.register(write);
      const list = registry.list();
      assert.equal(list.length, 2);
      assert.ok(list.includes(read));
      assert.ok(list.includes(write));
    });
  });

  // ─── listEnabled ─────────────────────────────────────────

  describe("listEnabled", () => {
    it("无过滤条件时返回所有工具", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      registry.register(createMockToolSpec({ name: "write" }));
      const result = registry.listEnabled({} as Settings);
      assert.equal(result.length, 2);
    });

    it("isEnabled 返回 false 时排除该工具", () => {
      registry.register(
        createMockToolSpec({
          name: "read",
          isEnabled: () => false,
        }),
      );
      registry.register(createMockToolSpec({ name: "write" }));
      const result = registry.listEnabled({} as Settings);
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "write");
    });

    it("config tools.disable 中的工具被排除", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      registry.register(createMockToolSpec({ name: "write" }));
      const config = { "tools.disable": ["read"] } as Settings;
      const result = registry.listEnabled(config);
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "write");
    });

    it("config tools.enable 白名单外的工具被排除", () => {
      registry.register(createMockToolSpec({ name: "read" }));
      registry.register(createMockToolSpec({ name: "write" }));
      registry.register(createMockToolSpec({ name: "bash" }));
      const config = { "tools.enable": ["read", "bash"] } as Settings;
      const result = registry.listEnabled(config);
      assert.equal(result.length, 2);
      const names = result.map((t) => t.name);
      assert.ok(names.includes("read"));
      assert.ok(names.includes("bash"));
      assert.ok(!names.includes("write"));
    });

    it("isEnabled + config 过滤组合正确工作", () => {
      registry.register(
        createMockToolSpec({
          name: "read",
          isEnabled: () => true,
        }),
      );
      registry.register(
        createMockToolSpec({
          name: "write",
          isEnabled: () => false,
        }),
      );
      registry.register(createMockToolSpec({ name: "bash" }));
      const config = { "tools.disable": ["bash"] } as Settings;
      const result = registry.listEnabled(config);
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "read");
    });
  });

  // ─── getToolDefinitions ──────────────────────────────────

  describe("getToolDefinitions", () => {
    it("返回 ToolDefinition[] 仅含 name/description/inputSchema", () => {
      const schema = { type: "object", properties: { path: { type: "string" } } };
      registry.register(
        createMockToolSpec({
          name: "read",
          description: "Read a file",
          inputSchema: schema,
        }),
      );
      const defs = registry.getToolDefinitions({} as Settings);
      assert.equal(defs.length, 1);
      assert.deepEqual(defs[0], {
        name: "read",
        description: "Read a file",
        inputSchema: schema,
      });
    });

    it("过滤逻辑与 listEnabled 一致", () => {
      registry.register(
        createMockToolSpec({
          name: "read",
          isEnabled: () => false,
        }),
      );
      registry.register(createMockToolSpec({ name: "write" }));
      const defs = registry.getToolDefinitions({} as Settings);
      assert.equal(defs.length, 1);
      assert.equal(defs[0].name, "write");
    });

    it("空 registry 返回空数组", () => {
      const defs = registry.getToolDefinitions({} as Settings);
      assert.deepEqual(defs, []);
    });
  });

  // ─── normalizeToolName ───────────────────────────────────

  describe("normalizeToolName", () => {
    it("普通名称原样返回", () => {
      assert.equal(registry.normalizeToolName("read"), "read");
    });

    it("mcp__server__tool 格式返回 tool 部分", () => {
      assert.equal(registry.normalizeToolName("mcp__myserver__read"), "read");
    });

    it("mcp__server__multi__part 返回 multi__part", () => {
      assert.equal(registry.normalizeToolName("mcp__srv__multi__part"), "multi__part");
    });

    it("mcp__ 开头但不足 3 段原样返回", () => {
      assert.equal(registry.normalizeToolName("mcp__single"), "mcp__single");
    });
  });
});
