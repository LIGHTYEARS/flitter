/**
 * find_thread tool — Search threads by query.
 *
 * 逆向: chunk-005.js:147050-147104 (iGR spec, rGR fn)
 *   - name: ck = "find_thread"
 *   - inputSchema: { query (required), limit (optional, default 20) }
 *   - description: Find Amp threads using a query DSL
 *   - Supports: keywords, file:path, repo:url, author:name, after:date, before:date
 *   - Factory-created tool (needs ThreadStore)
 *
 * 逆向: chunk-005.js:71164 — included in Q2 (oracle tools) but NOT in KsT (finder)
 */

import { createLogger } from "@flitter/util";
import { parseThreadQuery } from "../../data/thread-search-dsl";
import type { ToolContext, ToolResult, ToolSpec } from "../types";
import type { ThreadStoreLike } from "./read-thread";

const log = createLogger("tool:find_thread");

/** Default max results */
const DEFAULT_LIMIT = 20;

/**
 * Collect searchable text parts from a snapshot (title + message text blocks).
 */
function collectTextParts(snapshot: {
  title?: string;
  messages: Array<{ content: unknown }>;
}): string[] {
  const parts: string[] = [];
  if (snapshot.title) parts.push(snapshot.title);

  for (const msg of snapshot.messages) {
    const content = (msg as { content: unknown }).content;
    if (typeof content === "string") {
      parts.push(content);
    } else if (Array.isArray(content)) {
      for (const block of content as Array<Record<string, unknown>>) {
        if (block.type === "text" && typeof block.text === "string") {
          parts.push(block.text as string);
        }
      }
    }
  }

  return parts;
}

/**
 * Local thread search using the DSL parser.
 *
 * 逆向: chunk-005.js:147059-147070 (amp find_thread DSL spec)
 *   amp's rGR calls the server-side /api/threads/find. This local implementation
 *   parses the same DSL and applies structured filters against cached snapshots.
 *
 * Filters applied:
 *   - keywords: case-insensitive substring match in title + message text; scored
 *   - file:     substring match in full text (file paths appear in tool args/results)
 *   - repo:     substring match in full text (repo URLs appear in environment/messages)
 *   - author:   substring match in creatorUserID (or "me" matches any)
 *   - after:    thread userLastInteractedAt >= date (or snapshot.created)
 *   - before:   thread userLastInteractedAt < date
 *   - is:archived → snapshot.archived === true
 *   - label:    snapshot.labels array contains label (case-insensitive)
 *
 * All filters are AND-combined. A thread must pass all filters.
 */
function searchThreads(
  threadStore: ThreadStoreLike,
  query: string,
  limit: number,
): Array<{ id: string; title: string | null; snippet: string }> {
  const parsed = parseThreadQuery(query);
  const { keywords, file, repo, author, after, before, isArchived, label } = parsed;

  const results: Array<{
    id: string;
    title: string | null;
    snippet: string;
    score: number;
  }> = [];

  for (const id of threadStore.getCachedThreadIds()) {
    const snapshot = threadStore.getThreadSnapshot(id);
    if (!snapshot) continue;

    // Build searchable text from thread
    const parts = collectTextParts(
      snapshot as { title?: string; messages: Array<{ content: unknown }> },
    );
    const fullText = parts.join(" ").toLowerCase();

    // ── Structured filters (AND logic) ────────────────────

    // is:archived filter
    if (isArchived !== undefined) {
      const snapshotArchived = (snapshot as { archived?: boolean }).archived === true;
      if (snapshotArchived !== isArchived) continue;
    }

    // label: filter
    if (label !== undefined) {
      const snapshotLabels = ((snapshot as { labels?: string[] }).labels ?? []).map((l) =>
        l.toLowerCase(),
      );
      if (!snapshotLabels.includes(label.toLowerCase())) continue;
    }

    // file: filter — substring match in full message text
    // (file paths appear in tool_use inputs and tool_result outputs)
    if (file !== undefined) {
      if (!fullText.includes(file.toLowerCase())) continue;
    }

    // repo: filter — substring match in full text
    if (repo !== undefined) {
      if (!fullText.includes(repo.toLowerCase())) continue;
    }

    // author: filter — check creatorUserID or "me" special case
    if (author !== undefined && author !== "me") {
      const creatorId = (
        (snapshot as { creatorUserID?: string }).creatorUserID ?? ""
      ).toLowerCase();
      if (!creatorId.includes(author.toLowerCase())) continue;
    }
    // author:me → no server-side user ID available locally; include all threads

    // after: / before: filters — use userLastInteractedAt timestamp from threadStore
    // Fall back to snapshot.created (milliseconds) if entry not available
    const snapshotCreated = (snapshot as { created?: number }).created;
    // ThreadEntry.userLastInteractedAt is available if threadStore exposes entries
    // We look up the entry's timestamp via the store if the method exists
    const entryTime: number | undefined = (() => {
      const store = threadStore as {
        getThreadEntry?: (id: string) => { userLastInteractedAt?: number } | undefined;
      };
      if (typeof store.getThreadEntry === "function") {
        return store.getThreadEntry(id)?.userLastInteractedAt;
      }
      return undefined;
    })();
    const timestamp = entryTime ?? snapshotCreated;

    if (after !== undefined && timestamp !== undefined) {
      if (timestamp < after.getTime()) continue;
    }

    if (before !== undefined && timestamp !== undefined) {
      if (timestamp >= before.getTime()) continue;
    }

    // ── Keyword scoring ───────────────────────────────────

    if (keywords.length > 0) {
      let score = 0;
      for (const kw of keywords) {
        if (fullText.includes(kw.toLowerCase())) score++;
      }
      if (score === 0) continue;

      const snippetSource = parts.find((p) =>
        keywords.some((kw) => p.toLowerCase().includes(kw.toLowerCase())),
      );
      const snippet = snippetSource ? snippetSource.slice(0, 200) : (parts[0]?.slice(0, 200) ?? "");

      results.push({ id, title: (snapshot as { title?: string }).title ?? null, snippet, score });
    } else {
      // No keywords → structured-filter-only match; score = 1
      const snippet = parts[0]?.slice(0, 200) ?? "";
      results.push({
        id,
        title: (snapshot as { title?: string }).title ?? null,
        snippet,
        score: 1,
      });
    }
  }

  // Sort by score descending, then by ID for determinism
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return results.slice(0, limit);
}

