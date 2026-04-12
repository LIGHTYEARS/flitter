/**
 * Keyring credential storage
 *
 * Provides a SecretStore interface and FileSecretStore / NativeSecretStore backends.
 *
 * @example
 * ```ts
 * import { createSecretStore } from '@flitter/util';
 * const store = await createSecretStore({ secretsDir: '/home/user/.config/flitter/secrets', useNativeKeyring: false });
 * await store.set('token', 'abc123', 'https://api.example.com');
 * const token = await store.get('token', 'https://api.example.com');
 * ```
 */
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { Subject } from "../reactive/index";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface SecretStore {
  get(key: string, url: string): Promise<string | undefined>;
  set(key: string, value: string, url: string): Promise<void>;
  delete(key: string, url: string): Promise<void>;
  readonly changes: Subject<void>;
}

// ---------------------------------------------------------------------------
// URL normalisation helpers
// ---------------------------------------------------------------------------

function normalizeUrl(url: string): string {
  // Strip trailing slashes
  let normalized = url.replace(/\/+$/, "");
  // Lowercase scheme and host
  try {
    const parsed = new URL(normalized);
    normalized =
      parsed.protocol +
      "//" +
      parsed.host.toLowerCase() +
      parsed.pathname +
      parsed.search +
      parsed.hash;
    // Strip trailing slashes again after reconstruction
    normalized = normalized.replace(/\/+$/, "");
  } catch {
    // Not a valid URL, use as-is
  }
  return normalized;
}

function composeKey(key: string, url: string): string {
  return `${key}@${normalizeUrl(url)}`;
}

// ---------------------------------------------------------------------------
// FileSecretStore -- JSON file backed store
// ---------------------------------------------------------------------------

export class FileSecretStore implements SecretStore {
  private _filePath: string;
  readonly changes: Subject<void> = new Subject<void>();

  constructor(secretsFilePath: string) {
    this._filePath = secretsFilePath;
  }

  /** Visible for testing. */
  get filePath(): string {
    return this._filePath;
  }

  private async _readStore(): Promise<Record<string, string>> {
    try {
      const content = await fs.promises.readFile(this._filePath, "utf-8");
      return JSON.parse(content);
    } catch (err: unknown) {
      if (err instanceof Error && "code" in err && err.code === "ENOENT")
        return {};
      // Corrupt JSON -- return empty
      if (err instanceof SyntaxError) return {};
      throw err;
    }
  }

  private async _writeStore(data: Record<string, string>): Promise<void> {
    const dir = path.dirname(this._filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    // Atomic write: write to temp file then rename
    const tmpPath =
      this._filePath + ".tmp." + process.pid + "." + Date.now() + "." + crypto.randomBytes(4).toString("hex");
    await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), {
      mode: 0o600,
    });
    await fs.promises.rename(tmpPath, this._filePath);
  }

  async get(key: string, url: string): Promise<string | undefined> {
    const store = await this._readStore();
    return store[composeKey(key, url)];
  }

  async set(key: string, value: string, url: string): Promise<void> {
    const store = await this._readStore();
    store[composeKey(key, url)] = value;
    await this._writeStore(store);
    this.changes.next();
  }

  async delete(key: string, url: string): Promise<void> {
    const store = await this._readStore();
    const ck = composeKey(key, url);
    if (ck in store) {
      delete store[ck];
      await this._writeStore(store);
      this.changes.next();
    }
  }
}

// ---------------------------------------------------------------------------
// NativeSecretStore -- OS keychain backed store (@napi-rs/keyring)
// ---------------------------------------------------------------------------

export class NativeSecretStore implements SecretStore {
  readonly changes: Subject<void> = new Subject<void>();
  private _native: {
    Entry: new (service: string, key: string) => {
      getPassword(): string | null;
      setPassword(value: string): void;
      deletePassword(): void;
    };
  };

  private constructor(native: NativeSecretStore["_native"]) {
    this._native = native;
  }

  static async create(): Promise<NativeSecretStore | null> {
    try {
      // Try to dynamically import @napi-rs/keyring
      // Use a variable to avoid TS2307 when the optional package is not installed
      const moduleName = "@napi-rs/keyring";
      const mod: NativeSecretStore["_native"] = await import(moduleName);
      return new NativeSecretStore(mod);
    } catch {
      return null;
    }
  }

  async get(key: string, url: string): Promise<string | undefined> {
    try {
      const entry = new this._native.Entry("flitter", composeKey(key, url));
      const password = entry.getPassword();
      return password ?? undefined;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: string, url: string): Promise<void> {
    const entry = new this._native.Entry("flitter", composeKey(key, url));
    entry.setPassword(value);
    this.changes.next();
  }

  async delete(key: string, url: string): Promise<void> {
    try {
      const entry = new this._native.Entry("flitter", composeKey(key, url));
      entry.deletePassword();
      this.changes.next();
    } catch {
      // Key might not exist
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function createSecretStore(options: {
  secretsDir: string;
  useNativeKeyring: boolean;
}): Promise<SecretStore> {
  // Ensure secrets directory exists
  await fs.promises.mkdir(options.secretsDir, { recursive: true });

  if (options.useNativeKeyring) {
    const native = await NativeSecretStore.create();
    if (native) return native;
  }

  const filePath = path.join(options.secretsDir, "secrets.json");
  return new FileSecretStore(filePath);
}
