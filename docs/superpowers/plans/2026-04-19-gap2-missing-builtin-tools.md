# Gap 2: Missing Built-in Tools

> Implementation plan for built-in tools that amp has but flitter lacks.

## Overview

Flitter has 8 built-in tools; amp has ~50+. Many of amp's tools are server-dependent (GitHub proxy, Slack, DTW) or IDE-provided (`delete_file`, `format_file`). This plan focuses on the **locally-implementable** tools that provide genuine agent capability improvements.

## Priority Tiers

**Tier 1 — High value, local implementation:**
- `undo_edit` — undo last file edit (requires FileChangeTracker)
- `apply_patch` — apply unified diff patches (Codex patch format)
- `delete_file` — delete a file from disk
- `read_mcp_resource` — read MCP server resources
- `skill` (as agent tool) — agent can load skills by name

**Tier 2 — Moderate value, requires external service:**
- `web_search` — web search (needs API key or provider)
- `read_web_page` — fetch web page content
- `diff` — compare git refs (local git, not GitHub API)

**Tier 3 — Complex sub-agent tools (defer):**
- `code_review` — AI code review sub-agent
- `code_tour` — guided code walkthrough sub-agent
- `read_thread` / `find_thread` — thread cross-referencing
- `task_list` — server-side task management

## Amp Reference Files

| Tool | Amp location | Key function |
|---|---|---|
| `undo_edit` | `modules/2026_tail_anonymous.js:14302` | `RGR()` |
| `apply_patch` | `modules/2026_tail_anonymous.js:13628` | `Q5R()` |
| `delete_file` | IDE-only; `apply_patch` has delete support | `*** Delete File:` in patch format |
| `read_mcp_resource` | `modules/2026_tail_anonymous.js:15886` | `wVR()` |
| `skill` (tool) | `modules/2026_tail_anonymous.js:105692` | `I7R()` |
| `web_search` | `modules/2026_tail_anonymous.js:16242` | `vXR()` — calls `N3.webSearch2` server API |
| `read_web_page` | `modules/2026_tail_anonymous.js:15986` | `XVR()` — calls `N3.extractWebPageContent` server API |
| `diff` | `modules/2026_tail_anonymous.js:141540` | `QGR()` — calls GitHub API proxy |

---

## Tier 1: Core Local Tools

### Tool 1.1: `FileChangeTracker` (prerequisite)

Before implementing `undo_edit`, we need a `FileChangeTracker` to record edit history.

**New file:** `packages/agent-core/src/tools/file-change-tracker.ts`

```typescript
export interface FileChange {
  path: string;
  oldContent: string;
  newContent: string;
  timestamp: number;
}

export class FileChangeTracker {
  private history: Map<string, FileChange[]> = new Map();

  record(path: string, oldContent: string, newContent: string): void;
  getLastEdit(path: string): FileChange | null;
  revertLastEdit(path: string): FileChange | null;  // pops and returns
  getHistory(path: string): FileChange[];
  clear(): void;
}
```

**Amp ref:** Uses `fileChangeTracker` with `record()` / `getLastEdit()` / `revert()`.

**Integration:** Inject `FileChangeTracker` into `WriteTool.execute()` and `EditTool.execute()` via the tool context. Before each write/edit, read current content and call `tracker.record(path, oldContent, newContent)`.

**Wire in container.ts:** Create single `FileChangeTracker` per container, pass to tool context factory.

### Tool 1.2: `undo_edit`

**New file:** `packages/agent-core/src/tools/builtin/undo-edit.ts`

