import { describe, expect, it } from "bun:test";
import { ConversationView, type ConversationViewState } from "../conversation-view.js";
import type { MessageItem } from "../display-items.js";

describe("ConversationView user message rendering", () => {
  it("user message widget has Container type name", () => {
    const view = new ConversationView({
      items: [{ type: "message", role: "user", text: "Hello" }],
    });
    const state = view.createState() as ConversationViewState;
    // Wire up the widget so initState() can access _parser and _renderer
    state._widget = view;
    state.initState();
    const item: MessageItem = { type: "message", role: "user", text: "Hello" };
    // Access private method via bracket notation for testing
    const buildFn = (state as unknown as Record<string, (item: MessageItem) => unknown>)
      ._buildUserMessageWidget;
    const widget = buildFn.call(state, item);
    expect((widget as { constructor: { name: string } }).constructor.name).toBe("Container");
  });
});
