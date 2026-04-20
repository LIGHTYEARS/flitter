> **STATUS: COMPLETED** — This plan has been fully implemented and is kept for historical reference only.

# Gap 1: Missing CLI Commands

> Implementation plan for 17 missing CLI subcommands identified in the flitter vs amp gap analysis.

## Overview

Flitter has 15 CLI commands; amp has 35+. This plan covers the 17 missing subcommands grouped by domain.

## Amp Reference Files

| Command group | Amp module | Key function |
|---|---|---|
| `threads search/label/share/rename/export/markdown/visibility/usage` | `modules/2023_unknown_uF0.js`, `2014_..nF0`, `2013_..oF0`, `2008_..rF0`, `2012_..sF0`, `2011_..cF0`, `2021_..bF0`, `2577_..dL0` | Per-command functions |
| `mcp oauth login/logout/status`, `mcp doctor`, `mcp approve` | `modules/2502_unknown_uC0.js`, `1254_unknown_cUR.js`, `2503_unknown_yC0.js` | `uC0()`, `cUR()` |
| `permissions edit` | `modules/2523_unknown_VC0.js` → `2435_unknown_MQT.js` | `MQT()` |
| `skill add/list/remove/info` | `modules/2544_unknown_g40.js` | `g40()` |
| `tools make/use` | `modules/2597_unknown_pM0.js`, `2598_unknown__M0.js` | `pM0()`, `_M0()` |
| `review` | `modules/2535_unknown_p40.js` → `2539_unknown_m40.js` | `m40()` |

## Existing Flitter Patterns

All commands follow the `*CommandDeps` pattern from `packages/cli/src/commands/`:
- Typed deps interface (minimal subset of ServiceContainer)
- `handle*` async function exported per action
- Registration in `packages/cli/src/program.ts` via Commander.js
- Deps wired in `packages/cli/src/main.ts` or lazily via container

---

## Phase 1: Thread Subcommands (Local-Only)

These commands operate on local thread data and require no server backend.

### Task 1.1: `threads export <threadId>`

**File:** `packages/cli/src/commands/threads.ts`

```typescript
export async function handleThreadsExport(
  deps: ThreadsCommandDeps,
  threadId: string,
): Promise<void>
```

**Logic:**
1. Resolve threadId (support T-{uuid} format or short prefix match)
2. Load thread: `deps.threadPersistence.load(threadId)`
3. If not found, `console.error("Thread not found")`, exit 1
4. `JSON.stringify(thread, null, 2)` → stdout

**Amp ref:** `modules/2012_unknown_sF0.js` — loads via `NA()`, stringifies with 2-space indent.

### Task 1.2: `threads markdown <threadId>`

**File:** `packages/cli/src/commands/threads.ts`

```typescript
export async function handleThreadsMarkdown(
  deps: ThreadsCommandDeps,
  threadId: string,
): Promise<void>
```

**Logic:**
1. Load thread (same as export)
2. Call `threadToMarkdown(thread)` — new utility function
3. Write result to stdout

**New file:** `packages/data/src/thread/thread-markdown.ts`
```typescript
export function threadToMarkdown(thread: ThreadSnapshot): string
```

Renders each message as:
- `## User\n\n{content}\n\n` for user messages
- `## Assistant\n\n{content}\n\n` for assistant messages
- Tool use/result blocks as fenced code blocks with tool name headers
- Truncate tool results to 4000 chars

**Amp ref:** `modules/2011_unknown_cF0.js` — uses `KN()` renderer.

### Task 1.3: `threads rename <threadId> <newTitle>`

**File:** `packages/cli/src/commands/threads.ts`

```typescript
export async function handleThreadsRename(
  deps: ThreadsCommandDeps,
  threadId: string,
  newTitle: string,
): Promise<void>
```

**Logic:**
1. Validate: non-empty, <= 256 chars
2. Load thread, assert has messages
3. Update title: `threadStore.setCachedThread({ ...thread, title: newTitle })`
4. Persist: `threadPersistence.save(threadId, updatedThread)`
5. Print `Thread ${threadId} renamed to "${newTitle}"`

**Amp ref:** `modules/2008_unknown_rF0.js` — dispatches title event via state controller.

### Task 1.4: `threads search <query>`

**File:** `packages/cli/src/commands/threads.ts`

```typescript
export interface ThreadsSearchOptions { limit?: number; json?: boolean }
export async function handleThreadsSearch(
  deps: ThreadsCommandDeps,
  query: string,
  options: ThreadsSearchOptions,
): Promise<void>
```

