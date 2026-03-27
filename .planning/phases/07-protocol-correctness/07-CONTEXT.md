# Phase 7: Protocol Correctness - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all ACP protocol-level bugs so the client correctly communicates with any ACP agent. This phase covers the JSON-RPC message layer (event names, field mapping, capabilities declaration, connection monitoring, terminal lifecycle, error recovery). It does NOT cover rendering of those messages (Phase 9-10) or scroll behavior (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Agent Crash Handling (PROTO-04)
- **D-01:** On `connection.closed` / `connection.signal`, display error banner in TUI and reset `isProcessing` state. Do NOT auto-exit or auto-reconnect.
- **D-02:** Auto-reconnection is deferred to v0.3.0 (DEFER-05). For now, user must restart the app.

### Usage Data Model (PROTO-02)
- **D-03:** Replace the internal `UsageInfo` type entirely to match SDK's `UsageUpdate` structure: `{ size: number; used: number; cost?: { amount: number; currency: string } | null }`. Drop `inputTokens`/`outputTokens` — the SDK doesn't have those fields.
- **D-04:** BottomGrid display should show `used`/`size` (context window usage) and `cost.amount` formatted with `cost.currency`.

### Terminal Output Collection (PROTO-05)
- **D-05:** Start a persistent output buffer in `createTerminal()` that immediately collects stdout+stderr. `terminalOutput()` reads from this buffer — no new listeners registered per call.
- **D-06:** Implement `outputByteLimit` from CreateTerminalRequest — stop collecting when buffer exceeds the limit.

### Error Path Unification (PROTO-07)
- **D-07:** Add `AppState.handleError(message: string)` method that: (1) calls `conversation.finalizeAssistantMessage()`, (2) calls `conversation.finalizeThinking()`, (3) sets `conversation.isProcessing = false`, (4) calls `setError(message)`, (5) calls `notifyListeners()`. All error paths (handleSubmit catch, connection crash) call this single method.

### Mechanical Fixes (No gray area — direct schema alignment)
- **D-08:** Fix 4 event names: `thinking_chunk`→`agent_thought_chunk`, `usage`→`usage_update`, `current_mode`→`current_mode_update`, `session_info`→`session_info_update`
- **D-09:** Add `clientCapabilities` to initialize request: `{ fs: { readTextFile: true, writeTextFile: true }, terminal: true }`
- **D-10:** Fix `waitForTerminalExit` return shape to `{ exitCode?: number | null; signal?: string | null }` (flat, not nested `{exitStatus: {code}}`).
- **D-11:** Store `initResponse.agentInfo` and pass `agentInfo.name` to `setConnected()` instead of hardcoded `'ACP Agent'`.

### Claude's Discretion
- Whether to add handlers for `user_message_chunk`, `available_commands_update`, `config_option_update` as no-op stubs or skip them entirely (logged as unknown). Planner can decide.
- Whether `readTextFile` should respect `line`/`limit` params from SDK — minor, planner can decide.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### ACP Protocol SDK
- `packages/flitter-amp/node_modules/@agentclientprotocol/sdk/schema/schema.json` — Authoritative schema for all sessionUpdate types, field names, request/response shapes
- `packages/flitter-amp/node_modules/@agentclientprotocol/sdk/dist/schema/zod.gen.d.ts` — Zod schemas with exact field types (UsageUpdate at line 3543, SessionUpdate union at line 3559, WaitForTerminalExitResponse at line 5400)
- `packages/flitter-amp/node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts` — TypeScript types for all ACP message shapes

### Source Files to Modify
- `packages/flitter-amp/src/acp/connection.ts` — initialize() call, connection monitoring
- `packages/flitter-amp/src/acp/client.ts` — FlitterClient methods (terminalOutput, waitForTerminalExit, createTerminal)
- `packages/flitter-amp/src/state/app-state.ts` — onSessionUpdate switch statement, error handling
- `packages/flitter-amp/src/acp/types.ts` — UsageInfo type, ToolCallResult.content type
- `packages/flitter-amp/src/index.ts` — handleSubmit error path, agent info passthrough

### Audit Reference
- `.planning/REQUIREMENTS.md` — PROTO-01 through PROTO-07 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppState.setError(message)` + `AppState.clearError()` — existing error display infrastructure
- `AppState.notifyListeners()` — state propagation already works
- `log` utility from `../utils/logger` — structured logging available
- `ConnectionHandle` interface in connection.ts — can extend with `agentInfo` field

### Established Patterns
- `FlitterClient` methods map 1:1 to ACP JSON-RPC methods (sessionUpdate, requestPermission, readTextFile, etc.)
- `AppState implements ClientCallbacks` — single class handles all agent events
- Switch-case dispatch in `onSessionUpdate` — straightforward to fix event names

### Integration Points
- `connection.ts:52` — `connection.initialize()` call needs `clientCapabilities` added
- `connection.ts:45-48` — `acp.ClientSideConnection` constructor creates the connection object that needs monitoring
- `app-state.ts:74-148` — switch statement is the single dispatch point for all session updates
- `index.ts:80-93` — `handleSubmit` catch block is the primary error path
- `index.ts:48` — `setConnected()` call where agentInfo.name should be passed

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard SDK schema alignment with the decisions documented above.

</specifics>

<deferred>
## Deferred Ideas

- Auto-reconnection on agent crash (DEFER-05, v0.3.0+)
- `authenticate()` flow for agents that require auth (DEFER-06, v0.3.0+)
- `readTextFile` line/limit params — minor SDK compliance, can be done opportunistically

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-protocol-correctness*
*Context gathered: 2026-03-28*
