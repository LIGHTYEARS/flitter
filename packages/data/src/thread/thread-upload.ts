/**
 * @flitter/data — Thread upload pipeline
 *
 * ThreadUploadManager: throttled upload loop with in-flight dedup and version tracking.
 * ThreadRemoteTransport: interface for remote thread operations.
 *
 * 逆向: amp-cli-reversed/modules/1342_ThreadService_azT.js
 *   - scheduleUploadFlush() — lines 87-91
 *   - flushPendingUploads() — lines 93-106
 *   - uploadThreadNow() — lines 107-127
 *   - asyncDispose() — lines 301-304
 */
import type { ThreadSnapshot } from "@flitter/schemas";
import { createLogger } from "@flitter/util";
import type { ThreadEntry } from "./types";

const log = createLogger("thread-upload");

/**
 * Search result entry from the server's FTS5 search endpoint.
 * 逆向: amp /api/threads/find response shape
 */
export interface SearchThreadResult {
  id: string;
  title: string | null;
  updatedAt: number;
  messageCount: number;
}

/**
 * Response from the search endpoint.
 * 逆向: amp /api/threads/find → { threads, hasMore }
 */
export interface SearchThreadsResponse {
  threads: SearchThreadResult[];
  hasMore: boolean;
}

/**
 * Remote transport interface for thread operations.
 * 逆向: azT.remote — used in uploadThread, getThread, listThreads, deleteThread
 */
/**
 * Thread metadata object for remote update.
 * 逆向: amp MA() — maps user-facing levels to internal visibility + sharedGroupIDs
 */
export interface ThreadMeta {
  visibility?: string;
  sharedGroupIDs?: string[];
  shareWithAllCreatorGroups?: boolean;
}

export interface ThreadRemoteTransport {
  uploadThread(thread: ThreadSnapshot): Promise<void>;
  getThread(id: string): Promise<ThreadSnapshot | null>;
  listThreads(opts?: { limit?: number | null }): Promise<ThreadEntry[]>;
  deleteThread(id: string): Promise<void>;
  /**
   * Full-text search for threads via the server's FTS5 endpoint.
   * 逆向: amp fi(`/api/threads/find?q=...&limit=...`)
   */
  searchThreads(opts: { q: string; limit?: number }): Promise<SearchThreadsResponse>;
  /**
   * Update thread metadata on the server (visibility, sharedGroupIDs, etc.).
   * 逆向: ezT.setThreadMeta(R, a) — modules/1343_unknown_ezT.js:55-64
   */
  setThreadMeta(id: string, meta: ThreadMeta): Promise<void>;
}

export interface ThreadUploadManagerOptions {
  /** Access to the thread cache to read snapshots */
  getThreadSnapshot: (id: string) => ThreadSnapshot | undefined;
  /** Remote transport to upload to */
  remote: ThreadRemoteTransport;
  /** Throttle interval in ms (default 1000) */
  throttleMs?: number;
}

/**
 * ThreadUploadManager — throttled upload loop with dedup
 * 逆向: amp-cli-reversed/modules/1342_ThreadService_azT.js
 *
 * Manages:
 * - dirtyThreads: Set of thread IDs needing upload
 * - uploadInFlight: Map of in-progress upload promises (dedup)
 * - uploadedVersionByThreadID: Map of last uploaded version (skip redundant)
 * - uploadTimer: throttled timer for batched flushes
 */
export class ThreadUploadManager {
  private readonly getThreadSnapshot: (id: string) => ThreadSnapshot | undefined;
  private readonly remote: ThreadRemoteTransport;
  private readonly throttleMs: number;

  private dirtyThreads = new Set<string>();
  private uploadInFlight = new Map<string, Promise<void>>();
  private uploadedVersionByThreadID = new Map<string, number>();
  private uploadTimer: ReturnType<typeof setTimeout> | null = null;
  private _disposed = false;

  constructor(options: ThreadUploadManagerOptions) {
    this.getThreadSnapshot = options.getThreadSnapshot;
    this.remote = options.remote;
    this.throttleMs = options.throttleMs ?? 1000;
  }

  /**
   * Mark a thread as dirty and schedule a flush.
   * 逆向: azT.markDirty(T) — line 84-85
   */
  markDirty(threadId: string): void {
    this.dirtyThreads.add(threadId);
    this.scheduleFlush();
  }

  /**
   * Schedule a throttled flush of dirty threads.
   * 逆向: azT.scheduleUploadFlush() — lines 87-91
   * Only sets a timer if one isn't already pending.
   */
  scheduleFlush(): void {
    if (this.uploadTimer !== null) return;
    this.uploadTimer = setTimeout(() => {
      this.uploadTimer = null;
      this.flushPendingUploads();
    }, this.throttleMs);
  }

