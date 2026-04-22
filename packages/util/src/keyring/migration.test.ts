import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { Subject } from "../reactive/index.ts";
import type { SecretStore } from "./keyring.ts";
import { migrateSecretsToKeychain } from "./keyring.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "flitter-migration-test-"));
}

/** In-memory SecretStore for testing — records all set() calls. */
function createMockNativeStore(): SecretStore & {
  stored: Map<string, { key: string; value: string; url: string }>;
} {
  const stored = new Map<string, { key: string; value: string; url: string }>();
  const changes = new Subject<void>();
  return {
    stored,
    changes,
    async get(key: string, url: string) {
      const entry = stored.get(`${key}@${url}`);
      return entry?.value;
    },
    async set(key: string, value: string, url: string) {
      stored.set(`${key}@${url}`, { key, value, url });
      changes.next();
    },
    async delete(key: string, url: string) {
      stored.delete(`${key}@${url}`);
      changes.next();
    },
  };
}

// ---------------------------------------------------------------------------
// migrateSecretsToKeychain
// ---------------------------------------------------------------------------

describe("migrateSecretsToKeychain", () => {
  it("returns empty when file doesn't exist", async () => {
    const tmpDir = makeTmpDir();
    try {
      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(
        path.join(tmpDir, "nonexistent.json"),
        nativeStore,
      );
      assert.deepEqual(result, { migrated: [], removed: false });
      assert.equal(nativeStore.stored.size, 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("migrates all entries and deletes file", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      const secrets = {
        "apiKey@https://api.example.com": "sk-abc123",
        "token@https://other.example.com": "tok-xyz789",
      };
      fs.writeFileSync(secretsFile, JSON.stringify(secrets));

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      assert.equal(result.migrated.length, 2);
      assert.ok(result.migrated.includes("apiKey@https://api.example.com"));
      assert.ok(result.migrated.includes("token@https://other.example.com"));
      assert.equal(result.removed, true);
      assert.ok(!fs.existsSync(secretsFile), "secrets file should be deleted");

      // Verify the native store received the correct key/value/url
      assert.equal(nativeStore.stored.size, 2);
      const apiEntry = nativeStore.stored.get("apiKey@https://api.example.com");
      assert.ok(apiEntry);
      assert.equal(apiEntry.key, "apiKey");
      assert.equal(apiEntry.value, "sk-abc123");
      assert.equal(apiEntry.url, "https://api.example.com");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("parses composed key correctly (key@url format)", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      // Key with @ in the URL path — regex is greedy so should split at last @
      // Actually /^(.+)@(.+)$/ is greedy: "a@b@c" -> key="a@b", url="c"
      const secrets = {
        "myKey@https://api.example.com/path": "secret-value",
      };
      fs.writeFileSync(secretsFile, JSON.stringify(secrets));

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      assert.equal(result.migrated.length, 1);
      const entry = nativeStore.stored.get("myKey@https://api.example.com/path");
      assert.ok(entry);
      assert.equal(entry.key, "myKey");
      assert.equal(entry.url, "https://api.example.com/path");
      assert.equal(entry.value, "secret-value");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("skips malformed keys (no @ separator)", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      const secrets = {
        "no-at-sign": "value1",
        "valid@https://example.com": "value2",
      };
      fs.writeFileSync(secretsFile, JSON.stringify(secrets));

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      // Only the valid key should be migrated
      assert.equal(result.migrated.length, 1);
      assert.ok(result.migrated.includes("valid@https://example.com"));
      assert.equal(result.removed, true); // file deleted because migrated.length > 0
      assert.equal(nativeStore.stored.size, 1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("skips non-string values", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      // Write raw JSON with a non-string value
      const data = {
        "key1@https://example.com": "valid-string",
        "key2@https://example.com": 12345,
        "key3@https://example.com": null,
      };
      fs.writeFileSync(secretsFile, JSON.stringify(data));

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      assert.equal(result.migrated.length, 1);
      assert.ok(result.migrated.includes("key1@https://example.com"));
      assert.equal(nativeStore.stored.size, 1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles empty secrets file (no keys)", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      fs.writeFileSync(secretsFile, JSON.stringify({}));

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      assert.deepEqual(result, { migrated: [], removed: false });
      assert.equal(nativeStore.stored.size, 0);
      // File should still exist — nothing was migrated
      assert.ok(fs.existsSync(secretsFile));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles corrupt JSON gracefully", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      fs.writeFileSync(secretsFile, "NOT VALID JSON {{{");

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      assert.deepEqual(result, { migrated: [], removed: false });
      assert.equal(nativeStore.stored.size, 0);
      // File should still exist — migration was not attempted
      assert.ok(fs.existsSync(secretsFile));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles key with multiple @ signs (greedy regex)", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      // "user@domain@https://example.com" — greedy (.+) captures "user@domain"
      const secrets = {
        "user@domain@https://example.com": "secret",
      };
      fs.writeFileSync(secretsFile, JSON.stringify(secrets));

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      assert.equal(result.migrated.length, 1);
      // The greedy .+ in /^(.+)@(.+)$/ means last @ is the split point
      const entry = nativeStore.stored.get("user@domain@https://example.com");
      assert.ok(entry);
      assert.equal(entry.key, "user@domain");
      assert.equal(entry.url, "https://example.com");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not delete file when all keys are malformed", async () => {
    const tmpDir = makeTmpDir();
    try {
      const secretsFile = path.join(tmpDir, "secrets.json");
      const secrets = {
        "no-at-here": "value1",
        "also-no-at": "value2",
      };
      fs.writeFileSync(secretsFile, JSON.stringify(secrets));

      const nativeStore = createMockNativeStore();
      const result = await migrateSecretsToKeychain(secretsFile, nativeStore);

      assert.deepEqual(result, { migrated: [], removed: false });
      assert.ok(fs.existsSync(secretsFile), "file should still exist");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
