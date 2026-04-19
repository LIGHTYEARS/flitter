/**
 * @flitter/agent-core — Toolbox utility functions
 *
 * Name sanitization and path resolution for the toolbox system.
 *
 * 逆向: chunk-002.js:30409 — O5R() name sanitization
 *       chunk-002.js:30648-30662 — D5R() path resolution
 */

import { join } from "node:path";

// ─── Constants ───────────────────────────────────────────

/** Prefix for all toolbox tool names (prevents collision with builtins) */
export const TOOLBOX_PREFIX = "tb__";

/** Max length of the sanitized name portion (before prefix) */
const MAX_TOOL_NAME_LENGTH = 120;

/** Max number of tools per directory */
export const MAX_TOOLS_PER_DIRECTORY = 100;

/** Timeout for describe probes (milliseconds) */
export const DESCRIBE_TIMEOUT_MS = 5_000;

/** Max output length for execute (characters) */
export const MAX_OUTPUT_LENGTH = 30_000;

/** Default execute timeout (milliseconds) */
export const DEFAULT_EXECUTE_TIMEOUT_MS = 120_000;

// ─── Name sanitization ──────────────────────────────────

/**
 * Sanitize a tool name: replace spaces with hyphens, strip invalid chars,
 * collapse runs of hyphens, trim leading/trailing hyphens, limit length.
 *
 * 逆向: chunk-002.js:30409-30411 — O5R(T)
 *   T.replace(/\s+/g, "-")
 *   .replace(/[^a-zA-Z0-9_-]/g, "")
 *   .replace(/-+/g, "-")
 *   .replace(/^-+|-+$/g, "")
 *   .slice(0, 120) || "tool"
 */
export function sanitizeToolName(name: string): string {
  return (
    name
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_TOOL_NAME_LENGTH) || "tool"
  );
}

/**
 * Build the full toolbox tool name: `tb__<sanitized>`.
 *
 * 逆向: chunk-002.js:30282-30283 — `tb__${O5R(v.name)}`
 */
export function toToolboxName(name: string): string {
  return `${TOOLBOX_PREFIX}${sanitizeToolName(name)}`;
}

// ─── Path resolution ────────────────────────────────────

/**
 * Resolve toolbox directories from settings and environment.
 *
 * Priority:
 * 1. FLITTER_TOOLBOX env var (colon-separated paths)
 * 2. settings["toolbox.path"] (colon-separated paths)
 * 3. Default: ~/.local/share/flitter/tools
 *
 * 逆向: chunk-002.js:30648-30662 — D5R(T, R)
 *   Uses env AMP_TOOLBOX or config "toolbox.path", falls back to kj (default path).
 *   Parses colon-separated paths via Y9T().
 */
export function resolveToolboxPaths(
  settingsToolboxPath: string | undefined,
  homeDir: string,
): string[] {
  // 1. Environment variable takes precedence
  const envPath = process.env.FLITTER_TOOLBOX;

  // 逆向: D5R(T, R) — `let a = R || T` — config overrides env
  const raw = settingsToolboxPath || envPath;

  if (raw === undefined) {
    // No config → use default path
    // 逆向: D5R returns [kj] (default path)
    return [join(homeDir, ".local", "share", "flitter", "tools")];
  }

  // Parse colon-separated paths (逆向: Y9T)
  const paths = raw
    .split(":")
    .map((p) => p.trim())
    .filter(Boolean);

  if (paths.length === 0) {
    return [];
  }

  return paths;
}