/**
 * Factory: create a find_thread ToolSpec bound to a ThreadStore.
 *
 * 逆向: iGR.fn (rGR) uses the tool environment's threadStore and search API.
 */
export function createFindThreadTool(threadStore: ThreadStoreLike): ToolSpec {
  return {
    name: "find_thread",
    description: `Find threads (conversation threads) using a search query DSL.

## What this tool finds

This tool searches **threads** (conversations), NOT git commits. Use this when the user asks about threads, conversations, or history.

## Query syntax

- **Keywords**: Bare words or quoted phrases for text search: \`auth\` or \`"race condition"\`
- **File filter**: \`file:path\` to find threads that touched a file: \`file:src/auth/login.ts\`
- **Repo filter**: \`repo:url\` to scope to a repository: \`repo:github.com/owner/repo\` or \`repo:owner/repo\`
- **Author filter**: \`author:name\` to find threads by a user: \`author:alice\` or \`author:me\` for your own threads
- **Date filters**: \`after:date\` and \`before:date\` to filter by date: \`after:2024-01-15\`, \`after:7d\`, \`before:2w\`
- **Archived filter**: \`is:archived\` to find only archived threads
- **Label filter**: \`label:name\` to filter by label: \`label:bug\`
- **Combine filters**: Use implicit AND: \`auth file:src/foo.ts repo:amp after:7d\`

All matching is case-insensitive. File paths use partial matching. Date formats: ISO dates (\`2024-01-15\`), relative days (\`7d\`), or weeks (\`2w\`).

## Examples

- \`auth file:src/login.ts\` — threads mentioning auth that touched login.ts
- \`"race condition" after:7d\` — threads mentioning "race condition" in the last 7 days
- \`author:me is:archived\` — your own archived threads
- \`label:bug before:2w\` — threads labeled bug from more than 2 weeks ago

## When to use this tool

- "which thread touched this file" / "which thread modified this file"
- "what thread last changed X" / "find the thread that edited X"
- "find threads about X" / "search threads mentioning Y"
- Any question about thread history or previous conversations
- When the user says "thread" and is referring to work, not git commits

## When NOT to use this tool

- If the user asks about git commits, git history, or git blame — use git commands instead
- If the user wants to know WHO (a person) made changes — use git log`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query using DSL syntax. Supports keywords, file:path, repo:url, author:name, after:date, before:date, is:archived, and label:name filters.",
        },
        limit: {
          type: "number",
          description: "Maximum number of threads to return. Defaults to 20.",
        },
      },
      required: ["query"],
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: {
      resourceKeys: [],
    },

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const query = args.query as string;
      const limit = (args.limit as number) ?? DEFAULT_LIMIT;

      if (!query || typeof query !== "string") {
        return { status: "error", error: "Missing required field: query" };
      }

      log.debug("find_thread called", { query, limit });

      // Try remote FTS5 search first if available
      // 逆向: amp rGR calls fi(`/api/threads/find?q=...&limit=...`)
      let results: Array<{ id: string; title: string | null; snippet: string }>;

      if (threadStore.searchRemote) {
        try {
          const remoteResults = await threadStore.searchRemote(query, limit);
          if (remoteResults !== null) {
            log.debug("Remote search returned results", { count: remoteResults.length });
            results = remoteResults.map((r) => ({
              id: r.id,
              title: r.title,
              snippet: `${r.messageCount} messages, updated ${new Date(r.updatedAt).toISOString()}`,
            }));
          } else {
            // Remote returned null → fall back to local
            results = searchThreads(threadStore, query, limit);
          }
        } catch (err) {
          // Remote search failed → fall back to local
          log.debug("Remote search failed, falling back to local", { error: String(err) });
          results = searchThreads(threadStore, query, limit);
        }
      } else {
        results = searchThreads(threadStore, query, limit);
      }

      if (results.length === 0) {
        return {
          status: "done",
          content: `No threads found matching: "${query}"`,
        };
      }

      const formatted = results
        .map((r, i) => `${i + 1}. **${r.title ?? "(untitled)"}** (${r.id})\n   ${r.snippet}`)
        .join("\n\n");

      return {
        status: "done",
        content: `Found ${results.length} thread(s) matching "${query}":\n\n${formatted}`,
      };
    },
  };
}
