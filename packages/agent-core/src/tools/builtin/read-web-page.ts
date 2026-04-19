/**
 * read_web_page tool — Fetch a URL and return its contents as markdown.
 *
 * 逆向: chunk-005.js:149131-149167 (ZVR spec, XVR fn)
 *   - name: Cb = "read_web_page"
 *   - inputSchema: { url (required), objective (optional), forceRefetch (optional) }
 *   - description: Fetch URL, convert HTML to markdown; with objective, return excerpts
 *   - Warning: Do NOT use for localhost/local URLs
 *
 * 逆向: chunk-005.js:71164 — included in Q2 (oracle tools), VsT (task-subagent), XsT (code-review)
 */

import { createLogger } from "@flitter/util";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:read_web_page");

/** Maximum content length to return (avoid blowing up context) */
const MAX_CONTENT_LENGTH = 100_000;

/** Default timeout for HTTP fetch (ms) */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Simple HTML-to-text conversion.
 * Strips tags, decodes common entities, normalizes whitespace.
 * Not a full markdown converter but sufficient for LLM consumption.
 *
 * 逆向: amp uses a full HTML-to-markdown library; Flitter uses a lightweight
 * approach that strips tags and preserves text structure.
 */
function htmlToText(html: string): string {
  // Remove script and style blocks entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Convert common block elements to newlines
  text = text.replace(/<\/?(p|div|br|hr|h[1-6]|li|tr|section|article|header|footer|nav|main)[^>]*>/gi, "\n");

  // Convert links: <a href="url">text</a> → [text](url)
  text = text.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Normalize whitespace: collapse multiple blank lines, trim lines
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/**
 * read_web_page ToolSpec — static (no factory needed).
 *
 * 逆向: chunk-005.js:149131 ZVR.spec
 */
export const ReadWebPageTool: ToolSpec = {
  name: "read_web_page",
  description: `Read the contents of a web page at a given URL.

When only the url parameter is set, it returns the contents of the webpage converted to Markdown.

When an objective is provided, it returns excerpts relevant to that objective.

If the user asks for the latest or recent contents, pass \`forceRefetch: true\` to ensure the latest content is fetched.

Do NOT use for access to localhost or any other local or non-Internet-accessible URLs; use \`curl\` via the Bash instead.

## Examples

- Summarize recent changes for a library. Force refresh because freshness is important:
  url: "https://example.com/changelog"
  objective: "Summarize the API changes in this software library."
  forceRefetch: true

- Extract all text content from a web page:
  url: "https://example.com/docs/getting-started"`,
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL of the web page to read",
      },
      objective: {
        type: "string",
        description:
          "A natural-language description of the research goal. If set, only relevant excerpts will be returned. If not set, the full content of the web page will be returned.",
      },
      forceRefetch: {
        type: "boolean",
        description:
          "Force a live fetch of the URL (default: use a cached version that may be a few days old)",
      },
    },
    required: ["url"],
  },
  source: "builtin",
  isReadOnly: true,
  executionProfile: {
    resourceKeys: [{ key: "network", mode: "read" }],
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const url = args.url as string;
    const objective = args.objective as string | undefined;

    if (!url || typeof url !== "string") {
      return { status: "error", error: "Missing required field: url" };
    }

    // 逆向: amp blocks localhost access
    try {
      const parsed = new URL(url);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "::1" ||
        parsed.hostname === "0.0.0.0"
      ) {
        return {
          status: "error",
          error:
            "Cannot fetch local URLs. Use `curl` via the Bash tool for localhost access.",
        };
      }
    } catch {
      return { status: "error", error: `Invalid URL: ${url}` };
    }

    log.debug("read_web_page called", { url, objective });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      // Forward abort from parent signal
      if (context.signal.aborted) {
        clearTimeout(timeout);
        return { status: "cancelled", error: "Cancelled" };
      }
      const onAbort = () => controller.abort();
      context.signal.addEventListener("abort", onAbort, { once: true });

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Flitter/1.0 (CLI Agent)",
            Accept: "text/html, application/xhtml+xml, text/plain, */*",
          },
          redirect: "follow",
        });

        clearTimeout(timeout);
        context.signal.removeEventListener("abort", onAbort);

        if (!response.ok) {
          return {
            status: "error",
            error: `HTTP ${response.status} ${response.statusText} for ${url}`,
          };
        }

        const contentType = response.headers.get("content-type") ?? "";
        const rawBody = await response.text();

        // Convert HTML to text, pass through plain text
        let content: string;
        if (contentType.includes("text/html") || contentType.includes("xhtml")) {
          content = htmlToText(rawBody);
        } else {
          content = rawBody;
        }

        // Truncate to avoid blowing up context
        // 逆向: amp uses tuT=2000 and cz=1e6 constants for truncation
        if (content.length > MAX_CONTENT_LENGTH) {
          content =
            content.slice(0, MAX_CONTENT_LENGTH) +
            `\n\n[Content truncated at ${MAX_CONTENT_LENGTH} characters. Use Bash with curl for the full page.]`;
        }

        // If objective is set, add context about what was requested
        if (objective) {
          content = `# Web page content from ${url}\n\nObjective: ${objective}\n\n${content}`;
        } else {
          content = `# Web page content from ${url}\n\n${content}`;
        }

        return { status: "done", content };
      } catch (err) {
        clearTimeout(timeout);
        context.signal.removeEventListener("abort", onAbort);

        if (
          err instanceof Error &&
          (err.name === "AbortError" || context.signal.aborted)
        ) {
          return { status: "cancelled", error: "Fetch request cancelled" };
        }
        throw err;
      }
    } catch (err) {
      log.debug("read_web_page error", { error: err });
      return {
        status: "error",
        error: `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
