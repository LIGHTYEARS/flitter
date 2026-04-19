/**
 * @flitter/agent-core — github_diff tool
 *
 * Compares two refs (branches, tags, SHAs) in a GitHub repository.
 * Returns file-level diff information with optional patch content.
 *
 * 逆向: amp-cli-reversed/modules/0020_unknown_GGR.js
 * - Calls `repos/{r}/compare/{base}...{head}`
 * - Maps file status, additions, deletions, changes
 * - Optionally includes patch content (truncated at 4096 chars)
 * - Returns base/head commit info and ahead/behind counts
 */

import type { GitHubClient } from "./github-client";
import { MAX_PATCH_SIZE, parseRepository, truncateOutput } from "./helpers";
import type { ToolResult, ToolSpec } from "../types";

/**
 * Create the github_diff tool spec, closing over a GitHubClient instance.
 *
 * 逆向: amp-cli-reversed/modules/0020_unknown_GGR.js
 */
export function createGitHubDiffTool(client: GitHubClient): ToolSpec {
  return {
    name: "github_diff",
    description:
      "Compare two branches, tags, or commits in a GitHub repository. " +
      "Returns a list of changed files with additions/deletions counts, " +
      "and optionally the patch content for each file.",
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        repository: {
          type: "string",
          description: 'Repository in "owner/repo" format or a GitHub URL',
        },
        base: {
          type: "string",
          description: "Base ref (branch, tag, or SHA) to compare from",
        },
        head: {
          type: "string",
          description: "Head ref (branch, tag, or SHA) to compare to",
        },
        includePatches: {
          type: "boolean",
          description: "Whether to include patch content for each file (default: false)",
        },
      },
      required: ["repository", "base", "head"],
      additionalProperties: false,
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const repository = args.repository as string;
      const base = args.base as string;
      const head = args.head as string;
      const includePatches = (args.includePatches as boolean) ?? false;

      let repo: string;
      try {
        repo = parseRepository(repository);
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // 逆向: encode refs for URL safety
      const apiPath = `repos/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
      const result = await client.fetchJSON<CompareResult>(apiPath);

      if (!result.ok || !result.data) {
        return {
          status: "error",
          error: `Failed to get diff: ${result.statusText ?? "Unknown error"}`,
        };
      }

      const data = result.data;

      // 逆向: extract base and head commit info
      const baseCommit = {
        sha: data.base_commit?.sha ?? base,
        message: data.base_commit?.commit?.message?.trim() ?? "",
      };

      const lastCommit = data.commits?.length
        ? data.commits[data.commits.length - 1]
        : undefined;
      const headCommit = {
        sha: lastCommit?.sha ?? head,
        message: lastCommit?.commit?.message?.trim() ?? "",
      };

      // 逆向: map files with optional patch truncation
      const files = (data.files ?? []).map((f) => {
        let patch: string | undefined;
        if (includePatches && f.patch) {
          patch =
            f.patch.length > MAX_PATCH_SIZE
              ? f.patch.slice(0, MAX_PATCH_SIZE) + "\n... [truncated]"
              : f.patch;
        }
        return {
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch,
          previous_filename: f.previous_filename,
          sha: f.sha,
          blob_url: f.blob_url,
          raw_url: f.raw_url,
          contents_url: f.contents_url,
        };
      });

      // Format text output
      const fileLines = files
        .map(
          (f) =>
            `${f.status.padEnd(10)} +${f.additions}/-${f.deletions} ${f.filename}${f.previous_filename ? ` (was ${f.previous_filename})` : ""}`,
        )
        .join("\n");

      const summary = [
        `Comparing ${baseCommit.sha.slice(0, 8)}...${headCommit.sha.slice(0, 8)}`,
        `${data.total_commits ?? 0} commit(s), ${data.ahead_by ?? 0} ahead, ${data.behind_by ?? 0} behind`,
        `${files.length} file(s) changed`,
        "",
        fileLines,
      ].join("\n");

      const resultData = {
        files,
        base_commit: baseCommit,
        head_commit: headCommit,
        ahead_by: data.ahead_by,
        behind_by: data.behind_by,
        total_commits: data.total_commits,
      };

      return {
        status: "done",
        content: truncateOutput(summary),
        data: resultData,
      };
    },
  };
}

/** GitHub Compare API response shape */
interface CompareResult {
  base_commit?: {
    sha: string;
    commit?: { message?: string };
  };
  commits?: Array<{
    sha: string;
    commit?: { message?: string };
  }>;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    previous_filename?: string;
    sha: string;
    blob_url: string;
    raw_url: string;
    contents_url: string;
  }>;
  ahead_by?: number;
  behind_by?: number;
  total_commits?: number;
}
