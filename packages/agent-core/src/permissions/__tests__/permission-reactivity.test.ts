/**
 * PermissionEngine reactivity tests
 *
 * Verifies that PermissionEngine.check() reads config via getConfig() on each
 * invocation, making it inherently reactive to settings changes without restart.
 *
 * 逆向: amp's ToolPermissionsService evaluates permissions at call-time from
 * getConfig() rather than caching them. Settings propagated via observable
 * (amp-cli-reversed/modules/0412_unknown_S_0.js:14-16):
 *   r = e.changes.subscribe(i => a.next(i)),
 *   h = t.changes.subscribe(i => a.next(i))
 *
 * Flitter's PermissionEngine follows the same pattern: getConfig() is called
 * on every checkPermission() invocation, so config updates take effect
 * immediately without any explicit cache invalidation.
 */

import { describe, expect, it } from "bun:test";
import type { Config, ToolApprovalRequest } from "@flitter/schemas";
import type { Subject } from "@flitter/util";
import { PermissionEngine } from "../engine";

// ─── Test helpers ──────────────────────────────────────────

function createMockConfig(
  permissions: Array<{ tool: string; action: string; matches?: Record<string, unknown> }>,
): Config {
  return {
    settings: { permissions } as Config["settings"],
    secrets: {
      getToken: async () => undefined,
      isSet: () => false,
    },
  } as unknown as Config;
}

function createMockSubject<T>(): Subject<T> {
  return {
    next: (_value: T) => {},
    error: (_err: unknown) => {},
    complete: () => {},
    subscribe: () => ({ unsubscribe: () => {} }),
  } as unknown as Subject<T>;
}

function createEngine(getConfig: () => Config, workspaceRoot = "/tmp/test") {
  return new PermissionEngine({
    getConfig,
    pendingApprovals$: createMockSubject<ToolApprovalRequest[]>(),
    workspaceRoot,
  });
}

// ─── Tests ─────────────────────────────────────────────────

describe("PermissionEngine reactivity", () => {
  it("re-evaluates permissions when config changes", () => {
    // Start with Bash requiring ask
    let config = createMockConfig([{ tool: "Bash", action: "ask" }]);
    const getConfig = () => config;

    const engine = createEngine(getConfig);

    // Initial: Bash requires ask
    const result1 = engine.checkPermission("Bash", { command: "ls" });
    expect(result1.action).toBe("ask");
    expect(result1.permitted).toBe(false);

    // Change config: allow Bash — no restart, no explicit invalidation
    config = createMockConfig([{ tool: "Bash", action: "allow" }]);

    // Re-check: should now be allowed
    const result2 = engine.checkPermission("Bash", { command: "ls" });
    expect(result2.action).toBe("ask"); // schema field — but permitted changes
    expect(result2.permitted).toBe(true);
  });

  it("handles permissions removed mid-session (falls back to default rules)", () => {
    let config = createMockConfig([
      { tool: "Write", action: "allow", matches: { file_path: "/tmp/**" } },
    ]);
    const getConfig = () => config;

    const engine = createEngine(getConfig, "/tmp/test");

    // Initial: Write to /tmp/foo allowed by user rule
    const result1 = engine.checkPermission("Write", { file_path: "/tmp/foo.ts" });
    expect(result1.permitted).toBe(true);
    expect(result1.source).toBe("user-settings");

    // Remove all custom permissions
    config = createMockConfig([]);

    // Re-check: falls back to default rules
    // Default rule: Write allowed within workspaceRoot (/tmp/test/**)
    // /tmp/foo.ts is NOT under /tmp/test/** → falls to fallback → ask
    const result2 = engine.checkPermission("Write", { file_path: "/tmp/foo.ts" });
    expect(result2.permitted).toBe(false);
    expect(result2.source).toBeUndefined(); // no source when falling to fallback "ask"
  });

  it("permission change from reject to allow takes effect immediately", () => {
    let config = createMockConfig([{ tool: "Bash", action: "reject" }]);
    const getConfig = () => config;

    const engine = createEngine(getConfig);

    // Initial: Bash is rejected
    const result1 = engine.checkPermission("Bash", {});
    expect(result1.permitted).toBe(false);
    expect(result1.action).toBe("reject");

    // Admin changes config to allow Bash
    config = createMockConfig([{ tool: "Bash", action: "allow" }]);

    const result2 = engine.checkPermission("Bash", {});
    expect(result2.permitted).toBe(true);
  });

  it("multiple sequential config changes all take effect", () => {
    let config = createMockConfig([{ tool: "Bash", action: "ask" }]);
    const getConfig = () => config;
    const engine = createEngine(getConfig);

    // Check 1: ask
    expect(engine.checkPermission("Bash", {}).action).toBe("ask");

    // Change to allow
    config = createMockConfig([{ tool: "Bash", action: "allow" }]);
    expect(engine.checkPermission("Bash", {}).permitted).toBe(true);

    // Change back to reject
    config = createMockConfig([{ tool: "Bash", action: "reject" }]);
    expect(engine.checkPermission("Bash", {}).action).toBe("reject");

    // Change to allow again
    config = createMockConfig([{ tool: "Bash", action: "allow" }]);
    expect(engine.checkPermission("Bash", {}).permitted).toBe(true);
  });

  it("adding new rules for previously-unmatched tools takes effect", () => {
    // Start with no user rules (unknown tool falls to fallback=ask)
    let config = createMockConfig([]);
    const getConfig = () => config;
    const engine = createEngine(getConfig);

    const result1 = engine.checkPermission("CustomTool", {});
    expect(result1.action).toBe("ask");
    expect(result1.permitted).toBe(false);

    // Add an allow rule for CustomTool
    config = createMockConfig([{ tool: "CustomTool", action: "allow" }]);

    const result2 = engine.checkPermission("CustomTool", {});
    expect(result2.permitted).toBe(true);
  });
});
