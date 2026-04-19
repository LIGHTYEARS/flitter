/**
 * GitHub tools unit tests
 *
 * Tests for all 7 GitHub integration tools + GitHubClient + helpers.
 * Uses mock fetch to verify API calls, headers, error handling, and result formatting.
 *
 * 逆向: amp-cli-reversed/modules/0015-0021 (GitHub tool implementations)
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { GitHubClient } from "./github-client";
import type { GitHubApiResult } from "./github-client";
import {
  parseRepository,
  isFileContent,
  describeContentType,
  formatDirectoryEntries,
  applyReadRange,
  decodeBase64Content,
  globMatch,
  truncateOutput,
} from "./helpers";
import { createReadGitHubTool } from "./read-github";
import { createSearchGitHubTool } from "./search-github";
import { createCommitSearchTool } from "./commit-search";
import { createListDirectoryGitHubTool } from "./list-directory-github";
import { createGlobGitHubTool } from "./glob-github";
import { createGitHubDiffTool } from "./github-diff";
import { createListRepositoriesTool } from "./list-repositories";
import { createGitHubTools } from "./index";

// ---------------------------------------------------------------------------
// Mock GitHubClient
// ---------------------------------------------------------------------------

/**
 * Create a mock GitHubClient that returns predefined responses.
 * Tracks all calls for assertion.
 */
function createMockClient(
  responses: Map<string, GitHubApiResult> | ((path: string, opts?: unknown) => GitHubApiResult),
) {
  const calls: Array<{ path: string; options?: unknown }> = [];

  const client = new GitHubClient("test-token");

  // Override fetchJSON
  client.fetchJSON = async function <T>(
    path: string,
    options?: unknown,
  ): Promise<GitHubApiResult<T>> {
    calls.push({ path, options });
    if (typeof responses === "function") {
      return responses(path, options) as GitHubApiResult<T>;
    }
    const response = responses.get(path);
    if (!response) {
      return { ok: false, status: 404, statusText: "Not Found" };
    }
    return response as GitHubApiResult<T>;
  };

  return { client, calls };
}

// ---------------------------------------------------------------------------
// Helper tests
// ---------------------------------------------------------------------------

describe("parseRepository", () => {
  it("parses owner/repo format", () => {
    assert.equal(parseRepository("owner/repo"), "owner/repo");
  });

  it("parses full GitHub URL", () => {
    assert.equal(
      parseRepository("https://github.com/owner/repo"),
      "owner/repo",
    );
  });

  it("strips .git suffix", () => {
    assert.equal(
      parseRepository("https://github.com/owner/repo.git"),
      "owner/repo",
    );
  });

  it("strips leading/trailing slashes", () => {
    assert.equal(parseRepository("/owner/repo/"), "owner/repo");
  });

  it("rejects non-github URLs", () => {
    assert.throws(
      () => parseRepository("https://gitlab.com/owner/repo"),
      /Only github.com/,
    );
  });

  it("rejects invalid format", () => {
    assert.throws(
      () => parseRepository("justarepo"),
      /Invalid repository/,
    );
  });

  it("handles extra path segments", () => {
    assert.equal(parseRepository("owner/repo/extra/stuff"), "owner/repo");
  });
});

describe("isFileContent", () => {
  it("returns true for valid file content", () => {
    assert.equal(
      isFileContent({ content: "abc", encoding: "base64" }),
      true,
    );
  });

  it("returns false for arrays", () => {
    assert.equal(isFileContent([]), false);
  });

  it("returns false for missing fields", () => {
    assert.equal(isFileContent({ content: "abc" }), false);
    assert.equal(isFileContent({ encoding: "base64" }), false);
  });

  it("returns false for null", () => {
    assert.equal(isFileContent(null), false);
  });
});

describe("describeContentType", () => {
  it("returns 'directory' for arrays", () => {
    assert.equal(describeContentType([]), "directory");
  });

  it("returns type field if present", () => {
    assert.equal(describeContentType({ type: "symlink" }), "symlink");
  });

  it("returns 'unsupported content' for unknowns", () => {
    assert.equal(describeContentType(42), "unsupported content");
  });
});

