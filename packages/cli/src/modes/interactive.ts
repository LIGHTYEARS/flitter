/**
 * 交互式 TUI 模式入口 (stub)
 *
 * 逆向: _70() in html-sanitizer-repl.js:1327-1388
 */
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";

/**
 * 启动交互式 TUI 模式 (stub — 待实现)
 */
export async function launchInteractiveMode(
  _container: ServiceContainer,
  _context: CliContext,
): Promise<void> {
  throw new Error("Not implemented");
}

/**
 * 测试用内部方法导出
 */
export const _testing = {
  setRunApp: (_fn: unknown) => {},
  resolveThread: async (_container: ServiceContainer, _context: CliContext): Promise<string> => {
    throw new Error("Not implemented");
  },
  buildWidgetTree: (_container: ServiceContainer, _worker: unknown, _themeName: string): unknown => {
    throw new Error("Not implemented");
  },
  handleShutdown: () => {},
};
