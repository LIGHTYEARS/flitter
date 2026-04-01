// ShortcutRegistry — priority-based shortcut registration with scope isolation
// Amp ref: input-system.md Section 8.2

/**
 * Describes a single registered shortcut entry.
 * Each entry binds a key string to a handler with an associated priority
 * and an optional scope for isolation.
 */
export interface ShortcutEntry {
  /** Key combination string, e.g. "ctrl+s", "ctrl+shift+z" */
  key: string;
  /** Handler function invoked when the shortcut fires */
  handler: (...args: unknown[]) => unknown;
  /** Numeric priority — higher values take precedence in match() */
  priority: number;
  /** Optional scope for isolation (e.g. "global", "editor") */
  scope?: string;
}

/**
 * Options accepted by ShortcutRegistry.register().
 */
export interface RegisterOptions {
  key: string;
  handler: (...args: unknown[]) => unknown;
  priority?: number;
  scope?: string;
}

/**
 * A registry that maps key strings to one or more prioritised handler entries.
 *
 * Features:
 * - Multiple handlers per key, ordered by priority
 * - Scope isolation: the same key in different scopes does not conflict
 * - match() returns the highest-priority entry across all scopes
 * - getEntries() returns entries filtered by key and optional scope
 */
export class ShortcutRegistry {
  /**
   * Internal storage: scope → key → entries[].
   * Entries without an explicit scope are stored under the empty-string key.
   */
  private _scopes: Map<string, Map<string, ShortcutEntry[]>> = new Map();

  /** Sentinel scope key used when no scope is provided */
  private static readonly DEFAULT_SCOPE = '';

  /**
   * Register a shortcut entry.
   *
   * @param options.key      Key combination string (e.g. "ctrl+s")
   * @param options.handler  Callback to invoke when the shortcut matches
   * @param options.priority Numeric priority (default 0). Higher = matched first.
   * @param options.scope    Optional scope string for isolation
   */
  register(options: RegisterOptions): void {
    const { key, handler, priority = 0, scope } = options;
    const scopeKey = scope ?? ShortcutRegistry.DEFAULT_SCOPE;

    const entry: ShortcutEntry = { key, handler, priority, scope };

    let scopeMap = this._scopes.get(scopeKey);
    if (!scopeMap) {
      scopeMap = new Map();
      this._scopes.set(scopeKey, scopeMap);
    }

    let entries = scopeMap.get(key);
    if (!entries) {
      entries = [];
      scopeMap.set(key, entries);
    }

    entries.push(entry);
  }

  /**
   * Remove a shortcut entry. If handler is provided, only remove the entry
   * whose handler matches. Otherwise remove all entries for that key.
   *
   * @param key     Key combination string
   * @param handler Optional specific handler to remove
   */
  unregister(key: string, handler?: (...args: unknown[]) => unknown): void {
    for (const [, scopeMap] of this._scopes) {
      const entries = scopeMap.get(key);
      if (!entries) continue;

      if (handler) {
        const idx = entries.findIndex((e) => e.handler === handler);
        if (idx !== -1) {
          entries.splice(idx, 1);
        }
      } else {
        scopeMap.delete(key);
      }

      if (entries.length === 0) {
        scopeMap.delete(key);
      }
    }
  }

  /**
   * Return the highest-priority entry for a given key across all scopes.
   * Returns null if no entry is registered for the key.
   *
   * @param key Key combination string
   */
  match(key: string): ShortcutEntry | null {
    let best: ShortcutEntry | null = null;

    for (const [, scopeMap] of this._scopes) {
      const entries = scopeMap.get(key);
      if (!entries) continue;

      for (const entry of entries) {
        if (best === null || entry.priority > best.priority) {
          best = entry;
        }
      }
    }

    return best;
  }

  /**
   * Get all entries registered for a key. When scope is provided,
   * only entries in that scope are returned; otherwise all scopes
   * are included.
   *
   * @param key   Key combination string
   * @param scope Optional scope filter
   */
  getEntries(key: string, scope?: string): ShortcutEntry[] {
    if (scope !== undefined) {
      const scopeMap = this._scopes.get(scope);
      if (!scopeMap) return [];
      return scopeMap.get(key) ?? [];
    }

    const result: ShortcutEntry[] = [];
    for (const [, scopeMap] of this._scopes) {
      const entries = scopeMap.get(key);
      if (entries) {
        result.push(...entries);
      }
    }
    return result;
  }
}
