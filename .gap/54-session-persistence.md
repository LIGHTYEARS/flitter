# Gap S08: No Session Persistence or Resume

## Status: Open
## Severity: Medium (total data loss on every exit; no cross-session continuity)
## Area: `packages/flitter-amp/src/acp/types.ts`, `packages/flitter-amp/src/acp/connection.ts`, `packages/flitter-amp/src/state/app-state.ts`, `packages/flitter-amp/src/state/conversation.ts`, `packages/flitter-amp/src/state/config.ts`, `packages/flitter-amp/src/index.ts`

---

## 1. Problem Statement

When a user exits flitter-amp -- whether through Ctrl+C, SIGTERM, a terminal close, or
an agent crash -- the entire conversation is destroyed. Every user message, assistant
response, tool call record, plan state, and usage metric vanishes permanently. On the next
launch, the application starts from a blank slate with zero recall of prior sessions.

This gap manifests in three concrete deficiencies:

1. **No conversation export.** There is no command, keybinding, or API to serialize the
   current conversation to disk in any format (JSON, Markdown, plain text).

2. **No save/restore.** The application cannot save its state on exit and reload it on
   the next launch. A user who spent 30 minutes on a complex multi-tool debugging session
   loses all context if the terminal is accidentally closed.

3. **`LoadSessionRequest` imported but unused.** The ACP types in `acp/types.ts` (lines
   14-15) re-export `LoadSessionRequest` and `LoadSessionResponse` from the
   `@agentclientprotocol/sdk`, signaling that the protocol supports session resumption.
   However, `connection.ts` only ever calls `connection.newSession()` -- there is no
   code path that calls `connection.loadSession()` or references these types elsewhere
   in the codebase.

### Current Behavior

```
Session 1: user runs 20-message debugging session with agent
  --> ConversationState.items has 40+ items (messages, tool calls, thinking)
  --> User exits (Ctrl+C)
  --> cleanup() in index.ts kills agent, closes log, writes nothing
  --> All items discarded; no file written

Session 2: user launches flitter-amp
  --> ConversationState.items = []
  --> No way to review, search, or continue previous work
  --> Agent starts fresh with no conversation history
```

### Expected Behavior

```
Session 1: user runs 20-message debugging session
  --> On each prompt completion: conversation auto-saved to ~/.flitter/sessions/<id>.json
  --> On exit: final save triggered in cleanup() handler
  --> On Ctrl+E (export): conversation written to user-chosen format (md/json/txt)

Session 2: user launches flitter-amp
  --> CLI shows recent sessions: "Resume session from 5m ago? [Y/n]"
  --> Or: flitter-amp --resume <session-id>
  --> ConversationState rehydrated from disk
  --> If agent supports LoadSession: ACP session also resumed server-side
  --> If agent does not support LoadSession: local history displayed read-only,
      new agent session created for fresh prompts
```

---

## 2. Root Cause Analysis

### 2.1 Purely In-Memory Conversation State

`ConversationState` in `state/conversation.ts` is a plain class with no serialization
awareness. Its `items: ConversationItem[]` array holds union-typed objects with five
variants (`user_message`, `assistant_message`, `thinking`, `tool_call`, `plan`) and
nested structures including streaming state (`isStreaming`, private `_streamingMessage`,
private `_streamingThinking`). There is no `toJSON()` method, no schema version, and no
deserialization constructor.

The class has a `clear()` method that resets all state to empty, but no corresponding
`restore()` or `fromJSON()` method. Serialization is non-trivial because the private
streaming references (`_streamingMessage`, `_streamingThinking`) point into the `items`
array -- they are live references to objects within the list, not standalone values.

### 2.2 Single-Session Architecture

`index.ts` creates exactly one `AppState` and exactly one ACP session per process
lifetime. The `sessionId` is captured in a closure inside `handleSubmit` (line 94 of
`index.ts`) and stored on `AppState.sessionId` via `setConnected()`. There is no
session-switching mechanism, no session list, and no way to create a second session
without restarting the process.

The `AppState` class (in `state/app-state.ts`) has a `sessionId` field but no metadata
about when the session was created, what agent command spawned it, or how to relocate
the session file on disk. The app state is purely runtime -- it has no persistence layer.

### 2.3 No LoadSession Integration

The ACP protocol defines `session/load` as a method for resuming a previously created
session by ID. The `ClientSideConnection` class from the SDK exposes a `loadSession()`
method alongside `newSession()`. The flitter-amp codebase exports the request/response
types (`LoadSessionRequest`, `LoadSessionResponse` at lines 14-15 of `acp/types.ts`) but
never calls `connection.loadSession()`. The entire connection flow in `connectToAgent()`
(in `acp/connection.ts`) is hardcoded to `newSession()`:

```typescript
// connection.ts lines 62-67 -- always creates a new session
const sessionResponse = await connection.newSession({
  cwd,
  mcpServers: [],
});
```

There is no branch for loading an existing session, no check of agent capabilities for
session-load support, and no fallback logic.

### 2.4 No Export Facility

There is no UI command, keybinding, or command-palette entry for exporting the
conversation. The `CommandPalette` widget in `widgets/command-palette.ts` has three
commands (`clear`, `toggle-tools`, `toggle-thinking`) but no `export` action. The
`FocusScope.onKey` handler in `app.ts` handles Ctrl+L (clear), Ctrl+O (palette),
Ctrl+C (cancel), Ctrl+R (history), and Alt+T (toggle tools) but has no Ctrl+S (save)
or Ctrl+E (export) binding.

### 2.5 Cleanup Handler Omission

The `cleanup()` function in `index.ts` (lines 73-77) handles ACP connection teardown
and log file closure but has no hook for persisting state:

```typescript
const cleanup = () => {
  handle.client.cleanup();   // kills terminals
  handle.agent.kill();       // kills agent subprocess
  closeLogFile();            // closes log file
  // NO saveSession() call -- state is silently discarded
};
```

This function is called on SIGINT and SIGTERM. There is no `beforeExit` or `exit` handler.

### 2.6 Duplicate Session State Class (Vestigial)

A separate `SessionState` class exists in `acp/session.ts` that closely mirrors
`ConversationState` but is completely unused (no imports reference it from any other file).
It was likely an early attempt at session management that was superseded by
`ConversationState` in `state/conversation.ts`. This vestigial class should not be confused
with the persistence layer proposed here -- it is dead code (see Gap 47).

### 2.7 PromptHistory Is Also In-Memory

The `PromptHistory` class in `state/history.ts` maintains an in-memory array of previous
user prompts for Ctrl+R navigation. It has no persistence either (addressed separately by
Gap S07 / 53-history-persistence.md). Session persistence must handle the full conversation
including agent responses, not just user prompts.

---

