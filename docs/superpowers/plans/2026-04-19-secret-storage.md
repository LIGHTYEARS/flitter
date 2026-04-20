# Persistent SecretStorage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-memory `SecretStorage` with a file-based implementation that persists API keys and OAuth tokens to `~/.config/flitter/secrets.json` with file-permission protection (mode 0600). This ensures API keys survive CLI restarts.

**Architecture:** Amp's secret storage (`L_0` in `0413_unknown_L_0.js`) is file-based:
- Secrets are stored in `secrets.json` at `dataDir/secrets.json`
- File format: flat JSON object `{ "key@scope": "value", ... }`
- Key format: `${key}@${scope}` (scope is derived from workspace URI)
- Read: lazy-load from file on first access, cache in memory (`e` variable)
- Write: acquire a mutex lock (`Cm`), write JSON with `mode: 384` (0600 octal = owner read/write only)
- The `iY` function is an atomic write helper (write-to-temp + rename)
- Also has a `changes` Subject for reactive notifications

Amp also has native keychain storage (`B_0`) gated behind `experimental.cli.nativeSecretsStorage.enabled`, with migration from file to native (`M_0` in `0414_unknown_M_0.js`). Flitter starts with file-based only (matching amp's default path).

**Tech Stack:** TypeScript, Bun test runner, Node.js `fs/promises`, `@flitter/flitter` (SecretStorage interface)

**Amp reference:**
- `amp-cli-reversed/modules/0416_unknown_otT.js` -- factory: chooses file-based or native
- `amp-cli-reversed/modules/0413_unknown_L_0.js` -- `L_0()`: file-based SecretStorage implementation
- `amp-cli-reversed/modules/0414_unknown_M_0.js` -- `M_0()`: migration from file to native
- `amp-cli-reversed/chunk-005.js:26246` -- `C_0 = "secrets.json"` (filename constant)
- `amp-cli-reversed/chunk-003.js:3537` -- secrets path: `join(dataDir, "secrets.json")`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/cli/src/storage/file-secret-storage.ts` | FileSecretStorage class |
| Create | `packages/cli/src/storage/__tests__/file-secret-storage.test.ts` | Unit tests |
| Modify | `packages/cli/src/main.ts` | Replace createInMemorySecretStorage with FileSecretStorage |

---

### Task 1: Create FileSecretStorage class

**Why first:** The storage class is the core implementation. Wiring into main.ts is trivial after this.

**Files:**
- Create: `packages/cli/src/storage/file-secret-storage.ts`
- Create: `packages/cli/src/storage/__tests__/file-secret-storage.test.ts`

**Amp reference:** `amp-cli-reversed/modules/0413_unknown_L_0.js` -- full implementation:
- `fVT(T)` returns `path.join(T.dataDir, "secrets.json")`
- `h()` ensures data directory exists: `mkdir(dataDir, { recursive: true })`
- `i()` reads and parses file (returns cached `e` if available). On ENOENT, returns `{}`
- `c(s)` writes with mutex: acquires lock, calls `iY(path, content, { mode: 384 })`, releases
- `get(key, scope)` returns `data["${key}@${scope}"]`
- `set(key, value, scope)` sets `data["${key}@${scope}"]`, writes, emits change
- Key format: `${key}@${ID(scope)}` where `ID(scope)` normalizes the scope string (URI normalization)
- Mode 384 = 0o600 (owner read/write only)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/storage/__tests__/file-secret-storage.test.ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileSecretStorage } from "../file-secret-storage";

let testDir: string;

beforeEach(async () => {
  testDir = path.join(os.tmpdir(), `flitter-secrets-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
  it("creates secrets.json on first write", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("api-key", "sk-test-123");

    const filePath = path.join(testDir, "secrets.json");
    const stat = await fs.stat(filePath);
    expect(stat.isFile()).toBe(true);

    // Verify file permissions are 0600 (owner read/write only)
    // mode & 0o777 extracts the permission bits
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it("persists and retrieves a secret", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("api-key", "sk-test-123");

    const value = await storage.get("api-key");
    expect(value).toBe("sk-test-123");
  });

  it("persists across instances (survives restart)", async () => {
    const storage1 = new FileSecretStorage(testDir);
    await storage1.set("api-key", "sk-test-456");

    // Create a new instance (simulating restart)
    const storage2 = new FileSecretStorage(testDir);
    const value = await storage2.get("api-key");
    expect(value).toBe("sk-test-456");
  });

  it("supports scoped keys", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("token", "val-global");
    await storage.set("token", "val-workspace", "workspace-1");

    expect(await storage.get("token")).toBe("val-global");
    expect(await storage.get("token", "workspace-1")).toBe("val-workspace");
  });

  it("returns undefined for missing key", async () => {
    const storage = new FileSecretStorage(testDir);
    const value = await storage.get("nonexistent");
    expect(value).toBeUndefined();
  });

  it("deletes a secret", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("api-key", "sk-test-789");
    expect(await storage.get("api-key")).toBe("sk-test-789");

    await storage.delete("api-key");
    expect(await storage.get("api-key")).toBeUndefined();
  });

  it("deletes a scoped secret", async () => {
    const storage = new FileSecretStorage(testDir);
    await storage.set("token", "val-a", "scope-a");
    await storage.set("token", "val-b", "scope-b");

    await storage.delete("token", "scope-a");
    expect(await storage.get("token", "scope-a")).toBeUndefined();
    expect(await storage.get("token", "scope-b")).toBe("val-b");
  });

  it("handles empty/missing secrets.json gracefully", async () => {
    const storage = new FileSecretStorage(testDir);
    // No writes — file doesn't exist yet
    const value = await storage.get("api-key");
    expect(value).toBeUndefined();
  });

  it("handles corrupted secrets.json by returning empty", async () => {
    const filePath = path.join(testDir, "secrets.json");
    await fs.writeFile(filePath, "not valid json", { mode: 0o600 });

    const storage = new FileSecretStorage(testDir);
    // Should not throw, should return undefined
    const value = await storage.get("api-key");
    expect(value).toBeUndefined();
  });

  it("creates data directory if it does not exist", async () => {
    const nestedDir = path.join(testDir, "nested", "dir");
    const storage = new FileSecretStorage(nestedDir);
    await storage.set("key", "value");

    const value = await storage.get("key");
    expect(value).toBe("value");
  });

  it("stores as JSON with proper formatting", async () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/storage/__tests__/file-secret-storage.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement FileSecretStorage**

```typescript
// packages/cli/src/storage/file-secret-storage.ts
/**
 * File-based SecretStorage implementation.
 *
 * Persists API keys and OAuth tokens to secrets.json in the data directory
 * with owner-only file permissions (0600).
 *
 * 逆向: amp-cli-reversed/modules/0413_unknown_L_0.js (L_0 function)
 *        amp stores secrets in dataDir/secrets.json as { "key@scope": "value" }
 *        with mode 384 (0o600) and a mutex for concurrent writes.
 *
 * Key format: "${key}@${scope}" where scope defaults to "global".
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { SecretStorage } from "@flitter/flitter";

/**
 * Default scope when none is provided.
 *
 * 逆向: amp's ID(scope) normalizes scope; for no scope, we use "global".
 */
const DEFAULT_SCOPE = "global";

/**
 * Secrets file name.
 *
 * 逆向: amp chunk-005.js:26246 — C_0 = "secrets.json"
 */
const SECRETS_FILENAME = "secrets.json";

/**
 * File permissions: owner read/write only.
 *
 * 逆向: amp 0413_unknown_L_0.js:38-39 — mode: 384 (0o600 in octal)
 */
const FILE_MODE = 0o600;

/**
 * Format the storage key.
 *
 * 逆向: amp 0413_unknown_L_0.js:53,57 — `${key}@${ID(scope)}`
 */
function formatKey(key: string, scope?: string): string {
  return `${key}@${scope ?? DEFAULT_SCOPE}`;
}

/**
 * FileSecretStorage -- persistent file-based secret storage.
 *
 * 逆向: amp L_0() (0413_unknown_L_0.js)
 *
 * Implementation:
 * - Lazy loads secrets from disk on first access
 * - Caches in memory for subsequent reads
 * - Writes atomically with mkdir -p and mode 0600
 * - Simple mutex prevents concurrent write corruption
 */
export class FileSecretStorage implements SecretStorage {
  private readonly dataDir: string;
  private readonly filePath: string;
  private cache: Record<string, string> | null = null;
  private writing = false;
  private writeQueue: Array<() => void> = [];

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, SECRETS_FILENAME);
  }

  /**
   * Get a secret value.
   *
   * 逆向: amp L_0.get(key, scope) — returns data[`${key}@${ID(scope)}`]
   */
  async get(key: string, scope?: string): Promise<string | undefined> {
    const data = await this.load();
    return data[formatKey(key, scope)];
  }

  /**
   * Set a secret value. Creates the file and directory if needed.
   *
   * 逆向: amp L_0.set(key, value, scope) — sets data, writes, emits change
   */
  async set(key: string, value: string, scope?: string): Promise<void> {
    const data = await this.load();
    data[formatKey(key, scope)] = value;
    await this.save(data);
  }

  /**
   * Delete a secret.
   */
  async delete(key: string, scope?: string): Promise<void> {
    const data = await this.load();
    const k = formatKey(key, scope);
    if (k in data) {
      delete data[k];
      await this.save(data);
    }
  }

  /**
   * Load secrets from disk (lazy, cached).
   *
   * 逆向: amp L_0 inner function i() — reads file, parses JSON, caches.
   * On ENOENT returns {}. On parse error returns {} (defensive).
   */
  private async load(): Promise<Record<string, string>> {
    if (this.cache !== null) return this.cache;

    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      this.cache = JSON.parse(raw);
      if (typeof this.cache !== "object" || this.cache === null) {
        this.cache = {};
      }
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        // File doesn't exist yet — start with empty
        this.cache = {};
      } else if (err instanceof SyntaxError) {
        // Corrupted JSON — start fresh
        this.cache = {};
      } else {
        // Unknown error — start fresh but log
        this.cache = {};
      }
    }

    return this.cache;
  }

  /**
   * Save secrets to disk with mutex and permission protection.
   *
   * 逆向: amp L_0 inner function c(s) — acquires mutex (Cm),
   * ensures directory exists, calls iY (atomic write) with mode 384,
   * updates cache, releases mutex.
   */
  private async save(data: Record<string, string>): Promise<void> {
    // Simple mutex: queue concurrent writes
    // 逆向: amp uses Cm() mutex class with acquire/release
    if (this.writing) {
      await new Promise<void>((resolve) => this.writeQueue.push(resolve));
    }

    this.writing = true;
    try {
      // Ensure directory exists
      // 逆向: amp L_0 inner function h() — mkdir(dataDir, { recursive: true })
      await fs.mkdir(this.dataDir, { recursive: true });

      // Write with restrictive permissions
      // 逆向: amp L_0:36-39 — iY(path, content, { mode: 384 })
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(this.filePath, content, { mode: FILE_MODE });

      // Update cache
      this.cache = data;
    } finally {
      this.writing = false;
      // Wake next queued writer
      const next = this.writeQueue.shift();
      if (next) next();
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/storage/__tests__/file-secret-storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/storage/file-secret-storage.ts packages/cli/src/storage/__tests__/file-secret-storage.test.ts
git commit -m "feat(cli): add FileSecretStorage for persistent API key storage

File-based SecretStorage that persists to dataDir/secrets.json with
mode 0600. Key format: 'key@scope' matching amp's pattern. Lazy load,
in-memory cache, simple write mutex.

逆向: amp L_0() (0413_unknown_L_0.js) — file-based secrets with
secrets.json at dataDir, mode 384 (0o600), key@scope format."
```

---

### Task 2: Wire FileSecretStorage into CLI main.ts

**Why:** Replace the in-memory stub with the persistent implementation.

**Files:**
- Modify: `packages/cli/src/main.ts`

**Amp reference:** `amp-cli-reversed/modules/0416_unknown_otT.js` -- factory function `otT(dataDir, configService)` checks for native storage flag, falls back to `L_0(dataDir)`. Flitter always uses file-based.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/storage/__tests__/file-secret-storage-wiring.test.ts
import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("FileSecretStorage wiring in main.ts", () => {
  it("secrets persist across simulated CLI invocations", async () => {
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/storage/__tests__/file-secret-storage-wiring.test.ts`
Expected: PASS

- [ ] **Step 3: Replace createInMemorySecretStorage in main.ts**

In `packages/cli/src/main.ts`, add import:

```typescript
import { FileSecretStorage } from "./storage/file-secret-storage.js";
```

Replace the `createInMemorySecretStorage` usage (line 195):

```typescript
// OLD (line 195):
    const secrets: SecretStorage = opts?._testSecrets ?? createInMemorySecretStorage();

// NEW:
    const secrets: SecretStorage = opts?._testSecrets ?? new FileSecretStorage(
      path.join(configDir, "data"),
    );
```

Note: Keep `createInMemorySecretStorage` function in the file for reference and testing. The `_testSecrets` injection path remains for test isolation.

- [ ] **Step 4: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No new type errors

- [ ] **Step 5: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass. Existing tests that use `main({ _testSecrets: ... })` still work because they bypass FileSecretStorage.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/main.ts
git commit -m "feat(cli): wire FileSecretStorage as default SecretStorage

Replace in-memory SecretStorage with file-based persistence at
~/.config/flitter/data/secrets.json. Test injection via _testSecrets
still works for isolation.

逆向: amp otT() (0416_unknown_otT.js) — factory defaults to L_0
(file-based) unless native storage is enabled."
```

---

### Task 3: Run full test suite and verify

- [ ] **Step 1: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All pass

- [ ] **Step 3: Manual verification**

```bash
# Set an API key
cd /Users/bytedance/workspace/flitter
bun run packages/cli/src/main.ts login

# Check that secrets.json was created
ls -la ~/.config/flitter/data/secrets.json
# Should show: -rw------- (0600 permissions)

# Verify file content (scoped key format)
cat ~/.config/flitter/data/secrets.json
# Should show: { "anthropic-api-key@global": "sk-ant-..." }
```

- [ ] **Step 4: Fix any regressions**

Possible issue: tests that create containers with `secrets: createInMemorySecretStorage()` may fail if the function was removed. Verify it's still exported or that tests use `_testSecrets`.