describe("formatDirectoryEntries", () => {
  it("adds trailing slash to directories", () => {
    const result = formatDirectoryEntries([
      { name: "src", type: "dir" },
      { name: "README.md", type: "file" },
    ]);
    assert.deepEqual(result, ["src/", "README.md"]);
  });

  it("sorts directories first", () => {
    const result = formatDirectoryEntries([
      { name: "file.ts", type: "file" },
      { name: "src", type: "dir" },
      { name: "alpha.ts", type: "file" },
      { name: "docs", type: "dir" },
    ]);
    assert.deepEqual(result, ["docs/", "src/", "alpha.ts", "file.ts"]);
  });
});

describe("applyReadRange", () => {
  const items = ["a", "b", "c", "d", "e"];

  it("returns all items when no range specified", () => {
    assert.equal(applyReadRange(items, undefined, 10), "a\nb\nc\nd\ne");
  });

  it("applies range with omission markers", () => {
    const result = applyReadRange(items, [2, 4], 10);
    assert.equal(result, "[... omitted 1 entry ...]\nb\nc\nd\n[... omitted 1 more ...]");
  });

  it("limits items when no range", () => {
    const result = applyReadRange(items, undefined, 3);
    assert.equal(result, "a\nb\nc\n[... omitted 2 more ...]");
  });
});

describe("decodeBase64Content", () => {
  it("decodes base64 to string", () => {
    const encoded = btoa("hello world");
    assert.equal(decodeBase64Content(encoded), "hello world");
  });

  it("handles newlines in base64", () => {
    // GitHub API returns base64 with line breaks every 60 chars
    const original = "hello world, this is a test string";
    const encoded = btoa(original);
    // Insert newlines to simulate GitHub's line-broken base64
    const withNewlines = encoded.slice(0, 10) + "\n" + encoded.slice(10);
    assert.equal(decodeBase64Content(withNewlines), original);
  });
});

describe("globMatch", () => {
  it("matches simple wildcard", () => {
    assert.equal(globMatch("*.ts", "index.ts"), true);
    assert.equal(globMatch("*.ts", "index.js"), false);
  });

  it("matches double wildcard", () => {
    assert.equal(globMatch("**/*.ts", "src/index.ts"), true);
    assert.equal(globMatch("**/*.ts", "src/lib/deep/file.ts"), true);
  });

  it("matches question mark", () => {
    assert.equal(globMatch("file?.ts", "file1.ts"), true);
    assert.equal(globMatch("file?.ts", "file12.ts"), false);
  });

  it("matches brace alternatives", () => {
    assert.equal(globMatch("*.{ts,js}", "file.ts"), true);
    assert.equal(globMatch("*.{ts,js}", "file.js"), true);
    assert.equal(globMatch("*.{ts,js}", "file.py"), false);
  });

  it("matches character classes", () => {
    assert.equal(globMatch("[abc].ts", "a.ts"), true);
    assert.equal(globMatch("[abc].ts", "d.ts"), false);
  });

  it("handles ** at the start with /", () => {
    assert.equal(globMatch("**/test/**", "src/test/file.ts"), true);
  });
});

describe("truncateOutput", () => {
  it("does not truncate short strings", () => {
    assert.equal(truncateOutput("hello", 100), "hello");
  });

  it("truncates long strings", () => {
    const long = "x".repeat(200);
    const result = truncateOutput(long, 100);
    assert.equal(result.length, 100 + "\n... [truncated]".length);
    assert.ok(result.endsWith("\n... [truncated]"));
  });
});

// ---------------------------------------------------------------------------
// GitHubClient tests
// ---------------------------------------------------------------------------

describe("GitHubClient", () => {
  it("constructs with explicit token", () => {
    const client = new GitHubClient("my-token");
    assert.ok(client);
  });
});

// ---------------------------------------------------------------------------
// read_github tool tests
// ---------------------------------------------------------------------------

