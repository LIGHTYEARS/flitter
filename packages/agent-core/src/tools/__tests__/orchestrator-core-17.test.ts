/**
 * Tests for CORE-17: activatedSkills tracking
 *
 * 逆向: amp-cli-reversed/modules/1234_unknown_FWT.js:384 (skill detection in invokeTool)
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:211-219 (onSkillToolComplete)
 */
import { describe, expect, it, mock } from "bun:test";
import { Subject } from "@flitter/util";
import { type OrchestratorCallbacks, ToolOrchestrator, type ToolUseItem } from "../orchestrator";
import type { ToolRegistry } from "../registry";
import type { ToolResult, ToolSpec } from "../types";

// ─── Helpers ─────────────────────────────────────────────

function createMockRegistry(tools: Record<string, Partial<ToolSpec>> = {}): ToolRegistry {
  return {
    get(name: string) {
      return tools[name] as ToolSpec | undefined;
    },
    getAll: () => Object.values(tools) as ToolSpec[],
    getToolDefinitions: () => [],
    has: (name: string) => name in tools,
    register: () => {},
  } as unknown as ToolRegistry;
}

function createMockCallbacks(overrides?: Partial<OrchestratorCallbacks>): OrchestratorCallbacks {
  return {
    getConfig: async () => ({ settings: {} as never, secrets: {} as never }),
    updateThread: mock(async () => {}),
    getToolRunEnvironment: mock(async (_id: string, signal: AbortSignal) => ({
      workingDirectory: "/tmp",
      signal,
      threadId: "test-thread",
      config: { settings: {} as never, secrets: {} as never },
    })),
    applyHookResult: mock(async () => ({ abortOp: false })),
    applyPostHookResult: mock(async () => {}),
    updateFileChanges: mock(async () => {}),
    getDisposed$: () => new Subject<boolean>(),
    clearPendingApprovals: mock(() => {}),
    ...overrides,
  };
}

// ─── CORE-17: Skill tool completion detection ───────────