**Logic (local-only, no server):**
1. Load all thread entries from `threadStore.observeThreadEntries().getValue()`
2. Filter: case-insensitive substring match on `title` and first message content
3. Sort by `updatedAt` descending
4. Limit to `options.limit ?? 20`
5. If `--json`: output `[{ id, title, updatedAt }]`
6. Otherwise: table format (Title | Last Updated | Thread ID)

**Amp ref:** `modules/2023_unknown_uF0.js` — calls server API; we do local search instead.

### Task 1.5: `threads usage <threadId>`

**File:** `packages/cli/src/commands/threads.ts`

```typescript
export async function handleThreadsUsage(
  deps: ThreadsCommandDeps & { costTracker?: SessionCostTracker },
  threadId: string,
): Promise<void>
```

**Logic:**
1. Load thread
2. Count messages by role, count tool uses
3. Estimate token usage from message content lengths (rough: chars / 4)
4. If `costTracker` available, use actual tracked costs
5. Print formatted: message count, tool call count, estimated tokens

**Amp ref:** `modules/2576_unknown_OL0.js` — calls server API for cost info. We compute locally.

---

## Phase 2: Thread Subcommands (Deferred/Stub)

These commands depend on server-side features not yet in flitter. Implement as stubs that print "not yet supported" with clear messaging.

### Task 2.1: `threads share`, `threads visibility`, `threads label`

Register commands in `program.ts` and create handler stubs:
```typescript
export async function handleThreadsShare(deps: ThreadsCommandDeps, threadId: string): Promise<void> {
  console.error("Thread sharing requires a Flitter server. Not yet supported.");
  process.exit(1);
}
```

Same pattern for `visibility` and `label`. These map to amp's server-side features.

---

## Phase 3: MCP Subcommands

### Task 3.1: `mcp status`

**File:** `packages/cli/src/commands/mcp.ts`

```typescript
export async function handleMcpStatus(deps: McpCommandDeps & { mcpManager: MCPServerManager }): Promise<void>
```

**Logic:**
1. Get all servers: `deps.mcpManager.servers` (observable → `.getValue()`)
2. For each server, print: name, transport type, connection status, tool count
3. Color-code: green for connected, red for failed, yellow for connecting

**Amp ref:** `modules/1254_unknown_cUR.js` (doctor uses same server observable).

### Task 3.2: `mcp doctor [name]`

**File:** `packages/cli/src/commands/mcp.ts`

```typescript
export async function handleMcpDoctor(
  deps: McpCommandDeps & { mcpManager: MCPServerManager },
  name?: string,
): Promise<void>
```

**Logic:**
1. Print settings file paths (global, workspace)
2. Subscribe to `mcpManager.servers` observable
3. For each server (or filtered by name): print status with detail
4. Wait up to 30s for all servers to reach terminal state (connected/failed)
5. Report: server name, transport, status, error message if failed, tool count if connected

**Amp ref:** `modules/1254_unknown_cUR.js` — `cUR()` subscribes to observable, formats status, 30s timeout.

### Task 3.3: `mcp approve <name>`

**File:** `packages/cli/src/commands/mcp.ts`

```typescript
export async function handleMcpApprove(
  deps: McpCommandDeps & { mcpManager: MCPServerManager },
  name: string,
): Promise<void>
```

**Logic:**
1. Call `deps.mcpManager.approveWorkspaceServer(name)` (add to trusted list in config)
2. This requires adding an `approveWorkspaceServer` method to MCPServerManager
3. Stores trusted server names in `mcpTrustedServers` config key

**Amp ref:** `modules/2503_unknown_yC0.js` lines 158-182.

### Task 3.4: `mcp oauth login/logout/status`

**File:** `packages/cli/src/commands/mcp.ts` (add to existing)

```typescript
export async function handleMcpOAuthLogin(deps: McpCommandDeps, serverName: string, options: McpOAuthOptions): Promise<void>
export async function handleMcpOAuthLogout(deps: McpCommandDeps, serverName: string): Promise<void>
export async function handleMcpOAuthStatus(deps: McpCommandDeps, serverName: string): Promise<void>
```

**McpOAuthOptions:**
```typescript
{ serverUrl: string, clientId: string, clientSecret?: string, scopes?: string, authUrl?: string, tokenUrl?: string }
```

