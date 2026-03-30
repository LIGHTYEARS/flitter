// Amp Integration Guards — structural tests that prevent regressions
// in flitter-amp's core state management, persistence, and dispatch systems.
//
// These tests verify:
// 1. ConversationState immutable snapshot works
// 2. PromptHistory round-trips correctly
// 3. OverlayManager priority ordering is correct
// 4. ShortcutRegistry dispatches correctly
// 5. Session persistence save/load round-trips
//
// Gap #71: Comprehensive test coverage plan — test guardrails

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConversationState } from '../state/conversation';
import type { ConversationSnapshot } from '../state/immutable-types';
import { PromptHistory } from '../state/history';
import { OverlayManager } from '../state/overlay-manager';
import type { OverlayEntry } from '../state/overlay-manager';
import { SessionStore } from '../state/session-store';
import type { SessionFile } from '../state/session-store';
import { ShortcutRegistry } from '../shortcuts/registry';
import type { ShortcutContext, ShortcutHooks } from '../shortcuts/registry';
import { createKeyEvent } from 'flitter-core/src/input/events';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Create a minimal overlay entry for testing. */
function makeOverlay(id: string, priority: number, modal = false): OverlayEntry {
  return {
    id,
    priority,
    modal,
    placement: { type: 'fullscreen' },
    builder: () => new SizedBox({}),
  };
}