## 3. Design Decisions

### 3.1 Storage Location and Directory Layout

```
~/.flitter/
  sessions/
    <session-id>.json       # Full session snapshot
    index.json              # Session index (list of recent sessions with metadata)
  logs/                     # Already exists (logger.ts writes here)
  prompt_history            # Added by gap S07
```

**Rationale**: `~/.flitter/` is already the established data directory (the logger in
`utils/logger.ts` writes to `~/.flitter/logs/`). Sessions are runtime data, not user
configuration, so they belong here rather than in `~/.flitter-amp/config.json`.

### 3.2 Session File Format (SessionFile)

JSON with a versioned schema envelope. The session file contains the full conversation
state, agent metadata, and timing information.

```typescript
interface SessionFile {
  version: 1;                          // Schema version for forward compatibility
  sessionId: string;                   // ACP session ID from newSession/loadSession
  agentName: string | null;            // e.g. "claude", from initResponse.agentInfo
  agentCommand: string;                // Full command + args used to spawn agent
  cwd: string;                         // Working directory at session creation
  gitBranch: string | null;            // Git branch detected at session start
  createdAt: number;                   // Unix ms, set on first save
  updatedAt: number;                   // Unix ms, updated on every save
  items: SerializedConversationItem[]; // Full conversation with streaming finalized
  plan: PlanEntry[];                   // Current plan entries
  usage: UsageInfo | null;             // Token usage / cost at time of save
  currentMode: string | null;          // Agent mode (e.g. "smart", "code")
}
```

**Why JSON over SQLite?** Each session is a single logical document (one file per
session). The data is inherently hierarchical (nested tool call results, plan entries).
JSON is human-readable, easy to `cat` or `jq`, and requires no native binaries. Session
files are small (typically 50-500KB even for long conversations). SQLite would add
complexity for no meaningful benefit at this scale.

**Why not Markdown export as the primary format?** Markdown is lossy -- it cannot
round-trip tool call metadata, raw input/output, usage info, or plan state. Markdown
export is provided as a secondary export format for human consumption, but the
persistence format must be lossless JSON for restore.

### 3.3 Serialization of ConversationItem

The `ConversationItem` union type (`acp/types.ts` line 86) contains transient state
that must not be serialized or must be normalized:

| Field | Treatment |
|-------|-----------|
| `AssistantMessage.isStreaming` | Always serialize as `false` (finalized) |
| `ThinkingItem.isStreaming` | Always serialize as `false` |
| `ToolCallItem.collapsed` | Serialize current value; on restore, respect global toggle |
| `ThinkingItem.collapsed` | Serialize current value |
| `ConversationState._streamingMessage` | Private; not serialized (null on restore) |
| `ConversationState._streamingThinking` | Private; not serialized (null on restore) |

The serialized item type mirrors `ConversationItem` but with streaming fields forced
to their finalized values:

```typescript
type SerializedConversationItem =
  | UserMessage                                               // Unchanged
  | Omit<AssistantMessage, 'isStreaming'> & { isStreaming: false }
  | Omit<ThinkingItem, 'isStreaming'> & { isStreaming: false }
  | ToolCallItem                                              // Unchanged
  | PlanItem;                                                 // Unchanged
```

### 3.4 Auto-Save Strategy

Sessions are auto-saved at two points:

1. **On prompt completion.** After every `onPromptComplete()` callback in `AppState`
   (line 161 of `app-state.ts`), the full session state is serialized and written to
   `~/.flitter/sessions/<session-id>.json`. This captures the most recent exchange.

2. **On application exit.** The `cleanup()` handler in `index.ts` triggers a final save
   before killing the agent and closing the log file. This catches any in-progress
   streaming state that was not yet finalized by a PromptResponse.

Auto-save is intentionally **not** triggered on every streaming chunk. Writing a full
JSON file hundreds of times per second during streaming would be wasteful. The prompt-
completion boundary is the natural save point -- it represents a logical checkpoint
where both user and assistant turns are complete.

Manual save via Ctrl+S provides an escape hatch for users who want to capture mid-stream
state (e.g., before a long tool call completes).

### 3.5 Session Index

A lightweight index file (`~/.flitter/sessions/index.json`) tracks recent sessions
for the resume flow without requiring a full directory scan and parse of every session
file:

```typescript
interface SessionIndex {
  version: 1;
  sessions: SessionIndexEntry[];
}

interface SessionIndexEntry {
  sessionId: string;
  agentName: string | null;
  cwd: string;
  gitBranch: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;       // Count of user_message items
  summary: string;            // First user message, truncated to 80 chars
}
```

The index is updated atomically every time a session file is written. It is kept small
(metadata only, no conversation content) so it can be read instantly on startup.

### 3.6 Session Retention Policy

Sessions older than 30 days are automatically pruned from the index and their files
deleted on startup. This prevents unbounded disk growth. The retention period is
configurable:

```jsonc
// ~/.flitter-amp/config.json
{
  "sessionRetentionDays": 30  // default; 0 = keep forever
}
```

Pruning runs once per process startup (non-blocking). It iterates the index, removes
entries older than the cutoff, and deletes the corresponding JSON files.

### 3.7 Resume Flow (Dual-Mode)

Resume has two modes depending on agent capability:

**Mode A: Agent supports `loadSession` (ACP `session/load`)**

If the agent supports session loading, the client calls `connection.loadSession({
sessionId })` instead of `connection.newSession()`. The agent restores its internal
state (conversation memory, tool call history, etc.), and the client rehydrates the
local `ConversationState` from the session file. The user can continue prompting
seamlessly with full agent-side context.

**Mode B: Agent does not support `loadSession` (fallback)**

The client rehydrates `ConversationState` from the session file (conversation is
displayed as historical context). A new ACP session is created via
`connection.newSession()`. The user sees their previous conversation visually but the
agent has no memory of it -- new prompts start fresh. A subtle indicator in the status
bar shows "Restored (local only)" to set user expectations.

The `loadSession` call is wrapped in a try/catch. If it throws (method not supported,
session expired, agent-side error), the fallback to `newSession` is automatic and
silent except for a log warning. This means `--resume` always succeeds from the user's
perspective -- at worst it degrades to Mode B.

This dual-mode approach means session persistence is useful even when the agent does not
support `loadSession`. Users can review their work, copy assistant responses, and
understand where they left off.

### 3.8 CLI Interface

```
flitter-amp                           # Fresh session (current behavior)
flitter-amp --resume                  # Resume most recent session (latest by updatedAt)
flitter-amp --resume <session-id>     # Resume specific session by ID
flitter-amp --list-sessions           # Print recent sessions to stdout and exit
flitter-amp --export <format>         # Export last session (json|md|txt) and exit
```

