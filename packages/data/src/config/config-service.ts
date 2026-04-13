/**
 * @flitter/data — ConfigService 三级配置合并 + 热重载
 *
 * global → workspace → 合并，数组键 concat+dedup
 * 实现 @flitter/schemas ConfigService 接口
 * 从 amp-cli-reversed/util/otel-instrumentation.js:LX 翻译
 */
import * as fs from "node:fs";
import type {
  ConfigService as IConfigService,
  Config,
  Settings,
  ConfigScope,
  SecretKey,
  SecretStore,
} from "@flitter/schemas";
import { MERGED_ARRAY_KEYS, GLOBAL_ONLY_KEYS } from "@flitter/schemas";
import { BehaviorSubject, type Subscription } from "@flitter/util";
import { FileSettingsStorage } from "./settings-storage";

export interface ConfigServiceOptions {
  storage: FileSettingsStorage;
  secretStorage: SecretStore;
  workspaceRoot: string | null;
  homeDir: string;
  userConfigDir: string;
}

/**
 * 三级配置合并: default → global → workspace
 * 数组键使用 concat + dedup
 */
function mergeSettings(global: Partial<Settings>, workspace: Partial<Settings>): Settings {
  const merged: any = { ...global };

  for (const [key, value] of Object.entries(workspace)) {
    if ((GLOBAL_ONLY_KEYS as readonly string[]).includes(key)) continue;

    if ((MERGED_ARRAY_KEYS as readonly string[]).includes(key)) {
      const globalArr = Array.isArray(merged[key]) ? merged[key] : [];
      const wsArr = Array.isArray(value) ? value : [];
      // concat + dedup
      const combined = [...globalArr, ...wsArr];
      merged[key] = [...new Set(combined.map((v: unknown) => typeof v === "string" ? v : JSON.stringify(v)))];
      // If items are strings, dedup works. For objects, use JSON-based dedup
      if (globalArr.length > 0 && typeof globalArr[0] !== "string") {
        const seen = new Set<string>();
        merged[key] = combined.filter((v: unknown) => {
          const k = JSON.stringify(v);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
    } else {
      merged[key] = value;
    }
  }

  return merged as Settings;
}

/**
 * ConfigService — 三级配置合并 + 热重载
 */
export class ConfigService implements IConfigService {
  private readonly storage: FileSettingsStorage;
  private readonly secretStorage: SecretStore;
  private _workspaceRoot: string | null;
  readonly homeDir: string;
  readonly userConfigDir: string;
  private configSubject: BehaviorSubject<Config>;
  private watchers: fs.FSWatcher[] = [];
  private subscriptions: Subscription[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs = 300;

  constructor(options: ConfigServiceOptions) {
    this.storage = options.storage;
    this.secretStorage = options.secretStorage;
    this._workspaceRoot = options.workspaceRoot;
    this.homeDir = options.homeDir;
    this.userConfigDir = options.userConfigDir;
    this.configSubject = new BehaviorSubject<Config>({
      settings: {} as Settings,
      secrets: this.secretStorage,
    });
  }

  get workspaceRoot(): string {
    return this._workspaceRoot ?? "";
  }

  /** 获取当前配置 (同步) */
  get(): Config {
    return this.configSubject.getValue();
  }

  /** 异步获取最新配置 (重新从文件加载) */
  async getLatest(): Promise<Config> {
    await this.reload();
    return this.configSubject.getValue();
  }

  /** 配置变更 Observable */
  observe(): BehaviorSubject<Config> {
    return this.configSubject;
  }

  /** 更新 settings 单键 */
  updateSettings(scope: ConfigScope, key: string, value: unknown): void {
    this.storage.set(key, value, scope).then(() => this.reload());
  }

  /** 数组追加 */
  appendSettings(scope: ConfigScope, key: string, value: unknown): void {
    this.storage.append(key, value, scope).then(() => this.reload());
  }

  /** 数组前插 */
  prependSettings(scope: ConfigScope, key: string, value: unknown): void {
    this.storage.prepend(key, value, scope).then(() => this.reload());
  }

  /** 删除单键 */
  deleteSettings(scope: ConfigScope, key: string): void {
    this.storage.delete(key, scope).then(() => this.reload());
  }

  /** 更新密钥 */
  updateSecret(_key: SecretKey, _value: string): void {
    // SecretStore 的具体实现由外部注入
  }

  /** 显示路径环境信息 (CLI display) */
  displayPathEnvInfo(): void {
    // 由 CLI 层实现
  }

  /** 从文件加载并合并配置 */
  async reload(): Promise<void> {
    const global = await this.storage.read("global");
    const workspace = this._workspaceRoot ? await this.storage.read("workspace") : {};
    const settings = mergeSettings(global, workspace);

    const prev = this.configSubject.getValue();
    const newConfig: Config = {
      settings,
      secrets: this.secretStorage,
    };

    // diff: 只在实际变更时推送
    if (JSON.stringify(prev.settings) !== JSON.stringify(newConfig.settings)) {
      this.configSubject.next(newConfig);
    }
  }

  /** 启动文件监听 + 热重载 */
  startWatching(): { dispose: () => void } {
    this.stopWatching();

    const paths = this.storage.getWatchPaths();
    for (const p of paths) {
      try {
        const dir = p.includes(".json") ? p.replace(/[/\\][^/\\]+$/, "") : p;
        const watcher = fs.watch(dir, { persistent: false }, (_event, filename) => {
          if (filename && (filename.endsWith(".json") || filename.endsWith(".jsonc"))) {
            this.debouncedReload();
          }
        });
        this.watchers.push(watcher);
      } catch {
        // Directory may not exist yet
      }
    }

    return { dispose: () => this.stopWatching() };
  }

  /** 清理所有监听 */
  unsubscribe(): void {
    this.stopWatching();
    for (const sub of this.subscriptions) sub.unsubscribe();
    this.subscriptions = [];
  }

  private stopWatching(): void {
    for (const w of this.watchers) {
      try { w.close(); } catch { /* ignore */ }
    }
    this.watchers = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private debouncedReload(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.reload();
    }, this.debounceMs);
  }
}
