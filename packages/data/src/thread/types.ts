/**
 * @flitter/data — Thread 存储类型定义
 *
 * ThreadEntry 轻量索引、ThreadStoreOptions 配置
 * 从 amp-cli-reversed/app/skills-agents-system.js:fuT/azT 提取
 */
import type {
  ThreadEnvironment,
  ThreadRelationship,
} from "@flitter/schemas";

/** 线程索引条目 — 轻量摘要，不含完整消息 */
export interface ThreadEntry {
  id: string;
  v: number;
  created: number;
  title: string | null;
  userLastInteractedAt: number;
  messageCount: number;
  env?: ThreadEnvironment;
  originThreadID?: string;
  mainThreadID?: string;
  relationships: ThreadRelationship[];
  summaryStats: {
    diffStats?: Record<string, unknown>;
    messageCount: number;
  };
  agentMode?: string;
  usesDtw: boolean;
  archived?: boolean;
  creatorUserID?: string;
  meta?: { visibility?: string; sharedGroupIDs?: string[] };
}

/** ThreadStore 配置选项 */
export interface ThreadStoreOptions {
  /** 最大线程条目数，null = 无限 (default: null) */
  maxThreads?: number | null;
  /** 持久化节流间隔 ms (default: 1000) */
  uploadThrottleMs?: number;
}

/** ThreadPersistence 配置选项 */
export interface ThreadPersistenceOptions {
  /** 线程 JSON 文件基础目录 */
  baseDir: string;
  /** 自动保存节流间隔 ms (default: 1000) */
  throttleMs?: number;
}
