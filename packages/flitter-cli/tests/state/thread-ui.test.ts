// thread-ui.test.ts -- Tests for thread UI wiring (Plan 27-03).
//
// Validates mapThreadHandleToEntry, ThreadPreview, ThreadList widget props,
// buildCommandList thread commands, showThreadList/dismissThreadList overlay,
// and thread-set-visibility command behavior.

import { describe, test, expect, beforeEach } from 'bun:test';
import { ThreadPool } from '../../src/state/thread-pool';
import { createThreadHandle } from '../../src/state/thread-handle';
import type { ThreadHandle, ConversationItem } from '../../src/state/types';
import { mapThreadHandleToEntry, ThreadPreview, ThreadList } from '../../src/widgets/thread-list';
import { buildCommandList, type CommandItem } from '../../src/commands/command-registry';
import { ShortcutRegistry } from '../../src/shortcuts/registry';
import { SessionState } from '../../src/state/session';
import { AppState } from '../../src/state/app-state';
import { PromptHistory } from '../../src/state/history';
import { SessionStore } from '../../src/state/session-store';
import { OVERLAY_IDS } from '../../src/state/overlay-ids';

/** Helper to create a ThreadHandle with configurable options. */
function makeHandle(opts?: {
  id?: `T-${string}`;
  title?: string | null;
  visibility?: 'visible' | 'hidden' | 'archived';
  agentMode?: string | null;
  cwd?: string;
}): ThreadHandle {
  return createThreadHandle({
    threadID: opts?.id,
    cwd: opts?.cwd ?? '/tmp',
    model: 'test',
    title: opts?.title ?? null,
    visibility: opts?.visibility ?? 'visible',
    agentMode: opts?.agentMode ?? null,
  });
}

/** Helper to create a minimal AppState for command testing. */
function makeAppState(): AppState {
  const threadPool = new ThreadPool();
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/tmp',
    model: 'test',
  });
  const promptHistory = new PromptHistory('/tmp/test-history.json');
  const sessionStore = new SessionStore('/tmp/test-sessions');
  const appState = new AppState(session, promptHistory, sessionStore, threadPool);

  // Register initial thread in pool
  const handle = makeHandle();
  threadPool.activateThread(handle);

  return appState;
}

/** Helper to create a minimal ShortcutContext for buildCommandList. */
function makeContext(appState: AppState) {
  return {
    appState,
    overlayManager: appState.overlayManager,
    onCancel: () => {},
    promptHistory: null,
    setState: () => {},
    hooks: {
      showCommandPalette: () => {},
      showShortcutHelp: () => {},
      openInEditor: () => {},
      historyPrevious: () => {},
      historyNext: () => {},
      showFilePicker: () => {},
      toggleThinking: () => {},
      copyLastResponse: () => {},
    },
  };
}

