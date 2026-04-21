/**
 * github_repo_ci_status — Check CI/CD status for a GitHub repository
 *
 * Queries GitHub REST API for check-runs and workflow-runs on a given
 * ref (branch, tag, or commit SHA). Returns a summary of CI status.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:7077
 *   ElR = "github_repo_ci_status"
 *   Defined as a constant only — amp's implementation is server-side.
 *   Flitter provides a client-side implementation using GitHub REST API directly.
 *
 * GitHub API endpoints used:
 *   GET /repos/{owner}/{repo}/commits/{ref}/check-runs
 *   GET /repos/{owner}/{repo}/actions/runs?branch={branch}&per_page=5
 */

import type { ToolSpec } from "../types";
import type { GitHubClient } from "./github-client";
import { parseRepository } from "./helpers";

/** Shape of a GitHub check-run from the API */
interface CheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
}

/** Shape of a GitHub workflow run from the API */
interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  event: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create the github_repo_ci_status tool, closing over a GitHubClient.
 *
 * Follows the `createXxxTool(client: GitHubClient): ToolSpec` factory pattern
 * used by all existing GitHub tools.
 */
export function createCiStatusTool(client: GitHubClient): ToolSpec {
  return {
    name: "github_repo_ci_status",
    source: "builtin",
    isReadOnly: true,

    description: `Check CI/CD pipeline status for a GitHub repository.

Returns check-runs and workflow-runs for a given ref (branch, tag, or commit SHA).
Use this to verify if CI is passing before merging, or to diagnose build failures.

Examples:
- Check if main branch CI is green: { "repository": "owner/repo", "ref": "main" }
- Check specific commit: { "repository": "owner/repo", "ref": "abc1234" }`,

    inputSchema: {
      type: "object",
      properties: {
        repository: {
          type: "string",
          description: 'Repository in "owner/repo" format',
        },
        ref: {
          type: "string",
          description:
            "Git ref to check (branch name, tag, or commit SHA). Defaults to the repository's default branch.",
        },
      },
      required: ["repository"],
    },

    async execute(args: Record<string, unknown>): Promise<{
      status: "done" | "error";
      content?: string;
      error?: string;
    }> {
      const repoStr = args.repository as string | undefined;
      if (!repoStr) {
        return { status: "error", error: 'Missing required parameter "repository"' };
      }

      let ownerRepo: string;
      try {
        ownerRepo = parseRepository(repoStr);
      } catch {
        return {
          status: "error",
          error: `Invalid repository format: "${repoStr}". Use "owner/repo" format.`,
        };
      }

      const [owner, repo] = ownerRepo.split("/");
      const ref = (args.ref as string) || "HEAD";

      try {
        // Fetch check-runs for the ref
        const checkResult = await client.fetchJSON<{
          total_count: number;
          check_runs: CheckRun[];
        }>(`repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`);

        // Fetch recent workflow runs (only if ref looks like a branch name)
        let workflowRuns: WorkflowRun[] = [];
        if (ref !== "HEAD" && !/^[0-9a-f]{7,40}$/.test(ref)) {
          const wfResult = await client.fetchJSON<{
            total_count: number;
            workflow_runs: WorkflowRun[];
          }>(`repos/${owner}/${repo}/actions/runs?branch=${encodeURIComponent(ref)}&per_page=5`);
          if (wfResult.ok && wfResult.data) {
            workflowRuns = wfResult.data.workflow_runs ?? [];
          }
        }

        if (!checkResult.ok) {
          return {
            status: "error",
            error: `GitHub API error: ${checkResult.statusText ?? `HTTP ${checkResult.status}`}`,
          };
        }

        const checks = checkResult.data?.check_runs ?? [];
        const totalChecks = checkResult.data?.total_count ?? 0;

        // Build summary
        const lines: string[] = [];
        lines.push(`## CI Status: ${owner}/${repo} @ ${ref}`);
        lines.push("");

        if (totalChecks === 0 && workflowRuns.length === 0) {
          lines.push("No CI checks or workflow runs found for this ref.");
          return { status: "done", content: lines.join("\n") };
        }

        // Check runs summary
        if (checks.length > 0) {
          const passed = checks.filter((c) => c.conclusion === "success").length;
          const failed = checks.filter(
            (c) => c.conclusion === "failure" || c.conclusion === "cancelled",
          ).length;
          const pending = checks.filter(
            (c) => c.status === "in_progress" || c.status === "queued",
          ).length;
          const skipped = checks.filter((c) => c.conclusion === "skipped").length;

          lines.push(
            `### Check Runs (${totalChecks} total): ${passed} passed, ${failed} failed, ${pending} pending, ${skipped} skipped`,
          );
          lines.push("");

          // Show failed checks first, then pending, then a few passed
          const failedChecks = checks.filter(
            (c) => c.conclusion === "failure" || c.conclusion === "cancelled",
          );
          const pendingChecks = checks.filter(
            (c) => c.status === "in_progress" || c.status === "queued",
          );
          const passedChecks = checks.filter((c) => c.conclusion === "success");

          for (const c of failedChecks) {
            lines.push(`- **FAIL** ${c.name} (${c.conclusion})`);
          }
          for (const c of pendingChecks) {
            lines.push(`- **PENDING** ${c.name} (${c.status})`);
          }
          // Show up to 10 passed checks to avoid wall of text
          for (const c of passedChecks.slice(0, 10)) {
            lines.push(`- PASS ${c.name}`);
          }
          if (passedChecks.length > 10) {
            lines.push(`- ... and ${passedChecks.length - 10} more passing checks`);
          }
        }

        // Workflow runs summary
        if (workflowRuns.length > 0) {
          lines.push("");
          lines.push("### Recent Workflow Runs");
          lines.push("");
          for (const wf of workflowRuns) {
            const status = wf.conclusion ?? wf.status;
            const emoji = status === "success" ? "PASS" : status === "failure" ? "FAIL" : "PENDING";
            lines.push(`- **${emoji}** ${wf.name} (${status}) — ${wf.event} on ${wf.head_branch}`);
          }
        }

        return { status: "done", content: lines.join("\n") };
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
