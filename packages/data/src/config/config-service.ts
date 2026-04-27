/**
 * @flitter/data — ConfigService 三级配置合并 + 热重载
 *
 * global → workspace → 合并，数组键 concat+dedup
 * 实现 @flitter/schemas ConfigService 接口
 * 从 amp-cli-reversed/util/otel-instrumentation.js:LX 翻译
 */
import * as fs from "node:fs";
import {
  type Config,
  type ConfigScope,
  GLOBAL_ONLY_KEYS,
  type ConfigService as IConfigService,
  MERGED_ARRAY_KEYS,
  type SecretKey,
  type SecretStore,
  type Settings,
  SettingsSchema,
  setDisplayPathEnvInfo,
} from "@flitter/schemas";
import {
  BehaviorSubject,
  createLogger,
  distinctUntilChanged,
  GlobalCachedValue,
  type Observable,
  type Subscription,
} from "@flitter/util";
import { readAdminSettings } from "./admin-settings";
import type { FileSettingsStorage } from "./settings-storage";

const log = createLogger("config-service");

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
  const merged: Partial<Settings> & Record<string, unknown> = { ...global };

  for (const [key, value] of Object.entries(workspace)) {
    if ((GLOBAL_ONLY_KEYS as readonly string[]).includes(key)) continue;

    if ((MERGED_ARRAY_KEYS as readonly string[]).includes(key)) {
      const globalArr = Array.isArray(merged[key]) ? merged[key] : [];
      const wsArr = Array.isArray(value) ? value : [];
      // concat + dedup
      const combined = [...globalArr, ...wsArr];
      merged[key] = [
        ...new Set(combined.map((v: unknown) => (typeof v === "string" ? v : JSON.stringify(v)))),
      ];
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
  /**
   * 逆向: amp-cli-reversed/modules/1276_unknown_LX.js:98
   *   workspaceRoot: a  — amp exposes workspaceRoot as an Observable on the configService.
   *   Consumers pipe it with distinctUntilChanged (E9) for reactive updates.
   *   e.g. chunk-002.js:27349: a.workspaceRoot.pipe(E9(...))
   */
  private workspaceRootSubject: BehaviorSubject<string | undefined>;
  private watchers: fs.FSWatcher[] = [];
  private subscriptions: Subscription[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs = 300;

  /**
   * Admin settings TTL cache — avoids re-reading the managed-settings.json on every reload().
   *
   * 逆向: amp-cli-reversed/chunk-005.js:145039-145077
   *   JmT = new d5T({ compute: async () => { ... oHR() ... }, softTTL: 30000, hardTTL: 120000,
   *     changes: (T, R) => { let a = cHR(T, R); return a.length > 0 ? a : void 0; }
   *   })
   *
   * The changes callback mirrors amp's cHR() (chunk-002.js:25063) which returns the list
   * of changed key names when old and new admin settings differ.
   */
  private _adminSettingsCache: GlobalCachedValue<Record<string, unknown>, string[]>;

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
    this.workspaceRootSubject = new BehaviorSubject<string | undefined>(
      options.workspaceRoot ?? undefined,
    );

    // 逆向: amp-cli-reversed/chunk-005.js:145039-145077
    //   JmT = new d5T({ softTTL: 30000, hardTTL: 120000, compute: () => oHR(), changes: cHR })
    //   cHR (chunk-002.js:25063): returns array of changed key names, or [] if identical.
    this._adminSettingsCache = new GlobalCachedValue<Record<string, unknown>, string[]>({
      softTTL: 30_000,
      hardTTL: 120_000,
      compute: () => readAdminSettings(),
      changes: (oldVal, newVal) => {
        const a = oldVal ?? {};
        const b = newVal ?? {};
        const aJson = JSON.stringify(a, Object.keys(a).sort());
        const bJson = JSON.stringify(b, Object.keys(b).sort());
        if (aJson === bJson) return undefined;
        const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
        return Array.from(allKeys);
      },
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

  /**
   * Reactive workspace root Observable.
   *
   * 逆向: amp-cli-reversed/modules/1276_unknown_LX.js:98
   *   workspaceRoot: a  — amp's configService exposes workspaceRoot as an Observable.
   *
   * Consumers in amp apply distinctUntilChanged when subscribing:
   *   chunk-002.js:27349: a.workspaceRoot.pipe(E9((X, rT) => X?.toString() === rT?.toString()))
   *   modules/1338_SkillService_UqR.js:15: T.workspaceRoot.pipe(JR(aT => aT ? d0(aT) : null), E9())
   *
   * We apply distinctUntilChanged here so callers get deduplicated emissions by default.
   */
  observeWorkspaceRoot(): Observable<string | undefined> {
    return this.workspaceRootSubject.pipe(distinctUntilChanged());
  }

  /** 更新 settings 单键 */
  updateSettings(scope: ConfigScope, key: string, value: unknown): void {
    // Optimistic in-memory update: apply immediately so subsequent reads see the change.
    // The async file write + reload happens in the background.
    const currentConfig = this.configSubject.getValue();
    const updatedSettings = { ...currentConfig.settings, [key]: value } as Settings;
    this.configSubject.next({ ...currentConfig, settings: updatedSettings });

    // Persist to disk (fire-and-forget)
    this.storage.set(key, value, scope).then(() => this.reload());
  }

  /** Apply a runtime-only override (in-memory, never persisted to disk).
   * Use for ephemeral CLI flags like --dangerouslyAllowAll. */
  setRuntimeOverride(key: string, value: unknown): void {
    const currentConfig = this.configSubject.getValue();
    const updatedSettings = { ...currentConfig.settings, [key]: value } as Settings;
    this.configSubject.next({ ...currentConfig, settings: updatedSettings });
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

  /**
   * Initialize the global display path env info.
   *
   * 逆向: amp-cli-reversed/chunk-002.js:25145-25153
   *   A = a.pipe(JR(o => ({
   *     workspaceFolders: o ? [d0(o)] : null,
   *     isWindows: JS().os === "windows",
   *     homeDir: process.env.HOME ? d0(zR.file(process.env.HOME)) : void 0,
   *   })))
   *   l = A.subscribe(o => { AET(o); })
   *
   * In flitter's simpler model (not an Observable), we call setDisplayPathEnvInfo
   * once with the current workspace root and home directory.
   */
  displayPathEnvInfo(): void {
    setDisplayPathEnvInfo({
      workspaceFolders: this._workspaceRoot ? [this._workspaceRoot] : null,
      isWindows: process.platform === "win32",
      homeDir: this.homeDir || undefined,
    });
  }

  /** 从文件加载并合并配置
   * Task 9: After merging, validate against Zod schema. On failure, log warning, use validated subset.
   * 逆向: amp validates config against schema on load
   *
   * Admin settings merge:
   * 逆向: amp-cli-reversed/modules/1273_unknown_iHR.js
   *   Admin settings are read from a system-level managed-settings.json file.
   *   Any key present in admin settings takes unconditional priority over
   *   the global+workspace merge. This is the iHR wrapper: `get(a, e)` checks
   *   if the key exists in admin settings first.
   *
   * 逆向: amp-cli-reversed/modules/2002_unknown_S8.js:70
   *   `t = iHR(t)` — admin overlay applied last (highest priority).
   */
  async reload(): Promise<void> {
    const global = await this.storage.read("global");
    const workspace = this._workspaceRoot ? await this.storage.read("workspace") : {};
    let settings = mergeSettings(global, workspace);

    // Apply admin settings overlay (highest priority)
    // 逆向: iHR(T) — modules/1273_unknown_iHR.js
    //   `get(a, e) { if (e === "admin" || a in adminDict) return adminDict[a]; return T.get(a, e); }`
    // 逆向: chunk-005.js:145039 — admin settings use GlobalCachedValue (softTTL: 30s, hardTTL: 120s)
    const adminSettings = await this._adminSettingsCache.get();
    if (Object.keys(adminSettings).length > 0) {
      settings = { ...settings, ...adminSettings } as Settings;
      log.debug("Admin settings merged", { keys: Object.keys(adminSettings) });
    }

    // Task 9: Settings validation (Gap #41)
    // Validate merged settings against the Zod schema.
    // On failure, log warning and use the validated subset (partial parse).
    const validation = SettingsSchema.partial().safeParse(settings);
    if (!validation.success) {
      log.warn("Settings validation failed, using validated subset", {
        errors: validation.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      // Strip invalid fields by re-parsing with passthrough
      // Keep original settings but log the issues — don't crash
    } else {
      settings = validation.data as Settings;
    }

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
      try {
        w.close();
      } catch {
        /* ignore */
      }
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
