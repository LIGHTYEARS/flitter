/**
 * Provider API Key Wiring tests (GAP-DATA-14, GAP-DATA-15)
 *
 * Verifies that getToken("apiKey") and isSet("apiKey") resolve the correct
 * provider-specific settings key and env vars based on the active model.
 *
 * 逆向: amp's OpenRouter pattern (chunk-002.js:18070-18072) and
 *        Gemini YdR() (modules/0975_unknown_YdR.js)
 */
import { afterEach, describe, expect, test } from "bun:test";
import type { FileSettingsStorage } from "@flitter/data";
import type { ContainerOptions, SecretStorage } from "../container";
import { createConfigService } from "../factory";

// ── Helpers ─────────────────────────────────────────────

function createMockSecretStorage(): SecretStorage {
  return {
    async get() {
      return undefined;
    },
    async set() {},
    async delete() {},
  };
}

function createMockSettingsStorage(overrides: Record<string, unknown> = {}): FileSettingsStorage {
  return {
    async get(key: string) {
      return overrides[key];
    },
    set: async () => {},
    append: async () => {},
    prepend: async () => {},
    delete: async () => {},
    getWatchPaths: () => [],
    getAll: () => ({}),
    getAllForScope: () => ({}),
  } as unknown as FileSettingsStorage;
}

function createOpts(settings: Record<string, unknown> = {}): ContainerOptions {
  return {
    settings: createMockSettingsStorage(settings),
    secrets: createMockSecretStorage(),
    workspaceRoot: "/tmp/test",
    homeDir: "/tmp/home",
    configDir: "/tmp/config",
  };
}

// Save and restore env vars
const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
] as const;

let savedEnv: Record<string, string | undefined> = {};

function saveEnv() {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] !== undefined) {
      process.env[key] = savedEnv[key];
    } else {
      delete process.env[key];
    }
  }
  savedEnv = {};
}

// ── Tests ───────────────────────────────────────────────

describe("Provider API key wiring", () => {
  afterEach(() => {
    restoreEnv();
  });

  // ── Anthropic (default) ─────────────────────────────

  test("anthropic: getToken reads anthropic.apiKey from settings", async () => {
    const configService = createConfigService(
      createOpts({
        "anthropic.apiKey": "sk-ant-test-key",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("sk-ant-test-key");
  });

  test("anthropic: getToken reads ANTHROPIC_API_KEY from env", async () => {
    saveEnv();
    process.env.ANTHROPIC_API_KEY = "sk-ant-env-key";
    const configService = createConfigService(createOpts());
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("sk-ant-env-key");
  });

  test("anthropic: isSet returns true for ANTHROPIC_API_KEY env", () => {
    saveEnv();
    process.env.ANTHROPIC_API_KEY = "sk-ant-env-key";
    const configService = createConfigService(createOpts());
    const config = configService.get();
    expect(config.secrets.isSet("apiKey")).toBe(true);
  });

  // ── Gemini ──────────────────────────────────────────

  test("gemini: getToken reads gemini.apiKey from settings", async () => {
    const configService = createConfigService(
      createOpts({
        "internal.model": "gemini-2.5-pro",
        "gemini.apiKey": "AIza-gemini-key",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("AIza-gemini-key");
  });

  test("gemini: getToken reads GOOGLE_API_KEY from env (priority over GEMINI_API_KEY)", async () => {
    saveEnv();
    process.env.GOOGLE_API_KEY = "AIza-google-key";
    process.env.GEMINI_API_KEY = "AIza-gemini-key";
    const configService = createConfigService(
      createOpts({
        "internal.model": "gemini-2.5-pro",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("AIza-google-key");
  });

  test("gemini: getToken falls back to GEMINI_API_KEY when GOOGLE_API_KEY absent", async () => {
    saveEnv();
    process.env.GEMINI_API_KEY = "AIza-gemini-env";
    const configService = createConfigService(
      createOpts({
        "internal.model": "gemini-2.5-flash",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("AIza-gemini-env");
  });

  test("gemini: getToken returns undefined when no key configured", async () => {
    saveEnv();
    const configService = createConfigService(
      createOpts({
        "internal.model": "gemini-2.5-pro",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBeUndefined();
  });

  // ── OpenAI ──────────────────────────────────────────

  test("openai: getToken reads openai.apiKey from settings", async () => {
    const configService = createConfigService(
      createOpts({
        "internal.model": "gpt-4o",
        "openai.apiKey": "sk-openai-key",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("sk-openai-key");
  });

  test("openai: getToken reads OPENAI_API_KEY from env", async () => {
    saveEnv();
    process.env.OPENAI_API_KEY = "sk-openai-env";
    const configService = createConfigService(
      createOpts({
        "internal.model": "gpt-4o-mini",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("sk-openai-env");
  });

  // ── isSet edge cases ────────────────────────────────

  test("isSet returns true when any provider env var is set (before getToken called)", () => {
    saveEnv();
    process.env.OPENAI_API_KEY = "sk-openai-env";
    const configService = createConfigService(createOpts());
    const config = configService.get();
    // Before getToken() is called, isSet should check all env vars
    expect(config.secrets.isSet("apiKey")).toBe(true);
  });

  test("isSet returns false when no env vars set and no cached key", () => {
    saveEnv();
    const configService = createConfigService(createOpts());
    const config = configService.get();
    expect(config.secrets.isSet("apiKey")).toBe(false);
  });

  test("isSet returns true after getToken populates cache from settings", async () => {
    const configService = createConfigService(
      createOpts({
        "internal.model": "gemini-2.5-pro",
        "gemini.apiKey": "AIza-cached-key",
      }),
    );
    const config = configService.get();
    // First call populates the cache
    await config.secrets.getToken("apiKey");
    // Now isSet should use the cached value
    expect(config.secrets.isSet("apiKey")).toBe(true);
  });

  // ── Settings take priority over env ─────────────────

  test("settings-based key takes priority over env var", async () => {
    saveEnv();
    process.env.ANTHROPIC_API_KEY = "sk-ant-env";
    const configService = createConfigService(
      createOpts({
        "anthropic.apiKey": "sk-ant-settings",
      }),
    );
    const config = configService.get();
    const key = await config.secrets.getToken("apiKey");
    expect(key).toBe("sk-ant-settings");
  });
});
