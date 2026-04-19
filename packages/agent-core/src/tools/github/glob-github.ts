/**
 * @flitter/agent-core — glob_github tool
 *
 * Finds files in a GitHub repository matching a glob pattern.
 * Uses the Git Trees API with recursive listing and client-side glob filtering.
 *
 * 逆向: amp-cli-reversed/modules/0018_unknown_zGR.js
 * - Calls `repos/{r}/git/trees/HEAD?recursive=1`
 * - Filters blobs by glob pattern using BGR (globMatch)
 * - Applies limit/offset pagination
 * - Returns error if tree is truncated (repo too large)
 */

import type { GitHubClient } from "./github-client";
import { globMatch, parseRepository, truncateOutput } from "./helpers";
import type { ToolResult, ToolSpec } from "../types";

/**
 * Create the glob_github tool spec, closing over a GitHubClient instance.
 *
 * 逆向: amp-cli-reversed/modules/0018_unknown_zGR.js
 */
export function createGlobGitHubTool(client: GitHubClient): ToolSpec {
  return {
    name: "glob_github",
    description:
      "Find files in a GitHub repository matching a glob pattern. " +
      'Supports *, **, ?, {a,b}, [abc] patterns. Example: "**/*.ts"',
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        repository: {
          type: "string",
          description: 'Repository in "owner/repo" format or a GitHub URL',
        },
        filePattern: {
          type: "string",
          description: 'Glob pattern to match (e.g., "**/*.ts", "src/**/*.js")',
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 100)",
        },
        offset: {
          type: "number",
          description: "Offset for pagination (default: 0)",
        },
      },
      required: ["repository", "filePattern"],
      additionalProperties: false,
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const repository = args.repository as string;
      const filePattern = args.filePattern as string;
      const limit = (args.limit as number) ?? 100;
      const offset = (args.offset as number) ?? 0;

      let repo: string;
      try {
        repo = parseRepository(repository);
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }

      const apiPath = `repos/${repo}/git/trees/HEAD?recursive=1`;
      const result = await client.fetchJSON<{
        tree: Array<{ path: string; type: string }>;
        truncated: boolean;
      }>(apiPath);

      if (!result.ok || !result.data) {
        return {
          status: "error",
          error: `Failed to fetch file tree: ${result.status} ${result.statusText ?? "Unknown error"}`,
        };
      }

      // 逆向: reject truncated trees
      if (result.data.truncated) {
        return {
          status: "error",
          error:
            "Repository tree is too large for recursive listing. " +
            "Try a more specific search or use search_github instead.",
        };
      }

      // 逆向: filter blobs by glob pattern, apply offset + limit
      const matches = result.data.tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path)
        .filter((path) => globMatch(filePattern, path))
        .slice(offset, offset + limit);

      const output = matches.length > 0
        ? matches.join("\n")
        : "No files matched the pattern.";

      return {
        status: "done",
        content: truncateOutput(output),
        data: { files: matches },
      };
    },
  };
}
