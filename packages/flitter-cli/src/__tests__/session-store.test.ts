// Tests for SessionStore — session persistence, indexing, pruning, and sanitization.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SessionStore } from '../state/session-store';
import type { SessionFile, SessionIndexEntry } from '../state/session-store';
import type { ConversationItem } from '../state/types';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal valid SessionFile for testing. */
function makeSession(overrides: Partial<SessionFile> = {}): SessionFile {
  return {
    version: 1,
    sessionId: overrides.sessionId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    cwd: '/tmp/test',
    gitBranch: null,
    model: 'test-model',
    createdAt: Date.now() - 60000,
    updatedAt: Date.now(),
    items: [],
    plan: [],
    usage: null,
    currentMode: null,
    ...overrides,
  };
}

/** Create a user message ConversationItem. */
function userMessage(text: string): ConversationItem {
  return {
    type: 'user_message',
    text,
    timestamp: Date.now(),
  };
}

/** Create an assistant message ConversationItem. */
function assistantMessage(text: string, isStreaming = false): ConversationItem {
  return {
    type: 'assistant_message',
    text,
    timestamp: Date.now(),
    isStreaming,
  };
}

/** Create a thinking item ConversationItem. */
function thinkingItem(text: string, isStreaming = false): ConversationItem {
  return {
    type: 'thinking',
    text,
    timestamp: Date.now(),
    isStreaming,
    collapsed: false,
  };
}

/** Create a tool call item ConversationItem. */
function toolCallItem(id: string, isStreaming = false): ConversationItem {
  return {
    type: 'tool_call',
    toolCallId: id,
    title: 'TestTool',
    kind: 'test',
    status: 'completed',
    collapsed: false,
    isStreaming,
  };
}

