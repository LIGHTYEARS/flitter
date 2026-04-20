# Plan 20: Memory System (N4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cross-session memory persistence. Users can store and recall facts via a `/memory` slash command. Stored memories are automatically injected into the system prompt for future sessions.

**Architecture:** A `MemoryStore` service provides file-based persistence for key-value memory entries. Each entry has a key, value, and timestamp. The store is backed by a JSON file in the user's config directory (`~/.config/flitter/memory.json`). A `/memory` slash command allows users to add, list, and remove memories. At system prompt build time, all active memories are collected and appended as a context block.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/data` (MemoryStore), `@flitter/agent-core` (context blocks, slash commands), `@flitter/flitter` (container wiring)

**Amp reference:** Amp has a `ThreadWorkerService.memoryCheck` span name (`chunk-002.js:22958`) and various `memoryUsage` telemetry fields, but no user-facing `/memory` command or persistent fact store in the reversed source. The reversed code does not contain `MemoryStore`, `memoryFacts`, or `persistent.*fact` patterns. Amp's memory system may be server-side or not yet reversed.

**Note:** No clear amp reference for user-facing memory. This is modeled after Claude Code's memory system (MEMORY.md files in `~/.claude/` directories). The Flitter implementation uses structured JSON storage rather than markdown files, but produces the same user experience: facts persist across sessions and appear in the system prompt.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/data/src/memory/memory-store.ts` | File-based memory persistence |
| Create | `packages/data/src/memory/memory-types.ts` | Memory entry types |
| Create | `packages/data/src/memory/__tests__/memory-store.test.ts` | Unit tests |
| Create | `packages/agent-core/src/commands/memory-command.ts` | /memory slash command handler |
| Create | `packages/agent-core/src/commands/__tests__/memory-command.test.ts` | Slash command tests |
| Modify | `packages/agent-core/src/prompt/context-blocks.ts` | Add memory context block |
| Modify | `packages/flitter/src/container.ts` | Wire MemoryStore into container |
| Modify | `packages/data/src/index.ts` | Export MemoryStore |

---

### Task 1: Define memory types and create MemoryStore

**Why first:** All other tasks depend on the storage layer.

**Files:**
- Create: `packages/data/src/memory/memory-types.ts`
- Create: `packages/data/src/memory/memory-store.ts`
- Create: `packages/data/src/memory/__tests__/memory-store.test.ts`

- [ ] **Step 1: Define types**

```typescript
// packages/data/src/memory/memory-types.ts
/**
 * Memory entry -- a single persistent fact.
 */
export interface MemoryEntry {
  /** Unique key for the memory (user-provided or auto-generated) */
  key: string;
  /** The memory content (text) */
  value: string;
  /** When this memory was created (ISO 8601) */
  createdAt: string;
  /** When this memory was last updated (ISO 8601) */
  updatedAt: string;
  /** Optional source context (e.g., thread ID where it was created) */
  source?: string;
}

/**
 * Serialized memory store format (JSON file).
 */
export interface MemoryStoreData {
  version: 1;
  entries: MemoryEntry[];
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// packages/data/src/memory/__tests__/memory-store.test.ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { MemoryStore } from "../memory-store";

describe("MemoryStore", () => {
  const tmpDir = path.join(os.tmpdir(), "flitter-memory-test-" + Date.now());
  const storePath = path.join(tmpDir, "memory.json");

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("starts with empty entries when file does not exist", async () => {
    const store = new MemoryStore(storePath);
    const entries = await store.list();
    expect(entries).toEqual([]);
  });

  it("add() persists a memory entry", async () => {
    const store = new MemoryStore(storePath);
    await store.add("test-key", "Test value");
    const entries = await store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("test-key");
    expect(entries[0].value).toBe("Test value");
  });

  it("add() updates existing key", async () => {
    const store = new MemoryStore(storePath);
    await store.add("key1", "first");
    await store.add("key1", "second");
    const entries = await store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe("second");
  });

  it("remove() deletes a memory entry", async () => {
    const store = new MemoryStore(storePath);
    await store.add("key1", "value1");
    await store.add("key2", "value2");
    await store.remove("key1");
    const entries = await store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("key2");
  });

  it("get() retrieves a specific entry", async () => {
    const store = new MemoryStore(storePath);
    await store.add("key1", "value1");
    const entry = await store.get("key1");
    expect(entry).not.toBeNull();
    expect(entry!.value).toBe("value1");
  });

  it("get() returns null for nonexistent key", async () => {
    const store = new MemoryStore(storePath);
    const entry = await store.get("nonexistent");
    expect(entry).toBeNull();
  });

  it("persists to disk and survives reload", async () => {
    const store1 = new MemoryStore(storePath);
    await store1.add("persistent", "across sessions");

    const store2 = new MemoryStore(storePath);
    const entries = await store2.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("persistent");
    expect(entries[0].value).toBe("across sessions");
  });

  it("getAll() returns formatted text for system prompt", async () => {
    const store = new MemoryStore(storePath);
    await store.add("fact1", "TypeScript is great");
    await store.add("fact2", "Always use strict mode");
    const text = await store.getSystemPromptBlock();
    expect(text).toContain("TypeScript is great");
    expect(text).toContain("Always use strict mode");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/memory/__tests__/memory-store.test.ts`
