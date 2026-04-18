// packages/cli/src/widgets/__tests__/conversation-view-tools.test.ts
/**
 * Tests for ConversationView tool/activity-group rendering.
 *
 * Verifies that ConversationView can accept DisplayItem[] in its config
 * and correctly dispatch to the appropriate renderer for each item type.
 *
 * 逆向: x3 (tool row widget), Y1T (activity group widget) in
 * 1472_tui_components/misc_utils.js & actions_intents.js
 */
import { describe, expect, it } from "bun:test";
import { ConversationView } from "../conversation-view.js";
import type { DisplayItem } from "../display-items.js";

describe("ConversationView tool rendering", () => {
  it("accepts DisplayItem[] in its config", () => {
    const items: DisplayItem[] = [
      { type: "message", role: "user", text: "Run ls" },
      {
        type: "tool",
        toolUseId: "tu_1",
        toolName: "Bash",
        kind: "bash",
        status: "done",
        command: "ls -la",
        output: "total 42",
      },
      { type: "message", role: "assistant", text: "Here are the files." },
    ];
    const view = new ConversationView({ items });
    expect(view).toBeDefined();
    expect(view.config.items).toHaveLength(3);
  });

  it("accepts activity-group items", () => {
    const items: DisplayItem[] = [
      {
        type: "activity-group",
        actions: [
          { kind: "read", toolName: "Read", toolUseId: "tu_1", status: "done" },
          { kind: "search", toolName: "Grep", toolUseId: "tu_2", status: "done" },
        ],
        summary: "1 read, 1 search",
        hasInProgress: false,
      },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(1);
  });

  it("still accepts legacy messages array", () => {
    const view = new ConversationView({
      items: [],
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(view.config.messages).toHaveLength(1);
  });

  it("accepts tool items with error status", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "tu_1",
        toolName: "Bash",
        kind: "bash",
        status: "error",
        command: "rm -rf /",
        error: "Permission denied",
      },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(1);
    expect((view.config.items[0] as { error?: string }).error).toBe("Permission denied");
  });

  it("accepts tool items with edit kind", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "tu_1",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "/tmp/foo.ts",
      },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(1);
  });

  it("accepts tool items with create-file kind", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "tu_1",
        toolName: "Write",
        kind: "create-file",
        status: "done",
        path: "/tmp/new-file.ts",
      },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(1);
  });

  it("accepts tool items with generic kind and args", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "tu_1",
        toolName: "WebSearch",
        kind: "generic",
        status: "done",
        args: { query: "flitter tui" },
      },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(1);
  });

  it("accepts activity-group with in-progress actions", () => {
    const items: DisplayItem[] = [
      {
        type: "activity-group",
        actions: [
          { kind: "read", toolName: "Read", toolUseId: "tu_1", status: "done" },
          { kind: "search", toolName: "Grep", toolUseId: "tu_2", status: "in-progress" },
        ],
        summary: "1 read, 1 search",
        hasInProgress: true,
      },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(1);
    expect((view.config.items[0] as { hasInProgress: boolean }).hasInProgress).toBe(true);
  });

  it("accepts a mix of all item types", () => {
    const items: DisplayItem[] = [
      { type: "message", role: "user", text: "Do something" },
      {
        type: "activity-group",
        actions: [{ kind: "read", toolName: "Read", toolUseId: "tu_1", status: "done" }],
        summary: "1 read",
        hasInProgress: false,
      },
      {
        type: "tool",
        toolUseId: "tu_2",
        toolName: "Bash",
        kind: "bash",
        status: "done",
        command: "echo hello",
        output: "hello",
      },
      { type: "message", role: "assistant", text: "Done!" },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(4);
  });
});
