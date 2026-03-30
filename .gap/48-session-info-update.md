# S02: `session_info_update` Event Handler Is a No-Op

## Problem

The `session_info_update` case in `AppState.onSessionUpdate()` (lines 140-143 of
`packages/flitter-amp/src/state/app-state.ts`) acknowledges the event but discards
all payload data:

```typescript
case 'session_info_update': {
  // Session metadata update
  break;
}
```

This event is the ACP protocol's primary mechanism for the agent to communicate
session-level metadata changes to the client after the session has been
established. When it arrives, it can carry any combination of: the agent's
display name, the current working directory, available tools/skills, system
prompt information, configured MCP servers, active mode details, and other
session-scoped context. By silently dropping this data, flitter-amp misses
real-time updates that should be reflected in the TUI.

## Impact

### Fields that remain stale after initialization

Several `AppState` fields are populated once during startup and never updated:

| Field | Set during | Updated from `session_info_update` | Consequence |
|-------|-----------|-----------------------------------|-------------|
| `agentName` | `setConnected()` in `index.ts:48` | No | If the agent changes its display name mid-session, the status bar shows the old name |
| `cwd` | `index.ts:23` (from CLI config) | No | If the agent changes working directory (e.g., `cd` in a tool call), bottom-right path is stale |
| `gitBranch` | `index.ts:27-37` (one-shot `git rev-parse`) | No | Branch changes during session (checkout, new branch) never appear |
| `currentMode` | `current_mode_update` event only | N/A (separate event) | Not affected, but mode metadata (name, description) from `session_info_update` is lost |
| `skillCount` | Initialized to `0`, never set | No | Always shows 0 in the input area skill badge |

### UI features that cannot be wired

The `BottomGrid` widget already accepts `hintText` and `autocompleteTriggers`
props (declared at `widgets/bottom-grid.ts:25,28` and `widgets/input-area.ts`),
but `App.build()` never passes them because `AppState` has no corresponding
fields. The `session_info_update` event is the natural data source for both:

- **`hintText`**: contextual hint displayed in the bottom-left status area
  (e.g., "Type /help for commands", or mode-specific guidance from the agent)
- **`autocompleteTriggers`**: slash commands, file-reference triggers, and other
  completions the agent advertises for the current session

Without the handler, these UI elements remain permanently inert.

## ACP Protocol Context

The `SessionUpdate` interface in `acp/client.ts` is a loose bag:

```typescript
export interface SessionUpdate {
  sessionUpdate: string;
  [key: string]: unknown;
}
```

This means the `session_info_update` payload arrives as an open-ended object.
The ACP SDK (v0.16.0, declared in `package.json`) defines `session_info_update`
as carrying session metadata fields. Based on the protocol specification and
observed agent behavior, the expected payload shape includes:

```typescript
interface SessionInfoUpdatePayload {
  sessionUpdate: 'session_info_update';

  // Agent identity
  agentName?: string;         // Display name of the agent
  agentVersion?: string;      // Agent version string

  // Session environment
  cwd?: string;               // Current working directory
  gitBranch?: string;         // Active git branch (if in a repo)

  // Capabilities
  tools?: Array<{             // Available tools/skills
    name: string;
    description?: string;
  }>;
  modes?: Array<{             // Available agent modes
    id: string;
    name: string;
    description?: string;
  }>;
  mcpServers?: Array<{        // Connected MCP servers
    name: string;
    status: string;
  }>;

  // UI hints
  hintText?: string;          // Contextual hint for the input area
  autocompleteTriggers?: Array<{
    trigger: string;
    description?: string;
  }>;
}
```

## Proposed Solution

### Step 1: Add missing state fields to `AppState`

Add the new fields that `session_info_update` should populate, alongside the
existing fields that it should be able to override:

