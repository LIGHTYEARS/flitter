/**
 * @flitter/data — ThreadStore 内存 CRUD 引擎
 *
 * 管理线程快照缓存、ThreadEntry 索引、dirty tracking、Observable 订阅
 * 从 amp-cli-reversed/app/skills-agents-system.js:azT (3309-3393) 直译
 *
 * @example
 * ```ts
 * const store = new ThreadStore({ maxThreads: 100 });
 * store.setCachedThread(snapshot);
 * const subject = store.getThread(id);
 * ```
 */
import type { ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject, createLogger } from "@flitter/util";
import type { ThreadMeta, ThreadRemoteTransport, ThreadUploadManager } from "./thread-upload";
import type { ThreadEntry, ThreadStoreOptions } from "./types";

const log = createLogger("thread-store");

/**
 * Thread visibility levels.
 * 逆向: amp e0R:529-588 — setVisibility command uses these levels
 */
export type ThreadVisibility =
  | "private"
  | "public_unlisted"
  | "public_discoverable"
  | "thread_workspace_shared";

/**
 * Exclusive sync read/writer for a thread.
 * 逆向: azT.exclusiveSyncReadWriter() — lines 188-220
 */
export interface ThreadExclusiveReadWriter {
  /** Read current snapshot. Throws if disposed. */
  read(): ThreadSnapshot;
  /** Write a full snapshot. Throws if disposed. */
  write(thread: ThreadSnapshot): void;
  /** Apply an update function to the current snapshot (immutable). Throws if disposed. */
  update(fn: (draft: ThreadSnapshot) => Partial<ThreadSnapshot> | void): ThreadSnapshot;
  /** Release the exclusive lock. */
  asyncDispose(): Promise<void>;
}

/**
 * Extended fields that may appear on ThreadSnapshot beyond the strict schema.
 * These originate from the reverse-engineered amp-cli data format.
 */
interface ThreadSnapshotExtended {
  created?: number;
  originThreadID?: string;
  mainThreadID?: string;
  archived?: boolean;
  creatorUserID?: string;
  draft?: boolean;
}

/**
 * 计算用户最后交互时间
 * 从 HqR (skills-agents-system.js:3250-3252) 翻译
 */
export function computeUserLastInteractedAt(thread: {
  created?: number;
  messages: Array<{ role: string; meta?: { sentAt?: number } }>;
}): number {
  const created = thread.created ?? 0;
  const sentTimes = thread.messages
    .filter((m) => m.role === "user" && m.meta?.sentAt !== undefined)
    .map((m) => m.meta!.sentAt!);
  return Math.max(created, ...(sentTimes.length > 0 ? sentTimes : [0]));
}

/**
 * ThreadSnapshot → ThreadEntry 轻量映射
 * 从 fuT (skills-agents-system.js:3281-3303) 翻译
 */
export function snapshotToEntry(thread: ThreadSnapshot): ThreadEntry {
  const ext = thread as ThreadSnapshot & ThreadSnapshotExtended;
  return {
    id: thread.id,
    v: thread.v,
    created: ext.created ?? 0,
    title: thread.title ?? null,
    userLastInteractedAt: computeUserLastInteractedAt(ext),
    messageCount: thread.messages.length,
    env: thread.env,
    originThreadID: ext.originThreadID,
    mainThreadID: ext.mainThreadID,
    relationships: [...(thread.relationships ?? [])],
    summaryStats: {
      messageCount: thread.messages.length,
    },
    agentMode: thread.agentMode,
    usesDtw: !!(
      thread.meta &&
      typeof thread.meta === "object" &&
      (thread.meta as Record<string, unknown>).usesDtw === true
    ),
    archived: ext.archived,
    creatorUserID: typeof ext.creatorUserID === "string" ? ext.creatorUserID : undefined,
    meta: extractMeta(thread),
  };
}