```typescript
export const UndoEditTool: ToolSpec = {
  name: "undo_edit",
  description: "Undo the last edit made to a file. Restores the file to its state before the last edit. Returns a git-style diff showing the changes that were undone.",
  source: "builtin",
  isReadOnly: false,
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute path to the file whose last edit should be undone" }
    },
    required: ["path"]
  },
  executionProfile: undefined,  // dynamic per-file
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Validate path is absolute
2. `const change = context.fileChangeTracker.getLastEdit(args.path)`
3. If null: return error `"No edit history found for file"`
4. Generate diff: `createUnifiedDiff(change.newContent, change.oldContent, args.path)`
5. Write `change.oldContent` to `args.path`
6. Call `context.fileChangeTracker.revertLastEdit(args.path)`
7. Return formatted diff

**Amp ref:** `modules/2026_tail_anonymous.js:14302` — `RGR()` uses per-file mutex, calls `$A()` for diff, `TGR()` for write, `r.revert()` for tracker cleanup.

### Tool 1.3: `delete_file`

**New file:** `packages/agent-core/src/tools/builtin/delete-file.ts`

```typescript
export const DeleteFileTool: ToolSpec = {
  name: "delete_file",
  description: "Delete a file from the filesystem.",
  source: "builtin",
  isReadOnly: false,
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute path to the file to delete" }
    },
    required: ["path"]
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Validate path is absolute, file exists
2. Check guarded files list (deny deletion of `.env`, credentials, etc.)
3. Read current content for undo tracking: `tracker.record(path, content, "")`
4. `fs.unlinkSync(args.path)`
5. Return `"Deleted ${args.path}"`

### Tool 1.4: `read_mcp_resource`

**New file:** `packages/agent-core/src/tools/builtin/read-mcp-resource.ts`

```typescript
export const ReadMcpResourceTool: ToolSpec = {
  name: "read_mcp_resource",
  description: "Read a resource from an MCP server. Use when the user references an MCP resource URI.",
  source: "builtin",
  isReadOnly: true,
  inputSchema: {
    type: "object",
    properties: {
      server: { type: "string", description: "MCP server name" },
      uri: { type: "string", description: "Resource URI to read" }
    },
    required: ["server", "uri"]
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Get MCP client: `context.mcpManager.getClient(args.server)`
2. If not found/connected: return error
3. Call `client.readResource({ uri: args.uri })`
4. Collect text content; for blobs, report `[Binary: mimeType, length]`
5. Truncate at 262144 chars
6. Return content or `"[Empty resource]"`

**Amp ref:** `modules/2026_tail_anonymous.js:15886` — `wVR()`, truncates at `_z = 262144`.

### Tool 1.5: `skill` (agent-callable tool)

**New file:** `packages/agent-core/src/tools/builtin/skill-tool.ts`

```typescript
export function createSkillTool(skillService: SkillService, mcpService?: MCPServerManager, toolService?: ToolRegistry): ToolSpec
```

```typescript
{
  name: "skill",
  description: "Load a specialized skill when the task matches one of the skills listed in the system prompt. Injects the skill's instructions and resources into the conversation.",
  source: "builtin",
  isReadOnly: true,
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The skill name to load" },
      arguments: { type: "string", description: "Optional arguments to pass to the skill" }
    },
    required: ["name"]
  },
  execute: async (args, context) => { ... }
}
```

**Execute logic:**
1. Look up skill: `skillService.list().find(s => s.name === args.name)`
2. If not found: return error `"Skill not found: ${args.name}"`
3. Read skill content: `fs.readFileSync(skill.path, "utf-8")`
4. If skill has `mcp.json` co-located, register those MCP servers
5. Return `{ content: [{ type: "text", text: skillContent }] }`

**Amp ref:** `modules/2026_tail_anonymous.js:105731` — `I7R()` resolves skill, returns content for conversation injection.

---

## Tier 2: External Service Tools

### Tool 2.1: `web_search`

**New file:** `packages/agent-core/src/tools/builtin/web-search.ts`

```typescript
export const WebSearchTool: ToolSpec = {
  name: "web_search",
  description: "Search the web for information relevant to a research objective.",
  source: "builtin",
  isReadOnly: true,
  inputSchema: {
    type: "object",
    properties: {
      objective: { type: "string", description: "Research goal description" },
      search_queries: { type: "array", items: { type: "string" }, description: "Keyword queries" },
      max_results: { type: "number", description: "Max results (default 5)" }
    },
    required: ["objective"]
  },
  execute: async (args, context) => { ... }
};
```

**Implementation options (pick one):**
1. **Brave Search API** — free tier available, JSON API, no browser needed
2. **SearXNG self-hosted** — privacy-focused, free
3. **Stub with guidance** — return "web search not configured" with setup instructions

**Recommended:** Start with option 3 (stub), make it configurable:
- `settings.webSearch.provider`: `"brave" | "searxng" | "none"`
- `settings.webSearch.apiKey`: API key for the provider
- Later implement Brave Search as first real provider

**Amp ref:** `modules/2026_tail_anonymous.js:16242` — calls `N3.webSearch2` (amp server proxy). We can't use amp's server.

### Tool 2.2: `read_web_page`

**New file:** `packages/agent-core/src/tools/builtin/read-web-page.ts`

```typescript
export const ReadWebPageTool: ToolSpec = {
  name: "read_web_page",
  description: "Read the contents of a web page at a given URL, converted to Markdown.",
  source: "builtin",
  isReadOnly: true,
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to fetch" },
      objective: { type: "string", description: "Research goal for excerpt filtering" }
    },
    required: ["url"]
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Validate URL (must be http/https, not localhost)
2. `fetch(args.url)` with 30s timeout
3. Convert HTML to Markdown using `@flitter/tui`'s markdown parser (or a lightweight lib like `turndown`)
4. Truncate to 100k chars
5. Return markdown content

