# Coco Built-in Tool → Flitter-Amp Rendering Mapping

## Background

Coco (oh-my-coco agent runtime) communicates with flitter-amp via ACP (Agent Client Protocol).
Each tool call arrives as a `session/update` JSON-RPC notification with `sessionUpdate: "tool_call"`.

**Critical ACP behavior** (verified via runtime probe on 2026-03-30):
- The `kind` field is unreliable: all read-type tools send `kind: "read"`, write/execute tools send **no kind at all**.
- The `title` field is the only reliable tool identifier. Format: `"ToolName /path"` or just `"toolname"`.
- Tool identification must parse `title` to extract the tool name (first word or first space-delimited token).

## Coco Built-in Tools (15 total)

Enumerated by asking Coco directly via ACP prompt. Runtime-verified ACP fields included where captured.

### Read-type Tools (kind: "read")

| # | Tool Name | ACP title pattern | ACP rawInput keys | Existing Renderer | Status |
|---|-----------|------------------|-------------------|-------------------|--------|
| 1 | **Read** | `"Read /abs/path"` | `["path"]` | `ReadTool` | **Broken**: `kind:"read"` not in TOOL_NAME_MAP, not in switch. Falls through to GenericToolCard. |
| 2 | **LS** | `"LS /abs/path"` | `["path"]` | None (could reuse `GrepTool` or GenericToolCard) | **Broken**: same as above. |
| 3 | **Grep** | `"Grep /abs/path"` | `["include", "path", "pattern"]` | `GrepTool` | **Broken**: same as above. |
| 4 | **Glob** | `"Glob /abs/path"` | `["path", "pattern"]` | `GrepTool` (via `case 'Glob'`) | **Partially broken**: title starts with `"Glob"`, but switch matches on normalized name, not title. |

### Execute-type Tools (kind: missing)

| # | Tool Name | ACP title pattern | ACP rawInput keys | Existing Renderer | Status |
|---|-----------|------------------|-------------------|-------------------|--------|
| 5 | **Bash** | `"bash"` (lowercase, no path) | `["Command", "Description", "TimeoutMilliseconds"]` | `BashTool` | **Broken**: no `kind` → defaults to `"other"` → GenericToolCard. |
| 6 | **BashOutput** | Unknown (not triggered in probe) | Unknown | None | **Missing**: needs new renderer or reuse BashTool. |
| 7 | **KillShell** | Unknown (not triggered in probe) | Unknown | None | **Missing**: minimal display needed. |

### Write-type Tools (kind: missing)

| # | Tool Name | ACP title pattern | ACP rawInput keys | Existing Renderer | Status |
|---|-----------|------------------|-------------------|-------------------|--------|
| 8 | **ApplyPatch** | `"apply_patch"` (lowercase) | null (uses ACP fs.writeTextFile) | `EditFileTool` (via `case 'apply_patch'`) | **Broken**: switch expects normalized name `"apply_patch"`, but title is also `"apply_patch"`. Fix: add title-based resolution. |

### Web Tools (kind: unknown)

| # | Tool Name | ACP title pattern | ACP rawInput keys | Existing Renderer | Status |
|---|-----------|------------------|-------------------|-------------------|--------|
| 9 | **WebFetch** | Unknown (not triggered in probe) | Unknown | `WebSearchTool` (if mapped) | **Missing from mapping**: needs `WebFetch` → `WebSearch` in name map or switch. |

### Agent/Workflow Tools (kind: unknown)

| # | Tool Name | ACP title pattern | ACP rawInput keys | Existing Renderer | Status |
|---|-----------|------------------|-------------------|-------------------|--------|
| 10 | **Task** | Unknown | Unknown | `TaskTool` (if matched) | **Needs title-based mapping** |
| 11 | **Skill** | Unknown | Unknown | `GenericToolCard` (via `case 'skill'`) | **Case-sensitive mismatch**: Coco sends PascalCase `"Skill"`, switch has lowercase `'skill'`. |
| 12 | **TodoWrite** | Unknown | Unknown | `TodoListTool` (via `case 'todo_write'`) | **Needs title-based mapping** |
| 13 | **EnterPlanMode** | Unknown | Unknown | None | **Missing**: can use GenericToolCard or ignore (workflow-only). |
| 14 | **ExitPlanMode** | Unknown | Unknown | None | **Missing**: same as above. |
| 15 | **multi_tool_use.parallel** | Unknown | Unknown | None | **Missing**: container tool, children are individual tool_calls. May not need dedicated renderer. |

## Fix Strategy

### Step 1: Title-based Tool Resolution (replaces kind-based)

