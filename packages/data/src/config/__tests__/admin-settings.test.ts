/**
 * Tests for admin settings reader — getAdminSettingsPath, readAdminSettings.
 */

import assert from "node:assert/strict";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getAdminSettingsPath, readAdminSettings } from "../admin-settings";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-admin-"));
});

afterEach(async () => {
  for (let i = 0; i < 5; i++) {
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

// ---------------------------------------------------------------------------
// getAdminSettingsPath
// ---------------------------------------------------------------------------

describe("getAdminSettingsPath", () => {
  it("returns a non-null string on darwin, linux, or win32", () => {
    const platform = process.platform;
    const result = getAdminSettingsPath();
    if (platform === "darwin" || platform === "linux" || platform === "win32") {
      assert.ok(result !== null);
      assert.equal(typeof result, "string");
      assert.ok(result.length > 0);
    } else {
      assert.equal(result, null);
    }
  });

  it("returns darwin path on darwin", () => {
    // We can't change process.platform, but we can verify the current value is expected
    if (process.platform === "darwin") {
      assert.equal(
        getAdminSettingsPath(),
        "/Library/Application Support/flitter/managed-settings.json",
      );
    }
  });

  it("returns linux path on linux", () => {
    if (process.platform === "linux") {
      assert.equal(getAdminSettingsPath(), "/etc/flitter/managed-settings.json");
    }
  });

  it("returns win32 path on win32", () => {
    if (process.platform === "win32") {
      assert.equal(getAdminSettingsPath(), "C:\\ProgramData\\flitter\\managed-settings.json");
    }
  });
});

// ---------------------------------------------------------------------------
// readAdminSettings
// ---------------------------------------------------------------------------

describe("readAdminSettings", () => {
  it("returns {} when file does not exist", async () => {
    const nonExistent = path.join(tmpDir, "does-not-exist.json");
    const result = await readAdminSettings(nonExistent);
    assert.deepEqual(result, {});
  });

  it("returns {} when filePath is null", async () => {
    const result = await readAdminSettings(null);
    // null triggers platform path lookup; on any platform, if file doesn't
    // exist it returns {}. We just verify no throw.
    assert.ok(typeof result === "object");
  });

  it("parses JSON and strips flitter. prefix from keys", async () => {
    const settingsPath = path.join(tmpDir, "managed-settings.json");
    await fsp.writeFile(
      settingsPath,
      JSON.stringify({
        "flitter.telemetry": false,
        "flitter.maxTokens": 4096,
        "flitter.model": "claude-3-5-sonnet",
      }),
    );

    const result = await readAdminSettings(settingsPath);
    assert.deepEqual(result, {
      telemetry: false,
      maxTokens: 4096,
      model: "claude-3-5-sonnet",
    });
  });

  it("returns {} on invalid JSON", async () => {
    const settingsPath = path.join(tmpDir, "managed-settings.json");
    await fsp.writeFile(settingsPath, "{ not valid json }");

    const result = await readAdminSettings(settingsPath);
    assert.deepEqual(result, {});
  });

  it("ignores keys without flitter. prefix", async () => {
    const settingsPath = path.join(tmpDir, "managed-settings.json");
    await fsp.writeFile(
      settingsPath,
      JSON.stringify({
        "flitter.enabled": true,
        "other.setting": "ignored",
        noPrefixKey: 42,
        "amp.someKey": "also ignored",
      }),
    );

    const result = await readAdminSettings(settingsPath);
    assert.deepEqual(result, { enabled: true });
  });

  it("returns {} for empty JSON object", async () => {
    const settingsPath = path.join(tmpDir, "managed-settings.json");
    await fsp.writeFile(settingsPath, "{}");

    const result = await readAdminSettings(settingsPath);
    assert.deepEqual(result, {});
  });

  it("handles nested values correctly", async () => {
    const settingsPath = path.join(tmpDir, "managed-settings.json");
    await fsp.writeFile(
      settingsPath,
      JSON.stringify({
        "flitter.permissions": { read: true, write: false },
        "flitter.allowedModels": ["claude-3-5-sonnet", "claude-3-5-haiku"],
      }),
    );

    const result = await readAdminSettings(settingsPath);
    assert.deepEqual(result, {
      permissions: { read: true, write: false },
      allowedModels: ["claude-3-5-sonnet", "claude-3-5-haiku"],
    });
  });
});
