/**
 * @flitter/agent-core — read_github tool
 *
 * Reads a file from a GitHub repository via the Contents API.
 * Supports base64 decoding, line numbering, read_range, and directory detection.
 *
 * 逆向: amp-cli-reversed/modules/0015_unknown_HGR.js
 * - Calls `repos/{owner}/{repo}/contents/{path}`
 * - Base64 decodes file content
 * - Applies read_range for partial reads
 * - Returns directory listings if path is a directory
 * - Enforces 128KB size limit
 */

import type { GitHubClient } from "./github-client";
import {
  MAX_RESPONSE_BYTES,
  applyReadRange,
  decodeBase64Content,
  describeContentType,
  formatDirectoryEntries,
  isFileContent,
  parseRepository,
  truncateOutput,
} from "./helpers";
import type { ToolResult, ToolSpec } from "../types";

/**
 * Create the read_github tool spec, closing over a GitHubClient instance.
 *
 * 逆向: amp-cli-reversed/modules/0015_unknown_HGR.js
 */
export function createReadGitHubTool(client: GitHubClient): ToolSpec {
  return {
    name: "read_github",
    description:
      "Read a file or directory listing from a GitHub repository. " +
      "Returns file contents with line numbers, or a directory listing if the path is a directory. " +
      "Use read_range to read specific line ranges for large files.",
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
          description: "File path within the repository",
        },
        read_range: {
          type: "array",
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
          description:
            "Optional [start, end] line range (1-based). " +
            "Use this for large files to read specific sections.",
        },
      },
      required: ["repository", "path"],
      additionalProperties: false,
    },

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      // Parse args (matching amp's HGR parameter destructuring)
      const repository = args.repository as string;
      const rawPath = (args.path as string) ?? "";
      const readRange = args.read_range as [number, number] | undefined;

      let repo: string;
      try {
        repo = parseRepository(repository);
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // 逆向: path normalization — strip leading slash, encode segments
      const path = rawPath.replace(/^\//, "");
      const displayPath = path || "/";
      const encodedPath = path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const result = await client.fetchJSON(
        `repos/${repo}/contents/${encodedPath}`,
      );

      if (!result.ok || !result.data) {
        return {
          status: "error",
          error: `Failed to read file: ${result.status} ${result.statusText ?? "Unknown error"}`,
        };
      }

      const data = result.data;

      // 逆向: Check if data is file content (has content + encoding)
      if (!isFileContent(data)) {
        // Directory listing
        if (Array.isArray(data)) {
          const entries = formatDirectoryEntries(
            data as Array<{ name: string; type: string }>,
          );
          const formatted = applyReadRange(entries, readRange, entries.length);
          const size = new TextEncoder().encode(formatted).length;

          if (size > MAX_RESPONSE_BYTES) {
            return {
              status: "error",
              error:
                `Directory listing is too large (${Math.round(size / 1024)}KB). ` +
                `The directory has ${entries.length} entries. ` +
                `Use read_range to inspect a smaller slice or list_directory_github with a limit.`,
            };
          }

          return {
            status: "done",
            content: truncateOutput(formatted),
            data: {
              absolutePath: displayPath,
              isDirectory: true,
              directoryEntries: entries,
            },
          };
        }

        // Other non-file content (symlink, submodule, etc.)
        const contentType = describeContentType(data);
        return {
          status: "error",
          error: `Cannot read "${displayPath}" because GitHub returned ${contentType} metadata instead of file contents.`,
        };
      }

      // Decode file content
      let fullContent: string;
      if (data.encoding === "base64") {
        fullContent = decodeBase64Content(data.content);
      } else {
        fullContent = data.content;
      }

      // Apply read_range
      let content = fullContent;
      if (readRange && readRange.length === 2) {
        const [start, end] = readRange;
        content = fullContent
          .split("\n")
          .slice(Math.max(0, start - 1), end)
          .join("\n");
      }

      // Check size limit
      const size = new TextEncoder().encode(content).length;
      if (size > MAX_RESPONSE_BYTES) {
        return {
          status: "error",
          error:
            `File is too large (${Math.round(size / 1024)}KB). ` +
            `The file has ${fullContent.split("\n").length} lines. ` +
            `Please retry with a smaller read_range parameter.`,
        };
      }

      // Format with line numbers (matching amp's HGR output)
      const lines = content.split("\n");
      const startLine = readRange?.[0] ?? 1;
      const numbered = lines.map(
        (line, idx) => `${startLine + idx}: ${line}`,
      );

      return {
        status: "done",
        content: truncateOutput(numbered.join("\n")),
        data: {
          absolutePath: path,
        },
      };
    },
  };
}
