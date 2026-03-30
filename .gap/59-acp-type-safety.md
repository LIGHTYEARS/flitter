# Gap P03 (Gap #59): Type Safety Gaps in ACP Integration

## Problem Statement

The ACP integration layer in `flitter-amp` contains multiple `as any`, `as unknown`,
and unsafe `as <literal-type>` casts that suppress the TypeScript type checker. These
casts hide real structural mismatches between the local `FlitterClient` implementation
and the SDK's `Client` interface, mask missing fields in return types, paper over
Bun-specific API differences, and force manual type narrowing in downstream session
update handlers. Each cast is a latent bug surface: a future SDK upgrade could change
the expected shapes and the compiler would stay silent.

This document inventories every cast across the ACP-related files (`connection.ts`,
`client.ts`, `process.ts`) and the primary downstream consumer (`app-state.ts`),
diagnoses the root cause of each, proposes a type-safe replacement, and outlines a
comprehensive testing strategy.

**Affected files:**
- `packages/flitter-amp/src/acp/connection.ts` -- 3 casts
- `packages/flitter-amp/src/utils/process.ts` -- 1 cast
- `packages/flitter-amp/src/state/app-state.ts` -- 15+ inline casts (downstream consequence)
- `packages/flitter-amp/src/acp/client.ts` -- root cause (local types diverge from SDK)

---

## Inventory of Unsafe Casts

### Cast 1 -- `client as unknown as acp.Client` (connection.ts:44)

```typescript
// connection.ts:44
const connection = new acp.ClientSideConnection(
  (_agentProxy: acp.Agent) => client as unknown as acp.Client,
  stream,
);
```

**Root cause.** `FlitterClient` does not implement the SDK's `acp.Client` interface.
The SDK `Client` interface (from `@agentclientprotocol/sdk@0.16.0`) requires methods
with SDK-typed parameters and return types, while `FlitterClient` uses locally defined
`PermissionRequest` and `SessionUpdate` types. The double cast (`as unknown as acp.Client`)
is needed because the types are structurally incompatible -- TypeScript correctly refuses
a direct `as acp.Client`.

**Structural mismatches between `FlitterClient` and `acp.Client`:**

| SDK `Client` method | SDK parameter type | `FlitterClient` parameter type | Structural difference |
|---|---|---|---|
| `requestPermission` | `schema.RequestPermissionRequest` | Local `PermissionRequest` | SDK uses `toolCall: ToolCallUpdate` (full shape with `toolCallId`, `kind?`, `status?`, `title?`, `locations?`, `rawInput?`, `content?`, `rawOutput?`); local type has a restricted `toolCall` with required `toolCallId`, `title`, `kind`, `status` plus an extraneous `prompt: string` field not in the SDK. SDK uses `options: PermissionOption[]` where `kind: PermissionOptionKind` is a literal union `"allow_once" | "allow_always" | "reject_once" | "reject_always"`; local uses `kind: string`. |
| `requestPermission` return | `schema.RequestPermissionResponse` | `{ outcome: { outcome: string; optionId?: string } }` | SDK expects `{ outcome: RequestPermissionOutcome }` which is `{ outcome: 'cancelled' } \| (SelectedPermissionOutcome & { outcome: 'selected' })`. Local uses plain `string` for the `outcome` discriminant field. |
| `sessionUpdate` | `schema.SessionNotification` | `{ sessionId: string; update: SessionUpdate }` | SDK `SessionNotification` has `update: schema.SessionUpdate` which is a discriminated union of 11 variants keyed on `sessionUpdate`. Local `SessionUpdate` is the opaque `{ sessionUpdate: string; [key: string]: unknown }`. |
| `readTextFile` | `schema.ReadTextFileRequest` | `{ path: string; sessionId: string }` | SDK type includes optional `limit?: number \| null`, `line?: number \| null`, and `_meta?`. |
| `readTextFile` return | `schema.ReadTextFileResponse` | `{ content: string }` | SDK adds `_meta?: { [key: string]: unknown } \| null`. Structurally compatible (extra optional fields are OK), but not identical. |
| `writeTextFile` return | `schema.WriteTextFileResponse` (`{ _meta?: ... }`) | `Promise<void>` | **Breaking:** SDK expects an object return; `FlitterClient` returns void. The JSON-RPC layer may fail or send `null` back to the agent. |
| `createTerminal` return | `schema.CreateTerminalResponse` | `{ terminalId: string }` | Structurally compatible. Missing optional `_meta` is fine. |
| `terminalOutput` return | `schema.TerminalOutputResponse` | `{ terminal: { terminalId, output, exitStatus? } }` | **Breaking:** SDK expects flat `{ output: string; truncated: boolean; exitStatus?: TerminalExitStatus \| null }`. Local wraps in a `{ terminal: ... }` envelope and omits the required `truncated` field. |

**Severity: HIGH.** The double cast silences two genuinely breaking mismatches
(`writeTextFile` returning void, `terminalOutput` returning wrong shape) that could
cause runtime failures with any ACP agent that reads these return values.

---

### Cast 2 -- `(response as any).stopReason` (connection.ts:93)

```typescript
// connection.ts:93
return { stopReason: (response as any).stopReason ?? 'end_turn' };
```

**Root cause.** The developer was uncertain whether `PromptResponse` contains a
`stopReason` field. In fact `schema.PromptResponse` from SDK v0.16.0 is:

```typescript
type PromptResponse = {
  _meta?: { [key: string]: unknown } | null;
  stopReason: StopReason;       // REQUIRED
  usage?: Usage | null;
  userMessageId?: string | null;
};
```

