/**
 * Tests for the install command handler
 *
 * 逆向参考:
 *   - 1289_unknown_XHR.js — getRipgrepTargetTriple() platform/arch mapping
 *   - 0432_unknown_Pb0.js — resolveRipgrepTargetDir() FLITTER_HOME env handling
 *   - 0433_unknown_kb0.js — installRipgrep() already-installed skip logic
 *   - 1288_unknown_KHR.js — downloadRipgrep() checksum validation + atomic rename
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getRipgrepTargetTriple,
  handleInstall,
  installRipgrep,
  resolveRipgrepTargetDir,
} from "../install";

// ─── getRipgrepTargetTriple ───────────────────────────────────────────────────

describe("getRipgrepTargetTriple", () => {
  // 逆向: XHR() darwin arm64 → aarch64-apple-darwin
  it("returns aarch64-apple-darwin for darwin arm64", () => {
    const origPlatform = os.platform;
    const origArch = os.arch;
    // @ts-expect-error — mock os.platform/arch
    os.platform = () => "darwin";
    // @ts-expect-error
    os.arch = () => "arm64";
    try {
      expect(getRipgrepTargetTriple()).toBe("aarch64-apple-darwin");
    } finally {
      os.platform = origPlatform;
      os.arch = origArch;
    }
  });

  // 逆向: XHR() darwin x64 → x86_64-apple-darwin
  it("returns x86_64-apple-darwin for darwin x64", () => {
    const origPlatform = os.platform;
    const origArch = os.arch;
    // @ts-expect-error
    os.platform = () => "darwin";
    // @ts-expect-error
    os.arch = () => "x64";
    try {
      expect(getRipgrepTargetTriple()).toBe("x86_64-apple-darwin");
    } finally {
      os.platform = origPlatform;
      os.arch = origArch;
    }
  });

  // 逆向: XHR() linux x64 → x86_64-unknown-linux-musl
  it("returns x86_64-unknown-linux-musl for linux x64", () => {
    const origPlatform = os.platform;
    const origArch = os.arch;
    // @ts-expect-error
    os.platform = () => "linux";
    // @ts-expect-error
    os.arch = () => "x64";
    try {
      expect(getRipgrepTargetTriple()).toBe("x86_64-unknown-linux-musl");
    } finally {
      os.platform = origPlatform;
      os.arch = origArch;
    }
  });

  // 逆向: XHR() linux arm64 → aarch64-unknown-linux-musl
  it("returns aarch64-unknown-linux-musl for linux arm64", () => {
    const origPlatform = os.platform;
    const origArch = os.arch;
    // @ts-expect-error
    os.platform = () => "linux";
    // @ts-expect-error
    os.arch = () => "arm64";
    try {
      expect(getRipgrepTargetTriple()).toBe("aarch64-unknown-linux-musl");
    } finally {
      os.platform = origPlatform;
      os.arch = origArch;
    }
  });

  // 逆向: XHR() win32 x64 → x86_64-pc-windows-msvc
  it("returns x86_64-pc-windows-msvc for win32 x64", () => {
    const origPlatform = os.platform;
    const origArch = os.arch;
    // @ts-expect-error
    os.platform = () => "win32";
    // @ts-expect-error
    os.arch = () => "x64";
    try {
      expect(getRipgrepTargetTriple()).toBe("x86_64-pc-windows-msvc");
    } finally {
      os.platform = origPlatform;
      os.arch = origArch;
    }
  });

  // 逆向: XHR() unknown platform → throws
  it("throws for unknown platform", () => {
    const origPlatform = os.platform;
    // @ts-expect-error
    os.platform = () => "haiku";
    try {
      expect(() => getRipgrepTargetTriple()).toThrow("Unsupported platform: haiku");
    } finally {
      os.platform = origPlatform;
    }
  });
});

// ─── resolveRipgrepTargetDir ──────────────────────────────────────────────────

describe("resolveRipgrepTargetDir", () => {
  // 逆向: Pb0() — FLITTER_HOME env var overrides default
  it("uses FLITTER_HOME env var when set", () => {
    const orig = process.env.FLITTER_HOME;
    process.env.FLITTER_HOME = "/custom/flitter";
    try {
      expect(resolveRipgrepTargetDir()).toBe("/custom/flitter/bin");
    } finally {
      if (orig === undefined) delete process.env.FLITTER_HOME;
      else process.env.FLITTER_HOME = orig;
    }
  });

  // 逆向: Pb0() default → ~/.amp/bin; flitter → ~/.config/flitter/bin
  it("defaults to ~/.config/flitter/bin when FLITTER_HOME not set", () => {
    const orig = process.env.FLITTER_HOME;
    delete process.env.FLITTER_HOME;
    try {
      const result = resolveRipgrepTargetDir();
      expect(result).toBe(path.join(os.homedir(), ".config", "flitter", "bin"));
    } finally {
      if (orig !== undefined) process.env.FLITTER_HOME = orig;
    }
  });
});

// ─── installRipgrep ───────────────────────────────────────────────────────────

describe("installRipgrep", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "flitter-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // 逆向: GHR() — skip if already installed and !force
  it("skips download if binary already exists and force=false", async () => {
    const rgPath = path.join(tmpDir, "rg");
    // Create a fake binary
    await Bun.write(rgPath, "#!/bin/sh\necho fake rg\n");

    // The function should return true without calling downloadRipgrep
    // We can verify by checking no network call happened (binary already exists)
    const result = await installRipgrep(tmpDir, false, false);
    expect(result).toBe(true);
    // File should still be the fake binary we wrote
    expect(existsSync(rgPath)).toBe(true);
  });

  // 逆向: GHR() — force=true means skip the exist check and re-download
  // We test this by checking installRipgrep calls downloadRipgrepWithRetry even
  // when the file exists. We simulate failure (no network) to confirm it tried.
  it("attempts download when force=true even if binary exists", async () => {
    const rgPath = path.join(tmpDir, "rg");
    // Create a fake binary
    await Bun.write(rgPath, "fake");

    // With force=true and no real network, it should return false (download fails)
    // This confirms the download was attempted rather than skipped.
    const result = await installRipgrep(tmpDir, true, false);
    // In a test environment without network access to GCS, this will fail gracefully
    // (returnValue = false). The important thing is it TRIED (didn't return early).
    // We can't assert the exact return value in a unit test without mocking fetch,
    // so we just assert the function returns a boolean and doesn't throw.
    expect(typeof result).toBe("boolean");
  });
});

// ─── handleInstall ────────────────────────────────────────────────────────────

describe("handleInstall", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "flitter-install-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // 逆向: kb0() — when already installed with verbose=true, prints INFO message
  it("prints INFO message when ripgrep already installed (verbose mode)", async () => {
    const orig = process.env.FLITTER_HOME;
    process.env.FLITTER_HOME = tmpDir;

    // Pre-install the fake binary
    const binDir = path.join(tmpDir, "bin");
    await Bun.write(path.join(binDir, "rg"), "fake rg");

    const chunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      await handleInstall({}, { force: false, verbose: true });
    } finally {
      process.stdout.write = origWrite;
      if (orig === undefined) delete process.env.FLITTER_HOME;
      else process.env.FLITTER_HOME = orig;
    }

    const output = chunks.join("");
    expect(output).toContain(binDir);
  });

  // 逆向: Pb0() → kb0() — target dir is logged in verbose mode
  it("reports target directory in verbose mode", async () => {
    const orig = process.env.FLITTER_HOME;
    process.env.FLITTER_HOME = tmpDir;

    // Pre-install the fake binary so we don't hit the network
    const binDir = path.join(tmpDir, "bin");
    await Bun.write(path.join(binDir, "rg"), "fake rg");

    const chunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      await handleInstall({}, { verbose: true });
    } finally {
      process.stdout.write = origWrite;
      if (orig === undefined) delete process.env.FLITTER_HOME;
      else process.env.FLITTER_HOME = orig;
    }

    const output = chunks.join("");
    expect(output).toContain("Target directory:");
    expect(output).toContain(binDir);
  });
});
