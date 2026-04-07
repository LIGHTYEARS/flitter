// Session persistence — save, load, list, and prune conversation sessions.
//
// Ported from flitter-amp/src/state/session-store.ts.
// Stores sessions as individual JSON files with a lightweight index for
// fast listing. All writes are atomic (write .tmp then rename) to prevent
// data corruption on crash.

import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
  unlinkSync, renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { log } from '../utils/logger';
import type {
  ConversationItem, UserMessage,
  PlanEntry, UsageInfo,
} from './types';

// ---------------------------------------------------------------------------
// Schema Types
// ---------------------------------------------------------------------------

/**
 * On-disk format for a single persisted session.
 * Contains enough data for full restoration, inspection, and cleanup.
 */
export interface SessionFile {
  version: 1;
  sessionId: string;
  /** Thread ID for multi-thread sessions. Optional for backward compat. */
  threadID?: string;
  cwd: string;
  gitBranch: string | null;
  model: string;
  createdAt: number;
  updatedAt: number;
  items: ConversationItem[];
  plan: PlanEntry[];
  usage: UsageInfo | null;
  currentMode: string | null;
  /** Thread title (null if auto-generated and not yet set). */
  threadTitle?: string | null;
  /** Thread visibility mode. */
  threadVisibility?: string;
}

/**
 * Lightweight metadata for a single session in the index.
 * Surfaced by list() and mostRecent() without loading full session files.
 */
export interface SessionIndexEntry {
  sessionId: string;
  /** Thread ID for multi-thread sessions. */
  threadID?: string;
  cwd: string;
  gitBranch: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  /** First 80 characters of the first user message. */
  summary: string;
  /** Thread title if set. */
  threadTitle?: string | null;
}

/**
 * Root structure of the on-disk session index file.
 */
interface SessionIndex {
  version: 1;
  sessions: SessionIndexEntry[];
}

// ---------------------------------------------------------------------------
// Default base directory
// ---------------------------------------------------------------------------

const DEFAULT_BASE_DIR = join(homedir(), '.flitter-cli', 'sessions');

// ---------------------------------------------------------------------------
// SessionStore
// ---------------------------------------------------------------------------

/**
 * Manages session persistence to the local filesystem.
 *
 * Sessions are stored as individual JSON files named `{sessionId}.json`
 * under the base directory. An `index.json` file provides fast lookup
 * for listing and most-recent queries.
 *
 * Key design decisions (ported from flitter-amp):
 * - Atomic writes via tmp+rename to prevent corruption
 * - Monotonic updatedAt timestamps to preserve ordering
 * - Non-fatal save errors (session loss is acceptable, app crash is not)
 * - Streaming flags sanitized before serialization
 */
export class SessionStore {
  private readonly _baseDir: string;
  private readonly _indexPath: string;
  private readonly _retentionMs: number;
  private _lastWriteTimestamp: number = 0;

