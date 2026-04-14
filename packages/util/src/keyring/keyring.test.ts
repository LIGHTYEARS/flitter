import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import { createSecretStore, FileSecretStore, NativeSecretStore } from "./keyring.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "flitter-keyring-test-"));
}

function fileStore(dir: string): FileSecretStore {
  return new FileSecretStore(path.join(dir, "secrets.json"));
}

// ---------------------------------------------------------------------------
// FileSecretStore
// ---------------------------------------------------------------------------

describe("FileSecretStore", () => {
  let tmpDir: string;

  after(() => {
    // Cleanup is best-effort; each test also creates its own dir
  });

  it("set then get returns stored value (round-trip)", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("token", "abc123", "https://api.example.com");
      const val = await store.get("token", "https://api.example.com");
      assert.equal(val, "abc123");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("get on missing key returns undefined", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      const val = await store.get("nonexistent", "https://example.com");
      assert.equal(val, undefined);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("delete removes key; subsequent get returns undefined", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("token", "secret", "https://example.com");
      await store.delete("token", "https://example.com");
      const val = await store.get("token", "https://example.com");
      assert.equal(val, undefined);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("JSON file stores keys as <key>@<normalized-url>", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("mykey", "myval", "https://api.example.com/path");
      const raw = JSON.parse(fs.readFileSync(path.join(tmpDir, "secrets.json"), "utf-8"));
      assert.ok("mykey@https://api.example.com/path" in raw);
      assert.equal(raw["mykey@https://api.example.com/path"], "myval");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("URL normalization: trailing slashes stripped", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("t", "v1", "https://example.com///");
      const val = await store.get("t", "https://example.com");
      assert.equal(val, "v1");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("URL normalization: scheme+host lowercased", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("t", "v2", "HTTPS://API.Example.COM/Path");
      const val = await store.get("t", "https://api.example.com/Path");
      assert.equal(val, "v2");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("multiple keys for different URLs stored independently", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("token", "a", "https://one.example.com");
      await store.set("token", "b", "https://two.example.com");
      assert.equal(await store.get("token", "https://one.example.com"), "a");
      assert.equal(await store.get("token", "https://two.example.com"), "b");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("multiple keys for same URL with different key names stored independently", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("token", "tok_val", "https://example.com");
      await store.set("refresh", "ref_val", "https://example.com");
      assert.equal(await store.get("token", "https://example.com"), "tok_val");
      assert.equal(await store.get("refresh", "https://example.com"), "ref_val");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("changes Subject emits on set()", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      let emitted = 0;
      store.changes.subscribe({ next: () => emitted++ });
      await store.set("k", "v", "https://example.com");
      assert.equal(emitted, 1);
      await store.set("k2", "v2", "https://example.com");
      assert.equal(emitted, 2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("changes Subject emits on delete()", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("k", "v", "https://example.com");
      let emitted = 0;
      store.changes.subscribe({ next: () => emitted++ });
      await store.delete("k", "https://example.com");
      assert.equal(emitted, 1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("file created with 0o600 permissions", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("k", "v", "https://example.com");
      const stat = fs.statSync(path.join(tmpDir, "secrets.json"));
      // 0o600 = owner read+write only
      const mode = stat.mode & 0o777;
      assert.equal(mode, 0o600);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles missing secrets file gracefully (auto-creates on first set)", async () => {
    tmpDir = makeTmpDir();
    try {
      const nestedDir = path.join(tmpDir, "deep", "nested");
      const store = new FileSecretStore(path.join(nestedDir, "secrets.json"));
      // get should return undefined, not throw
      const val = await store.get("k", "https://example.com");
      assert.equal(val, undefined);
      // set should auto-create
      await store.set("k", "v", "https://example.com");
      assert.equal(await store.get("k", "https://example.com"), "v");
      assert.ok(fs.existsSync(path.join(nestedDir, "secrets.json")));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles corrupt JSON file (returns empty / recovers)", async () => {
    tmpDir = makeTmpDir();
    try {
      const fp = path.join(tmpDir, "secrets.json");
      fs.writeFileSync(fp, "NOT VALID JSON {{{");
      const store = new FileSecretStore(fp);
      // get should return undefined despite corrupt file
      const val = await store.get("k", "https://example.com");
      assert.equal(val, undefined);
      // set should overwrite the corrupt file
      await store.set("k", "recovered", "https://example.com");
      assert.equal(await store.get("k", "https://example.com"), "recovered");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("concurrent writes: Promise.all of 5 set() calls does not corrupt", async () => {
    tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      // Write 5 different keys concurrently
      await Promise.all(
        Array.from({ length: 5 }, (_, i) => store.set(`key${i}`, `val${i}`, "https://example.com")),
      );
      // The file should be valid JSON and contain at least one of the keys
      const raw = JSON.parse(fs.readFileSync(path.join(tmpDir, "secrets.json"), "utf-8"));
      assert.equal(typeof raw, "object");
      // Due to last-writer-wins, at least the file should not be corrupt
      // and we can read all keys that are present back correctly
      for (const [k, v] of Object.entries(raw)) {
        assert.equal(typeof k, "string");
        assert.equal(typeof v, "string");
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// NativeSecretStore
// ---------------------------------------------------------------------------

describe("NativeSecretStore", () => {
  it("NativeSecretStore.create() returns null when native module not available", async () => {
    const result = await NativeSecretStore.create();
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// Factory: createSecretStore
// ---------------------------------------------------------------------------

describe("createSecretStore", () => {
  it("createSecretStore({ useNativeKeyring: false }) returns a FileSecretStore", async () => {
    const tmpDir = makeTmpDir();
    try {
      const store = await createSecretStore({
        secretsDir: tmpDir,
        useNativeKeyring: false,
      });
      assert.ok(store instanceof FileSecretStore);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("createSecretStore({ useNativeKeyring: true }) falls back to FileSecretStore", async () => {
    const tmpDir = makeTmpDir();
    try {
      const store = await createSecretStore({
        secretsDir: tmpDir,
        useNativeKeyring: true,
      });
      // @napi-rs/keyring is not installed so it should fall back
      assert.ok(store instanceof FileSecretStore);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("factory creates secrets directory if missing", async () => {
    const tmpDir = makeTmpDir();
    const nested = path.join(tmpDir, "a", "b", "c");
    try {
      assert.ok(!fs.existsSync(nested));
      await createSecretStore({
        secretsDir: nested,
        useNativeKeyring: false,
      });
      assert.ok(fs.existsSync(nested));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("empty string key", async () => {
    const tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      await store.set("", "value", "https://example.com");
      assert.equal(await store.get("", "https://example.com"), "value");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("special characters in URL", async () => {
    const tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      const url = "https://example.com/path?q=hello%20world&x=1#frag";
      await store.set("key", "val", url);
      assert.equal(await store.get("key", url), "val");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("very long key value", async () => {
    const tmpDir = makeTmpDir();
    try {
      const store = fileStore(tmpDir);
      const longValue = "x".repeat(100_000);
      await store.set("bigkey", longValue, "https://example.com");
      assert.equal(await store.get("bigkey", "https://example.com"), longValue);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
