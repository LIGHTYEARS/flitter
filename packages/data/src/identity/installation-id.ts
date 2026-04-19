/**
 * @flitter/data — Installation ID & device fingerprint
 *
 * Provides stable per-machine identity for analytics headers and DTW identification.
 * 逆向: amp-cli-reversed/modules/1609_AmpSDK_sN.js lines 18-26
 *   ZlR(T) sets installationID and deviceFingerprint
 *   JlR() returns { installationID, deviceFingerprint }
 */
import * as crypto from "node:crypto";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Get or create a persistent installation ID.
 * Reads from `{dataDir}/installation-id`; creates a UUID v4 if missing.
 * 逆向: amp stores installationID via ZlR and persists it
 */
export async function getOrCreateInstallationId(dataDir: string): Promise<string> {
  const filePath = path.join(dataDir, "installation-id");
  try {
    const content = await fsp.readFile(filePath, "utf-8");
    const trimmed = content.trim();
    if (trimmed.length > 0) return trimmed;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
      throw err;
    }
  }

  // Generate new UUID v4
  const id = crypto.randomUUID();
  await fsp.mkdir(dataDir, { recursive: true });
  await fsp.writeFile(filePath, id, "utf-8");
  return id;
}

/**
 * Generate a device fingerprint from machine characteristics.
 * SHA-256 hash of hostname + platform + arch.
 * 逆向: amp sets deviceFingerprint alongside installationID in ZlR
 */
export function getDeviceFingerprint(): string {
  const raw = `${os.hostname()}${os.platform()}${os.arch()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}
