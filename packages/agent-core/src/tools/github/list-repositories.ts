/**
 * @flitter/agent-core — list_repositories tool
 *
 * Lists repositories from the authenticated user's account and optionally
 * searches public repositories. Two-phase approach: user repos first,
 * then search API to fill remaining slots.
 *
 * 逆向: amp-cli-reversed/modules/0021_unknown_KGR.js
 * - Phase 1: `user/repos` with affiliation filter, client-side filtering
 * - Phase 2: `search/repositories` to fill remaining slots
 * - Deduplicates by full_name
 * - Sorts user repos by stars
 * - Supports pattern, organization, language filters
 */

import type { GitHubClient } from "./github-client";
import { truncateOutput } from "./helpers";
import type { ToolResult, ToolSpec } from "../types";

/**
 * Create the list_repositories tool spec, closing over a GitHubClient instance.
 *
 * 逆向: amp-cli-reversed/modules/0021_unknown_KGR.js
 */
export function createListRepositoriesTool(client: GitHubClient): ToolSpec {
  return {
    name: "list_repositories",
    description:
      "List repositories from your GitHub account or search for public repositories. " +
      "Supports filtering by name pattern, organization, and programming language.",
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Filter repositories by name (substring match)",
        },
        organization: {
          type: "string",
          description: "Filter by organization name",
        },
        language: {
          type: "string",
          description: "Filter by programming language",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 30)",
        },
        offset: {
          type: "number",
          description: "Offset for pagination (must be divisible by limit)",
        },
      },
      additionalProperties: false,
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const pattern = args.pattern as string | undefined;
      const organization = args.organization as string | undefined;
      const language = args.language as string | undefined;
      const limit = (args.limit as number) ?? 30;
      const offset = (args.offset as number) ?? 0;

      // 逆向: offset must be divisible by limit
      if (offset % limit !== 0) {
        return {
          status: "error",
          error: `offset (${offset}) must be divisible by limit (${limit})`,
        };
      }

      const repos: RepoItem[] = [];
      let totalCount = 0;

      // Phase 1: fetch user repos
      // 逆向: perPage = limit * 5 to have enough for client-side filtering
      const perPage = limit * 5;
      const page = Math.floor(offset / perPage) + 1;

      const userReposResult = await client.fetchJSON<RepoItem[]>(
        `user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      );

      if (userReposResult.ok && userReposResult.data) {
        let filtered = userReposResult.data;

        // 逆向: client-side filtering by pattern, organization, language
        if (pattern) {
          const lowerPattern = pattern.toLowerCase();
          filtered = filtered.filter((r) =>
            r.full_name.toLowerCase().includes(lowerPattern),
          );
        }
        if (organization) {
          const lowerOrg = organization.toLowerCase();
          filtered = filtered.filter((r) => {
            return r.full_name.split("/")[0]?.toLowerCase() === lowerOrg;
          });
        }
        if (language) {
          const lowerLang = language.toLowerCase();
          filtered = filtered.filter(
            (r) => r.language?.toLowerCase() === lowerLang,
          );
        }

        // 逆向: sort by stars descending
        filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);
        repos.push(...filtered);
        totalCount = filtered.length;
      }

      // Phase 2: fill remaining with search API
      if (repos.length < limit) {
        const queryParts: string[] = [];
        if (pattern) queryParts.push(`${pattern} in:name`);
        if (organization) queryParts.push(`org:${organization}`);
        if (language) queryParts.push(`language:${language}`);
        const q = queryParts.length > 0 ? queryParts.join(" ") : "*";
        const remaining = limit - repos.length;

        const searchResult = await client.fetchJSON<{
          items: RepoItem[];
        }>(
          `search/repositories?q=${encodeURIComponent(q)}&per_page=${Math.min(remaining, 100)}&sort=stars&order=desc`,
        );

        if (searchResult.ok && searchResult.data) {
          // 逆向: deduplicate by full_name
          const existing = new Set(repos.map((r) => r.full_name));
          const newRepos = searchResult.data.items.filter(
            (r) => !existing.has(r.full_name),
          );
          repos.push(...newRepos.slice(0, remaining));
          totalCount += newRepos.length;
        }
      }

      // Format output
      const formatted = repos.slice(0, limit).map((r) => ({
        name: r.full_name,
        description: r.description,
        language: r.language,
        stargazersCount: r.stargazers_count,
        forksCount: r.forks_count,
        private: r.private,
      }));

      const output = formatted
        .map(
          (r) =>
            `${r.private ? "🔒 " : ""}${r.name}${r.language ? ` [${r.language}]` : ""} ★${r.stargazersCount}${r.description ? `\n  ${r.description}` : ""}`,
        )
        .join("\n");

      return {
        status: "done",
        content: truncateOutput(
          `Found ${totalCount} repository(ies):\n\n${output}`,
        ),
        data: { repositories: formatted, totalCount },
      };
    },
  };
}

/** Shape of a repository item from GitHub API */
interface RepoItem {
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
}
