# Gap S07: No Disk Persistence for Prompt History

## Status: Open
## Severity: Medium (UX regression on every restart)
## Area: `packages/flitter-amp/src/state/history.ts`, `packages/flitter-amp/src/state/config.ts`, `packages/flitter-amp/src/app.ts`, `packages/flitter-amp/src/index.ts`

---

## 1. Problem Statement

The `PromptHistory` class in `packages/flitter-amp/src/state/history.ts` stores all
prompt entries in a plain in-memory array (`private entries: string[] = []`). When the
application exits -- whether through Ctrl+C, SIGTERM, or any other shutdown path -- the
entire history is discarded. The next session starts with an empty history, making Ctrl+R
navigation useless across sessions.

This is a significant UX regression compared to standard terminal shells (bash, zsh, fish)
and competing TUI tools (Claude Code's own Ink-based TUI, Warp, etc.), all of which
persist command/prompt history to disk and reload it on startup.

### Current Behavior

```
Session 1: user types "fix the auth bug", "add unit tests", "deploy to staging"
  --> PromptHistory.entries = ["fix the auth bug", "add unit tests", "deploy to staging"]
  --> User exits (Ctrl+C or close terminal)

Session 2: user launches flitter-amp
  --> PromptHistory.entries = []     <-- everything lost
  --> Ctrl+R does nothing
```

### Expected Behavior

```
Session 1: user types "fix the auth bug", "add unit tests", "deploy to staging"
  --> Entries saved to ~/.flitter/prompt_history
  --> User exits

Session 2: user launches flitter-amp
  --> PromptHistory loads from ~/.flitter/prompt_history
  --> Ctrl+R recalls "deploy to staging" immediately
```

---

## 2. Root Cause Analysis

The `PromptHistory` class was designed as a pure in-memory data structure with no I/O
awareness. It has no constructor parameter for a file path, no `save()` method, and no
`load()` method. The class is entirely self-contained:

```typescript
export class PromptHistory {
  private entries: string[] = [];
  private cursor = -1;
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(text: string): void { /* ... */ }
  previous(): string | null { /* ... */ }
  next(): string | null { /* ... */ }
  resetCursor(): void { /* ... */ }
}
```

The application lifecycle in `index.ts` has a `cleanup()` function that runs on SIGINT
and SIGTERM, but it only handles the ACP connection and log file -- there is no hook for
persisting history:

```typescript
// index.ts lines 72-86
const cleanup = () => {
  handle.client.cleanup();
  handle.agent.kill();
  closeLogFile();
};
process.on('SIGINT', () => {
  log.info('Received SIGINT, shutting down...');
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
```

Similarly, `initState()` in `AppStateWidget` creates a fresh `PromptHistory()` with no
file loading (line 79 of `app.ts`):

```typescript
private promptHistory = new PromptHistory();
```

### Why This Was Not Originally Addressed

The history module was likely built as a minimal MVP to prove the Ctrl+R key handling
worked. The in-memory implementation is correct for within-session navigation. Persistence
was deferred (no TODO comment exists, suggesting it was not yet considered).

---

## 3. Design Decisions

### 3.1 Storage Location

Use `~/.flitter/prompt_history` as the persistence file.

**Rationale**:
- The logger already uses `~/.flitter/logs/` (established convention), making
  `~/.flitter/` the application's data directory.
- Config lives at `~/.flitter-amp/config.json` (per `config.ts` line 37). History is
  runtime data, not configuration, so it belongs under `~/.flitter/` rather than
  `~/.flitter-amp/`.
- A flat file is simpler than SQLite or any structured database for a sequential list
  of strings. The file size is bounded by `maxSize` (default 100 lines, typically <10KB).

### 3.2 File Format

One entry per line, plain text, with a two-pass escape scheme for entries containing
newlines or backslashes.

**Encoding rules** (applied in order when writing):
1. Escape literal backslashes: `\` becomes `\\`
2. Escape literal newlines: newline character becomes `\n` (the two-character sequence)

**Decoding rules** (applied in order when reading):
1. Unescape `\n` (the two-character sequence) back to real newline
2. Unescape `\\` back to literal `\`

This two-pass scheme correctly round-trips all combinations:

| In-memory value      | On-disk representation  | Decoded back          |
|----------------------|-------------------------|-----------------------|
| `hello world`        | `hello world`           | `hello world`         |
| `line1\nline2`       | `line1\nline2`          | `line1\nline2`        |
| `path\to\file`       | `path\\to\\file`        | `path\to\file`        |
| `a\nb` (literal `\n`)| `a\\nb`                 | `a\nb` (literal)      |
| `a\\nb`              | `a\\\\nb`               | `a\\nb`               |

**Why not JSON?** JSON is heavier to parse, harder to inspect manually (`cat` vs. needing
`jq`), and adds escaping complexity for a simple string-per-line format. The two-pass
escape scheme handles all edge cases cleanly.

**Why not JSON Lines?** JSON Lines would simplify encoding (just `JSON.stringify` each
entry) but makes the file less human-readable for the common case (prompts rarely contain
special characters). The escape scheme is a pragmatic middle ground.

### 3.3 Save Strategy

**Append-on-push with periodic full rewrite**:
- Each `push()` call appends the new entry to the file (fast, no rewrite).
- When entries are evicted (array exceeds `maxSize`), a full rewrite is triggered to
  keep the file in sync with the in-memory array.
- On application exit (via the cleanup hook or widget `dispose()`), a final full save is
  performed to ensure consistency.

**Why not save the full file on every push?** For most pushes, an append is sufficient
and avoids rewriting the entire file. The full rewrite only happens when the oldest entry
is evicted (i.e., when `entries.length > maxSize` after a push), which is infrequent once
the history file has reached steady state.

**Why synchronous I/O?** The history file is small (typically <10KB for 100 entries).
Using synchronous `fs.writeFileSync` and `fs.appendFileSync` avoids callback complexity
and race conditions. The latency is negligible (<1ms for a file this size). Synchronous
writes also ensure data is flushed before `process.exit()` in signal handlers.

### 3.4 Load Strategy

On construction, if a `filePath` is provided, the constructor synchronously reads the
file and populates `entries`. Graceful degradation rules:
- **File does not exist**: start with empty history (no error).
- **File is unreadable** (permissions, corruption): start with empty history (no error).
- **File has more lines than `maxSize`**: keep only the last `maxSize` lines, schedule
  a rewrite on the next `push()` to trim the file.

### 3.5 Concurrency

Multiple flitter-amp instances may run simultaneously. Each instance loads the history
file on startup and appends to it during the session. This means:

- Entries from concurrent sessions are interleaved in the file (acceptable behavior --
  bash does the same with `HISTFILE` by default).
- The final save on exit may overwrite entries from another session that started after
  this one loaded. This is a known limitation, consistent with how bash/zsh handle it.
- A future improvement could use file locking (`flock`) or a merge strategy, but this
  is out of scope for the initial implementation.

### 3.6 Config Integration

Add an optional `historyFile` field to `UserConfig` in `config.ts` to allow users to
customize the history file path. Default: `~/.flitter/prompt_history`.

```jsonc
// ~/.flitter-amp/config.json
{
  "historySize": 500,
  "historyFile": "/custom/path/prompt_history"  // optional override
}
```

This also solves Gap S06 (52-history-size-wiring) as a side effect, since both
`historySize` and `historyFile` flow through the same plumbing.

---

## 4. Proposed Solution

### 4.1 Changes to `packages/flitter-amp/src/state/history.ts`

This is the core change. Add file I/O capabilities to the existing `PromptHistory` class
while preserving full backward compatibility (no `filePath` = pure in-memory mode).

```typescript
// Prompt history -- persistent history of previous prompts for Ctrl+R navigation

import {
  readFileSync, writeFileSync, appendFileSync,
  existsSync, mkdirSync,
} from 'node:fs';
import { dirname } from 'node:path';

export class PromptHistory {
  private entries: string[] = [];
  private cursor = -1;
  private readonly maxSize: number;
  private readonly filePath: string | null;
  private needsFullRewrite = false;

  constructor(maxSize = 100, filePath: string | null = null) {
    this.maxSize = maxSize;
    this.filePath = filePath;

    if (filePath) {
      this.load();
    }
  }

  // --- Persistence: Encode / Decode ---

  /**
   * Encode a prompt entry for single-line storage.
   * Escapes backslashes first, then newlines.
   */
  private static encode(entry: string): string {
    return entry
      .replace(/\\/g, '\\\\')   // Step 1: escape backslashes
      .replace(/\n/g, '\\n');    // Step 2: escape newlines
  }

  /**
   * Decode a single line from the history file back to the original entry.
   * Unescapes newlines first, then backslashes.
   */
  private static decode(line: string): string {
    // Use a state machine to handle escape sequences correctly.
    // This avoids the double-replace pitfall where \\n could be
    // misinterpreted.
    let result = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '\\' && i + 1 < line.length) {
        const next = line[i + 1];
        if (next === 'n') {
          result += '\n';
          i += 2;
        } else if (next === '\\') {
          result += '\\';
          i += 2;
        } else {
          // Unknown escape -- preserve literally
          result += line[i];
          i++;
        }
      } else {
        result += line[i];
        i++;
      }
    }
    return result;
  }

  // --- Persistence: Load ---

  /**
   * Load history entries from the persistence file.
   * Silently ignores missing or unreadable files.
   */
  private load(): void {
    if (!this.filePath) return;
    try {
      if (!existsSync(this.filePath)) return;
      const raw = readFileSync(this.filePath, 'utf-8');
      const lines = raw.split('\n').filter(line => line.length > 0);
      const decoded = lines.map(line => PromptHistory.decode(line));
      // If file has more entries than maxSize, keep only the most recent
      if (decoded.length > this.maxSize) {
        this.entries = decoded.slice(decoded.length - this.maxSize);
        // File is oversized; schedule a rewrite to trim it
        this.needsFullRewrite = true;
      } else {
        this.entries = decoded;
      }
    } catch {
      // File is missing, corrupt, or unreadable -- start with empty history
      this.entries = [];
    }
  }

  // --- Persistence: Save ---

  /**
   * Save the full history to disk, replacing the file contents.
   * Creates parent directories if they do not exist.
   * Safe to call at any time (no-op if no filePath was provided).
   */
  save(): void {
    if (!this.filePath) return;
    try {
      this.ensureDirectory();
      const encoded = this.entries.map(entry => PromptHistory.encode(entry));
      writeFileSync(this.filePath, encoded.join('\n') + '\n', 'utf-8');
      this.needsFullRewrite = false;
    } catch {
      // Disk write failed -- silently degrade (history remains in memory only)
    }
  }

  /**
   * Append a single entry to the history file without rewriting the whole file.
   * Falls back to a full save if a rewrite is pending (e.g., after eviction).
   */
  private appendToFile(text: string): void {
    if (!this.filePath) return;
    if (this.needsFullRewrite) {
      this.save();
      return;
    }
    try {
      this.ensureDirectory();
      const encoded = PromptHistory.encode(text);
      appendFileSync(this.filePath, encoded + '\n', 'utf-8');
    } catch {
      // Append failed -- will be caught by next full save or exit save
    }
  }

  /**
   * Ensure the parent directory of the history file exists.
   */
  private ensureDirectory(): void {
    if (!this.filePath) return;
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // --- Core API (unchanged behavior, persistence hooks added) ---

  push(text: string): void {
    if (text.trim() === '') return;
    // Deduplicate consecutive identical entries
    if (this.entries.length > 0 && this.entries[this.entries.length - 1] === text) return;
    this.entries.push(text);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
      // Eviction happened -- file needs a full rewrite to stay in sync
      this.needsFullRewrite = true;
    }
    this.cursor = -1;
    // Persist to disk
    this.appendToFile(text);
  }

  previous(): string | null {
    if (this.entries.length === 0) return null;
    if (this.cursor === -1) {
      this.cursor = this.entries.length - 1;
    } else if (this.cursor > 0) {
      this.cursor--;
    } else {
      return null; // At oldest entry
    }
    return this.entries[this.cursor];
  }

  next(): string | null {
    if (this.cursor === -1) return null;
    if (this.cursor < this.entries.length - 1) {
      this.cursor++;
      return this.entries[this.cursor];
    }
    this.cursor = -1;
    return ''; // Return empty to restore "new prompt" state
  }

  resetCursor(): void {
    this.cursor = -1;
  }

  /** True when no history navigation is in progress. */
  get isAtReset(): boolean {
    return this.cursor === -1;
  }

  /** Return the number of entries currently in history. */
  get length(): number {
    return this.entries.length;
  }
}
```

### 4.2 Changes to `packages/flitter-amp/src/state/config.ts`

Add `historyFile` to `UserConfig` and `AppConfig`. Resolve the default path.

```typescript
// In UserConfig interface, add historyFile:
interface UserConfig {
  agent?: string;
  editor?: string;
  cwd?: string;
  expandToolCalls?: boolean;
  historySize?: number;
  historyFile?: string;              // NEW
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// In AppConfig interface, add historyFile:
export interface AppConfig {
  agentCommand: string;
  agentArgs: string[];
  cwd: string;
  expandToolCalls: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  editor: string;
  historySize: number;
  /** Path to the prompt history file */
  historyFile: string;               // NEW
}

// In parseArgs(), add to the return object:
export function parseArgs(argv: string[]): AppConfig {
  // ... existing parsing logic (unchanged) ...

  const defaultHistoryFile = join(homedir(), '.flitter', 'prompt_history');

  return {
    agentCommand, agentArgs, cwd, expandToolCalls, logLevel,
    editor: userConfig.editor || process.env.EDITOR || process.env.VISUAL || 'vi',
    historySize: userConfig.historySize ?? 100,
    historyFile: userConfig.historyFile           // NEW
      ? resolve(userConfig.historyFile)
      : defaultHistoryFile,
  };
}
```

### 4.3 Changes to `packages/flitter-amp/src/app.ts`

Pass `historyFile` (and `historySize`) to `PromptHistory` at construction time, and
add a `save()` call in `dispose()` for graceful shutdown.

```typescript
// Update AppProps to carry historyFile and historySize:
interface AppProps {
  appState: AppState;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  historySize?: number;              // NEW (also fixes Gap S06)
  historyFile?: string;              // NEW
}

export class App extends StatefulWidget {
  readonly appState: AppState;
  readonly onSubmit: (text: string) => void;
  readonly onCancel: () => void;
  readonly historySize: number;      // NEW
  readonly historyFile: string | null; // NEW