function extractMeta(thread: ThreadSnapshot): ThreadEntry["meta"] | undefined {
  if (!thread.meta || typeof thread.meta !== "object") return undefined;
  const m = thread.meta as Record<string, unknown>;
  const validVisibilities = [
    "private",
    "public_unlisted",
    "public_discoverable",
    "thread_workspace_shared",
  ];
  if (typeof m.visibility !== "string" || !validVisibilities.includes(m.visibility))
    return undefined;
  return {
    visibility: m.visibility,
    sharedGroupIDs: Array.isArray(m.sharedGroupIDs)
      ? m.sharedGroupIDs.filter((s: unknown) => typeof s === "string")
      : [],
  };
}

/**
 * ThreadEntry 深度相等比较
 * 从 T4 (skills-agents-system.js:3305-3308) 翻译
 */
export function entryEquals(
  a: ThreadEntry,
  b: ThreadEntry,
  opts: { includeVersion?: boolean } = {},
): boolean {
  if (a === b) return true;
  return (
    a.id === b.id &&
    (opts.includeVersion === false || a.v === b.v) &&
    a.created === b.created &&
    a.title === b.title &&
    a.userLastInteractedAt === b.userLastInteractedAt &&
    a.messageCount === b.messageCount &&
    a.originThreadID === b.originThreadID &&
    a.mainThreadID === b.mainThreadID &&
    a.agentMode === b.agentMode &&
    a.usesDtw === b.usesDtw &&
    a.archived === b.archived &&
    a.creatorUserID === b.creatorUserID &&
    JSON.stringify(a.relationships) === JSON.stringify(b.relationships) &&
    JSON.stringify(a.summaryStats) === JSON.stringify(b.summaryStats) &&
    JSON.stringify(a.env) === JSON.stringify(b.env) &&
    JSON.stringify(a.meta) === JSON.stringify(b.meta)
  );
}

/**
 * ThreadStore — 线程内存 CRUD 引擎
 * 从 azT (skills-agents-system.js:3309-3393) 翻译
 */
export class ThreadStore {
  private threadSubjects = new Map<string, BehaviorSubject<ThreadSnapshot>>();
  private threadEntriesByID = new Map<string, ThreadEntry>();
  private threadEntriesState = new BehaviorSubject<ThreadEntry[] | null>(null);
  private _dirtyThreads = new Set<string>();
  private threadEntriesLoaded = false;
  private readonly maxThreads: number | null;
  readonly uploadThrottleMs: number;

  /**
   * Exclusive locks set — prevents double-lock on same thread.
   * 逆向: azT.exclusiveLocks = new Set() — line 5
   */
  private exclusiveLocks = new Set<string>();

  /**
   * Optional upload manager — wired in via setUploadManager().
   * 逆向: azT has upload pipeline inline; we extract it to ThreadUploadManager
   */
  private uploadManager: ThreadUploadManager | null = null;

  /**
   * Optional remote transport — wired in via setRemote().
   * Used by ensureThreadEntriesLoaded() to lazy-fetch remote thread entries.
   * 逆向: azT.remote (modules/1342_ThreadService_azT.js)
   */
  private remote: ThreadRemoteTransport | null = null;

  /**
   * Coalescing promise for ensureThreadEntriesLoaded().
   * Prevents multiple concurrent fetches from race conditions.
   * 逆向: azT.threadEntriesLoadPromise — line 60
   */
  private threadEntriesLoadPromise: Promise<void> | null = null;

  /**
   * Coalescing promises for per-thread remote fetches.
   * Prevents duplicate concurrent getThread() calls for the same ID.
   * 逆向: azT.pendingThreadLoads — Map<string, Promise> — line 4
   */
  private pendingThreadLoads = new Map<string, Promise<BehaviorSubject<ThreadSnapshot> | null>>();

  constructor(options: ThreadStoreOptions = {}) {
    this.maxThreads =
      options.maxThreads === undefined || options.maxThreads === null
        ? null
        : Math.max(1, Math.floor(options.maxThreads));
    this.uploadThrottleMs =
      options.uploadThrottleMs === undefined ? 1000 : Math.max(0, options.uploadThrottleMs);
  }

