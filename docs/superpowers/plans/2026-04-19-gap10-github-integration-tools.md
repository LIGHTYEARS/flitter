# Gap 10: GitHub Integration Tools

> Implementation plan for GitHub repository tools that the agent can use.

## Overview

Amp has 7 GitHub tools that allow the agent to read files, search code, browse commits, list directories, glob patterns, compare diffs, and check CI status — all on remote GitHub repositories without cloning. Amp proxies these through its server; flitter will call the GitHub API directly using the user's GitHub token.

## Amp Reference

| Tool | Amp module | API endpoint |
|---|---|---|
| `read_github` | `modules/0015_unknown_HGR.js` | `repos/{owner/repo}/contents/{path}` |
| `search_github` | `modules/0016_unknown_WGR.js` | `search/code?q=...` |
| `commit_search` | `modules/0017_unknown_FGR.js` | `repos/{r}/commits` or `search/commits?q=...` |
| `list_directory_github` | `modules/0017_unknown_qGR.js` | `repos/{owner/repo}/contents/{path}` (dir) |
| `glob_github` | `modules/0018_unknown_zGR.js` | `repos/{r}/git/trees/HEAD?recursive=1` + filter |
| `diff` | `modules/0020_unknown_GGR.js` | `repos/{r}/compare/{base}...{head}` |
| `list_repositories` | `modules/0021_unknown_KGR.js` | `user/repos` + `search/repositories?q=...` |
| `github_repo_ci_status` | Server-side only | Not in client bundle |

## Design

### Authentication

Flitter will use a GitHub Personal Access Token (PAT) stored in the config:

```typescript
// Settings
"github.token": z.string().optional(),  // or GITHUB_TOKEN env var
```

Resolution order:
1. `GITHUB_TOKEN` env var (CI-friendly)
2. `settings["github.token"]`
3. `gh auth token` (if `gh` CLI is installed)

**New utility:** `packages/agent-core/src/tools/github/github-client.ts`

