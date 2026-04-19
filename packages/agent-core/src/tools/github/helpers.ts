/**
 * @flitter/agent-core — GitHub tool helpers
 *
 * Shared utility functions used across multiple GitHub tools.
 *
 * 逆向: amp-cli-reversed/modules/0011_unknown_Kx.js — parseRepository
 * 逆向: amp-cli-reversed/modules/0013_unknown_VzT.js — formatDirectoryEntries
 * 逆向: amp-cli-reversed/modules/0014_unknown_UGR.js — isFileContent, describeContentType
 * 逆向: amp-cli-reversed/modules/0012_unknown_BGR.js — globMatch
 * 逆向: amp-cli-reversed/modules/1731_unknown_NLT.js — applyReadRange
 */

/** Max response size in bytes (128KB, matching amp's 131072 limit) */
export const MAX_RESPONSE_BYTES = 131072;

/** Max patch size in chars for diff tool (matching amp's GuT = 4096) */
export const MAX_PATCH_SIZE = 4096;

/** Max content size for tool output truncation (100k chars as specified) */
export const MAX_OUTPUT_CHARS = 100_000;

/**
 * Parse a repository string into "owner/repo" format.
 *
 * 逆向: amp-cli-reversed/modules/0011_unknown_Kx.js
 * - Handles full URLs (github.com only)
 * - Strips .git suffix
 * - Strips leading/trailing slashes
 * - Validates owner/repo format
 */
export function parseRepository(repository: string): string {
  let cleaned = repository.trim();

  // Handle full URLs
  if (cleaned.includes("://")) {
    const url = new URL(cleaned);
    if (url.hostname !== "github.com") {
      throw new Error("Only github.com repositories are supported");
    }
    cleaned = url.pathname;
  }

  // Strip .git and leading/trailing slashes
  cleaned = cleaned.replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");

  const parts = cleaned.split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository: expected "owner/repo" but got "${cleaned}"`);
  }
  return `${parts[0]}/${parts[1]}`;
}

/**
 * Check if a GitHub API response represents file content (has content + encoding).
 *
 * 逆向: amp-cli-reversed/modules/0014_unknown_UGR.js — NGR function
 */
export function isFileContent(data: unknown): data is { content: string; encoding: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    typeof (data as Record<string, unknown>).content === "string" &&
    typeof (data as Record<string, unknown>).encoding === "string"
  );
}

/**
 * Describe the type of non-file content returned by GitHub API.
 *
 * 逆向: amp-cli-reversed/modules/0014_unknown_UGR.js — UGR function
 */
export function describeContentType(data: unknown): string {
  if (Array.isArray(data)) return "directory";
  if (typeof data === "object" && data !== null) {
    const type = (data as Record<string, unknown>).type;
    if (typeof type === "string") return type;
  }
  return "unsupported content";
}

/**
 * Format a directory listing from GitHub API content array.
 * Directories get trailing slash, sorted: dirs first, then files.
 *
 * 逆向: amp-cli-reversed/modules/0013_unknown_VzT.js
 */
export function formatDirectoryEntries(
  items: Array<{ name: string; type: string }>,
): string[] {
  const entries = items.map((item) => (item.type === "dir" ? `${item.name}/` : item.name));
  entries.sort((a, b) => {
    const aIsDir = a.endsWith("/");
    const bIsDir = b.endsWith("/");
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });
  return entries;
}

/**
 * Apply a read_range to a list (entries or lines), showing omission markers.
 *
 * 逆向: amp-cli-reversed/modules/1731_unknown_NLT.js
 */
export function applyReadRange(
  items: string[],
  readRange: [number, number] | undefined,
  maxItems: number,
): string {
  const total = items.length;
  const start = readRange ? Math.max(0, readRange[0] - 1) : 0;
  const end = readRange ? Math.min(total, readRange[1]) : Math.min(total, maxItems);

  const result: string[] = [];
  if (start > 0) {
    result.push(`[... omitted ${start} ${start === 1 ? "entry" : "entries"} ...]`);
  }
  result.push(...items.slice(start, end));
  if (end < total) {
    result.push(`[... omitted ${total - end} more ...]`);
  }
  return result.join("\n");
}

/**
 * Decode base64 content from GitHub API.
 *
 * 逆向: amp-cli-reversed/modules/0012_unknown_BGR.js — wGR function
 */
export function decodeBase64Content(base64: string): string {
  const cleaned = base64.replace(/\n/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Simple glob matching for file paths.
 * Supports: *, **, ?, {a,b}, [abc] patterns.
 *
 * 逆向: amp-cli-reversed/modules/0012_unknown_BGR.js — BGR function
 * Amp implements its own glob matching rather than using a library.
 */
export function globMatch(pattern: string, path: string): boolean {
  let regex = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern.charAt(i);
    if (ch === "*") {
      if (pattern.charAt(i + 1) === "*") {
        if (pattern.charAt(i + 2) === "/") {
          regex += "(?:.+/)?";
          i += 3;
        } else {
          regex += ".*";
          i += 2;
        }
      } else {
        regex += "[^/]*";
        i++;
      }
    } else if (ch === "?") {
      regex += "[^/]";
      i++;
    } else if (ch === "{") {
      const closeIdx = pattern.indexOf("}", i);
      if (closeIdx !== -1) {
        const alternatives = pattern.slice(i + 1, closeIdx).split(",");
        regex += `(?:${alternatives.map(escapeRegex).join("|")})`;
        i = closeIdx + 1;
      } else {
        regex += escapeRegex(ch);
        i++;
      }
    } else if (ch === "[") {
      const closeIdx = pattern.indexOf("]", i);
      if (closeIdx !== -1) {
        regex += pattern.slice(i, closeIdx + 1);
        i = closeIdx + 1;
      } else {
        regex += escapeRegex(ch);
        i++;
      }
    } else {
      regex += escapeRegex(ch);
      i++;
    }
  }
  return new RegExp(`^${regex}$`).test(path);
}

/**
 * Escape a string for use in a regular expression.
 * 逆向: amp-cli-reversed/modules/0013_unknown_VzT.js — e4 function
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Truncate a string to a maximum number of characters with a truncation note.
 */
export function truncateOutput(content: string, maxChars: number = MAX_OUTPUT_CHARS): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + "\n... [truncated]";
}
