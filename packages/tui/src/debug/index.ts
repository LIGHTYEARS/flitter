/**
 * 调试/日志子模块统一导出。
 *
 * @module
 */

export type { LogBackend, LogLevel } from "./logger.js";
export { LOG_LEVELS, Logger, logger } from "./logger.js";