`stopReason` is a **required** field of type `StopReason` (the literal union
`"end_turn" | "max_tokens" | "max_turn_requests" | "refusal" | "cancelled"`).
The `as any` is entirely unnecessary; `response.stopReason` compiles cleanly.
The `?? 'end_turn'` fallback is also dead code since the field cannot be undefined.

**Severity: LOW.** No runtime bug, but the `as any` suppresses useful type information
and the dead fallback is misleading.

---

### Cast 3 -- `initResponse.agentInfo as { name?; title? }` (connection.ts:74)

```typescript
// connection.ts:74
agentInfo: initResponse.agentInfo as { name?: string; title?: string } | undefined,
```

**Root cause.** `initResponse.agentInfo` is typed as `Implementation | null | undefined`
where the SDK's `Implementation` type is:

```typescript
type Implementation = {
  _meta?: { [key: string]: unknown } | null;
  name: string;       // REQUIRED
  title?: string | null;
  version: string;    // REQUIRED
};
```

The local `ConnectionHandle.agentInfo` is typed as `{ name?: string; title?: string }`.
The cast:
1. Makes `name` **optional** (it is required in `Implementation`) -- a type widening
   that discards a guarantee.
2. Drops the `version` field entirely.
3. Changes `null | undefined` into just `undefined`.

**Severity: MEDIUM.** Downstream code accessing `agentInfo?.name` will not be warned
that `name` is always present (when `agentInfo` itself is non-null), leading to
unnecessary optional chaining. The `version` field, potentially useful for display,
is invisible to consumers.

---

### Cast 4 -- `proc.stdin as any` (process.ts:120)

```typescript
// process.ts:120
const stdinStream = fileSinkToWritableStream(proc.stdin as any);
```

**Root cause.** `Bun.spawn` returns a `Subprocess` whose `stdin` type is
`FileSink | undefined` (when `stdin: 'pipe'`). The helper function
`fileSinkToWritableStream` declares its parameter as an intersection type:

```typescript
function fileSinkToWritableStream(
  sink: ReturnType<typeof Bun.spawn>['stdin'] & { write: Function; flush: Function; end: Function }
): WritableStream<Uint8Array>
```

The intersection with `ReturnType<typeof Bun.spawn>['stdin']` introduces Bun's
overloaded return type complexity. TypeScript cannot narrow the union of all possible
`stdin` types (which includes `undefined`, `number`, `ReadableStream`, and `FileSink`
depending on the `stdio` configuration) to match this intersection. The `as any` is
used to bypass this entirely.

**Severity: MEDIUM.** A change to Bun's `FileSink` API (removing `.flush()`, changing
`.write()` signature) would cause a silent runtime error.

---

### Casts 5-19 -- Inline type assertions in `app-state.ts` (downstream)

These casts are a **direct consequence** of Cast 1. Because `SessionUpdate` is typed
as the opaque `{ sessionUpdate: string; [key: string]: unknown }`, every field access
in the `onSessionUpdate` handler requires a manual type assertion:

```typescript
// app-state.ts:71 -- discriminant tag
const type = update.sessionUpdate as string;

// app-state.ts:75, 86 -- content blocks
const content = update.content as { type: string; text?: string };

// app-state.ts:95-100 -- tool_call fields
update.toolCallId as string,
update.title as string,
update.kind as string,
update.status as 'pending' | 'in_progress' | 'completed' | 'failed',
update.locations as Array<{ path: string }> | undefined,
update.rawInput as Record<string, unknown> | undefined,

// app-state.ts:107-110 -- tool_call_update fields
update.toolCallId as string,
update.status as 'completed' | 'failed',
update.content as Array<{ type: string; content?: { type: string; text: string } }> | undefined,
update.rawOutput as Record<string, unknown> | undefined,

// app-state.ts:116-120 -- plan entries
const entries = update.entries as Array<{
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}>;

// app-state.ts:126 -- usage update
const usage = update as { size?: number; used?: number; cost?: ... };

// app-state.ts:136 -- mode update
this.currentMode = update.currentModeId as string;
```

**Root cause.** The local `SessionUpdate` type (`{ sessionUpdate: string; [key: string]: unknown }`)
provides zero type information about the variant-specific fields. Every property access
on `update` resolves to `unknown` and must be cast. If `SessionUpdate` were the SDK's
discriminated union type, TypeScript could narrow each `case` branch automatically:

```typescript
// With SDK types, no casts needed:
case 'agent_message_chunk': {
  // TypeScript knows: update is ContentChunk & { sessionUpdate: 'agent_message_chunk' }
  // update.content is ContentBlock -- has .type, and when type === 'text', has .text
  if (update.content.type === 'text') {
    this.conversation.appendAssistantChunk(update.content.text);
  }
  break;
}
```

**Severity: HIGH.** These 15+ casts are all manually reconstructing type information
that the SDK already provides. They are error-prone (the `content` cast omits fields
like `annotations`, `data`, `mimeType`), unsound (casting `unknown` to a specific type
without runtime validation), and fragile (if the SDK adds a field, these manual
reconstructions silently miss it).

---

## Proposed Type-Safe Replacements

### Fix 1: Make `FlitterClient` implement `acp.Client` directly

The cleanest fix eliminates Cast 1 and all 15+ downstream casts in `app-state.ts`
simultaneously by making `FlitterClient` structurally satisfy `acp.Client`.

**Step A -- Delete local `PermissionRequest` and `SessionUpdate` interfaces from `client.ts`.**

Replace them with imports from the SDK:

```typescript
import type * as acp from '@agentclientprotocol/sdk';
```

**Step B -- Update `ClientCallbacks` to use SDK types:**

