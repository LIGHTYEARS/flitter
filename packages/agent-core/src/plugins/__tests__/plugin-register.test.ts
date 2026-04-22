/**
 * Tests for GAP-CORE-19 (Plugin registerTool) + GAP-CORE-23 (Plugin registerCommand)
 *
 * Tests PluginHost tool/command list/execute methods and PluginService aggregation.
 * Uses mocked PluginHost.sendRequest since we can't spawn real subprocesses.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:27005-27031 ($aT listTools/listCommands/executeTool/executeCommand)
 * 逆向: amp-cli-reversed/chunk-002.js:27256-27275 (u function — parallel refresh)
 * 逆向: amp-cli-reversed/chunk-002.js:27719-27737 (tT/N/lT/q — service-level aggregation)
 * 逆向: amp-cli-reversed/chunk-002.js:27351-27358 (v function — getPluginInfos with tools/commands)
 */
import { describe, expect, mock, test } from "bun:test";
import { PluginHost } from "../plugin-host";
import { PluginService } from "../plugin-service";
import type { RegisteredCommand, RegisteredTool } from "../types";

// ─── Helpers ────────────────────────────────────────────

const TOOL_A: RegisteredTool = {
  name: "my-tool",
  description: "A test tool",
  inputSchema: { type: "object", properties: { x: { type: "string" } } },
  pluginName: "test-plugin",
};

const TOOL_B: RegisteredTool = {
  name: "other-tool",
  description: "Another tool",
  inputSchema: {},
  pluginName: "other-plugin",
};

const CMD_A: RegisteredCommand = {
  id: "my-cmd",
  category: "test",
  title: "My Command",
  description: "Test command",
  pluginName: "test-plugin",
};

const CMD_B: RegisteredCommand = {
  id: "other-cmd",
  category: "other",
  title: "Other Command",
  pluginName: "other-plugin",
};

/**
 * Create a PluginHost with sendRequest mocked to avoid subprocess spawning.
 */
function createMockHost(responses: Record<string, unknown>): PluginHost {
  const host = new PluginHost("/fake/plugin.ts");
  // Mock sendRequest to return predefined responses
  host.sendRequest = mock(async (method: string, _params?: unknown) => {
    if (method in responses) return responses[method];
    return undefined;
  }) as typeof host.sendRequest;
  return host;
}

// ─── PluginHost Tests ───────────────────────────────────

describe("PluginHost.listTools", () => {
  test("returns empty array when plugin responds with empty", async () => {
    const host = createMockHost({ "tool.list": [] });
    const result = await host.listTools();
    expect(result).toEqual([]);
  });

  test("returns tools from plugin response", async () => {
    const host = createMockHost({ "tool.list": [TOOL_A] });
    const result = await host.listTools();
    expect(result).toEqual([TOOL_A]);
  });

  test("returns empty array when plugin responds with non-array", async () => {
    const host = createMockHost({ "tool.list": "not-an-array" });
    const result = await host.listTools();
    expect(result).toEqual([]);
  });
});

describe("PluginHost.listCommands", () => {
  test("returns empty array when plugin responds with empty", async () => {
    const host = createMockHost({ "command.list": [] });
    const result = await host.listCommands();
    expect(result).toEqual([]);
  });

  test("returns commands from plugin response", async () => {
    const host = createMockHost({ "command.list": [CMD_A] });
    const result = await host.listCommands();
    expect(result).toEqual([CMD_A]);
  });

  test("returns empty array when plugin responds with non-array", async () => {
    const host = createMockHost({ "command.list": null });
    const result = await host.listCommands();
    expect(result).toEqual([]);
  });
});

describe("PluginHost.executeTool", () => {
  test("delegates to sendRequest with correct params", async () => {
    const host = createMockHost({ "tool.execute": { result: "ok" } });
    const result = await host.executeTool("my-tool", { x: "hello" });
    expect(result).toEqual({ result: "ok" });
    expect(host.sendRequest).toHaveBeenCalledWith("tool.execute", {
      name: "my-tool",
      input: { x: "hello" },
    });
  });
});