Expected: FAIL -- module does not exist.

- [ ] **Step 4: Implement MemoryStore**

```typescript
// packages/data/src/memory/memory-store.ts
/**
 * File-based memory store for cross-session persistent facts.
 *
 * Stores memories in a JSON file. Supports add, remove, list, get operations.
 * Thread-safe via atomic writes (write to temp, rename).
 *
 * No direct amp reference -- modeled after Claude Code's MEMORY.md pattern
 * but using structured JSON storage.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MemoryEntry, MemoryStoreData } from "./memory-types";

export class MemoryStore {
  private readonly filePath: string;
  private cache: MemoryEntry[] | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * List all memory entries.
   */
  async list(): Promise<MemoryEntry[]> {
    await this.ensureLoaded();
    return [...this.cache!];
  }

  /**
   * Get a specific memory entry by key.
   */
  async get(key: string): Promise<MemoryEntry | null> {
    await this.ensureLoaded();
    return this.cache!.find(e => e.key === key) ?? null;
  }

  /**
   * Add or update a memory entry.
   */
  async add(key: string, value: string, source?: string): Promise<void> {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const existing = this.cache!.findIndex(e => e.key === key);

    if (existing >= 0) {
      this.cache![existing] = {
        ...this.cache![existing],
        value,
        updatedAt: now,
        source: source ?? this.cache![existing].source,
      };
    } else {
      this.cache!.push({
        key,
        value,
        createdAt: now,
        updatedAt: now,
        source,
      });
    }

    await this.save();
  }

  /**
   * Remove a memory entry by key.
   * Returns true if the entry was found and removed.
   */
  async remove(key: string): Promise<boolean> {
    await this.ensureLoaded();
    const idx = this.cache!.findIndex(e => e.key === key);
    if (idx < 0) return false;
    this.cache!.splice(idx, 1);
    await this.save();
    return true;
  }

  /**
   * Generate a system prompt block containing all memories.
   * Returns empty string if no memories exist.
   */
  async getSystemPromptBlock(): Promise<string> {
    const entries = await this.list();
    if (entries.length === 0) return "";

    const lines = entries.map(e => `- [${e.key}] ${e.value}`);
    return `# User Memories\n\nThe following facts were saved by the user across previous sessions:\n\n${lines.join("\n")}\n`;
  }

  // ─── Private ─────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.cache !== null) return;

    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const data: MemoryStoreData = JSON.parse(raw);
      if (data.version === 1 && Array.isArray(data.entries)) {
        this.cache = data.entries;
      } else {
        this.cache = [];
      }
    } catch {
      this.cache = [];
    }
  }

  private async save(): Promise<void> {
    const data: MemoryStoreData = {
      version: 1,
      entries: this.cache ?? [],
    };

    // Ensure directory exists
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    // Atomic write: temp file + rename
    const tmpPath = this.filePath + ".tmp";
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tmpPath, this.filePath);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/memory/__tests__/memory-store.test.ts`
Expected: PASS

- [ ] **Step 6: Export from @flitter/data**

In `packages/data/src/index.ts`, add:

```typescript
export { MemoryStore } from "./memory/memory-store";
export type { MemoryEntry, MemoryStoreData } from "./memory/memory-types";
```

- [ ] **Step 7: Commit**

```bash
git add packages/data/src/memory/ packages/data/src/index.ts
git commit -m "feat(data): add MemoryStore for cross-session memory persistence

JSON file-based storage with add/remove/list/get operations. Atomic
writes via temp+rename. Generates system prompt block with all memories.

No direct amp reference: modeled after Claude Code's MEMORY.md pattern."
```

---

### Task 2: Create /memory slash command

**Why:** Users need a way to interact with the memory store during conversation.

**Files:**
- Create: `packages/agent-core/src/commands/memory-command.ts`
- Create: `packages/agent-core/src/commands/__tests__/memory-command.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/commands/__tests__/memory-command.test.ts
import { describe, expect, it } from "bun:test";
import { parseMemoryCommand, type MemoryCommandAction } from "../memory-command";