```typescript
export interface ClientCallbacks {
  onSessionUpdate(sessionId: string, update: acp.SessionUpdate): void;
  onPermissionRequest(request: acp.RequestPermissionRequest): Promise<string | null>;
  onPromptComplete(sessionId: string, stopReason: acp.StopReason): void;
  onConnectionClosed(reason: string): void;
}
```

Note: `acp.SessionUpdate` here refers to the SDK's `schema.SessionUpdate` which is
re-exported as a top-level type by the SDK. This is the 11-variant discriminated union.

**Step C -- Rewrite `FlitterClient` method signatures to match `acp.Client`:**

```typescript
import * as fs from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import type * as acp from '@agentclientprotocol/sdk';
import { log } from '../utils/logger';

export class FlitterClient implements acp.Client {
  private callbacks: ClientCallbacks;
  private terminals: Map<string, ChildProcess> = new Map();
  private terminalBuffers: Map<string, TerminalBuffer> = new Map();

  constructor(callbacks: ClientCallbacks) {
    this.callbacks = callbacks;
  }

  // --- Required methods ---

  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    this.callbacks.onSessionUpdate(params.sessionId, params.update);
  }

  async requestPermission(
    params: acp.RequestPermissionRequest,
  ): Promise<acp.RequestPermissionResponse> {
    const selectedId = await this.callbacks.onPermissionRequest(params);
    if (selectedId === null) {
      return { outcome: { outcome: 'cancelled' } };
    }
    return { outcome: { outcome: 'selected', optionId: selectedId } };
  }

  // --- Optional capability methods ---

  async readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
    log.debug(`Agent reading file: ${params.path}`);
    const content = await fs.readFile(params.path, 'utf-8');
    return { content };
  }

  async writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
    log.debug(`Agent writing file: ${params.path}`);
    await fs.writeFile(params.path, params.content, 'utf-8');
    return {};  // SDK expects WriteTextFileResponse = { _meta?: ... }, not void
  }

  async createTerminal(
    params: acp.CreateTerminalRequest,
  ): Promise<acp.CreateTerminalResponse> {
    const terminalId = crypto.randomUUID();
    log.debug(`Agent creating terminal ${terminalId}: ${params.command} ${(params.args || []).join(' ')}`);

    const env = { ...process.env };
    if (params.env) {
      for (const { name, value } of params.env) {
        env[name] = value;
      }
    }

    const proc = spawn(params.command, params.args || [], {
      cwd: params.cwd || undefined,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.terminals.set(terminalId, proc);

    const buffer: TerminalBuffer = {
      output: '',
      byteCount: 0,
      limit: params.outputByteLimit ?? null,
    };
    this.terminalBuffers.set(terminalId, buffer);

    const appendOutput = (chunk: Buffer) => {
      if (buffer.limit !== null && buffer.byteCount >= buffer.limit) return;
      const text = chunk.toString();
      const bytes = chunk.byteLength;
      if (buffer.limit !== null && buffer.byteCount + bytes > buffer.limit) {
        const remaining = buffer.limit - buffer.byteCount;
        buffer.output += text.slice(0, remaining);
        buffer.byteCount = buffer.limit;
      } else {
        buffer.output += text;
        buffer.byteCount += bytes;
      }
    };

    proc.stdout?.on('data', appendOutput);
    proc.stderr?.on('data', appendOutput);

    return { terminalId };
  }

  async terminalOutput(
    params: acp.TerminalOutputRequest,
  ): Promise<acp.TerminalOutputResponse> {
    const proc = this.terminals.get(params.terminalId);
    const buffer = this.terminalBuffers.get(params.terminalId);

    if (!proc || !buffer) {
      return { output: '', truncated: false, exitStatus: { exitCode: -1 } };
    }

    const truncated = buffer.limit !== null && buffer.byteCount >= buffer.limit;
    return {
      output: buffer.output,
      truncated,
      exitStatus: proc.exitCode !== null ? { exitCode: proc.exitCode } : null,
    };
  }

  async waitForTerminalExit(
    params: acp.WaitForTerminalExitRequest,
  ): Promise<acp.WaitForTerminalExitResponse> {
    const proc = this.terminals.get(params.terminalId);
    if (!proc) {
      return { exitCode: -1, signal: null };
    }
    if (proc.exitCode !== null) {
      return { exitCode: proc.exitCode, signal: proc.signalCode ?? null };
    }
    return new Promise(resolve => {
      proc.on('exit', (code, signal) => {
        resolve({ exitCode: code ?? null, signal: signal ?? null });
      });
    });
  }

  async killTerminal(
    params: acp.KillTerminalRequest,
  ): Promise<acp.KillTerminalResponse | void> {
    const proc = this.terminals.get(params.terminalId);
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }

  async releaseTerminal(
    params: acp.ReleaseTerminalRequest,
  ): Promise<acp.ReleaseTerminalResponse | void> {
    const proc = this.terminals.get(params.terminalId);
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
    this.terminals.delete(params.terminalId);
    this.terminalBuffers.delete(params.terminalId);
  }

  cleanup(): void {
    for (const [_id, proc] of this.terminals) {
      if (!proc.killed) proc.kill('SIGTERM');
    }
    this.terminals.clear();
    this.terminalBuffers.clear();
  }
}
```

**Key behavioral changes in this rewrite:**

1. `writeTextFile` now returns `{}` instead of `void`, satisfying `WriteTextFileResponse`.
2. `terminalOutput` now returns a flat `{ output, truncated, exitStatus? }` instead of
   `{ terminal: { ... } }`, matching `TerminalOutputResponse`.
3. `requestPermission` parameter type uses `acp.RequestPermissionRequest` (which does
   not have a `prompt` field -- that was a local invention).
4. `requestPermission` return type uses the discriminated union
   `acp.RequestPermissionResponse` instead of a loose object with string fields.

