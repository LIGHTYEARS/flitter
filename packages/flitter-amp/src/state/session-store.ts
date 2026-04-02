// Session persistence -- save, load, list, and prune conversation sessions

import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
  unlinkSync, renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { log } from '../utils/logger';
import type {
  ConversationItem, UserMessage,
  PlanEntry, UsageInfo,
} from '../acp/types';

// --- Schema Types ---

export interface SessionFile {
  version: 1;
  sessionId: string;
  agentName: string | null;
  agentCommand: string;
  cwd: string;
  gitBranch: string | null;
  createdAt: number;
  updatedAt: number;
  items: ConversationItem[];
  plan: PlanEntry[];
  usage: UsageInfo | null;
  currentMode: string | null;
}

export interface SessionIndexEntry {
  sessionId: string;
  agentName: string | null;
  cwd: string;
  gitBranch: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  summary: string;
}

interface SessionIndex {
  version: 1;
  sessions: SessionIndexEntry[];
}

// --- SessionStore ---

export class SessionStore {
  private readonly sessionsDir: string;
  private readonly indexPath: string;
  private readonly retentionMs: number;
  private lastWriteTimestamp: number = 0;

  constructor(
    baseDir: string,
    retentionDays: number = 30,
  ) {
    this.sessionsDir = join(baseDir, 'sessions');
    this.indexPath = join(this.sessionsDir, 'index.json');
    this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Ensure the sessions directory exists. Called before every write operation.
   */
  private ensureDir(): void {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true, mode: 0o700 });
    }
  }

  private atomicWriteFileSync(filePath: string, data: string): void {
    const tmpPath = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      writeFileSync(tmpPath, data, 'utf-8');
      renameSync(tmpPath, filePath);
    } catch (err) {
      try { unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
      throw err;
    }
  }

  /**
   * Save a session snapshot to disk and update the index.
   * Sanitizes streaming state before writing (isStreaming -> false).
   */
  save(session: SessionFile): void {
    try {
      this.ensureDir();

      // Finalize streaming state before serialization
      const sanitizedItems = session.items.map(item => this.sanitizeItem(item));
      // Ensure monotonic updatedAt (Date.now() can be equal across rapid saves).
      const now = Date.now();
      const updatedAt = now <= this.lastWriteTimestamp ? this.lastWriteTimestamp + 1 : now;
      this.lastWriteTimestamp = updatedAt;

      const fileData: SessionFile = {
        ...session,
        updatedAt,
        items: sanitizedItems,
      };

      const filePath = join(this.sessionsDir, `${session.sessionId}.json`);
      this.atomicWriteFileSync(filePath, JSON.stringify(fileData, null, 2));

      this.updateIndex(fileData);
      log.info(`Session saved: ${session.sessionId} (${sanitizedItems.length} items)`);
    } catch (err) {
      log.error('Failed to save session', err);
      // Intentionally non-fatal: session loss is acceptable; app crash is not
    }
  }

  /**
   * Load a session from disk by ID. Returns null if not found, corrupt, or
   * has an incompatible schema version.
   */
  load(sessionId: string): SessionFile | null {
    try {
      const filePath = join(this.sessionsDir, `${sessionId}.json`);
      if (!existsSync(filePath)) return null;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as SessionFile;
      if (data.version !== 1) {
        log.warn(`Unknown session file version: ${data.version}, skipping`);
        return null;
      }
      return data;
    } catch (err) {
      log.error(`Failed to load session ${sessionId}`, err);
      return null;
    }
  }

  /**
   * Return the most recently updated session from the index, or null.
   */
  mostRecent(): SessionIndexEntry | null {
    const index = this.loadIndex();
    if (index.sessions.length === 0) return null;
    index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return index.sessions[0];
  }

  /**
   * List all sessions in the index, sorted by most recent first.
   */
  list(): SessionIndexEntry[] {
    const index = this.loadIndex();
    index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return index.sessions;
  }

  /**
   * Remove sessions older than the retention period.
   * Returns the number of sessions removed.
   */
  prune(): number {
    if (this.retentionMs <= 0) return 0; // 0 = keep forever
    const cutoff = Date.now() - this.retentionMs;
    const index = this.loadIndex();
    const toRemove = index.sessions.filter(s => s.updatedAt < cutoff);

    for (const entry of toRemove) {
      try {
        const filePath = join(this.sessionsDir, `${entry.sessionId}.json`);
        if (existsSync(filePath)) unlinkSync(filePath);
      } catch {
        // Best effort deletion; orphaned files are harmless
      }
    }

    index.sessions = index.sessions.filter(s => s.updatedAt >= cutoff);
    this.saveIndex(index);
    if (toRemove.length > 0) {
      log.info(`Pruned ${toRemove.length} expired sessions`);
    }
    return toRemove.length;
  }

  /**
   * Sanitize a conversation item for serialization.
   * Forces streaming flags to false since saved state is always finalized.
   */
  private sanitizeItem(item: ConversationItem): ConversationItem {
    switch (item.type) {
      case 'assistant_message':
        return { ...item, isStreaming: false };
      case 'thinking':
        return { ...item, isStreaming: false };
      default:
        return item;
    }
  }

  private loadIndex(): SessionIndex {
    try {
      if (!existsSync(this.indexPath)) {
        return { version: 1, sessions: [] };
      }
      const raw = readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(raw) as SessionIndex;
    } catch {
      return { version: 1, sessions: [] };
    }
  }

  private saveIndex(index: SessionIndex): void {
    try {
      this.ensureDir();
      this.atomicWriteFileSync(this.indexPath, JSON.stringify(index, null, 2));
    } catch (err) {
      log.error('Failed to save session index', err);
    }
  }

  private updateIndex(session: SessionFile): void {
    const index = this.loadIndex();
    const userMessages = session.items.filter(i => i.type === 'user_message');
    const firstUserMsg = userMessages[0] as UserMessage | undefined;
    const summary = firstUserMsg
      ? firstUserMsg.text.slice(0, 80)
      : '(empty session)';

    const entry: SessionIndexEntry = {
      sessionId: session.sessionId,
      agentName: session.agentName,
      cwd: session.cwd,
      gitBranch: session.gitBranch,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: userMessages.length,
      summary,
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

    this.saveIndex(index);
  }
}