  /**
   * Wire the upload manager into the store.
   * After wiring, markDirty() will also call uploadManager.markDirty().
   */
  setUploadManager(manager: ThreadUploadManager): void {
    this.uploadManager = manager;
  }

  /**
   * Wire a remote transport for lazy thread entry loading.
   * 逆向: azT.remote assignment
   */
  setRemote(transport: ThreadRemoteTransport): void {
    this.remote = transport;
  }

  /**
   * 缓存线程快照 + 更新 ThreadEntry 索引
   * 从 azT.setCachedThread 翻译
   *
   * Task 11: When new snapshot has more messages, auto-update userLastInteractedAt.
   * 逆向: azT.syncThreadEntryFromThread — updates entry from snapshot
   */
  setCachedThread(
    thread: ThreadSnapshot,
    opts: { scheduleUpload?: boolean } = {},
  ): BehaviorSubject<ThreadSnapshot> {
    const existing = this.threadSubjects.get(thread.id);

    // Task 11: detect newer messages for auto-updating userLastInteractedAt
    // 逆向: azT.syncThreadEntryFromThread updates entry from snapshot
    if (existing) {
      const oldSnapshot = existing.getValue();
      if (thread.messages.length > oldSnapshot.messages.length) {
        // Auto-update the thread entry's userLastInteractedAt
        const existingEntry = this.threadEntriesByID.get(thread.id);
        if (existingEntry) {
          const now = Date.now();
          const updated = { ...existingEntry, userLastInteractedAt: now };
          this.threadEntriesByID.set(thread.id, updated);
          log.debug("Auto-updated userLastInteractedAt", { threadId: thread.id });
        }
      }
      existing.next(thread);
    } else {
      this.threadSubjects.set(thread.id, new BehaviorSubject(thread));
    }
    this.syncThreadEntryFromThread(thread);
    if (opts.scheduleUpload) {
      this.markDirty(thread.id);
    }
    return this.threadSubjects.get(thread.id)!;
  }

  /** 获取缓存线程快照 Subject */
  getThread(id: string): BehaviorSubject<ThreadSnapshot> | undefined {
    return this.threadSubjects.get(id);
  }

  /** 获取缓存线程快照值 */
  getThreadSnapshot(id: string): ThreadSnapshot | undefined {
    return this.threadSubjects.get(id)?.getValue();
  }