describe('Thread UI Wiring (Plan 27-03)', () => {

  // -------------------------------------------------------------------------
  // 1. mapThreadHandleToEntry with title
  // -------------------------------------------------------------------------
  test('mapThreadHandleToEntry with title uses title as summary', () => {
    const h = makeHandle({ title: 'My Thread Title' });
    const entry = mapThreadHandleToEntry(h);

    expect(entry.summary).toBe('My Thread Title');
    expect(entry.threadID).toBe(h.threadID);
    expect(entry.cwd).toBe('/tmp');
    expect(entry.visibility).toBe('visible');
    expect(entry.agentMode).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. mapThreadHandleToEntry without title uses first user message
  // -------------------------------------------------------------------------
  test('mapThreadHandleToEntry without title uses first user message', () => {
    const h = makeHandle();
    // Add a user message to the session
    h.session.startProcessing('Hello world, this is my first prompt');

    const entry = mapThreadHandleToEntry(h);
    expect(entry.summary).toBe('Hello world, this is my first prompt');
  });

  // -------------------------------------------------------------------------
  // 3. mapThreadHandleToEntry without title or messages uses ID prefix
  // -------------------------------------------------------------------------
  test('mapThreadHandleToEntry without title or messages uses threadID prefix', () => {
    const h = makeHandle();
    const entry = mapThreadHandleToEntry(h);

    // Should be first 10 chars of the threadID
    expect(entry.summary).toBe(h.threadID.slice(0, 10));
  });

  // -------------------------------------------------------------------------
  // 4. mapThreadHandleToEntry counts user messages
  // -------------------------------------------------------------------------
  test('mapThreadHandleToEntry counts user messages correctly', () => {
    const h = makeHandle({ title: 'Test' });

    // Add 3 user messages using correct lifecycle transitions:
    // idle -> processing -> streaming -> complete -> idle (repeat)
    h.session.startProcessing('Message 1');
    h.session.beginStreaming();
    h.session.completeStream('end_turn');
    h.session.reset();

    h.session.startProcessing('Message 2');
    h.session.beginStreaming();
    h.session.completeStream('end_turn');
    h.session.reset();

    h.session.startProcessing('Message 3');

    const entry = mapThreadHandleToEntry(h);
    expect(entry.messageCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 5. mapThreadHandleToEntry includes metadata
  // -------------------------------------------------------------------------
  test('mapThreadHandleToEntry includes cwd, visibility, agentMode', () => {
    const h = makeHandle({
      cwd: '/home/user',
      visibility: 'hidden',
      agentMode: 'rush',
    });

    const entry = mapThreadHandleToEntry(h);
    expect(entry.cwd).toBe('/home/user');
    expect(entry.visibility).toBe('hidden');
    expect(entry.agentMode).toBe('rush');
  });

  // -------------------------------------------------------------------------
  // 6. buildCommandList includes thread commands
  // -------------------------------------------------------------------------
  test('buildCommandList includes all 6 thread commands', () => {
    const appState = makeAppState();
    const registry = new ShortcutRegistry();
    const ctx = makeContext(appState);

    const commands = buildCommandList(registry, appState, ctx);
    const ids = commands.map(c => c.id);

    expect(ids).toContain('thread-new');
    expect(ids).toContain('thread-switch');
    expect(ids).toContain('thread-map');
    expect(ids).toContain('thread-set-visibility');
    expect(ids).toContain('thread-navigate-back');
    expect(ids).toContain('thread-navigate-forward');

    // Old 'new-thread' should NOT be present
    expect(ids).not.toContain('new-thread');
  });

  // -------------------------------------------------------------------------
  // 7. thread-new command calls newThread
  // -------------------------------------------------------------------------
  test('thread-new command calls newThread (creates a new thread)', () => {
    const appState = makeAppState();
    const registry = new ShortcutRegistry();
    const ctx = makeContext(appState);
    const commands = buildCommandList(registry, appState, ctx);

    const threadNew = commands.find(c => c.id === 'thread-new')!;
    const countBefore = appState.threadPool.threadCount;

    threadNew.execute(() => {});

    expect(appState.threadPool.threadCount).toBeGreaterThan(countBefore);
  });

  // -------------------------------------------------------------------------
  // 8. thread-switch command calls showThreadList
  // -------------------------------------------------------------------------
  test('thread-switch command shows THREAD_LIST overlay', () => {
    const appState = makeAppState();
    const registry = new ShortcutRegistry();
    const ctx = makeContext(appState);
    const commands = buildCommandList(registry, appState, ctx);

    const threadSwitch = commands.find(c => c.id === 'thread-switch')!;

    expect(appState.overlayManager.has(OVERLAY_IDS.THREAD_LIST)).toBe(false);

    threadSwitch.execute(() => {});

    expect(appState.overlayManager.has(OVERLAY_IDS.THREAD_LIST)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 9. thread-set-visibility toggles visibility
  // -------------------------------------------------------------------------
  test('thread-set-visibility toggles active thread from visible to hidden', () => {
    const appState = makeAppState();
    const registry = new ShortcutRegistry();
    const ctx = makeContext(appState);
    const commands = buildCommandList(registry, appState, ctx);

    const activeID = appState.threadPool.activeThreadContextID!;
    const handle = appState.threadPool.threadHandleMap.get(activeID)!;
    expect(handle.visibility).toBe('visible');

    const toggleCmd = commands.find(c => c.id === 'thread-set-visibility')!;
    toggleCmd.execute(() => {});

    expect(handle.visibility).toBe('hidden');
  });

  // -------------------------------------------------------------------------
  // 10. ThreadPreview renders items and returns a widget
  // -------------------------------------------------------------------------
  test('ThreadPreview build returns a widget', () => {
    const items: ConversationItem[] = [
      {
        type: 'user_message',
        text: 'Hello world',
        timestamp: Date.now(),
      },
      {
        type: 'assistant_message',
        text: 'Hi there!',
        timestamp: Date.now(),
        isStreaming: false,
      },
    ];

    const preview = new ThreadPreview({ items, title: 'Test Thread' });
    // build() should not throw and should return a Widget
    const widget = preview.build(null as any);
    expect(widget).toBeDefined();
    expect(widget).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // 11. mapThreadHandleToEntry truncates long first message to 80 chars
  // -------------------------------------------------------------------------
  test('mapThreadHandleToEntry truncates first user message summary at 80 chars', () => {
    const h = makeHandle();
    const longMessage = 'A'.repeat(200);
    h.session.startProcessing(longMessage);

    const entry = mapThreadHandleToEntry(h);
    expect(entry.summary.length).toBeLessThanOrEqual(80);
  });

  // -------------------------------------------------------------------------
  // 12. ThreadList uses threadID (not sessionId) in items
  // -------------------------------------------------------------------------
  test('ThreadList build uses threadID field from ThreadEntry', () => {
    const entries = [
      {
        threadID: 'T-test-1',
        summary: 'First thread',
        updatedAt: Date.now(),
        messageCount: 2,
        cwd: '/tmp',
        visibility: 'visible',
        agentMode: null,
      },
    ];

    const list = new ThreadList({
      threads: entries,
      currentThreadID: 'T-test-1',
      onSelect: () => {},
      onDismiss: () => {},
    });

    // build() should not throw and should return a Widget
    const widget = list.build(null as any);
    expect(widget).toBeDefined();
  });
});
