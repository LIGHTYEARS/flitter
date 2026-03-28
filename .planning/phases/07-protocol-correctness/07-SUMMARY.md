# Phase 7: Protocol Correctness — Summary

**Completed:** 2026-03-28
**Wave Count:** 1
**Commits:** `b2416ca` (implementation)

## What Changed

Fixed all ACP protocol-level bugs across 9 files in `packages/flitter-amp/src/`:

### Event Names (PROTO-01)
- `thinking_chunk` → `agent_thought_chunk`
- `usage` → `usage_update`
- `current_mode` → `current_mode_update`
- `session_info` → `session_info_update`

### Usage Data Model (PROTO-02)
- `UsageInfo` type: `{inputTokens, outputTokens, cost?}` → `{size, used, cost?: {amount, currency}}`
- BottomGrid: shows `used / size · currency + amount`
- HeaderBar: shows `used / size (currency + amount)`

### Client Capabilities (PROTO-03)
- Initialize request now declares `{fs: {readTextFile, writeTextFile}, terminal: true}`

### Agent Crash Handling (PROTO-04)
- Agent process exit monitored → triggers `onConnectionClosed()` → error banner + state reset
- `agentInfo.name` passed to `setConnected()` instead of hardcoded `'ACP Agent'`

### Terminal (PROTO-05, PROTO-06)
- Persistent `TerminalBuffer` collects output immediately in `createTerminal()`
- `terminalOutput()` reads from buffer — no new listeners registered per call
- `outputByteLimit` respected
- `waitForTerminalExit` returns flat `{exitCode?, signal?}` matching SDK

### Error Handling (PROTO-07)
- `AppState.handleError(message)` unifies: finalize messages/thinking → reset processing → set error → notify
- `handleSubmit` catch block uses `handleError()` instead of manual state manipulation

## Files Modified

| File | Changes |
|------|---------|
| `acp/types.ts` | UsageInfo type updated |
| `acp/client.ts` | ClientCallbacks + onConnectionClosed, TerminalBuffer, waitForTerminalExit return |
| `acp/connection.ts` | clientCapabilities, agentInfo in handle |
| `state/app-state.ts` | Event names, usage mapping, handleError(), onConnectionClosed() |
| `index.ts` | Agent exit monitor, handleError() usage, agentInfo passthrough |
| `widgets/bottom-grid.ts` | Usage display: used/size + cost |
| `widgets/header-bar.ts` | Usage display: used/size + cost |
| `__tests__/visual-snapshot.test.ts` | UsageInfo shape updated |
| `__tests__/visual-cell-assertions.test.ts` | UsageInfo shape updated |

---

*Phase: 07-protocol-correctness*
*Summary written: 2026-03-28*
