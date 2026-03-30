// hot-reload.ts -- File watcher for development hot reload
//
// Uses Node's built-in fs.watch() (backed by inotify on Linux, FSEvents on macOS)
// to detect source file changes, invalidate the module cache, re-import the
// user's widget factory, and call WidgetsBinding.reassemble().
//
// This module is development-only and should not be imported in production builds.

import { watch, type FSWatcher } from 'fs';
import { resolve, relative } from 'path';
import { WidgetsBinding } from '../framework/binding';
import type { Widget } from '../framework/widget';
import { MediaQuery, MediaQueryData } from '../widgets/media-query';

/**
 * A factory function that creates the root widget.
 * Must be a function (not a widget instance) so it can be re-invoked
 * after module cache invalidation to get updated code.
 */
export type WidgetFactory = () => Widget;

export interface HotReloadOptions {
  /** Directory to watch (default: process.cwd()) */
  watchDir?: string;

  /** File extensions to watch (default: ['.ts', '.tsx']) */
  extensions?: string[];

  /** Paths to ignore (default: ['node_modules', '.git', 'dist']) */
  ignorePaths?: string[];

  /** Debounce interval in ms (default: 100) */
  debounceMs?: number;

  /** Callback on successful reload */
  onReload?: (changedFile: string) => void;

  /** Callback on reload error */
  onError?: (error: Error, changedFile: string) => void;

  /**
   * The absolute path to the entry module that exports the widget factory.
   * This module (and its entire dependency chain) will be cache-busted
   * on each reload.
   */
  entryModule: string;

  /**
   * The named export from entryModule that is the widget factory.
   * Default: 'createApp'
   */
  factoryExport?: string;
}

/**
 * HotReloadWatcher manages the file watching and module reloading cycle.
 *
 * Usage:
 *   const watcher = new HotReloadWatcher({
 *     entryModule: import.meta.path,
 *     watchDir: import.meta.dir,
 *   });
 *   watcher.start();
 *   // ... later ...
 *   watcher.stop();
 */
export class HotReloadWatcher {
  private _watcher: FSWatcher | null = null;
  private _options: Required<HotReloadOptions>;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _isReloading: boolean = false;

  constructor(options: HotReloadOptions) {
    this._options = {
      watchDir: options.watchDir ?? process.cwd(),
      extensions: options.extensions ?? ['.ts', '.tsx'],
      ignorePaths: options.ignorePaths ?? ['node_modules', '.git', 'dist'],
      debounceMs: options.debounceMs ?? 100,
      onReload: options.onReload ?? (() => {}),
      onError:
        options.onError ??
        ((err) => console.error('[hot-reload] Error:', err.message)),
      entryModule: resolve(options.entryModule),
      factoryExport: options.factoryExport ?? 'createApp',
    };
  }

  /** Whether the watcher is currently active. */
  get isWatching(): boolean {
    return this._watcher !== null;
  }

  /**
   * Start watching for file changes.
   */
  start(): void {
    if (this._watcher) return;

    this._watcher = watch(
      this._options.watchDir,
      { recursive: true },
      (_eventType, filename) => {
        if (!filename) return;
        if (!this._shouldProcess(filename)) return;
        this._scheduleReload(filename);
      },
    );
  }

  /**
   * Stop watching and clean up.
   */
  stop(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  /**
   * Check if a changed file should trigger a reload.
   */
  private _shouldProcess(filename: string): boolean {
    // Check extension
    const hasValidExt = this._options.extensions.some((ext) =>
      filename.endsWith(ext),
    );
    if (!hasValidExt) return false;

    // Check ignore paths
    const rel = relative(this._options.watchDir, resolve(this._options.watchDir, filename));
    for (const ignore of this._options.ignorePaths) {
      if (rel.startsWith(ignore)) return false;
    }

    return true;
  }

  /**
   * Debounce rapid file changes (editors often write multiple times).
   */
  _scheduleReload(filename: string): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this._performReload(filename);
    }, this._options.debounceMs);
  }

  /**
   * Perform the actual reload:
   * 1. Invalidate Bun's module cache for the entry module
   * 2. Re-import the entry module to get updated code
   * 3. Call the widget factory to get a new root widget
   * 4. Call WidgetsBinding.reassemble() with the new widget
   */
  private async _performReload(changedFile: string): Promise<void> {
    if (this._isReloading) return;
    this._isReloading = true;

    try {
      // Step 1: Invalidate Bun's module registry.
      //
      // Bun does not currently expose a public API for cache invalidation.
      // The workaround is to append a cache-busting query string to the
      // import specifier. This forces Bun to re-evaluate the module.
      //
      // Alternative: If Bun adds `Loader.registry.delete()` or similar,
      // switch to that for cleaner invalidation.
      const cacheBuster = `?t=${Date.now()}`;
      const modulePath = this._options.entryModule + cacheBuster;

      // Step 2: Dynamic import with cache buster
      const mod = await import(modulePath);

      // Step 3: Call the widget factory
      const factory = mod[this._options.factoryExport];
      if (typeof factory !== 'function') {
        throw new Error(
          `Entry module does not export a function named '${this._options.factoryExport}'`,
        );
      }
      const newWidget = factory() as Widget;

      // Step 4: Wrap in MediaQuery to match runApp() behavior.
      // runApp() wraps the user widget in MediaQuery before attachRootWidget(),
      // so reassemble() expects the same wrapping structure.
      const binding = WidgetsBinding.instance;
      const screen = binding.getScreen();
      const cols = screen.width;
      const rows = screen.height;
      const wrappedWidget = new MediaQuery({
        data: MediaQueryData.fromTerminal(cols, rows),
        child: newWidget,
      });

      // Step 5: Reassemble
      binding.reassemble(wrappedWidget);

      this._options.onReload(changedFile);
    } catch (error) {
      this._options.onError(
        error instanceof Error ? error : new Error(String(error)),
        changedFile,
      );
    } finally {
      this._isReloading = false;
    }
  }
}
