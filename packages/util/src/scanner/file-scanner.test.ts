import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { FileScanner } from "./file-scanner.ts";
import type { ScanEntry, ScanResult } from "./file-scanner.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-scanner-test-"));
  tmpDirs.push(dir);
  return dir;
}

function touch(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");
}

afterEach(() => {
  for (const dir of tmpDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
  tmpDirs.length = 0;
});

// ---------------------------------------------------------------------------
// NodeJS scanner -- basic scan
// ---------------------------------------------------------------------------

describe("FileScanner (NodeJS fallback)", () => {
  it("basic scan finds 3 files", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "a.ts"));
    touch(path.join(root, "b.ts"));
    touch(path.join(root, "c.ts"));

    const scanner = new FileScanner([root]);
    const result = await scanner.scan();

    const files = result.entries.filter((e) => !e.isDirectory);
    assert.equal(files.length, 3);
    for (const entry of files) {
      assert.equal(entry.isDirectory, false);
      assert.ok(entry.uri.startsWith("file://"));
      assert.ok(path.isAbsolute(entry.path));
      assert.ok(["a.ts", "b.ts", "c.ts"].includes(entry.name));
    }
  });

  // ---------------------------------------------------------------------------
  // Nested directories
  // ---------------------------------------------------------------------------

  it("nested directories -- finds all files recursively and includes dir entries", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "top.ts"));
    touch(path.join(root, "sub", "mid.ts"));
    touch(path.join(root, "sub", "deep", "bottom.ts"));

    const scanner = new FileScanner([root]);
    const result = await scanner.scan();

    const dirs = result.entries.filter((e) => e.isDirectory);
    const files = result.entries.filter((e) => !e.isDirectory);

    assert.ok(dirs.length >= 2, `Expected at least 2 directory entries, got ${dirs.length}`);
    assert.equal(files.length, 3);
    assert.ok(dirs.some((d) => d.name === "sub"));
    assert.ok(dirs.some((d) => d.name === "deep"));
    for (const d of dirs) {
      assert.equal(d.isDirectory, true);
    }
  });

  // ---------------------------------------------------------------------------
  // maxFiles
  // ---------------------------------------------------------------------------

  it("maxFiles truncates results", async () => {
    const root = makeTmpDir();
    for (let i = 0; i < 10; i++) {
      touch(path.join(root, `file${i}.ts`));
    }

    const scanner = new FileScanner([root], { maxFiles: 5 });
    const result = await scanner.scan();

    assert.ok(result.entries.length <= 5, `Expected <=5 entries, got ${result.entries.length}`);
    assert.equal(result.truncated, true);
  });

  // ---------------------------------------------------------------------------
  // maxDepth
  // ---------------------------------------------------------------------------

  it("maxDepth limits recursion", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "depth0.ts"));            // depth 0 (root's children)
    touch(path.join(root, "d1", "depth1.ts"));       // depth 1
    touch(path.join(root, "d1", "d2", "depth2.ts")); // depth 2

    const scanner = new FileScanner([root], { maxDepth: 1 });
    const result = await scanner.scan();

    const fileNames = result.entries.filter((e) => !e.isDirectory).map((e) => e.name);
    assert.ok(fileNames.includes("depth0.ts"), "depth0.ts should be found");
    assert.ok(fileNames.includes("depth1.ts"), "depth1.ts should be found");
    assert.ok(!fileNames.includes("depth2.ts"), "depth2.ts should NOT be found at maxDepth=1");
  });

  // ---------------------------------------------------------------------------
  // ignorePatterns
  // ---------------------------------------------------------------------------

  it("ignorePatterns filters out matching files and directories", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "a.ts"));
    touch(path.join(root, "b.log"));
    touch(path.join(root, "node_modules", "c.ts"));

    const scanner = new FileScanner([root], {
      ignorePatterns: ["*.log", "node_modules"],
    });
    const result = await scanner.scan();

    const names = result.entries.map((e) => e.name);
    assert.ok(names.includes("a.ts"), "a.ts should be included");
    assert.ok(!names.includes("b.log"), "b.log should be excluded");
    assert.ok(!names.includes("c.ts"), "c.ts inside node_modules should be excluded");
    assert.ok(!names.includes("node_modules"), "node_modules dir should be excluded");
  });

  // ---------------------------------------------------------------------------
  // alwaysIncludePaths overrides ignore
  // ---------------------------------------------------------------------------

  it("alwaysIncludePaths overrides ignorePatterns", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "normal.log"));
    touch(path.join(root, "important.log"));

    const scanner = new FileScanner([root], {
      ignorePatterns: ["*.log"],
      alwaysIncludePaths: ["important.log"],
    });
    const result = await scanner.scan();

    const files = result.entries.filter((e) => !e.isDirectory);
    assert.equal(files.length, 1);
    assert.equal(files[0]!.name, "important.log");
    assert.equal(files[0]!.isAlwaysIncluded, true);
  });

  // ---------------------------------------------------------------------------
  // Empty directory
  // ---------------------------------------------------------------------------

  it("empty directory returns zero entries", async () => {
    const root = makeTmpDir();
    const scanner = new FileScanner([root]);
    const result = await scanner.scan();

    assert.equal(result.entries.length, 0);
  });

  // ---------------------------------------------------------------------------
  // Nonexistent root
  // ---------------------------------------------------------------------------

  it("nonexistent root returns empty result without throwing", async () => {
    const bogus = path.join(os.tmpdir(), "flitter-scanner-nonexistent-" + Date.now());
    const scanner = new FileScanner([bogus]);
    const result = await scanner.scan();

    assert.equal(result.entries.length, 0);
    assert.equal(result.truncated, false);
  });

  // ---------------------------------------------------------------------------
  // abortSignal
  // ---------------------------------------------------------------------------

  it("abortSignal stops scanning early", async () => {
    const root = makeTmpDir();
    // Create a good number of nested files to give the abort time to kick in
    for (let i = 0; i < 20; i++) {
      const dir = path.join(root, `dir${i}`);
      for (let j = 0; j < 10; j++) {
        touch(path.join(dir, `file${j}.ts`));
      }
    }

    const ac = new AbortController();
    // Abort immediately
    ac.abort();

    const scanner = new FileScanner([root], { abortSignal: ac.signal });
    const result = await scanner.scan();

    // With immediate abort the scanner should return fewer entries than the full 200 files
    const totalFilesCreated = 200;
    assert.ok(
      result.entries.filter((e) => !e.isDirectory).length < totalFilesCreated,
      "Aborted scan should return fewer files than exist",
    );
  });

  // ---------------------------------------------------------------------------
  // Symlinks -- default skip
  // ---------------------------------------------------------------------------

  it("symlinks are skipped by default", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "real.ts"));
    const linkTarget = path.join(root, "real.ts");
    const linkPath = path.join(root, "linked.ts");
    try {
      fs.symlinkSync(linkTarget, linkPath);
    } catch {
      // symlinks may not be supported -- skip test
      return;
    }

    const scanner = new FileScanner([root]);
    const result = await scanner.scan();

    const names = result.entries.filter((e) => !e.isDirectory).map((e) => e.name);
    assert.ok(names.includes("real.ts"), "real file should be included");
    assert.ok(!names.includes("linked.ts"), "symlink should be excluded by default");
  });

  // ---------------------------------------------------------------------------
  // Symlinks -- followSymlinks
  // ---------------------------------------------------------------------------

  it("symlinks are followed when followSymlinks=true", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "real.ts"));
    const linkTarget = path.join(root, "real.ts");
    const linkPath = path.join(root, "linked.ts");
    try {
      fs.symlinkSync(linkTarget, linkPath);
    } catch {
      return; // skip if symlinks not supported
    }

    const scanner = new FileScanner([root], { followSymlinks: true });
    const result = await scanner.scan();

    const names = result.entries.filter((e) => !e.isDirectory).map((e) => e.name);
    assert.ok(names.includes("real.ts"));
    assert.ok(names.includes("linked.ts"), "symlink should be included when followSymlinks=true");
  });

  // ---------------------------------------------------------------------------
  // URI format
  // ---------------------------------------------------------------------------

  it("entry URIs start with file:// followed by absolute path", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "hello.ts"));

    const scanner = new FileScanner([root]);
    const result = await scanner.scan();

    for (const entry of result.entries) {
      assert.ok(entry.uri.startsWith("file://"), `URI should start with file://, got: ${entry.uri}`);
      const uriPath = entry.uri.slice("file://".length);
      assert.ok(path.isAbsolute(uriPath), `URI path portion should be absolute: ${uriPath}`);
    }
  });
});