  constructor(props: AppProps) {
    super({});
    this.appState = props.appState;
    this.onSubmit = props.onSubmit;
    this.onCancel = props.onCancel;
    this.historySize = props.historySize ?? 100;       // NEW
    this.historyFile = props.historyFile ?? null;       // NEW
  }

  createState(): AppStateWidget {
    return new AppStateWidget();
  }
}
```

In `AppStateWidget`, move the `PromptHistory` instantiation to `initState()` where
`this.widget` props are available, and add a `dispose()` hook for the final save:

```typescript
class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private stateListener: (() => void) | null = null;
  private showCommandPalette = false;
  private showFilePicker = false;
  private fileList: string[] = [];
  private promptHistory!: PromptHistory;  // CHANGED: definite assignment assertion
  private _lastUpdate = 0;
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

  override initState(): void {
    super.initState();
    // Create PromptHistory with persistence (resolves both Gap S06 and S07)
    this.promptHistory = new PromptHistory(
      this.widget.historySize,
      this.widget.historyFile,
    );

    // Listen to AppState changes and trigger rebuilds (50ms throttle for streaming)
    this.stateListener = () => {
      // ... existing throttle logic unchanged ...
    };
    this.widget.appState.addListener(this.stateListener);
  }

  override dispose(): void {
    // Flush history to disk on graceful teardown
    this.promptHistory.save();

    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
    if (this.stateListener) {
      this.widget.appState.removeListener(this.stateListener);
    }
    super.dispose();
  }