describe("read_github", () => {
  it("has correct ToolSpec shape", () => {
    const { client } = createMockClient(new Map());
    const tool = createReadGitHubTool(client);
    assert.equal(tool.name, "read_github");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
    assert.ok(tool.inputSchema);
  });

  it("reads a file with base64 content", async () => {
    const fileContent = "line1\nline2\nline3";
    const base64Content = btoa(fileContent);

    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/contents/src/index.ts",
          {
            ok: true,
            status: 200,
            data: { content: base64Content, encoding: "base64" },
          },
        ],
      ]),
    );

    const tool = createReadGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", path: "src/index.ts" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("1: line1"));
    assert.ok(result.content?.includes("2: line2"));
    assert.ok(result.content?.includes("3: line3"));
  });

  it("applies read_range", async () => {
    const fileContent = "line1\nline2\nline3\nline4\nline5";
    const base64Content = btoa(fileContent);

    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/contents/file.txt",
          {
            ok: true,
            status: 200,
            data: { content: base64Content, encoding: "base64" },
          },
        ],
      ]),
    );

    const tool = createReadGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", path: "file.txt", read_range: [2, 4] },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("2: line2"));
    assert.ok(result.content?.includes("4: line4"));
    assert.ok(!result.content?.includes("1: line1"));
    assert.ok(!result.content?.includes("5: line5"));
  });

  it("handles directory listing", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/contents/src",
          {
            ok: true,
            status: 200,
            data: [
              { name: "index.ts", type: "file" },
              { name: "lib", type: "dir" },
            ],
          },
        ],
      ]),
    );

    const tool = createReadGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", path: "src" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("lib/"));
    assert.ok(result.content?.includes("index.ts"));
  });

  it("returns error for non-file content", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/contents/link",
          {
            ok: true,
            status: 200,
            data: { type: "symlink", target: "somewhere" },
          },
        ],
      ]),
    );

    const tool = createReadGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", path: "link" },
      {} as any,
    );

    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("symlink"));
  });

  it("returns error on API failure", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/contents/missing",
          { ok: false, status: 404, statusText: "Not Found" },
        ],
      ]),
    );

    const tool = createReadGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", path: "missing" },
      {} as any,
    );

    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("404"));
  });

  it("returns error for invalid repository", async () => {
    const { client } = createMockClient(new Map());
    const tool = createReadGitHubTool(client);
    const result = await tool.execute(
      { repository: "invalid", path: "file.ts" },
      {} as any,
    );
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Invalid repository"));
  });
});

// ---------------------------------------------------------------------------
// search_github tool tests
// ---------------------------------------------------------------------------

describe("search_github", () => {
  it("has correct ToolSpec shape", () => {
    const { client } = createMockClient(new Map());
    const tool = createSearchGitHubTool(client);
    assert.equal(tool.name, "search_github");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
  });

  it("searches code and groups by file", async () => {
    const { client, calls } = createMockClient((path) => {
      if (path.startsWith("search/code")) {
        return {
          ok: true,
          status: 200,
          data: {
            total_count: 2,
            items: [
              {
                path: "src/index.ts",
                text_matches: [
                  { property: "content", fragment: "const foo = 1;" },
                ],
              },
              {
                path: "src/index.ts",
                text_matches: [
                  { property: "content", fragment: "const bar = 2;" },
                ],
              },
              {
                path: "src/utils.ts",
                text_matches: [
                  { property: "content", fragment: "export const foo = 3;" },
                ],
              },
            ],
          },
        };
      }
      return { ok: false, status: 404 };
    });

    const tool = createSearchGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", pattern: "foo" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("src/index.ts"));
    assert.ok(result.content?.includes("src/utils.ts"));

    // Verify text-match header was sent
    const call = calls[0];
    const opts = call.options as { headers?: Record<string, string> };
    assert.ok(opts?.headers?.Accept?.includes("text-match"));
  });

  it("returns empty results gracefully", async () => {
    const { client } = createMockClient((path) => {
      if (path.startsWith("search/code")) {
        return { ok: true, status: 200, data: { total_count: 0, items: [] } };
      }
      return { ok: false, status: 404 };
    });

    const tool = createSearchGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", pattern: "nonexistent" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("No results"));
  });

  it("rejects invalid offset", async () => {
    const { client } = createMockClient(new Map());
    const tool = createSearchGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", pattern: "foo", offset: 7, limit: 5 },
      {} as any,
    );
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("divisible"));
  });

  it("includes path scope in query", async () => {
    const { client, calls } = createMockClient((path) => ({
      ok: true,
      status: 200,
      data: { total_count: 0, items: [] },
    }));

    const tool = createSearchGitHubTool(client);
    await tool.execute(
      { repository: "owner/repo", pattern: "foo", path: "src/lib" },
      {} as any,
    );

    const apiPath = calls[0].path;
    assert.ok(apiPath.includes("path%3Asrc%2Flib") || apiPath.includes("path:src/lib"));
  });
});

