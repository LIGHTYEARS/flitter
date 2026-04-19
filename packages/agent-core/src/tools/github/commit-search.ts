/**
 * @flitter/agent-core — commit_search tool
 *
 * Searches commits in a GitHub repository. Uses repo commits API for
 * path-scoped queries, and the search/commits API for text queries.
 *
 * 逆向: amp-cli-reversed/modules/0019_unknown_FGR.js
 * - Two modes: repos/{r}/commits (path/author/date filters) OR search/commits (full-text)
 * - Falls back to repo commits API when path is specified or no query text
 * - Applies client-side filter when using repo commits API with query
 * - Truncates long commit messages at 1024 chars
 */

import type { GitHubClient } from "./github-client";
import { parseRepository, truncateOutput } from "./helpers";
import type { ToolResult, ToolSpec } from "../types";

/**
 * Create the commit_search tool spec, closing over a GitHubClient instance.
 *
 * 逆向: amp-cli-reversed/modules/0019_unknown_FGR.js
 */
export function createCommitSearchTool(client: GitHubClient): ToolSpec {
  return {
    name: "commit_search",
    description:
      "Search for commits in a GitHub repository. Supports filtering by author, " +
      "date range, file path, and text query. Returns commit SHA, message, and author info.",
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        repository: {
          type: "string",
          description: 'Repository in "owner/repo" format or a GitHub URL',
        },
        query: {
          type: "string",
          description: "Search text to find in commit messages",
        },
        author: {
          type: "string",
          description: "Filter by commit author (username or email)",
        },
        since: {
          type: "string",
          description: "Only commits after this date (ISO 8601 format)",
        },
        until: {
          type: "string",
          description: "Only commits before this date (ISO 8601 format)",
        },
        path: {
          type: "string",
          description: "Only commits touching this file path",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 50, max: 100)",
        },
        offset: {
          type: "number",
          description: "Offset for pagination (must be divisible by limit)",
        },
      },
      required: ["repository"],
      additionalProperties: false,
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const repository = args.repository as string;
      const query = args.query as string | undefined;
      const author = args.author as string | undefined;
      const since = args.since as string | undefined;
      const until = args.until as string | undefined;
      const path = args.path as string | undefined;
      const limit = (args.limit as number) ?? 50;
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

      const perPage = Math.min(limit, 100);
      const page = Math.floor(offset / perPage) + 1;

      // 逆向: Two API paths depending on whether path is set or query is absent
      let apiPath: string;
      let isSearchApi = false;

      if (path || !query) {
        // Use repos/{r}/commits API with query params
        const params = new URLSearchParams({
          per_page: String(perPage),
          page: String(page),
        });
        if (since) params.append("since", since);
        if (until) params.append("until", until);
        if (author) params.append("author", author);
        if (path) params.append("path", path);
        apiPath = `repos/${repo}/commits?${params.toString()}`;
      } else {
        // Use search/commits API for full-text search
        isSearchApi = true;
        const parts = [query, `repo:${repo}`];
        if (author) parts.push(`author:${author}`);
        if (since) parts.push(`author-date:>=${since}`);
        if (until) parts.push(`author-date:<=${until}`);
        const q = parts.join(" ");
        apiPath = `search/commits?q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}&sort=author-date&order=desc`;
      }

      const result = await client.fetchJSON<
        | { total_count: number; items: CommitItem[] }
        | CommitItem[]
      >(apiPath);

      if (!result.ok || !result.data) {
        return {
          status: "error",
          error: `Failed to search commits: ${result.status} ${result.statusText ?? "Unknown error"}`,
        };
      }

      let commits: CommitItem[];
      let totalCount: number;

      if (isSearchApi) {
        const searchData = result.data as { total_count: number; items: CommitItem[] };
        commits = searchData.items ?? [];
        totalCount = searchData.total_count ?? 0;
      } else {
        commits = result.data as CommitItem[];
        // 逆向: client-side filter when using repo commits API with a query
        if (query) {
          const lowerQuery = query.toLowerCase();
          commits = commits.filter(
            (c) =>
              c.commit.message.toLowerCase().includes(lowerQuery) ||
              c.commit.author.name.toLowerCase().includes(lowerQuery) ||
              c.commit.author.email.toLowerCase().includes(lowerQuery),
          );
        }
        totalCount = commits.length;
      }

      // Format output (matching amp's FGR commit mapping)
      const formatted = commits.map((c) => {
        let message = c.commit.message.trim();
        if (message.length > 1024) {
          message = `${message.slice(0, 1024)}... (truncated)`;
        }
        return {
          sha: c.sha,
          message,
          author: {
            name: c.commit.author.name,
            email: c.commit.author.email,
            date: c.commit.author.date,
          },
        };
      });

      const output = formatted
        .map(
          (c) =>
            `${c.sha.slice(0, 8)} ${c.author.date} ${c.author.name} <${c.author.email}>\n  ${c.message.split("\n")[0]}`,
        )
        .join("\n");

      return {
        status: "done",
        content: truncateOutput(
          `Found ${totalCount} commit(s):\n\n${output}`,
        ),
        data: { commits: formatted, totalCount },
      };
    },
  };
}

/** Shape of a commit item from GitHub API */
interface CommitItem {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
}