  // ... build() and handlers unchanged ...
}
```

Update the `startTUI` function signature to accept and forward the new props:

```typescript
export async function startTUI(
  appState: AppState,
  onSubmit: (text: string) => void,
  onCancel: () => void,
  historySize?: number,              // NEW
  historyFile?: string,              // NEW
): Promise<WidgetsBinding> {
  const app = new App({ appState, onSubmit, onCancel, historySize, historyFile });
  return runApp(app, {
    output: process.stdout,
    terminal: true,
    errorLogger: log.error,
  });
}
```

### 4.4 Changes to `packages/flitter-amp/src/index.ts`

Pass `config.historyFile` and `config.historySize` through to `startTUI`:

```typescript
// Start the TUI
log.info('Starting TUI...');
await startTUI(
  appState, handleSubmit, handleCancel,
  config.historySize, config.historyFile,
);
```

### 4.5 Signal Handler Safety Net

The `dispose()` hook in `AppStateWidget` provides the primary save-on-exit path. However,
`process.exit(0)` in the SIGINT/SIGTERM handlers may short-circuit the widget disposal
process. There are two approaches to handle this:

**Approach A: Store PromptHistory reference on AppState (Recommended)**

Move the `PromptHistory` to `AppState` so the signal cleanup handler in `index.ts` can
access it directly. This is the most robust approach.

```typescript
// app-state.ts -- add history reference
export class AppState implements ClientCallbacks {
  readonly conversation = new ConversationState();
  promptHistory: PromptHistory | null = null;  // NEW
  // ... rest unchanged ...
}