// ---------------------------------------------------------------------------
// FileScanner class-level tests
// ---------------------------------------------------------------------------

describe("FileScanner class", () => {
  it("multiple roots merges results", async () => {
    const root1 = makeTmpDir();
    const root2 = makeTmpDir();
    touch(path.join(root1, "from1.ts"));
    touch(path.join(root2, "from2.ts"));

    const scanner = new FileScanner([root1, root2]);
    const result = await scanner.scan();

    const names = result.entries.filter((e) => !e.isDirectory).map((e) => e.name);
    assert.ok(names.includes("from1.ts"), "File from root1 should be present");
    assert.ok(names.includes("from2.ts"), "File from root2 should be present");
  });

  it("global maxFiles caps across multiple roots", async () => {
    const root1 = makeTmpDir();
    const root2 = makeTmpDir();
    for (let i = 0; i < 10; i++) {
      touch(path.join(root1, `r1_${i}.ts`));
      touch(path.join(root2, `r2_${i}.ts`));
    }

    const scanner = new FileScanner([root1, root2], { maxFiles: 15 });
    const result = await scanner.scan();

    assert.ok(result.entries.length <= 15, `Expected <=15 entries, got ${result.entries.length}`);
    assert.equal(result.truncated, true);
  });

  it("initialize() can be called without error", async () => {
    const scanner = new FileScanner(["/tmp"]);
    await scanner.initialize();
    // No assertion needed -- just verify no throw
  });

  it("auto-initialize on scan() when initialize() was not called", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "auto.ts"));

    const scanner = new FileScanner([root]);
    // Deliberately skip initialize()
    const result = await scanner.scan();

    const names = result.entries.filter((e) => !e.isDirectory).map((e) => e.name);
    assert.ok(names.includes("auto.ts"));
  });

  it("scannedFiles and scannedDirectories are populated", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "a.ts"));
    touch(path.join(root, "sub", "b.ts"));

    const scanner = new FileScanner([root]);
    const result = await scanner.scan();

    assert.ok(result.scannedFiles >= 2, `Expected scannedFiles >= 2, got ${result.scannedFiles}`);
    assert.ok(result.scannedDirectories >= 1, `Expected scannedDirectories >= 1, got ${result.scannedDirectories}`);
  });
});

