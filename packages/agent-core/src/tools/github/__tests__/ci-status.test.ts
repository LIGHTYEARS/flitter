/**
 * Tests for github_repo_ci_status tool
 *
 * Tests: tool spec, execution with mock GitHubClient
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCiStatusTool } from "../ci-status";

// ─── Mock GitHubClient ──────────────────────────────────

function createMockClient(
  overrides: Partial<{
    checkRuns: { fetchJSON: (path: string) => Promise<unknown> };
    actions: { fetchJSON: (path: string) => Promise<unknown> };
  }> = {},
) {
  return {
    fetchJSON: async (path: string) => {
      if (path.includes("check-runs")) {
        return overrides.checkRuns
          ? overrides.checkRuns.fetchJSON(path)
          : {
              ok: true,
              status: 200,
              data: {
                total_count: 3,
                check_runs: [
                  { name: "build", status: "completed", conclusion: "success" },
                  { name: "test", status: "completed", conclusion: "failure" },
                  { name: "lint", status: "in_progress", conclusion: null },
                ],
              },
            };
      }
      if (path.includes("actions/runs")) {
        return overrides.actions
          ? overrides.actions.fetchJSON(path)
          : {
              ok: true,
              status: 200,
              data: {
                total_count: 1,
                workflow_runs: [
                  {
                    name: "CI",
                    status: "completed",
                    conclusion: "success",
                    head_branch: "main",
                    event: "push",
                  },
                ],
              },
            };
      }
      return { ok: false, status: 404, statusText: "Not found" };
    },
  };
}

// ─── Spec tests ─────────────────────────────────────────

describe("createCiStatusTool spec", () => {
  const tool = createCiStatusTool(createMockClient() as never);

  it("should have correct name", () => {
    assert.equal(tool.name, "github_repo_ci_status");
  });

  it("should be a builtin tool", () => {
    assert.equal(tool.source, "builtin");
  });

  it("should be read-only", () => {
    assert.equal(tool.isReadOnly, true);
  });

  it("should require repository parameter", () => {
    const schema = tool.inputSchema as Record<string, unknown>;
    assert.deepEqual(schema.required, ["repository"]);
  });

  it("should have repository and ref properties", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    assert.ok(props.repository);
    assert.ok(props.ref);
  });
});

// ─── Execution tests ────────────────────────────────────

describe("createCiStatusTool execution", () => {
  it("should error on missing repository", async () => {
    const tool = createCiStatusTool(createMockClient() as never);
    const result = await tool.execute!({}, {} as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("repository"));
  });

  it("should error on invalid repository format", async () => {
    const tool = createCiStatusTool(createMockClient() as never);
    const result = await tool.execute!({ repository: "invalid" }, {} as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Invalid repository format"));
  });

  it("should return CI status for valid repository", async () => {
    const tool = createCiStatusTool(createMockClient() as never);
    const result = await tool.execute!({ repository: "owner/repo", ref: "main" }, {} as never);
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("CI Status: owner/repo @ main"));
    assert.ok(result.content?.includes("FAIL"));
    assert.ok(result.content?.includes("test"));
    assert.ok(result.content?.includes("PASS"));
    assert.ok(result.content?.includes("build"));
    assert.ok(result.content?.includes("PENDING"));
    assert.ok(result.content?.includes("lint"));
  });

  it("should handle no checks found", async () => {
    const tool = createCiStatusTool({
      fetchJSON: async () => ({
        ok: true,
        status: 200,
        data: { total_count: 0, check_runs: [], workflow_runs: [] },
      }),
    } as never);
    const result = await tool.execute!({ repository: "owner/repo", ref: "main" }, {} as never);
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("No CI checks"));
  });

  it("should handle API error", async () => {
    const tool = createCiStatusTool({
      fetchJSON: async () => ({
        ok: false,
        status: 403,
        statusText: "Rate limit exceeded",
      }),
    } as never);
    const result = await tool.execute!({ repository: "owner/repo", ref: "main" }, {} as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Rate limit"));
  });

  it("should handle network exception", async () => {
    const tool = createCiStatusTool({
      fetchJSON: async () => {
        throw new Error("Connection refused");
      },
    } as never);
    const result = await tool.execute!({ repository: "owner/repo", ref: "main" }, {} as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Connection refused"));
  });

  it("should default ref to HEAD when not provided", async () => {
    let capturedPath = "";
    const tool = createCiStatusTool({
      fetchJSON: async (path: string) => {
        capturedPath = path;
        return {
          ok: true,
          status: 200,
          data: { total_count: 0, check_runs: [] },
        };
      },
    } as never);
    await tool.execute!({ repository: "owner/repo" }, {} as never);
    assert.ok(capturedPath.includes("HEAD"));
  });

  it("should skip workflow runs for SHA-like refs", async () => {
    let fetchCount = 0;
    const tool = createCiStatusTool({
      fetchJSON: async () => {
        fetchCount++;
        return {
          ok: true,
          status: 200,
          data: { total_count: 0, check_runs: [] },
        };
      },
    } as never);
    await tool.execute!({ repository: "owner/repo", ref: "abc1234def5678" }, {} as never);
    // Should only fetch check-runs, not workflow-runs for SHA refs
    assert.equal(fetchCount, 1);
  });

  it("should show workflow runs for branch refs", async () => {
    const tool = createCiStatusTool(createMockClient() as never);
    const result = await tool.execute!({ repository: "owner/repo", ref: "main" }, {} as never);
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("Workflow Runs"));
    assert.ok(result.content?.includes("CI"));
  });
});
