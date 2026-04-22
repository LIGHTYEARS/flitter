/**
 * Tests for GAP-CLI-41: /permissions-enable and /permissions-disable commands.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:1161-1183
 *   permissions-enable:  Ms("dangerouslyAllowAll", false) → re-enables permission checks
 *   permissions-disable: Ms("dangerouslyAllowAll", true)  → skips all permission checks
 *
 * 逆向: amp-cli-reversed/modules/1276_unknown_LX.js:11-16
 *   Ms(T, R) updates a BehaviorSubject (CX) with a runtime-only override.
 *   Flitter equivalent: configService.setRuntimeOverride(key, value).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBuiltinCommands } from "../slash-handlers.js";
import type { SlashCommandContext } from "../slash-registry.js";
import { SlashCommandRegistry } from "../slash-registry.js";

// ─── Helpers ──────────────────────────────────────────────

type Ctx = SlashCommandContext & { messages: string[] };

function makeCtx(overrides: Partial<SlashCommandContext> = {}): Ctx {
  const messages: string[] = [];
  return {
    messages,
    threadId: "test-thread-id",
    threadStore: {
      getThreadSnapshot: () =>
        ({
          id: "test-thread-id",
          v: 1,
          title: "Test Thread",
          messages: [],
          relationships: [],
          // biome-ignore lint/suspicious/noExplicitAny: test snapshot
        }) as any,
      setCachedThread: () => {},
      deleteThread: () => {},
    },
    threadWorker: {
      runInference: async () => {},
      cancelInference: () => {},
    },
    configService: {
      get: () => ({ settings: {} }),
    },
    showMessage: (msg) => messages.push(msg),
    clearInput: () => {},
    ...overrides,
  };
}

function makeRegistry(): SlashCommandRegistry {
  const registry = new SlashCommandRegistry();
  createBuiltinCommands(registry);
  return registry;
}

// ─── Registration Tests ──────────────────────────────────

describe("/permissions-enable registration", () => {
  it("is registered in the slash command registry", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("permissions-enable"), "permissions-enable should be registered");
  });
});

describe("/permissions-disable registration", () => {
  it("is registered in the slash command registry", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("permissions-disable"), "permissions-disable should be registered");
  });
});

// ─── /permissions-enable ─────────────────────────────────

describe("/permissions-enable", () => {
  it("sets dangerouslyAllowAll to false via setRuntimeOverride", async () => {
    const registry = makeRegistry();
    const overrides: Array<{ key: string; value: unknown }> = [];
    const ctx = makeCtx({
      configService: {
        get: () => ({ settings: { dangerouslyAllowAll: true } }),
        setRuntimeOverride: (key, value) => overrides.push({ key, value }),
      },
    });

    await registry.dispatch("permissions-enable", "", ctx);

    // 逆向: Ms("dangerouslyAllowAll", !1)
    assert.equal(overrides.length, 1, "should have called setRuntimeOverride once");
    assert.equal(overrides[0]!.key, "dangerouslyAllowAll");
    assert.equal(overrides[0]!.value, false);
  });

  it("shows confirmation message matching amp behavior", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      configService: {
        get: () => ({ settings: {} }),
        setRuntimeOverride: () => {},
      },
    });

    await registry.dispatch("permissions-enable", "", ctx);

    // 逆向: new Tc("Amp is now following permissions rules for this session")
    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.includes("following permissions rules"),
      `Expected confirmation: ${ctx.messages[0]}`,
    );
    assert.ok(
      ctx.messages[0]!.includes("this session"),
      `Expected 'this session': ${ctx.messages[0]}`,
    );
  });

  it("shows error when setRuntimeOverride is not available", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      configService: {
        get: () => ({ settings: {} }),
        // setRuntimeOverride is undefined
      },
    });

    await registry.dispatch("permissions-enable", "", ctx);

    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available"),
      `Expected 'not available' message: ${ctx.messages[0]}`,
    );
  });
});

// ─── /permissions-disable ────────────────────────────────

describe("/permissions-disable", () => {
  it("sets dangerouslyAllowAll to true via setRuntimeOverride", async () => {
    const registry = makeRegistry();
    const overrides: Array<{ key: string; value: unknown }> = [];
    const ctx = makeCtx({
      configService: {
        get: () => ({ settings: {} }),
        setRuntimeOverride: (key, value) => overrides.push({ key, value }),
      },
    });

    await registry.dispatch("permissions-disable", "", ctx);

    // 逆向: Ms("dangerouslyAllowAll", !0)
    assert.equal(overrides.length, 1, "should have called setRuntimeOverride once");
    assert.equal(overrides[0]!.key, "dangerouslyAllowAll");
    assert.equal(overrides[0]!.value, true);
  });

  it("shows confirmation message matching amp behavior", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      configService: {
        get: () => ({ settings: {} }),
        setRuntimeOverride: () => {},
      },
    });

    await registry.dispatch("permissions-disable", "", ctx);

    // 逆向: new Tc("Permissions disabled for this session - you will NOT ...")
    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.includes("Permissions disabled"),
      `Expected 'Permissions disabled': ${ctx.messages[0]}`,
    );
    assert.ok(
      ctx.messages[0]!.includes("will NOT be asked"),
      `Expected warning about no confirmation: ${ctx.messages[0]}`,
    );
  });

  it("shows error when setRuntimeOverride is not available", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      configService: {
        get: () => ({ settings: {} }),
        // setRuntimeOverride is undefined
      },
    });

    await registry.dispatch("permissions-disable", "", ctx);

    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available"),
      `Expected 'not available' message: ${ctx.messages[0]}`,
    );
  });
});

// ─── Toggle Round-trip ───────────────────────────────────

describe("permissions enable/disable round-trip", () => {
  it("disable then enable produces correct sequence of runtime overrides", async () => {
    const registry = makeRegistry();
    const overrides: Array<{ key: string; value: unknown }> = [];
    const settings: Record<string, unknown> = {};
    const ctx = makeCtx({
      configService: {
        get: () => ({ settings }),
        setRuntimeOverride: (key, value) => {
          overrides.push({ key, value });
          settings[key] = value;
        },
      },
    });

    // Disable first
    await registry.dispatch("permissions-disable", "", ctx);
    assert.equal(settings.dangerouslyAllowAll, true, "After disable: should be true");

    // Then re-enable
    await registry.dispatch("permissions-enable", "", ctx);
    assert.equal(settings.dangerouslyAllowAll, false, "After enable: should be false");

    // Verify two overrides were set in order
    assert.equal(overrides.length, 2);
    assert.deepEqual(overrides[0], { key: "dangerouslyAllowAll", value: true });
    assert.deepEqual(overrides[1], { key: "dangerouslyAllowAll", value: false });
  });
});
