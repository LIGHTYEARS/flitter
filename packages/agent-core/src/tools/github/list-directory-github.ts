/**
 * @flitter/agent-core — list_directory_github tool
 *
 * Lists directory contents from a GitHub repository via the Contents API.
 * Returns formatted directory entries (dirs first with trailing slash).
 *
 * 逆向: amp-cli-reversed/modules/0017_unknown_qGR.js
 * - Calls `repos/{owner}/{repo}/contents/{path}`
 * - Formats using VzT (formatDirectoryEntries)
 * - Applies limit parameter
 */

import type { GitHubClient } from "./github-client";
import { formatDirectoryEntries, parseRepository, truncateOutput } from "./helpers";
import type { ToolResult, ToolSpec } from "../types";

/**
 * Create the list_directory_github tool spec, closing over a GitHubClient instance.
 *
 * 逆向: amp-cli-reversed/modules/0017_unknown_qGR.js
 */
export function createListDirectoryGitHubTool(client: GitHubClient): ToolSpec {
  return {
    name: "list_directory_github",
    description:
      "List the contents of a directory in a GitHub repository. " +
      "Returns directory entries sorted with directories first (marked with trailing slash).",
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        repository: {
          type: "string",
          description: 'Repository in "owner/repo" format or a GitHub URL',
        },
        path: {
          type: "string",
          description: 'Directory path within the repository (default: root "/")',
        },
        limit: {
          type: "number",
          description: "Maximum number of entries to return (default: 100)",
        },
      },
      required: ["repository"],
      additionalProperties: false,
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const repository = args.repository as string;
      const limit = (args.limit as number) ?? 100;

      let repo: string;
      try {
        repo = parseRepository(repository);
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // 逆向: path normalization — strip leading slash, handle "." and ""
      let path = ((args.path as string) ?? "").replace(/^\//, "");
      if (path === "." || path === "") path = "";

      const encodedPath = path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const apiPath = `repos/${repo}/contents/${encodedPath}`;
      const result = await client.fetchJSON<
        Array<{ name: string; type: string }>
      >(apiPath);

      if (!result.ok || !result.data) {
        return {
          status: "error",
          error: `Failed to list directory: ${result.status} ${result.statusText ?? "Unknown error"}`,
        };
      }

      // 逆向: format entries and apply limit
      const entries = formatDirectoryEntries(result.data).slice(0, limit);
      const output = entries.join("\n");

      return {
        status: "done",
        content: truncateOutput(output),
        data: { entries },
      };
    },
  };
}
