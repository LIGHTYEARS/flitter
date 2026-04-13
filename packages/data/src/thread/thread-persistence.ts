/**
 * @flitter/data — ThreadPersistence JSON 文件持久化
 *
 * 原子写入 (write-to-temp + fsync + rename)、Zod 校验、自动保存
 * 替代 Amp 的 DTW 远程同步 (KD-25)
 *
 * @example
 * ```ts
 * const persistence = new ThreadPersistence({ baseDir: "/home/user/.flitter/threads" });
 * await persistence.save(snapshot);
 * const loaded = await persistence.load("thread-id");
 * ```
 */
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { ThreadSnapshotSchema } from "@flitter/schemas";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { ThreadPersistenceOptions } from "./types";
import type { ThreadStore } from "./thread-store";

/**
 * ThreadPersistence — 线程 JSON 文件持久化层
 */
export class ThreadPersistence {
  private readonly baseDir: string;
  private readonly throttleMs: number;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: ThreadPersistenceOptions) {
    this.baseDir = options.baseDir;
    this.throttleMs = options.throttleMs ?? 1000;
  }

  /**
   * 原子写入线程快照到 JSON 文件
   * 使用 write-to-temp + fsync + rename (KD-28)
   */
  async save(thread: ThreadSnapshot): Promise<void> {
    await fsp.mkdir(this.baseDir, { recursive: true });
    const filePath = this.threadPath(thread.id);
    const tmpPath = `${filePath}.tmp`;
    const data = JSON.stringify(thread, null, 2);

    const fd = await fsp.open(tmpPath, "w");
    try {
      await fd.writeFile(data, "utf-8");
      await fd.sync();
    } finally {
      await fd.close();
    }
    await fsp.rename(tmpPath, filePath);
  }

  /**
   * 加载线程快照 — 读取 + Zod 校验
   * 返回 null 如果文件不存在或损坏
   */
  async load(id: string): Promise<ThreadSnapshot | null> {
    const filePath = this.threadPath(id);
    let raw: string;
    try {
      raw = await fsp.readFile(filePath, "utf-8");
    } catch (err: any) {
      if (err?.code === "ENOENT") return null;
      throw err;
    }

    try {
      const parsed = JSON.parse(raw);
      return ThreadSnapshotSchema.parse(parsed);
    } catch {
      // Corrupted or invalid file — return null
      return null;
    }
  }

  /** 删除线程 JSON 文件 */
  async delete(id: string): Promise<void> {
    const filePath = this.threadPath(id);
    try {
      await fsp.unlink(filePath);
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
  }

  /** 扫描目录获取所有线程 ID */
  async list(): Promise<string[]> {
    try {
      const files = await fsp.readdir(this.baseDir);
      return files
        .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"))
        .map((f) => f.slice(0, -5)); // strip .json
    } catch (err: any) {
      if (err?.code === "ENOENT") return [];
      throw err;
    }
  }

  /** 加载所有线程快照 */
  async loadAll(): Promise<ThreadSnapshot[]> {
    const ids = await this.list();
    const results: ThreadSnapshot[] = [];
    for (const id of ids) {
      const thread = await this.load(id);
      if (thread) results.push(thread);
    }
    return results;
  }

  /**
   * 启动自动保存 — 定时检查 dirty 线程并保存
   * 返回 dispose 函数
   */
  startAutoSave(store: ThreadStore): { dispose: () => void } {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      const dirtyIds = store.getDirtyThreadIds();
      for (const id of dirtyIds) {
        const snapshot = store.getThreadSnapshot(id);
        if (snapshot) {
          try {
            await this.save(snapshot);
            store.clearDirty(id);
          } catch {
            // Retry on next tick
          }
        } else {
          store.clearDirty(id);
        }
      }
    }, this.throttleMs);

    return {
      dispose: () => {
        if (this.autoSaveTimer) {
          clearInterval(this.autoSaveTimer);
          this.autoSaveTimer = null;
        }
      },
    };
  }

  private threadPath(id: string): string {
    return path.join(this.baseDir, `${id}.json`);
  }
}
