/**
 * @flitter/agent-core — search_github tool
 *
 * Searches code in a GitHub repository using the Code Search API.
 * Returns matching files with text-match highlights.
 *
 * 逆向: amp-cli-reversed/modules/0016_unknown_WGR.js
 * - Uses `search/code?q=...` with text-match+json accept header
 * - Groups results by file path
 * - Extracts text_matches fragments
 * - Supports limit/offset pagination
 */

import type { GitHubClient } from "./github-client";
import { parseRepository, truncateOutput } from "./helpers";
import type { ToolResult, ToolSpec } from "../types";

/**
 * Create the search_github tool spec, closing over a GitHubClient instance.
 *
 * 逆向: amp-cli-reversed/modules/0016_unknown_WGR.js
 */
export function createSearchGitHubTool(client: GitHubClient): ToolSpec {
  return {
    name: "search_github",
    description:
      "Search for code in a GitHub repository. Returns matching files " +
      "with highlighted text fragments. Use the pattern parameter for the search query " +
      "and optionally scope to a specific path.",
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        repository: {
          type: "string",
          description: 'Repository in "owner/repo" format or a GitHub URL',
        },
        pattern: {
          type: "string",
          description: "Search query (code to search for)",
        },
        path: {
          type: "string",
          description: 'Optional path scope (e.g., "src/lib")',
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 30, max: 100)",
        },
        offset: {
          type: "number",
          description: "Offset for pagination (must be divisible by limit)",
        },
      },
      required: ["repository", "pattern"],
      additionalProperties: false,
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const repository = args.repository as string;
      const pattern = args.pattern as string;
      const path = args.path as string | undefined;
      const limit = (args.limit as number) ?? 30;
      const offset = (args.offset as number) ?? 0;

      // 逆向: offset must be divisible by limit
      if (offset % limit !== 0) {
        return {
          status: "error",
          error: `offset (${offset}) must be divisible by limit (${limit})`,
        };
      }

      let repo: string;
      try {
        repo = parseRepository(repository);
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // 逆向: construct search query
      const perPage = Math.min(limit, 100);
      const page = Math.floor(offset / perPage) + 1;
      let query = `${pattern} repo:${repo}`;
      if (path && path !== ".") {
        query += ` path:${path}`;
      }

      const apiPath = `search/code?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;

      const result = await client.fetchJSON<{
        total_count: number;
        items: Array<{
          path: string;
          text_matches?: Array<{
            property: string;
            fragment: string;
          }>;
        }>;
      }>(apiPath, {
        // 逆向: text-match+json header for text_matches in response
        headers: {
          Accept: "application/vnd.github.v3.text-match+json",
        },
      });

      if (!result.ok || !result.data) {
        return {
          status: "error",
          error: `Failed to search code: ${result.status} ${result.statusText ?? "Unknown error"}`,
        };
      }

      const data = result.data;

      if (data.total_count === 0) {
        return {
          status: "done",
          content: "No results found.",
          data: { results: [], totalCount: 0 },
        };
      }

      // 逆向: group results by file path, extract text_matches fragments
      const fileMap = new Map<string, string[]>();
      for (const item of data.items) {
        if (!fileMap.has(item.path)) {
          fileMap.set(item.path, []);
        }
        const chunks = fileMap.get(item.path)!;
        if (item.text_matches) {
          for (const match of item.text_matches) {
            if (match.property === "content" && match.fragment) {
              let fragment = match.fragment.trim();
              if (fragment.length > 2048) {
                fragment = `${fragment.slice(0, 2048)}... (truncated)`;
              }
              chunks.push(fragment);
            }
          }
        }
      }

      // Format output
      const results = Array.from(fileMap.entries()).map(([file, chunks]) => ({
        file,
        chunks,
      }));

      const output = results
        .map((r) => {
          const header = `--- ${r.file} ---`;
          const body = r.chunks.length > 0 ? r.chunks.join("\n...\n") : "(no preview available)";
          return `${header}\n${body}`;
        })
        .join("\n\n");

      return {
        status: "done",
        content: truncateOutput(
          `Found ${data.total_count} result(s):\n\n${output}`,
        ),
        data: { results, totalCount: data.total_count },
      };
    },
  };
}