// ---------------------------------------------------------------------------
// commit_search tool tests
// ---------------------------------------------------------------------------

describe("commit_search", () => {
  it("has correct ToolSpec shape", () => {
    const { client } = createMockClient(new Map());
    const tool = createCommitSearchTool(client);
    assert.equal(tool.name, "commit_search");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
  });

  it("searches commits with search API", async () => {
    const { client, calls } = createMockClient((path) => {
      if (path.startsWith("search/commits")) {
        return {
          ok: true,
          status: 200,
          data: {
            total_count: 1,
            items: [
              {
                sha: "abc123def456",
                commit: {
                  message: "fix: resolve bug",
                  author: {
                    name: "Test User",
                    email: "test@example.com",
                    date: "2024-01-01T00:00:00Z",
                  },
                },
              },
            ],
          },
        };
      }
      return { ok: false, status: 404 };
    });

    const tool = createCommitSearchTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", query: "fix bug" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("abc123de"));
    assert.ok(result.content?.includes("fix: resolve bug"));

    // Should use search API when query is provided without path
    assert.ok(calls[0].path.startsWith("search/commits"));
  });

  it("uses repos commits API when path is specified", async () => {
    const { client, calls } = createMockClient((path) => {
      if (path.startsWith("repos/")) {
        return {
          ok: true,
          status: 200,
          data: [
            {
              sha: "def456abc123",
              commit: {
                message: "update file.ts",
                author: {
                  name: "Author",
                  email: "a@b.com",
                  date: "2024-01-01T00:00:00Z",
                },
              },
            },
          ],
        };
      }
      return { ok: false, status: 404 };
    });

    const tool = createCommitSearchTool(client);
    await tool.execute(
      { repository: "owner/repo", path: "src/file.ts" },
      {} as any,
    );

    assert.ok(calls[0].path.startsWith("repos/owner/repo/commits"));
    assert.ok(calls[0].path.includes("path=src%2Ffile.ts"));
  });

  it("client-side filters when using repos API with query", async () => {
    const { client } = createMockClient((path) => {
      if (path.startsWith("repos/")) {
        return {
          ok: true,
          status: 200,
          data: [
            {
              sha: "aaa",
              commit: {
                message: "fix: the bug",
                author: { name: "A", email: "a@b.com", date: "2024-01-01" },
              },
            },
            {
              sha: "bbb",
              commit: {
                message: "feat: add feature",
                author: { name: "B", email: "b@b.com", date: "2024-01-02" },
              },
            },
          ],
        };
      }
      return { ok: false, status: 404 };
    });

    const tool = createCommitSearchTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", query: "bug", path: "src" },
      {} as any,
    );

    assert.equal(result.status, "done");
    // Should only show the commit matching "bug"
    const data = result.data as { commits: Array<{ sha: string }> };
    assert.equal(data.commits.length, 1);
    assert.equal(data.commits[0].sha, "aaa");
  });

  it("truncates long commit messages", async () => {
    const longMessage = "x".repeat(2000);
    const { client } = createMockClient((path) => {
      if (path.startsWith("search/commits")) {
        return {
          ok: true,
          status: 200,
          data: {
            total_count: 1,
            items: [
              {
                sha: "abc123",
                commit: {
                  message: longMessage,
                  author: { name: "A", email: "a@b.com", date: "2024-01-01" },
                },
              },
            ],
          },
        };
      }
      return { ok: false, status: 404 };
    });

    const tool = createCommitSearchTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", query: "x" },
      {} as any,
    );

    const data = result.data as { commits: Array<{ message: string }> };
    assert.ok(data.commits[0].message.length < longMessage.length);
    assert.ok(data.commits[0].message.includes("truncated"));
  });
});

// ---------------------------------------------------------------------------
// list_directory_github tool tests
// ---------------------------------------------------------------------------