describe("PluginHost.executeCommand", () => {
  test("delegates to sendRequest with correct params", async () => {
    const host = createMockHost({ "command.execute": undefined });
    await host.executeCommand("my-cmd", { threadID: "t1" });
    expect(host.sendRequest).toHaveBeenCalledWith("command.execute", {
      name: "my-cmd",
      threadID: "t1",
    });
  });

  test("works without opts", async () => {
    const host = createMockHost({ "command.execute": undefined });
    await host.executeCommand("my-cmd");
    expect(host.sendRequest).toHaveBeenCalledWith("command.execute", {
      name: "my-cmd",
      threadID: undefined,
    });
  });
});

// ─── PluginService Tests ────────────────────────────────

/**
 * Helper to inject mock plugin records into PluginService.
 * We access the private `plugins` array via bracket notation.
 */
function injectPluginRecord(
  service: PluginService,
  record: {
    uri: string;
    status: "loading" | "active" | "error";
    host: PluginHost;
    registeredEvents?: Set<string>;
    registeredTools?: Map<string, RegisteredTool>;
    registeredCommands?: Map<string, RegisteredCommand>;
  },
): void {
  const plugins = (service as unknown as { plugins: unknown[] }).plugins;
  plugins.push({
    uri: record.uri,
    host: record.host,
    status: record.status,
    registeredEvents: record.registeredEvents ?? new Set(),
    registeredTools: record.registeredTools ?? new Map(),
    registeredCommands: record.registeredCommands ?? new Map(),
  });
}

describe("PluginService.getRegisteredTools", () => {
  test("aggregates tools across active plugins", () => {
    const service = new PluginService();
    const hostA = createMockHost({});
    const hostB = createMockHost({});

    injectPluginRecord(service, {
      uri: "/plugin-a.ts",
      status: "active",
      host: hostA,
      registeredTools: new Map([["my-tool", TOOL_A]]),
    });
    injectPluginRecord(service, {
      uri: "/plugin-b.ts",
      status: "active",
      host: hostB,
      registeredTools: new Map([["other-tool", TOOL_B]]),
    });

    const tools = service.getRegisteredTools();
    expect(tools).toHaveLength(2);
    expect(tools).toContainEqual(TOOL_A);
    expect(tools).toContainEqual(TOOL_B);
  });

  test("excludes non-active plugins", () => {
    const service = new PluginService();
    const hostA = createMockHost({});
    const hostB = createMockHost({});

    injectPluginRecord(service, {
      uri: "/plugin-a.ts",
      status: "active",
      host: hostA,
      registeredTools: new Map([["my-tool", TOOL_A]]),
    });
    injectPluginRecord(service, {
      uri: "/plugin-b.ts",
      status: "error",
      host: hostB,
      registeredTools: new Map([["other-tool", TOOL_B]]),
    });

    const tools = service.getRegisteredTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual(TOOL_A);
  });
});

describe("PluginService.getRegisteredCommands", () => {
  test("aggregates commands across active plugins", () => {
    const service = new PluginService();
    const hostA = createMockHost({});
    const hostB = createMockHost({});

    injectPluginRecord(service, {
      uri: "/plugin-a.ts",
      status: "active",
      host: hostA,
      registeredCommands: new Map([["my-cmd", CMD_A]]),
    });
    injectPluginRecord(service, {
      uri: "/plugin-b.ts",
      status: "active",
      host: hostB,
      registeredCommands: new Map([["other-cmd", CMD_B]]),
    });

    const commands = service.getRegisteredCommands();
    expect(commands).toHaveLength(2);
    expect(commands).toContainEqual(CMD_A);
    expect(commands).toContainEqual(CMD_B);
  });
});

