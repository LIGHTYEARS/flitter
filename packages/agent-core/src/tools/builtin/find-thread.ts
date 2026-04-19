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
import type { ThreadSnapshot } from "@flitter/schemas";
import type { ToolContext, ToolResult, ToolSpec } from "../types";
import type { ThreadStoreLike } from "./read-thread";

const log = createLogger("tool:find_thread");

/** Default max results */
const DEFAULT_LIMIT = 20;

/**
 * Simple thread search: match query keywords against thread title and message text.
 *
 * 逆向: amp has a full query DSL parser (keywords, file:, repo:, author:, after:, before:).
 * Flitter: simplified — case-insensitive keyword matching against thread content.
 * Full DSL can be added later.
 */
function searchThreads(
  threadStore: ThreadStoreLike,
  query: string,
  limit: number,
): Array<{ id: string; title: string | null; snippet: string }> {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
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
    const parts: string[] = [];
    if (snapshot.title) parts.push(snapshot.title);

    for (const msg of snapshot.messages) {
      const content = (msg as { content: unknown }).content;
      if (typeof content === "string") {
        parts.push(content);
      } else if (Array.isArray(content)) {
        for (const block of content as Array<Record<string, unknown>>) {
          if (block.type === "text" && typeof block.text === "string") {
            parts.push(block.text);
          }
        }
      }
    }

    const fullText = parts.join(" ").toLowerCase();

    // Score: count how many keywords match
    let score = 0;
    for (const kw of keywords) {
      if (fullText.includes(kw)) score++;
    }

    if (score > 0) {
      // Extract a snippet (first 200 chars of first matching content)
      const snippetSource = parts.find((p) =>
        keywords.some((kw) => p.toLowerCase().includes(kw)),
      );
      const snippet = snippetSource
        ? snippetSource.slice(0, 200)
        : parts[0]?.slice(0, 200) ?? "";

      results.push({
        id,
        title: snapshot.title ?? null,
        snippet,
        score,
      });
    }
  }

  // Sort by score descending, then by ID
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
    description: `Find threads (conversation threads) using a search query.

## What this tool finds

This tool searches **threads** (conversations), NOT git commits. Use this when the user asks about threads, conversations, or history.

## Query syntax

- **Keywords**: Bare words or quoted phrases for text search: \`auth\` or \`"race condition"\`

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
          description: "Search query. Supports keywords for text search.",
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

      const results = searchThreads(threadStore, query, limit);

      if (results.length === 0) {
        return {
          status: "done",
          content: `No threads found matching: "${query}"`,
        };
      }

      const formatted = results
        .map(
          (r, i) =>
            `${i + 1}. **${r.title ?? "(untitled)"}** (${r.id})\n   ${r.snippet}`,
        )
        .join("\n\n");

      return {
        status: "done",
        content: `Found ${results.length} thread(s) matching "${query}":\n\n${formatted}`,
      };
    },
  };
}