**Step D -- Simplify the connection factory (eliminates Cast 1):**

```typescript
const connection = new acp.ClientSideConnection(
  (_agentProxy: acp.Agent) => client,  // FlitterClient now IS acp.Client
  stream,
);
```

---

### Fix 2: Remove `as any` from `sendPrompt` (eliminates Cast 2)

`PromptResponse.stopReason` is a required field of type `StopReason`. Access it directly
and tighten the return type:

```typescript
import type { StopReason } from '@agentclientprotocol/sdk';

export async function sendPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
  text: string,
): Promise<{ stopReason: StopReason }> {
  log.info(`Sending prompt to session ${sessionId}`);
  const response = await connection.prompt({
    sessionId,
    prompt: [{ type: 'text', text }],
  });
  return { stopReason: response.stopReason };
}
```

Changes:
- Return type tightened from `{ stopReason: string }` to `{ stopReason: StopReason }`.
- Removed `as any` -- `response.stopReason` is directly accessible.
- Removed dead `?? 'end_turn'` fallback.

---

### Fix 3: Use `Implementation` for `agentInfo` (eliminates Cast 3)

Update `ConnectionHandle` to use the SDK type directly:

```typescript
import type { Implementation } from '@agentclientprotocol/sdk';

export interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  agentInfo: Implementation | null | undefined;
  sessionId: string;
}
```

Then the assignment becomes:

```typescript
agentInfo: initResponse.agentInfo,  // no cast needed
```

Downstream effects:
- `agentInfo.name` is now `string` (required), not `string | undefined`. Consumers
  can remove unnecessary null checks on `name`.
- `agentInfo.version` is now accessible, enabling version display in the TUI.
- `agentInfo.title` remains `string | null | undefined`, matching existing usage.

---

### Fix 4: Type the Bun `FileSink` adapter properly (eliminates Cast 4)

Define a minimal interface for what `FileSink` provides:

```typescript
/**
 * Minimal interface for Bun's FileSink, which is the stdin type
 * returned by Bun.spawn when stdin is 'pipe'.
 * This is an explicit contract so that if Bun changes the API,
 * the breakage is localized to this interface declaration.
 */
interface BunFileSink {
  write(data: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer): number;
  flush(): void;
  end(error?: Error): void;
}

function fileSinkToWritableStream(sink: BunFileSink): WritableStream<Uint8Array> {
  return new WritableStream<Uint8Array>({
    write(chunk) {
      sink.write(chunk);
      sink.flush();
    },
    close() {
      sink.end();
    },
    abort() {
      sink.end();
    },
  });
}
```

At the call site:

```typescript
const stdinStream = fileSinkToWritableStream(proc.stdin as BunFileSink);
```

This is still a cast, but it is a **specific, documented, narrow** cast to a known
interface rather than an opaque `as any`. The `BunFileSink` interface serves as an
explicit contract: if Bun changes the `FileSink` API, the incompatibility surfaces
at this interface rather than silently passing as `any`.

**Alternative (preferred if `bun-types >= 1.3`):**

```typescript
import type { FileSink } from 'bun';

function fileSinkToWritableStream(sink: FileSink): WritableStream<Uint8Array> {
  // ... same implementation ...
}

// At call site -- narrow Bun.spawn's union type:
if (!proc.stdin) throw new Error('Expected piped stdin');
const stdinStream = fileSinkToWritableStream(proc.stdin);
```

The package already depends on `"bun-types": "^1.3.11"`, so using `FileSink`
directly from `bun` types should be possible.

---

### Fix 5: Refactor `app-state.ts` to use discriminated union narrowing (eliminates Casts 5-19)

Once `ClientCallbacks.onSessionUpdate` receives `acp.SessionUpdate` (the SDK's
discriminated union), the `switch` statement can leverage TypeScript narrowing:

```typescript
import type * as acp from '@agentclientprotocol/sdk';

onSessionUpdate(_sessionId: string, update: acp.SessionUpdate): void {
  switch (update.sessionUpdate) {
    case 'agent_message_chunk': {
      // TypeScript narrows: update is ContentChunk & { sessionUpdate: 'agent_message_chunk' }
      // update.content is ContentBlock (discriminated on .type)
      if (update.content.type === 'text') {
        this.conversation.appendAssistantChunk(update.content.text);
      } else {
        log.debug(`Unsupported content type in agent_message_chunk: ${update.content.type}`);
        this.conversation.appendAssistantChunk(`[unsupported content type: ${update.content.type}]`);
      }
      break;
    }

    case 'agent_thought_chunk': {
      // update.content is ContentBlock
      if (update.content.type === 'text') {
        this.conversation.appendThinkingChunk(update.content.text);
      }
      break;
    }

    case 'tool_call': {
      // update is ToolCall & { sessionUpdate: 'tool_call' }
      // All fields are directly typed: toolCallId: string, title: string,
      // kind?: ToolKind, status?: ToolCallStatus, locations?: ToolCallLocation[], rawInput?: unknown
      this.conversation.addToolCall(
        update.toolCallId,              // string -- no cast
        update.title,                   // string -- no cast
        update.kind ?? 'other',         // ToolKind | undefined -> string
        update.status ?? 'pending',     // ToolCallStatus | undefined
        update.locations?.map(l => ({ path: l.path })),
        update.rawInput as Record<string, unknown> | undefined,  // rawInput is `unknown`, this cast remains
      );
      break;
    }

    case 'tool_call_update': {
      // update is ToolCallUpdate & { sessionUpdate: 'tool_call_update' }
      this.conversation.updateToolCall(
        update.toolCallId,              // string -- no cast
        (update.status ?? 'completed') as 'completed' | 'failed',  // narrowing within ToolCallStatus
        update.content,                 // ToolCallContent[] | null | undefined
        update.rawOutput as Record<string, unknown> | undefined,
      );
      break;
    }

    case 'plan': {
      // update is Plan & { sessionUpdate: 'plan' }
      // update.entries is PlanEntry[] with typed priority and status
      this.conversation.setPlan(update.entries);  // no cast -- PlanEntry matches
      break;
    }

    case 'usage_update': {
      // update is UsageUpdate & { sessionUpdate: 'usage_update' }
      this.conversation.setUsage({
        size: update.size,    // number -- no cast, no ?? needed
        used: update.used,    // number -- no cast, no ?? needed
        cost: update.cost,    // Cost | null | undefined
      });
      break;
    }

    case 'current_mode_update': {
      // update is CurrentModeUpdate & { sessionUpdate: 'current_mode_update' }
      this.currentMode = update.currentModeId;  // SessionModeId (string) -- no cast
      break;
    }

    case 'session_info_update':
    case 'available_commands_update':
    case 'config_option_update':
    case 'user_message_chunk':
      // Handled by other layers or intentionally ignored
      break;

    default: {
      // Exhaustiveness check: if the SDK adds a new variant, TypeScript
      // will flag this as an error
      const _exhaustive: never = update;
      log.debug(`Unknown session update type: ${(_exhaustive as acp.SessionUpdate).sessionUpdate}`);
      break;
    }
  }

  this.notifyListeners();
}
```

