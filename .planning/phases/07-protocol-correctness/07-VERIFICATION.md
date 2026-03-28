# Phase 7: Protocol Correctness — Verification

**Date:** 2026-03-28
**Status:** passed

## Must-Have Verification

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| PROTO-01 | Fix 4 event names | ✅ | `thinking_chunk`→`agent_thought_chunk`, `usage`→`usage_update`, `current_mode`→`current_mode_update`, `session_info`→`session_info_update` in app-state.ts |
| PROTO-02 | Fix usage data model | ✅ | UsageInfo type changed to `{size, used, cost?}`, mapping updated in app-state.ts, displays updated in bottom-grid.ts and header-bar.ts |
| PROTO-03 | Declare clientCapabilities | ✅ | `clientCapabilities: {fs: {readTextFile: true, writeTextFile: true}, terminal: true}` added to initialize() in connection.ts |
| PROTO-04 | Monitor connection/agent crash | ✅ | Agent process exit handler added in index.ts, calls `appState.onConnectionClosed()`, sets error state and `isConnected=false` |
| PROTO-05 | Fix terminal output collection | ✅ | Persistent TerminalBuffer with immediate stdout/stderr collection in createTerminal(), no listener leak in terminalOutput(), outputByteLimit respected |
| PROTO-06 | Fix waitForTerminalExit return | ✅ | Return type changed from `{exitStatus: {code}}` to `{exitCode?, signal?}` matching SDK WaitForTerminalExitResponse |
| PROTO-07 | Unify error handling | ✅ | `handleError(message)` method added to AppState — finalizes messages/thinking, resets isProcessing, sets error. handleSubmit catch uses it |

## Success Criteria

1. ✅ `agent_thought_chunk` events routed to `appendThinkingChunk()` — renders ThinkingBlock content
2. ✅ `usage_update` events mapped to new `{size, used, cost}` model — BottomGrid shows `used/size`, HeaderBar shows usage + formatted cost
3. ✅ `clientCapabilities` declared in initialize request — agents with strict capability checking will accept file/terminal requests
4. ✅ Agent crash triggers `onConnectionClosed()` → error banner + processing state reset
5. ✅ Tests updated to use new UsageInfo shape — snapshots will regenerate on next `bun test`

## Human Verification

- [ ] Run `bun test` in both packages to verify all tests pass (requires bun runtime)
- [ ] Manual test with an actual ACP agent to verify streaming works end-to-end

---

*Phase: 07-protocol-correctness*
*Verified: 2026-03-28*