  /**
   * Ensure a thread Subject exists — check local cache first, then fetch
   * from remote on cache miss. Returns the BehaviorSubject if found, null
   * if the thread doesn't exist locally or remotely.
   *
   * Coalesces concurrent calls for the same thread ID — second caller
   * awaits the same in-flight promise (no duplicate network requests).
   *
   * 逆向: azT.ensureThreadSubject(T, R) — modules/1342_ThreadService_azT.js:128-155
   */
  async ensureThreadSubject(
    id: string,
    opts?: { createIfMissing?: boolean; signal?: AbortSignal },
  ): Promise<BehaviorSubject<ThreadSnapshot> | null> {
    // 1. Check local cache
    const cached = this.threadSubjects.get(id);
    if (cached) return cached;

    // 2. Check in-flight fetch
    const pending = this.pendingThreadLoads.get(id);
    if (pending) {
      const result = await pending;
      if (result) return result;
      if (!opts?.createIfMissing) return null;
    }

    // 3. No remote transport → can't fetch
    if (!this.remote) {
      return null;
    }

    // 4. Fetch from remote with coalescing
    const fetchPromise = (async (): Promise<BehaviorSubject<ThreadSnapshot> | null> => {
      try {
        const snapshot = await this.remote!.getThread(id);
        if (snapshot) {
          log.debug("Fetched thread from remote on cache miss", { id, v: snapshot.v });
          return this.setCachedThread(snapshot, { scheduleUpload: false });
        }
        return null;
      } catch (err) {
        log.debug("Failed to fetch thread from remote", {
          id,
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    })();

    this.pendingThreadLoads.set(id, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.pendingThreadLoads.delete(id);
    }
  }

  /**
   * Async thread fetch — returns the snapshot or null.
   * Thin wrapper around ensureThreadSubject for callers that just need the data.
   *
   * 逆向: azT.getCachedThread(T, R) — modules/1342_ThreadService_azT.js:156-162
   * 逆向: azT.get(T, R) — modules/1342_ThreadService_azT.js:163-165
   */
  async fetchThread(id: string, signal?: AbortSignal): Promise<ThreadSnapshot | null> {
    const subject = await this.ensureThreadSubject(id, {
      createIfMissing: false,
      signal,
    });
    return subject?.getValue() ?? null;
  }

  /** 删除线程 */
  deleteThread(id: string): boolean {
    const existed = this.threadSubjects.delete(id);
    this.threadEntriesByID.delete(id);
    this._dirtyThreads.delete(id);
    this.exclusiveLocks.delete(id);
    if (this.uploadManager) {
      this.uploadManager.removeThread(id);
    }
    if (this.threadEntriesLoaded) this.emitCurrentThreadEntries();
    return existed;
  }

  /** 观察单个线程变更 */
  observeThread(id: string): BehaviorSubject<ThreadSnapshot> | undefined {
    return this.threadSubjects.get(id);
  }

  /** 观察线程条目列表 (按 userLastInteractedAt 降序) */
  observeThreadEntries(): BehaviorSubject<ThreadEntry[] | null> {
    return this.threadEntriesState;
  }

  /**
   * Observe a filtered thread list: excludes subagent threads and optionally archived.
   *
   * 逆向: amp-cli-reversed/modules/1342_ThreadService_azT.js:286-295
   *   ```
   *   observeThreadList(T) {
   *     return this.observeThreadEntries().pipe(
   *       JR(R => R.filter(a => !a.mainThreadID && (T.includeArchived || !a.archived))),
   *       E9((R, a) => { ... deep equality ... })
   *     );
   *   }
   *   ```
   *
   * Two filters:
   * 1. `!entry.mainThreadID` — exclude subagent threads (they have a parent)
   * 2. `opts.includeArchived || !entry.archived` — exclude archived unless opted in
   *
   * @param opts.includeArchived - When true, archived threads are included (default: false)
   * @returns The current filtered entries (snapshot, not reactive). For reactive
   *          use, subscribe to observeThreadEntries() and filter manually.
   */
  observeThreadList(opts: { includeArchived?: boolean } = {}): ThreadEntry[] {
    const entries = this.threadEntriesState.getValue();
    if (!entries) return [];

    const includeArchived = opts.includeArchived ?? false;
    return entries.filter((entry) => !entry.mainThreadID && (includeArchived || !entry.archived));
  }

  /** 标记线程待持久化，同时通知 upload manager
   * 逆向: azT.markDirty(T) — line 84-85 (also calls scheduleUploadFlush)
   */
  markDirty(id: string): void {
    this._dirtyThreads.add(id);
    // Task 1: Wire markDirty to upload manager
    if (this.uploadManager) {
      this.uploadManager.markDirty(id);
    }
  }

  /** 获取所有 dirty 线程 ID */
  getDirtyThreadIds(): string[] {
    return Array.from(this._dirtyThreads);
  }

  /** 清除 dirty 标记 */
  clearDirty(id: string): void {
    this._dirtyThreads.delete(id);
  }

  /** 清除所有 dirty 标记 */
  clearAllDirty(): void {
    this._dirtyThreads.clear();
  }

  /** 标记 entries 已加载 (由 persistence 层调用) */
  markEntriesLoaded(): void {
    this.threadEntriesLoaded = true;
    this.emitCurrentThreadEntries();
  }

  /**
   * Lazy-load remote thread entries and merge with local cache.
   * Coalesces concurrent calls — second caller awaits the same in-flight promise.
   *
   * 逆向: azT.ensureThreadEntriesLoaded() — modules/1342_ThreadService_azT.js:60-83
   *   Three-phase merge:
   *   1. Fetch remote entries via remote.listThreads()
   *   2. Build map from remote, preferring existing local entry if T4(existing, remote)
   *   3. Overlay with threadEntriesFromCachedThreads(), again prefer existing if equal
   *   4. Replace threadEntriesByID, set loaded flag, emit
   */
  async ensureThreadEntriesLoaded(): Promise<void> {
    if (this.threadEntriesLoaded) return;
    if (this.threadEntriesLoadPromise) return this.threadEntriesLoadPromise;

    this.threadEntriesLoadPromise = this._loadRemoteEntries();
    try {
      await this.threadEntriesLoadPromise;
    } finally {
      this.threadEntriesLoadPromise = null;
    }
  }

  private async _loadRemoteEntries(): Promise<void> {
    // Phase 1: Fetch remote entries
    let remoteEntries: ThreadEntry[] = [];
    if (this.remote) {
      try {
        remoteEntries = await this.remote.listThreads({
          limit: this.maxThreads,
        });
        log.debug("Fetched remote thread entries", { count: remoteEntries.length });
      } catch (err) {
        log.debug("Failed to fetch remote thread entries, using local only", {
          error: err instanceof Error ? err.message : String(err),
        });
        // Fall through — use local only
      }
    }

    // Phase 2: Build merged map from remote entries
    const merged = new Map<string, ThreadEntry>();
    for (const remote of remoteEntries) {
      const existing = this.threadEntriesByID.get(remote.id);
      // Prefer existing local entry if equal (identity-preserving)
      if (existing && entryEquals(existing, remote)) {
        merged.set(remote.id, existing);
      } else {
        merged.set(remote.id, remote);
      }
    }

    // Phase 3: Overlay with entries derived from cached thread snapshots
    // Local wins when it differs from remote (local is fresher)
    const cachedEntries = this.threadEntriesFromCachedThreads();
    for (const local of cachedEntries) {
      const existing = merged.get(local.id);
      if (existing && entryEquals(existing, local)) {
        // Keep existing — identity preservation
      } else {
        merged.set(local.id, local);
      }
    }

    // Phase 4: Replace map, set flag, emit
    this.threadEntriesByID = merged;
    this.threadEntriesLoaded = true;
    this.emitCurrentThreadEntries();
  }

  /**
   * Build thread entries from all cached thread snapshots.
   * Skips empty-message non-draft threads (they'd be garbage-collected).
   *
   * 逆向: azT.threadEntriesFromCachedThreads — called during merge
   */
  private threadEntriesFromCachedThreads(): ThreadEntry[] {
    const entries: ThreadEntry[] = [];
    for (const [, subject] of this.threadSubjects) {
      const snapshot = subject.getValue();
      const ext = snapshot as ThreadSnapshot & ThreadSnapshotExtended;
      // Skip empty non-draft threads
      if (snapshot.messages.length === 0 && !ext.draft) continue;
      entries.push(snapshotToEntry(snapshot));
    }
    return entries;
  }

  /** 插入/更新 ThreadEntry (由 persistence 层调用) */
  upsertThreadEntry(entry: ThreadEntry): void {
    const existing = this.threadEntriesByID.get(entry.id);
    if (existing && entryEquals(existing, entry)) return;
    this.threadEntriesByID.set(entry.id, entry);
    if (this.threadEntriesLoaded) this.emitCurrentThreadEntries();
  }

  /** 获取所有缓存的线程 ID */
  getCachedThreadIds(): string[] {
    return Array.from(this.threadSubjects.keys());
  }

  /** 获取线程数量 */
  get size(): number {
    return this.threadSubjects.size;
  }

  /**
   * Return thread IDs sorted by most recently interacted, limited to `maxCount`.
   * Used by --continue to find the latest thread.
   *
   * Falls back to iterating cached threads if entries haven't been loaded yet.
   * 逆向: amp threadService.listLocalThreads() sorts by lastInteracted desc
   */
  listRecentThreadIds(maxCount: number): string[] {
    const entries = this.threadEntriesState.getValue();
    if (entries && entries.length > 0) {
      // threadEntriesState is already sorted by userLastInteractedAt desc
      return entries.slice(0, maxCount).map((e) => e.id);
    }
    // Fallback: use cached thread snapshots, sort by last message timestamp
    const ids = this.getCachedThreadIds();
    // Sort by most recently created message (approximate recency)
    const withTimestamp = ids.map((id) => {
      const snap = this.getThreadSnapshot(id);
      const msgs = snap?.messages ?? [];
      const lastMsg = msgs[msgs.length - 1] as (typeof msgs)[0] & {
        createdAt?: string;
        timestamp?: string;
      };
      const ts = lastMsg?.createdAt ?? lastMsg?.timestamp ?? "1970-01-01";
      return { id, ts: new Date(ts).getTime() };
    });
    withTimestamp.sort((a, b) => b.ts - a.ts);
    return withTimestamp.slice(0, maxCount).map((e) => e.id);
  }

  // ─── 内部方法 ────────────────────────────────────────

  /**
   * Set thread visibility level.
   * Updates thread meta, marks dirty (which triggers upload via Task 1).
   * 逆向: amp e0R:529-588 — visibility command pattern
   *
   * Task 2: Thread visibility system (Gap #22)
   */
  setVisibility(threadId: string, level: ThreadVisibility): void {
    const subject = this.threadSubjects.get(threadId);
    if (!subject) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const snapshot = subject.getValue();
    const currentMeta = (snapshot.meta ?? {}) as Record<string, unknown>;
    const updatedMeta = { ...currentMeta, visibility: level };
    const updatedSnapshot: ThreadSnapshot = {
      ...snapshot,
      meta: updatedMeta as ThreadSnapshot["meta"],
      v: snapshot.v + 1,
    };

    this.setCachedThread(updatedSnapshot, { scheduleUpload: true });
    log.debug("Set thread visibility", { threadId, level });
  }

  /**
   * Update thread metadata on the remote server.
   *
   * Three-phase protocol (matching amp exactly):
   * 1. Upload the full thread snapshot first (ensures server has latest)
   * 2. PATCH the metadata via remote.setThreadMeta()
   * 3. Reload the thread from server and replace local cache
   *
   * 逆向: azT.updateThreadMeta(T, R) — modules/1342_ThreadService_azT.js:260-272
   *   ```
   *   async updateThreadMeta(T, R) {
   *     if (!(await this.ensureThreadSubject(T, { createIfMissing: false })))
   *       throw Error(`Thread ${T} not found`);
   *     await this.uploadThreadNow(T);
   *     await this.remote.setThreadMeta(T, R);
   *     let a = await this.remote.getThread(T);
   *     if (!a) throw Error(`Thread ${T} could not be reloaded after updating metadata`);
   *     this.setCachedThread(a, { scheduleUpload: false, uploadedVersion: a.v });
   *   }
   *   ```
   */
  async updateThreadMeta(threadId: string, meta: ThreadMeta): Promise<void> {
    // Phase 0: Ensure thread exists
    const subject = await this.ensureThreadSubject(threadId, {
      createIfMissing: false,
    });
    if (!subject) {
      throw new Error(`Thread ${threadId} not found`);
    }

    // Phase 1: Upload full snapshot first
    await this.uploadThreadNow(threadId);

    // Phase 2: PATCH metadata via remote
    if (!this.remote) {
      throw new Error("No remote transport configured");
    }
    await this.remote.setThreadMeta(threadId, meta);

    // Phase 3: Reload from server to get server-side transformations
    const reloaded = await this.remote.getThread(threadId);
    if (!reloaded) {
      throw new Error(`Thread ${threadId} could not be reloaded after updating metadata`);
    }
    this.setCachedThread(reloaded, { scheduleUpload: false });
    // Mark the uploaded version so the upload manager doesn't re-upload
    if (this.uploadManager) {
      this.uploadManager.setUploadedVersion(threadId, reloaded.v);
    }
    log.debug("Updated thread metadata remotely", { threadId, meta });
  }

  /**
   * Immediately upload a thread to the remote server.
   * Delegates to the upload manager if available.
   *
   * 逆向: azT.uploadThreadNow(T) — called from updateThreadMeta, archive, etc.
   */
  async uploadThreadNow(threadId: string): Promise<void> {
    if (this.uploadManager) {
      await this.uploadManager.uploadThreadNow(threadId);
    }
  }

  /**
   * Exclusive sync read/writer for a thread.
   * Prevents double-lock. The returned object provides read/write/update/asyncDispose.
   * 逆向: azT.exclusiveSyncReadWriter(T, R) — lines 188-220
   *
   * Task 3: Exclusive sync read/writer (Gap #25)
   */
  exclusiveSyncReadWriter(
    threadId: string,
    opts: { scheduleUpload?: boolean } = {},
  ): ThreadExclusiveReadWriter {
    // 逆向: azT line 189 — throw if already locked
    if (this.exclusiveLocks.has(threadId)) {
      throw new Error(`Thread ${threadId} already has an exclusive read-writer`);
    }

    const subject = this.threadSubjects.get(threadId);
    if (!subject) {
      throw new Error(`Thread ${threadId} not found`);
    }

    // 逆向: azT line 196
    this.exclusiveLocks.add(threadId);

    const scheduleUpload = opts.scheduleUpload !== false;
    let disposed = false;

    // 逆向: azT.writeCachedThread — line 31-32
    const writeFn = (thread: ThreadSnapshot): ThreadSnapshot => {
      return this.setCachedThread(thread, { scheduleUpload }).getValue();
    };

    return {
      read: (): ThreadSnapshot => {
        if (disposed) throw new Error("thread exclusive read-writer was disposed");
        return subject.getValue();
      },
      write: (thread: ThreadSnapshot): void => {
        if (disposed) throw new Error("thread exclusive read-writer was disposed");
        writeFn(thread);
      },
      update: (fn: (draft: ThreadSnapshot) => Partial<ThreadSnapshot> | void): ThreadSnapshot => {
        if (disposed) throw new Error("thread exclusive read-writer was disposed");
        const current = subject.getValue();
        // Apply update function — if it returns partial, merge; if void, assume in-place mutation pattern
        const result = fn(current);
        let updated: ThreadSnapshot;
        if (result && typeof result === "object") {
          updated = { ...current, ...result };
        } else {
          // Caller mutated nothing or used a different pattern; re-read
          updated = current;
        }
        return writeFn(updated);
      },
      asyncDispose: async (): Promise<void> => {
        if (disposed) return;
        disposed = true;
        this.exclusiveLocks.delete(threadId);
      },
    };
  }

  /** Check if a thread has an exclusive lock */
  hasExclusiveLock(threadId: string): boolean {
    return this.exclusiveLocks.has(threadId);
  }

  // ─── 以下为原内部方法 ────────────────────────────────

  private syncThreadEntryFromThread(thread: ThreadSnapshot): void {
    if (
      thread.messages.length === 0 &&
      !(thread as ThreadSnapshot & ThreadSnapshotExtended).draft
    ) {
      this.deleteThreadEntry(thread.id);
    } else {
      this.upsertThreadEntry(snapshotToEntry(thread));
    }
  }

  private deleteThreadEntry(id: string): void {
    if (!this.threadEntriesByID.delete(id)) return;
    if (this.threadEntriesLoaded) this.emitCurrentThreadEntries();
  }

  private currentThreadEntries(): ThreadEntry[] {
    const entries = Array.from(this.threadEntriesByID.values()).sort(
      (a, b) => b.userLastInteractedAt - a.userLastInteractedAt,
    );
    return this.maxThreads === null ? entries : entries.slice(0, this.maxThreads);
  }

  private emitCurrentThreadEntries(): void {
    this.threadEntriesState.next(this.currentThreadEntries());
  }
}