**Casts eliminated:** 15+ inline type assertions replaced by automatic discriminated
union narrowing. Only 2 legitimate casts remain:
1. `update.rawInput as Record<string, unknown>` -- because the SDK types `rawInput` as
   `unknown`, a cast to `Record<string, unknown>` is needed if the downstream API expects
   that shape. This could be further improved by having `addToolCall` accept `unknown`.
2. `update.status as 'completed' | 'failed'` -- because `ToolCallStatus` includes
   `'pending' | 'in_progress' | 'completed' | 'failed'` but the `updateToolCall` method
   only accepts the terminal states. This could be addressed by widening `updateToolCall`
   or adding a runtime guard.

---

## Summary of Eliminated Casts

| Location | Original cast | Replacement | How |
|---|---|---|---|
| `connection.ts:44` | `client as unknown as acp.Client` | Direct assignment | `FlitterClient implements acp.Client` |
| `connection.ts:74` | `initResponse.agentInfo as { name?; title? }` | No cast | `ConnectionHandle.agentInfo` typed as `Implementation \| null \| undefined` |
| `connection.ts:93` | `(response as any).stopReason` | `response.stopReason` | `stopReason` is a required field on `PromptResponse` |
| `process.ts:120` | `proc.stdin as any` | `proc.stdin as BunFileSink` or import `FileSink` | Narrow typed interface replaces opaque `any` |
| `app-state.ts:71` | `update.sessionUpdate as string` | Direct access | Discriminated union tag is typed |
| `app-state.ts:75,86` | `update.content as { type; text? }` | Narrowed by `case` branch | `ContentChunk.content` is `ContentBlock` |
| `app-state.ts:95-100` | 6x field casts on `tool_call` | Narrowed by `case 'tool_call'` | `ToolCall` fields are directly typed |
| `app-state.ts:107-110` | 4x field casts on `tool_call_update` | Narrowed by `case 'tool_call_update'` | `ToolCallUpdate` fields are directly typed |
| `app-state.ts:116-120` | `update.entries as Array<...>` | Direct access | `Plan.entries` is `PlanEntry[]` |
| `app-state.ts:126` | `update as { size?; used?; cost? }` | Direct access | `UsageUpdate` has `size`, `used`, `cost` as typed fields |
| `app-state.ts:136` | `update.currentModeId as string` | Direct access | `CurrentModeUpdate.currentModeId` is `SessionModeId` (string) |

**Total: 4 explicit `as any`/`as unknown` casts + 1 narrowing cast + 15+ inline casts eliminated.**

---

## Downstream Type Propagation

Making `FlitterClient` implement `acp.Client` changes the parameter types that flow
into `ClientCallbacks`. Consumers of these callbacks will need to update:

### 1. `onSessionUpdate` handler (`app-state.ts`)

Receives `acp.SessionUpdate` (a discriminated union with `sessionUpdate` as the
discriminant tag) instead of the loose `{ sessionUpdate: string; [key: string]: unknown }`.
The handler already dispatches on `update.sessionUpdate`, so the structural pattern
is compatible. TypeScript will now:
- Narrow field types within each `case` branch automatically.
- Enforce exhaustiveness checking (new SDK variants produce compile errors).
- Flag invalid field accesses at compile time.

### 2. `onPermissionRequest` handler

Receives `acp.RequestPermissionRequest` which has `toolCall: ToolCallUpdate` and
`options: PermissionOption[]`. Key changes:
- `PermissionOption.kind` becomes `PermissionOptionKind` (literal union) instead of `string`.
- The `prompt: string` field that was on the local `PermissionRequest` type is gone -- it
  never existed in the SDK. If the permission dialog UI was reading `request.prompt`,
  that code needs to be removed or replaced with `request.toolCall.title`.
- `toolCall.kind` becomes `ToolKind | null | undefined` instead of `string`.

### 3. `onPromptComplete` handler

If tightened to receive `acp.StopReason` instead of `string`, exhaustive checking
becomes possible. The handler currently only logs the stop reason, so no functional
change is needed.

### 4. `ConnectionHandle.agentInfo` consumers

- `name` becomes required (`string`, not `string | undefined`), which is strictly safer.
- `version` field becomes available -- UI can display "AgentName v1.2.3".
- `title` remains `string | null | undefined`, matching existing usage.