// index.ts -- create and attach before starting TUI
appState.promptHistory = new PromptHistory(config.historySize, config.historyFile);

// index.ts -- cleanup handler
const cleanup = () => {
  appState.promptHistory?.save();              // NEW: flush history
  handle.client.cleanup();
  handle.agent.kill();
  closeLogFile();
};

// app.ts -- AppStateWidget uses appState.promptHistory instead of local field
class AppStateWidget extends State<App> {
  // Remove: private promptHistory!: PromptHistory;
  // Access via: this.widget.appState.promptHistory!
}
```

**Approach B: Rely on appendToFile for incremental durability**

Since `push()` calls `appendToFile()` on every prompt submission, the history file is
incrementally updated during normal operation. The only data at risk on a hard kill
(SIGKILL) is a pending full rewrite after eviction. For most users, this is acceptable --
the file may have a few extra entries beyond `maxSize`, which will be trimmed on the next
load.

**Recommendation**: Use Approach A. It is only ~5 lines of additional code and provides
a clean save on all exit paths (SIGINT, SIGTERM, normal exit via widget disposal). The
`dispose()` path remains as a defense-in-depth backup.

---

## 5. File Format Specification

### 5.1 Grammar

```
history_file  = { entry_line }
entry_line    = escaped_text NEWLINE
escaped_text  = { CHAR | ESCAPED_NEWLINE | ESCAPED_BACKSLASH }
CHAR          = any character except NEWLINE and BACKSLASH
ESCAPED_NEWLINE   = "\" "n"         ; two-character sequence representing U+000A
ESCAPED_BACKSLASH = "\" "\"         ; two-character sequence representing U+005C
NEWLINE       = U+000A
```

### 5.2 Encoding/Decoding Round-Trip Proof

The encode/decode functions form a bijection over the set of all strings. Proof sketch:

1. `encode` replaces `\` with `\\` first, then `\n` with `\n`. This is order-dependent:
   doing backslashes first ensures that the `\n` introduced by step 2 cannot be confused
   with a pre-existing `\n` in the input.
2. `decode` uses a single-pass state machine that recognizes `\n` and `\\` as escape
   sequences. Any `\` not followed by `n` or `\` is preserved literally. This handles
   truncated files (trailing `\` at end of line) gracefully.
3. For any string `s`: `decode(encode(s)) === s`. This is verified by the unit tests below.

### 5.3 Example File

```
fix the authentication bug in the login flow
add comprehensive unit tests for the user service
refactor the database layer\nand add the missing migration scripts
path\\to\\some\\windows\\file
deploy to staging and run the smoke tests
```

Line 3 contains a prompt with an embedded newline. Line 4 contains a prompt with literal
backslashes (e.g., a Windows path).

---

## 6. Diff Summary

### `packages/flitter-amp/src/state/history.ts`

```diff
-// Prompt history -- in-memory history of previous prompts for Ctrl+R navigation
+// Prompt history -- persistent history of previous prompts for Ctrl+R navigation

