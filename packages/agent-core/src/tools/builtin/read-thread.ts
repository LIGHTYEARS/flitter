/**
 * read_thread tool — Read and extract relevant content from another thread.
 *
 * 逆向: chunk-005.js:149068-149112 (GVR spec, zVR fn)
 *   - name: Ij = "read_thread"
 *   - inputSchema: { threadID (required), goal (required) }
 *   - description: Fetch thread locally or from server, render as markdown,
 *     extract only relevant info using AI
 *   - Factory-created tool (needs ThreadStore)
 *
 * 逆向: chunk-005.js:71164 — included in Q2 (oracle tools)
 */

import { createLogger } from "@flitter/util";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:read_thread");

/**
 * Minimal interface for ThreadStore dependency.
 * Avoids coupling to the concrete ThreadStore class.
 */
export interface ThreadStoreLike {
  getThreadSnapshot(id: string): ThreadSnapshot | undefined;
  getCachedThreadIds(): string[];
}

/**
 * Render a thread snapshot as readable text for LLM consumption.
 *
 * 逆向: amp renders thread as markdown with role labels and tool results.
 * Flitter: simplified rendering — role: content lines.
 */
function renderThread(snapshot: ThreadSnapshot): string {
  const lines: string[] = [];
  lines.push(`# Thread: ${snapshot.title ?? snapshot.id}`);
  lines.push(`ID: ${snapshot.id}`);
  lines.push("");

  for (const msg of snapshot.messages) {
    const role = (msg as { role: string }).role;
    const content = (msg as { content: unknown }).content;

    if (typeof content === "string") {
      lines.push(`## ${role}`);
      lines.push(content);
      lines.push("");
    } else if (Array.isArray(content)) {
      lines.push(`## ${role}`);
      for (const block of content as Array<Record<string, unknown>>) {
        if (block.type === "text" && typeof block.text === "string") {
          lines.push(block.text);
        } else if (block.type === "tool_use") {
          lines.push(`[Tool: ${block.name}]`);
        } else if (block.type === "tool_result") {
          const resultContent =
            typeof block.content === "string"
              ? block.content
              : JSON.stringify(block.content);
          lines.push(`[Tool Result: ${resultContent.slice(0, 500)}]`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Parse a thread ID from a URL or raw ID string.
 *
 * 逆向: amp supports both T-{uuid} format and full ampcode.com URLs
 * whose last path segment is T-{uuid}.
 * Flitter: adapted for flitter thread IDs (any string).
 */
function parseThreadId(input: string): string {
  // Try to extract T-{uuid} from URL
  const urlMatch = input.match(/T-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (urlMatch) return urlMatch[0];

  // Strip leading @ if present (amp supports @T-abc123)
  if (input.startsWith("@")) return input.slice(1);

  return input;
}

/**
 * Factory: create a read_thread ToolSpec bound to a ThreadStore.
 *
 * 逆向: GVR.fn (zVR) uses the tool environment's threadStore.
 */
export function createReadThreadTool(threadStore: ThreadStoreLike): ToolSpec {
  return {
    name: "read_thread",
    description: `Read and extract relevant content from another thread by its ID.

This tool fetches a thread from the local store, renders it as text, and returns the content. Use the goal parameter to describe what information you need.

## When to use this tool

- When the user references a thread ID
- When the user asks to "apply the same approach from [thread]"
- When the user says "do what we did in [thread]"
- When you need to extract specific information from a referenced thread

## When NOT to use this tool

- When no thread ID is mentioned
- When working within the current thread (context is already available)

## Parameters

- **threadID**: The thread identifier (e.g., "T-a38f981d-52da-47b1-818c-fbaa9ab56e0c")
- **goal**: A clear description of what information you're looking for in that thread. Be specific about what you need to extract.`,
    inputSchema: {
      type: "object",
      properties: {
        threadID: {
          type: "string",
          description: "The thread ID to read",
        },
        goal: {
          type: "string",
          description:
            "A clear description of what information you need from the thread. Be specific about what to extract.",
        },
      },
      required: ["threadID", "goal"],
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: {
      resourceKeys: [],
    },

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const rawThreadId = args.threadID as string;
      const goal = args.goal as string;

      if (!rawThreadId || typeof rawThreadId !== "string") {
        return { status: "error", error: "Missing required field: threadID" };
      }
      if (!goal || typeof goal !== "string") {
        return { status: "error", error: "Missing required field: goal" };
      }

      const threadId = parseThreadId(rawThreadId);
      log.debug("read_thread called", { threadId, goal });

      const snapshot = threadStore.getThreadSnapshot(threadId);
      if (!snapshot) {
        return {
          status: "error",
          error: `Thread "${threadId}" not found in local store. Available threads: ${threadStore.getCachedThreadIds().slice(0, 10).join(", ") || "none"}`,
        };
      }

      const rendered = renderThread(snapshot);

      // 逆向: amp uses AI to extract relevant excerpts when goal is provided.
      // Flitter: return the full rendered thread with the goal as context.
      // A future enhancement could use a sub-agent to extract excerpts.
      const content = `Goal: ${goal}\n\n${rendered}`;

      return { status: "done", content };
    },
  };
}
