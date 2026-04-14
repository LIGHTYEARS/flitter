/**
 * @flitter/data — FileSettingsStorage
 *
 * 读写 settings.json / settings.jsonc，支持 JSONC fallback
 * 原子写入 (write-to-temp + rename)
 * 从 amp-cli-reversed/app/process-runner.js:f_0/YkT 翻译
 */
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import {
  type ConfigScope,
  GLOBAL_ONLY_KEYS,
  type Settings,
  SettingsSchema,
} from "@flitter/schemas";
import { Subject } from "@flitter/util";
import { stripJsonComments } from "./jsonc";

export interface FileSettingsStorageOptions {
  globalPath: string;
  workspacePath?: string;
}

/**
 * FileSettingsStorage — 文件系统 settings 读写
 */
export class FileSettingsStorage {
  private readonly globalPath: string;
  private workspacePath: string | undefined;
  readonly changes = new Subject<string[]>();

  constructor(options: FileSettingsStorageOptions) {
    this.globalPath = options.globalPath;
    this.workspacePath = options.workspacePath;
  }

  /** 更新 workspace path (workspace root 变更时调用) */
  setWorkspacePath(p: string | undefined): void {
    this.workspacePath = p;
  }

  /** 获取当前 workspace path */
  getWorkspacePath(): string | undefined {
    return this.workspacePath;
  }

  /**
   * 解析 settings 文件路径: 先 .json, 再 .jsonc fallback
   * 从 f_0 (process-runner.js:718-741) 翻译
   */
  async resolveSettingsPath(dir: string): Promise<string> {
    const jsonPath = path.join(dir, "settings.json");
    try {
      await fsp.access(jsonPath);
      return jsonPath;
    } catch {
      // fallback to .jsonc
      return path.join(dir, "settings.jsonc");
    }
  }

  /** 读取指定 scope 的 settings */
  async read(scope: ConfigScope): Promise<Partial<Settings>> {
    const filePath = await this.pathForScope(scope);
    if (!filePath) return {};
    return this.readFile(filePath);
  }

  /** 原子写入 settings (always writes .json) */
  async write(scope: ConfigScope, settings: Partial<Settings>): Promise<void> {
    if (scope === "admin") {
      throw new Error("Cannot write to admin scope from file storage");
    }
    const filePath = this.writePathForScope(scope);
    if (!filePath) return;
    const dir = path.dirname(filePath);
    await fsp.mkdir(dir, { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    await fsp.writeFile(tmpPath, JSON.stringify(settings, null, 2), "utf-8");
    await fsp.rename(tmpPath, filePath);
  }

  /** 读取单键 */
  async get(key: string, scope?: ConfigScope): Promise<unknown> {
    const s = await this.read(scope ?? "global");
    return (s as Record<string, unknown>)[key];
  }

  /** 写入单键 */
  async set(key: string, value: unknown, scope?: ConfigScope): Promise<void> {
    const targetScope = scope ?? "global";
    this.validateScopeForKey(key, targetScope);
    const current = await this.read(targetScope);
    (current as Record<string, unknown>)[key] = value;
    await this.write(targetScope, current);
    this.changes.next([key]);
  }

  /** 删除单键 */
  async delete(key: string, scope?: ConfigScope): Promise<void> {
    const targetScope = scope ?? "global";
    const current = await this.read(targetScope);
    delete (current as Record<string, unknown>)[key];
    await this.write(targetScope, current);
    this.changes.next([key]);
  }

  /** 数组追加 */
  async append(key: string, value: unknown, scope?: ConfigScope): Promise<void> {
    const targetScope = scope ?? "global";
    const current = await this.read(targetScope);
    const currentRecord = current as Record<string, unknown>;
    const arr = Array.isArray(currentRecord[key]) ? [...(currentRecord[key] as unknown[])] : [];
    arr.push(value);
    currentRecord[key] = arr;
    await this.write(targetScope, current);
    this.changes.next([key]);
  }

  /** 数组前插 */
  async prepend(key: string, value: unknown, scope?: ConfigScope): Promise<void> {
    const targetScope = scope ?? "global";
    const current = await this.read(targetScope);
    const currentRecord = current as Record<string, unknown>;
    const arr = Array.isArray(currentRecord[key]) ? [...(currentRecord[key] as unknown[])] : [];
    arr.unshift(value);
    currentRecord[key] = arr;
    await this.write(targetScope, current);
    this.changes.next([key]);
  }

  /** 列出所有键 */
  async keys(scope?: ConfigScope): Promise<string[]> {
    const s = await this.read(scope ?? "global");
    return Object.keys(s);
  }

  /** 获取需要监听的文件路径列表 */
  getWatchPaths(): string[] {
    const paths = [this.globalPath];
    if (this.workspacePath) paths.push(this.workspacePath);
    return paths;
  }

  // ─── 内部方法 ────────────────────────────────────────

  /** Write path always uses .json (not .jsonc) */
  private writePathForScope(scope: ConfigScope): string | undefined {
    switch (scope) {
      case "global":
        return this.globalPath;
      case "workspace":
        return this.workspacePath;
      default:
        return undefined;
    }
  }

  private async pathForScope(scope: ConfigScope): Promise<string | undefined> {
    switch (scope) {
      case "global":
        return this.resolveSettingsPath(path.dirname(this.globalPath));
      case "workspace":
        if (!this.workspacePath) return undefined;
        return this.resolveSettingsPath(path.dirname(this.workspacePath));
      default:
        return undefined;
    }
  }

  private async readFile(filePath: string): Promise<Partial<Settings>> {
    let raw: string;
    try {
      raw = await fsp.readFile(filePath, "utf-8");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
        // Try .jsonc fallback if .json
        if (filePath.endsWith(".json")) {
          const jsoncPath = filePath.replace(/\.json$/, ".jsonc");
          try {
            raw = await fsp.readFile(jsoncPath, "utf-8");
          } catch {
            return {};
          }
        } else {
          return {};
        }
      } else {
        throw err;
      }
    }
    try {
      const stripped = stripJsonComments(raw);
      const parsed = JSON.parse(stripped);
      // Partial validation — strip unknown keys
      const result = SettingsSchema.partial().safeParse(parsed);
      return result.success ? (result.data as Partial<Settings>) : parsed;
    } catch {
      return {};
    }
  }

  private validateScopeForKey(key: string, scope: ConfigScope): void {
    if (scope === "admin") {
      throw new Error("Cannot write to admin scope");
    }
    if (scope === "workspace" && (GLOBAL_ONLY_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Key "${key}" is global-only and cannot be written to workspace scope`);
    }
  }
}