### 5. `conversation.ts` / `session.ts` alignment

The `PlanEntry` type defined locally in `types.ts` should be verified against
`acp.PlanEntry` from the SDK. The SDK's `PlanEntry` is:

```typescript
type PlanEntry = {
  _meta?: { [key: string]: unknown } | null;
  content: string;
  priority: PlanEntryPriority;  // "high" | "medium" | "low"
  status: PlanEntryStatus;      // "pending" | "in_progress" | "completed"
};
```

The local `PlanEntry` in `types.ts` has the same shape. It can either be replaced with
a re-export or kept as a subset alias:

```typescript
export type { PlanEntry } from '@agentclientprotocol/sdk';
```

---

## Files Changed

| File | Change description |
|---|---|
| `packages/flitter-amp/src/acp/client.ts` | Delete local `SessionUpdate`, `PermissionRequest` types. Import SDK types. Add `implements acp.Client`. Fix `writeTextFile` return type (void -> `{}`). Fix `terminalOutput` shape (flat, add `truncated`). Update all method signatures. |
| `packages/flitter-amp/src/acp/connection.ts` | Remove all three casts. Update `ConnectionHandle.agentInfo` type to `Implementation \| null \| undefined`. Tighten `sendPrompt` return type to `{ stopReason: StopReason }`. Remove dead `?? 'end_turn'` fallback. |
| `packages/flitter-amp/src/acp/types.ts` | Add re-exports of `Implementation`, `StopReason`, `SessionUpdate`, `PlanEntry` from SDK. Consider replacing local `PlanEntry` with SDK re-export. |
| `packages/flitter-amp/src/utils/process.ts` | Replace `as any` with `as BunFileSink` (or import `FileSink` from bun). Add `BunFileSink` interface. Clean up `fileSinkToWritableStream` parameter type. |
| `packages/flitter-amp/src/state/app-state.ts` | Rewrite `onSessionUpdate` to use discriminated union narrowing. Remove all 15+ inline casts. Add exhaustiveness check in default case. |

---

## Testing Strategy

### 1. Static Type Verification (zero-cost, highest value)

```bash
cd packages/flitter-amp && bun run typecheck
```

After applying the changes, `tsc --noEmit` must pass with zero errors. This is the
primary gate. The entire point of this gap is to move type enforcement from runtime
to compile time. If `tsc` passes, the structural contracts are satisfied.

**Specific things the type checker will now catch:**

- Any future SDK upgrade that adds required fields to `Client` methods will produce
  a compile error on `FlitterClient`.
- Any misspelling of `sessionUpdate` discriminant tags in switch statements will fail
  exhaustiveness checks.
- Accessing a non-existent field on `PromptResponse` will fail immediately instead of
  silently returning `undefined` through `as any`.
- Any structural change to `TerminalOutputResponse` (e.g., renaming `truncated`) will
  surface as a compile error in `terminalOutput()`.

### 2. Unit Tests for `FlitterClient` Method Contracts

Create `packages/flitter-amp/src/__tests__/client-contract.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { FlitterClient } from '../acp/client';
import type * as acp from '@agentclientprotocol/sdk';

describe('FlitterClient implements acp.Client', () => {
  // Compile-time assertion: this line will not compile if
  // FlitterClient stops satisfying acp.Client.
  const _typeCheck: acp.Client = new FlitterClient({
    onSessionUpdate: () => {},
    onPermissionRequest: async () => null,
    onPromptComplete: () => {},
    onConnectionClosed: () => {},
  });

  test('requestPermission returns cancelled outcome when callback returns null', async () => {
    const client = new FlitterClient({
      onSessionUpdate: () => {},
      onPermissionRequest: async () => null,
      onPromptComplete: () => {},
      onConnectionClosed: () => {},
    });

    const result = await client.requestPermission({
      sessionId: 'test-session',
      toolCall: { toolCallId: 'tc-1', title: 'Read file' },
      options: [
        { kind: 'allow_once', name: 'Allow', optionId: 'opt-1' },
        { kind: 'reject_once', name: 'Deny', optionId: 'opt-2' },
      ],
    });

    expect(result.outcome).toEqual({ outcome: 'cancelled' });
  });

  test('requestPermission returns selected outcome with optionId', async () => {
    const client = new FlitterClient({
      onSessionUpdate: () => {},
      onPermissionRequest: async () => 'opt-1',
      onPromptComplete: () => {},
      onConnectionClosed: () => {},
    });

    const result = await client.requestPermission({
      sessionId: 'test-session',
      toolCall: { toolCallId: 'tc-1', title: 'Write file' },
      options: [
        { kind: 'allow_once', name: 'Allow', optionId: 'opt-1' },
      ],
    });

    expect(result.outcome).toEqual({ outcome: 'selected', optionId: 'opt-1' });
  });

  test('writeTextFile returns empty object (not void)', async () => {
    const client = new FlitterClient({
      onSessionUpdate: () => {},
      onPermissionRequest: async () => null,
      onPromptComplete: () => {},
      onConnectionClosed: () => {},
    });

    const result = await client.writeTextFile({
      path: '/tmp/test-acp-write.txt',
      content: 'hello',
      sessionId: 'test-session',
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('terminalOutput includes truncated field and flat shape', async () => {
    const client = new FlitterClient({
      onSessionUpdate: () => {},
      onPermissionRequest: async () => null,
      onPromptComplete: () => {},
      onConnectionClosed: () => {},
    });

    const result = await client.terminalOutput({
      terminalId: 'nonexistent',
      sessionId: 'test-session',
    });

    // Verify flat shape (not wrapped in { terminal: ... })
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('truncated');
    expect(typeof result.truncated).toBe('boolean');
    expect(result).not.toHaveProperty('terminal');
  });
});
```