**Login logic:**
1. If `authUrl`/`tokenUrl` not provided, discover via `/.well-known/oauth-authorization-server`
2. Store client credentials via `secrets.set("mcp-oauth-client-*", ...)`
3. Store client info as JSON in `~/.config/flitter/oauth/<server-name>-client.json`
4. Print "OAuth credentials saved. Authorization will happen on next MCP connection."

**Amp ref:** `modules/2502_unknown_uC0.js` — `lv` OAuth credential manager class.

---

## Phase 4: Permission Edit

### Task 4.1: `permissions edit`

**File:** `packages/cli/src/commands/permissions.ts`

```typescript
export async function handlePermissionsEdit(
  deps: PermissionsCommandDeps,
  options: { workspace?: boolean },
): Promise<void>
```

**Logic:**
1. Detect `$EDITOR` or `$FLITTER_EDITOR`; exit with error if none
2. Determine scope: `options.workspace ? "workspace" : "global"`
3. Read current permissions: `deps.configService.get().settings.permissions`
4. Serialize to text format with comment header explaining syntax
5. Write to temp file: `${os.tmpdir()}/flitter-permissions-${randomId}/permissions.txt`
6. Launch `$EDITOR <path>` via `child_process.execSync` (inherits stdio)
7. Read back, parse with `parsePermissionEntries(text)`
8. On success: `configService.updateSettings(scope, "permissions", entries)`, print confirmation
9. On parse failure: print error, re-open editor (up to 3 retries)
10. Clean up temp dir

**Amp ref:** `modules/2435_unknown_MQT.js` — `MQT()` with editor loop, 3-retry limit.

---

## Phase 5: Skill CLI Commands

### Task 5.1: `skill list`

**File:** `packages/cli/src/commands/skills.ts` (new file)

```typescript
export interface SkillCommandDeps { skillService: SkillService }
export async function handleSkillList(deps: SkillCommandDeps, options: { json?: boolean }): Promise<void>
```

**Logic:**
1. `deps.skillService.scan()` (force refresh)
2. Get skills + errors from BehaviorSubjects
3. JSON: `{ skills: [...], errors: [...] }`
4. Text: bullet list with name (bold), description (truncated), base dir

### Task 5.2: `skill add <source>`

```typescript
export async function handleSkillAdd(
  deps: SkillCommandDeps,
  source: string,
  options: { global?: boolean; overwrite?: boolean; name?: string },
): Promise<void>
```

**Logic:**
1. Resolve target dir: `--global` → `~/.config/flitter/skills/`, else workspace `.flitter/skills/`
2. Call `skillService.install(source, { name, overwrite })`
3. Print result per skill

**Note:** `SkillService.install()` already exists but may need enhancement for git/registry sources.

### Task 5.3: `skill remove <name>` and `skill info <name>`

Similar pattern. `remove` calls `skillService.remove(name)`. `info` calls `skillService.list().find(s => s.name === name)` and prints metadata.

---

## Phase 6: Tools Make/Use

### Task 6.1: `tools make <name>`

**File:** `packages/cli/src/commands/tools.ts`

```typescript
export async function handleToolsMake(
  deps: ToolsCommandDeps,
  toolName: string,
  options: { force?: boolean; language?: "bun" | "zsh" | "bash" },
): Promise<void>
```

**Logic:**
1. Validate name: `/^[a-zA-Z0-9-]+$/`
2. Resolve toolbox dir: `FLITTER_TOOLBOX` env or `~/.local/share/flitter/tools`
3. Check existence (exit 1 unless `--force`)
4. Generate skeleton from template (`toolboxTemplate(name, language)`)
5. Write file, `chmod 0o755`
6. Print: path, inspect command, execute command

**Templates:** Bun `.ts` / Bash `.sh` / Zsh `.zsh` — each reads `TOOLBOX_ACTION` env and outputs JSON spec on `describe`, executes on `execute`.

**Amp ref:** `modules/2582_unknown_GL0.js` — `GL0()` + `KL0()` template generator.

### Task 6.2: `tools use <name>`

```typescript
export async function handleToolsUse(
  deps: ToolsCommandDeps & { toolRegistry: ToolRegistry },
  toolName: string,
  rawArgs: string[],
  options: { only?: string; stream?: boolean },
): Promise<void>
```

**Logic:**
1. Look up tool in registry
2. Parse args: if stdin is piped, read JSON; else parse `--key value` pairs from rawArgs
3. Invoke `toolSpec.execute(args, context)`
4. If `--only <field>`: extract that field from result
5. Print result (JSON or text)