describe("list_directory_github", () => {
  it("has correct ToolSpec shape", () => {
    const { client } = createMockClient(new Map());
    const tool = createListDirectoryGitHubTool(client);
    assert.equal(tool.name, "list_directory_github");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
  });

  it("lists directory contents", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/contents/",
          {
            ok: true,
            status: 200,
            data: [
              { name: "src", type: "dir" },
              { name: "README.md", type: "file" },
              { name: "package.json", type: "file" },
            ],
          },
        ],
      ]),
    );

    const tool = createListDirectoryGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("src/"));
    assert.ok(result.content?.includes("README.md"));
  });

  it("applies limit", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/contents/",
          {
            ok: true,
            status: 200,
            data: [
              { name: "a", type: "file" },
              { name: "b", type: "file" },
              { name: "c", type: "file" },
            ],
          },
        ],
      ]),
    );

    const tool = createListDirectoryGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", limit: 2 },
      {} as any,
    );

    const data = result.data as { entries: string[] };
    assert.equal(data.entries.length, 2);
  });

  it("normalizes path", async () => {
    const { client, calls } = createMockClient((path) => ({
      ok: true,
      status: 200,
      data: [],
    }));

    const tool = createListDirectoryGitHubTool(client);
    await tool.execute(
      { repository: "owner/repo", path: "/src/" },
      {} as any,
    );

    // Path should have leading slash stripped
    assert.ok(calls[0].path.includes("contents/src"));
  });
});

// ---------------------------------------------------------------------------
// glob_github tool tests
// ---------------------------------------------------------------------------