### 3. Unit Tests for `sendPrompt` Return Type

```typescript
import { describe, test, expect } from 'bun:test';
import type { StopReason } from '@agentclientprotocol/sdk';

describe('sendPrompt return type', () => {
  test('stopReason is typed as StopReason union, not string', () => {
    // Compile-time type assertion
    type Expected = { stopReason: StopReason };
    type Actual = Awaited<ReturnType<typeof import('../acp/connection').sendPrompt>>;

    // If Actual is assignable to Expected, this compiles:
    const _check: Expected extends Actual ? true : false = true;
    expect(_check).toBe(true);
  });
});
```

### 4. Regression Test for Session Update Handling

```typescript
import { describe, test, expect } from 'bun:test';
import { AppState } from '../state/app-state';
import type * as acp from '@agentclientprotocol/sdk';

describe('AppState.onSessionUpdate with SDK types', () => {
  test('handles agent_message_chunk with text content', () => {
    const state = new AppState();
    const update: acp.SessionUpdate = {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'Hello world' },
    };

    state.onSessionUpdate('session-1', update);
    const lastItem = state.conversation.items[state.conversation.items.length - 1];
    expect(lastItem?.type).toBe('assistant_message');
  });

  test('handles tool_call with full ToolCall shape', () => {
    const state = new AppState();
    const update: acp.SessionUpdate = {
      sessionUpdate: 'tool_call',
      toolCallId: 'tc-1',
      title: 'Read file.ts',
      kind: 'read',
      status: 'in_progress',
      locations: [{ path: '/src/file.ts' }],
    };

    state.onSessionUpdate('session-1', update);
    const lastItem = state.conversation.items[state.conversation.items.length - 1];
    expect(lastItem?.type).toBe('tool_call');
  });

  test('handles usage_update with typed fields', () => {
    const state = new AppState();
    const update: acp.SessionUpdate = {
      sessionUpdate: 'usage_update',
      size: 100000,
      used: 50000,
      cost: { amount: 0.05, currency: 'USD' },
    };

    state.onSessionUpdate('session-1', update);
    expect(state.conversation.usage).toEqual({
      size: 100000,
      used: 50000,
      cost: { amount: 0.05, currency: 'USD' },
    });
  });

  test('handles plan with SDK PlanEntry type', () => {
    const state = new AppState();
    const update: acp.SessionUpdate = {
      sessionUpdate: 'plan',
      entries: [
        { content: 'Read the file', priority: 'high', status: 'completed' },
        { content: 'Write the fix', priority: 'high', status: 'in_progress' },
        { content: 'Run tests', priority: 'medium', status: 'pending' },
      ],
    };

    state.onSessionUpdate('session-1', update);
    expect(state.conversation.plan).toHaveLength(3);
  });
});
```

### 5. Integration Smoke Test

```bash
cd packages/flitter-amp && bun test
```

The existing tests in `__tests__/` (chat-view, app-layout, tool-card-layout,
markdown-rendering, layout-guardrails) exercise the TUI widgets that consume
`SessionUpdate` and `ToolCallItem` types. If those tests pass after the type
changes, the downstream propagation is correct.

### 6. Manual Verification Checklist

- [ ] `bun run typecheck` passes with zero errors in `packages/flitter-amp`
- [ ] `bun test` passes in `packages/flitter-amp` with no regressions
- [ ] Agent connection succeeds (initialize + newSession) with a real Claude Code agent
- [ ] Permission dialog renders and returns correct outcome structure
- [ ] Streaming session updates (text chunks, tool calls, plan) render in TUI
- [ ] Terminal creation, output polling, and exit waiting work end-to-end
- [ ] `grep -r 'as any\|as unknown' packages/flitter-amp/src/acp/` returns zero matches
- [ ] `grep -r 'as any' packages/flitter-amp/src/utils/process.ts` returns zero matches
- [ ] `grep 'as string\|as Array\|as {' packages/flitter-amp/src/state/app-state.ts`
      returns at most 2 matches (the `rawInput` and `rawOutput` casts)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SDK upgrade changes `Client` method signatures | Medium | High | `implements acp.Client` makes this a compile error, not a runtime surprise |
| Bun changes `FileSink` API | Low | Medium | `BunFileSink` interface or direct `FileSink` import centralizes the assumption |
| Downstream callback consumers have implicit type assumptions | Medium | Medium | TypeScript surfaces errors in all consumers at compile time |
| `terminalOutput` shape change breaks running agents | Low | High | The SDK handles serialization; we now match the expected schema exactly. Existing agents that were working with the wrong shape may have been ignoring the envelope. |
| `writeTextFile` returning `{}` instead of `void` changes behavior | Low | Low | JSON-RPC layer likely serialized `void` as `null`; `{}` is a valid `WriteTextFileResponse` |
| Local `PermissionRequest.prompt` field removal breaks permission dialog | Medium | Medium | Audit `permission-dialog.ts` for `request.prompt` usage; replace with `request.toolCall.title` or remove |
| Exhaustiveness check in `default` case fails on new SDK variants | Expected | Low | This is intentional -- forces developer to handle new update types explicitly |

---

## Migration Order

The recommended order of implementation minimizes intermediate type errors:

1. **Add `BunFileSink` interface and fix `process.ts`** -- isolated, no ripple effects.
2. **Update `ConnectionHandle.agentInfo` type and remove Cast 3** -- small change,
   verify downstream `agentInfo` consumers.
3. **Remove Cast 2 (`as any` on `stopReason`)** -- trivial, no dependencies.
4. **Rewrite `FlitterClient` to implement `acp.Client`** -- this is the big change.
   Do it in `client.ts` first, update the `ClientCallbacks` interface.
