# CLI Sub-commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 8 stub CLI sub-commands: `config get/set/list` and `threads list/new/continue/archive/delete` — transforming empty handler bodies into working functionality.

**Architecture:** Each command handler receives its dependencies via the `deps` object (ConfigService for config commands, ThreadStore for thread commands). Output is written to stdout — table format for human-readable, JSON for `--format json`. No TUI widgets needed; these are non-interactive commands.

**Codebase notes:**
- `ConfigService.updateSettings(scope, key, value)` is **synchronous** (returns `void`, not `Promise<void>`). Using `await` on it is safe but unnecessary.
- `Settings` has no index signature — use `(configService.get().settings as Record<string, unknown>)[key]` for dynamic access.
- Real settings keys use dot-notation (e.g., `"internal.model"`, `"terminal.theme"`), not short names like `"model"`.
- Existing CLI tests use co-located files (e.g., `auth.test.ts` next to `auth.ts`). This plan uses `__tests__/` subdirectory — create it first.
- `program.ts` defaults `threads list --limit` to `"20"`, not `"10"`.

**Tech Stack:** TypeScript, `@flitter/data` (ConfigService, ThreadStore), `@flitter/schemas` (Settings, ThreadSnapshot)

**amp reference files:** amp's CLI commands are embedded in the main binary and not clearly separated in the reversed source — implementation follows standard CLI patterns.

---

### Task 1: Implement `config get`

**Files:**
- Modify: `packages/cli/src/commands/config.ts`
- Test: `packages/cli/src/commands/__tests__/config.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/commands/__tests__/config.test.ts
import { describe, it, expect, mock } from "bun:test";
import { handleConfigGet, handleConfigSet, handleConfigList } from "../config";

const createMockConfigService = (settings: Record<string, unknown> = {}) => ({
  get: () => ({ settings }),
  // Note: updateSettings is synchronous (returns void), not async
  updateSettings: mock((_scope: string, _key: string, _value: unknown) => {}),
});

describe("handleConfigGet", () => {
  it("prints the value of a known key to stdout", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      await handleConfigGet(
        { configService: createMockConfigService({ "internal.model": "claude-sonnet-4-20250514" }) as any },
        {} as any,
        "internal.model",
      );
      expect(writes.join("")).toContain("claude-sonnet-4-20250514");
    } finally {
      process.stdout.write = origWrite;
    }
  });

  it("prints (not set) for an unknown key", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      await handleConfigGet(
        { configService: createMockConfigService({}) as any },
        {} as any,
        "nonexistent.key",
      );
      expect(writes.join("")).toContain("not set");
    } finally {
      process.stdout.write = origWrite;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/__tests__/config.test.ts`
Expected: FAIL — `handleConfigGet` prints nothing (empty body)

- [ ] **Step 3: Implement handleConfigGet**

In `packages/cli/src/commands/config.ts`:

```ts
export async function handleConfigGet(
  deps: ConfigCommandDeps,
  context: CliContext,
  key: string,
): Promise<void> {
  void context;
  const configService = deps.configService;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  const value = (configService.get().settings as Record<string, unknown>)[key];
  if (value === undefined) {
    process.stdout.write(`${key}: (not set)\n`);
  } else if (typeof value === "object") {
    process.stdout.write(`${key}: ${JSON.stringify(value, null, 2)}\n`);
  } else {
    process.stdout.write(`${key}: ${String(value)}\n`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/commands/__tests__/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/config.ts packages/cli/src/commands/__tests__/config.test.ts
git commit -m "feat(cli): implement config get command"
```

---

### Task 2: Implement `config set`

**Files:**
- Modify: `packages/cli/src/commands/config.ts`
- Test: `packages/cli/src/commands/__tests__/config.test.ts` (append)

- [ ] **Step 1: Write failing test**

