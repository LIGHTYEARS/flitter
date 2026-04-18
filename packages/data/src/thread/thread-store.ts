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
import { BehaviorSubject } from "@flitter/util";
import type { ThreadEntry, ThreadStoreOptions } from "./types";

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

  constructor(options: ThreadStoreOptions = {}) {
    this.maxThreads =
      options.maxThreads === undefined || options.maxThreads === null
        ? null
        : Math.max(1, Math.floor(options.maxThreads));
    this.uploadThrottleMs =
      options.uploadThrottleMs === undefined ? 1000 : Math.max(0, options.uploadThrottleMs);
  }

  /**
   * 缓存线程快照 + 更新 ThreadEntry 索引
   * 从 azT.setCachedThread 翻译
   */
  setCachedThread(
    thread: ThreadSnapshot,
    opts: { scheduleUpload?: boolean } = {},
  ): BehaviorSubject<ThreadSnapshot> {
    const existing = this.threadSubjects.get(thread.id);
    if (existing) {
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

  /** 删除线程 */
  deleteThread(id: string): boolean {
    const existed = this.threadSubjects.delete(id);
    this.threadEntriesByID.delete(id);
    this._dirtyThreads.delete(id);
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

  /** 标记线程待持久化 */
  markDirty(id: string): void {
    this._dirtyThreads.add(id);
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
