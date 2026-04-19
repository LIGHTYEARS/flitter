/**
 * web_search tool — Search the web for information relevant to a research objective.
 *
 * 逆向: chunk-005.js:149714-149741 (OXR spec, vXR fn)
 *   - name: QS = "web_search"
 *   - description: SXR template string referencing read_web_page (Cb)
 *   - inputSchema: { objective (required), search_queries (optional), max_results (optional) }
 *   - Internally calls a search API endpoint and returns structured results
 *   - Default max results: iFT (not found explicitly, using 10 as reasonable default)
 *
 * 逆向: chunk-005.js:71164 — tool list: Q2 includes "web_search"
 *   KsT (finder tools) does NOT include web_search
 *   VsT (task-subagent) includes web_search
 */

import { createLogger } from "@flitter/util";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:web_search");

/** Default max results when not specified */
const DEFAULT_MAX_RESULTS = 10;

/** Search result returned by the external API */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * web_search ToolSpec — static (no factory needed, no DI deps).
 *
 * 逆向: chunk-005.js:149714 OXR.spec
 * The actual search is delegated to an external API. In Flitter, we use
 * a configurable endpoint (settings["web_search.endpoint"]) or fall back
 * to a stub that returns an error instructing the user to configure one.
 */
export const WebSearchTool: ToolSpec = {
  name: "web_search",
  description: `Search the web for information relevant to a research objective.

Use when you need up-to-date or precise documentation. Use \`read_web_page\` to fetch full content from a specific URL.

## Examples

- Get API documentation for a specific provider:
  objective: "I want to know the request fields for the Stripe billing create customer API. Prefer Stripe's docs site."

- See usage documentation for newly released library features:
  objective: "I want to know how to use SvelteKit remote functions, which is a new feature shipped in the last month."
  search_queries: ["sveltekit", "remote function"]`,
  inputSchema: {
    type: "object",
    properties: {
      objective: {
        type: "string",
        description:
          "A natural-language description of the broader task or research goal, including any source or freshness guidance",
      },
      search_queries: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional keyword queries to ensure matches for specific terms are prioritized (recommended for best results)",
      },
      max_results: {
        type: "number",
        description: `The maximum number of results to return (default: ${DEFAULT_MAX_RESULTS})`,
      },
    },
    required: ["objective"],
  },
  source: "builtin",
  isReadOnly: true,
  executionProfile: {
    resourceKeys: [{ key: "network", mode: "read" }],
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const objective = args.objective as string;
    const searchQueries = args.search_queries as string[] | undefined;
    const maxResults = (args.max_results as number) ?? DEFAULT_MAX_RESULTS;

    if (!objective || typeof objective !== "string") {
      return { status: "error", error: "Missing required field: objective" };
    }

    log.debug("web_search called", { objective, searchQueries, maxResults });

    // 逆向: amp uses an internal API endpoint for search.
    // Flitter: check for configured endpoint in settings, fall back to error.
    const endpoint = (context.config.settings as Record<string, unknown>)[
      "web_search.endpoint"
    ] as string | undefined;

    if (!endpoint) {
      // No external search API configured — return a helpful error
      // 逆向: amp's web_search calls its own backend; Flitter is standalone
      return {
        status: "error",
        error:
          'No web search endpoint configured. Set "web_search.endpoint" in settings to enable web search. ' +
          "The endpoint should accept POST requests with { query: string, max_results: number } and return { results: Array<{ title, url, snippet }> }.",
      };
    }

    try {
      // Build the query from objective + optional search_queries
      const query = searchQueries?.length
        ? `${objective} ${searchQueries.join(" ")}`
        : objective;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      // Forward abort from parent signal
      if (context.signal.aborted) {
        clearTimeout(timeout);
        return { status: "cancelled", error: "Cancelled" };
      }
      const onAbort = () => controller.abort();
      context.signal.addEventListener("abort", onAbort, { once: true });

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, max_results: maxResults }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        context.signal.removeEventListener("abort", onAbort);

        if (!response.ok) {
          return {
            status: "error",
            error: `Search API returned ${response.status}: ${await response.text()}`,
          };
        }

        const data = (await response.json()) as { results?: SearchResult[] };
        const results = data.results ?? [];

        if (results.length === 0) {
          return {
            status: "done",
            content: `No results found for: ${query}`,
          };
        }

        // Format results for LLM consumption
        const formatted = results
          .map(
            (r: SearchResult, i: number) =>
              `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`,
          )
          .join("\n\n");

        return {
          status: "done",
          content: `Found ${results.length} result(s) for "${objective}":\n\n${formatted}`,
        };
      } catch (err) {
        clearTimeout(timeout);
        context.signal.removeEventListener("abort", onAbort);

        if (
          err instanceof Error &&
          (err.name === "AbortError" || context.signal.aborted)
        ) {
          return { status: "cancelled", error: "Search request cancelled" };
        }
        throw err;
      }
    } catch (err) {
      log.debug("web_search error", { error: err });
      return {
        status: "error",
        error: `Web search failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