```ts
// Append to packages/cli/src/commands/__tests__/config.test.ts
describe("handleConfigSet", () => {
  it("calls configService.updateSettings with the key-value pair", async () => {
    const mockService = createMockConfigService({ "internal.model": "old-model" });
    await handleConfigSet(
      { configService: mockService as any },
      {} as any,
      "internal.model",
      "claude-opus-4-20250514",
    );
    expect(mockService.updateSettings).toHaveBeenCalledWith(
      "workspace",
      "internal.model",
      "claude-opus-4-20250514",
    );
  });

  it("parses JSON values when the string is valid JSON", async () => {
    const mockService = createMockConfigService({});
    await handleConfigSet(
      { configService: mockService as any },
      {} as any,
      "permissions",
      '[{"tool":"Bash","action":"allow"}]',
    );
    expect(mockService.updateSettings).toHaveBeenCalledWith(
      "workspace",
      "permissions",
      [{ tool: "Bash", action: "allow" }],
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/__tests__/config.test.ts`
Expected: FAIL — `handleConfigSet` is a stub

- [ ] **Step 3: Implement handleConfigSet**

```ts
export async function handleConfigSet(
  deps: ConfigCommandDeps,
  context: CliContext,
  key: string,
  value: string,
): Promise<void> {
  void context;
  const configService = deps.configService;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  // Try to parse JSON values
  let parsed: unknown = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Keep as string
  }

  // Convert booleans
  if (value === "true") parsed = true;
  if (value === "false") parsed = false;

  // updateSettings is synchronous (returns void, not Promise<void>)
  configService.updateSettings("workspace", key, parsed);
  process.stdout.write(`Set ${key} = ${typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed)}\n`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/commands/__tests__/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/config.ts packages/cli/src/commands/__tests__/config.test.ts
git commit -m "feat(cli): implement config set command"
```

---

### Task 3: Implement `config list`

**Files:**
- Modify: `packages/cli/src/commands/config.ts`
- Test: `packages/cli/src/commands/__tests__/config.test.ts` (append)

- [ ] **Step 1: Write failing test**

```ts
describe("handleConfigList", () => {
  it("prints all settings as key: value pairs", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      await handleConfigList(
        {
          configService: createMockConfigService({
            "internal.model": "claude-sonnet",
            "terminal.theme": "dark",
          }) as any,
        },
        {} as any,
      );
      const output = writes.join("");
      expect(output).toContain("internal.model");
      expect(output).toContain("claude-sonnet");
      expect(output).toContain("terminal.theme");
    } finally {
      process.stdout.write = origWrite;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/__tests__/config.test.ts`
Expected: FAIL — stub

- [ ] **Step 3: Implement handleConfigList**

```ts
export async function handleConfigList(
  deps: ConfigCommandDeps,
  context: CliContext,
): Promise<void> {
  void context;
  const configService = deps.configService;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  const settings = configService.get().settings as Record<string, unknown>;
  const entries = Object.entries(settings).sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    process.stdout.write("No settings configured.\n");
    return;
  }

  for (const [key, value] of entries) {
    const display = typeof value === "object" ? JSON.stringify(value) : String(value);
    process.stdout.write(`${key}: ${display}\n`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/commands/__tests__/config.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/config.ts packages/cli/src/commands/__tests__/config.test.ts
git commit -m "feat(cli): implement config list command"
```

---

### Task 4: Implement `threads list`