### 3.9 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+S | Save session snapshot (manual save, immediate feedback) |
| Ctrl+E | Export conversation (opens format picker in command palette) |

These are added to the `FocusScope.onKey` handler in `app.ts` alongside the existing
Ctrl+L, Ctrl+O, Ctrl+C, Ctrl+R, and Alt+T bindings.

---

## 4. Proposed Solution

### 4.1 New Module: `packages/flitter-amp/src/state/session-store.ts`

This is the core persistence engine. It handles serialization, deserialization, file I/O,
index management, and retention. All file operations use synchronous Node.js APIs because
saves happen at low frequency (once per prompt completion) and must not be interrupted.

```typescript
// Session persistence -- save, load, list, and prune conversation sessions

import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
  readdirSync, unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { log } from '../utils/logger';
import type {
  ConversationItem, UserMessage, AssistantMessage,
  ThinkingItem, ToolCallItem, PlanEntry, UsageInfo,
} from '../acp/types';

// --- Schema Types ---

export interface SessionFile {
  version: 1;
  sessionId: string;
  agentName: string | null;
  agentCommand: string;
  cwd: string;
  gitBranch: string | null;
  createdAt: number;
  updatedAt: number;
  items: ConversationItem[];
  plan: PlanEntry[];
  usage: UsageInfo | null;
  currentMode: string | null;
}

export interface SessionIndexEntry {
  sessionId: string;
  agentName: string | null;
  cwd: string;
  gitBranch: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  summary: string;
}

interface SessionIndex {
  version: 1;
  sessions: SessionIndexEntry[];
}

// --- SessionStore ---

export class SessionStore {
  private readonly sessionsDir: string;
  private readonly indexPath: string;
  private readonly retentionMs: number;

  constructor(
    baseDir: string = join(homedir(), '.flitter'),
    retentionDays: number = 30,
  ) {
    this.sessionsDir = join(baseDir, 'sessions');
    this.indexPath = join(this.sessionsDir, 'index.json');
    this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Ensure the sessions directory exists. Called before every write operation.
   */
  private ensureDir(): void {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Save a session snapshot to disk and update the index.
   * Sanitizes streaming state before writing (isStreaming -> false).
   */
  save(session: SessionFile): void {
    try {
      this.ensureDir();

      // Finalize streaming state before serialization
      const sanitizedItems = session.items.map(item => this.sanitizeItem(item));
      const fileData: SessionFile = {
        ...session,
        updatedAt: Date.now(),
        items: sanitizedItems,
      };

      const filePath = join(this.sessionsDir, `${session.sessionId}.json`);
      writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf-8');

      this.updateIndex(fileData);
      log.info(`Session saved: ${session.sessionId} (${sanitizedItems.length} items)`);
    } catch (err) {
      log.error(`Failed to save session: ${err}`);
      // Intentionally non-fatal: session loss is acceptable; app crash is not
    }
  }

  /**
   * Load a session from disk by ID. Returns null if not found, corrupt, or
   * has an incompatible schema version.
   */
  load(sessionId: string): SessionFile | null {
    try {
      const filePath = join(this.sessionsDir, `${sessionId}.json`);
      if (!existsSync(filePath)) return null;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as SessionFile;
      if (data.version !== 1) {
        log.warn(`Unknown session file version: ${data.version}, skipping`);
        return null;
      }
      return data;
    } catch (err) {
      log.error(`Failed to load session ${sessionId}: ${err}`);
      return null;
    }
  }

  /**
   * Return the most recently updated session from the index, or null.
   */
  mostRecent(): SessionIndexEntry | null {
    const index = this.loadIndex();
    if (index.sessions.length === 0) return null;
    index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return index.sessions[0];
  }

  /**
   * List all sessions in the index, sorted by most recent first.
   */
  list(): SessionIndexEntry[] {
    const index = this.loadIndex();
    index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return index.sessions;
  }

  /**
   * Remove sessions older than the retention period.
   * Returns the number of sessions removed.
   */
  prune(): number {
    if (this.retentionMs <= 0) return 0; // 0 = keep forever
    const cutoff = Date.now() - this.retentionMs;
    const index = this.loadIndex();
    const toRemove = index.sessions.filter(s => s.updatedAt < cutoff);

    for (const entry of toRemove) {
      try {
        const filePath = join(this.sessionsDir, `${entry.sessionId}.json`);
        if (existsSync(filePath)) unlinkSync(filePath);
      } catch {
        // Best effort deletion; orphaned files are harmless
      }
    }

    index.sessions = index.sessions.filter(s => s.updatedAt >= cutoff);
    this.saveIndex(index);
    if (toRemove.length > 0) {
      log.info(`Pruned ${toRemove.length} expired sessions`);
    }
    return toRemove.length;
  }

  /**
   * Sanitize a conversation item for serialization.
   * Forces streaming flags to false since saved state is always finalized.
   */
  private sanitizeItem(item: ConversationItem): ConversationItem {
    switch (item.type) {
      case 'assistant_message':
        return { ...item, isStreaming: false };
      case 'thinking':
        return { ...item, isStreaming: false };
      default:
        return item;
    }
  }

  private loadIndex(): SessionIndex {
    try {
      if (!existsSync(this.indexPath)) {
        return { version: 1, sessions: [] };
      }
      const raw = readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(raw) as SessionIndex;
    } catch {
      return { version: 1, sessions: [] };
    }
  }

  private saveIndex(index: SessionIndex): void {
    try {
      this.ensureDir();
      writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
    } catch (err) {
      log.error(`Failed to save session index: ${err}`);
    }
  }

  private updateIndex(session: SessionFile): void {
    const index = this.loadIndex();
    const userMessages = session.items.filter(i => i.type === 'user_message');
    const firstUserMsg = userMessages[0] as UserMessage | undefined;
    const summary = firstUserMsg
      ? firstUserMsg.text.slice(0, 80)
      : '(empty session)';

    const entry: SessionIndexEntry = {
      sessionId: session.sessionId,
      agentName: session.agentName,
      cwd: session.cwd,
      gitBranch: session.gitBranch,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: userMessages.length,
      summary,
    };

    // Upsert: replace existing entry or append new
    const existingIdx = index.sessions.findIndex(
      s => s.sessionId === session.sessionId,
    );
    if (existingIdx >= 0) {
      index.sessions[existingIdx] = entry;
    } else {
      index.sessions.push(entry);
    }

    this.saveIndex(index);
  }
}
```

### 4.2 New Module: `packages/flitter-amp/src/state/session-export.ts`

Handles Markdown and plain-text export for human consumption. These are lossy formats
designed for reading, not round-tripping.

