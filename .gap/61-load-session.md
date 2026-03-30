# Gap P05: LoadSessionRequest Imported but Unused

## Status: Open
## Severity: Low (dead code / incomplete feature wiring)
## Area: `packages/flitter-amp/src/acp/types.ts`, `packages/flitter-amp/src/acp/connection.ts`, `packages/flitter-amp/src/state/config.ts`, `packages/flitter-amp/src/index.ts`, `packages/flitter-amp/src/state/app-state.ts`

---

## 1. Problem Statement

The file `packages/flitter-amp/src/acp/types.ts` (lines 14-15) re-exports
`LoadSessionRequest` and `LoadSessionResponse` from the `@agentclientprotocol/sdk`:

```typescript
export type {
  // ... other types ...
  LoadSessionRequest,
  LoadSessionResponse,
  // ... other types ...
} from '@agentclientprotocol/sdk';
```

These types are never referenced anywhere else in the flitter-amp codebase. The connection
layer (`connection.ts`) exclusively uses `connection.newSession()` to establish sessions.
There is no `connection.loadSession()` call, no `--resume` CLI flag, and no code path that
would attempt to reload a previously established ACP session by ID.

The types serve as a reminder that the ACP protocol supports session resumption, but the
feature is completely unwired. This creates confusion for contributors who see the imports
and assume session resume is partially implemented or imminent.

### Evidence

1. **`types.ts` lines 14-15** -- `LoadSessionRequest` and `LoadSessionResponse` exported
   but zero consumers across the entire `packages/flitter-amp/src/` tree.
2. **`connection.ts` line 63** -- `connectToAgent()` always calls `connection.newSession()`
   unconditionally; no branching logic checks for a prior session ID.
3. **`config.ts`** -- No `--resume` or `--session` CLI argument is parsed.
4. **`index.ts`** -- The `main()` function creates a fresh session on every launch; cleanup
   handler writes no session metadata to disk.
5. **`app-state.ts`** -- `AppState.sessionId` is set once in `setConnected()` and never
   persisted or restored.

---

## 2. Options Analysis

### Option A: Remove the Dead Imports (Recommended for Now)

Remove `LoadSessionRequest` and `LoadSessionResponse` from the type re-exports in
`types.ts`. They can be re-added when session persistence is actually implemented
(see Gap S08 / `54-session-persistence.md`).

**Pros:**
- Zero risk; pure deletion of unused code
- Eliminates contributor confusion about feature completeness
- Clean `types.ts` that only exports what the codebase actually uses
- Session resume can be re-introduced properly when persistence lands

**Cons:**
- Loses the "breadcrumb" signaling that the protocol supports this capability
- Requires re-adding the types when persistence is built

### Option B: Implement Session Resume (Full Feature)

Wire `LoadSessionRequest`/`LoadSessionResponse` into a complete resume flow: CLI flag
parsing, session metadata persistence, `loadSession()` call with fallback, and UI
rehydration. This is the scope covered by Gap S08 (`54-session-persistence.md`) and is
a multi-file, multi-hundred-line change.

**Pros:**
- Completes the feature the types were anticipating
- Delivers real user value (session continuity across restarts)

**Cons:**
- Large scope; requires persistence layer, CLI changes, state rehydration, error handling
- Depends on agent-side `loadSession` support which may vary across agents
- Better tracked as its own feature gap (S08) rather than a dead-code cleanup

### Recommendation

**Option A** for this gap. The dead imports should be removed now to keep the codebase
honest. Session resume is a feature-level concern tracked in Gap S08 and should be
implemented holistically rather than as a type-export cleanup.

---

## 3. Solution: Remove Dead Imports (Option A)

### 3.1 Change to `acp/types.ts`

Remove lines 14-15 (`LoadSessionRequest`, `LoadSessionResponse`) from the type re-export
block. The remaining exports are all actively used by `connection.ts` and `client.ts`.

**Before** (`packages/flitter-amp/src/acp/types.ts`, lines 1-25):

```typescript
// ACP type re-exports and custom extensions for flitter-amp

// Re-export everything from the ACP SDK for convenience
export type {
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  CancelNotification,
  AuthenticateRequest,
  AuthenticateResponse,
  LoadSessionRequest,       // <-- UNUSED
  LoadSessionResponse,      // <-- UNUSED
  SessionNotification,
  RequestPermissionRequest,
  RequestPermissionResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
  CreateTerminalRequest,
  CreateTerminalResponse,
} from '@agentclientprotocol/sdk';
```

**After:**

