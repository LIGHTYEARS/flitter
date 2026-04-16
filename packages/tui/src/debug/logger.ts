/**
 * 结构化日志系统。
 *
 * {@link Logger} 提供分级日志（error/warn/info/debug），支持
 * scoped 子 logger（点分前缀），通过环境变量 FLITTER_LOG_LEVEL 控制级别。
 * 所有输出写到 stderr，不干扰终端渲染。
 *
 * 逆向: Sb (ScopedLogger) in 1542_unknown_Sb.js
 * 逆向: bootstrap backend hiT in 2026_tail_anonymous.js:59921-59944
 * 逆向: log level resolution RF0 in 2004_unknown_RF0.js
 *
 * @module
 */

/**
 * 日志级别数值映射。
 *
 * 逆向: amp 使用 Winston 的 npm levels: error=0, warn=1, info=3, debug=5。
 * 我们简化为四级，数值越大越详细。
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * 日志后端接口。
 *
 * 逆向: amp 的 xl 可替换后端 (hiT -> Winston)。
 * 默认实现写到 stderr (console.error)。
 */
export interface LogBackend {
  error(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
}

/**
 * 默认 stderr backend — 所有级别写到 console.error 以免干扰 stdout 渲染。
 *
 * 逆向: hiT in 2026_tail_anonymous.js:59921-59944
 * amp 的 hiT 将 error/warn/info 分别路由到 console.error/warn/info，
 * debug 受 ynR() 标志门控。我们简化为全部写 console.error，
 * 因为 TUI 渲染占用 stdout，所有日志必须走 stderr。
 */
const stderrBackend: LogBackend = {
  error: (msg, ...args) => console.error(msg, ...args),
  warn: (msg, ...args) => console.error(msg, ...args),
  info: (msg, ...args) => console.error(msg, ...args),
  debug: (msg, ...args) => console.error(msg, ...args),
};

/**
 * 从环境变量解析日志级别。
 *
 * 逆向: RF0 in 2004_unknown_RF0.js
 * amp 优先级: --log-level flag > AMP_LOG_LEVEL env > "info" default。
 * Flitter 简化为: FLITTER_LOG_LEVEL env > "info" default。
 * CLI flag 集成留给 CLI 入口层处理。
 */
function resolveLevel(): LogLevel {
  const env = (typeof process !== "undefined"
    ? process.env.FLITTER_LOG_LEVEL
    : undefined
  )
    ?.trim()
    .toLowerCase();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return "info";
}

/**
 * 结构化 Logger。
 *
 * 逆向: Sb (ScopedLogger) in 1542_unknown_Sb.js
 *
 * amp 的 Sb 持有 baseLogger、scope、context，方法有
 * error/warn/info/debug/audit 和 scoped(name)/with(context)。
 * messageWithPrefix 用 "scope: msg" 格式。
 * mergeContextWithMeta 将 context 与 OpenTelemetry span 合并。
 *
 * Flitter 适配:
 * - 前缀格式改为 "[scope] msg"（更适合 TUI 调试日志的视觉扫描）
 * - 去掉 context/with/audit/OpenTelemetry（TUI 不需要追踪集成）
 * - 增加级别门控（amp 的级别过滤在 Winston transport 层，此处内聚到 Logger）
 */
export class Logger {
  private _backend: LogBackend;
  private _level: number;
  private _scope: string | undefined;

  constructor(opts?: {
    backend?: LogBackend;
    level?: LogLevel | number;
    scope?: string;
  }) {
    this._backend = opts?.backend ?? stderrBackend;
    const lvl = opts?.level;
    this._level =
      typeof lvl === "number" ? lvl : LOG_LEVELS[lvl ?? resolveLevel()];
    this._scope = opts?.scope;
  }

  /**
   * 创建带作用域前缀的子 logger。
   *
   * 逆向: Sb.scoped(T) — 返回新 Sb，scope 用点号连接:
   *   R.scope = this.scope ? `${this.scope}.${T}` : T
   *   R.context = { ...this.context }
   */
  scoped(name: string): Logger {
    const childScope = this._scope ? `${this._scope}.${name}` : name;
    return new Logger({
      backend: this._backend,
      level: this._level,
      scope: childScope,
    });
  }

  error(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.error) {
      this._backend.error(this._prefix(msg), ...args);
    }
  }

  warn(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.warn) {
      this._backend.warn(this._prefix(msg), ...args);
    }
  }

  info(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.info) {
      this._backend.info(this._prefix(msg), ...args);
    }
  }

  debug(msg: string, ...args: unknown[]): void {
    if (this._level >= LOG_LEVELS.debug) {
      this._backend.debug(this._prefix(msg), ...args);
    }
  }

  /**
   * 逆向: Sb.messageWithPrefix — amp 用 "scope: msg"，
   * Flitter 用 "[scope] msg" 以便视觉区分。
   */
  private _prefix(msg: string): string {
    return this._scope ? `[${this._scope}] ${msg}` : msg;
  }

  private _levelName(): LogLevel {
    for (const [name, val] of Object.entries(LOG_LEVELS)) {
      if (val === this._level) return name as LogLevel;
    }
    return "info";
  }
}

/**
 * 全局 logger 单例。
 *
 * 逆向: amp 的全局 J = fD (代理到 xl 后端)。
 *
 * 导入后直接使用:
 * ```ts
 * import { logger } from "../debug/logger.js";
 * const log = logger.scoped("frame");
 * log.debug("executeFrame START");
 * ```
 */
export const logger = new Logger();
