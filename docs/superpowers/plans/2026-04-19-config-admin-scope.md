# Plan 19: Config Admin Scope + .claude/ Directory (N3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin config scope that reads from a system-level managed settings file (read-only). Add `.claude/` directory discovery to the guidance file search so project-level CLAUDE.md and skills are found automatically.

**Architecture:** Flitter's config system (`packages/data/src/config/`) has two scopes: global and workspace. Amp adds a third "admin" scope that reads from a platform-specific managed settings JSON file. This scope is read-only (cannot be set via CLI). Settings from admin scope take highest precedence. The `.claude/` directory convention provides per-project guidance files (CLAUDE.md, skills/, settings.json).

**Tech Stack:** TypeScript, Bun test runner, `@flitter/data` (ConfigService, FileSettingsStorage, GuidanceLoader)

**Amp reference:**
- `amp-cli-reversed/modules/1275_unknown_sHR.js` -- `sHR()` returns platform-specific admin settings path: `/Library/Application Support/ampcode/managed-settings.json` (macOS), `/etc/ampcode/managed-settings.json` (Linux), `C:\ProgramData\ampcode\managed-settings.json` (Windows)
- `amp-cli-reversed/chunk-002.js:25084-25093` -- `oHR()` reads the file, returns `"{}"` on ENOENT
- `amp-cli-reversed/chunk-005.js:145039-145077` -- `JmT` is a cached async loader with 30s soft TTL, 120s hard TTL. Parses JSON, strips `amp.` prefix from keys, handles `admin.compatibilityDate` specially
- `amp-cli-reversed/modules/1273_unknown_iHR.js` -- `iHR()` wraps settings storage: `get(key, "admin")` or `get(key, undefined)` with key in admin cache returns admin value, otherwise delegates to base storage
- `amp-cli-reversed/modules/0412_unknown_S_0.js:24-25` -- FileSettingsStorage throws on `get(key, "admin")`: "Cannot get admin settings from file storage"
- `amp-cli-reversed/chunk-005.js:86422` -- guidance filenames: `SP = ["AGENTS.md", "Agents.md", "agents.md", "CLAUDE.md", "Agent.md", "agent.md", "CLAUDE.md"]`
- `amp-cli-reversed/chunk-005.js:70814` -- `.claude/**` is in file patterns list

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/data/src/config/admin-settings.ts` | Read-only admin settings loader |
| Modify | `packages/data/src/config/config-service.ts` | Add admin scope to 3-level merge |
| Modify | `packages/data/src/guidance/guidance-loader.ts` | Add .claude/ directory to search paths |
| Create | `packages/data/src/config/__tests__/admin-settings.test.ts` | Admin settings tests |
| Modify | `packages/data/src/guidance/guidance-loader.test.ts` | .claude/ directory discovery tests |

---

### Task 1: Create admin settings reader

**Why first:** The admin settings module is a standalone read-only file reader. ConfigService depends on it.

**Files:**
- Create: `packages/data/src/config/admin-settings.ts`
- Create: `packages/data/src/config/__tests__/admin-settings.test.ts`

**Amp reference:** `amp-cli-reversed/modules/1275_unknown_sHR.js` (path resolution), `amp-cli-reversed/chunk-002.js:25084-25093` (file reading with ENOENT fallback), `amp-cli-reversed/chunk-005.js:145039-145077` (JSON parsing, `amp.` prefix stripping).

- [ ] **Step 1: Write the failing test**

```typescript
// packages/data/src/config/__tests__/admin-settings.test.ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { getAdminSettingsPath, readAdminSettings } from "../admin-settings";

describe("getAdminSettingsPath", () => {
  it("returns platform-specific path", () => {
    const p = getAdminSettingsPath();
    expect(p).not.toBeNull();
    if (process.platform === "darwin") {
      expect(p).toBe("/Library/Application Support/flitter/managed-settings.json");
    } else if (process.platform === "linux") {
      expect(p).toBe("/etc/flitter/managed-settings.json");
    }
    // win32 case handled but not tested on macOS/Linux
  });
});