```typescript
// ACP type re-exports and custom extensions for flitter-amp

// Re-export everything from the ACP SDK for convenience
export type {
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  CancelNotification,
  AuthenticateRequest,
  AuthenticateResponse,
  SessionNotification,
  RequestPermissionRequest,
  RequestPermissionResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
  CreateTerminalRequest,
  CreateTerminalResponse,
} from '@agentclientprotocol/sdk';
```

### 3.2 Verify No Consumers Exist

Before applying the change, confirm zero references to the removed types:

```bash
# Should return zero matches outside of types.ts itself and analysis/gap docs
grep -rn 'LoadSessionRequest\|LoadSessionResponse' \
  packages/flitter-amp/src/ \
  --include='*.ts' \
  | grep -v 'types.ts'
```

Expected output: empty (no matches). If any file references these types, it must be
updated as part of this change.

### 3.3 Update the Comment

The block comment says "Re-export everything from the ACP SDK for convenience." After
removal, this remains accurate -- we re-export everything we *use*. If desired, a more
precise comment can be substituted:

```typescript
// Re-export ACP SDK types used by flitter-amp's connection and client layers.
// LoadSessionRequest/Response intentionally omitted until session persistence
// is implemented (see Gap S08 / 54-session-persistence.md).
```

This makes the omission explicit and leaves a trail for future implementers.

---

## 4. Future: Wiring LoadSession (Option B Reference)

When Gap S08 (session persistence) is implemented, the `LoadSessionRequest` and
`LoadSessionResponse` types should be re-added to `types.ts` and wired as follows.
This section provides a forward reference -- it is **not** part of the current fix.

### 4.1 CLI Flag Addition (`config.ts`)

```typescript
// In AppConfig interface
export interface AppConfig {
  // ... existing fields ...
  /** Session ID to resume (from --resume flag) */
  resumeSessionId: string | null;
}

// In parseArgs()
case '--resume': {
  const id = args[++i];
  if (!id) {
    process.stderr.write('Error: --resume requires a session ID\n');
    process.exit(1);
  }
  resumeSessionId = id;
  break;
}
```

### 4.2 Connection Layer (`connection.ts`)

Add a `resumeSession()` function alongside `connectToAgent()`:

```typescript
/**
 * Connect to an ACP agent and attempt to resume an existing session.
 * Falls back to newSession() if the agent does not support loadSession
 * or if the session ID is invalid/expired.
 */
export async function connectToAgentWithResume(
  agentCommand: string,
  agentArgs: string[],
  cwd: string,
  callbacks: ClientCallbacks,
  resumeSessionId: string,
): Promise<ConnectionHandle> {
  // Steps 1-4 identical to connectToAgent (spawn, stream, client, initialize)
  const agent = spawnAgent(agentCommand, agentArgs, cwd);
  const stream = acp.ndJsonStream(agent.stdin, agent.stdout);
  const client = new FlitterClient(callbacks);
  const connection = new acp.ClientSideConnection(
    (_agentProxy: acp.Agent) => client as unknown as acp.Client,
    stream,
  );

  const initResponse = await connection.initialize({
    protocolVersion: acp.PROTOCOL_VERSION,
    clientInfo: { name: 'flitter-amp', version: '0.1.0' },
    clientCapabilities: {
      fs: { readTextFile: true, writeTextFile: true },
      terminal: true,
    },
  });

  // Step 5: Attempt loadSession, fall back to newSession
  let sessionId: string;
  let resumed = false;

  try {
    log.info(`Attempting to resume session: ${resumeSessionId}`);
    const loadResponse = await connection.loadSession({
      sessionId: resumeSessionId,
    });
    sessionId = loadResponse.sessionId;
    resumed = true;
    log.info(`Session resumed: ${sessionId}`);
  } catch (err) {
    log.warn(`loadSession failed, falling back to newSession: ${err}`);
    const sessionResponse = await connection.newSession({
      cwd,
      mcpServers: [],
    });
    sessionId = sessionResponse.sessionId;
    log.info(`New session created (fallback): ${sessionId}`);
  }

  return {
    connection,
    client,
    agent,
    capabilities: initResponse.agentCapabilities,
    agentInfo: initResponse.agentInfo as
      { name?: string; title?: string } | undefined,
    sessionId,
  };
}
```

### 4.3 Entry Point (`index.ts`)

```typescript
// In main(), after config parsing:
let handle: ConnectionHandle;
if (config.resumeSessionId) {
  handle = await connectToAgentWithResume(
    config.agentCommand,
    config.agentArgs,
    config.cwd,
    appState,
    config.resumeSessionId,
  );
} else {
  handle = await connectToAgent(
    config.agentCommand,
    config.agentArgs,
    config.cwd,
    appState,
  );
}
```