```typescript
export class GitHubClient {
  private token: string;
  private baseUrl = "https://api.github.com";

  constructor(token: string) { this.token = token; }

  async get(path: string, options?: { accept?: string }): Promise<unknown> {
    const resp = await fetch(`${this.baseUrl}/${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: options?.accept ?? "application/vnd.github.v3+json",
        "User-Agent": "flitter-cli",
      },
    });
    if (!resp.ok) throw new GitHubApiError(resp.status, await resp.text());
    return resp.json();
  }
}
```

### Tool: `read_github`

**New file:** `packages/agent-core/src/tools/github/read-github.ts`

```typescript
export const ReadGitHubTool: ToolSpec = {
  name: "read_github",
  description: "Read file contents from a GitHub repository. Supports reading individual files and directory listings.",
  source: "builtin",
  isReadOnly: true,
  inputSchema: {
    type: "object",
    properties: {
      repository: { type: "string", description: "GitHub repository (owner/repo or full URL)" },
      path: { type: "string", description: "File path within the repository" },
      ref: { type: "string", description: "Branch, tag, or commit SHA (default: default branch)" },
      read_range: { type: "array", items: { type: "number" }, description: "[startLine, endLine] (1-indexed)" },
    },
    required: ["repository", "path"],
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Parse repository: `parseRepo(args.repository)` → `{ owner, repo }`
2. Call `GET repos/{owner}/{repo}/contents/{path}?ref={ref}`
3. If file: base64-decode content, apply `read_range` if specified
4. If directory: return listing as formatted table
5. Truncate at 100k chars

**Amp ref:** `modules/0015_unknown_HGR.js` — `HGR()` handles files (base64), directories, and read_range slicing.

### Tool: `search_github`

**New file:** `packages/agent-core/src/tools/github/search-github.ts`

```typescript
export const SearchGitHubTool: ToolSpec = {
  name: "search_github",
  description: "Search code within a GitHub repository.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Search pattern (GitHub code search syntax)" },
      repository: { type: "string", description: "Repository (owner/repo)" },
      path: { type: "string", description: "Restrict to files matching this path" },
      per_page: { type: "number", description: "Results per page (default 10, max 100)" },
    },
    required: ["pattern", "repository"],
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Build query: `GET search/code?q=${pattern} repo:${repo} path:${path}`
2. Use `Accept: application/vnd.github.v3.text-match+json` for text match highlights
3. Format results: file path, line number (if available), matched text fragments

**Amp ref:** `modules/0016_unknown_WGR.js` — `WGR()`.

### Tool: `commit_search`

**New file:** `packages/agent-core/src/tools/github/commit-search.ts`

```typescript
export const CommitSearchTool: ToolSpec = {
  name: "commit_search",
  description: "Search commit history in a GitHub repository by message, author, date, or path.",
  inputSchema: {
    type: "object",
    properties: {
      repository: { type: "string", description: "Repository (owner/repo)" },
      text: { type: "string", description: "Search text in commit messages" },
      author: { type: "string", description: "Filter by author" },
      path: { type: "string", description: "Filter by file path" },
      since: { type: "string", description: "ISO 8601 date (commits after)" },
      until: { type: "string", description: "ISO 8601 date (commits before)" },
      per_page: { type: "number", description: "Results per page (default 20)" },
    },
    required: ["repository"],
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
- If `text` provided: use `GET search/commits?q=${text} repo:${repo} author:${author} author-date:${since}..${until}`
- Otherwise: use `GET repos/{owner}/{repo}/commits?path=${path}&since=${since}&until=${until}&author=${author}`

**Amp ref:** `modules/0019_unknown_FGR.js` — `FGR()` uses two code paths.

### Tool: `list_directory_github`

**New file:** `packages/agent-core/src/tools/github/list-directory-github.ts`

Same API as `read_github` for directories but returns a formatted listing with file types and sizes.

### Tool: `glob_github`

**New file:** `packages/agent-core/src/tools/github/glob-github.ts`

```typescript
export const GlobGitHubTool: ToolSpec = {
  name: "glob_github",
  description: "Find files in a GitHub repository matching a glob pattern.",
  inputSchema: {
    type: "object",
    properties: {
      repository: { type: "string", description: "Repository (owner/repo)" },
      pattern: { type: "string", description: "Glob pattern (e.g. 'src/**/*.ts')" },
      ref: { type: "string", description: "Branch/tag/SHA" },
    },
    required: ["repository", "pattern"],
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. Fetch full tree: `GET repos/{owner}/{repo}/git/trees/{ref}?recursive=1`
2. Filter `tree` entries against glob pattern using `minimatch` or simple glob matcher
3. Return matched paths

**Amp ref:** `modules/0018_unknown_zGR.js` — `zGR()` fetches recursive tree, filters with glob.

### Tool: `diff` (GitHub)

Rename the local git diff tool from Gap 2 to `git_diff`, and add this as `github_diff`:

```typescript
export const GitHubDiffTool: ToolSpec = {
  name: "github_diff",
  description: "Compare two commits/branches/tags in a GitHub repository.",
  inputSchema: {
    type: "object",
    properties: {
      repository: { type: "string", description: "Repository (owner/repo)" },
      base: { type: "string", description: "Base ref" },
      head: { type: "string", description: "Head ref" },
      includePatches: { type: "boolean", description: "Include unified diff patches (token heavy)" },
    },
    required: ["repository", "base", "head"],
  },
  execute: async (args, context) => { ... }
};
```

**Execute logic:**
1. `GET repos/{owner}/{repo}/compare/{base}...{head}`
2. Return file change summary; if `includePatches`, include truncated patch text per file

### Tool: `list_repositories`

```typescript
export const ListRepositoriesTool: ToolSpec = {
  name: "list_repositories",
  description: "List repositories for the authenticated user, or search repositories by name.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query (optional — lists user repos if omitted)" },
      per_page: { type: "number", description: "Results per page (default 20)" },
    },
  },
  execute: async (args, context) => { ... }
};
```

---

## Registration

### Conditional registration based on token availability

```typescript
// In container.ts
const githubToken = process.env.GITHUB_TOKEN
  ?? config.settings["github.token"]
  ?? await tryGetGhToken();

if (githubToken) {
  const client = new GitHubClient(githubToken);
  toolRegistry.register(createReadGitHubTool(client));
  toolRegistry.register(createSearchGitHubTool(client));
  toolRegistry.register(createCommitSearchTool(client));
  toolRegistry.register(createListDirectoryGitHubTool(client));
  toolRegistry.register(createGlobGitHubTool(client));
  toolRegistry.register(createGitHubDiffTool(client));
  toolRegistry.register(createListRepositoriesTool(client));
}
```

Each tool is a factory function that closes over the `GitHubClient`.

### Helper: try `gh auth token`

```typescript
async function tryGetGhToken(): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync("gh auth token");
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}
```

---

## Config Changes

**File:** `packages/schemas/src/config.ts`

```typescript
"github.token": z.string().optional(),
```

---

## Rate Limiting

GitHub API has rate limits (5000/hour for authenticated, 60/hour for unauthenticated). Add basic rate limit handling:

```typescript
// In GitHubClient.get()
if (resp.status === 403 || resp.status === 429) {
  const resetTime = resp.headers.get("x-ratelimit-reset");
  throw new GitHubRateLimitError(resetTime);
}
```

The tool execution returns a helpful error message: "GitHub API rate limit exceeded. Resets at {time}."

---

## Test Strategy

- **GitHubClient:** Mock fetch, verify headers, error handling
- **read_github:** Mock API response with base64 file content, verify decode
- **search_github:** Mock search API response, verify result formatting
- **glob_github:** Mock tree API, verify glob filtering
- **Rate limiting:** Mock 403 response, verify error message
- **Token resolution:** Mock env vars and `gh` CLI
- **Integration (optional):** Real API calls against a public repo (gated by env var)

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| GitHubClient | 1 new | Medium |
| read_github | 1 new | Medium |
| search_github | 1 new | Medium |
| commit_search | 1 new | Medium |
| list_directory_github | 1 new | Low |
| glob_github | 1 new | Medium |
| github_diff | 1 new | Low |
| list_repositories | 1 new | Low |
| Container wiring | 1 modified | Low |
| Config schema | 1 modified | Low |
| Tests | 4-5 new | Medium |

## Note on Bitbucket Enterprise

Amp also has Bitbucket Enterprise tools with identical structure but different API. These can follow the same pattern — a `BitbucketClient` with the same tool shapes. Deferred to a later phase since it's a lower-priority gap.