  /**
   * Drain the dirty set and upload each thread.
   * Re-queues failed uploads.
   * 逆向: azT.flushPendingUploads() — lines 93-106
   */
  async flushPendingUploads(): Promise<void> {
    const ids = Array.from(this.dirtyThreads);
    this.dirtyThreads = new Set();

    await Promise.all(
      ids.map(async (id) => {
        try {
          await this.uploadThreadNow(id);
        } catch (err) {
          // 逆向: azT re-adds to dirty on failure — line 103
          log.error("Failed to upload thread", { threadID: id, error: err });
          this.dirtyThreads.add(id);
        }
      }),
    );

    // If there are still dirty threads (from failures), schedule another flush
    // 逆向: azT line 105
    if (this.dirtyThreads.size > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * Upload a single thread, with version check and in-flight dedup.
   * 逆向: azT.uploadThreadNow(T) — lines 107-127
   *
   * Loop pattern:
   * 1. Get thread subject -> snapshot
   * 2. Skip if already uploaded at this version
   * 3. Wait for in-flight upload if one exists, then retry
   * 4. Start upload, track in uploadInFlight map
   */
  async uploadThreadNow(threadId: string): Promise<void> {
    while (true) {
      const snapshot = this.getThreadSnapshot(threadId);
      if (!snapshot) return;

      // 逆向: azT version check — lines 112-113
      const uploadedVersion = this.uploadedVersionByThreadID.get(threadId);
      if (uploadedVersion !== undefined && uploadedVersion >= snapshot.v) return;

      // 逆向: azT in-flight dedup — lines 114-117
      const existing = this.uploadInFlight.get(threadId);
      if (existing) {
        await existing;
        continue;
      }

      // 逆向: azT start upload — lines 119-126
      const version = snapshot.v;
      const uploadPromise = this.remote
        .uploadThread(snapshot)
        .then(() => {
          this.uploadedVersionByThreadID.set(threadId, version);
        })
        .finally(() => {
          this.uploadInFlight.delete(threadId);
        });

      this.uploadInFlight.set(threadId, uploadPromise);
      await uploadPromise;
      return; // successful upload, exit loop
    }
  }

  /**
   * Set the uploaded version for a thread (used when loading from remote).
   * 逆向: azT.setCachedThread with uploadedVersion option — line 26
   */
  setUploadedVersion(threadId: string, version: number): void {
    this.uploadedVersionByThreadID.set(threadId, version);
  }

  /**
   * Get the last uploaded version for a thread.
   */
  getUploadedVersion(threadId: string): number | undefined {
    return this.uploadedVersionByThreadID.get(threadId);
  }

  /**
   * Synchronous flush — cancel timer and trigger immediate flush.
   * 逆向: azT.flush() — lines 221-224
   */
  flush(): void {
    if (this.uploadTimer !== null) {
      clearTimeout(this.uploadTimer);
      this.uploadTimer = null;
    }
    this.flushPendingUploads();
  }

  /**
   * Flush and wait for a specific thread to reach a given version.
   * 逆向: azT.flushVersion(T, R) — lines 225-229
   */
  async flushVersion(threadId: string, version: number): Promise<void> {
    await this.uploadThreadNow(threadId);
    const uploaded = this.uploadedVersionByThreadID.get(threadId);
    if (uploaded === undefined || uploaded < version) {
      throw new Error(`Failed to upload thread ${threadId} to version ${version}`);
    }
  }

  /**
   * Dispose: drain all dirty and in-flight uploads, then clean up.
   * 逆向: azT.asyncDispose() — lines 301-304
   */
  async dispose(): Promise<void> {
    this._disposed = true;

    // 逆向: clear timer first
    if (this.uploadTimer !== null) {
      clearTimeout(this.uploadTimer);
      this.uploadTimer = null;
    }

    // 逆向: drain all dirty + in-flight
    const allIds = new Set([...this.dirtyThreads, ...this.uploadInFlight.keys()]);
    await Promise.all(Array.from(allIds).map((id) => this.uploadThreadNow(id).catch(() => {})));

    this.dirtyThreads.clear();
    this.uploadInFlight.clear();
    this.uploadedVersionByThreadID.clear();
  }

  /** Whether this manager has been disposed */
  get disposed(): boolean {
    return this._disposed;
  }

  /** Clean up a thread's tracking state (called on thread deletion) */
  removeThread(threadId: string): void {
    this.dirtyThreads.delete(threadId);
    this.uploadInFlight.delete(threadId);
    this.uploadedVersionByThreadID.delete(threadId);
  }
}
