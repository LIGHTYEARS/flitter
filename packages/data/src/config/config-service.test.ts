/**
 * Tests for ConfigService — JSONC, FileSettingsStorage, 3-tier merge, hot reload.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { SecretStore, Settings } from "@flitter/schemas";
import { ConfigService } from "./config-service";
import { FileSettingsStorage } from "./settings-storage";

let tmpDir: string;
let globalDir: string;
let workspaceDir: string;

const mockSecretStore: SecretStore = {
  getToken: async () => undefined,
  isSet: () => false,
};

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-config-"));
  globalDir = path.join(tmpDir, "global");
  workspaceDir = path.join(tmpDir, "workspace", ".flitter");
  await fsp.mkdir(globalDir, { recursive: true });
  await fsp.mkdir(workspaceDir, { recursive: true });
});

afterEach(async () => {
  // Retry cleanup to handle fs.watch handle release delays
  for (let i = 0; i < 5; i++) {
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

function makeStorage(): FileSettingsStorage {
  return new FileSettingsStorage({
    globalPath: path.join(globalDir, "settings.json"),
    workspacePath: path.join(workspaceDir, "settings.json"),
  });
}

function makeService(storage?: FileSettingsStorage): ConfigService {
  const s = storage ?? makeStorage();
  return new ConfigService({
    storage: s,
    secretStorage: mockSecretStore,
    workspaceRoot: path.join(tmpDir, "workspace"),
    homeDir: tmpDir,
    userConfigDir: globalDir,
  });
}

describe("FileSettingsStorage", () => {
  describe("read/write global", () => {
    it("should write and read global settings", async () => {
      const storage = makeStorage();
      await storage.write("global", { "anthropic.speed": "fast" } as unknown as Partial<Settings>);
      const settings = await storage.read("global");
      assert.equal((settings as Record<string, unknown>)["anthropic.speed"], "fast");
    });

    it("should return empty for non-existent file", async () => {
      const storage = new FileSettingsStorage({
        globalPath: path.join(tmpDir, "nonexistent", "settings.json"),
      });
      const settings = await storage.read("global");
      assert.deepEqual(settings, {});
    });
  });

  describe("read/write workspace", () => {
    it("should write and read workspace settings", async () => {
      const storage = makeStorage();
      await storage.write("workspace", {
        "tools.inactivityTimeout": 30,
      } as unknown as Partial<Settings>);
      const settings = await storage.read("workspace");
      assert.equal((settings as Record<string, unknown>)["tools.inactivityTimeout"], 30);
    });
  });

  describe("JSONC support", () => {
    it("should read .jsonc files with comments", async () => {
      const jsoncPath = path.join(globalDir, "settings.jsonc");
      await fsp.writeFile(
        jsoncPath,
        `{
  // Anthropic config
  "anthropic.speed": "fast", /* inline */
  "anthropic.temperature": 0.5
}`,
        "utf-8",
      );
      const storage = makeStorage();
      const settings = await storage.read("global");
      assert.equal((settings as Record<string, unknown>)["anthropic.speed"], "fast");
      assert.equal((settings as Record<string, unknown>)["anthropic.temperature"], 0.5);
    });

    it("should fallback to .jsonc when .json missing", async () => {
      // No .json, but create .jsonc
      const jsoncPath = path.join(globalDir, "settings.jsonc");
      await fsp.writeFile(jsoncPath, '{ "proxy": "http://proxy" }', "utf-8");
      const storage = makeStorage();
      const settings = await storage.read("global");
      assert.equal((settings as Record<string, unknown>).proxy, "http://proxy");
    });
  });

  describe("single-key operations", () => {
    it("should get/set/delete single key", async () => {
      const storage = makeStorage();
      await storage.set("proxy", "http://localhost:8080");
      assert.equal(await storage.get("proxy"), "http://localhost:8080");
      await storage.delete("proxy");
      assert.equal(await storage.get("proxy"), undefined);
    });

    it("should append to array", async () => {
      const storage = makeStorage();
      await storage.set("tools.disable", ["bash"]);
      await storage.append("tools.disable", "write");
      const val = (await storage.get("tools.disable")) as string[];
      assert.deepEqual(val, ["bash", "write"]);
    });

    it("should prepend to array", async () => {
      const storage = makeStorage();
      await storage.set("tools.disable", ["bash"]);
      await storage.prepend("tools.disable", "write");
      const val = (await storage.get("tools.disable")) as string[];
      assert.deepEqual(val, ["write", "bash"]);
    });
  });

  describe("scope validation", () => {
    it("should reject admin scope write", async () => {
      const storage = makeStorage();
      await assert.rejects(() => storage.write("admin", {}), /admin scope/);
    });

    it("should reject global-only key in workspace", async () => {
      const storage = makeStorage();
      await assert.rejects(() => storage.set("mcpServers", {}, "workspace"), /global-only/);
    });
  });

  describe("atomic write", () => {
    it("should not leave tmp files", async () => {
      const storage = makeStorage();
      await storage.write("global", { proxy: "test" } as unknown as Partial<Settings>);
      const files = await fsp.readdir(globalDir);
      assert.equal(files.filter((f) => f.endsWith(".tmp")).length, 0);
    });

    it("should write pure JSON (no comments)", async () => {
      const storage = makeStorage();
      await storage.write("global", { proxy: "test" } as unknown as Partial<Settings>);
      const raw = await fsp.readFile(path.join(globalDir, "settings.json"), "utf-8");
      assert.ok(!raw.includes("//"));
      JSON.parse(raw); // Should not throw
    });
  });
});

describe("ConfigService", () => {
  describe("3-tier merge", () => {
    it("should merge global and workspace settings", async () => {
      const storage = makeStorage();
      await storage.write("global", {
        "anthropic.speed": "fast",
        proxy: "http://proxy",
      } as unknown as Partial<Settings>);
      await storage.write("workspace", {
        "anthropic.speed": "slow",
      } as unknown as Partial<Settings>);

      const service = makeService(storage);
      await service.reload();
      const { settings } = service.get();
      assert.equal((settings as Record<string, unknown>)["anthropic.speed"], "slow"); // workspace overrides
      assert.equal((settings as Record<string, unknown>).proxy, "http://proxy"); // global preserved
    });

    it("should concat+dedup array keys", async () => {
      const storage = makeStorage();
      await storage.write("global", {
        "tools.disable": ["bash", "write"],
      } as unknown as Partial<Settings>);
      await storage.write("workspace", {
        "tools.disable": ["write", "read"],
      } as unknown as Partial<Settings>);

      const service = makeService(storage);
      await service.reload();
      const arr = (service.get().settings as Record<string, unknown>)["tools.disable"];
      assert.ok(Array.isArray(arr));
      assert.ok(arr.includes("bash"));
      assert.ok(arr.includes("write"));
      assert.ok(arr.includes("read"));
    });

    it("should keep GLOBAL_ONLY_KEYS from global only", async () => {
      const storage = makeStorage();
      await storage.write("global", {
        mcpServers: { a: { command: "x" } },
      } as unknown as Partial<Settings>);
      await storage.write("workspace", {
        mcpServers: { b: { command: "y" } },
      } as unknown as Partial<Settings>);

      const service = makeService(storage);
      await service.reload();
      const servers = (service.get().settings as Record<string, unknown>).mcpServers;
      assert.ok(servers.a);
      assert.equal(servers.b, undefined); // workspace value ignored
    });
  });

  describe("getLatest", () => {
    it("should reload from files", async () => {
      const storage = makeStorage();
      const service = makeService(storage);

      await storage.write("global", { proxy: "v1" } as unknown as Partial<Settings>);
      const config1 = await service.getLatest();
      assert.equal((config1.settings as Record<string, unknown>).proxy, "v1");

      await storage.write("global", { proxy: "v2" } as unknown as Partial<Settings>);
      const config2 = await service.getLatest();
      assert.equal((config2.settings as Record<string, unknown>).proxy, "v2");
    });
  });

  describe("updateSettings", () => {
    it("should update and persist a key", async () => {
      const storage = makeStorage();
      const service = makeService(storage);
      service.updateSettings("global", "proxy", "http://new");

      // Wait for async write
      await new Promise((r) => setTimeout(r, 50));
      const val = await storage.get("proxy");
      assert.equal(val, "http://new");
    });
  });

  describe("diff filter", () => {
    it("should not emit when content unchanged", async () => {
      const storage = makeStorage();
      await storage.write("global", { proxy: "test" } as unknown as Partial<Settings>);
      const service = makeService(storage);
      await service.reload();

      let emitCount = 0;
      service.observe().subscribe(() => emitCount++);
      const countBefore = emitCount;

      // Reload same content
      await service.reload();
      assert.equal(emitCount, countBefore);
    });
  });

  describe("hot reload", () => {
    it("should detect file changes and reload", async () => {
      const storage = makeStorage();
      await storage.write("global", { proxy: "original" } as unknown as Partial<Settings>);
      const service = makeService(storage);
      await service.reload();

      const handle = service.startWatching();

      // Modify file
      await fsp.writeFile(
        path.join(globalDir, "settings.json"),
        JSON.stringify({ proxy: "changed" }),
        "utf-8",
      );

      // Wait for debounce + reload
      await new Promise((r) => setTimeout(r, 500));
      handle.dispose();

      const config = service.get();
      assert.equal((config.settings as Record<string, unknown>).proxy, "changed");
    });

    it("should cleanup on unsubscribe", async () => {
      const service = makeService();
      service.startWatching();
      service.unsubscribe();
      // Should not throw
    });
  });

  describe("no workspace", () => {
    it("should work without workspace path", async () => {
      const storage = new FileSettingsStorage({
        globalPath: path.join(globalDir, "settings.json"),
      });
      await storage.write("global", { proxy: "global-only" } as unknown as Partial<Settings>);
      const service = new ConfigService({
        storage,
        secretStorage: mockSecretStore,
        workspaceRoot: null,
        homeDir: tmpDir,
        userConfigDir: globalDir,
      });
      await service.reload();
      assert.equal((service.get().settings as Record<string, unknown>).proxy, "global-only");
    });
  });
});