```typescript
// Session export -- serialize conversation to Markdown or plain text

import type { ConversationItem, ToolCallItem } from '../acp/types';
import type { SessionFile } from './session-store';

/**
 * Export a session to Markdown format.
 * Includes metadata header, messages with role headings, tool calls with code
 * blocks, thinking in <details> tags, and plans as checklists.
 */
export function exportToMarkdown(session: SessionFile): string {
  const lines: string[] = [];
  const date = new Date(session.createdAt).toISOString().slice(0, 19).replace('T', ' ');
  lines.push(`# Session: ${session.sessionId}`);
  lines.push(`**Agent**: ${session.agentName ?? 'unknown'}`);
  lines.push(`**CWD**: ${session.cwd}`);
  lines.push(`**Date**: ${date}`);
  if (session.gitBranch) lines.push(`**Branch**: ${session.gitBranch}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const item of session.items) {
    switch (item.type) {
      case 'user_message':
        lines.push(`## User`);
        lines.push('');
        lines.push(item.text);
        lines.push('');
        break;

      case 'assistant_message':
        lines.push(`## Assistant`);
        lines.push('');
        lines.push(item.text);
        lines.push('');
        break;

      case 'thinking':
        lines.push(`<details><summary>Thinking</summary>`);
        lines.push('');
        lines.push(item.text);
        lines.push('');
        lines.push('</details>');
        lines.push('');
        break;

      case 'tool_call': {
        const tc = item as ToolCallItem;
        const status = tc.status === 'completed' ? 'done' : tc.status;
        lines.push(`### Tool: ${tc.title} [${status}]`);
        if (tc.locations?.length) {
          lines.push(`Files: ${tc.locations.map(l => l.path).join(', ')}`);
        }
        if (tc.result?.content) {
          lines.push('');
          lines.push('```');
          for (const block of tc.result.content) {
            if (block.content?.text) lines.push(block.content.text);
          }
          lines.push('```');
        }
        lines.push('');
        break;
      }

      case 'plan':
        lines.push('### Plan');
        for (const entry of item.entries) {
          const checkbox = entry.status === 'completed' ? '[x]' : '[ ]';
          lines.push(`- ${checkbox} ${entry.content}`);
        }
        lines.push('');
        break;
    }
  }

  if (session.usage) {
    lines.push('---');
    lines.push('');
    lines.push(`**Usage**: ${session.usage.used}/${session.usage.size} tokens`);
    if (session.usage.cost) {
      lines.push(`**Cost**: ${session.usage.cost.currency} ${session.usage.cost.amount.toFixed(4)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Export a session to plain text (no formatting, minimal structure).
 */
export function exportToText(session: SessionFile): string {
  const lines: string[] = [];
  for (const item of session.items) {
    switch (item.type) {
      case 'user_message':
        lines.push(`> ${item.text}`);
        lines.push('');
        break;
      case 'assistant_message':
        lines.push(item.text);
        lines.push('');
        break;
      case 'tool_call': {
        const tc = item as ToolCallItem;
        lines.push(`[Tool: ${tc.title}]`);
        lines.push('');
        break;
      }
      default:
        break;
    }
  }
  return lines.join('\n');
}
```

### 4.3 Changes to `packages/flitter-amp/src/state/app-state.ts`

Add session metadata fields and snapshot/restore methods so the session store can
extract a complete `SessionFile` from the current state, and restore a saved session
back into the live state.

```diff
 import { ConversationState } from './conversation';
 import { log } from '../utils/logger';
 import type { SessionUpdate, PermissionRequest, ClientCallbacks } from '../acp/client';
 import type { UsageInfo } from '../acp/types';
+import type { SessionFile } from './session-store';

 export class AppState implements ClientCallbacks {
   readonly conversation = new ConversationState();
   sessionId: string | null = null;
   agentName: string | null = null;
   currentMode: string | null = null;
   isConnected = false;
   error: string | null = null;
   cwd: string = process.cwd();
   gitBranch: string | null = null;
   skillCount: number = 0;
+  agentCommand: string = '';
+  sessionCreatedAt: number = Date.now();

   // ... existing methods unchanged ...

+  /**
+   * Capture a snapshot of the current state for session persistence.
+   * Returns null if no session is active (no sessionId).
+   * Streaming state is NOT finalized here -- the SessionStore.sanitizeItem()
+   * handles that during serialization.
+   */
+  toSessionFile(): SessionFile | null {
+    if (!this.sessionId) return null;
+    return {
+      version: 1,
+      sessionId: this.sessionId,
+      agentName: this.agentName,
+      agentCommand: this.agentCommand,
+      cwd: this.cwd,
+      gitBranch: this.gitBranch,
+      createdAt: this.sessionCreatedAt,
+      updatedAt: Date.now(),
+      items: [...this.conversation.items],
+      plan: [...this.conversation.plan],
+      usage: this.conversation.usage,
+      currentMode: this.currentMode,
+    };
+  }
+
+  /**
+   * Restore conversation state from a persisted session file.
+   * This restores the local UI state only. It does NOT restore agent-side
+   * state -- that requires ACP LoadSession (handled in connection.ts).
+   *
+   * The private streaming references (_streamingMessage, _streamingThinking)
+   * remain null after restore since all saved items have isStreaming: false.
+   */
+  restoreFromSession(session: SessionFile): void {
+    this.conversation.items = [...session.items];
+    this.conversation.plan = [...session.plan];
+    this.conversation.usage = session.usage;
+    this.currentMode = session.currentMode;
+    this.sessionCreatedAt = session.createdAt;
+    this.notifyListeners();
+  }
 }
```

### 4.4 Changes to `packages/flitter-amp/src/acp/connection.ts`

Add a `connectToAgentWithResume` function that attempts `loadSession` first, falling back
to `newSession` if the agent does not support it. This is the code path that finally
makes use of the `LoadSessionRequest`/`LoadSessionResponse` types that have been imported
but unused.

```diff
+/**
+ * Attempt to resume a previously saved session via ACP session/load.
+ * Falls back to newSession if:
+ * - The agent does not implement session/load (MethodNotFound)
+ * - The session ID is not recognized by the agent (SessionNotFound)
+ * - Any other error occurs during loadSession
+ *
+ * The fallback is silent from the user's perspective -- the TUI starts normally
+ * with a new session. A log warning is emitted for debugging.
+ */
+export async function connectToAgentWithResume(
+  agentCommand: string,
+  agentArgs: string[],
+  cwd: string,
+  callbacks: ClientCallbacks,
+  resumeSessionId: string,
+): Promise<ConnectionHandle> {
+  // Steps 1-4 are identical to connectToAgent
+  const agent = spawnAgent(agentCommand, agentArgs, cwd);
+  const stream = acp.ndJsonStream(agent.stdin, agent.stdout);
+  const client = new FlitterClient(callbacks);
+  const connection = new acp.ClientSideConnection(
+    (_agentProxy: acp.Agent) => client as unknown as acp.Client,
+    stream,
+  );
+
+  const initResponse = await connection.initialize({
+    protocolVersion: acp.PROTOCOL_VERSION,
+    clientInfo: { name: 'flitter-amp', version: '0.1.0' },
+    clientCapabilities: {
+      fs: { readTextFile: true, writeTextFile: true },
+      terminal: true,
+    },
+  });
+  log.info('Agent initialized:', initResponse.agentInfo?.name ?? 'unknown');
+
+  // Step 5: Try loadSession, fall back to newSession
+  let sessionId: string;
+
+  try {
+    log.info(`Attempting to load session: ${resumeSessionId}`);
+    const loadResponse = await connection.loadSession({
+      sessionId: resumeSessionId,
+    });
+    sessionId = loadResponse.sessionId;
+    log.info(`Session loaded successfully: ${sessionId}`);
+  } catch (err) {
+    // Agent does not support loadSession or session not found
+    log.warn(`loadSession failed, falling back to newSession: ${err}`);
+    const sessionResponse = await connection.newSession({ cwd, mcpServers: [] });
+    sessionId = sessionResponse.sessionId;
+    log.info(`New session created as fallback: ${sessionId}`);
+  }
+
+  return {
+    connection,
+    client,
+    agent,
+    capabilities: initResponse.agentCapabilities,
+    agentInfo: initResponse.agentInfo as { name?: string; title?: string } | undefined,
+    sessionId,
+  };
+}
```

### 4.5 Changes to `packages/flitter-amp/src/state/config.ts`

Add `--resume`, `--list-sessions`, `--export`, and `sessionRetentionDays` options to the
CLI argument parser and config schema.

```diff
 interface UserConfig {
   agent?: string;
   editor?: string;
   cwd?: string;
   expandToolCalls?: boolean;
   historySize?: number;
+  sessionRetentionDays?: number;
   logLevel?: 'debug' | 'info' | 'warn' | 'error';
 }

 export interface AppConfig {
   agentCommand: string;
   agentArgs: string[];
   cwd: string;
   expandToolCalls: boolean;
   logLevel: 'debug' | 'info' | 'warn' | 'error';
   editor: string;
   historySize: number;
+  sessionRetentionDays: number;
+  resumeSessionId: string | null;   // null = fresh session, 'latest' or UUID
+  listSessions: boolean;            // --list-sessions: print and exit
+  exportFormat: 'json' | 'md' | 'txt' | null;  // --export <fmt>: export and exit
 }

 // In parseArgs(), add parsing logic:
+  let resumeSessionId: string | null = null;
+  let listSessions = false;
+  let exportFormat: AppConfig['exportFormat'] = null;

   for (let i = 0; i < args.length; i++) {
     switch (args[i]) {
       // ... existing cases ...

+      case '--resume': {
+        const next = args[i + 1];
+        if (next && !next.startsWith('--')) {
+          resumeSessionId = next;
+          i++;
+        } else {
+          resumeSessionId = 'latest';
+        }
+        break;
+      }
+
+      case '--list-sessions':
+        listSessions = true;
+        break;
+
+      case '--export': {
+        const fmt = args[++i] as AppConfig['exportFormat'];
+        if (!fmt || !['json', 'md', 'txt'].includes(fmt)) {
+          process.stderr.write('Error: --export requires format: json, md, or txt\n');
+          process.exit(1);
+        }
+        exportFormat = fmt;
+        break;
+      }
     }
   }

   return {
     agentCommand, agentArgs, cwd, expandToolCalls, logLevel,
     editor: userConfig.editor || process.env.EDITOR || process.env.VISUAL || 'vi',
     historySize: userConfig.historySize ?? 100,
+    sessionRetentionDays: userConfig.sessionRetentionDays ?? 30,
+    resumeSessionId,
+    listSessions,
+    exportFormat,
   };
```

Update `printHelp()` to document the new options:

```diff
 function printHelp(): void {
   process.stderr.write(`
 flitter-amp -- ACP Client TUI

 Usage: flitter-amp [options]

 Options:
   --agent <cmd>    Agent command to spawn (default: "claude --agent")
   --cwd <dir>      Working directory (default: current directory)
   --expand         Expand tool call details by default
   --debug          Enable debug logging
+  --resume [id]    Resume the most recent session (or specific session by ID)
+  --list-sessions  Print recent sessions and exit
+  --export <fmt>   Export last session to file (json, md, or txt) and exit
   --help, -h       Show this help message
 `);
 }
```

### 4.6 Changes to `packages/flitter-amp/src/index.ts`

Wire the session store into the application lifecycle: auto-save on prompt completion,
save on exit, resume on `--resume`, list on `--list-sessions`, export on `--export`.

```diff
 import { parseArgs } from './state/config';
 import { setLogLevel, log, initLogFile, closeLogFile } from './utils/logger';
 import { AppState } from './state/app-state';
-import { connectToAgent, sendPrompt, cancelPrompt } from './acp/connection';
+import { connectToAgent, connectToAgentWithResume, sendPrompt, cancelPrompt } from './acp/connection';
 import type { ConnectionHandle } from './acp/connection';
 import { startTUI } from './app';
+import { SessionStore } from './state/session-store';
+import { exportToMarkdown, exportToText } from './state/session-export';
+import { join } from 'node:path';
+import { homedir } from 'node:os';
+import { writeFileSync } from 'node:fs';

 async function main(): Promise<void> {
   const config = parseArgs(process.argv);
   setLogLevel(config.logLevel);
   initLogFile();

+  // Initialize session store
+  const sessionStore = new SessionStore(
+    join(homedir(), '.flitter'),
+    config.sessionRetentionDays,
+  );
+
+  // Prune expired sessions on startup (synchronous, fast)
+  sessionStore.prune();
+
+  // Handle --list-sessions: print and exit
+  if (config.listSessions) {
+    const sessions = sessionStore.list();
+    if (sessions.length === 0) {
+      process.stdout.write('No saved sessions.\n');
+    } else {
+      process.stdout.write('Recent sessions:\n\n');
+      for (const s of sessions.slice(0, 20)) {
+        const date = new Date(s.updatedAt).toISOString().slice(0, 19).replace('T', ' ');
+        const branch = s.gitBranch ? ` (${s.gitBranch})` : '';
+        process.stdout.write(
+          `  ${s.sessionId}  ${date}  ${s.messageCount} msgs${branch}\n` +
+          `    ${s.summary}\n\n`,
+        );
+      }
+    }
+    process.exit(0);
+  }
+
+  // Handle --export: export most recent session to file and exit
+  if (config.exportFormat) {
+    const recent = sessionStore.mostRecent();
+    if (!recent) {
+      process.stderr.write('No sessions to export.\n');
+      process.exit(1);
+    }
+    const session = sessionStore.load(recent.sessionId);
+    if (!session) {
+      process.stderr.write(`Failed to load session ${recent.sessionId}.\n`);
+      process.exit(1);
+    }
+    let content: string;
+    let ext: string;
+    switch (config.exportFormat) {
+      case 'md':
+        content = exportToMarkdown(session);
+        ext = 'md';
+        break;
+      case 'txt':
+        content = exportToText(session);
+        ext = 'txt';
+        break;
+      case 'json':
+      default:
+        content = JSON.stringify(session, null, 2);
+        ext = 'json';
+        break;
+    }
+    const outPath = `session-export.${ext}`;
+    writeFileSync(outPath, content, 'utf-8');
+    process.stdout.write(`Exported to ${outPath}\n`);
+    process.exit(0);
+  }

   // Create global app state
   const appState = new AppState();
   appState.cwd = config.cwd;
+  appState.agentCommand = `${config.agentCommand} ${config.agentArgs.join(' ')}`;

   // ... git branch detection unchanged ...

+  // Resolve resume session ID
+  let resumeSessionId: string | null = null;
+  if (config.resumeSessionId === 'latest') {
+    const recent = sessionStore.mostRecent();
+    if (recent) {
+      resumeSessionId = recent.sessionId;
+      log.info(`Resuming most recent session: ${resumeSessionId}`);
+    } else {
+      log.info('No sessions to resume; starting fresh');
+    }
+  } else if (config.resumeSessionId) {
+    resumeSessionId = config.resumeSessionId;
+  }

   // Connect to the ACP agent
   let handle: ConnectionHandle;
   try {
-    handle = await connectToAgent(
-      config.agentCommand,
-      config.agentArgs,
-      config.cwd,
-      appState,
-    );
+    if (resumeSessionId) {
+      handle = await connectToAgentWithResume(
+        config.agentCommand,
+        config.agentArgs,
+        config.cwd,
+        appState,
+        resumeSessionId,
+      );
+      // Restore local conversation state from saved session
+      const savedSession = sessionStore.load(resumeSessionId);
+      if (savedSession) {
+        appState.restoreFromSession(savedSession);
+        log.info(`Restored ${savedSession.items.length} conversation items from disk`);
+      }
+    } else {
+      handle = await connectToAgent(
+        config.agentCommand,
+        config.agentArgs,
+        config.cwd,
+        appState,
+      );
+    }
     appState.setConnected(handle.sessionId, handle.agentInfo?.name ?? null);
     log.info('Connected to agent successfully');
   } catch (err) {
     // ... existing error handling unchanged ...
   }

+  /**
+   * Save the current session state to disk.
+   * Called on prompt completion and application exit.
+   */
+  const saveSession = (): void => {
+    const snapshot = appState.toSessionFile();
+    if (snapshot && snapshot.items.length > 0) {
+      sessionStore.save(snapshot);
+    }
+  };

   // Handle process cleanup
   const cleanup = () => {
+    saveSession();    // <-- persist before tearing down
     handle.client.cleanup();
     handle.agent.kill();
     closeLogFile();
   };

   // Prompt submission handler
   const handleSubmit = async (text: string): Promise<void> => {
     // ... existing submit logic ...
     try {
       const result = await sendPrompt(handle.connection, handle.sessionId, text);
       appState.onPromptComplete(handle.sessionId, result.stopReason);
+      // Auto-save after each prompt completion
+      saveSession();
     } catch (err) {
       // ... existing error handling ...
     }
   };

   // ... rest of main() unchanged ...
 }
```

### 4.7 Changes to `packages/flitter-amp/src/app.ts`

Add Ctrl+S (manual save) and Ctrl+E (export) keybindings. Add export commands to the
command palette.

```diff
 interface AppProps {
   appState: AppState;
   onSubmit: (text: string) => void;
   onCancel: () => void;
+  onSave?: () => void;
+  onExport?: (format: 'json' | 'md' | 'txt') => void;
 }

 // In FocusScope.onKey handler, add these cases:

+        // Ctrl+S -- manual session save (immediate checkpoint)
+        if (event.ctrlKey && event.key === 's') {
+          this.widget.onSave?.();
+          return 'handled';
+        }
+
+        // Ctrl+E -- export conversation (default to Markdown)
+        if (event.ctrlKey && event.key === 'e') {
+          this.widget.onExport?.('md');
+          return 'handled';
+        }

 // In CommandPalette onExecute switch, add export commands:
+  case 'export-md':
+    this.widget.onExport?.('md');
+    break;
+  case 'export-json':
+    this.widget.onExport?.('json');
+    break;
+  case 'export-txt':
+    this.widget.onExport?.('txt');
+    break;
```

### 4.8 Changes to `packages/flitter-amp/src/acp/types.ts`

No changes needed. The `LoadSessionRequest` and `LoadSessionResponse` re-exports at
lines 14-15 are already present and will now be used by `connectToAgentWithResume` in
`connection.ts`. The gap of "imported but unused" is resolved by wiring the types into
the actual resume flow.

---

## 5. Data Flow Diagrams

### 5.1 Auto-Save on Prompt Completion

```
User types prompt
  --> handleSubmit(text)
    --> appState.startProcessing(text)
    --> sendPrompt(connection, sessionId, text)
    --> Agent processes; streams updates to ConversationState via onSessionUpdate()
    --> PromptResponse received
    --> appState.onPromptComplete(sessionId, stopReason)
    --> saveSession()
      --> appState.toSessionFile()         (snapshot conversation + metadata)
      --> sessionStore.save(snapshot)       (sanitize streaming, write JSON, update index)
```

### 5.2 Resume on Next Launch

```
flitter-amp --resume
  --> parseArgs() sets resumeSessionId = 'latest'
  --> sessionStore.mostRecent() returns SessionIndexEntry
  --> connectToAgentWithResume(command, args, cwd, callbacks, sessionId)
    --> spawnAgent()
    --> connection.initialize()
    --> try connection.loadSession({ sessionId })
      --> SUCCESS: agent has restored its context       --> Mode A
      --> FAILURE: agent does not support loadSession    --> Mode B
        --> connection.newSession({ cwd, mcpServers: [] })
  --> sessionStore.load(resumeSessionId)
  --> appState.restoreFromSession(savedSession)
  --> TUI renders restored conversation immediately
  --> User can continue prompting
```

### 5.3 Export Flow (Ctrl+E or CLI)

```
User presses Ctrl+E
  --> onExport('md') callback
  --> appState.toSessionFile() (snapshot current state)
  --> exportToMarkdown(snapshot)
  --> writeFileSync('session-export.md')
  --> log.info('Exported to session-export.md')

OR

flitter-amp --export md
  --> sessionStore.mostRecent()
  --> sessionStore.load(sessionId)
  --> exportToMarkdown(session)
  --> writeFileSync('session-export.md')
  --> process.exit(0)
```

### 5.4 Save on Exit

```
User presses Ctrl+C (or SIGTERM)
  --> cleanup()
    --> saveSession()               (final persist before teardown)
      --> appState.toSessionFile()
      --> sessionStore.save()
    --> handle.client.cleanup()     (kill terminals)
    --> handle.agent.kill()         (kill agent subprocess)
    --> closeLogFile()
  --> process.exit(0)
```

---

## 6. Config Integration

### 6.1 `~/.flitter-amp/config.json` Additions

```jsonc
{
  // Existing fields...
  "agent": "claude --agent",
  "logLevel": "info",

  // New fields for session persistence:
  "sessionRetentionDays": 30,    // Days to keep session files (0 = keep forever)
  "autoSave": true               // Enable auto-save on prompt completion (default: true)
}
```

### 6.2 CLI Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--resume` | Resume the most recent session | `flitter-amp --resume` |
| `--resume <id>` | Resume a specific session by ID | `flitter-amp --resume abc123-def` |
| `--list-sessions` | Print recent sessions to stdout and exit | `flitter-amp --list-sessions` |
| `--export <fmt>` | Export last session (`json`, `md`, `txt`) | `flitter-amp --export md` |

---

## 7. Testing Plan

### 7.1 Unit Tests: SessionStore

```typescript
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionStore, type SessionFile } from '../state/session-store';

function makeTestSession(id: string, timestamp?: number): SessionFile {
  return {
    version: 1,
    sessionId: id,
    agentName: 'test-agent',
    agentCommand: 'test --agent',
    cwd: '/tmp/test',
    gitBranch: 'main',
    createdAt: timestamp ?? Date.now(),
    updatedAt: timestamp ?? Date.now(),
    items: [
      { type: 'user_message', text: 'hello world', timestamp: Date.now() },
      { type: 'assistant_message', text: 'hi there', timestamp: Date.now(), isStreaming: false },
    ],
    plan: [],
    usage: null,
    currentMode: null,
  };
}

describe('SessionStore', () => {
  let tmpDir: string;
  let store: SessionStore;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'session-test-'));
    store = new SessionStore(tmpDir, 30);
  });

  it('saves and loads a session round-trip', () => {
    const session = makeTestSession('sess-1');
    store.save(session);
    const loaded = store.load('sess-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe('sess-1');
    expect(loaded!.items).toHaveLength(session.items.length);
  });

  it('returns null for nonexistent session', () => {
    expect(store.load('nonexistent')).toBeNull();
  });

  it('updates index on save', () => {
    store.save(makeTestSession('sess-1'));
    store.save(makeTestSession('sess-2'));
    const list = store.list();
    expect(list).toHaveLength(2);
  });

  it('mostRecent returns the latest session by updatedAt', () => {
    store.save(makeTestSession('old', Date.now() - 100000));
    store.save(makeTestSession('new', Date.now()));
    const recent = store.mostRecent();
    expect(recent!.sessionId).toBe('new');
  });

  it('prunes expired sessions', () => {
    const expiredStore = new SessionStore(tmpDir, 0);
    // Save with timestamp in the past (0-day retention means everything is expired)
    expiredStore.save(makeTestSession('doomed', Date.now() - 1));
    const pruned = expiredStore.prune();
    // With 0-day retention and retentionMs = 0, nothing is pruned (0 = keep forever)
    // Use 1-day retention with a timestamp > 1 day old instead:
  });

  it('sanitizes streaming flags on save', () => {
    const session = makeTestSession('stream');
    session.items.push({
      type: 'assistant_message',
      text: 'hello',
      timestamp: Date.now(),
      isStreaming: true, // should be false after save
    });
    store.save(session);
    const loaded = store.load('stream');
    const msg = loaded!.items.find(i => i.type === 'assistant_message');
    expect((msg as any).isStreaming).toBe(false);
  });

  it('handles corrupt session files gracefully', () => {
    const sessionsDir = join(tmpDir, 'sessions');
    writeFileSync(join(sessionsDir, 'corrupt.json'), '{bad json}}}', 'utf-8');
    expect(store.load('corrupt')).toBeNull();
  });

  it('upserts index entries on repeated saves', () => {
    store.save(makeTestSession('sess-1'));
    store.save(makeTestSession('sess-1')); // same ID, should not duplicate
    const list = store.list();
    expect(list).toHaveLength(1);
  });
});
```

### 7.2 Unit Tests: Session Export

```typescript
import { exportToMarkdown, exportToText } from '../state/session-export';
import type { SessionFile } from '../state/session-store';

describe('exportToMarkdown', () => {
  it('produces valid Markdown with headers for each message', () => {
    const session = makeTestSession('export-test');
    const md = exportToMarkdown(session);
    expect(md).toContain('# Session: export-test');
    expect(md).toContain('## User');
    expect(md).toContain('## Assistant');
  });

  it('wraps tool calls in code blocks', () => {
    const session = makeSessionWithToolCalls();
    const md = exportToMarkdown(session);
    expect(md).toContain('### Tool:');
    expect(md).toContain('```');
  });

  it('includes metadata header', () => {
    const session = makeTestSession('meta-test');
    const md = exportToMarkdown(session);
    expect(md).toContain('**Agent**: test-agent');
    expect(md).toContain('**CWD**: /tmp/test');
  });
});

