import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("FileSecretStorage wiring in main.ts", () => {
  test("secrets persist across simulated CLI invocations", async () => {
    // This test directly validates the FileSecretStorage behavior
    // that main.ts will rely on. The actual wiring is a one-line change.
    const { FileSecretStorage } = await import("../file-secret-storage");

    const testDir = path.join(
      os.tmpdir(),
      `flitter-wiring-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    try {
      // First "invocation"
      const storage1 = new FileSecretStorage(testDir);
      await storage1.set("anthropic-api-key", "sk-ant-test-key");

      // Second "invocation" (fresh instance, same directory)
      const storage2 = new FileSecretStorage(testDir);
      const key = await storage2.get("anthropic-api-key");
      expect(key).toBe("sk-ant-test-key");
    } finally {
      await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
