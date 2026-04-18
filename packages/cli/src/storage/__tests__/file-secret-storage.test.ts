import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileSecretStorage } from "../file-secret-storage";

let testDir: string;

beforeEach(async () => {
  testDir = path.join(
    os.tmpdir(),
    `flitter-secrets-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await fs.mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("FileSecretStorage", () => {
  test("creates secrets.json on first write", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("api-key", "sk-test-123");

    const filePath = path.join(testDir, "secrets.json");
    const stat = await fs.stat(filePath);
    expect(stat.isFile()).toBe(true);

    // Verify file permissions are 0600 (owner read/write only)
    // mode & 0o777 extracts the permission bits
    expect(stat.mode & 0o777).toBe(0o600);
  });

  test("persists and retrieves a secret", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("api-key", "sk-test-123");

    const value = await storage.get("api-key");
    expect(value).toBe("sk-test-123");
  });

  test("persists across instances (survives restart)", async () => {
    const storage1 = new FileSecretStorage(testDir);
    await storage1.set("api-key", "sk-test-456");

    // Create a new instance (simulating restart)
    const storage2 = new FileSecretStorage(testDir);
    const value = await storage2.get("api-key");
    expect(value).toBe("sk-test-456");
  });

  test("supports scoped keys", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("token", "val-global");
    await storage.set("token", "val-workspace", "workspace-1");

    expect(await storage.get("token")).toBe("val-global");
    expect(await storage.get("token", "workspace-1")).toBe("val-workspace");
  });

  test("returns undefined for missing key", async () => {
    const storage = new FileSecretStorage(testDir);
    const value = await storage.get("nonexistent");
    expect(value).toBeUndefined();
  });

  test("deletes a secret", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("api-key", "sk-test-789");
    expect(await storage.get("api-key")).toBe("sk-test-789");

    await storage.delete("api-key");
    expect(await storage.get("api-key")).toBeUndefined();
  });

  test("deletes a scoped secret", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("token", "val-a", "scope-a");
    await storage.set("token", "val-b", "scope-b");

    await storage.delete("token", "scope-a");
    expect(await storage.get("token", "scope-a")).toBeUndefined();
    expect(await storage.get("token", "scope-b")).toBe("val-b");
  });

  test("handles empty/missing secrets.json gracefully", async () => {
    const storage = new FileSecretStorage(testDir);
    // No writes — file doesn't exist yet
    const value = await storage.get("api-key");
    expect(value).toBeUndefined();
  });

  test("handles corrupted secrets.json by returning empty", async () => {
    const filePath = path.join(testDir, "secrets.json");
    await fs.writeFile(filePath, "not valid json", { mode: 0o600 });

    const storage = new FileSecretStorage(testDir);
    // Should not throw, should return undefined
    const value = await storage.get("api-key");
    expect(value).toBeUndefined();
  });

  test("creates data directory if it does not exist", async () => {
    const nestedDir = path.join(testDir, "nested", "dir");
    const storage = new FileSecretStorage(nestedDir);
    await storage.set("key", "value");

    const value = await storage.get("key");
    expect(value).toBe("value");
  });

  test("stores as JSON with proper formatting", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("key1", "val1");
    await storage.set("key2", "val2", "scope");

    const filePath = path.join(testDir, "secrets.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    // Key format matches amp: key@scope
    expect(parsed["key1@global"]).toBe("val1");
    expect(parsed["key2@scope"]).toBe("val2");
  });
});