**Files:**
- Modify: `packages/cli/src/commands/threads.ts`
- Test: `packages/cli/src/commands/__tests__/threads.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/commands/__tests__/threads.test.ts
import { describe, it, expect } from "bun:test";
import { handleThreadsList } from "../threads";
import { BehaviorSubject } from "@flitter/util";

const createMockThreadStore = (threads: Array<{ id: string; title?: string; created?: number; archived?: boolean }>) => {
  const entries = threads.map(t => ({
    id: t.id,
    title: t.title ?? `Thread ${t.id.slice(0, 8)}`,
    created: t.created ?? Date.now(),
    archived: t.archived ?? false,
    userLastInteractedAt: t.created ?? Date.now(),
  }));
  return {
    observeThreadEntries: () => new BehaviorSubject(entries),
    getCachedThreadIds: () => threads.map(t => t.id),
  };
};

describe("handleThreadsList", () => {
  it("prints thread list in table format", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      await handleThreadsList(
        { threadStore: createMockThreadStore([
          { id: "aaa-111", title: "Fix login bug" },
          { id: "bbb-222", title: "Add feature X" },
        ]) as any },
        {} as any,
        { limit: "20", format: "table" },
      );
      const output = writes.join("");
      expect(output).toContain("aaa-111");
      expect(output).toContain("Fix login bug");
      expect(output).toContain("bbb-222");
    } finally {
      process.stdout.write = origWrite;
    }
  });

  it("prints thread list in JSON format", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      await handleThreadsList(
        { threadStore: createMockThreadStore([
          { id: "aaa-111", title: "Fix login bug" },
        ]) as any },
        {} as any,
        { limit: "20", format: "json" },
      );
      const output = writes.join("");
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBe("aaa-111");
    } finally {
      process.stdout.write = origWrite;
    }
  });

  it("respects limit option", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      await handleThreadsList(
        { threadStore: createMockThreadStore([
          { id: "aaa-111" }, { id: "bbb-222" }, { id: "ccc-333" },
        ]) as any },
        {} as any,
        { limit: "2", format: "table" },
      );
      const output = writes.join("");
      expect(output).toContain("aaa-111");
      expect(output).toContain("bbb-222");
      expect(output).not.toContain("ccc-333");
    } finally {
      process.stdout.write = origWrite;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: FAIL — stub

- [ ] **Step 3: Implement handleThreadsList**

```ts
export async function handleThreadsList(
  deps: ThreadsCommandDeps,
  context: CliContext,
  options: ThreadsListOptions,
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const entries$ = threadStore.observeThreadEntries();
  const entries = entries$.getValue();
  if (!entries || entries.length === 0) {
    process.stdout.write("No threads found.\n");
    return;
  }

  const limit = parseInt(options.limit, 10) || 10;
  const limited = entries.slice(0, limit);

  if (options.format === "json") {
    process.stdout.write(JSON.stringify(limited, null, 2) + "\n");
    return;
  }

  // Table format
  const idWidth = 12;
  const titleWidth = 40;
  const dateWidth = 20;

  process.stdout.write(
    `${"ID".padEnd(idWidth)}  ${"Title".padEnd(titleWidth)}  ${"Last Active".padEnd(dateWidth)}\n`,
  );
  process.stdout.write(`${"─".repeat(idWidth)}  ${"─".repeat(titleWidth)}  ${"─".repeat(dateWidth)}\n`);

  for (const entry of limited) {
    const id = (entry.id ?? "").slice(0, idWidth).padEnd(idWidth);
    const title = ((entry as any).title ?? "Untitled").slice(0, titleWidth).padEnd(titleWidth);
    const date = new Date((entry as any).userLastInteractedAt ?? Date.now()).toLocaleString().padEnd(dateWidth);
    process.stdout.write(`${id}  ${title}  ${date}\n`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/threads.ts packages/cli/src/commands/__tests__/threads.test.ts
git commit -m "feat(cli): implement threads list command"
```

---

### Task 5: Implement `threads new`

**Files:**
- Modify: `packages/cli/src/commands/threads.ts`
- Test: `packages/cli/src/commands/__tests__/threads.test.ts` (append)

- [ ] **Step 1: Write failing test**

```ts
describe("handleThreadsNew", () => {
  it("creates a new thread and prints its ID", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    const setCalled: unknown[] = [];
    const mockStore = {
      ...createMockThreadStore([]),
      setCachedThread: (thread: unknown) => { setCalled.push(thread); return new BehaviorSubject(thread); },
    };

    try {
      await handleThreadsNew(
        { threadStore: mockStore as any },
        {} as any,
        {},
      );
      expect(setCalled).toHaveLength(1);
      const output = writes.join("");
      expect(output).toContain("Created thread:");
    } finally {
      process.stdout.write = origWrite;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: FAIL — stub

- [ ] **Step 3: Implement handleThreadsNew**

```ts
export async function handleThreadsNew(
  deps: ThreadsCommandDeps,
  context: CliContext,
  options: ThreadsNewOptions,
): Promise<void> {
  void context;
  void options;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const id = crypto.randomUUID();
  threadStore.setCachedThread({
    id,
    v: 0,
    messages: [],
    relationships: [],
    created: Date.now(),
  });

  process.stdout.write(`Created thread: ${id}\n`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/threads.ts packages/cli/src/commands/__tests__/threads.test.ts
git commit -m "feat(cli): implement threads new command"
```

---

### Task 6: Implement `threads continue`

**Files:**
- Modify: `packages/cli/src/commands/threads.ts`
- Test: `packages/cli/src/commands/__tests__/threads.test.ts` (append)

- [ ] **Step 1: Write failing test**

```ts
describe("handleThreadsContinue", () => {
  it("prints instructions to continue a thread", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      await handleThreadsContinue(
        { threadStore: createMockThreadStore([{ id: "aaa-111" }]) as any },
        {} as any,
        "aaa-111",
      );
      const output = writes.join("");
      expect(output).toContain("aaa-111");
    } finally {
      process.stdout.write = origWrite;
    }
  });

  it("prints error for non-existent thread", async () => {
    const writes: string[] = [];
    const origWrite = process.stderr.write;
    process.stderr.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    try {
      const mockStore = {
        ...createMockThreadStore([]),
        getThread: () => undefined,
      };
      await handleThreadsContinue(
        { threadStore: mockStore as any },
        {} as any,
        "nonexistent",
      );
      const output = writes.join("");
      expect(output).toContain("not found");
    } finally {
      process.stderr.write = origWrite;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: FAIL — stub

- [ ] **Step 3: Implement handleThreadsContinue**

```ts
export async function handleThreadsContinue(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const thread = threadStore.getThread(threadId);
  if (!thread) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Continuing thread: ${threadId}\n`);
  process.stdout.write(`Run: flitter --thread-id ${threadId}\n`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/threads.ts packages/cli/src/commands/__tests__/threads.test.ts
git commit -m "feat(cli): implement threads continue command"
```

---

### Task 7: Implement `threads archive` and `threads delete`

**Files:**
- Modify: `packages/cli/src/commands/threads.ts`
- Test: `packages/cli/src/commands/__tests__/threads.test.ts` (append)

- [ ] **Step 1: Write failing tests**

```ts
describe("handleThreadsArchive", () => {
  it("marks a thread as archived", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    const mockSnap = { id: "aaa-111", v: 0, messages: [], relationships: [], archived: false };
    const mockStore = {
      getThread: (id: string) => id === "aaa-111" ? new BehaviorSubject(mockSnap) : undefined,
      getThreadSnapshot: (id: string) => id === "aaa-111" ? mockSnap : undefined,
      setCachedThread: (snap: unknown) => { Object.assign(mockSnap, snap); return new BehaviorSubject(snap); },
    };

    try {
      await handleThreadsArchive(
        { threadStore: mockStore as any },
        {} as any,
        "aaa-111",
      );
      expect(writes.join("")).toContain("Archived");
      expect(mockSnap.archived).toBe(true);
    } finally {
      process.stdout.write = origWrite;
    }
  });
});

describe("handleThreadsDelete", () => {
  it("deletes a thread", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => { writes.push(chunk); return true; }) as any;

    let deleted = false;
    const mockStore = {
      getThread: (id: string) => id === "aaa-111" ? new BehaviorSubject({}) : undefined,
      deleteThread: (id: string) => { if (id === "aaa-111") deleted = true; return true; },
    };

    try {
      await handleThreadsDelete(
        { threadStore: mockStore as any },
        {} as any,
        "aaa-111",
      );
      expect(deleted).toBe(true);
      expect(writes.join("")).toContain("Deleted");
    } finally {
      process.stdout.write = origWrite;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: FAIL — stubs

- [ ] **Step 3: Implement handleThreadsArchive and handleThreadsDelete**

```ts
export async function handleThreadsArchive(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const thread = threadStore.getThread(threadId);
  if (!thread) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  const snapshot = threadStore.getThreadSnapshot(threadId);
  if (snapshot) {
    threadStore.setCachedThread({ ...snapshot, archived: true });
  }
  process.stdout.write(`Archived thread: ${threadId}\n`);
}

export async function handleThreadsDelete(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const thread = threadStore.getThread(threadId);
  if (!thread) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  threadStore.deleteThread(threadId);
  process.stdout.write(`Deleted thread: ${threadId}\n`);
}
```

- [ ] **Step 4: Run all tests**

Run: `cd packages/cli && bun test src/commands/__tests__/threads.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/threads.ts packages/cli/src/commands/__tests__/threads.test.ts
git commit -m "feat(cli): implement threads archive and delete commands"
```