describe("/memory command parsing", () => {
  it("parses /memory add key value", () => {
    const result = parseMemoryCommand("add test-key This is the value");
    expect(result).toEqual({
      action: "add",
      key: "test-key",
      value: "This is the value",
    });
  });

  it("parses /memory remove key", () => {
    const result = parseMemoryCommand("remove test-key");
    expect(result).toEqual({
      action: "remove",
      key: "test-key",
    });
  });

  it("parses /memory list", () => {
    const result = parseMemoryCommand("list");
    expect(result).toEqual({ action: "list" });
  });

  it("parses /memory (bare) as list", () => {
    const result = parseMemoryCommand("");
    expect(result).toEqual({ action: "list" });
  });

  it("parses /memory get key", () => {
    const result = parseMemoryCommand("get test-key");
    expect(result).toEqual({
      action: "get",
      key: "test-key",
    });
  });

  it("returns error for invalid action", () => {
    const result = parseMemoryCommand("invalid arg");
    expect(result).toEqual({
      action: "error",
      message: 'Unknown memory action: "invalid". Use add, remove, list, or get.',
    });
  });
});
```

- [ ] **Step 2: Implement memory-command.ts**

```typescript
// packages/agent-core/src/commands/memory-command.ts
/**
 * /memory slash command handler.
 *
 * Subcommands:
 *   /memory                   -- list all memories
 *   /memory list              -- list all memories
 *   /memory add <key> <value> -- add or update a memory
 *   /memory remove <key>      -- remove a memory
 *   /memory get <key>         -- show a specific memory
 *
 * No direct amp reference: Flitter extension.
 */

export type MemoryCommandAction =
  | { action: "list" }
  | { action: "add"; key: string; value: string }
  | { action: "remove"; key: string }
  | { action: "get"; key: string }
  | { action: "error"; message: string };

/**
 * Parse the argument string after "/memory".
 */
export function parseMemoryCommand(args: string): MemoryCommandAction {
  const trimmed = args.trim();

  if (trimmed === "" || trimmed === "list") {
    return { action: "list" };
  }

  const parts = trimmed.split(/\s+/);
  const action = parts[0];

  switch (action) {
    case "add": {
      const key = parts[1];
      if (!key) return { action: "error", message: "Usage: /memory add <key> <value>" };
      const value = parts.slice(2).join(" ");
      if (!value) return { action: "error", message: "Usage: /memory add <key> <value>" };
      return { action: "add", key, value };
    }
    case "remove":
    case "rm":
    case "delete": {
      const key = parts[1];
      if (!key) return { action: "error", message: "Usage: /memory remove <key>" };
      return { action: "remove", key };
    }
    case "get":
    case "show": {
      const key = parts[1];
      if (!key) return { action: "error", message: "Usage: /memory get <key>" };
      return { action: "get", key };
    }
    case "list":
    case "ls":
      return { action: "list" };
    default:
      return {
        action: "error",
        message: `Unknown memory action: "${action}". Use add, remove, list, or get.`,
      };
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/commands/__tests__/memory-command.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/agent-core/src/commands/memory-command.ts packages/agent-core/src/commands/__tests__/memory-command.test.ts
git commit -m "feat(agent-core): add /memory slash command parser

Supports: /memory add <key> <value>, /memory remove <key>,
/memory list, /memory get <key>. Aliases: rm, delete, show, ls.

No direct amp reference: Flitter extension."
```

---

### Task 3: Inject memories into system prompt

**Why:** Memories must appear in the system prompt so the LLM can reference them.

**Files:**
- Modify: `packages/agent-core/src/prompt/context-blocks.ts` (or equivalent)
- Modify: `packages/flitter/src/container.ts`

- [ ] **Step 1: Add memory block to collectContextBlocks**

In the context block collection, after other blocks, add:

```typescript
// Collect memory block
// No amp reference: Flitter extension
if (opts.memoryStore) {
  const memoryBlock = await opts.memoryStore.getSystemPromptBlock();
  if (memoryBlock) {
    blocks.push({
      type: "memory",
      text: memoryBlock,
    });
  }
}
```

- [ ] **Step 2: Wire MemoryStore into container**

In `packages/flitter/src/container.ts`, create MemoryStore instance and pass to context block collection:

```typescript
import { MemoryStore } from "@flitter/data";
import path from "node:path";

// In createContainer:
const memoryStore = new MemoryStore(
  path.join(opts.configDir, "memory.json")
);
```

- [ ] **Step 3: Test memory injection**

```typescript
describe("memory system prompt injection", () => {
  it("memories appear in system prompt blocks", async () => {
    const store = new MemoryStore(path.join(tmpDir, "memory.json"));
    await store.add("preference", "Use TypeScript strict mode");
    const block = await store.getSystemPromptBlock();
    expect(block).toContain("Use TypeScript strict mode");
    expect(block).toContain("User Memories");
  });

  it("empty store produces empty block", async () => {
    const store = new MemoryStore(path.join(tmpDir, "empty-memory.json"));
    const block = await store.getSystemPromptBlock();
    expect(block).toBe("");
  });
});
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/ packages/agent-core/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/prompt/ packages/flitter/src/container.ts
git commit -m "feat(flitter): inject memories into system prompt via MemoryStore

MemoryStore.getSystemPromptBlock() produces a formatted block listing
all stored memories. Added to context block collection in container.

No direct amp reference: Flitter extension."
```