describe('SessionStore', () => {
  let tmpDir: string;
  let store: SessionStore;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'session-store-test-'));
    store = new SessionStore({ baseDir: tmpDir });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // save / load round-trip
  // ---------------------------------------------------------------------------

  describe('save and load round-trip', () => {
    it('saves and loads a session with items', () => {
      const session = makeSession({
        sessionId: 'rt-1',
        items: [
          userMessage('hello'),
          assistantMessage('hi there'),
        ],
      });

      store.save(session);
      const loaded = store.load('rt-1');

      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe('rt-1');
      expect(loaded!.items.length).toBe(2);
      expect(loaded!.items[0].type).toBe('user_message');
      expect(loaded!.items[1].type).toBe('assistant_message');
    });

    it('preserves session metadata through round-trip', () => {
      const session = makeSession({
        sessionId: 'rt-2',
        cwd: '/home/user/project',
        gitBranch: 'main',
        model: 'claude-sonnet',
        currentMode: 'smart',
      });

      store.save(session);
      const loaded = store.load('rt-2');

      expect(loaded!.cwd).toBe('/home/user/project');
      expect(loaded!.gitBranch).toBe('main');
      expect(loaded!.model).toBe('claude-sonnet');
      expect(loaded!.currentMode).toBe('smart');
    });

    it('returns null for non-existent session', () => {
      expect(store.load('nonexistent')).toBeNull();
    });

    it('saves session to an actual file on disk', () => {
      const session = makeSession({ sessionId: 'atomic-1' });
      store.save(session);

      const filePath = join(tmpDir, 'atomic-1.json');
      expect(existsSync(filePath)).toBe(true);

      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.sessionId).toBe('atomic-1');
    });
  });

  // ---------------------------------------------------------------------------
  // list ordering
  // ---------------------------------------------------------------------------

  describe('list ordering', () => {
    it('lists sessions sorted by most recent first (save order determines updatedAt)', () => {
      store.save(makeSession({ sessionId: 'list-1' }));
      store.save(makeSession({ sessionId: 'list-2' }));
      store.save(makeSession({ sessionId: 'list-3' }));

      const entries = store.list();
      expect(entries.length).toBe(3);
      expect(entries[0].sessionId).toBe('list-3');
      expect(entries[1].sessionId).toBe('list-2');
      expect(entries[2].sessionId).toBe('list-1');
    });

    it('returns empty list when no sessions exist', () => {
      expect(store.list()).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // mostRecent
  // ---------------------------------------------------------------------------

  describe('mostRecent', () => {
    it('returns the most recently saved session', () => {
      store.save(makeSession({ sessionId: 'mr-1' }));
      store.save(makeSession({ sessionId: 'mr-2' }));
      store.save(makeSession({ sessionId: 'mr-3' }));

      const recent = store.mostRecent();
      expect(recent).not.toBeNull();
      expect(recent!.sessionId).toBe('mr-3');
    });

    it('returns null when no sessions exist', () => {
      expect(store.mostRecent()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // prune (retention policy)
  // ---------------------------------------------------------------------------

  describe('prune', () => {
    it('removes sessions older than retention period', () => {
      const now = Date.now();
      const oldTimestamp = now - 60 * 24 * 60 * 60 * 1000;

      store.save(makeSession({ sessionId: 'old-1' }));
      store.save(makeSession({ sessionId: 'recent-1' }));

      const oldFile = JSON.parse(readFileSync(join(tmpDir, 'old-1.json'), 'utf-8'));
      oldFile.updatedAt = oldTimestamp;
      writeFileSync(join(tmpDir, 'old-1.json'), JSON.stringify(oldFile), 'utf-8');

      const index = JSON.parse(readFileSync(join(tmpDir, 'index.json'), 'utf-8'));
      for (const s of index.sessions) {
        if (s.sessionId === 'old-1') s.updatedAt = oldTimestamp;
      }
      writeFileSync(join(tmpDir, 'index.json'), JSON.stringify(index), 'utf-8');

      const pruned = store.prune();
      expect(pruned).toBe(1);

      const entries = store.list();
      expect(entries.length).toBe(1);
      expect(entries[0].sessionId).toBe('recent-1');
    });

    it('removes session files from disk when pruning', () => {
      const now = Date.now();
      const oldTimestamp = now - 60 * 24 * 60 * 60 * 1000;

      store.save(makeSession({ sessionId: 'prune-disk-1' }));

      const filePath = join(tmpDir, 'prune-disk-1.json');
      expect(existsSync(filePath)).toBe(true);

      const oldFile = JSON.parse(readFileSync(filePath, 'utf-8'));
      oldFile.updatedAt = oldTimestamp;
      writeFileSync(filePath, JSON.stringify(oldFile), 'utf-8');

      const index = JSON.parse(readFileSync(join(tmpDir, 'index.json'), 'utf-8'));
      for (const s of index.sessions) {
        if (s.sessionId === 'prune-disk-1') s.updatedAt = oldTimestamp;
      }
      writeFileSync(join(tmpDir, 'index.json'), JSON.stringify(index), 'utf-8');

      store.prune();
      expect(existsSync(filePath)).toBe(false);
    });

    it('returns 0 when nothing to prune', () => {
      store.save(makeSession({ sessionId: 'fresh-1', updatedAt: Date.now() }));
      expect(store.prune()).toBe(0);
    });

    it('handles empty store gracefully', () => {
      expect(store.prune()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeItem (strips isStreaming)
  // ---------------------------------------------------------------------------

  describe('sanitizeItem', () => {
    it('strips isStreaming from assistant_message', () => {
      const session = makeSession({
        sessionId: 'san-1',
        items: [
          assistantMessage('hello', true),
        ],
      });

      store.save(session);
      const loaded = store.load('san-1');
      const item = loaded!.items[0];

      expect(item.type).toBe('assistant_message');
      if (item.type === 'assistant_message') {
        expect(item.isStreaming).toBe(false);
      }
    });

    it('strips isStreaming from thinking items', () => {
      const session = makeSession({
        sessionId: 'san-2',
        items: [
          thinkingItem('pondering...', true),
        ],
      });

      store.save(session);
      const loaded = store.load('san-2');
      const item = loaded!.items[0];

      expect(item.type).toBe('thinking');
      if (item.type === 'thinking') {
        expect(item.isStreaming).toBe(false);
      }
    });

    it('strips isStreaming from tool_call items', () => {
      const session = makeSession({
        sessionId: 'san-3',
        items: [
          toolCallItem('tc-1', true),
        ],
      });

      store.save(session);
      const loaded = store.load('san-3');
      const item = loaded!.items[0];

      expect(item.type).toBe('tool_call');
      if (item.type === 'tool_call') {
        expect(item.isStreaming).toBe(false);
      }
    });

    it('preserves non-streaming items unchanged', () => {
      const session = makeSession({
        sessionId: 'san-4',
        items: [
          userMessage('hello'),
          assistantMessage('world', false),
          toolCallItem('tc-2', false),
        ],
      });

      store.save(session);
      const loaded = store.load('san-4');

      expect(loaded!.items.length).toBe(3);
      expect(loaded!.items[0].type).toBe('user_message');
      if (loaded!.items[1].type === 'assistant_message') {
        expect(loaded!.items[1].isStreaming).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Index management (upsert, rebuild)
  // ---------------------------------------------------------------------------

  describe('index management', () => {
    it('upserts index entry on save', () => {
      const session = makeSession({
        sessionId: 'idx-1',
        items: [userMessage('first prompt')],
      });

      store.save(session);
      const entries = store.list();

      expect(entries.length).toBe(1);
      expect(entries[0].sessionId).toBe('idx-1');
      expect(entries[0].summary).toBe('first prompt');
      expect(entries[0].messageCount).toBe(1);
    });

    it('updates existing index entry on re-save', () => {
      const session = makeSession({
        sessionId: 'idx-2',
        items: [userMessage('version 1')],
      });
      store.save(session);

      session.items = [
        userMessage('version 1'),
        assistantMessage('reply'),
        userMessage('version 2'),
      ];
      store.save(session);

      const entries = store.list();
      expect(entries.length).toBe(1);
      expect(entries[0].messageCount).toBe(2);
    });

    it('extracts summary from first user message', () => {
      const session = makeSession({
        sessionId: 'idx-3',
        items: [
          assistantMessage('system init'),
          userMessage('tell me a joke'),
        ],
      });

      store.save(session);
      const entries = store.list();
      expect(entries[0].summary).toBe('tell me a joke');
    });

    it('uses "(empty session)" for sessions with no user messages', () => {
      const session = makeSession({
        sessionId: 'idx-4',
        items: [],
      });

      store.save(session);
      const entries = store.list();
      expect(entries[0].summary).toBe('(empty session)');
    });

    it('truncates summary to 80 characters', () => {
      const longText = 'x'.repeat(200);
      const session = makeSession({
        sessionId: 'idx-5',
        items: [userMessage(longText)],
      });

      store.save(session);
      const entries = store.list();
      expect(entries[0].summary.length).toBe(80);
    });

    it('persists index across store instances', () => {
      const session = makeSession({
        sessionId: 'idx-persist',
        items: [userMessage('persistent prompt')],
      });
      store.save(session);

      const store2 = new SessionStore({ baseDir: tmpDir });
      const entries = store2.list();
      expect(entries.length).toBe(1);
      expect(entries[0].sessionId).toBe('idx-persist');
    });

    it('index file exists after save', () => {
      store.save(makeSession({ sessionId: 'idx-file' }));
      const indexPath = join(tmpDir, 'index.json');
      expect(existsSync(indexPath)).toBe(true);

      const raw = readFileSync(indexPath, 'utf-8');
      const index = JSON.parse(raw);
      expect(index.version).toBe(1);
      expect(index.sessions.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Atomic write verification
  // ---------------------------------------------------------------------------

  describe('atomic write', () => {
    it('session file exists after save (no leftover .tmp files)', () => {
      store.save(makeSession({ sessionId: 'atom-1' }));

      const sessionPath = join(tmpDir, 'atom-1.json');
      expect(existsSync(sessionPath)).toBe(true);

      const { readdirSync } = require('node:fs');
      const files: string[] = readdirSync(tmpDir);
      const tmpFiles = files.filter((f: string) => f.endsWith('.tmp'));
      expect(tmpFiles.length).toBe(0);
    });

    it('session data is valid JSON after save', () => {
      const session = makeSession({
        sessionId: 'atom-2',
        items: [userMessage('hello'), assistantMessage('world')],
      });
      store.save(session);

      const raw = readFileSync(join(tmpDir, 'atom-2.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.version).toBe(1);
      expect(parsed.items.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Monotonic updatedAt
  // ---------------------------------------------------------------------------

  describe('monotonic updatedAt', () => {
    it('ensures updatedAt is monotonically increasing across rapid saves', () => {
      const s1 = makeSession({ sessionId: 'mono-1', updatedAt: Date.now() });
      const s2 = makeSession({ sessionId: 'mono-2', updatedAt: Date.now() });

      store.save(s1);
      store.save(s2);

      const loaded1 = store.load('mono-1');
      const loaded2 = store.load('mono-2');

      expect(loaded2!.updatedAt).toBeGreaterThanOrEqual(loaded1!.updatedAt);
    });
  });
});