describe("PluginService.refreshRegistrations", () => {
  test("calls all three list methods in parallel", async () => {
    const service = new PluginService();
    const host = createMockHost({
      "events.list": ["tool.call"],
      "tool.list": [TOOL_A],
      "command.list": [CMD_A],
    });

    injectPluginRecord(service, {
      uri: "/plugin.ts",
      status: "active",
      host,
    });

    // Access the private method via bracket notation
    const refreshRegistrations = (
      service as unknown as {
        refreshRegistrations: (record: unknown) => Promise<void>;
      }
    ).refreshRegistrations.bind(service);

    const record = (
      service as unknown as {
        plugins: Array<{
          registeredEvents: Set<string>;
          registeredTools: Map<string, RegisteredTool>;
          registeredCommands: Map<string, RegisteredCommand>;
        }>;
      }
    ).plugins[0];

    await refreshRegistrations(record);

    // All three should have been called
    expect(host.sendRequest).toHaveBeenCalledWith("events.list");
    expect(host.sendRequest).toHaveBeenCalledWith("tool.list");
    expect(host.sendRequest).toHaveBeenCalledWith("command.list");

    // And the record should be updated
    expect(record.registeredEvents).toEqual(new Set(["tool.call"]));
    expect(record.registeredTools.get("my-tool")).toEqual(TOOL_A);
    expect(record.registeredCommands.get("my-cmd")).toEqual(CMD_A);
  });
});

describe("PluginService handlePluginEvent", () => {
  test("tools.changed triggers refresh", async () => {
    const service = new PluginService();
    const host = createMockHost({
      "events.list": [],
      "tool.list": [TOOL_A],
      "command.list": [],
    });

    injectPluginRecord(service, {
      uri: "/plugin.ts",
      status: "active",
      host,
    });

    // Trigger the event handler via bracket notation
    const handlePluginEvent = (
      service as unknown as {
        handlePluginEvent: (record: unknown, event: string, data: unknown) => void;
      }
    ).handlePluginEvent.bind(service);

    const record = (
      service as unknown as {
        plugins: Array<{
          registeredTools: Map<string, RegisteredTool>;
        }>;
      }
    ).plugins[0];

    handlePluginEvent(record, "tools.changed", {});

    // Wait a tick for the async refresh to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(record.registeredTools.get("my-tool")).toEqual(TOOL_A);
  });
});

describe("PluginService.executeTool", () => {
  test("delegates to correct plugin host", async () => {
    const service = new PluginService();
    const host = createMockHost({ "tool.execute": { result: "executed" } });

    injectPluginRecord(service, {
      uri: "/plugin.ts",
      status: "active",
      host,
      registeredTools: new Map([["my-tool", TOOL_A]]),
    });

    const result = await service.executeTool("/plugin.ts", "my-tool", { x: "hello" });
    expect(result).toEqual({ result: "executed" });
    expect(host.sendRequest).toHaveBeenCalledWith("tool.execute", {
      name: "my-tool",
      input: { x: "hello" },
    });
  });
});

describe("PluginService.executeCommand", () => {
  test("throws for unknown plugin", async () => {
    const service = new PluginService();
    await expect(service.executeCommand("/nonexistent.ts", "cmd")).rejects.toThrow(
      "Plugin not found or not active: /nonexistent.ts",
    );
  });

  test("throws for non-active plugin", async () => {
    const service = new PluginService();
    const host = createMockHost({});

    injectPluginRecord(service, {
      uri: "/plugin.ts",
      status: "error",
      host,
    });

    await expect(service.executeCommand("/plugin.ts", "cmd")).rejects.toThrow(
      "Plugin not found or not active: /plugin.ts",
    );
  });
});

describe("PluginInfo includes registeredTools/registeredCommands", () => {
  test("getPluginInfos includes tools and commands arrays", () => {
    const service = new PluginService();
    const host = createMockHost({});

    injectPluginRecord(service, {
      uri: "/plugin.ts",
      status: "active",
      host,
      registeredTools: new Map([["my-tool", TOOL_A]]),
      registeredCommands: new Map([["my-cmd", CMD_A]]),
      registeredEvents: new Set(["tool.call"]),
    });

    const infos = service.getPluginInfos();
    expect(infos).toHaveLength(1);

    const info = infos[0];
    expect(info.uri).toBe("/plugin.ts");
    expect(info.status).toBe("active");
    expect(info.registeredEvents).toEqual(new Set(["tool.call"]));
    expect(info.registeredTools).toEqual([TOOL_A]);
    expect(info.registeredCommands).toEqual([CMD_A]);
  });
});
