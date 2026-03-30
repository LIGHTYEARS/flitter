// Tests for HotReloadWatcher -- file watching and debouncing
// Gap ref: .gap/03-hot-reload-reassemble.md

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, writeFile, rm, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { HotReloadWatcher } from '../hot-reload';

// ---------------------------------------------------------------------------
// HotReloadWatcher tests
// ---------------------------------------------------------------------------

describe('HotReloadWatcher', () => {
  let tempDir: string;
  let activeWatcher: HotReloadWatcher | null = null;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'flitter-hot-'));
    activeWatcher = null;
  });

  afterEach(async () => {
    // Ensure watcher is stopped before cleanup
    if (activeWatcher) {
      activeWatcher.stop();
      activeWatcher = null;
    }
    // Small delay to let OS release handles
    await new Promise((r) => setTimeout(r, 50));
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (_e) {
      // Best effort cleanup
    }
  });

  test('ignores non-.ts files', async () => {
    let reloadAttempted = false;
    activeWatcher = new HotReloadWatcher({
      entryModule: join(tempDir, 'app.ts'),
      watchDir: tempDir,
      debounceMs: 20,
      onReload: () => {
        reloadAttempted = true;
      },
      onError: () => {
        reloadAttempted = true;
      },
    });

    activeWatcher.start();

    await writeFile(join(tempDir, 'readme.md'), '# hello');
    await new Promise((r) => setTimeout(r, 150));

    activeWatcher.stop();
    activeWatcher = null;

    expect(reloadAttempted).toBe(false);
  });

  test('debounces rapid changes into a single reload', async () => {
    const entryPath = join(tempDir, 'app.ts');
    await writeFile(
      entryPath,
      `export const createApp = () => ({});`,
    );

    let reloadCount = 0;
    activeWatcher = new HotReloadWatcher({
      entryModule: entryPath,
      watchDir: tempDir,
      debounceMs: 100,
      onReload: () => {
        reloadCount++;
      },
      onError: () => {
        // Count errors as attempts too -- the important thing is
        // the debounce coalesced them
        reloadCount++;
      },
    });

    activeWatcher.start();

    // Rapid writes -- should coalesce into 1 reload
    for (let i = 0; i < 5; i++) {
      await writeFile(
        entryPath,
        `export const createApp = () => ({ v: ${i} });`,
      );
      await new Promise((r) => setTimeout(r, 10));
    }

    // Wait for debounce + processing
    await new Promise((r) => setTimeout(r, 400));

    activeWatcher.stop();
    activeWatcher = null;

    // Should be exactly 1 reload, not 5
    expect(reloadCount).toBe(1);
  });

  test('ignores files in node_modules', async () => {
    const nodeModulesDir = join(tempDir, 'node_modules');
    await mkdir(nodeModulesDir, { recursive: true });

    let reloadAttempted = false;
    activeWatcher = new HotReloadWatcher({
      entryModule: join(tempDir, 'app.ts'),
      watchDir: tempDir,
      debounceMs: 20,
      onReload: () => {
        reloadAttempted = true;
      },
      onError: () => {
        reloadAttempted = true;
      },
    });

    activeWatcher.start();

    await writeFile(join(nodeModulesDir, 'package.ts'), 'export {}');
    await new Promise((r) => setTimeout(r, 150));

    activeWatcher.stop();
    activeWatcher = null;

    expect(reloadAttempted).toBe(false);
  });

  test('start() is idempotent', () => {
    activeWatcher = new HotReloadWatcher({
      entryModule: join(tempDir, 'app.ts'),
      watchDir: tempDir,
    });

    activeWatcher.start();
    activeWatcher.start(); // Should not throw or create a second watcher

    expect(activeWatcher.isWatching).toBe(true);

    activeWatcher.stop();
    activeWatcher = null;
  });

  test('stop() clears debounce timer and watcher', () => {
    activeWatcher = new HotReloadWatcher({
      entryModule: join(tempDir, 'app.ts'),
      watchDir: tempDir,
    });

    activeWatcher.start();
    expect(activeWatcher.isWatching).toBe(true);

    activeWatcher.stop();
    expect(activeWatcher.isWatching).toBe(false);
    activeWatcher = null;
  });

  test('stop() is safe to call when not watching', () => {
    const watcher = new HotReloadWatcher({
      entryModule: join(tempDir, 'app.ts'),
      watchDir: tempDir,
    });

    // Should not throw
    watcher.stop();
    expect(watcher.isWatching).toBe(false);
  });

  test('detects .ts file changes and triggers reload attempt', async () => {
    const entryPath = join(tempDir, 'app.ts');
    await writeFile(
      entryPath,
      `export const createApp = () => ({ type: 'v1' });`,
    );

    let reloadAttemptCount = 0;
    activeWatcher = new HotReloadWatcher({
      entryModule: entryPath,
      watchDir: tempDir,
      debounceMs: 50,
      onReload: () => {
        reloadAttemptCount++;
      },
      onError: () => {
        // Count errors as reload attempts too -- the watcher detected the change
        reloadAttemptCount++;
      },
    });

    activeWatcher.start();

    // Modify the file
    await writeFile(
      entryPath,
      `export const createApp = () => ({ type: 'v2' });`,
    );

    // Wait for debounce + processing
    await new Promise((r) => setTimeout(r, 300));

    activeWatcher.stop();
    activeWatcher = null;

    // The reload should have been attempted (may fail due to missing binding state,
    // but the detection and debounce should work)
    expect(reloadAttemptCount).toBe(1);
  });

  test('scheduleReload uses debouncing correctly', async () => {
    let callCount = 0;
    activeWatcher = new HotReloadWatcher({
      entryModule: join(tempDir, 'app.ts'),
      watchDir: tempDir,
      debounceMs: 50,
      onReload: () => { callCount++; },
      onError: () => { callCount++; },
    });

    // Directly test _scheduleReload debouncing (public for testing)
    activeWatcher._scheduleReload('test1.ts');
    activeWatcher._scheduleReload('test2.ts');
    activeWatcher._scheduleReload('test3.ts');

    // Before debounce fires
    expect(callCount).toBe(0);

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 200));

    // Should have fired exactly once
    expect(callCount).toBe(1);

    activeWatcher.stop();
    activeWatcher = null;
  });

  test('respects custom extensions option', async () => {
    let reloadAttempted = false;
    activeWatcher = new HotReloadWatcher({
      entryModule: join(tempDir, 'app.js'),
      watchDir: tempDir,
      extensions: ['.js'],
      debounceMs: 20,
      onReload: () => {
        reloadAttempted = true;
      },
      onError: () => {
        reloadAttempted = true;
      },
    });

    activeWatcher.start();

    // Write a .ts file -- should be ignored since we only watch .js
    await writeFile(join(tempDir, 'ignored.ts'), 'export {}');
    await new Promise((r) => setTimeout(r, 150));

    expect(reloadAttempted).toBe(false);

    // Write a .js file -- should trigger
    await writeFile(
      join(tempDir, 'app.js'),
      `export const createApp = () => ({});`,
    );
    await new Promise((r) => setTimeout(r, 150));

    activeWatcher.stop();
    activeWatcher = null;

    expect(reloadAttempted).toBe(true);
  });
});