The current flow:
```
rawName = toolCall.kind       // unreliable: "read" or undefined
name = TOOL_NAME_MAP[rawName] ?? rawName
switch (name) { ... }
```

Must change to:
```
rawName = resolveToolName(toolCall)  // parse from title, fallback to kind
name = TOOL_NAME_MAP[rawName] ?? rawName
switch (name) { ... }
```

Where `resolveToolName`:
```typescript
function resolveToolName(toolCall: ToolCallItem): string {
  // 1. Extract from title: first word before space
  const titleName = toolCall.title?.split(/\s+/)[0] ?? '';
  // 2. Fallback to kind if title is empty
  return titleName || toolCall.kind || 'other';
}
```

### Step 2: Update TOOL_NAME_MAP for Coco names

Add these mappings:
```typescript
const TOOL_NAME_MAP: Record<string, string> = {
  // ... existing Amp mappings ...
  
  // Coco built-in tools (title-extracted names)
  'Read': 'Read',
  'LS': 'LS',               // new case needed in switch
  'Grep': 'Grep',
  'Glob': 'Glob',
  'bash': 'Bash',           // Coco sends lowercase "bash" as title
  'BashOutput': 'Bash',     // reuse BashTool
  'KillShell': 'Bash',      // minimal, reuse BashTool
  'apply_patch': 'apply_patch',
  'ApplyPatch': 'apply_patch',
  'WebFetch': 'WebSearch',
  'Task': 'Task',
  'Skill': 'skill',         // map to existing case
  'TodoWrite': 'todo_write', // map to existing case
  'EnterPlanMode': 'EnterPlanMode',  // new or generic
  'ExitPlanMode': 'ExitPlanMode',    // new or generic
};
```

### Step 3: Add switch cases for Coco-specific tools

```typescript
switch (name) {
  // ... existing cases ...
  case 'LS':
    return new GrepTool({ ... }); // reuse, shows file listing
  case 'EnterPlanMode':
  case 'ExitPlanMode':
    return new GenericToolCard({ ... });
}
```

### Step 4: Fix BashTool rawInput key access

Coco uses PascalCase rawInput keys: `Command`, `Description`, `TimeoutMilliseconds`.
Amp uses snake_case: `command`, `description`.

BashTool must check both:
```typescript
const command = rawInput?.command ?? rawInput?.Command ?? '';
```

## ACP Data Flow Reference

```
Coco binary (Go)
  │ spawned via: coco acp serve
  ▼ stdio JSON-RPC ndjson
@agentclientprotocol/sdk (ClientSideConnection)
  │ params.update = SessionUpdate
  ▼
AppState.onSessionUpdate()
  │ kind = update.kind ?? 'other'   ← THIS IS THE BUG
  ▼
ConversationState.addToolCall(id, title, kind, ...)
  │ Object.freeze({ kind, title, ... })
  ▼
ToolCallWidget.build()
  │ rawName = toolCall.kind          ← SHOULD USE title
  │ name = TOOL_NAME_MAP[rawName] ?? rawName
  ▼
switch (name) → ReadTool / BashTool / ... / GenericToolCard
```

## Runtime Evidence (2026-03-30)

Captured via `acp-probe.ts` script that spawns `coco acp serve` and logs all `tool_call` session updates.

### Probe 1: Read/LS/Grep/Glob/Bash

```json
{"kind":"read","title":"Read /.../.../AGENTS.md","rawInput":["path"]}
{"kind":"read","title":"LS /.../packages","rawInput":["path"]}
{"kind":"read","title":"Grep /...","rawInput":["include","path","pattern"]}
{"kind":"read","title":"Glob /...","rawInput":["path","pattern"]}
{"title":"bash","rawInput":["Command","Description","TimeoutMilliseconds"]}
```

### Probe 2: + ApplyPatch

```json
{"title":"apply_patch","rawInput":null}
```

### Probe 3: Full tool list (self-reported by Coco)

```
Read | Read a file (or image/PDF) from the filesystem with optional offset/limit
LS | List files and directories at an absolute path
Grep | Search file contents with ripgrep-powered regex
Glob | Find files by glob pattern within a directory
Bash | Execute a bash command in a persistent shell session
BashOutput | Retrieve stdout/stderr and status from a running background bash shell
KillShell | Terminate a running background bash shell by its ID
ApplyPatch | Add, update, move, or delete files via a structured patch format
WebFetch | Fetch content from a URL (raw or AI-processed extraction/analysis)
Task | Launch a specialized sub-agent
Skill | Invoke an installed skill by name
TodoWrite | Create and update a structured session todo list
EnterPlanMode | Transition into plan mode
ExitPlanMode | Signal that planning is complete
multi_tool_use.parallel | Run multiple tool calls concurrently
```