+import {
+  readFileSync, writeFileSync, appendFileSync,
+  existsSync, mkdirSync,
+} from 'node:fs';
+import { dirname } from 'node:path';

 export class PromptHistory {
   private entries: string[] = [];
   private cursor = -1;
   private readonly maxSize: number;
+  private readonly filePath: string | null;
+  private needsFullRewrite = false;

-  constructor(maxSize = 100) {
+  constructor(maxSize = 100, filePath: string | null = null) {
     this.maxSize = maxSize;
+    this.filePath = filePath;
+    if (filePath) {
+      this.load();
+    }
   }

+  private static encode(entry: string): string { /* ... */ }
+  private static decode(line: string): string { /* ... */ }
+  private load(): void { /* ... */ }
+  save(): void { /* ... */ }
+  private appendToFile(text: string): void { /* ... */ }
+  private ensureDirectory(): void { /* ... */ }

   push(text: string): void {
     if (text.trim() === '') return;
     if (this.entries.length > 0 && this.entries[this.entries.length - 1] === text) return;
     this.entries.push(text);
     if (this.entries.length > this.maxSize) {
       this.entries.shift();
+      this.needsFullRewrite = true;
     }
     this.cursor = -1;
+    this.appendToFile(text);
   }

   // previous(), next(), resetCursor() unchanged
+
+  get isAtReset(): boolean {
+    return this.cursor === -1;
+  }
+
+  get length(): number {
+    return this.entries.length;
+  }
 }
```

### `packages/flitter-amp/src/state/config.ts`

```diff
 interface UserConfig {
   agent?: string;
   editor?: string;
   cwd?: string;
   expandToolCalls?: boolean;
   historySize?: number;
+  historyFile?: string;
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
+  historyFile: string;
 }

 // In parseArgs() return:
   return {
     agentCommand, agentArgs, cwd, expandToolCalls, logLevel,
     editor: userConfig.editor || process.env.EDITOR || process.env.VISUAL || 'vi',
     historySize: userConfig.historySize ?? 100,
+    historyFile: userConfig.historyFile
+      ? resolve(userConfig.historyFile)
+      : join(homedir(), '.flitter', 'prompt_history'),
   };
```

### `packages/flitter-amp/src/app.ts`

```diff
 interface AppProps {
   appState: AppState;
   onSubmit: (text: string) => void;
   onCancel: () => void;
+  historySize?: number;
+  historyFile?: string;
 }

 export class App extends StatefulWidget {
   readonly appState: AppState;
   readonly onSubmit: (text: string) => void;
   readonly onCancel: () => void;
+  readonly historySize: number;
+  readonly historyFile: string | null;

   constructor(props: AppProps) {
     super({});
     this.appState = props.appState;
     this.onSubmit = props.onSubmit;
     this.onCancel = props.onCancel;
+    this.historySize = props.historySize ?? 100;
+    this.historyFile = props.historyFile ?? null;
   }
   // ...
 }

 class AppStateWidget extends State<App> {
   // ...
-  private promptHistory = new PromptHistory();
+  private promptHistory!: PromptHistory;
   // ...

   override initState(): void {
     super.initState();
+    this.promptHistory = new PromptHistory(
+      this.widget.historySize,
+      this.widget.historyFile,
+    );
     // ... listener setup ...
   }

+  override dispose(): void {
+    this.promptHistory.save();
+    // ... existing dispose logic ...
+  }
   // ...
 }

 export async function startTUI(
   appState: AppState,
   onSubmit: (text: string) => void,
   onCancel: () => void,
+  historySize?: number,
+  historyFile?: string,
 ): Promise<WidgetsBinding> {
-  const app = new App({ appState, onSubmit, onCancel });
+  const app = new App({ appState, onSubmit, onCancel, historySize, historyFile });
   return runApp(app, {
     output: process.stdout,
     terminal: true,
     errorLogger: log.error,
   });
 }
```

### `packages/flitter-amp/src/index.ts`

```diff
   // Start the TUI
   log.info('Starting TUI...');
-  await startTUI(appState, handleSubmit, handleCancel);
+  await startTUI(
+    appState, handleSubmit, handleCancel,
+    config.historySize, config.historyFile,
+  );
 }
```

---

## 7. Testing Plan

### 7.1 Unit Tests: Encode/Decode Round-Trip

```typescript
import { PromptHistory } from './state/history';

// Note: encode/decode are private static methods. To test them directly,
// either make them package-visible or test through the public API (push + load).

