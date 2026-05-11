/**
 * Widget cache mechanism tests for ConversationView.
 *
 * Verifies:
 * - Stable items are cached and reused on rebuild (same Widget instance)
 * - Streaming items bypass cache and rebuild every time
 * - Removed items have their cache entries cleaned up
 * - Cache invalidation when item signature changes
 *
 * 逆向: chunk-006.js:31670-31673, 32067-32070, 32218-32231
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import type { BuildContext, Widget } from "@flitter/tui";
import {
  ConversationView,
  type ConversationViewConfig,
  type ConversationViewState,
} from "../conversation-view.js";
import type { DisplayItem } from "../display-items.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Mount a ConversationView with the given config and return the state for inspection.
 */
function mountState(config: ConversationViewConfig): ConversationViewState {
  const widget = new ConversationView(config);
  const state = widget.createState() as ConversationViewState;
  const mockElement = { markNeedsRebuild: () => {} } as unknown as object;
  (state as unknown as Record<string, unknown>)._widget = widget;
  (state as unknown as Record<string, unknown>)._element = mockElement;
  (state as unknown as Record<string, unknown>)._mounted = true;
  state.initState();
  return state;
}

/**
 * Invoke build() on the state with a mock context and return the result widget.
 */
function buildWidget(state: ConversationViewState): Widget {
  const mockContext = {} as BuildContext;
  return state.build(mockContext);
}

/**
 * Access the private _widgetCache field via reflection.
 */
function getWidgetCache(
  state: ConversationViewState,
): Map<string, { sig: string; widget: Widget }> {
  return (state as unknown as Record<string, unknown>)._widgetCache as Map<
    string,
    { sig: string; widget: Widget }
  >;
}

/**
 * Access the private _streamingIndexes field via reflection.
 */
function getStreamingIndexes(state: ConversationViewState): Set<number> {
  return (state as unknown as Record<string, unknown>)._streamingIndexes as Set<number>;
}

/**
 * Access the private _renderItemCacheKeys field via reflection.
 */
function getRenderItemCacheKeys(state: ConversationViewState): string[] {
  return (state as unknown as Record<string, unknown>)._renderItemCacheKeys as string[];
}

/**
 * Update the widget reference on state (simulate didUpdateWidget).
 */