### 4.4 Session Metadata Persistence

On each `onPromptComplete`, serialize minimal session metadata:

```typescript
// In AppState or a dedicated SessionStore
async function saveSessionMetadata(sessionId: string, cwd: string): Promise<void> {
  const sessionsDir = join(homedir(), '.flitter-amp', 'sessions');
  await mkdir(sessionsDir, { recursive: true });
  const metadata = {
    sessionId,
    cwd,
    lastActive: Date.now(),
    agentName: this.agentName,
  };
  await writeFile(
    join(sessionsDir, `${sessionId}.json`),
    JSON.stringify(metadata, null, 2),
  );
}
```

### 4.5 ConnectionHandle Extension

```typescript
export interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  agentInfo?: { name?: string; title?: string };
  sessionId: string;
  resumed: boolean;  // <-- new: indicates whether session was loaded vs. created
}
```

The `resumed` flag allows `index.ts` and `AppState` to differentiate between a fresh
session and a restored one, enabling appropriate UI messaging (e.g., "Resumed session
from 5 minutes ago" vs. the normal welcome screen).

---

## 5. Relationship to Other Gaps

| Gap | Relationship |
|-----|-------------|
| **S08 / 54-session-persistence.md** | Parent feature. LoadSession wiring is one component of the full persistence story. This gap (P05) addresses only the dead import; S08 addresses the complete feature. |
| **57-reconnection-logic.md** | Reconnection after agent crash could use `loadSession` to restore server-side state. Depends on this wiring existing. |
| **60-graceful-session-close.md** | A graceful close should persist the session ID so a future `--resume` can reference it. |
| **47-remove-session-state.md** | Notes that `SessionState` in `acp/session.ts` duplicates `ConversationState`. If `SessionState` is removed, `loadSession` hydration must target `ConversationState` directly. |

---

## 6. Testing

### For Option A (removal)

1. **TypeScript compilation**: Run `bun run typecheck` after removing the two type exports.
   No file imports `LoadSessionRequest` or `LoadSessionResponse`, so compilation must
   succeed without changes to any other file.

2. **Existing tests**: Run `bun test` in `packages/flitter-amp/`. All existing tests
   must pass unchanged since no runtime code is affected.

3. **Grep audit**: Confirm no orphan references:
   ```bash
   grep -rn 'LoadSession' packages/flitter-amp/src/ --include='*.ts'
   ```
   Expected: zero matches after the edit.

### For Option B (future implementation -- test plan sketch)

```typescript
// __tests__/connection-resume.test.ts

describe('connectToAgentWithResume', () => {
  it('calls loadSession with the provided sessionId', async () => {
    // Mock agent that supports loadSession
    // Verify loadSession is called before newSession
    // Verify returned handle has resumed=true
  });

  it('falls back to newSession when loadSession throws', async () => {
    // Mock agent that rejects loadSession with MethodNotFound (-32601)
    // Verify newSession is called as fallback
    // Verify returned handle has resumed=false
  });

  it('falls back to newSession when session ID is expired', async () => {
    // Mock agent that rejects with "session not found"
    // Verify graceful degradation
  });

  it('always calls initialize before loadSession', async () => {
    // Verify ordering: initialize() -> loadSession()
    // initialize must complete before any session operation
  });
});

describe('CLI --resume flag', () => {
  it('parses --resume <id> into config.resumeSessionId', () => {
    const config = parseArgs(['node', 'script', '--resume', 'sess_abc123']);
    expect(config.resumeSessionId).toBe('sess_abc123');
  });

  it('exits with error when --resume has no argument', () => {
    // Verify process.exit(1) is called
  });

  it('defaults resumeSessionId to null when not provided', () => {
    const config = parseArgs(['node', 'script']);
    expect(config.resumeSessionId).toBeNull();
  });
});
```

---

## 7. Summary

| Aspect | Detail |
|--------|--------|
| **Root cause** | Types imported speculatively during initial SDK integration; feature never built |
| **Immediate fix** | Remove `LoadSessionRequest` and `LoadSessionResponse` from `types.ts` |
| **Lines changed** | 2 lines deleted in `types.ts`, optional 2-line comment update |
| **Risk** | None -- pure dead code removal with no runtime or compile-time impact |
| **Future path** | Re-add types and wire `loadSession()` as part of Gap S08 (session persistence) |
| **Blocked by** | Nothing (Option A). Option B blocked by session persistence design decisions |