describe('PromptHistory encode/decode round-trip', () => {
  const testCases = [
    'simple text',
    'line1\nline2',
    'line1\nline2\nline3',
    'path\\to\\file',
    'has\\nnewline-like sequence',      // literal \n (2 chars)
    'trailing backslash\\',
    'double\\\\backslash',
    'mixed\n\\path\\with\nnewlines',
    '',                                   // empty (never stored, but should round-trip)
    'unicode: \u00e9\u00e8\u00ea \u{1f600}',
  ];

  for (const input of testCases) {
    it(`round-trips: ${JSON.stringify(input)}`, () => {
      // Create a history, push the entry, save to file, load in new instance
      const tmpFile = `/tmp/history-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const h1 = new PromptHistory(100, tmpFile);
      if (input.trim() !== '') {
        h1.push(input);
        h1.save();

        const h2 = new PromptHistory(100, tmpFile);
        expect(h2.previous()).toBe(input);
      }
      // Cleanup
      try { require('fs').unlinkSync(tmpFile); } catch {}
    });
  }
});
```

### 7.2 Unit Tests: Core Persistence Behavior

```typescript
import { PromptHistory } from './state/history';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PromptHistory persistence', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'history-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves entries to disk on push', () => {
    const filePath = join(tmpDir, 'history');
    const h = new PromptHistory(100, filePath);
    h.push('first prompt');
    h.push('second prompt');

    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toBe('first prompt\nsecond prompt\n');
  });

  it('loads entries from disk on construction', () => {
    const filePath = join(tmpDir, 'history');
    writeFileSync(filePath, 'alpha\nbeta\ngamma\n', 'utf-8');

    const h = new PromptHistory(100, filePath);
    expect(h.length).toBe(3);
    expect(h.previous()).toBe('gamma');
    expect(h.previous()).toBe('beta');
    expect(h.previous()).toBe('alpha');
  });

  it('truncates loaded entries to maxSize, keeping the most recent', () => {
    const filePath = join(tmpDir, 'history');
    const lines = Array.from({ length: 200 }, (_, i) => `entry-${i}`);
    writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');

    const h = new PromptHistory(50, filePath);
    expect(h.length).toBe(50);
    // Should keep the last 50: entry-150 through entry-199
    expect(h.previous()).toBe('entry-199');
  });

  it('handles missing file gracefully', () => {
    const filePath = join(tmpDir, 'nonexistent');
    const h = new PromptHistory(100, filePath);
    expect(h.length).toBe(0);
  });

  it('creates parent directories on first save', () => {
    const filePath = join(tmpDir, 'nested', 'dir', 'history');
    const h = new PromptHistory(100, filePath);
    h.push('test');

    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toBe('test\n');
  });

  it('handles entries with embedded newlines', () => {
    const filePath = join(tmpDir, 'history');
    const h1 = new PromptHistory(100, filePath);
    h1.push('line1\nline2');
    h1.push('simple');

    const raw = readFileSync(filePath, 'utf-8');
    expect(raw).toBe('line1\\nline2\nsimple\n');

    // Load in a new instance
    const h2 = new PromptHistory(100, filePath);
    expect(h2.length).toBe(2);
    expect(h2.previous()).toBe('simple');
    expect(h2.previous()).toBe('line1\nline2');
  });

  it('handles entries with literal backslashes', () => {
    const filePath = join(tmpDir, 'history');
    const h1 = new PromptHistory(100, filePath);
    h1.push('path\\to\\file');
    h1.save();

    const raw = readFileSync(filePath, 'utf-8');
    expect(raw).toBe('path\\\\to\\\\file\n');

    const h2 = new PromptHistory(100, filePath);
    expect(h2.previous()).toBe('path\\to\\file');
  });

  it('handles entries with literal backslash-n sequence', () => {
    const filePath = join(tmpDir, 'history');
    const h1 = new PromptHistory(100, filePath);
    // The string contains a literal backslash followed by 'n' (not a newline)
    h1.push('echo "hello\\nworld"');
    h1.save();

    const raw = readFileSync(filePath, 'utf-8');
    // The backslash is escaped to \\, so \\n on disk is literal, not a newline escape
    expect(raw).toBe('echo "hello\\\\nworld"\n');

    const h2 = new PromptHistory(100, filePath);
    expect(h2.previous()).toBe('echo "hello\\nworld"');
  });

  it('rewrites file when entries are evicted', () => {
    const filePath = join(tmpDir, 'history');
    const h = new PromptHistory(3, filePath);
    h.push('a');
    h.push('b');
    h.push('c');
    // File should have 3 lines via appends
    expect(readFileSync(filePath, 'utf-8')).toBe('a\nb\nc\n');

    h.push('d'); // Evicts 'a', triggers full rewrite
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toBe('b\nc\nd\n');
  });

  it('save() writes current state regardless of needsFullRewrite', () => {
    const filePath = join(tmpDir, 'history');
    const h = new PromptHistory(100, filePath);
    h.push('one');
    h.push('two');

    // Corrupt the file externally
    writeFileSync(filePath, 'garbage\n', 'utf-8');

    // Explicit save restores correct state
    h.save();
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toBe('one\ntwo\n');
  });

  it('deduplicates consecutive identical entries (no duplicate on disk)', () => {
    const filePath = join(tmpDir, 'history');
    const h = new PromptHistory(100, filePath);
    h.push('same');
    h.push('same');
    h.push('same');

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toBe('same\n');
  });

  it('works without filePath (pure in-memory mode)', () => {
    const h = new PromptHistory(100);
    h.push('ephemeral');
    expect(h.length).toBe(1);
    h.save(); // Should be a no-op, not throw
  });

  it('persists across simulated sessions', () => {
    const filePath = join(tmpDir, 'history');

    // Session 1
    const s1 = new PromptHistory(100, filePath);
    s1.push('fix the bug');
    s1.push('add tests');
    s1.save();

    // Session 2
    const s2 = new PromptHistory(100, filePath);
    expect(s2.length).toBe(2);
    expect(s2.previous()).toBe('add tests');
    expect(s2.previous()).toBe('fix the bug');

    // Add more in session 2
    s2.push('deploy');
    s2.save();

    // Session 3
    const s3 = new PromptHistory(100, filePath);
    expect(s3.length).toBe(3);
    expect(s3.previous()).toBe('deploy');
    expect(s3.previous()).toBe('add tests');
    expect(s3.previous()).toBe('fix the bug');
  });

  it('ignores empty lines in the file', () => {
    const filePath = join(tmpDir, 'history');
    // Simulate a file with blank lines (e.g., from manual editing)
    writeFileSync(filePath, 'alpha\n\nbeta\n\n\ngamma\n', 'utf-8');

    const h = new PromptHistory(100, filePath);
    expect(h.length).toBe(3);
    expect(h.previous()).toBe('gamma');
    expect(h.previous()).toBe('beta');
    expect(h.previous()).toBe('alpha');
  });

  it('handles empty file (0 bytes)', () => {
    const filePath = join(tmpDir, 'history');
    writeFileSync(filePath, '', 'utf-8');

    const h = new PromptHistory(100, filePath);
    expect(h.length).toBe(0);
  });

  it('respects custom maxSize from config', () => {
    const filePath = join(tmpDir, 'history');
    const h = new PromptHistory(5, filePath);
    for (let i = 0; i < 10; i++) {
      h.push(`entry-${i}`);
    }
    // Only last 5 should remain: entry-5 through entry-9
    const entries: string[] = [];
    let prev = h.previous();
    while (prev !== null) {
      entries.push(prev);
      prev = h.previous();
    }
    expect(entries).toEqual(['entry-9', 'entry-8', 'entry-7', 'entry-6', 'entry-5']);

    // File should also only contain the last 5
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.length > 0);
    expect(lines).toEqual(['entry-5', 'entry-6', 'entry-7', 'entry-8', 'entry-9']);
  });
});
```

### 7.3 Integration Test: Config Wiring

```typescript
import { parseArgs } from './state/config';

describe('parseArgs historyFile', () => {
  it('defaults to ~/.flitter/prompt_history', () => {
    const config = parseArgs(['bun', 'script.ts']);
    expect(config.historyFile).toMatch(/\.flitter\/prompt_history$/);
  });

  it('defaults historySize to 100', () => {
    const config = parseArgs(['bun', 'script.ts']);
    expect(config.historySize).toBe(100);
  });

  // With mock config file setting custom values:
  it('respects custom historyFile from config', () => {
    // Requires mocking homedir() and fs.readFileSync
    // to return { "historyFile": "/tmp/custom_history" }
    const config = parseArgs(['bun', 'script.ts']);
    expect(config.historyFile).toBe('/tmp/custom_history');
  });

  it('resolves relative historyFile paths', () => {
    // Requires mocking to return { "historyFile": "./my_history" }
    const config = parseArgs(['bun', 'script.ts']);
    expect(config.historyFile).toMatch(/^\//);  // Should be absolute
  });
});
```

### 7.4 Manual Verification Checklist

1. Launch flitter-amp. Type three prompts and submit each.
2. Exit with Ctrl+C.
3. Verify `~/.flitter/prompt_history` exists and contains three lines.
4. Launch flitter-amp again. Press Ctrl+R three times -- should recall all three
   prompts in reverse order.
5. Submit two more prompts, exit, relaunch -- should now have five entries.
6. Set `"historySize": 3` in `~/.flitter-amp/config.json`, relaunch -- Ctrl+R
   should only recall the three most recent entries. The history file should be
   trimmed to three lines after the next push that causes eviction.
7. Set `"historyFile": "/tmp/test_history"` in config, relaunch -- verify the
   custom path is used.
8. Delete the history file while the app is running, submit a prompt -- the file
   should be recreated with just the new entry.
9. Test a prompt containing a newline (if multi-line input is supported) -- verify
   it round-trips correctly through the escape encoding.
10. Run `cat ~/.flitter/prompt_history` -- verify it is human-readable plain text.
11. Manually edit the history file (add/remove lines) -- verify the changes are
    picked up on the next launch.

---

## 8. Edge Cases and Failure Modes

| Scenario | Expected Behavior |
|----------|-------------------|
| History file does not exist on startup | Start with empty history, create file on first push |
| History file is empty (0 bytes) | Start with empty history |
| History file is not readable (permissions) | Start with empty history, no error shown to user |
| History file is not writable (permissions) | In-memory history works normally, disk writes silently fail |
| Parent directory does not exist | Created with `mkdirSync({ recursive: true })` |
| File has more entries than `maxSize` | Truncated to last `maxSize` entries on load; rewrite scheduled |
| Concurrent instances writing to same file | Entries interleaved (acceptable, consistent with shell behavior) |
| Corrupted file (binary data, invalid UTF-8) | `readFileSync` may produce garbage; `split('\n')` still works, entries may be garbled but the app does not crash |
| Disk full | `writeFileSync`/`appendFileSync` throws; caught, history remains in memory only |
| Very large history file (>1MB) | Handled correctly but load time increases; recommend keeping `maxSize` reasonable (<1000) |
| Prompt contains only whitespace | Rejected by `push()` (existing behavior), never written to file |
| Duplicate consecutive prompts | Deduplicated by `push()` (existing behavior), not written to file |
| SIGKILL (unhandleable) | History is incrementally saved via `appendToFile()`, so only the most recent push may be lost if it triggered a rewrite that was interrupted |
| File deleted while app is running | Next `appendToFile` will create a new file (via `ensureDirectory` + `appendFileSync`); only the current entry survives until the next full `save()` |
| Trailing newline in file | Handled by `filter(line => line.length > 0)` -- empty lines are ignored |
| No trailing newline | Last line is still parsed correctly by `split('\n')` |

---

## 9. Performance Analysis

### 9.1 Load Time

Reading and parsing a 100-line history file (~5KB) takes <1ms on modern hardware.
The synchronous `readFileSync` call is acceptable because it only happens once at startup,
before the TUI event loop begins.

### 9.2 Write Time

- **Append** (`appendFileSync`): <0.1ms per call. This is the common path -- called once
  per prompt submission.
- **Full rewrite** (`writeFileSync`): <1ms for 100 lines. This only happens when an
  entry is evicted (rare once history reaches steady state) or on application exit.

### 9.3 Memory

No additional memory beyond the existing `entries` array. The `filePath` and
`needsFullRewrite` fields add a negligible ~100 bytes.

### 9.4 File System Overhead

At most one file write per prompt submission. For the typical interactive usage pattern
(one prompt every few seconds to minutes), this is negligible.

---

## 10. Alternative Approaches Considered

### 10.1 SQLite

**Pros**: Handles concurrency well, supports structured queries, timestamps.
**Cons**: Heavy dependency for a simple string list, overkill for <100 entries,
requires native bindings, harder to inspect/edit manually.
**Verdict**: Rejected. Not justified for the data volume.

### 10.2 JSON File

**Pros**: Native `JSON.parse`/`JSON.stringify`, handles all string values.
**Cons**: Full file rewrite on every write (no append), harder to read with `cat`,
slightly more parsing overhead.
**Verdict**: Rejected. The line-based format with escape encoding is simpler and
supports efficient append.

### 10.3 JSON Lines (NDJSON)

**Pros**: Append-friendly, handles any string value via JSON encoding, well-defined spec.
**Cons**: Less human-readable for the common case (every line is quoted and escaped),
slightly more parsing overhead per line.
**Verdict**: Viable alternative. Could be reconsidered if the escape encoding proves
insufficient in practice.

### 10.4 XDG Base Directory Spec

**Pros**: Places data files in `$XDG_DATA_HOME/flitter-amp/` (default
`~/.local/share/flitter-amp/`), following Linux conventions.
**Cons**: The existing codebase already uses `~/.flitter/` for logs, making it the
established data directory. Switching to XDG would be inconsistent with the existing
convention and could be addressed in a separate cleanup.
**Verdict**: Deferred. Not worth the inconsistency for this change.

---

## 11. Future Improvements (Out of Scope)

1. **File locking**: Use `flock` or advisory locking to prevent concurrent sessions
   from corrupting each other's history. Relevant when multiple terminal tabs run
   flitter-amp simultaneously against the same history file.

2. **Per-project history**: Store separate history files per working directory
   (e.g., `~/.flitter/history/<project-hash>`), similar to how some shells support
   per-directory history.

3. **History search/filter**: Beyond Ctrl+R sequential navigation, add incremental
   search (type to filter history entries), matching bash's `reverse-i-search`.

4. **Timestamp metadata**: Store timestamps alongside entries (e.g., JSON Lines format)
   to support "show history from last week" queries or age-based pruning.

5. **Cross-session merge**: When loading, merge the on-disk entries with any that
   were written by other sessions since this instance started, rather than simply
   overwriting on full save.

6. **Async I/O**: For very large history files or slow file systems, switch to
   async `fs.promises` APIs. Not needed at current scale.

---

## 12. Related Gaps

- **Gap S06 (52-history-size-wiring.md)**: `historySize` config value is parsed but
  never wired to `PromptHistory`. This proposal solves that gap as a side effect by
  threading `historySize` through to the constructor alongside `historyFile`.

- **Gap S05 (51-prompt-history-fix.md)**: Ctrl+R navigation does not inject text into
  the InputArea. Orthogonal to this gap but touches the same `AppStateWidget` class.
  Both fixes modify the `promptHistory` field declaration and `initState()`, so they
  should be coordinated to avoid merge conflicts.

- **Gap 33 (33-session-id-display.md)**: Session metadata display. No direct
  interaction, but if session IDs are shown, the history file could optionally be
  tagged with session boundaries for debugging.

---

## 13. Implementation Checklist

- [ ] Add `encode`/`decode` static methods to `PromptHistory`
- [ ] Add `filePath` constructor parameter and `load()` method
- [ ] Add `save()` public method and `appendToFile()` private method
- [ ] Add `ensureDirectory()` helper
- [ ] Wire `appendToFile()` into `push()`
- [ ] Add `needsFullRewrite` flag for eviction-triggered rewrites
- [ ] Add `isAtReset` and `length` getters
- [ ] Add `historyFile` to `UserConfig` and `AppConfig` interfaces
- [ ] Add `historyFile` resolution to `parseArgs()`
- [ ] Add `historySize` and `historyFile` props to `App` and `startTUI`
- [ ] Move `PromptHistory` instantiation to `initState()` in `AppStateWidget`
- [ ] Add `dispose()` override with `save()` call in `AppStateWidget`
- [ ] Add `save()` call to cleanup handler in `index.ts` (signal safety net)
- [ ] Pass config values through `startTUI()` in `index.ts`
- [ ] Write unit tests for encode/decode round-trip
- [ ] Write unit tests for persistence behavior
- [ ] Write integration tests for config wiring
- [ ] Manual testing per verification checklist