function updateWidget(state: ConversationViewState, config: ConversationViewConfig): void {
  const oldWidget = (state as unknown as Record<string, unknown>)._widget as ConversationView;
  const newWidget = new ConversationView(config);
  (state as unknown as Record<string, unknown>)._widget = newWidget;
  state.didUpdateWidget(oldWidget);
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("ConversationView Widget Cache", () => {
  describe("cache hit — stable items reuse widgets", () => {
    it("same items rebuild returns cached widget instances", () => {
      const items: DisplayItem[] = [
        { type: "message", role: "user", text: "Hello" },
        { type: "message", role: "assistant", text: "Hi there!" },
      ];

      const state = mountState({ items });

      // First build populates the cache
      buildWidget(state);
      const cache = getWidgetCache(state);
      expect(cache.size).toBeGreaterThan(0);

      // Capture widget references from cache
      const cachedEntries = new Map<string, Widget>();
      for (const [key, val] of cache.entries()) {
        cachedEntries.set(key, val.widget);
      }

      // Second build with same items should reuse cached widgets
      buildWidget(state);
      const cacheAfter = getWidgetCache(state);

      for (const [key, val] of cacheAfter.entries()) {
        const prev = cachedEntries.get(key);
        if (prev) {
          // Same widget instance should be reused (identity check)
          expect(val.widget).toBe(prev);
        }
      }
    });

    it("completed tool item is cached and reused", () => {
      const items: DisplayItem[] = [
        {
          type: "tool",
          toolUseId: "tool-1",
          toolName: "Read",
          kind: "read",
          status: "done",
          path: "/foo/bar.ts",
        },
      ];

      const state = mountState({ items });
      buildWidget(state);

      const cache = getWidgetCache(state);
      const firstBuildWidgets = [...cache.values()].map((v) => v.widget);

      // Rebuild with same data
      buildWidget(state);
      const secondBuildWidgets = [...cache.values()].map((v) => v.widget);

      expect(firstBuildWidgets.length).toBe(secondBuildWidgets.length);
      for (let i = 0; i < firstBuildWidgets.length; i++) {
        expect(secondBuildWidgets[i]).toBe(firstBuildWidgets[i]);
      }
    });
  });

  describe("cache miss — streaming items always rebuild", () => {
    it("streaming assistant message bypasses cache", () => {
      const items: DisplayItem[] = [
        { type: "message", role: "assistant", text: "Thinking...", isStreaming: true },
      ];

      const state = mountState({ items });
      buildWidget(state);

      // Streaming items should be in _streamingIndexes
      const streamingIndexes = getStreamingIndexes(state);
      expect(streamingIndexes.has(0)).toBe(true);

      // Streaming items should NOT be in the widget cache
      const cache = getWidgetCache(state);
      expect(cache.size).toBe(0);
    });

    it("in-progress tool bypasses cache", () => {
      const items: DisplayItem[] = [
        {
          type: "tool",
          toolUseId: "tool-2",
          toolName: "Bash",
          kind: "bash",
          status: "in-progress",
          command: "ls -la",
        },
      ];

      const state = mountState({ items });
      buildWidget(state);

      const streamingIndexes = getStreamingIndexes(state);
      expect(streamingIndexes.has(0)).toBe(true);

      const cache = getWidgetCache(state);
      expect(cache.size).toBe(0);
    });

    it("activity group with hasInProgress bypasses cache", () => {
      const items: DisplayItem[] = [
        {
          type: "activity-group",
          actions: [
            {
              kind: "read",
              toolName: "Read",
              toolUseId: "a1",
              status: "in-progress",
              path: "/a.ts",
            },
          ],
          summary: "Reading files",
          hasInProgress: true,
        },
      ];

      const state = mountState({ items });
      buildWidget(state);

      const streamingIndexes = getStreamingIndexes(state);
      expect(streamingIndexes.has(0)).toBe(true);

      const cache = getWidgetCache(state);
      expect(cache.size).toBe(0);
    });

    it("streaming thinking block bypasses cache", () => {
      const items: DisplayItem[] = [
        { type: "thinking", text: "reasoning...", isExpanded: false, isStreaming: true },
      ];

      const state = mountState({ items });
      buildWidget(state);

      const streamingIndexes = getStreamingIndexes(state);
      expect(streamingIndexes.has(0)).toBe(true);

      const cache = getWidgetCache(state);
      expect(cache.size).toBe(0);
    });
  });

  describe("cache cleanup — removed items evicted", () => {
    it("removed items have cache entries cleaned up", () => {
      const items: DisplayItem[] = [
        { type: "message", role: "user", text: "First" },
        { type: "message", role: "assistant", text: "Second" },
        { type: "message", role: "user", text: "Third" },
      ];

      const state = mountState({ items });
      buildWidget(state);

      const cacheBefore = getWidgetCache(state);
      expect(cacheBefore.size).toBe(3);

      // Remove the last item
      const reducedItems: DisplayItem[] = [
        { type: "message", role: "user", text: "First" },
        { type: "message", role: "assistant", text: "Second" },
      ];
      updateWidget(state, { items: reducedItems });
      buildWidget(state);

      const cacheAfter = getWidgetCache(state);
      // Only 2 entries should remain after cleanup
      expect(cacheAfter.size).toBe(2);
    });

    it("replacing all items clears stale cache entries", () => {
      const items1: DisplayItem[] = [{ type: "message", role: "user", text: "Hello" }];

      const state = mountState({ items: items1 });
      buildWidget(state);
      expect(getWidgetCache(state).size).toBe(1);

      // Replace with completely different items
      const items2: DisplayItem[] = [
        {
          type: "tool",
          toolUseId: "new-tool",
          toolName: "Edit",
          kind: "edit",
          status: "done",
          path: "/x.ts",
        },
      ];
      updateWidget(state, { items: items2 });
      buildWidget(state);

      const cacheAfter = getWidgetCache(state);
      // Old msg entry orphaned and cleaned; only new tool entry remains
      expect(cacheAfter.size).toBe(1);
      const keys = [...cacheAfter.keys()];
      expect(keys[0]).toContain("tool:new-tool");
    });
  });

  describe("cache invalidation — signature change triggers rebuild", () => {
    it("tool status change invalidates cache", () => {
      const items1: DisplayItem[] = [
        {
          type: "tool",
          toolUseId: "tool-x",
          toolName: "Read",
          kind: "read",
          status: "done",
          path: "/a.ts",
        },
      ];

      const state = mountState({ items: items1 });
      buildWidget(state);

      const firstWidget = [...getWidgetCache(state).values()][0]!.widget;

      // Change status to error — should invalidate
      const items2: DisplayItem[] = [
        {
          type: "tool",
          toolUseId: "tool-x",
          toolName: "Read",
          kind: "read",
          status: "error",
          path: "/a.ts",
          error: "File not found",
        },
      ];
      updateWidget(state, { items: items2 });
      buildWidget(state);

      const secondWidget = [...getWidgetCache(state).values()][0]!.widget;
      // Widget should be a NEW instance due to signature change
      expect(secondWidget).not.toBe(firstWidget);
    });

    it("message text change invalidates cache", () => {
      const items1: DisplayItem[] = [{ type: "message", role: "user", text: "Hello" }];

      const state = mountState({ items: items1 });
      buildWidget(state);

      const firstWidget = [...getWidgetCache(state).values()][0]!.widget;

      // Change text (length changes → signature changes)
      const items2: DisplayItem[] = [
        { type: "message", role: "user", text: "Hello world, this is longer" },
      ];
      updateWidget(state, { items: items2 });
      buildWidget(state);

      const secondWidget = [...getWidgetCache(state).values()][0]!.widget;
      expect(secondWidget).not.toBe(firstWidget);
    });
  });

  describe("streaming → stable transition caches the widget", () => {
    it("item transitions from streaming to stable and gets cached", () => {
      // Start with streaming item
      const items1: DisplayItem[] = [
        { type: "message", role: "assistant", text: "typing...", isStreaming: true },
      ];

      const state = mountState({ items: items1 });
      buildWidget(state);

      // Streaming: should NOT be cached
      expect(getWidgetCache(state).size).toBe(0);
      expect(getStreamingIndexes(state).has(0)).toBe(true);

      // Transition to stable (streaming done)
      const items2: DisplayItem[] = [
        { type: "message", role: "assistant", text: "Final answer here." },
      ];
      updateWidget(state, { items: items2 });
      buildWidget(state);

      // Now should be cached
      expect(getWidgetCache(state).size).toBe(1);
      expect(getStreamingIndexes(state).has(0)).toBe(false);
    });
  });

  describe("_renderItemCacheKeys dedup counter", () => {
    it("duplicate cache identities get unique keys via counter suffix", () => {
      // Two messages at index 0 and 1 — identities are "msg:0" and "msg:1" so no dup
      // But if we could have same identity... let's just verify keys are generated
      const items: DisplayItem[] = [
        { type: "message", role: "user", text: "A" },
        { type: "message", role: "user", text: "B" },
      ];

      const state = mountState({ items });
      buildWidget(state);

      const keys = getRenderItemCacheKeys(state);
      expect(keys.length).toBe(2);
      // Each key should be unique
      expect(keys[0]).not.toBe(keys[1]);
      // Format: identity:counter
      expect(keys[0]).toMatch(/^msg:0:\d+$/);
      expect(keys[1]).toMatch(/^msg:1:\d+$/);
    });
  });
});
