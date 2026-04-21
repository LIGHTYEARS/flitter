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

export { createCiStatusTool } from "./ci-status";
export { createCommitSearchTool } from "./commit-search";
export type { GitHubApiResult, GitHubFetchOptions } from "./github-client";
export { createGitHubClient, GitHubClient, resolveGitHubToken } from "./github-client";
export { createGitHubDiffTool } from "./github-diff";
export { createGlobGitHubTool } from "./glob-github";
export {
  applyReadRange,
  decodeBase64Content,
  describeContentType,
  formatDirectoryEntries,
  globMatch,
  isFileContent,
  parseRepository,
  truncateOutput,
} from "./helpers";
export { createListDirectoryGitHubTool } from "./list-directory-github";
export { createListRepositoriesTool } from "./list-repositories";
export { createReadGitHubTool } from "./read-github";
export { createSearchGitHubTool } from "./search-github";

import type { ToolSpec } from "../types";
import { createCiStatusTool } from "./ci-status";
import { createCommitSearchTool } from "./commit-search";
import type { GitHubClient } from "./github-client";
import { createGitHubDiffTool } from "./github-diff";
import { createGlobGitHubTool } from "./glob-github";
import { createListDirectoryGitHubTool } from "./list-directory-github";
import { createListRepositoriesTool } from "./list-repositories";
import { createReadGitHubTool } from "./read-github";
import { createSearchGitHubTool } from "./search-github";

/**
 * Create all 8 GitHub tools, closing over a shared GitHubClient instance.
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
    createCiStatusTool(client),
  ];
}