// ---------------------------------------------------------------------------
// Glob matching edge cases
// ---------------------------------------------------------------------------

describe("glob matching", () => {
  it("pattern with path separator matches relative path", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "src", "index.ts"));
    touch(path.join(root, "src", "utils", "helper.ts"));
    touch(path.join(root, "lib", "index.ts"));

    const scanner = new FileScanner([root], {
      ignorePatterns: ["src/**"],
    });
    const result = await scanner.scan();

    const names = result.entries.filter((e) => !e.isDirectory).map((e) => e.name);
    assert.ok(!names.includes("helper.ts"), "src/utils/helper.ts should be ignored");
    // lib/index.ts should remain
    assert.ok(
      result.entries.some((e) => e.path.includes("lib")),
      "lib/index.ts should still be present",
    );
  });

  it("? wildcard matches single character", async () => {
    const root = makeTmpDir();
    touch(path.join(root, "a1.ts"));
    touch(path.join(root, "a2.ts"));
    touch(path.join(root, "abc.ts"));

    const scanner = new FileScanner([root], {
      ignorePatterns: ["a?.ts"],
    });
    const result = await scanner.scan();

    const names = result.entries.filter((e) => !e.isDirectory).map((e) => e.name);
    assert.ok(!names.includes("a1.ts"), "a1.ts should be ignored by a?.ts");
    assert.ok(!names.includes("a2.ts"), "a2.ts should be ignored by a?.ts");
    assert.ok(names.includes("abc.ts"), "abc.ts should NOT match a?.ts");
  });
});
