/**
 * Tests for installation ID and device fingerprint.
 * 逆向: amp-cli-reversed/modules/1609_AmpSDK_sN.js
 */
import assert from "node:assert/strict";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getDeviceFingerprint, getOrCreateInstallationId } from "./installation-id";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-id-test-"));
});

afterEach(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true });
});

describe("getOrCreateInstallationId", () => {
  it("should create a new installation ID if file does not exist", async () => {
    const id = await getOrCreateInstallationId(tmpDir);
    assert.ok(id.length > 0);
    // UUID v4 format
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("should persist and return the same ID on subsequent calls", async () => {
    const id1 = await getOrCreateInstallationId(tmpDir);
    const id2 = await getOrCreateInstallationId(tmpDir);
    assert.equal(id1, id2);
  });

  it("should read existing ID from file", async () => {
    const customId = "custom-test-id-12345";
    await fsp.writeFile(path.join(tmpDir, "installation-id"), customId, "utf-8");
    const id = await getOrCreateInstallationId(tmpDir);
    assert.equal(id, customId);
  });

  it("should create parent directory if needed", async () => {
    const nestedDir = path.join(tmpDir, "nested", "dir");
    const id = await getOrCreateInstallationId(nestedDir);
    assert.ok(id.length > 0);
    // Verify file was created
    const content = await fsp.readFile(path.join(nestedDir, "installation-id"), "utf-8");
    assert.equal(content, id);
  });

  it("should generate new ID if file is empty", async () => {
    await fsp.writeFile(path.join(tmpDir, "installation-id"), "", "utf-8");
    const id = await getOrCreateInstallationId(tmpDir);
    assert.ok(id.length > 0);
    assert.match(id, /^[0-9a-f]{8}-/);
  });
});

describe("getDeviceFingerprint", () => {
  it("should return a hex string", () => {
    const fp = getDeviceFingerprint();
    assert.match(fp, /^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
  });

  it("should be deterministic", () => {
    const fp1 = getDeviceFingerprint();
    const fp2 = getDeviceFingerprint();
    assert.equal(fp1, fp2);
  });
});
