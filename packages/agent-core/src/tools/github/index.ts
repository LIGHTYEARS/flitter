/**
 * @flitter/agent-core — GitHub Integration Tools
 *
 * Barrel export for all GitHub tools and the GitHubClient.
 *
 * Usage:
 * ```ts
 * import { createGitHubTools, createGitHubClient } from '@flitter/agent-core';
 *
 * const client = createGitHubClient();
 * const tools = createGitHubTools(client);
 * // tools is an array of ToolSpec
 * ```
 */

export { GitHubClient, createGitHubClient, resolveGitHubToken } from "./github-client";
export type { GitHubApiResult, GitHubFetchOptions } from "./github-client";

export {
  parseRepository,
  isFileContent,
  describeContentType,
  formatDirectoryEntries,
  applyReadRange,
  decodeBase64Content,
  globMatch,
  truncateOutput,
} from "./helpers";

export { createReadGitHubTool } from "./read-github";
export { createSearchGitHubTool } from "./search-github";
export { createCommitSearchTool } from "./commit-search";
export { createListDirectoryGitHubTool } from "./list-directory-github";
export { createGlobGitHubTool } from "./glob-github";
export { createGitHubDiffTool } from "./github-diff";
export { createListRepositoriesTool } from "./list-repositories";

import type { GitHubClient } from "./github-client";
import type { ToolSpec } from "../types";
import { createReadGitHubTool } from "./read-github";
import { createSearchGitHubTool } from "./search-github";
import { createCommitSearchTool } from "./commit-search";
import { createListDirectoryGitHubTool } from "./list-directory-github";
import { createGlobGitHubTool } from "./glob-github";
import { createGitHubDiffTool } from "./github-diff";
import { createListRepositoriesTool } from "./list-repositories";

/**
 * Create all 7 GitHub tools, closing over a shared GitHubClient instance.
 *
 * @param client - A GitHubClient instance (use createGitHubClient())
 * @returns Array of ToolSpec for all GitHub integration tools
 */
export function createGitHubTools(client: GitHubClient): ToolSpec[] {
  return [
    createReadGitHubTool(client),
    createSearchGitHubTool(client),
    createCommitSearchTool(client),
    createListDirectoryGitHubTool(client),
    createGlobGitHubTool(client),
    createGitHubDiffTool(client),
    createListRepositoriesTool(client),
  ];
}