**Note:** Amp proxies through its server for caching and extraction. We do direct fetch.

### Tool 2.3: `diff` (local git)

**New file:** `packages/agent-core/src/tools/builtin/diff.ts`

Reimplemented as a **local git diff** tool (not GitHub API):

```typescript
export const DiffTool: ToolSpec = {
  name: "diff",
  description: "Get a diff between two git commits, branches, or tags in the current repository.",
  source: "builtin",
  isReadOnly: true,
  inputSchema: {
    type: "object",
    properties: {
      base: { type: "string", description: "Base commit/branch/tag" },
      head: { type: "string", description: "Head commit/branch/tag" },
      paths: { type: "array", items: { type: "string" }, description: "Specific file paths to diff" }
    },
    required: ["base", "head"]
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Build command: `git diff ${base}...${head}` (or `git diff ${base} ${head} -- ${paths.join(" ")}`)
2. Run via `child_process.execSync`, capture output
3. Truncate at 100k chars
4. Return diff text

---

## Registration

### Update `packages/agent-core/src/tools/builtin/index.ts`

```typescript
export { UndoEditTool } from "./undo-edit";
export { DeleteFileTool } from "./delete-file";
export { ReadMcpResourceTool } from "./read-mcp-resource";
export { WebSearchTool } from "./web-search";
export { ReadWebPageTool } from "./read-web-page";
export { DiffTool } from "./diff";
export { createSkillTool } from "./skill-tool";
```

### Update `packages/flitter/src/container.ts`

In `createContainer`:
```typescript
// After existing registerBuiltinTools
const fileChangeTracker = new FileChangeTracker();
toolRegistry.register(UndoEditTool);
toolRegistry.register(DeleteFileTool);
toolRegistry.register(ReadMcpResourceTool);
toolRegistry.register(WebSearchTool);
toolRegistry.register(ReadWebPageTool);
toolRegistry.register(DiffTool);
toolRegistry.register(createSkillTool(skillService, mcpServerManager, toolRegistry));
```

Wire `fileChangeTracker` into tool context so Edit/Write tools can call `tracker.record()`.

---

## Test Strategy

- **FileChangeTracker:** Unit test record/revert/getLastEdit with multiple files and multiple edits
- **undo_edit:** Unit test with mocked tracker and filesystem; verify diff output format
- **delete_file:** Unit test with temp dir; verify guarded files rejection
- **read_mcp_resource:** Unit test with mocked MCP client; verify truncation at 262144
- **skill tool:** Unit test with mocked SkillService; verify content injection
- **web_search:** Test stub returns guidance message; test with mock provider
- **diff:** Integration test with temp git repo; verify diff output
- **apply_patch:** Unit test patch parsing and application (complex — needs Codex patch format parser)

## Estimated Scope

| Tool | Complexity | New files | Deps |
|---|---|---|---|
| FileChangeTracker | Low | 1 | None |
| undo_edit | Medium | 1 | FileChangeTracker |
| delete_file | Low | 1 | FileChangeTracker |
| read_mcp_resource | Low | 1 | MCPServerManager |
| skill (tool) | Medium | 1 | SkillService |
| web_search | Medium (stub: Low) | 1 | Config for provider |
| read_web_page | Medium | 1 | fetch + HTML→MD |
| diff (local) | Low | 1 | git CLI |