```typescript
// app-state.ts — new and updated fields

export interface SessionTools {
  name: string;
  description?: string;
}

export interface SessionMode {
  id: string;
  name: string;
  description?: string;
}

export class AppState implements ClientCallbacks {
  // --- Existing fields (unchanged) ---
  readonly conversation = new ConversationState();
  sessionId: string | null = null;
  agentName: string | null = null;
  currentMode: string | null = null;
  isConnected = false;
  error: string | null = null;
  cwd: string = process.cwd();
  gitBranch: string | null = null;
  skillCount: number = 0;

  // --- New fields populated by session_info_update ---
  agentVersion: string | null = null;
  hintText: string | null = null;
  tools: SessionTools[] = [];
  modes: SessionMode[] = [];
  autocompleteTriggers: Array<{ trigger: string; description?: string }> = [];

  // ... rest unchanged
}
```

### Step 2: Implement the `session_info_update` handler

Replace the no-op case with a handler that extracts known fields and updates
`AppState` accordingly:

```typescript
case 'session_info_update': {
  // Agent identity
  if (typeof update.agentName === 'string') {
    this.agentName = update.agentName;
  }
  if (typeof update.agentVersion === 'string') {
    this.agentVersion = update.agentVersion;
  }

  // Session environment — allow agent to update cwd/branch in real time
  if (typeof update.cwd === 'string') {
    this.cwd = update.cwd;
  }
  if (typeof update.gitBranch === 'string') {
    this.gitBranch = update.gitBranch;
  } else if (update.gitBranch === null) {
    this.gitBranch = null;
  }

  // Tool/skill inventory — derive skillCount from the list length
  if (Array.isArray(update.tools)) {
    this.tools = update.tools as SessionTools[];
    this.skillCount = this.tools.length;
  }

  // Available modes
  if (Array.isArray(update.modes)) {
    this.modes = update.modes as SessionMode[];
  }

  // UI hints
  if (update.hintText !== undefined) {
    this.hintText = (update.hintText as string) ?? null;
  }

  // Autocomplete triggers
  if (Array.isArray(update.autocompleteTriggers)) {
    this.autocompleteTriggers = update.autocompleteTriggers as Array<{
      trigger: string;
      description?: string;
    }>;
  }

  log.debug('session_info_update processed', {
    agentName: this.agentName,
    cwd: this.cwd,
    toolCount: this.tools.length,
  });

  break;
}
```

### Step 3: Wire new state fields into `App.build()` and `BottomGrid`

The `BottomGrid` widget already accepts `hintText` and `autocompleteTriggers`
props but `App.build()` never passes them. After Step 1 adds the fields to
`AppState`, wire them through:

```typescript
// app.ts — inside AppStateWidget.build(), the BottomGrid constructor call

new BottomGrid({
  onSubmit: (text: string) => {
    this.promptHistory.push(text);
    this.widget.onSubmit(text);
  },
  isProcessing: appState.isProcessing,
  currentMode: appState.currentMode ?? 'smart',
  agentName: appState.agentName ?? undefined,
  cwd: appState.cwd,
  gitBranch: appState.gitBranch ?? undefined,
  tokenUsage: appState.usage ?? undefined,
  skillCount: appState.skillCount,
  // NEW: wire session_info_update data to BottomGrid
  hintText: appState.hintText ?? undefined,
  autocompleteTriggers: appState.autocompleteTriggers.length > 0
    ? appState.autocompleteTriggers.map(t => ({
        trigger: t.trigger,
        description: t.description,
      }))
    : undefined,
}),
```

### Step 4: Add type-safe payload interface

To avoid scattering `as` casts throughout the handler, define a payload
interface and validate the update object at the entry point:

```typescript
// acp/types.ts — add alongside existing type exports

export interface SessionInfoPayload {
  sessionUpdate: 'session_info_update';
  agentName?: string;
  agentVersion?: string;
  cwd?: string;
  gitBranch?: string | null;
  tools?: Array<{ name: string; description?: string }>;
  modes?: Array<{ id: string; name: string; description?: string }>;
  hintText?: string | null;
  autocompleteTriggers?: Array<{ trigger: string; description?: string }>;
}
```

Then in the handler, cast once at the top:

```typescript
case 'session_info_update': {
  const info = update as SessionInfoPayload;

  if (info.agentName !== undefined) this.agentName = info.agentName;
  if (info.agentVersion !== undefined) this.agentVersion = info.agentVersion;
  if (info.cwd !== undefined) this.cwd = info.cwd;
  if (info.gitBranch !== undefined) this.gitBranch = info.gitBranch;

  if (Array.isArray(info.tools)) {
    this.tools = info.tools;
    this.skillCount = info.tools.length;
  }
  if (Array.isArray(info.modes)) {
    this.modes = info.modes;
  }
  if (info.hintText !== undefined) {
    this.hintText = info.hintText ?? null;
  }
  if (Array.isArray(info.autocompleteTriggers)) {
    this.autocompleteTriggers = info.autocompleteTriggers;
  }

  log.debug(`session_info_update: agent=${this.agentName}, cwd=${this.cwd}, tools=${this.skillCount}`);
  break;
}
```

## Files to Modify

| File | Change |
|------|--------|
| `packages/flitter-amp/src/state/app-state.ts` | Add new state fields (`agentVersion`, `hintText`, `tools`, `modes`, `autocompleteTriggers`); implement the `session_info_update` case body |
| `packages/flitter-amp/src/acp/types.ts` | Add `SessionInfoPayload` interface and `SessionTools`/`SessionMode` types |
| `packages/flitter-amp/src/app.ts` | Pass `hintText` and `autocompleteTriggers` from `AppState` into `BottomGrid` props |

## Edge Cases and Design Decisions

### Partial updates

The handler must treat every field as optional. An agent may send a
`session_info_update` with only `cwd` changed, or only `tools` changed. The
guard pattern `if (info.X !== undefined)` ensures we only overwrite fields that
the agent explicitly included. This is critical because the protocol sends
incremental updates, not full snapshots.

### `gitBranch` nullability

An agent may explicitly set `gitBranch` to `null` to indicate the working
directory is no longer inside a git repository (e.g., after `cd /tmp`). The
handler must distinguish between `undefined` (field not present, do not change)
and `null` (field explicitly cleared). The check
`if (info.gitBranch !== undefined)` covers both cases: it lets through `null`
assignments while ignoring absent fields.

### `skillCount` derivation

Today `skillCount` is an independent field initialized to `0` and never updated.
The proposed solution derives it from `tools.length` whenever the `tools` array
is updated. This is preferable to treating `skillCount` as an independent
protocol field because:
1. It eliminates the possibility of `skillCount` and `tools.length` diverging.
2. Agents report their tools as a list, not as a count.
3. The InputArea widget only needs the count, not the list.

If a future protocol revision adds a separate `skillCount` field, the handler
can be extended to accept it as an override.

### Backward compatibility

Agents that never emit `session_info_update` (or emit it with an empty payload)
cause no change in behavior. All new fields have safe defaults (`null`, `0`, or
`[]`), and the existing initialization path in `index.ts` continues to populate
`cwd`, `gitBranch`, and `agentName` during startup. The handler only overrides
these values when the agent actively sends new data.

### Logging

The `log.debug()` call at the end of the handler provides visibility into what
the agent is reporting without flooding the log during normal operation. For
development and debugging, running with `--debug` will surface these updates.

## Verification

After implementation, verify with the following checks:

1. **Startup**: Connect to a Claude agent (`claude --agent`). Confirm that if
   the agent sends an initial `session_info_update`, the status bar reflects the
   agent-reported `cwd` and `agentName` (which may differ from the CLI-provided
   values).

2. **Tool count**: After the agent reports its tools via `session_info_update`,
   confirm the InputArea skill badge shows the correct count instead of `0`.

3. **Dynamic cwd**: If the agent's working directory changes (e.g., via a
   `cd` in a terminal tool call followed by a `session_info_update`), confirm
   the bottom-right path label updates.

4. **Hint text**: If the agent sends `hintText` in a `session_info_update`,
   confirm the bottom-left area shows the hint text instead of the default
   "? for shortcuts" prompt.

5. **No-op backward compat**: Connect to an agent that does not emit
   `session_info_update` (or emits it with `{}`). Confirm all fields retain
   their startup values and the TUI renders identically to the current behavior.

6. **Partial update**: Send (or mock) a `session_info_update` with only
   `gitBranch: "feature/test"`. Confirm only `gitBranch` changes; `cwd`,
   `agentName`, `tools`, etc. remain at their prior values.