/** Create a minimal ShortcutContext mock. */
function mockContext(overrides?: Partial<ShortcutContext>): ShortcutContext {
  return {
    appState: {
      isProcessing: false,
      hasPendingPermission: false,
      conversation: { clear: () => {}, toggleToolCalls: () => {}, items: [] },
      resolvePermission: () => {},
    } as any,
    overlayManager: new OverlayManager(),
    setState: () => {},
    onCancel: () => {},
    promptHistory: new PromptHistory(),
    hooks: {
      showCommandPalette: () => {},
      showShortcutHelp: () => {},
      openInEditor: () => {},
      historyPrevious: () => {},
      historyNext: () => {},
      toggleThinking: () => {},
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. ConversationState immutable snapshot
// ---------------------------------------------------------------------------

describe('Amp Integration Guards', () => {

  describe('ConversationState immutable snapshot', () => {
    let state: ConversationState;

    beforeEach(() => {
      state = new ConversationState();
    });

    it('starts with an empty snapshot at version 0', () => {
      const snap = state.snapshot;
      expect(snap.items.length).toBe(0);
      expect(snap.plan.length).toBe(0);
      expect(snap.usage).toBeNull();
      expect(snap.isProcessing).toBe(false);
      expect(snap.version).toBe(0);
    });

    it('addUserMessage creates a new snapshot with incremented version', () => {
      const v0 = state.snapshot.version;
      state.addUserMessage('hello');

      const snap = state.snapshot;
      expect(snap.version).toBeGreaterThan(v0);
      expect(snap.items.length).toBe(1);
      expect(snap.items[0]!.type).toBe('user_message');
      expect((snap.items[0] as any).text).toBe('hello');
    });

    it('snapshot is structurally shared (previous reference unchanged)', () => {
      state.addUserMessage('first');
      const snap1 = state.snapshot;

      state.addUserMessage('second');
      const snap2 = state.snapshot;

      // Different snapshots
      expect(snap1).not.toBe(snap2);
      expect(snap2.version).toBeGreaterThan(snap1.version);

      // Items from snap1 are still frozen objects
      expect(snap1.items.length).toBe(1);
      expect(snap2.items.length).toBe(2);
    });

    it('isProcessing flag toggles correctly', () => {
      expect(state.isProcessing).toBe(false);
      state.isProcessing = true;
      expect(state.isProcessing).toBe(true);
      expect(state.snapshot.isProcessing).toBe(true);

      state.isProcessing = false;
      expect(state.isProcessing).toBe(false);
    });

    it('streaming text accumulates and flushes into snapshot', () => {
      state.appendAssistantChunk('Hello ');
      state.appendAssistantChunk('world');

      // Before flush, buffer has accumulated text
      state.flushStreamingText();
      const snap = state.snapshot;
      const item = snap.items[snap.items.length - 1] as any;

      expect(item.type).toBe('assistant_message');
      expect(item.text).toBe('Hello world');
    });

    it('addToolCall creates an indexed tool call entry', () => {
      state.addToolCall('tc_001', 'Read file', 'read', 'running');

      const snap = state.snapshot;
      expect(snap.items.length).toBe(1);
      const item = snap.items[0] as any;
      expect(item.type).toBe('tool_call');
      expect(item.toolCallId).toBe('tc_001');
    });

    it('clear() resets to empty snapshot', () => {
      state.addUserMessage('msg1');
      state.addUserMessage('msg2');
      expect(state.snapshot.items.length).toBe(2);

      state.clear();
      expect(state.snapshot.items.length).toBe(0);
    });

    it('version increases monotonically', () => {
      const versions: number[] = [];
      versions.push(state.snapshot.version);

      state.addUserMessage('a');
      versions.push(state.snapshot.version);

      state.addUserMessage('b');
      versions.push(state.snapshot.version);

      state.isProcessing = true;
      versions.push(state.snapshot.version);

      // Verify strictly increasing
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]!).toBeGreaterThan(versions[i - 1]!);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. PromptHistory round-trips
  // -------------------------------------------------------------------------

  describe('PromptHistory round-trips', () => {
    it('push and navigate backward retrieves entries in reverse order', () => {
      const h = new PromptHistory();
      h.push('first');
      h.push('second');
      h.push('third');

      expect(h.previous()).toBe('third');
      expect(h.previous()).toBe('second');
      expect(h.previous()).toBe('first');
      expect(h.previous()).toBeNull(); // no more
    });

    it('forward navigation returns to most recent', () => {
      const h = new PromptHistory();
      h.push('a');
      h.push('b');

      h.previous(); // b
      h.previous(); // a
      expect(h.next()).toBe('b');
      expect(h.next()).toBe(''); // empty string = new prompt
    });

    it('encode/decode round-trips multiline content', () => {
      const original = 'line1\nline2\nline3';
      const encoded = PromptHistory.encode(original);
      const decoded = PromptHistory.decode(encoded);

      expect(decoded).toBe(original);
    });

    it('encode/decode round-trips backslash content', () => {
      const original = 'path\\to\\file';
      const encoded = PromptHistory.encode(original);
      const decoded = PromptHistory.decode(encoded);

      expect(decoded).toBe(original);
    });

    it('encode/decode round-trips mixed backslash and newline', () => {
      const original = 'C:\\Users\\test\nNew line\\end';
      const encoded = PromptHistory.encode(original);
      const decoded = PromptHistory.decode(encoded);

      expect(decoded).toBe(original);
    });

    it('deduplicates consecutive identical entries', () => {
      const h = new PromptHistory();
      h.push('same');
      h.push('same');
      h.push('same');

      expect(h.previous()).toBe('same');
      expect(h.previous()).toBeNull(); // only one entry
    });

    it('respects maxSize eviction', () => {
      const h = new PromptHistory(3);
      h.push('a');
      h.push('b');
      h.push('c');
      h.push('d'); // evicts 'a'

      expect(h.previous()).toBe('d');
      expect(h.previous()).toBe('c');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBeNull(); // 'a' was evicted
    });

    it('resetCursor makes previous return most recent again', () => {
      const h = new PromptHistory();
      h.push('a');
      h.push('b');

      h.previous(); // b
      h.previous(); // a
      h.resetCursor();
      expect(h.previous()).toBe('b'); // starts from most recent again
    });

    it('file-based persistence round-trips', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'history-guard-'));
      const filePath = join(tmpDir, 'history.txt');

      try {
        // Create history and push entries
        const h1 = new PromptHistory(100, filePath);
        h1.push('hello world');
        h1.push('multi\nline\nentry');
        h1.push('with\\backslash');
        h1.save();

        // Load in a new instance
        const h2 = new PromptHistory(100, filePath);
        expect(h2.previous()).toBe('with\\backslash');
        expect(h2.previous()).toBe('multi\nline\nentry');
        expect(h2.previous()).toBe('hello world');
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. OverlayManager priority ordering
  // -------------------------------------------------------------------------

  describe('OverlayManager priority ordering', () => {
    let mgr: OverlayManager;

    beforeEach(() => {
      mgr = new OverlayManager();
    });

    it('starts empty with no overlays', () => {
      expect(mgr.hasOverlays).toBe(false);
      expect(mgr.count).toBe(0);
      expect(mgr.topEntry).toBeNull();
    });

    it('show() adds entries in priority-sorted order', () => {
      mgr.show(makeOverlay('high', 100));
      mgr.show(makeOverlay('low', 10));
      mgr.show(makeOverlay('mid', 50));

      const entries = mgr.activeEntries;
      expect(entries.length).toBe(3);
      expect(entries[0]!.id).toBe('low');
      expect(entries[1]!.id).toBe('mid');
      expect(entries[2]!.id).toBe('high');
    });

    it('topEntry returns the highest priority entry', () => {
      mgr.show(makeOverlay('low', 10));
      mgr.show(makeOverlay('high', 100));

      expect(mgr.topEntry!.id).toBe('high');
    });

    it('dismissTop removes highest priority entry', () => {
      mgr.show(makeOverlay('a', 10));
      mgr.show(makeOverlay('b', 50));
      mgr.show(makeOverlay('c', 100));

      const dismissed = mgr.dismissTop();
      expect(dismissed).toBe('c');
      expect(mgr.count).toBe(2);
      expect(mgr.topEntry!.id).toBe('b');
    });

    it('dismiss by id removes specific entry', () => {
      mgr.show(makeOverlay('a', 10));
      mgr.show(makeOverlay('b', 50));

      mgr.dismiss('a');
      expect(mgr.count).toBe(1);
      expect(mgr.has('a')).toBe(false);
      expect(mgr.has('b')).toBe(true);
    });

    it('show() with same id replaces existing entry', () => {
      mgr.show(makeOverlay('x', 10));
      expect(mgr.count).toBe(1);

      mgr.show(makeOverlay('x', 50)); // replace with higher priority
      expect(mgr.count).toBe(1);
      expect(mgr.topEntry!.priority).toBe(50);
    });

    it('dismissAll clears all entries', () => {
      mgr.show(makeOverlay('a', 10));
      mgr.show(makeOverlay('b', 50));
      mgr.show(makeOverlay('c', 100));

      mgr.dismissAll();
      expect(mgr.hasOverlays).toBe(false);
      expect(mgr.count).toBe(0);
    });

    it('listener is notified on show/dismiss', () => {
      let notifyCount = 0;
      mgr.addListener(() => { notifyCount++; });

      mgr.show(makeOverlay('a', 10));
      expect(notifyCount).toBe(1);

      mgr.dismiss('a');
      expect(notifyCount).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // 4. ShortcutRegistry dispatch
  // -------------------------------------------------------------------------

  describe('ShortcutRegistry dispatches correctly', () => {
    it('dispatches matching shortcut and returns handled', () => {
      const registry = new ShortcutRegistry();
      let fired = false;

      registry.register({
        id: 'test-ctrl-x',
        binding: { key: 'x', ctrl: true },
        displayKey: 'Ctrl+X',
        description: 'Test shortcut',
        category: 'general',
        action: () => { fired = true; return 'handled'; },
      });

      const event = createKeyEvent('x', { ctrlKey: true });
      const result = registry.dispatch(event, mockContext());

      expect(result).toBe('handled');
      expect(fired).toBe(true);
    });

    it('returns ignored when no shortcut matches', () => {
      const registry = new ShortcutRegistry();
      const event = createKeyEvent('z');
      expect(registry.dispatch(event, mockContext())).toBe('ignored');
    });

    it('throws on duplicate id registration', () => {
      const registry = new ShortcutRegistry();
      const entry = {
        id: 'dup',
        binding: { key: 'a' },
        displayKey: 'a',
        description: 'dup',
        category: 'general' as const,
        action: () => 'handled' as const,
      };

      registry.register(entry);
      expect(() => registry.register(entry)).toThrow(/duplicate id/);
    });

    it('guard predicate prevents dispatch when disabled', () => {
      const registry = new ShortcutRegistry();
      let fired = false;

      registry.register({
        id: 'guarded',
        binding: { key: 'g', ctrl: true },
        displayKey: 'Ctrl+G',
        description: 'Guarded shortcut',
        category: 'general',
        enabled: () => false, // Always disabled
        action: () => { fired = true; return 'handled'; },
      });

      const event = createKeyEvent('g', { ctrlKey: true });
      const result = registry.dispatch(event, mockContext());

      expect(result).toBe('ignored');
      expect(fired).toBe(false);
    });

    it('first matching enabled shortcut wins', () => {
      const registry = new ShortcutRegistry();
      const callOrder: string[] = [];

      registry.register({
        id: 'first',
        binding: { key: 'a', ctrl: true },
        displayKey: 'Ctrl+A',
        description: 'First',
        category: 'general',
        action: () => { callOrder.push('first'); return 'handled'; },
      });

      registry.register({
        id: 'second',
        binding: { key: 'a', ctrl: true },
        displayKey: 'Ctrl+A',
        description: 'Second (conflict)',
        category: 'general',
        action: () => { callOrder.push('second'); return 'handled'; },
      });

      const event = createKeyEvent('a', { ctrlKey: true });
      registry.dispatch(event, mockContext());

      // Only the first registered entry should fire
      expect(callOrder).toEqual(['first']);
    });

    it('getEntries returns all registered entries', () => {
      const registry = new ShortcutRegistry();
      registry.register({
        id: 'a', binding: { key: 'a' }, displayKey: 'a',
        description: 'A', category: 'general',
        action: () => 'handled',
      });
      registry.register({
        id: 'b', binding: { key: 'b' }, displayKey: 'b',
        description: 'B', category: 'display',
        action: () => 'handled',
      });

      const all = registry.getEntries();
      expect(all.length).toBe(2);

      const generalOnly = registry.getEntries('general');
      expect(generalOnly.length).toBe(1);
      expect(generalOnly[0]!.id).toBe('a');
    });

    it('unregister removes an entry', () => {
      const registry = new ShortcutRegistry();
      registry.register({
        id: 'removable', binding: { key: 'r' }, displayKey: 'r',
        description: 'Removable', category: 'general',
        action: () => 'handled',
      });

      expect(registry.getEntries().length).toBe(1);

      const removed = registry.unregister('removable');
      expect(removed).toBe(true);
      expect(registry.getEntries().length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Session persistence save/load round-trips
  // -------------------------------------------------------------------------

  describe('session persistence round-trips', () => {
    let tmpDir: string;
    let store: SessionStore;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'session-guard-'));
      store = new SessionStore(tmpDir);
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    function makeSession(id: string, items: any[] = []): SessionFile {
      return {
        version: 1,
        sessionId: id,
        agentName: 'test-agent',
        agentCommand: 'test --agent',
        cwd: '/tmp/test',
        gitBranch: 'main',
        createdAt: Date.now() - 10000,
        updatedAt: Date.now(),
        items,
        plan: [],
        usage: null,
        currentMode: null,
      };
    }

    it('save and load round-trips a session', () => {
      const session = makeSession('sess-1', [
        { type: 'user_message', text: 'hello', timestamp: Date.now() },
        { type: 'assistant_message', text: 'hi there', isStreaming: false, timestamp: Date.now() },
      ]);

      store.save(session);
      const loaded = store.load('sess-1');

      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe('sess-1');
      expect(loaded!.items.length).toBe(2);
      expect(loaded!.items[0]!.type).toBe('user_message');
      expect((loaded!.items[0] as any).text).toBe('hello');
    });

    it('load returns null for nonexistent session', () => {
      const loaded = store.load('nonexistent');
      expect(loaded).toBeNull();
    });

    it('save sanitizes streaming state', () => {
      const session = makeSession('sess-stream', [
        { type: 'assistant_message', text: 'partial', isStreaming: true, timestamp: Date.now() },
      ]);

      store.save(session);
      const loaded = store.load('sess-stream');

      expect(loaded).not.toBeNull();
      const msg = loaded!.items[0] as any;
      expect(msg.isStreaming).toBe(false);
    });

    it('list returns sessions sorted by most recent', () => {
      const s1 = makeSession('sess-old');
      s1.updatedAt = Date.now() - 60000;
      const s2 = makeSession('sess-new');
      s2.updatedAt = Date.now();

      store.save(s1);
      store.save(s2);

      const list = store.list();
      expect(list.length).toBe(2);
      expect(list[0]!.sessionId).toBe('sess-new');
      expect(list[1]!.sessionId).toBe('sess-old');
    });

    it('mostRecent returns the newest session', () => {
      const s1 = makeSession('sess-a');
      s1.updatedAt = Date.now() - 30000;
      const s2 = makeSession('sess-b');
      s2.updatedAt = Date.now();

      store.save(s1);
      store.save(s2);

      const most = store.mostRecent();
      expect(most).not.toBeNull();
      expect(most!.sessionId).toBe('sess-b');
    });

    it('prune removes expired sessions', () => {
      // Create a store with 1-day retention
      const shortStore = new SessionStore(tmpDir, 1);

      // Save both sessions first (save() overrides updatedAt to Date.now())
      const old = makeSession('sess-expired');
      shortStore.save(old);

      const fresh = makeSession('sess-fresh');
      shortStore.save(fresh);

      // Directly patch the index to backdate the "expired" session
      const { readFileSync, writeFileSync } = require('node:fs');
      const indexPath = join(tmpDir, 'sessions', 'index.json');
      const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
      const expiredEntry = index.sessions.find((s: any) => s.sessionId === 'sess-expired');
      if (expiredEntry) {
        expiredEntry.updatedAt = Date.now() - 2 * 24 * 60 * 60 * 1000;
      }
      writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');

      const removed = shortStore.prune();
      expect(removed).toBe(1);

      // The pruned session's file may or may not be deleted depending on implementation,
      // but the index should no longer list it
      const list = shortStore.list();
      expect(list.length).toBe(1);
      expect(list[0]!.sessionId).toBe('sess-fresh');
    });

    it('save preserves conversation item data fidelity', () => {
      const session = makeSession('sess-fidelity', [
        { type: 'user_message', text: 'multiline\nquery\nhere', timestamp: 1234567890 },
        {
          type: 'tool_call',
          toolCallId: 'tc_1',
          title: 'Read file.ts',
          kind: 'read',
          status: 'completed',
          collapsed: true,
        },
      ]);

      store.save(session);
      const loaded = store.load('sess-fidelity');

      const user = loaded!.items[0] as any;
      expect(user.text).toBe('multiline\nquery\nhere');

      const tool = loaded!.items[1] as any;
      expect(tool.toolCallId).toBe('tc_1');
      expect(tool.title).toBe('Read file.ts');
      expect(tool.kind).toBe('read');
      expect(tool.status).toBe('completed');
      expect(tool.collapsed).toBe(true);
    });
  });
});
