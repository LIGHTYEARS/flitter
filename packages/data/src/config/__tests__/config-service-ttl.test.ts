/**
 * Tests for Gap 15: Admin settings TTL caching via GlobalCachedValue
 *
 * Verifies that ConfigService wires GlobalCachedValue for readAdminSettings
 * with softTTL=30s, hardTTL=120s, matching amp's behavior.
 *
 * 逆向: amp-cli-reversed/chunk-005.js:145039-145077
 *   JmT = new d5T({ softTTL: 30000, hardTTL: 120000, compute: () => oHR(), changes: cHR })
 */
import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as os from "node:os";
import type { SecretStore } from "@flitter/schemas";
import type { FileSettingsStorage } from "../settings-storage";

// ─── Track readAdminSettings calls ─────────────────────
let readAdminSettingsCallCount = 0;
let readAdminSettingsReturnValue: Record<string, unknown> = {};

// Mock readAdminSettings BEFORE importing ConfigService
mock.module("../admin-settings", () => ({
  readAdminSettings: async () => {
    readAdminSettingsCallCount++;
    // Return a copy to avoid shared mutation
    return { ...readAdminSettingsReturnValue };
  },
}));

// Import after mock is set up
const { ConfigService } = await import("../config-service");

// ─── Helpers ────────────────────────────────────────────

function createMockStorage(globalSettings: Record<string, unknown> = {}): FileSettingsStorage {
  return {
    read: mock(async (scope: string) => {
      if (scope === "global") return globalSettings;
      return {};
    }),
    write: mock(async () => {}),
    set: mock(async () => {}),
    get: mock(async () => undefined),
    append: mock(async () => {}),
    prepend: mock(async () => {}),
    delete: mock(async () => {}),
    getWatchPaths: mock(() => []),
    keys: mock(async () => []),
  } as unknown as FileSettingsStorage;
}

const mockSecretStore: SecretStore = {
  getToken: async () => undefined,
  isSet: () => false,
};

function makeService(globalSettings: Record<string, unknown> = {}) {
  return new ConfigService({
    storage: createMockStorage(globalSettings),
    secretStorage: mockSecretStore,
    workspaceRoot: null,
    homeDir: os.homedir(),
    userConfigDir: "/tmp/flitter-ttl-test",
  });
}

// ─── Tests ──────────────────────────────────────────────

describe("Gap 15: Admin settings TTL caching", () => {
  beforeEach(() => {
    readAdminSettingsCallCount = 0;
    readAdminSettingsReturnValue = {};
  });

  it("first reload() calls through to readAdminSettings", async () => {
    const service = makeService();
    await service.reload();

    expect(readAdminSettingsCallCount).toBe(1);
  });

  it("second reload() within softTTL returns cached value (no recompute)", async () => {
    const service = makeService();

    // First reload — triggers compute
    await service.reload();
    expect(readAdminSettingsCallCount).toBe(1);

    // Second reload — should use cached value (within 30s softTTL)
    await service.reload();
    expect(readAdminSettingsCallCount).toBe(1);
  });

  it("multiple rapid reloads only call readAdminSettings once", async () => {
    const service = makeService();

    // Fire 5 reloads in rapid succession
    await Promise.all([
      service.reload(),
      service.reload(),
      service.reload(),
      service.reload(),
      service.reload(),
    ]);

    // GlobalCachedValue deduplicates: first call triggers compute,
    // subsequent calls within TTL return cached value
    expect(readAdminSettingsCallCount).toBe(1);
  });

  it("admin settings are merged into final config", async () => {
    // Use a key that exists in SettingsSchema so Zod validation doesn't strip it
    readAdminSettingsReturnValue = { proxy: "http://admin-proxy" };
    const service = makeService({ proxy: "http://global-proxy" });

    await service.reload();
    const config = service.get();
    const settings = config.settings as Record<string, unknown>;

    // Admin settings should override global settings
    expect(settings.proxy).toBe("http://admin-proxy");
  });

  it("change event fires when admin settings change", async () => {
    const service = makeService();

    // Access the cache's events subject via the private field
    const cache = (
      service as unknown as {
        _adminSettingsCache: {
          events: { subscribe: (fn: (v: unknown) => void) => { unsubscribe: () => void } };
        };
      }
    )._adminSettingsCache;

    const receivedEvents: unknown[] = [];
    const sub = cache.events.subscribe((event: unknown) => {
      receivedEvents.push(event);
    });

    // First reload — compute runs, changes(undefined, {}) — empty old→empty new, no change event
    readAdminSettingsReturnValue = {};
    await service.reload();

    // Force cache to recompute by accessing its refresh method
    // (bypasses TTL to simulate time passing)
    readAdminSettingsReturnValue = { proxy: "http://changed-proxy" };
    const cacheInternal = cache as unknown as { refresh: () => Promise<unknown> };
    await cacheInternal.refresh();

    // Should have received a change event with the list of changed keys
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const lastEvent = receivedEvents[receivedEvents.length - 1] as string[];
    expect(Array.isArray(lastEvent)).toBe(true);
    expect(lastEvent).toContain("proxy");

    sub.unsubscribe();
  });

  it("changes callback returns undefined when settings are identical", async () => {
    const service = makeService();

    const cache = (
      service as unknown as {
        _adminSettingsCache: {
          events: { subscribe: (fn: (v: unknown) => void) => { unsubscribe: () => void } };
        };
      }
    )._adminSettingsCache;

    const receivedEvents: unknown[] = [];
    const sub = cache.events.subscribe((event: unknown) => {
      receivedEvents.push(event);
    });

    // First call — goes from undefined to {}
    readAdminSettingsReturnValue = {};
    await service.reload();
    const eventsAfterFirst = receivedEvents.length;

    // Force refresh with same value — changes should return undefined (no emit)
    const cacheInternal = cache as unknown as { refresh: () => Promise<unknown> };
    await cacheInternal.refresh();

    // No new events should have fired since the value didn't change
    expect(receivedEvents.length).toBe(eventsAfterFirst);

    sub.unsubscribe();
  });
});
