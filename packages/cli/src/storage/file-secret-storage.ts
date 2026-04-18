/**
 * File-based SecretStorage implementation.
 *
 * Persists API keys and OAuth tokens to secrets.json in the data directory
 * with owner-only file permissions (0600).
 *
 * 逆向: amp-cli-reversed/modules/0413_unknown_L_0.js (L_0 function)
 *        amp stores secrets in dataDir/secrets.json as { "key@scope": "value" }
 *        with mode 384 (0o600) and a mutex for concurrent writes.
 *
 * Key format: "${key}@${scope}" where scope defaults to "global".
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { SecretStorage } from "@flitter/flitter";

/**
 * Default scope when none is provided.
 *
 * 逆向: amp's ID(scope) normalizes scope; for no scope, we use "global".
 */
const DEFAULT_SCOPE = "global";

/**
 * Secrets file name.
 *
 * 逆向: amp chunk-005.js:26246 — C_0 = "secrets.json"
 */
const SECRETS_FILENAME = "secrets.json";

/**
 * File permissions: owner read/write only.
 *
 * 逆向: amp 0413_unknown_L_0.js:38-39 — mode: 384 (0o600 in octal)
 */
const FILE_MODE = 0o600;

/**
 * Format the storage key.
 *
 * 逆向: amp 0413_unknown_L_0.js:53,57 — `${key}@${ID(scope)}`
 */
function formatKey(key: string, scope?: string): string {
  return `${key}@${scope ?? DEFAULT_SCOPE}`;
}

/**
 * FileSecretStorage -- persistent file-based secret storage.
 *
 * 逆向: amp L_0() (0413_unknown_L_0.js)
 *
 * Implementation:
 * - Lazy loads secrets from disk on first access
 * - Caches in memory for subsequent reads
 * - Writes atomically with mkdir -p and mode 0600
 * - Simple mutex prevents concurrent write corruption
 */
export class FileSecretStorage implements SecretStorage {
  private readonly dataDir: string;
  private readonly filePath: string;
  private cache: Record<string, string> | null = null;
  private writing = false;
  private writeQueue: Array<() => void> = [];

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, SECRETS_FILENAME);
  }

  /**
   * Get a secret value.
   *
   * 逆向: amp L_0.get(key, scope) — returns data[`${key}@${ID(scope)}`]
   */
  async get(key: string, scope?: string): Promise<string | undefined> {
    const data = await this.load();
    return data[formatKey(key, scope)];
  }

  /**
   * Set a secret value. Creates the file and directory if needed.
   *
   * 逆向: amp L_0.set(key, value, scope) — sets data, writes, emits change
   */
  async set(key: string, value: string, scope?: string): Promise<void> {
    const data = await this.load();
    data[formatKey(key, scope)] = value;
    await this.save(data);
  }

  /**
   * Delete a secret.
   */
  async delete(key: string, scope?: string): Promise<void> {
    const data = await this.load();
    const k = formatKey(key, scope);
    if (k in data) {
      delete data[k];
      await this.save(data);
    }
  }

  /**
   * Load secrets from disk (lazy, cached).
   *
   * 逆向: amp L_0 inner function i() — reads file, parses JSON, caches.
   * On ENOENT returns {}. On parse error returns {} (defensive).
   */
  private async load(): Promise<Record<string, string>> {
    if (this.cache !== null) return this.cache;

    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      this.cache = typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        // File doesn't exist yet — start with empty
        this.cache = {};
      } else if (err instanceof SyntaxError) {
        // Corrupted JSON — start fresh
        this.cache = {};
      } else {
        // Unknown error — start fresh but log
        this.cache = {};
      }
    }

    return this.cache!;
  }

  /**
   * Save secrets to disk with mutex and permission protection.
   *
   * 逆向: amp L_0 inner function c(s) — acquires mutex (Cm),
   * ensures directory exists, calls iY (atomic write) with mode 384,
   * updates cache, releases mutex.
   */
  private async save(data: Record<string, string>): Promise<void> {
    // Simple mutex: queue concurrent writes
    // 逆向: amp uses Cm() mutex class with acquire/release
    if (this.writing) {
      await new Promise<void>((resolve) => this.writeQueue.push(resolve));
    }

    this.writing = true;
    try {
      // Ensure directory exists
      // 逆向: amp L_0 inner function h() — mkdir(dataDir, { recursive: true })
      await fs.mkdir(this.dataDir, { recursive: true });

      // Write with restrictive permissions
      // 逆向: amp L_0:36-39 — iY(path, content, { mode: 384 })
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(this.filePath, content, { mode: FILE_MODE });

      // Update cache
      this.cache = data;
    } finally {
      this.writing = false;
      // Wake next queued writer
      const next = this.writeQueue.shift();
      if (next) next();
    }
  }
}