describe("glob_github", () => {
  it("has correct ToolSpec shape", () => {
    const { client } = createMockClient(new Map());
    const tool = createGlobGitHubTool(client);
    assert.equal(tool.name, "glob_github");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
  });

  it("finds files matching glob pattern", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/git/trees/HEAD?recursive=1",
          {
            ok: true,
            status: 200,
            data: {
              tree: [
                { path: "src/index.ts", type: "blob" },
                { path: "src/utils.ts", type: "blob" },
                { path: "src/lib", type: "tree" },
                { path: "test/index.test.ts", type: "blob" },
                { path: "README.md", type: "blob" },
              ],
              truncated: false,
            },
          },
        ],
      ]),
    );

    const tool = createGlobGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", filePattern: "**/*.ts" },
      {} as any,
    );

    assert.equal(result.status, "done");
    const data = result.data as { files: string[] };
    assert.equal(data.files.length, 3);
    assert.ok(data.files.includes("src/index.ts"));
    assert.ok(data.files.includes("src/utils.ts"));
    assert.ok(data.files.includes("test/index.test.ts"));
  });

  it("rejects truncated trees", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/git/trees/HEAD?recursive=1",
          {
            ok: true,
            status: 200,
            data: { tree: [], truncated: true },
          },
        ],
      ]),
    );

    const tool = createGlobGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", filePattern: "**/*.ts" },
      {} as any,
    );

    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("too large"));
  });

  it("applies offset and limit", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/git/trees/HEAD?recursive=1",
          {
            ok: true,
            status: 200,
            data: {
              tree: [
                { path: "a.ts", type: "blob" },
                { path: "b.ts", type: "blob" },
                { path: "c.ts", type: "blob" },
                { path: "d.ts", type: "blob" },
              ],
              truncated: false,
            },
          },
        ],
      ]),
    );

    const tool = createGlobGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", filePattern: "*.ts", offset: 1, limit: 2 },
      {} as any,
    );

    const data = result.data as { files: string[] };
    assert.equal(data.files.length, 2);
    assert.equal(data.files[0], "b.ts");
    assert.equal(data.files[1], "c.ts");
  });

  it("handles no matches", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/git/trees/HEAD?recursive=1",
          {
            ok: true,
            status: 200,
            data: {
              tree: [{ path: "file.py", type: "blob" }],
              truncated: false,
            },
          },
        ],
      ]),
    );

    const tool = createGlobGitHubTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", filePattern: "**/*.ts" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("No files matched"));
  });
});

// ---------------------------------------------------------------------------
// github_diff tool tests
// ---------------------------------------------------------------------------

describe("github_diff", () => {
  it("has correct ToolSpec shape", () => {
    const { client } = createMockClient(new Map());
    const tool = createGitHubDiffTool(client);
    assert.equal(tool.name, "github_diff");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
  });

  it("compares two refs", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/compare/main...feature",
          {
            ok: true,
            status: 200,
            data: {
              base_commit: {
                sha: "aaa111",
                commit: { message: "base commit" },
              },
              commits: [
                {
                  sha: "bbb222",
                  commit: { message: "feature commit" },
                },
              ],
              files: [
                {
                  filename: "src/new.ts",
                  status: "added",
                  additions: 10,
                  deletions: 0,
                  changes: 10,
                  patch: "@@ +1,10 @@\n+new code",
                  sha: "ccc333",
                  blob_url: "https://github.com/...",
                  raw_url: "https://raw.githubusercontent.com/...",
                  contents_url: "https://api.github.com/...",
                },
              ],
              ahead_by: 1,
              behind_by: 0,
              total_commits: 1,
            },
          },
        ],
      ]),
    );

    const tool = createGitHubDiffTool(client);
    const result = await tool.execute(
      { repository: "owner/repo", base: "main", head: "feature" },
      {} as any,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("src/new.ts"));
    assert.ok(result.content?.includes("+10/-0"));
    const data = result.data as { files: Array<{ filename: string; patch?: string }> };
    // Patches not included by default
    assert.equal(data.files[0].patch, undefined);
  });

  it("includes patches when requested", async () => {
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/compare/main...feature",
          {
            ok: true,
            status: 200,
            data: {
              base_commit: { sha: "aaa", commit: { message: "base" } },
              commits: [{ sha: "bbb", commit: { message: "head" } }],
              files: [
                {
                  filename: "file.ts",
                  status: "modified",
                  additions: 1,
                  deletions: 1,
                  changes: 2,
                  patch: "@@ -1,1 +1,1 @@\n-old\n+new",
                  sha: "x",
                  blob_url: "",
                  raw_url: "",
                  contents_url: "",
                },
              ],
              ahead_by: 1,
              behind_by: 0,
              total_commits: 1,
            },
          },
        ],
      ]),
    );

    const tool = createGitHubDiffTool(client);
    const result = await tool.execute(
      {
        repository: "owner/repo",
        base: "main",
        head: "feature",
        includePatches: true,
      },
      {} as any,
    );

    const data = result.data as { files: Array<{ patch?: string }> };
    assert.ok(data.files[0].patch?.includes("-old"));
    assert.ok(data.files[0].patch?.includes("+new"));
  });

  it("truncates large patches", async () => {
    const largePatch = "x".repeat(5000);
    const { client } = createMockClient(
      new Map([
        [
          "repos/owner/repo/compare/a...b",
          {
            ok: true,
            status: 200,
            data: {
              files: [
                {
                  filename: "big.ts",
                  status: "modified",
                  additions: 100,
                  deletions: 100,
                  changes: 200,
                  patch: largePatch,
                  sha: "x",
                  blob_url: "",
                  raw_url: "",
                  contents_url: "",
                },
              ],
              ahead_by: 1,
              behind_by: 0,
              total_commits: 1,
            },
          },
        ],
      ]),
    );

    const tool = createGitHubDiffTool(client);
    const result = await tool.execute(
      {
        repository: "owner/repo",
        base: "a",
        head: "b",
        includePatches: true,
      },
      {} as any,
    );

    const data = result.data as { files: Array<{ patch?: string }> };
    assert.ok((data.files[0].patch?.length ?? 0) < largePatch.length);
    assert.ok(data.files[0].patch?.includes("[truncated]"));
  });
});

// ---------------------------------------------------------------------------
// list_repositories tool tests
// ---------------------------------------------------------------------------

describe("list_repositories", () => {
  it("has correct ToolSpec shape", () => {
    const { client } = createMockClient(new Map());
    const tool = createListRepositoriesTool(client);
    assert.equal(tool.name, "list_repositories");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
  });

  it("lists user repos and supplements with search", async () => {
    const { client, calls } = createMockClient((path) => {
      if (path.startsWith("user/repos")) {
        return {
          ok: true,
          status: 200,
          data: [
            {
              full_name: "owner/repo-a",
              description: "First repo",
              language: "TypeScript",
              stargazers_count: 100,
              forks_count: 10,
              private: false,
            },
          ],
        };
      }
      if (path.startsWith("search/repositories")) {
        return {
          ok: true,
          status: 200,
          data: {
            items: [
              {
                full_name: "other/repo-b",
                description: "Second repo",
                language: "JavaScript",
                stargazers_count: 50,
                forks_count: 5,
                private: false,
              },
            ],
          },
        };
      }
      return { ok: false, status: 404 };
    });

    const tool = createListRepositoriesTool(client);
    const result = await tool.execute(
      { limit: 30 },
      {} as any,
    );

    assert.equal(result.status, "done");
    const data = result.data as { repositories: Array<{ name: string }> };
    assert.equal(data.repositories.length, 2);
    assert.equal(data.repositories[0].name, "owner/repo-a");
    assert.equal(data.repositories[1].name, "other/repo-b");
  });

  it("filters by pattern", async () => {
    const { client } = createMockClient((path) => {
      if (path.startsWith("user/repos")) {
        return {
          ok: true,
          status: 200,
          data: [
            {
              full_name: "owner/my-tool",
              description: null,
              language: null,
              stargazers_count: 10,
              forks_count: 0,
              private: false,
            },
            {
              full_name: "owner/other",
              description: null,
              language: null,
              stargazers_count: 5,
              forks_count: 0,
              private: false,
            },
          ],
        };
      }
      if (path.startsWith("search/repositories")) {
        return { ok: true, status: 200, data: { items: [] } };
      }
      return { ok: false, status: 404 };
    });

    const tool = createListRepositoriesTool(client);
    const result = await tool.execute(
      { pattern: "tool" },
      {} as any,
    );

    const data = result.data as { repositories: Array<{ name: string }> };
    assert.equal(data.repositories.length, 1);
    assert.equal(data.repositories[0].name, "owner/my-tool");
  });

  it("deduplicates repos from both sources", async () => {
    const { client } = createMockClient((path) => {
      if (path.startsWith("user/repos")) {
        return {
          ok: true,
          status: 200,
          data: [
            {
              full_name: "owner/repo",
              description: null,
              language: null,
              stargazers_count: 100,
              forks_count: 0,
              private: false,
            },
          ],
        };
      }
      if (path.startsWith("search/repositories")) {
        return {
          ok: true,
          status: 200,
          data: {
            items: [
              {
                full_name: "owner/repo",
                description: null,
                language: null,
                stargazers_count: 100,
                forks_count: 0,
                private: false,
              },
              {
                full_name: "other/new-repo",
                description: null,
                language: null,
                stargazers_count: 50,
                forks_count: 0,
                private: false,
              },
            ],
          },
        };
      }
      return { ok: false, status: 404 };
    });

    const tool = createListRepositoriesTool(client);
    const result = await tool.execute({}, {} as any);

    const data = result.data as { repositories: Array<{ name: string }> };
    const names = data.repositories.map((r) => r.name);
    // owner/repo should appear only once
    assert.equal(names.filter((n) => n === "owner/repo").length, 1);
    assert.ok(names.includes("other/new-repo"));
  });

  it("rejects invalid offset", async () => {
    const { client } = createMockClient(new Map());
    const tool = createListRepositoriesTool(client);
    const result = await tool.execute(
      { offset: 7, limit: 5 },
      {} as any,
    );
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("divisible"));
  });
});

// ---------------------------------------------------------------------------
// createGitHubTools factory test
// ---------------------------------------------------------------------------

describe("createGitHubTools", () => {
  it("returns all 7 tools", () => {
    const client = new GitHubClient("test");
    const tools = createGitHubTools(client);
    assert.equal(tools.length, 7);

    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, [
      "commit_search",
      "github_diff",
      "glob_github",
      "list_directory_github",
      "list_repositories",
      "read_github",
      "search_github",
    ]);

    // All should be builtin and read-only
    for (const tool of tools) {
      assert.equal(tool.source, "builtin");
      assert.equal(tool.isReadOnly, true);
    }
  });
});
