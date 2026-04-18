/**
 * Admin (managed) settings reader — read-only system-level configuration.
 *
 * 逆向: sHR() (1275_unknown_sHR.js) path resolution,
 *        oHR() (chunk-002.js:25084) file reading with ENOENT handling,
 *        JmT compute (chunk-005.js:145039) JSON parsing with prefix stripping.
 *
 * Amp returns "{}" on ENOENT and silently swallows parse errors.
 * Prefix stripping: only keys starting with "flitter." are included,
 * with the "flitter." prefix stripped (amp uses "amp." prefix).
 */
import * as fs from "node:fs/promises";

/**
 * Returns the platform-specific path for the admin managed-settings file,
 * or null if the platform is not supported.
 *
 * 逆向: sHR() — modules/1275_unknown_sHR.js
 */
export function getAdminSettingsPath(): string | null {
  switch (process.platform) {
    case "darwin":
      return "/Library/Application Support/flitter/managed-settings.json";
    case "linux":
      return "/etc/flitter/managed-settings.json";
    case "win32":
      return "C:\\ProgramData\\flitter\\managed-settings.json";
    default:
      return null;
  }
}

/**
 * Read and parse the admin settings file.
 *
 * Returns a Record of settings with "flitter." prefix stripped from keys.
 * Keys without "flitter." prefix are ignored.
 * Returns {} on ENOENT, invalid JSON, or unsupported platform.
 *
 * 逆向: oHR() (chunk-002.js:25084) — ENOENT → return "{}",
 *        JmT compute (chunk-005.js:145039) — parse + prefix stripping.
 */
export async function readAdminSettings(
  filePath?: string | null,
): Promise<Record<string, unknown>> {
  const resolvedPath = filePath ?? getAdminSettingsPath();
  if (!resolvedPath) return {};

  let raw: string;
  try {
    raw = await fs.readFile(resolvedPath, "utf-8");
  } catch (_err) {
    // ENOENT or any other read error → return empty (amp: ENOENT → "{}")
    return {};
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Invalid JSON → silently return empty (amp logs warn and returns {})
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith("flitter.")) {
      result[key.substring("flitter.".length)] = value;
    }
  }
  return result;
}
