/**
 * Tests for CLI-28: `threads handoff [id]`
 *
 * 逆向: amp-cli-reversed/chunk-005.js:4962-4981
 * 逆向: amp-cli-reversed/modules/2015_unknown_lF0.js
 */
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { ThreadWorkerService } from "@flitter/agent-core";
import type { ThreadStore } from "@flitter/data";
import type { ThreadSnapshot } from "@flitter/schemas";
import { handleThreadsHandoff } from "../threads-handoff";

// ─── Helpers ─────────────────────────────────────────────

function makeSnapshot(
  id: string,
  messages: Array<{ role: string; text: string }> = [],
): ThreadSnapshot {
  return {
    id,
    v: 1,
    title: `Thread ${id}`,
    messages: messages.map((m, i) => ({
      role: m.role,
      messageId: i + 1,
      content: [{ type: "text", text: m.text }],
    })),
  } as unknown as ThreadSnapshot;
}

function createMockThreadStore(threads: Record<string, ThreadSnapshot> = {}): ThreadStore {
  const cachedThreads = new Map(Object.entries(threads));

  return {
    getThreadSnapshot: (id: string) => cachedThreads.get(id),
    listRecentThreadIds: mock(() => Object.keys(threads)),
    setCachedThread: mock((snap: ThreadSnapshot) => {
      cachedThreads.set(snap.id, snap);
      return { getValue: () => snap };
    }),
  } as unknown as ThreadStore;
}

function createMockWorkerService(): ThreadWorkerService {
  return {
    seedThreadMessages: mock(async () => {}),
    applyParentRelationship: mock(async () => {}),
  } as unknown as ThreadWorkerService;
}

// ─── Tests ───────────────────────────────────────────────

describe("handleThreadsHandoff", () => {
  let outSpy: ReturnType<typeof spyOn>;
  let errSpy: ReturnType<typeof spyOn>;
  let prevExitCode: number | undefined;

  beforeEach(() => {
    outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    errSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    prevExitCode = process.exitCode;
  });

  afterEach(() => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    process.exitCode = prevExitCode;
  });

  it("creates a handoff thread with explicit ID and goal", async () => {
    const parent = makeSnapshot("parent-1", [
      { role: "user", text: "Hello" },
      { role: "assistant", text: "Hi there!" },
    ]);
    const store = createMockThreadStore({ "parent-1": parent });
    const service = createMockWorkerService();

    await handleThreadsHandoff({ threadStore: store, threadWorkerService: service }, "parent-1", {
      goal: "Fix the auth bug",
    });

    // seedThreadMessages should have been called
    expect(service.seedThreadMessages).toHaveBeenCalledTimes(1);
    // applyParentRelationship should have been called
    expect(service.applyParentRelationship).toHaveBeenCalledTimes(1);
    const [childId, parentId] = (service.applyParentRelationship as ReturnType<typeof mock>).mock
      .calls[0] as [string, string];
    expect(parentId).toBe("parent-1");
    expect(childId).toStartWith("T-");

    // stdout should have output
    const output = outSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Handoff thread created");
    expect(output).toContain("parent-1");
  });

  it("falls back to most recent thread when no ID given", async () => {
    const parent = makeSnapshot("recent-1", [{ role: "user", text: "Do the thing" }]);
    const store = createMockThreadStore({ "recent-1": parent });
    const service = createMockWorkerService();

    await handleThreadsHandoff({ threadStore: store, threadWorkerService: service }, undefined, {
      goal: "Continue the work",
    });

    expect(service.seedThreadMessages).toHaveBeenCalledTimes(1);
    const output = outSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Handoff thread created");
  });

  it("--print outputs just the thread ID", async () => {
    const parent = makeSnapshot("p1", [{ role: "user", text: "Hi" }]);
    const store = createMockThreadStore({ p1: parent });
    const service = createMockWorkerService();

    await handleThreadsHandoff({ threadStore: store, threadWorkerService: service }, "p1", {
      goal: "New goal",
      print: true,
    });

    const output = outSpy.mock.calls
      .map((c) => c[0])
      .join("")
      .trim();
    // Should be just the thread ID
    expect(output).toStartWith("T-");
    expect(output).not.toContain("Handoff thread created");
  });

  it("errors when thread not found", async () => {
    const store = createMockThreadStore({});
    const service = createMockWorkerService();

    await handleThreadsHandoff(
      { threadStore: store, threadWorkerService: service },
      "nonexistent",
      { goal: "test" },
    );

    expect(process.exitCode).toBe(1);
    const errOutput = errSpy.mock.calls.map((c) => c[0]).join("");
    expect(errOutput).toContain("not found");
  });

  it("errors when no goal provided", async () => {
    const parent = makeSnapshot("p1", [{ role: "user", text: "Hi" }]);
    const store = createMockThreadStore({ p1: parent });
    const service = createMockWorkerService();

    await handleThreadsHandoff({ threadStore: store, threadWorkerService: service }, "p1", {});

    expect(process.exitCode).toBe(1);
    const errOutput = errSpy.mock.calls.map((c) => c[0]).join("");
    expect(errOutput).toContain("goal is required");
  });

  it("errors when no threads and no ID", async () => {
    const store = createMockThreadStore({});
    (store.listRecentThreadIds as ReturnType<typeof mock>).mockImplementation(() => []);
    const service = createMockWorkerService();

    await handleThreadsHandoff({ threadStore: store, threadWorkerService: service }, undefined, {
      goal: "test",
    });

    expect(process.exitCode).toBe(1);
    const errOutput = errSpy.mock.calls.map((c) => c[0]).join("");
    expect(errOutput).toContain("No threads available");
  });

  it("seeds child thread with context from parent messages", async () => {
    const parent = makeSnapshot("p1", [
      { role: "user", text: "Implement feature X" },
      { role: "assistant", text: "I'll start with the database schema..." },
      { role: "user", text: "Looks good, continue" },
    ]);
    const store = createMockThreadStore({ p1: parent });
    const service = createMockWorkerService();

    await handleThreadsHandoff({ threadStore: store, threadWorkerService: service }, "p1", {
      goal: "Finish feature X",
    });

    // Check the seeded messages contain context
    const seedCall = (service.seedThreadMessages as ReturnType<typeof mock>).mock.calls[0] as [
      string,
      Array<{ content: Array<{ text: string }> }>,
    ];
    const seedText = seedCall[1][0]!.content[0]!.text;
    expect(seedText).toContain("Implement feature X");
    expect(seedText).toContain("Finish feature X");
    expect(seedText).toContain("Handoff from thread p1");
  });

  it("creates child thread with title from goal", async () => {
    const parent = makeSnapshot("p1", [{ role: "user", text: "Hi" }]);
    const store = createMockThreadStore({ p1: parent });
    const service = createMockWorkerService();

    await handleThreadsHandoff({ threadStore: store, threadWorkerService: service }, "p1", {
      goal: "Fix the authentication system",
    });

    // setCachedThread should have been called with a handoff title
    const setCalls = (store.setCachedThread as ReturnType<typeof mock>).mock.calls;
    const childSnapshot = setCalls[setCalls.length - 1]![0] as ThreadSnapshot;
    expect(childSnapshot.title).toContain("Handoff:");
    expect(childSnapshot.title).toContain("Fix the authentication system");
  });
});