describe('exportToText', () => {
  it('produces plain text with > prefix for user messages', () => {
    const session = makeTestSession('text-test');
    const txt = exportToText(session);
    expect(txt).toContain('> hello world');
    expect(txt).toContain('hi there');
  });
});
```

### 7.3 Integration Tests: Resume Flow

```typescript
describe('connectToAgentWithResume', () => {
  it('falls back to newSession when loadSession fails', async () => {
    // Mock an agent that rejects loadSession with MethodNotFound
    // Verify newSession is called as fallback
    // Verify handle.sessionId is set to the new session's ID
  });

  it('uses loadSession when available', async () => {
    // Mock an agent that supports loadSession
    // Verify loadSession is called with the provided sessionId
    // Verify handle.sessionId matches the resumed session
  });

  it('passes through initialization even when resuming', async () => {
    // Verify that initialize() is always called before loadSession()
    // Verify clientCapabilities are correctly advertised
  });
});
```

### 7.4 Manual Verification Checklist

1. Launch flitter-amp. Submit 3 prompts. Exit with Ctrl+C.
2. Verify `~/.flitter/sessions/` contains a JSON file and `index.json`.
3. Read the session JSON file with `jq`. Confirm it has `version: 1`, correct `sessionId`,
   all conversation items, and `isStreaming: false` on all messages.
4. Run `flitter-amp --list-sessions` -- should show the session with summary.
5. Run `flitter-amp --resume` -- should display previous conversation in the TUI.
6. Submit a new prompt in the resumed session -- should work normally.
7. Exit and verify the session file is updated with the new prompt.
8. Run `flitter-amp --export md` -- should produce a `session-export.md` file.
9. Open `session-export.md` -- should contain properly formatted Markdown with headings.
10. Run `flitter-amp --export json` -- verify full round-trip fidelity.
11. Set `"sessionRetentionDays": 0` in config -- restart -- verify sessions are kept (0 = forever).
12. Test with an agent that does not support `loadSession` -- verify fallback to
    `newSession` with local-only restore (conversation displays but agent has no memory).
13. Kill flitter-amp with `kill -9` (SIGKILL) -- verify that the most recent auto-save
    from the last prompt completion is intact (SIGKILL cannot be caught, so the exit-save
    will not run, but the prompt-completion save should be there).
14. Press Ctrl+S during a session -- verify session is saved to disk immediately.

---

## 8. Edge Cases and Failure Modes

| Scenario | Expected Behavior |
|----------|-------------------|
| Session file does not exist on `--resume <id>` | Start fresh session, log warning |
| Session file is corrupt or unparseable | Start fresh session, log error, `store.load()` returns null |
| Sessions directory is not writable | Auto-save silently degrades (caught in try/catch); in-memory state unaffected |
| Agent crashes during save | Crash handler calls `cleanup()` -> `saveSession()` before agent teardown |
| SIGKILL (kill -9) | Exit-save does not run; last prompt-completion save is the recovery point |
| Very large conversation (10MB+) | JSON write is synchronous; may cause ~50ms UI pause on slow disks |
| Concurrent instances writing same session ID | Last writer wins (acceptable for v1; session IDs are UUIDs so collisions are unlikely) |
| Resume with different agent than original | Local history displayed; new agent session created (Mode B) |
| Resume with different CWD than original | Session loads but CWD is updated to current invocation's CWD |
| `--resume` with invalid/unknown session ID | `store.load()` returns null; start fresh with new session |
| Disk full | `writeFileSync` throws; caught in `save()`, session lost for this save cycle only |
| Index file corrupt but session files intact | Index rebuilt lazily on next `save()` (existing entries lost from index; files survive) |
| Schema version mismatch (future upgrade) | `store.load()` checks `version === 1`; rejects unknown versions with log warning |

---

## 9. Migration Path

### 9.1 Version 1 (This Proposal)

- SessionFile schema version 1
- JSON flat-file storage per session
- Lightweight JSON index for session listing
- Auto-save on prompt completion and on exit
- CLI flags for resume, list, and export
- Markdown and plain-text export
- `LoadSessionRequest` integration with graceful fallback to `newSession`
- Ctrl+S (save) and Ctrl+E (export) keybindings

### 9.2 Future: Version 2

- **Incremental saves**: Instead of rewriting the full JSON on each save, append
  a journal of deltas and compact periodically. Reduces I/O for large sessions.

- **Per-project sessions**: Associate sessions with working directories and display
  project-specific session lists. Storage at `~/.flitter/sessions/<project-hash>/`.

- **Session search**: Full-text search across all saved sessions using a lightweight
  inverted index.

- **Session branching**: Fork a session at a specific point to explore alternative
  prompts without losing the original thread.

- **Cloud sync**: Optional sync of session files to a remote store for cross-machine
  continuity.

- **Agent-side context injection**: For Mode B (agents that lack `loadSession`), send
  a condensed summary of the previous conversation as a system prompt in the first
  new-session prompt to give the agent some context continuity.

- **Async writes**: Replace synchronous `writeFileSync` with async `writeFile` and a
  write queue to eliminate any UI jank on slow filesystems.

---

## 10. Related Gaps

- **Gap S07 (53-history-persistence.md)**: Prompt history persistence. Orthogonal but
  complementary -- S07 persists the list of prompts the user has typed (for Ctrl+R
  navigation), while S08 persists the full conversation including agent responses,
  tool calls, and plans. Both write to `~/.flitter/` but to different subdirectories.

- **Gap 47 (47-remove-vestigial-session-state.md)**: Remove unused `SessionState` class
  from `acp/session.ts`. That class was a precursor to proper session management. This
  proposal supersedes it entirely -- the `SessionStore` and `AppState.toSessionFile()`
  are the canonical session persistence mechanism. The vestigial `SessionState` in
  `acp/session.ts` should be deleted (it is dead code).

- **Gap 48 (48-session-info-handler.md)**: The `session_info_update` handler in
  `app-state.ts` (line 140-143) is currently a no-op. Session persistence will benefit
  from capturing session info updates (e.g., mode changes, capability updates) as
  metadata in the session file. This should be coordinated.

- **Gap 33 (33-session-id-display.md)**: The `HeaderBar` widget has an unused `sessionId`
  prop. Once sessions can be resumed and listed, displaying the session ID (or at least
  a truncated version) in the UI becomes meaningful for disambiguation.

---

## 11. Diff Summary (File Count)

| File | Change Type | Lines Changed (est.) |
|------|-------------|---------------------|
| `src/state/session-store.ts` | **New file** | ~200 |
| `src/state/session-export.ts` | **New file** | ~100 |
| `src/state/app-state.ts` | Modified | +40 |
| `src/state/config.ts` | Modified | +40 |
| `src/acp/connection.ts` | Modified | +50 |
| `src/index.ts` | Modified | +80 |
| `src/app.ts` | Modified | +25 |
| `src/__tests__/session-store.test.ts` | **New file** | ~100 |
| `src/__tests__/session-export.test.ts` | **New file** | ~60 |
| **Total** | | ~695 |

---

## 12. Security Considerations

- **No secrets in session files.** Session files contain conversation text, tool call
  metadata, and usage info. They do not contain API keys, tokens, or authentication
  credentials. However, if a user's conversation includes sensitive information (e.g.,
  they pasted a password into a prompt), that text will be persisted to disk. This is
  no different from shell history files (`.bash_history`) and is expected behavior.

- **File permissions.** Session files are written with the default umask of the user's
  process. On multi-user systems, the `~/.flitter/sessions/` directory should have
  `0700` permissions. This can be enforced in `ensureDir()`:
  ```typescript
  mkdirSync(this.sessionsDir, { recursive: true, mode: 0o700 });
  ```

- **No remote transmission.** Session files are local-only. They are never uploaded,
  synced, or transmitted over the network. Future cloud-sync (v2) would require explicit
  user opt-in and encryption at rest.