5. **Update `connection.ts` to remove Cast 1** -- depends on step 4.
6. **Refactor `app-state.ts` `onSessionUpdate`** -- depends on step 4 for the new
   `ClientCallbacks.onSessionUpdate` signature with `acp.SessionUpdate`.
7. **Update `types.ts` re-exports** -- add `Implementation`, `StopReason`, and
   optionally replace local `PlanEntry` with SDK re-export.
8. **Run `tsc --noEmit` and fix any remaining errors.**
9. **Run full test suite and add new contract tests.**

---

## Appendix A: SDK Types Reference (v0.16.0)

For reference, the key SDK types consumed by the fixed code:

```typescript
// StopReason -- discriminant for prompt completion
type StopReason = "end_turn" | "max_tokens" | "max_turn_requests" | "refusal" | "cancelled";

// Implementation -- agent/client identity
type Implementation = {
  _meta?: { [key: string]: unknown } | null;
  name: string;
  title?: string | null;
  version: string;
};

// RequestPermissionOutcome -- permission dialog result
type RequestPermissionOutcome =
  | { outcome: "cancelled" }
  | (SelectedPermissionOutcome & { outcome: "selected" });

type SelectedPermissionOutcome = {
  _meta?: { [key: string]: unknown } | null;
  optionId: PermissionOptionId;
};

// PermissionOptionKind -- literal union (was: string)
type PermissionOptionKind = "allow_once" | "allow_always" | "reject_once" | "reject_always";

// ToolKind -- literal union for tool call classification
type ToolKind = "read" | "edit" | "delete" | "move" | "search" | "execute" | "think" | "fetch" | "switch_mode" | "other";

// ToolCallStatus -- literal union for tool call lifecycle
type ToolCallStatus = "pending" | "in_progress" | "completed" | "failed";

// SessionUpdate -- discriminated union for streaming events (11 variants)
type SessionUpdate =
  | (ContentChunk & { sessionUpdate: "user_message_chunk" })
  | (ContentChunk & { sessionUpdate: "agent_message_chunk" })
  | (ContentChunk & { sessionUpdate: "agent_thought_chunk" })
  | (ToolCall & { sessionUpdate: "tool_call" })
  | (ToolCallUpdate & { sessionUpdate: "tool_call_update" })
  | (Plan & { sessionUpdate: "plan" })
  | (AvailableCommandsUpdate & { sessionUpdate: "available_commands_update" })
  | (CurrentModeUpdate & { sessionUpdate: "current_mode_update" })
  | (ConfigOptionUpdate & { sessionUpdate: "config_option_update" })
  | (SessionInfoUpdate & { sessionUpdate: "session_info_update" })
  | (UsageUpdate & { sessionUpdate: "usage_update" });

// WriteTextFileResponse -- non-void return
type WriteTextFileResponse = { _meta?: { [key: string]: unknown } | null };

// TerminalOutputResponse -- flat shape with required truncated flag
type TerminalOutputResponse = {
  _meta?: { [key: string]: unknown } | null;
  exitStatus?: TerminalExitStatus | null;
  output: string;
  truncated: boolean;
};

// PlanEntry -- identical shape to local type
type PlanEntry = {
  _meta?: { [key: string]: unknown } | null;
  content: string;
  priority: PlanEntryPriority;  // "high" | "medium" | "low"
  status: PlanEntryStatus;      // "pending" | "in_progress" | "completed"
};
```

## Appendix B: ContentBlock Narrowing Pattern

The SDK's `ContentBlock` is also a discriminated union:

```typescript
type ContentBlock =
  | (TextContent & { type: "text" })
  | (ImageContent & { type: "image" })
  | (AudioContent & { type: "audio" })
  | (ResourceLink & { type: "resource_link" })
  | (EmbeddedResource & { type: "resource" });
```

In the `agent_message_chunk` handler, instead of casting to `{ type: string; text?: string }`,
the correct pattern is:

```typescript
case 'agent_message_chunk': {
  const { content } = update;  // ContentBlock
  switch (content.type) {
    case 'text':
      this.conversation.appendAssistantChunk(content.text);
      break;
    case 'image':
      this.conversation.appendAssistantChunk(`[image: ${content.mimeType}]`);
      break;
    case 'audio':
      this.conversation.appendAssistantChunk(`[audio: ${content.mimeType}]`);
      break;
    case 'resource_link':
      this.conversation.appendAssistantChunk(`[resource: ${content.uri}]`);
      break;
    case 'resource':
      this.conversation.appendAssistantChunk(`[embedded resource]`);
      break;
  }
  break;
}
```

This pattern:
1. Handles all content types (not just text).
2. Is exhaustive -- adding a new content type to the SDK will produce a compile error.
3. Gives correct types within each branch (`content.text` for text, `content.data` for image, etc.).

## Appendix C: Remaining Legitimate Casts After Fix

Even after all fixes, a small number of casts will remain. These are legitimate
because the SDK types `rawInput` and `rawOutput` as `unknown`:

```typescript
// In tool_call handler:
update.rawInput as Record<string, unknown> | undefined
// In tool_call_update handler:
update.rawOutput as Record<string, unknown> | undefined
```

These could be further improved by:
1. Using a type guard: `isRecord(update.rawInput) ? update.rawInput : undefined`
2. Widening the `addToolCall`/`updateToolCall` parameter types to accept `unknown`
3. Performing runtime validation with a schema library (e.g., zod, which is already
   a peer dependency of the ACP SDK)

The `JSON.parse(raw) as UserConfig` cast in `config.ts` is also a separate concern
(runtime parsing without validation) but is outside the scope of this ACP-focused gap.