**Amp ref:** `modules/2598_unknown__M0.js` — `eM0()` invocation engine.

---

## Phase 7: Review Command

### Task 7.1: `review [diff_description]`

**File:** `packages/cli/src/commands/review.ts` (new file)

```typescript
export interface ReviewCommandDeps {
  toolRegistry: ToolRegistry
  configService: ConfigService
  createThreadWorker: (threadId: string) => ThreadWorker
}

export async function handleReview(
  deps: ReviewCommandDeps,
  diffDescription?: string,
  options?: { files?: string[]; instructions?: string; summaryOnly?: boolean },
): Promise<void>
```

**Logic:**
1. Default diff description: `"git diff HEAD and newly added untracked files"`
2. Run `git rev-parse --show-toplevel` to find repo root
3. Expand description to git commands, run them to get diff text
4. Generate AI summary of diff
5. If `--summary-only`: print summary, return
6. Otherwise: create a sub-agent with code review system prompt
7. Agent reviews the diff using Read/Grep tools
8. Collect and format review comments (filter out low-severity)
9. Print formatted review output

**Amp ref:** `modules/2539_unknown_m40.js` — `m40()` gates on `--dangerously-allow-all`, runs `code_review` tool.

**Note:** This is a complex feature. Phase 7 can be deferred after the simpler commands are solid.

---

## Phase 8: Program Registration

### Task 8.1: Wire all new commands in `program.ts`

Add to the Commander.js tree:
```typescript
// threads subcommands
threads.command("search <query>").option("-n, --limit <n>", "max results", "20").option("--json")
threads.command("rename <threadId> <newTitle>")
threads.command("export <threadId>")
threads.command("markdown <threadId>").alias("md")
threads.command("usage <threadId>")
threads.command("share <threadId>")  // stub
threads.command("visibility [level]").alias("v")  // stub
threads.command("label <threadId> <labels...>")  // stub

// mcp subcommands
const mcpOauth = mcp.command("oauth")
mcpOauth.command("login <name>").requiredOption("--server-url <url>").requiredOption("--client-id <id>")...
mcpOauth.command("logout <name>")
mcpOauth.command("status <name>")
mcp.command("status")
mcp.command("doctor [name]")
mcp.command("approve <name>")

// permissions
permissions.command("edit").option("-w, --workspace")

// skills
const skill = program.command("skill")
skill.command("list").option("--json")
skill.command("add <source>").option("--global").option("--overwrite").option("--name <name>")
skill.command("remove <name>").alias("rm")
skill.command("info <name>").option("--json")

// tools
tools.command("make <name>").option("--force").option("--bun").option("--zsh").option("--bash")
tools.command("use <name>").option("--only <field>").option("--stream")

// review
program.command("review [diff_description]").option("-f, --files <files...>")...
```

### Task 8.2: Wire action handlers in `main.ts`

Each command's `.action()` callback lazily creates the container and calls the handler:
```typescript
threadsSearch.action(async (query, opts) => {
  const container = await getContainer();
  await handleThreadsSearch({ threadStore: container.threadStore, threadPersistence: container.threadPersistence }, query, opts);
});
```

---

## Test Strategy

- Unit tests for each handler: mock deps, assert stdout output, assert exit codes
- Integration test for `threads export/markdown/rename/search`: use real ThreadStore + ThreadPersistence with temp dir
- Smoke test: `bun run packages/cli/bin/flitter.ts threads --help` shows all subcommands

## Dependencies

- **ThreadPersistence** must support `load(threadId)` (already exists)
- **SkillService** must have `install()` and `remove()` (already exists)
- **MCPServerManager** needs `approveWorkspaceServer()` method (new)

## Estimated Scope

| Phase | Commands | Complexity | Files touched |
|---|---|---|---|
| Phase 1 | 5 thread commands | Low | `threads.ts`, new `thread-markdown.ts` |
| Phase 2 | 3 thread stubs | Trivial | `threads.ts` |
| Phase 3 | 6 mcp commands | Medium | `mcp.ts`, MCPServerManager |
| Phase 4 | 1 permission command | Medium | `permissions.ts` |
| Phase 5 | 4 skill commands | Low | new `skills.ts` |
| Phase 6 | 2 tool commands | Medium | `tools.ts`, new toolbox templates |
| Phase 7 | 1 review command | High | new `review.ts` |
| Phase 8 | Registration | Low | `program.ts`, `main.ts` |