  constructor(opts: { baseDir?: string; retentionDays?: number } = {}) {
    this._baseDir = opts.baseDir ?? DEFAULT_BASE_DIR;
    this._indexPath = join(this._baseDir, 'index.json');
    this._retentionMs = (opts.retentionDays ?? 30) * 24 * 60 * 60 * 1000;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Save a session snapshot to disk and update the index.
   * Sanitizes streaming state before writing (isStreaming -> false).
   */
  save(session: SessionFile): void {
    try {
      this._ensureDir();

      const sanitizedItems = session.items.map(item => this._sanitizeItem(item));

      // Ensure monotonic updatedAt (Date.now() can be equal across rapid saves).
      const now = Date.now();
      const updatedAt = now <= this._lastWriteTimestamp
        ? this._lastWriteTimestamp + 1
        : now;
      this._lastWriteTimestamp = updatedAt;

      const fileData: SessionFile = {
        ...session,
        updatedAt,
        items: sanitizedItems,
      };

      const filePath = join(this._baseDir, `${session.sessionId}.json`);
      this._atomicWrite(filePath, JSON.stringify(fileData, null, 2));

      this._updateIndex(fileData);
      log.info(`Session saved: ${session.sessionId} (${sanitizedItems.length} items)`);
    } catch (err) {
      log.error(`Failed to save session: ${err instanceof Error ? err.message : String(err)}`);
      // Intentionally non-fatal: session loss is acceptable; app crash is not
    }
  }

  /**
   * Load a session from disk by ID. Returns null if not found, corrupt, or
   * has an incompatible schema version.
   */
  load(sessionId: string): SessionFile | null {
    try {
      const filePath = join(this._baseDir, `${sessionId}.json`);
      if (!existsSync(filePath)) return null;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as SessionFile;
      if (data.version !== 1) {
        log.warn(`Unknown session file version: ${String(data.version)}, skipping`);
        return null;
      }
      return data;
    } catch (err) {
      log.error(`Failed to load session ${sessionId}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Return the most recently updated session from the index, or null.
   */
  mostRecent(): SessionIndexEntry | null {
    const index = this._loadIndex();
    if (index.sessions.length === 0) return null;
    index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return index.sessions[0];
  }

  /**
   * List all sessions in the index, sorted by most recent first.
   */
  list(): SessionIndexEntry[] {
    const index = this._loadIndex();
    index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return index.sessions;
  }

  /**
   * Remove sessions older than the retention period.
   * Returns the number of sessions removed.
   */
  prune(): number {
    if (this._retentionMs <= 0) return 0;
    const cutoff = Date.now() - this._retentionMs;
    const index = this._loadIndex();
    const toRemove = index.sessions.filter(s => s.updatedAt < cutoff);

    for (const entry of toRemove) {
      try {
        const filePath = join(this._baseDir, `${entry.sessionId}.json`);
        if (existsSync(filePath)) unlinkSync(filePath);
      } catch {
        // Best effort deletion; orphaned files are harmless
      }
    }

    index.sessions = index.sessions.filter(s => s.updatedAt >= cutoff);
    this._saveIndex(index);
    if (toRemove.length > 0) {
      log.info(`Pruned ${toRemove.length} expired sessions`);
    }
    return toRemove.length;
  }

  // -------------------------------------------------------------------------
  // Private — Directory and Atomic Write
  // -------------------------------------------------------------------------

  /**
   * Ensure the sessions directory exists. Called before every write.
   */
  private _ensureDir(): void {
    if (!existsSync(this._baseDir)) {
      mkdirSync(this._baseDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Write data to filePath atomically via a temp file + rename.
   */
  private _atomicWrite(filePath: string, data: string): void {
    const tmpPath = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      writeFileSync(tmpPath, data, 'utf-8');
      renameSync(tmpPath, filePath);
    } catch (err) {
      try { unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Private — Item Sanitization
  // -------------------------------------------------------------------------

  /**
   * Sanitize a conversation item for serialization.
   * Forces streaming flags to false since saved state is always finalized.
   */
  private _sanitizeItem(item: ConversationItem): ConversationItem {
    switch (item.type) {
      case 'assistant_message':
        return { ...item, isStreaming: false };
      case 'thinking':
        return { ...item, isStreaming: false };
      case 'tool_call':
        return item.isStreaming ? { ...item, isStreaming: false } : item;
      default:
        return item;
    }
  }

  // -------------------------------------------------------------------------
  // Private — Index Management
  // -------------------------------------------------------------------------

  /**
   * Load the session index from disk. Returns an empty index if the file
   * is missing or corrupt.
   */
  private _loadIndex(): SessionIndex {
    try {
      if (!existsSync(this._indexPath)) {
        return { version: 1, sessions: [] };
      }
      const raw = readFileSync(this._indexPath, 'utf-8');
      return JSON.parse(raw) as SessionIndex;
    } catch {
      return { version: 1, sessions: [] };
    }
  }

  /**
   * Persist the session index to disk (atomic write).
   */
  private _saveIndex(index: SessionIndex): void {
    try {
      this._ensureDir();
      this._atomicWrite(this._indexPath, JSON.stringify(index, null, 2));
    } catch (err) {
      log.error(`Failed to save session index: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Upsert a session entry in the index and persist it.
   * Extracts summary from the first user message (first 80 chars).
   */
  private _updateIndex(session: SessionFile): void {
    const index = this._loadIndex();
    const userMessages = session.items.filter(
      (i): i is UserMessage => i.type === 'user_message',
    );
    const firstUserMsg = userMessages[0];
    const summary = firstUserMsg
      ? firstUserMsg.text.slice(0, 80)
      : '(empty session)';

    const entry: SessionIndexEntry = {
      sessionId: session.sessionId,
      threadID: session.threadID,
      cwd: session.cwd,
      gitBranch: session.gitBranch,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: userMessages.length,
      summary,
      threadTitle: session.threadTitle,
    };

    // Upsert: replace existing entry or append new
    const existingIdx = index.sessions.findIndex(
      s => s.sessionId === session.sessionId,
    );
    if (existingIdx >= 0) {
      index.sessions[existingIdx] = entry;
    } else {
      index.sessions.push(entry);
    }

    this._saveIndex(index);
  }
}