describe("CORE-17: activatedSkills tracking — orchestrator detection", () => {
  it("calls onSkillToolComplete when a tool named 'skill' completes with done", async () => {
    const completedSkills: ToolUseItem[] = [];

    const tools = {
      skill: {
        name: "skill",
        source: "builtin" as const,
        description: "load skill",
        inputSchema: {},
        execute: mock(async (): Promise<ToolResult> => {
          return { status: "done", content: "<loaded_skill>...</loaded_skill>" };
        }),
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks({
      onSkillToolComplete: (tu) => completedSkills.push(tu),
    });
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    await orch.executeToolsWithPlan([
      { id: "tu_skill_1", name: "skill", input: { name: "web-browser", arguments: "fetch page" } },
    ]);

    expect(completedSkills).toHaveLength(1);
    expect(completedSkills[0]!.name).toBe("skill");
    expect(completedSkills[0]!.input).toEqual({ name: "web-browser", arguments: "fetch page" });
  });

  it("does NOT call onSkillToolComplete when skill tool returns error", async () => {
    const completedSkills: ToolUseItem[] = [];

    const tools = {
      skill: {
        name: "skill",
        source: "builtin" as const,
        description: "load skill",
        inputSchema: {},
        execute: mock(async (): Promise<ToolResult> => {
          return { status: "error", error: "Skill not found" };
        }),
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks({
      onSkillToolComplete: (tu) => completedSkills.push(tu),
    });
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    await orch.executeToolsWithPlan([
      { id: "tu_skill_2", name: "skill", input: { name: "nonexistent" } },
    ]);

    expect(completedSkills).toHaveLength(0);
  });

  it("does NOT call onSkillToolComplete for non-skill tools", async () => {
    const completedSkills: ToolUseItem[] = [];

    const tools = {
      read: {
        name: "read",
        source: "builtin" as const,
        description: "read file",
        inputSchema: {},
        execute: mock(async (): Promise<ToolResult> => {
          return { status: "done", content: "file contents" };
        }),
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks({
      onSkillToolComplete: (tu) => completedSkills.push(tu),
    });
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    await orch.executeToolsWithPlan([
      { id: "tu_read_1", name: "read", input: { path: "/tmp/file" } },
    ]);

    expect(completedSkills).toHaveLength(0);
  });

  it("case-insensitive skill name matching (e.g. 'Skill')", async () => {
    const completedSkills: ToolUseItem[] = [];

    const tools = {
      Skill: {
        name: "Skill",
        source: "builtin" as const,
        description: "load skill",
        inputSchema: {},
        execute: mock(async (): Promise<ToolResult> => {
          return { status: "done", content: "ok" };
        }),
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks({
      onSkillToolComplete: (tu) => completedSkills.push(tu),
    });
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    await orch.executeToolsWithPlan([
      { id: "tu_skill_3", name: "Skill", input: { name: "debug" } },
    ]);

    expect(completedSkills).toHaveLength(1);
  });

  it("works gracefully when onSkillToolComplete is not provided", async () => {
    const tools = {
      skill: {
        name: "skill",
        source: "builtin" as const,
        description: "load skill",
        inputSchema: {},
        execute: mock(async (): Promise<ToolResult> => {
          return { status: "done", content: "ok" };
        }),
      },
    };

    const registry = createMockRegistry(tools);
    // No onSkillToolComplete callback
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    // Should not throw
    await orch.executeToolsWithPlan([{ id: "tu_skill_4", name: "skill", input: { name: "test" } }]);
  });
});

// ─── CORE-17: ThreadWorker.onSkillToolComplete ──────────

describe("CORE-17: ThreadWorker.onSkillToolComplete", () => {
  // We import ThreadWorker from the source
  const { ThreadWorker } = require("../../worker/thread-worker");

  function createMinimalWorkerOpts(snapshot: Record<string, unknown>) {
    let currentSnapshot = { ...snapshot };
    return {
      getThreadSnapshot: () => currentSnapshot as never,
      updateThreadSnapshot: (s: Record<string, unknown>) => {
        currentSnapshot = s;
      },
      getMessages: () => [],
      provider: { stream: async function* () {} } as never,
      toolOrchestrator: {
        executeToolsWithPlan: async () => {},
        cancelAll: async () => {},
        onNewUserMessage: async () => {},
        hasRunningTools: () => false,
        dispose: () => {},
      } as never,
      buildSystemPrompt: async () => [],
      checkAndCompact: async () => null,
      getConfig: () => ({ settings: {}, secrets: {} }),
      toolRegistry: { getToolDefinitions: () => [] } as never,
    };
  }

  it("adds skill to activatedSkills on first call", () => {
    const opts = createMinimalWorkerOpts({ id: "thread-1", v: 1, messages: [] });
    const worker = new ThreadWorker(opts);

    worker.onSkillToolComplete({ input: { name: "web-browser", arguments: "fetch" } });

    const snapshot = opts.getThreadSnapshot() as Record<string, unknown>;
    expect(snapshot.activatedSkills).toEqual([{ name: "web-browser", arguments: "fetch" }]);
  });

  it("deduplicates by skill name", () => {
    const opts = createMinimalWorkerOpts({
      id: "thread-1",
      v: 1,
      messages: [],
      activatedSkills: [{ name: "web-browser" }],
    });
    const worker = new ThreadWorker(opts);

    worker.onSkillToolComplete({ input: { name: "web-browser" } });

    const snapshot = opts.getThreadSnapshot() as Record<string, unknown>;
    const skills = snapshot.activatedSkills as Array<{ name: string }>;
    expect(skills).toHaveLength(1);
  });

  it("allows different skills to be recorded", () => {
    const opts = createMinimalWorkerOpts({
      id: "thread-1",
      v: 1,
      messages: [],
      activatedSkills: [{ name: "web-browser" }],
    });
    const worker = new ThreadWorker(opts);

    worker.onSkillToolComplete({ input: { name: "code-review" } });

    const snapshot = opts.getThreadSnapshot() as Record<string, unknown>;
    const skills = snapshot.activatedSkills as Array<{ name: string }>;
    expect(skills).toHaveLength(2);
    expect(skills[0]!.name).toBe("web-browser");
    expect(skills[1]!.name).toBe("code-review");
  });

  it("ignores empty skill name", () => {
    const opts = createMinimalWorkerOpts({ id: "thread-1", v: 1, messages: [] });
    const worker = new ThreadWorker(opts);

    worker.onSkillToolComplete({ input: { name: "" } });

    const snapshot = opts.getThreadSnapshot() as Record<string, unknown>;
    expect(snapshot.activatedSkills).toBeUndefined();
  });

  it("records without arguments when none provided", () => {
    const opts = createMinimalWorkerOpts({ id: "thread-1", v: 1, messages: [] });
    const worker = new ThreadWorker(opts);

    worker.onSkillToolComplete({ input: { name: "debug" } });

    const snapshot = opts.getThreadSnapshot() as Record<string, unknown>;
    const skills = snapshot.activatedSkills as Array<{ name: string; arguments?: string }>;
    expect(skills).toEqual([{ name: "debug" }]);
    expect(skills[0]).not.toHaveProperty("arguments");
  });
});
