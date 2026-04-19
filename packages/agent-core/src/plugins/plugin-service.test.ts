/**
 * PluginService unit tests
 *
 * Tests plugin discovery, lifecycle management, and tool call/result interception.
 * Uses mock filesystem for discovery and mock PluginHost for interception.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:27190-27510 (X5T function)
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, it } from "node:test";

import { PluginService } from "./plugin-service";

// ─── Test helpers ─────────────────────────────────────────

let testDir: string;

function setupTestDir(): string {
  const dir = join(tmpdir(), `flitter-plugin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

function createPluginFile(dir: string, name: string, content?: string): string {
  const pluginDir = join(dir, ".flitter", "plugins");
  mkdirSync(pluginDir, { recursive: true });
  const filePath = join(pluginDir, name);
  writeFileSync(filePath, content ?? `export default { "tool.call": async () => ({ action: "allow" }) };`);
  return filePath;
}

function createGlobalPluginFile(configDir: string, name: string, content?: string): string {
  const pluginDir = join(configDir, "plugins");
  mkdirSync(pluginDir, { recursive: true });
  const filePath = join(pluginDir, name);
  writeFileSync(filePath, content ?? `export default { "tool.call": async () => ({ action: "allow" }) };`);
  return filePath;
}

// ─── Tests ────────────────────────────────────────────────

describe("PluginService", () => {
  beforeEach(() => {
    testDir = setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  // ─── Discovery ──────────────────────────────────────────

  describe("discoverPlugins", () => {
    it("discovers .ts files in workspace plugins directory", () => {
      createPluginFile(testDir, "my-plugin.ts");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 1);
      assert.ok(plugins[0].endsWith("my-plugin.ts"));
    });

    it("discovers .js files in workspace plugins directory", () => {
      createPluginFile(testDir, "my-plugin.js");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 1);
      assert.ok(plugins[0].endsWith("my-plugin.js"));
    });

    it("ignores non-.ts/.js files", () => {
      // 逆向: chunk-002.js:27372-27374 (ext filter: .js || .ts)
      const pluginDir = join(testDir, ".flitter", "plugins");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(join(pluginDir, "readme.md"), "# Readme");
      writeFileSync(join(pluginDir, "config.json"), "{}");
      writeFileSync(join(pluginDir, "actual.ts"), "export default {};");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 1);
      assert.ok(plugins[0].endsWith("actual.ts"));
    });

    it("ignores directories inside plugins directory", () => {
      // 逆向: chunk-002.js:27371 (isDirectory check)
      const pluginDir = join(testDir, ".flitter", "plugins");
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, "subdir"), { recursive: true });
      writeFileSync(join(pluginDir, "plugin.ts"), "export default {};");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 1);
    });

    it("discovers global plugins", () => {
      const configDir = join(testDir, "config");
      createGlobalPluginFile(configDir, "global-plugin.ts");

      const service = new PluginService({
        userConfigDir: configDir,
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 1);
      assert.ok(plugins[0].endsWith("global-plugin.ts"));
    });

    it("discovers plugins from both workspace and global directories", () => {
      const configDir = join(testDir, "config");
      createPluginFile(testDir, "workspace-plugin.ts");
      createGlobalPluginFile(configDir, "global-plugin.ts");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: configDir,
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 2);
    });

    it("returns empty array when no plugin directories exist", () => {
      const service = new PluginService({
        workspaceDir: join(testDir, "nonexistent"),
        userConfigDir: join(testDir, "also-nonexistent"),
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 0);
    });

    it("returns empty array when pluginFilter is off", () => {
      // 逆向: chunk-002.js:27192 (pluginFilter === "off")
      createPluginFile(testDir, "plugin.ts");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
        pluginFilter: "off",
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 0);
    });

    it("filters plugins by name when pluginFilter is specified", () => {
      // 逆向: chunk-002.js:27479-27484 (filter logic)
      const pluginDir = join(testDir, ".flitter", "plugins");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(join(pluginDir, "security-check.ts"), "export default {};");
      writeFileSync(join(pluginDir, "audit-log.ts"), "export default {};");
      writeFileSync(join(pluginDir, "format-code.ts"), "export default {};");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
        pluginFilter: "audit",
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 1);
      assert.ok(plugins[0].endsWith("audit-log.ts"));
    });

    it("treats 'all' filter as no filter", () => {
      // 逆向: chunk-002.js:27191 (R === "all" ? void 0 : R)
      const pluginDir = join(testDir, ".flitter", "plugins");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(join(pluginDir, "plugin-a.ts"), "export default {};");
      writeFileSync(join(pluginDir, "plugin-b.ts"), "export default {};");

      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
        pluginFilter: "all",
      });

      const plugins = service.discoverPlugins();
      assert.equal(plugins.length, 2);
    });
  });

  // ─── Tool Call Interception ─────────────────────────────

  describe("onToolCall", () => {
    it("returns allow when no plugins are loaded", async () => {
      // 逆向: chunk-002.js:27568-27570 (empty plugins → allow)
      const service = new PluginService({
        workspaceDir: join(testDir, "empty"),
        userConfigDir: join(testDir, "also-empty"),
      });

      const action = await service.onToolCall({
        tool: "bash",
        input: { command: "ls" },
      });
      assert.equal(action.action, "allow");
    });
  });

  describe("onToolResult", () => {
    it("returns undefined when no plugins are loaded", async () => {
      // 逆向: chunk-002.js:27612 (empty plugins → return)
      const service = new PluginService({
        workspaceDir: join(testDir, "empty"),
        userConfigDir: join(testDir, "also-empty"),
      });

      const result = await service.onToolResult({
        tool: "bash",
        input: { command: "ls" },
        output: "file.txt",
        status: "done",
      });
      assert.equal(result, undefined);
    });
  });

  // ─── Plugin Info ────────────────────────────────────────

  describe("getPluginInfos", () => {
    it("returns empty array when no plugins loaded", () => {
      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      const infos = service.getPluginInfos();
      assert.equal(infos.length, 0);
    });
  });

  // ─── Lifecycle ──────────────────────────────────────────

  describe("dispose", () => {
    it("marks service as disposed", async () => {
      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      assert.equal(service.isDisposed, false);
      await service.dispose();
      assert.equal(service.isDisposed, true);
    });

    it("dispose is idempotent", async () => {
      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      await service.dispose();
      await service.dispose(); // Should not throw
      assert.equal(service.isDisposed, true);
    });
  });

  describe("loadPlugins", () => {
    it("does nothing when no plugins found", async () => {
      const service = new PluginService({
        workspaceDir: join(testDir, "empty"),
        userConfigDir: join(testDir, "also-empty"),
      });

      await service.loadPlugins();
      assert.equal(service.pluginCount, 0);
    });

    it("does nothing after dispose", async () => {
      const service = new PluginService({
        workspaceDir: testDir,
        userConfigDir: join(testDir, "no-global"),
      });

      await service.dispose();
      await service.loadPlugins(); // Should not throw
      assert.equal(service.pluginCount, 0);
    });
  });
});