describe("readAdminSettings", () => {
  const tmpDir = path.join(os.tmpdir(), "flitter-admin-test-" + Date.now());
  const settingsPath = path.join(tmpDir, "managed-settings.json");

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty object when file does not exist", async () => {
    const result = await readAdminSettings("/nonexistent/path.json");
    expect(result).toEqual({});
  });

  it("parses JSON and strips 'flitter.' prefix from keys", async () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      "flitter.model": "claude-opus-4-20250514",
      "flitter.dangerouslyAllowAll": true,
      "unrelated": "ignored"
    }));
    const result = await readAdminSettings(settingsPath);
    expect(result.model).toBe("claude-opus-4-20250514");
    expect(result.dangerouslyAllowAll).toBe(true);
    expect(result.unrelated).toBeUndefined();
  });

  it("returns empty object on invalid JSON", async () => {
    fs.writeFileSync(settingsPath, "not json {{{");
    const result = await readAdminSettings(settingsPath);
    expect(result).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/config/__tests__/admin-settings.test.ts`
Expected: FAIL -- module does not exist.

- [ ] **Step 3: Implement admin-settings.ts**

```typescript
// packages/data/src/config/admin-settings.ts
/**
 * Admin (managed) settings reader -- read-only system-level configuration.
 *
 * 逆向: sHR() (1275_unknown_sHR.js) path resolution,
 *        oHR() (chunk-002.js:25084) file reading,
 *        JmT compute (chunk-005.js:145039) JSON parsing with prefix stripping.
 */
import * as fs from "node:fs/promises";
import type { Settings } from "@flitter/schemas";

/**
 * Get the platform-specific admin settings file path.
 *
 * 逆向: sHR() returns:
 * - macOS: /Library/Application Support/ampcode/managed-settings.json
 * - Linux: /etc/ampcode/managed-settings.json
 * - Windows: C:\ProgramData\ampcode\managed-settings.json
 *
 * Flitter uses "flitter" instead of "ampcode".
 */
export function getAdminSettingsPath(): string | null {
  switch (process.platform) {
    case "darwin":
      return "/Library/Application Support/flitter/managed-settings.json";
    case "linux":
      return "/etc/flitter/managed-settings.json";
    case "win32":
      return "C:\\ProgramData\\flitter\\managed-settings.json";
    default:
      return null;
  }
}

/**
 * Read and parse admin settings from the given path.
 *
 * Returns an empty object on any error (file not found, parse error, etc.).
 * Keys are stripped of the "flitter." prefix to match the Settings shape.
 *
 * 逆向: JmT compute function (chunk-005.js:145039-145077)
 * - Reads file, parses JSON (allows trailing commas in amp via JSONC parser)
 * - Strips "amp." prefix from keys
 * - Returns {} on ENOENT or parse error
 */
export async function readAdminSettings(
  filePath?: string | null,
): Promise<Partial<Settings>> {
  const resolvedPath = filePath ?? getAdminSettingsPath();
  if (!resolvedPath) return {};

  try {
    const raw = await fs.readFile(resolvedPath, "utf-8");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("flitter.")) {
        const stripped = key.substring("flitter.".length);
        result[stripped] = value;
      }
      // Keys without prefix are ignored (matches amp behavior)
    }

    return result as Partial<Settings>;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    return {};
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/config/__tests__/admin-settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/data/src/config/admin-settings.ts packages/data/src/config/__tests__/admin-settings.test.ts
git commit -m "feat(data): add admin settings reader for managed-settings.json

Platform-specific paths: /Library/Application Support/flitter/ (macOS),
/etc/flitter/ (Linux), C:\ProgramData\flitter\ (Windows). Read-only,
strips 'flitter.' prefix, returns {} on any error.

逆向: sHR (1275_unknown_sHR.js), oHR (chunk-002.js:25084), JmT (chunk-005.js:145039)"
```

---

### Task 2: Integrate admin scope into ConfigService

**Why:** ConfigService must merge admin settings as the highest-priority scope.

**Files:**
- Modify: `packages/data/src/config/config-service.ts`
- Test: `packages/data/src/config/__tests__/admin-settings.test.ts` (extend)

**Amp reference:** `amp-cli-reversed/modules/1273_unknown_iHR.js` -- `iHR()` wraps the base settings storage. For `get(key, "admin")` or `get(key, undefined)` where key exists in admin cache, returns admin value. For `keys()`, merges admin keys. For `changes`, merges admin change events.

- [ ] **Step 1: Write the failing test**

Append to admin-settings.test.ts:

```typescript
import { ConfigService } from "../config-service";
import type { FileSettingsStorage } from "../settings-storage";

describe("ConfigService admin scope", () => {
  it("admin settings override global and workspace", async () => {
    // Create a mock FileSettingsStorage
    const mockStorage = {
      get: async (key: string) => {
        if (key === "model") return "claude-haiku-3-5";
        return undefined;
      },
      set: async () => {},
      watch: () => ({ unsubscribe: () => {} }),
      getPath: () => "/tmp/test-settings.json",
      getGlobalPath: () => "/tmp/test-settings.json",
      getWorkspacePath: () => null,
      changes$: { subscribe: () => ({ unsubscribe: () => {} }) },
    } as unknown as FileSettingsStorage;

    const configService = new ConfigService({
      storage: mockStorage,
      secretStorage: { get: async () => undefined, set: async () => {}, delete: async () => {} },
      workspaceRoot: "/tmp/test",
      homeDir: "/tmp",
      userConfigDir: "/tmp/.config/flitter",
      adminSettings: { model: "claude-opus-4-20250514" },
    });

    const config = configService.get();
    expect(config.settings.model).toBe("claude-opus-4-20250514");
  });
});
```

- [ ] **Step 2: Add adminSettings option to ConfigServiceOptions**

In `packages/data/src/config/config-service.ts`, extend `ConfigServiceOptions`:

```typescript
export interface ConfigServiceOptions {
  storage: FileSettingsStorage;
  secretStorage: SecretStore;
  workspaceRoot: string | null;
  homeDir: string;
  userConfigDir: string;
  /** Read-only admin settings (highest priority) */
  adminSettings?: Partial<Settings>;
}
```

- [ ] **Step 3: Merge admin settings in ConfigService.get()**

In the `mergeSettings` or `get()` method, apply admin overrides last:

```typescript
// In the get() method or constructor:
// After merging global + workspace, apply admin overrides
private readonly adminSettings: Partial<Settings>;

constructor(options: ConfigServiceOptions) {
  // ... existing code ...
  this.adminSettings = options.adminSettings ?? {};
}

// In the method that produces Config:
private buildConfig(): Config {
  const globalSettings = this.storage.getGlobal();
  const workspaceSettings = this.storage.getWorkspace();
  const merged = mergeSettings(globalSettings, workspaceSettings);

  // Admin overrides: highest precedence
  // 逆向: iHR wraps get() -- admin keys shadow base
  const withAdmin = { ...merged };
  for (const [key, value] of Object.entries(this.adminSettings)) {
    if (value !== undefined) {
      (withAdmin as Record<string, unknown>)[key] = value;
    }
  }

  return {
    settings: withAdmin as Settings,
    // ... rest of config
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/config/__tests__/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/data/src/config/config-service.ts packages/data/src/config/__tests__/admin-settings.test.ts
git commit -m "feat(data): integrate admin scope into ConfigService

Admin settings override global and workspace with highest precedence.
Passed via adminSettings option (read at container initialization from
managed-settings.json).

逆向: iHR (1273_unknown_iHR.js) wraps settings with admin overlay"
```

---

### Task 3: Add .claude/ directory to guidance discovery

**Why:** Amp searches for AGENTS.md / CLAUDE.md files including in `.claude/` directories.

**Files:**
- Modify: `packages/data/src/guidance/guidance-loader.ts`
- Test: `packages/data/src/guidance/guidance-loader.test.ts` (extend)

**Amp reference:**
- `amp-cli-reversed/chunk-005.js:86422` -- `SP = ["AGENTS.md", "Agents.md", "agents.md", e7T, "Agent.md", "agent.md", "CLAUDE.md"]` where `e7T` resolves to another variant
- `amp-cli-reversed/chunk-005.js:70814` -- `patterns: ["**/.claude/**", "~/.claude/**"]` is in the file patterns
- `amp-cli-reversed/chunk-005.js:158887` -- setting to disable loading skills from `.claude/skills/`

- [ ] **Step 1: Write the failing test**

```typescript
// In guidance-loader.test.ts, add:
describe(".claude/ directory discovery", () => {
  it("discovers CLAUDE.md in .claude/ directory", async () => {
    // Create temp workspace with .claude/CLAUDE.md
    const tmpDir = path.join(os.tmpdir(), "flitter-guidance-test-" + Date.now());
    const claudeDir = path.join(tmpDir, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, "CLAUDE.md"), "# Project instructions\nBe helpful.");

    const loader = new GuidanceLoader();
    const files = await loader.discover({
      workspaceRoot: tmpDir,
      workingDirectory: tmpDir,
    });

    expect(files.some(f => f.path.includes(".claude/CLAUDE.md"))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Add .claude/ to search paths**

In `packages/data/src/guidance/guidance-loader.ts`, in the discovery method that walks directories for guidance files, add `.claude/` as an additional search directory:

```typescript
// After searching in the root directory for AGENTS.md/CLAUDE.md,
// also search in .claude/ subdirectory
// 逆向: amp SP list includes CLAUDE.md, amp patterns include **/.claude/**
const claudeDir = path.join(dir, ".claude");
try {
  const stat = await fsp.stat(claudeDir);
  if (stat.isDirectory()) {
    for (const filename of SEARCH_FILENAMES) {
      const filePath = path.join(claudeDir, filename);
      try {
        const content = await fsp.readFile(filePath, "utf-8");
        results.push({
          path: filePath,
          type: "project" as GuidanceType,
          content: content.slice(0, maxBytes),
          // ... other fields
        });
      } catch {
        // File doesn't exist, skip
      }
    }
  }
} catch {
  // .claude/ doesn't exist, skip
}
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/guidance/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/data/src/guidance/guidance-loader.ts packages/data/src/guidance/guidance-loader.test.ts
git commit -m "feat(data): add .claude/ directory to guidance file discovery

Searches for AGENTS.md/CLAUDE.md in .claude/ subdirectory of each
ancestor directory up to workspace root.

逆向: amp SP filename list (chunk-005.js:86422), .claude/** patterns (chunk-005.js:70814)"
```

---

### Task 4: Wire admin settings into container creation

**Why:** The container must read admin settings at startup and pass them to ConfigService.

**Files:**
- Modify: `packages/flitter/src/container.ts`
- Modify: `packages/cli/src/main.ts`

- [ ] **Step 1: Read admin settings in main.ts**

In `packages/cli/src/main.ts`, before `createContainer()`:

```typescript
import { readAdminSettings } from "@flitter/data";

// Inside ensureContainer():
const adminSettings = await readAdminSettings();
container = await createContainer({
  // ... existing opts ...
  adminSettings,
});
```

- [ ] **Step 2: Pass adminSettings through ContainerOptions to ConfigService**

In `packages/flitter/src/container.ts`, add `adminSettings` to `ContainerOptions` and pass to ConfigService constructor.

- [ ] **Step 3: Run type check and all tests**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/data/tsconfig.json && bun test packages/data/`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/flitter/src/container.ts packages/cli/src/main.ts
git commit -m "feat(flitter): wire admin settings into container creation

readAdminSettings() is called at startup, result passed through
ContainerOptions to ConfigService for highest-precedence overrides.

逆向: amp S8 calls iHR(t) (modules/2002_unknown_S8.js:70)"
```
